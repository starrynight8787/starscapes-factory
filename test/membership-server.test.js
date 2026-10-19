// @vitest-environment node
// The membership payment functions (api/membership-checkout.js, lib/membershipStripe.js), against a pretend Stripe and a pretend database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from '../api/membership-checkout.js'
import { couponIdFor, launchPercentOff, chargePence, describeCoupon, membershipRowFromSubscription, ensureLaunchCoupon, findPromotionCode, buildCheckoutForm } from '../lib/membershipStripe.js'
import { CONSENT_TEXT } from '../src/membership/passes.js'
import { LAUNCH_OFFER } from '../src/membership/pricing.js'

const USER = { id: '11111111-2222-4333-8444-555555555555', email: 'reader@example.com', email_confirmed_at: '2026-10-01T00:00:00Z' }
const OWNER = { id: '99999999-2222-4333-8444-555555555555', email: 'gill@example.com', email_confirmed_at: '2026-10-01T00:00:00Z' }
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

function network({ user = USER, member = null, promo = null, couponExists = false, stripeDown = false, couponFails = false } = {}) {
  const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url)
    calls.push({ url: u, init })
    if (u.endsWith('/auth/v1/user')) {
      const auth = (init.headers || {}).Authorization
      if (auth === 'Bearer owner-token') return json(OWNER)
      if (auth === 'Bearer user-token') return json(user)
      return json({}, 401)
    }
    if (u.includes('/rest/v1/memberships')) return json(member ? [member] : [])
    if (u.startsWith('https://api.stripe.com/v1/coupons')) {
      if (couponFails) return json({ error: { code: 'api_error' } }, 500)
      return couponExists ? json({ error: { code: 'resource_already_exists' } }, 400) : json({ id: 'made' })
    }
    if (u.startsWith('https://api.stripe.com/v1/promotion_codes')) return json({ data: promo ? [promo] : [] })
    if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return stripeDown ? json({ error: { message: 'boom' } }, 500) : json({ url: 'https://checkout.stripe.com/c/pay/test_123' })
    throw new Error(`unexpected request: ${u}`)
  })
  fn.calls = calls
  return fn
}
const sessionForm = (fn) => { const c = fn.calls.find((x) => x.url.endsWith('/v1/checkout/sessions')); return c ? new URLSearchParams(c.init.body) : null }
const stripeCalls = (fn) => fn.calls.filter((c) => c.url.startsWith('https://api.stripe.com'))

async function call({ method = 'POST', token = 'user-token', body, query, origin } = {}) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, status(n) { this.code = n; return this }, json(b) { this.body = b; return this } }
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (origin) headers.origin = origin
  await handler({ method, headers, body, query }, res)
  return { status: res.code, body: res.body, headers: res.headers }
}
const good = { passes: ['authors-notebook', 'blueprints', 'book-club'], interval: 'month', consent: true }
const offerWas = LAUNCH_OFFER.active

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'
  process.env.STRIPE_SECRET_KEY = 'sk_test_abc'; process.env.OWNER_EMAIL = 'gill@example.com'; process.env.MEMBERSHIP_OPEN = 'yes'
  delete process.env.SITE_URL; delete process.env.VERCEL_URL; delete process.env.VERCEL_BRANCH_URL
  LAUNCH_OFFER.active = true
})
afterEach(() => { vi.unstubAllGlobals(); LAUNCH_OFFER.active = offerWas })
const withNetwork = (opts) => { const fn = network(opts); vi.stubGlobal('fetch', fn); return fn }

describe('is it open?', () => {
  it('says closed (and says nothing else) to a visitor while MEMBERSHIP_OPEN is not yes', async () => {
    process.env.MEMBERSHIP_OPEN = 'no'; withNetwork()
    expect((await call({ method: 'GET', token: '' })).body).toEqual({ ok: true, open: false, can_test: false })
  })
  it('says open when MEMBERSHIP_OPEN is exactly yes (YES, true and 1 do not count)', async () => {
    withNetwork(); expect((await call({ method: 'GET', token: '' })).body).toEqual({ ok: true, open: true, can_test: false })
    for (const v of ['YES', 'true', '1', '']) { process.env.MEMBERSHIP_OPEN = v; expect((await call({ method: 'GET', token: '' })).body.open, v).toBe(false) }
  })
  it('lets the owner know they may test while it is closed', async () => {
    process.env.MEMBERSHIP_OPEN = 'no'; withNetwork()
    expect((await call({ method: 'GET', token: 'owner-token' })).body).toEqual({ ok: true, open: false, can_test: true })
  })
})

describe('who may start a payment', () => {
  it('refuses a visitor while memberships are closed, and never calls Stripe', async () => {
    process.env.MEMBERSHIP_OPEN = 'no'; const fn = withNetwork()
    const r = await call({ body: good })
    expect([r.status, r.body.reason]).toEqual([403, 'not_open']); expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('lets the owner test while it is closed', async () => {
    process.env.MEMBERSHIP_OPEN = 'no'; withNetwork()
    expect((await call({ token: 'owner-token', body: good })).status).toBe(200)
  })
  it('needs a signed-in person, once open', async () => {
    const fn = withNetwork(); const r = await call({ token: '', body: good })
    expect([r.status, r.body.reason]).toEqual([401, 'not_signed_in']); expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('needs a confirmed email address', async () => {
    const fn = withNetwork({ user: { ...USER, email_confirmed_at: null } }); const r = await call({ body: good })
    expect([r.status, r.body.reason]).toEqual([403, 'email_not_confirmed']); expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('refuses a request from another website', async () => {
    const fn = withNetwork(); const r = await call({ body: good, origin: 'https://evil.example' })
    expect(r.status).toBe(403); expect(stripeCalls(fn)).toHaveLength(0)
  })
})

describe('what it will not start a payment without', () => {
  it('the tick box: consent must be exactly true (not "true", 1 or missing)', async () => {
    for (const consent of [false, undefined, 'true', 1, null]) {
      const fn = withNetwork(); const r = await call({ body: { ...good, consent } })
      expect(r.status, String(consent)).toBe(400); expect(r.body.message).toMatch(/tick the box/); expect(stripeCalls(fn)).toHaveLength(0)
    }
  })
  it('at least one real pass, and a way of paying', async () => {
    for (const body of [{ ...good, passes: [] }, { ...good, passes: ['nonsense'] }, { ...good, passes: 'blueprints' }, { ...good, interval: 'week' }, { ...good, interval: undefined }, 'not json', null]) {
      const fn = withNetwork(); expect((await call({ body })).status, JSON.stringify(body)).toBe(400); expect(stripeCalls(fn)).toHaveLength(0)
    }
  })
  it('a test key: a live key, a missing key and a strange key are all refused', async () => {
    for (const key of ['sk_live_abc', 'rk_live_abc', '', 'nonsense']) {
      process.env.STRIPE_SECRET_KEY = key; const fn = withNetwork(); const r = await call({ body: good })
      expect(r.status, key).toBe(503); expect(stripeCalls(fn)).toHaveLength(0)
    }
  })
  it('someone who already holds passes (they would change them instead)', async () => {
    for (const status of ['active', 'trialing', 'past_due', 'unpaid']) {
      const fn = withNetwork({ member: { status, stripe_customer_id: 'cus_1' } }); const r = await call({ body: good })
      expect([r.status, r.body.reason], status).toEqual([409, 'already_member']); expect(fn.calls.some((c) => c.url.endsWith('/v1/checkout/sessions'))).toBe(false)
    }
  })
})

describe('the Stripe checkout it asks for', () => {
  it('is a subscription for the three passes, charging the right price, with the launch offer and the record of the agreement', async () => {
    const fn = withNetwork(); const r = await call({ body: good, origin: 'https://starscapesfactory.com' })
    expect(r.status).toBe(200); expect(r.body).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/test_123', mode: 'test' })
    const f = sessionForm(fn)
    expect(f.get('mode')).toBe('subscription')
    expect(f.get('line_items[0][price_data][unit_amount]')).toBe('1000'); expect(f.get('line_items[0][price_data][currency]')).toBe('gbp'); expect(f.get('line_items[0][price_data][recurring][interval]')).toBe('month'); expect(f.get('line_items[0][quantity]')).toBe('1')
    expect(f.get('line_items[0][price_data][product_data][name]')).toBe('Starscapes Factory passes: 3 passes')
    expect(f.get('line_items[0][price_data][product_data][description]')).toBe("The Author's Notebook, Blueprints, Book Club")
    expect(f.get('discounts[0][coupon]')).toBe('launch-off50-first-year-month'); expect(f.get('discounts[0][promotion_code]')).toBeNull()
    expect(f.get('client_reference_id')).toBe(USER.id); expect(f.get('customer_email')).toBe(USER.email); expect(f.get('customer')).toBeNull()
    expect(f.get('success_url')).toBe('https://starscapesfactory.com/membership/welcome?session_id={CHECKOUT_SESSION_ID}'); expect(f.get('cancel_url')).toBe('https://starscapesfactory.com/membership?checkout=cancelled')
    for (const prefix of ['metadata', 'subscription_data[metadata]']) {
      const get = (k) => f.get(`${prefix}[${k}]`)
      expect(get('user_id')).toBe(USER.id); expect(get('passes')).toBe('authors-notebook,blueprints,book-club'); expect(get('interval')).toBe('month'); expect(get('launch_offer')).toBe('yes')
      expect(get('consent_text')).toBe(CONSENT_TEXT); expect(get('consent_at')).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
    }
  })
  it('makes the launch coupon first (half price, for 12 months when paying monthly), and carries on if it already exists', async () => {
    let fn = withNetwork(); await call({ body: good })
    const made = new URLSearchParams(fn.calls.find((c) => c.url.endsWith('/v1/coupons')).init.body)
    expect([made.get('id'), made.get('percent_off'), made.get('duration'), made.get('duration_in_months')]).toEqual(['launch-off50-first-year-month', '50', 'repeating', '12'])
    fn = withNetwork({ couponExists: true }); expect((await call({ body: good })).status).toBe(200)
  })
  it('charges a year as ten months, with the coupon that lasts for the first payment (the whole first year)', async () => {
    const fn = withNetwork(); await call({ body: { ...good, interval: 'year' } })
    const f = sessionForm(fn)
    expect(f.get('line_items[0][price_data][unit_amount]')).toBe('10000'); expect(f.get('line_items[0][price_data][recurring][interval]')).toBe('year'); expect(f.get('discounts[0][coupon]')).toBe('launch-off50-first-year-year')
    const made = new URLSearchParams(fn.calls.find((c) => c.url.endsWith('/v1/coupons')).init.body)
    expect([made.get('duration'), made.get('duration_in_months')]).toEqual(['once', null])
  })
  it('works out the price itself: any price, total or discount sent from the browser is ignored', async () => {
    const fn = withNetwork(); await call({ body: { ...good, price: 1, amount: 1, unit_amount: 1, total: 1, discount: 100, percent_off: 100, coupon: 'free', unitAmount: 1 } })
    const f = sessionForm(fn)
    expect(f.get('line_items[0][price_data][unit_amount]')).toBe('1000'); expect(f.get('discounts[0][coupon]')).toBe('launch-off50-first-year-month'); expect([...f.keys()].some((k) => /coupon|promotion/.test(k) && k !== 'discounts[0][coupon]')).toBe(false)
  })
  it('keeps each real pass once, in the order drawn, and throws away made-up ones', async () => {
    const fn = withNetwork(); await call({ body: { ...good, passes: ['book-club', 'made-up', 'authors-notebook', 'book-club'], interval: 'month' } })
    const f = sessionForm(fn)
    expect(f.get('subscription_data[metadata][passes]')).toBe('authors-notebook,book-club'); expect(f.get('line_items[0][price_data][unit_amount]')).toBe('700')
  })
  it('charges 12 pounds for all five passes, and lists them all', async () => {
    const fn = withNetwork(); await call({ body: { ...good, passes: ['book-club', 'come-write-with-me', 'blueprints', 'early-drafts', 'authors-notebook'] } })
    const f = sessionForm(fn)
    expect(f.get('line_items[0][price_data][unit_amount]')).toBe('1200'); expect(f.get('line_items[0][price_data][product_data][name]')).toBe('Starscapes Factory passes: 5 passes')
    expect(f.get('subscription_data[metadata][passes]')).toBe('authors-notebook,early-drafts,come-write-with-me,blueprints,book-club')
    expect(f.get('line_items[0][price_data][product_data][description]')).toBe("The Author's Notebook, Early drafts and book background, Come Write With Me, Blueprints, Book Club")
  })
  it('uses a promo code INSTEAD of the launch offer (Stripe allows one discount), and says so on the record', async () => {
    const fn = withNetwork({ promo: { id: 'promo_1', coupon: { valid: true, percent_off: 20, duration: 'repeating', duration_in_months: 3 } } })
    const r = await call({ body: { ...good, code: 'WELCOME' } })
    expect(r.status).toBe(200)
    const f = sessionForm(fn)
    expect(f.get('discounts[0][promotion_code]')).toBe('promo_1'); expect(f.get('discounts[0][coupon]')).toBeNull(); expect(f.get('metadata[launch_offer]')).toBe('no')
    expect(fn.calls.some((c) => c.url.endsWith('/v1/coupons'))).toBe(false)
    expect(fn.calls.find((c) => c.url.includes('/v1/promotion_codes')).url).toContain('code=WELCOME')
  })
  it('refuses a promo code that does not exist or has ended, without starting a payment', async () => {
    const fn = withNetwork({ promo: null }); const r = await call({ body: { ...good, code: 'NOPE' } })
    expect(r.status).toBe(400); expect(r.body.message).toMatch(/not valid/); expect(fn.calls.some((c) => c.url.endsWith('/v1/checkout/sessions'))).toBe(false)
    const fn2 = withNetwork({ promo: { id: 'promo_2', coupon: { valid: false } } }); expect((await call({ body: { ...good, code: 'OLD' } })).status).toBe(400); void fn2
  })
  it('offers no discount at all when the launch offer is switched off', async () => {
    LAUNCH_OFFER.active = false; const fn = withNetwork(); await call({ body: good })
    const f = sessionForm(fn)
    expect([...f.keys()].some((k) => k.startsWith('discounts'))).toBe(false); expect(f.get('metadata[launch_offer]')).toBe('no'); expect(fn.calls.some((c) => c.url.endsWith('/v1/coupons'))).toBe(false)
  })
  it('reuses the Stripe customer of someone whose earlier passes ended, instead of making a second one', async () => {
    const fn = withNetwork({ member: { status: 'canceled', stripe_customer_id: 'cus_old' } }); await call({ body: good })
    const f = sessionForm(fn); expect(f.get('customer')).toBe('cus_old'); expect(f.get('customer_email')).toBeNull()
  })
  it('uses the address the request came from, if it is one of ours (a preview site, say), for where Stripe sends people back', async () => {
    process.env.VERCEL_URL = 'preview-abc.vercel.app'; const fn = withNetwork(); await call({ body: good, origin: 'https://preview-abc.vercel.app' })
    expect(sessionForm(fn).get('success_url')).toMatch(/^https:\/\/preview-abc\.vercel\.app\/membership\/welcome/)
  })
})

describe('when Stripe has a problem', () => {
  it('says so kindly (502) and never shows the key or Stripe\'s own words', async () => {
    withNetwork({ stripeDown: true }); const r = await call({ body: good })
    expect(r.status).toBe(502); expect(JSON.stringify(r.body)).not.toMatch(/sk_test|boom/)
  })
  it('writes Stripe\u2019s own reason to the log, while the customer only sees the kind message', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    withNetwork({ stripeDown: true }); const r = await call({ body: good })
    expect(r.body.message).toBe("We couldn't start the payment just now. Please try again in a moment.")
    expect(spy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('[membership] starting a payment: stripe answered 500: boom'); spy.mockRestore()
  })
  it('says so kindly if the launch coupon cannot be made', async () => {
    const fn = withNetwork({ couponFails: true }); expect((await call({ body: good })).status).toBe(502); expect(fn.calls.some((c) => c.url.endsWith('/v1/checkout/sessions'))).toBe(false)
  })
  it('never sends a person anywhere but Stripe\'s own page (the address comes from Stripe, and the page checks it)', async () => {
    withNetwork(); const r = await call({ body: good }); expect(r.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })
})

describe('checking a promo code (GET ?code=)', () => {
  it('needs a signed-in person, so codes cannot be guessed anonymously', async () => {
    withNetwork(); expect((await call({ method: 'GET', token: '', query: { code: 'WELCOME' } })).status).toBe(401)
  })
  it('says what a good code gives, in plain words', async () => {
    withNetwork({ promo: { id: 'promo_1', coupon: { valid: true, percent_off: 20, duration: 'repeating', duration_in_months: 3 } } })
    expect((await call({ method: 'GET', query: { code: 'WELCOME' } })).body).toEqual({ ok: true, summary: '20% off for 3 months' })
  })
  it('says a code is not valid when it is not (404), and is closed to visitors while memberships are closed', async () => {
    withNetwork({ promo: null }); expect((await call({ method: 'GET', query: { code: 'NOPE' } })).status).toBe(404)
    process.env.MEMBERSHIP_OPEN = 'no'; withNetwork(); expect((await call({ method: 'GET', query: { code: 'X1' } })).status).toBe(403)
  })
})

describe('the helpers', () => {
  it('names the launch coupon after its percentage, so a changed offer never reuses an old coupon', () => {
    expect(launchPercentOff()).toBe(50); expect(couponIdFor('month')).toBe('launch-off50-first-year-month'); expect(couponIdFor('year')).toBe('launch-off50-first-year-year')
    expect(couponIdFor('month', { fraction: 0.7 })).toBe('launch-off30-first-year-month')
  })
  it('works out charges from the same rules as the page', () => {
    expect(chargePence(['blueprints'], 'month')).toBe(500); expect(chargePence(['authors-notebook', 'early-drafts', 'blueprints', 'book-club'], 'year')).toBe(12000); expect(chargePence(['x'], 'month')).toBe(0)
  })
  it('puts only ONE discount on a checkout: a promo code wins over the launch offer, even if both are asked for (Stripe would refuse two)', () => {
    const base = { user: USER, passes: ['blueprints'], interval: 'month', consentAt: '2026-10-19T10:00:00.000Z', returnTo: 'https://starscapesfactory.com' }
    const both = buildCheckoutForm({ ...base, promotionCodeId: 'promo_1', launch: true })
    expect(both.get('discounts[0][promotion_code]')).toBe('promo_1'); expect(both.get('discounts[0][coupon]')).toBeNull(); expect(both.get('metadata[launch_offer]')).toBe('no')
    const launchOnly = buildCheckoutForm({ ...base, launch: true })
    expect(launchOnly.get('discounts[0][coupon]')).toBe('launch-off50-first-year-month'); expect(launchOnly.get('discounts[0][promotion_code]')).toBeNull(); expect(launchOnly.get('metadata[launch_offer]')).toBe('yes')
    const neither = buildCheckoutForm(base)
    expect([...neither.keys()].some((k) => k.startsWith('discounts'))).toBe(false)
  })
  it('describes a coupon in plain words', () => {
    expect(describeCoupon({ percent_off: 50, duration: 'once' })).toBe('50% off your first payment')
    expect(describeCoupon({ amount_off: 250, currency: 'gbp', duration: 'repeating', duration_in_months: 1 })).toBe('£2.50 off for 1 month')
    expect(describeCoupon({ percent_off: 10, duration: 'forever' })).toBe('10% off for as long as you keep your passes')
    expect(describeCoupon({ amount_off: 500, currency: 'usd', duration: 'once' })).toBe('a discount your first payment'); expect(describeCoupon(null)).toBe('a discount')
  })
  it('only looks up a code that is made of safe characters', async () => {
    const fn = vi.fn(); await expect(findPromotionCode('a b&c=d', 'sk_test_x', fn)).resolves.toBeNull(); expect(fn).not.toHaveBeenCalled()
  })
  it('throws, rather than guesses, if Stripe cannot make the coupon', async () => {
    await expect(ensureLaunchCoupon('month', 'sk_test_x', async () => json({ error: { code: 'api_error' } }, 500))).rejects.toThrow()
  })
})

describe('turning a Stripe subscription into a membership record', () => {
  const sub = (over = {}) => ({ id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: false, current_period_end: 1800000000, start_date: 1760000000, created: 1760000000, items: { data: [{ price: { recurring: { interval: 'month' } } }] }, metadata: { user_id: USER.id, passes: 'blueprints,authors-notebook', interval: 'month', launch_offer: 'yes', consent_at: '2026-10-19T10:00:00.000Z', consent_text: CONSENT_TEXT }, ...over })
  it('records who, which passes (in the order drawn), how they pay, when it renews, and the agreement', () => {
    const r = membershipRowFromSubscription(sub(), '2026-10-19T12:00:00.000Z')
    expect(r).toMatchObject({ user_id: USER.id, stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', status: 'active', passes: ['authors-notebook', 'blueprints'], billing_interval: 'month', cancel_at_period_end: false, consent_at: '2026-10-19T10:00:00.000Z', consent_text: CONSENT_TEXT, updated_at: '2026-10-19T12:00:00.000Z' })
    expect(r.current_period_end).toBe(new Date(1800000000 * 1000).toISOString())
  })
  it('ends the launch offer one year after the subscription started, only when the offer was used', () => {
    expect(membershipRowFromSubscription(sub()).offer_ends_at).toBe(new Date(Date.UTC(new Date(1760000000 * 1000).getUTCFullYear() + 1, new Date(1760000000 * 1000).getUTCMonth(), new Date(1760000000 * 1000).getUTCDate(), new Date(1760000000 * 1000).getUTCHours(), new Date(1760000000 * 1000).getUTCMinutes(), new Date(1760000000 * 1000).getUTCSeconds())).toISOString())
    expect(membershipRowFromSubscription(sub({ metadata: { ...sub().metadata, launch_offer: 'no' } })).offer_ends_at).toBeNull()
  })
  it('reads the renewal date from either place newer and older Stripe versions keep it', () => {
    const noTop = sub({ current_period_end: undefined, items: { data: [{ current_period_end: 1810000000, price: { recurring: { interval: 'year' } } }] } })
    const r = membershipRowFromSubscription(noTop)
    expect(r.current_period_end).toBe(new Date(1810000000 * 1000).toISOString()); expect(r.billing_interval).toBe('year')
  })
  it('maps every Stripe state to one our table allows, and treats a strange one as cancelled (access is never given by a state we do not understand)', () => {
    const states = { incomplete: 'incomplete', incomplete_expired: 'canceled', trialing: 'trialing', active: 'active', past_due: 'past_due', canceled: 'canceled', unpaid: 'unpaid', paused: 'unpaid', mystery: 'canceled', undefined: 'canceled' }
    for (const [from, to] of Object.entries(states)) expect(membershipRowFromSubscription(sub({ status: from === 'undefined' ? undefined : from })).status, from).toBe(to)
  })
  it('carries the cancelled-at-the-end flag', () => {
    expect(membershipRowFromSubscription(sub({ cancel_at_period_end: true })).cancel_at_period_end).toBe(true)
  })
  it('ignores a subscription that did not come from our checkout, or has no real user on it', () => {
    for (const metadata of [{}, { user_id: 'not-a-uuid' }, { user_id: '' }]) expect(membershipRowFromSubscription(sub({ metadata }))).toBeNull()
    expect(membershipRowFromSubscription(null)).toBeNull()
  })
  it('throws away made-up pass ids', () => {
    expect(membershipRowFromSubscription(sub({ metadata: { ...sub().metadata, passes: 'blueprints,free-everything' } })).passes).toEqual(['blueprints'])
  })
})
