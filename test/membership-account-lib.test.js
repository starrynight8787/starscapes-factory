// @vitest-environment node
// The account helpers (src/membership/account.js) and the Stripe helpers for changing, cancelling and the billing page (lib/membershipStripe.js).
import { describe, it, expect, vi } from 'vitest'
import { accountView, formatDate, nameList, priceNow, changeOf, unitWord } from '../src/membership/account'
import { buildChangeForm, buildCheckoutForm, setCancelAtPeriodEnd, cardOnFile, createPortalSession, membershipRowFromSubscription, ensureLaunchCoupon, STRIPE_VERSION } from '../lib/membershipStripe.js'
import { CONSENT_TEXT } from '../src/membership/passes'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const USER = { id: '11111111-2222-4333-8444-555555555555', email: 'reader@example.com' }

describe('which page a member sees', () => {
  it('maps every membership state to a view, and never treats a state it does not understand as holding passes', () => {
    const view = (status, extra = {}) => accountView({ status, ...extra })
    expect(accountView(null)).toBe('free')
    expect([view('active'), view('trialing')]).toEqual(['active', 'active'])
    expect([view('active', { cancel_at_period_end: true }), view('trialing', { cancel_at_period_end: true })]).toEqual(['cancelling', 'cancelling'])
    expect([view('past_due'), view('unpaid')]).toEqual(['trouble', 'trouble'])
    expect(view('canceled')).toBe('ended')
    for (const odd of ['incomplete', 'paused', 'mystery', undefined]) expect(view(odd), String(odd)).toBe('free')
  })
})

describe('writing dates and names', () => {
  it('writes a date as London shows it ("16 November 2026"), including across the clocks changing', () => {
    expect(formatDate('2026-11-16T00:30:00Z')).toBe('16 November 2026')
    expect(formatDate('2026-07-01T23:30:00Z')).toBe('2 July 2026') // 00:30 on the 2nd in London in summer
    expect(formatDate('')).toBe(''); expect(formatDate('not a date')).toBe(''); expect(formatDate(null)).toBe('')
  })
  it('lists passes in the order drawn, with commas and "and"', () => {
    expect(nameList([])).toBe(''); expect(nameList(['book-club'])).toBe('Book Club')
    expect(nameList(['book-club', 'blueprints'])).toBe('Blueprints and Book Club')
    expect(nameList(['book-club', 'authors-notebook', 'blueprints'])).toBe("The Author's Notebook, Blueprints and Book Club")
  })
  it('says a month or a year', () => { expect([unitWord('month'), unitWord('year'), unitWord(undefined)]).toEqual(['a month', 'a year', 'a month']) })
})

describe('what a member pays now', () => {
  const future = '2027-10-19T10:00:00Z', past = '2026-01-01T10:00:00Z', now = Date.parse('2026-11-01T00:00:00Z')
  it('takes the launch offer into account until it ends, and the full price after', () => {
    expect(priceNow({ billing_interval: 'month', offer_ends_at: future }, 3, now)).toMatchObject({ pence: 500, regular: 1000, onOffer: true, until: future, per: 'month' })
    expect(priceNow({ billing_interval: 'month', offer_ends_at: past }, 3, now)).toMatchObject({ pence: 1000, onOffer: false, until: null })
    expect(priceNow({ billing_interval: 'month', offer_ends_at: null }, 3, now)).toMatchObject({ pence: 1000, onOffer: false })
  })
  it('works for a year too, and for one pass (pence right)', () => {
    expect(priceNow({ billing_interval: 'year', offer_ends_at: future }, 3, now)).toMatchObject({ pence: 5000, regular: 10000, per: 'year' })
    expect(priceNow({ billing_interval: 'month', offer_ends_at: future }, 1, now).pence).toBe(250)
  })
  it('shows the full price (and leaves the discount to be named) for someone with a promo code, whose discount is not the launch offer', () => {
    expect(priceNow({ billing_interval: 'month', offer_ends_at: future, offer_note: '20% off for 3 months' }, 3, now)).toMatchObject({ pence: 1000, onOffer: false })
  })
  it('is zero for no passes', () => { expect(priceNow({ billing_interval: 'month', offer_ends_at: future }, 0, now)).toMatchObject({ pence: 0, onOffer: false }) })
})

describe('what a change adds and removes', () => {
  it('works out both lists, real passes only, in the order drawn', () => {
    expect(changeOf(['authors-notebook', 'blueprints'], ['blueprints', 'book-club', 'made-up'])).toEqual({ wanted: ['blueprints', 'book-club'], added: ['book-club'], removed: ['authors-notebook'] })
    expect(changeOf(['blueprints'], ['blueprints'])).toEqual({ wanted: ['blueprints'], added: [], removed: [] })
  })
})

const item = (over = {}) => ({ id: 'si_1', price: { product: 'prod_1', recurring: { interval: 'month' } }, ...over })
const subscription = (over = {}) => ({ id: 'sub_1', items: { data: [item()] }, ...over })

describe('the Stripe request that changes a membership', () => {
  const base = { subscription: subscription(), passes: ['book-club', 'blueprints'], changedAt: '2026-10-19T10:00:00.000Z', added: ['blueprints'], removed: [] }
  it('keeps the same product and way of paying, sets the new price from the rules, and charges and credits nothing today', () => {
    const f = buildChangeForm(base)
    expect(f.get('items[0][id]')).toBe('si_1'); expect(f.get('items[0][price_data][product]')).toBe('prod_1'); expect(f.get('items[0][price_data][currency]')).toBe('gbp')
    expect(f.get('items[0][price_data][unit_amount]')).toBe('700'); expect(f.get('items[0][price_data][recurring][interval]')).toBe('month')
    expect(f.get('proration_behavior')).toBe('none')
  })
  it('keeps the way of paying a year, and prices a year as ten months', () => {
    const f = buildChangeForm({ ...base, subscription: subscription({ items: { data: [item({ price: { product: 'prod_1', recurring: { interval: 'year' } } })] } }) })
    expect(f.get('items[0][price_data][recurring][interval]')).toBe('year'); expect(f.get('items[0][price_data][unit_amount]')).toBe('7000')
  })
  it('reads the product whether Stripe gives its id or the whole product', () => {
    expect(buildChangeForm({ ...base, subscription: subscription({ items: { data: [item({ price: { product: { id: 'prod_9' }, recurring: { interval: 'month' } } })] } }) }).get('items[0][price_data][product]')).toBe('prod_9')
  })
  it('writes the new passes and what changed on the subscription, and the agreement ONLY when a pass was added', () => {
    const adding = buildChangeForm({ ...base, consentAt: '2026-10-19T10:00:00.000Z' })
    expect(adding.get('metadata[passes]')).toBe('blueprints,book-club'); expect(adding.get('metadata[last_change_added]')).toBe('blueprints'); expect(adding.get('metadata[last_change_at]')).toBe('2026-10-19T10:00:00.000Z')
    expect(adding.get('metadata[last_change_consent_at]')).toBe('2026-10-19T10:00:00.000Z'); expect(adding.get('metadata[last_change_consent_text]')).toBe(CONSENT_TEXT)
    const removing = buildChangeForm({ ...base, added: [], removed: ['authors-notebook'] })
    expect(removing.get('metadata[last_change_consent_at]')).toBeNull(); expect(removing.get('metadata[last_change_removed]')).toBe('authors-notebook')
  })
  it('refuses a subscription it cannot read, or no passes', () => {
    expect(() => buildChangeForm({ ...base, subscription: { items: { data: [] } } })).toThrow()
    expect(() => buildChangeForm({ ...base, passes: ['made-up'] })).toThrow()
    expect(() => buildChangeForm({ ...base, subscription: subscription({ items: { data: [item({ price: { product: 'p', recurring: { interval: 'week' } } })] } }) })).toThrow()
  })
})

describe('cancelling, the card and the billing page', () => {
  it('cancels at the end of what has been paid for, or takes that back, and asks for the pinned version of Stripe', async () => {
    const fn = vi.fn(async () => json({ id: 'sub_1' }))
    await setCancelAtPeriodEnd('sub_1', false, 'sk_test_x', fn)
    const [url, init] = fn.mock.calls[0]
    expect(url).toBe('https://api.stripe.com/v1/subscriptions/sub_1'); expect(new URLSearchParams(init.body).get('cancel_at_period_end')).toBe('false')
    expect(init.headers['Stripe-Version']).toBe(STRIPE_VERSION); expect(init.headers.Authorization).toBe('Bearer sk_test_x')
    await setCancelAtPeriodEnd('sub_1', true, 'sk_test_x', fn); expect(new URLSearchParams(fn.mock.calls[1][1].body).get('cancel_at_period_end')).toBe('true')
    await expect(setCancelAtPeriodEnd('sub_1', true, 'sk_test_x', async () => json({}, 500))).rejects.toThrow()
  })
  it('pins one version of Stripe for every call it makes', async () => {
    expect(STRIPE_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const fn = vi.fn(async () => json({ error: { code: 'resource_already_exists' } }, 400)); await ensureLaunchCoupon('month', 'sk_test_x', fn)
    expect(fn.mock.calls[0][1].headers['Stripe-Version']).toBe(STRIPE_VERSION)
  })
  it('reads the card as "brand and last four" from the subscription, then from the customer, and says nothing odd', async () => {
    const card = (last4, brand = 'visa') => ({ card: { last4, brand } })
    await expect(cardOnFile('sub_1', 'cus_1', 'k', async () => json({ default_payment_method: card('4242') }))).resolves.toEqual({ brand: 'visa', last4: '4242' })
    const fn = vi.fn(async (url) => (String(url).includes('/subscriptions/') ? json({ default_payment_method: null }) : json({ invoice_settings: { default_payment_method: card('1111', 'mastercard') } })))
    await expect(cardOnFile('sub_1', 'cus_1', 'k', fn)).resolves.toEqual({ brand: 'mastercard', last4: '1111' })
    await expect(cardOnFile('sub_1', 'cus_1', 'k', async () => json({ default_payment_method: card('12') }))).resolves.toBeNull()
    await expect(cardOnFile('sub_1', null, 'k', async () => json({}))).resolves.toBeNull()
  })
  it('opens Stripe\u2019s billing page for the customer and comes back to My passes, and only ever returns a Stripe address', async () => {
    const fn = vi.fn(async () => json({ url: 'https://billing.stripe.com/p/session/test_1' }))
    await expect(createPortalSession('cus_1', 'https://starscapesfactory.com/membership/passes', 'k', fn)).resolves.toBe('https://billing.stripe.com/p/session/test_1')
    const form = new URLSearchParams(fn.mock.calls[0][1].body); expect([form.get('customer'), form.get('return_url')]).toEqual(['cus_1', 'https://starscapesfactory.com/membership/passes'])
    await expect(createPortalSession('cus_1', 'x', 'k', async () => json({ url: 'https://evil.example/' }))).rejects.toThrow()
  })
  it('says the billing page is not set up when Stripe says it has no configuration (so the site can say so kindly)', async () => {
    const err = await createPortalSession('cus_1', 'x', 'k', async () => json({ error: { message: 'No configuration provided and your test mode default configuration has not been created.' } }, 400)).catch((e) => e)
    expect(err.code).toBe('portal_not_set_up')
    const other = await createPortalSession('cus_1', 'x', 'k', async () => json({ error: { message: 'boom' } }, 500)).catch((e) => e)
    expect(other.code).toBeUndefined()
  })
})

describe('the discount a member has', () => {
  it('records what a promo code gave on the membership, and nothing for the launch offer or no code', () => {
    const md = { user_id: USER.id, passes: 'blueprints', interval: 'month', offer_note: '20% off for 3 months' }
    expect(membershipRowFromSubscription({ id: 's', customer: 'c', status: 'active', items: { data: [] }, metadata: md }).offer_note).toBe('20% off for 3 months')
    expect(membershipRowFromSubscription({ id: 's', customer: 'c', status: 'active', items: { data: [] }, metadata: { ...md, offer_note: undefined } }).offer_note).toBeNull()
  })
  it('writes the note on the checkout ONLY with a promo code', () => {
    const base = { user: USER, passes: ['blueprints'], interval: 'month', consentAt: '2026-10-19T10:00:00.000Z', returnTo: 'https://starscapesfactory.com', offerNote: '20% off for 3 months' }
    expect(buildCheckoutForm({ ...base, promotionCodeId: 'promo_1' }).get('subscription_data[metadata][offer_note]')).toBe('20% off for 3 months')
    expect(buildCheckoutForm({ ...base, launch: true }).get('subscription_data[metadata][offer_note]')).toBeNull()
  })
})
