// @vitest-environment node
// The account function (api/membership-account.js): card, billing page, taking back a cancellation, and changing passes. A pretend Stripe and a pretend database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from '../api/membership-account.js'
import { CONSENT_TEXT } from '../src/membership/passes.js'

const USER = { id: '11111111-2222-4333-8444-555555555555', email: 'reader@example.com', email_confirmed_at: '2026-10-01T00:00:00Z' }
const OTHER = '99999999-2222-4333-8444-555555555555'
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const MEMBER = { status: 'active', passes: ['authors-notebook', 'blueprints'], stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', cancel_at_period_end: false }
const sub = (over = {}) => ({ id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: false, current_period_end: 1800000000, items: { data: [{ id: 'si_1', price: { product: 'prod_1', recurring: { interval: 'month' } } }] }, metadata: { user_id: USER.id, passes: 'authors-notebook,blueprints', interval: 'month' }, ...over })

function network({ member = MEMBER, portal = 'ok', stripeFails = false, card = { card: { last4: '4242', brand: 'visa' } } } = {}) {
  const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url)
    calls.push({ url: u, init })
    if (u.endsWith('/auth/v1/user')) return (init.headers || {}).Authorization === 'Bearer user-token' ? json(USER) : json({}, 401)
    if (u.includes('/rest/v1/memberships') && (!init.method || init.method === 'GET')) return json(member ? [member] : [])
    if (u.includes('/rest/v1/memberships') && init.method === 'POST') return json(null, 201)
    if (u.includes('/v1/billing_portal/sessions')) return portal === 'ok' ? json({ url: 'https://billing.stripe.com/p/session/test_1' }) : json({ error: { message: 'No configuration provided and your test mode default configuration has not been created.' } }, 400)
    if (u.includes('/v1/subscriptions/sub_1') && init.method === 'POST') {
      if (stripeFails) return json({}, 500)
      const body = new URLSearchParams(init.body)
      const next = sub()
      if (body.has('cancel_at_period_end')) next.cancel_at_period_end = body.get('cancel_at_period_end') === 'true'
      if (body.has('metadata[passes]')) next.metadata = { ...next.metadata, passes: body.get('metadata[passes]') }
      return json(next)
    }
    if (u.includes('/v1/subscriptions/sub_1')) return u.includes('expand') ? json({ default_payment_method: card }) : json(sub())
    throw new Error(`unexpected request: ${u}`)
  })
  fn.calls = calls
  return fn
}
const stripePosts = (fn) => fn.calls.filter((c) => c.url.startsWith('https://api.stripe.com') && c.init.method === 'POST')
const saves = (fn) => fn.calls.filter((c) => c.url.includes('/rest/v1/memberships') && c.init.method === 'POST')

async function call({ method = 'POST', token = 'user-token', body, origin } = {}) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, status(n) { this.code = n; return this }, json(b) { this.body = b; return this } }
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (origin) headers.origin = origin
  await handler({ method, headers, body }, res)
  return { status: res.code, body: res.body }
}

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'; process.env.STRIPE_SECRET_KEY = 'sk_test_abc'
  delete process.env.SITE_URL; delete process.env.VERCEL_URL
})
afterEach(() => vi.unstubAllGlobals())
const withNetwork = (o) => { const fn = network(o); vi.stubGlobal('fetch', fn); return fn }

describe('who may use it', () => {
  it('needs a signed-in person, for everything', async () => {
    const fn = withNetwork()
    for (const method of ['GET', 'POST']) expect((await call({ method, token: '', body: { action: 'portal' } })).status).toBe(401)
    expect(fn.calls.filter((c) => c.url.includes('/rest/v1') || c.url.includes('stripe.com'))).toHaveLength(0)
  })
  it('only ever touches the signed-in person\u2019s own membership: a user id in the request is ignored', async () => {
    const fn = withNetwork(); await call({ body: { action: 'portal', user_id: OTHER, userId: OTHER } })
    const read = fn.calls.find((c) => c.url.includes('/rest/v1/memberships'))
    expect(read.url).toContain(`user_id=eq.${USER.id}`); expect(read.url).not.toContain(OTHER)
  })
  it('refuses a request from another website, a live key, and a missing key', async () => {
    withNetwork(); expect((await call({ origin: 'https://evil.example', body: { action: 'portal' } })).status).toBe(403)
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc'; expect((await call({ body: { action: 'portal' } })).status).toBe(503)
    delete process.env.STRIPE_SECRET_KEY; expect((await call({ body: { action: 'portal' } })).status).toBe(503)
  })
  it('says there is nothing to change for someone with no membership', async () => {
    const fn = withNetwork({ member: null }); const r = await call({ body: { action: 'change', passes: ['blueprints'], consent: true } })
    expect([r.status, r.body.reason]).toEqual([404, 'no_membership']); expect(stripePosts(fn)).toHaveLength(0)
  })
  it('refuses any other kind of request', async () => {
    withNetwork(); expect((await call({ method: 'DELETE' })).status).toBe(405); expect((await call({ body: { action: 'delete everything' } })).status).toBe(400)
  })
})

describe('the card on file (GET)', () => {
  it('gives the brand and last four digits only', async () => {
    withNetwork(); expect((await call({ method: 'GET' })).body).toEqual({ ok: true, card: { brand: 'visa', last4: '4242' } })
  })
  it('gives no card for someone with no membership, and never fails the page if Stripe is down', async () => {
    withNetwork({ member: null }); expect((await call({ method: 'GET' })).body).toEqual({ ok: true, card: null })
    vi.stubGlobal('fetch', vi.fn(async (url) => (String(url).endsWith('/auth/v1/user') ? json(USER) : String(url).includes('/rest/v1') ? json([MEMBER]) : Promise.reject(new Error('down')))))
    expect((await call({ method: 'GET' })).body).toEqual({ ok: true, card: null })
  })
})

describe('Stripe\u2019s own page for the card and cancelling (action portal)', () => {
  it('makes a billing page for THIS customer that comes back to My passes', async () => {
    const fn = withNetwork(); const r = await call({ body: { action: 'portal' }, origin: 'https://starscapesfactory.com' })
    expect(r.body).toEqual({ ok: true, url: 'https://billing.stripe.com/p/session/test_1' })
    const form = new URLSearchParams(stripePosts(fn)[0].init.body); expect([form.get('customer'), form.get('return_url')]).toEqual(['cus_1', 'https://starscapesfactory.com/membership/passes'])
  })
  it('says kindly, and why, when the billing page has not been switched on in Stripe yet', async () => {
    withNetwork({ portal: 'off' }); const r = await call({ body: { action: 'portal' } })
    expect([r.status, r.body.reason]).toEqual([503, 'portal_not_set_up']); expect(JSON.stringify(r.body)).not.toMatch(/configuration|sk_test/)
  })
})

describe('taking back a cancellation (action resume)', () => {
  it('stops the cancellation and records the membership as it now stands', async () => {
    const fn = withNetwork({ member: { ...MEMBER, cancel_at_period_end: true } }); const r = await call({ body: { action: 'resume' } })
    expect(r.body).toEqual({ ok: true })
    expect(new URLSearchParams(stripePosts(fn)[0].init.body).get('cancel_at_period_end')).toBe('false'); expect(saves(fn)).toHaveLength(1)
  })
  it('says there is nothing to take back if the passes are not set to end', async () => {
    const fn = withNetwork(); expect((await call({ body: { action: 'resume' } })).status).toBe(409); expect(stripePosts(fn)).toHaveLength(0)
  })
  it('does not bring back passes that have already ended', async () => {
    const fn = withNetwork({ member: { ...MEMBER, status: 'canceled', cancel_at_period_end: true } }); expect((await call({ body: { action: 'resume' } })).status).toBe(409); expect(stripePosts(fn)).toHaveLength(0)
  })
})

describe('changing passes (action change)', () => {
  it('adds a pass: needs the agreement, then charges nothing today and sets the new price from the rules', async () => {
    let fn = withNetwork(); const refused = await call({ body: { action: 'change', passes: ['authors-notebook', 'blueprints', 'book-club'] } })
    expect(refused.status).toBe(400); expect(refused.body.message).toMatch(/tick the box/); expect(stripePosts(fn)).toHaveLength(0)
    fn = withNetwork(); const r = await call({ body: { action: 'change', passes: ['book-club', 'blueprints', 'authors-notebook'], consent: true } })
    expect(r.body).toMatchObject({ ok: true, passes: ['authors-notebook', 'blueprints', 'book-club'], added: ['book-club'], removed: [] })
    const f = new URLSearchParams(stripePosts(fn)[0].init.body)
    expect(f.get('items[0][price_data][unit_amount]')).toBe('1000'); expect(f.get('proration_behavior')).toBe('none'); expect(f.get('metadata[last_change_consent_text]')).toBe(CONSENT_TEXT); expect(f.get('metadata[last_change_added]')).toBe('book-club')
    expect(saves(fn)).toHaveLength(1)
  })
  it('removes a pass without needing the agreement', async () => {
    const fn = withNetwork(); const r = await call({ body: { action: 'change', passes: ['blueprints'] } })
    expect(r.body).toMatchObject({ ok: true, passes: ['blueprints'], added: [], removed: ['authors-notebook'] })
    const f = new URLSearchParams(stripePosts(fn)[0].init.body); expect(f.get('items[0][price_data][unit_amount]')).toBe('500'); expect(f.get('metadata[last_change_consent_at]')).toBeNull()
  })
  it('works the price out itself: any price sent from the browser is ignored', async () => {
    const fn = withNetwork(); await call({ body: { action: 'change', passes: ['blueprints'], price: 1, amount: 1, unit_amount: 1, interval: 'year', consent: true } })
    const f = new URLSearchParams(stripePosts(fn)[0].init.body); expect(f.get('items[0][price_data][unit_amount]')).toBe('500'); expect(f.get('items[0][price_data][recurring][interval]')).toBe('month')
  })
  it('refuses no passes (cancelling is a different thing), and no change', async () => {
    let fn = withNetwork(); expect((await call({ body: { action: 'change', passes: [] } })).body.message).toMatch(/Manage payment or cancel/)
    expect((await call({ body: { action: 'change', passes: ['made-up'] } })).status).toBe(400); expect(stripePosts(fn)).toHaveLength(0)
    fn = withNetwork(); expect((await call({ body: { action: 'change', passes: ['blueprints', 'authors-notebook'], consent: true } })).body.message).toMatch(/Nothing has changed/); expect(stripePosts(fn)).toHaveLength(0)
  })
  it('does not change passes that are not open or are set to end', async () => {
    for (const member of [{ ...MEMBER, cancel_at_period_end: true }, { ...MEMBER, status: 'past_due' }, { ...MEMBER, status: 'canceled' }]) {
      const fn = withNetwork({ member }); expect((await call({ body: { action: 'change', passes: ['blueprints'] } })).status).toBe(409); expect(stripePosts(fn)).toHaveLength(0)
    }
  })
  it('says kindly if Stripe cannot make the change, and never shows its words', async () => {
    withNetwork({ stripeFails: true }); const r = await call({ body: { action: 'change', passes: ['blueprints'] } })
    expect(r.status).toBe(502); expect(JSON.stringify(r.body)).not.toMatch(/sk_test|stripe could not/)
  })
})
