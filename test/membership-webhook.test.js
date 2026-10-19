// @vitest-environment node
// The membership webhook (api/membership-webhook.js): Stripe's messages, a pretend Stripe and a pretend database. And the shop's webhook ignoring memberships.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { POST, GET } from '../api/membership-webhook.js'
import { POST as shopPOST } from '../api/stripe-webhook.js'

const SECRET = 'whsec_membership'
const SHOP_SECRET = 'whsec_shop'
const USER_ID = '11111111-2222-4333-8444-555555555555'
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const sign = (raw, secret = SECRET, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`
const request = (event, { secret = SECRET, signature } = {}) => {
  const raw = typeof event === 'string' ? event : JSON.stringify(event)
  return new Request('https://x.test/api/membership-webhook', { method: 'POST', headers: { 'stripe-signature': signature ?? sign(raw, secret) }, body: raw })
}
const subscription = (over = {}) => ({ id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: false, current_period_end: 1800000000, start_date: 1760000000, items: { data: [{ price: { recurring: { interval: 'month' } } }] }, metadata: { user_id: USER_ID, passes: 'blueprints,book-club', interval: 'month', launch_offer: 'yes' }, ...over })
const eventOf = (type, object, livemode = false) => ({ id: 'evt_1', type, livemode, data: { object } })

function network({ current = subscription(), stripeFails = false, dbFails = false } = {}) {
  const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url)
    calls.push({ url: u, init })
    if (u.startsWith('https://api.stripe.com/v1/subscriptions/')) return stripeFails ? json({}, 500) : json(current)
    if (u.includes('/rest/v1/memberships')) return dbFails ? json({ message: 'db down' }, 500) : json(null, 201)
    throw new Error(`unexpected request: ${u}`)
  })
  fn.calls = calls
  return fn
}
const saved = (fn) => fn.calls.filter((c) => c.url.includes('/rest/v1/memberships'))
const stripeReads = (fn) => fn.calls.filter((c) => c.url.startsWith('https://api.stripe.com'))

beforeEach(() => {
  process.env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET = SECRET; process.env.STRIPE_WEBHOOK_SECRET = SHOP_SECRET; process.env.STRIPE_SECRET_KEY = 'sk_test_abc'
  process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'
})
afterEach(() => vi.unstubAllGlobals())
const withNetwork = (o) => { const fn = network(o); vi.stubGlobal('fetch', fn); return fn }

describe('believing only Stripe', () => {
  it('is not set up without its own signing secret', async () => {
    delete process.env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET; const fn = withNetwork()
    expect((await POST(request(eventOf('customer.subscription.updated', subscription())))).status).toBe(503); expect(fn.calls).toHaveLength(0)
  })
  it('throws away a message with a wrong or missing signature, and touches nothing', async () => {
    const fn = withNetwork()
    for (const signature of ['', 'garbage', sign('{}', 'whsec_wrong')]) expect((await POST(request(eventOf('customer.subscription.updated', subscription()), { signature }))).status, signature).toBe(400)
    expect(fn.calls).toHaveLength(0)
  })
  it('throws away a message signed with the SHOP\'s secret (they are separate)', async () => {
    const fn = withNetwork(); expect((await POST(request(eventOf('customer.subscription.updated', subscription()), { secret: SHOP_SECRET }))).status).toBe(400); expect(fn.calls).toHaveLength(0)
  })
  it('throws away an old message, in case it was stolen and replayed', async () => {
    const fn = withNetwork(); const raw = JSON.stringify(eventOf('customer.subscription.updated', subscription()))
    expect((await POST(request(raw, { signature: sign(raw, SECRET, Math.floor(Date.now() / 1000) - 3600) }))).status).toBe(400); expect(fn.calls).toHaveLength(0)
  })
  it('says no to a message that is not JSON, even if signed', async () => {
    expect((await POST(request('not json'))).status).toBe(400)
  })
  it('only takes messages (a plain visit gets a polite no)', async () => {
    expect(GET().status).toBe(405)
  })
})

describe('recording a membership', () => {
  it('saves the membership when a subscription checkout is completed, reading the subscription fresh from Stripe', async () => {
    const fn = withNetwork(); const r = await POST(request(eventOf('checkout.session.completed', { id: 'cs_1', mode: 'subscription', subscription: 'sub_1', payment_status: 'paid' })))
    expect(r.status).toBe(200)
    expect(stripeReads(fn).map((c) => c.url)).toEqual(['https://api.stripe.com/v1/subscriptions/sub_1'])
    const save = saved(fn)[0]
    expect(save.url).toContain('/rest/v1/memberships?on_conflict=user_id'); expect(save.init.method).toBe('POST'); expect(save.init.headers.Prefer).toBe('resolution=merge-duplicates,return=minimal')
    expect(JSON.parse(save.init.body)).toMatchObject({ user_id: USER_ID, stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', status: 'active', passes: ['blueprints', 'book-club'], billing_interval: 'month' })
  })
  it('updates it when a subscription changes or is cancelled', async () => {
    for (const type of ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']) {
      const fn = withNetwork(); expect((await POST(request(eventOf(type, subscription())))).status, type).toBe(200)
      expect(stripeReads(fn)[0].url).toBe('https://api.stripe.com/v1/subscriptions/sub_1'); expect(saved(fn)).toHaveLength(1)
    }
  })
  it('never trusts what the message says: it saves what Stripe says NOW (so a late or repeated message cannot undo a cancellation)', async () => {
    const fn = withNetwork({ current: subscription({ status: 'canceled', cancel_at_period_end: true }) })
    await POST(request(eventOf('customer.subscription.updated', subscription({ status: 'active', metadata: { user_id: USER_ID, passes: 'blueprints,book-club,authors-notebook,early-drafts', interval: 'year' } }))))
    expect(JSON.parse(saved(fn)[0].init.body)).toMatchObject({ status: 'canceled', cancel_at_period_end: true, passes: ['blueprints', 'book-club'], billing_interval: 'month' })
  })
  it('is safe to receive twice: it just saves the same row again', async () => {
    const fn = withNetwork(); const e = eventOf('customer.subscription.updated', subscription())
    await POST(request(e)); await POST(request(e))
    const [a, b] = saved(fn).map((c) => { const row = JSON.parse(c.init.body); delete row.updated_at; return row }); expect(a).toEqual(b)
  })
})

describe('what it ignores', () => {
  it('a payment for a print (not a subscription): the shop\'s own listener deals with it', async () => {
    const fn = withNetwork(); const r = await POST(request(eventOf('checkout.session.completed', { id: 'cs_9', mode: 'payment', payment_status: 'paid' })))
    expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ ignored: 'not a membership' }); expect(fn.calls).toHaveLength(0)
  })
  it('message types it did not ask for', async () => {
    const fn = withNetwork(); const r = await POST(request(eventOf('customer.created', { id: 'cus_1' })))
    expect(r.status).toBe(200); expect(fn.calls).toHaveLength(0)
  })
  it('a subscription that did not come from our checkout (no user on it)', async () => {
    const fn = withNetwork({ current: subscription({ metadata: {} }) }); const r = await POST(request(eventOf('customer.subscription.updated', subscription({ metadata: {} }))))
    expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ ignored: 'not from our checkout' }); expect(saved(fn)).toHaveLength(0)
  })
  it('a message from the other mode (a live message with a test key), which it cannot read', async () => {
    const fn = withNetwork(); const r = await POST(request(eventOf('customer.subscription.updated', subscription(), true)))
    expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ ignored: 'wrong mode for this key' }); expect(fn.calls).toHaveLength(0)
  })
})

describe('when something goes wrong, Stripe is told to try again', () => {
  it('answers 500 if Stripe cannot be asked, and saves nothing', async () => {
    const fn = withNetwork({ stripeFails: true }); expect((await POST(request(eventOf('customer.subscription.updated', subscription())))).status).toBe(500); expect(saved(fn)).toHaveLength(0)
  })
  it('writes the reason to the log (never a key) when it could not record a membership', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    withNetwork({ dbFails: true }); await POST(request(eventOf('customer.subscription.updated', subscription())))
    const logged = spy.mock.calls.map((c) => String(c[0])).join('\n')
    expect(logged).toContain('[membership] recording a membership (customer.subscription.updated): database answered 500'); expect(logged).not.toMatch(/sk_test|srv|whsec/); spy.mockRestore()
  })
  it('answers 500 if the database cannot be written, without showing what it said', async () => {
    withNetwork({ dbFails: true }); const r = await POST(request(eventOf('customer.subscription.updated', subscription())))
    expect(r.status).toBe(500); expect(JSON.stringify(await r.json())).not.toMatch(/sk_test|srv|whsec/)
  })
})

describe('the shop\'s own listener', () => {
  it('ignores a membership payment, so it can never become a print order', async () => {
    const fn = withNetwork(); const raw = JSON.stringify(eventOf('checkout.session.completed', { id: 'cs_1', mode: 'subscription', subscription: 'sub_1', payment_status: 'paid' }))
    const r = await shopPOST(new Request('https://x.test/api/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': sign(raw, SHOP_SECRET) }, body: raw }))
    expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ ignored: 'membership' }); expect(fn.calls).toHaveLength(0)
  })
})
