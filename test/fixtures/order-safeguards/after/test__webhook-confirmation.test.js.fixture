// @vitest-environment node
// The payment listener, the hold switch, and the customer's emails (Gill, 21 October 2026).
//   - A TEST payment: its confirmation (TEST banner) straight away; never ordered.
//   - A REAL payment is HELD unless automatic sending is on (SEND_ORDERS_AUTOMATICALLY=yes): saved as "held", the customer told "we have received your payment", nothing ordered.
//   - A REAL payment with automatic sending on goes to Creative Hub, and the customer gets the CONFIRMATION only once Creative Hub accepts (placeAndNotify does that).
//   - A repeat of a message changes nothing. An email problem never stands in the way of answering Stripe.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

const h = vi.hoisted(() => ({
  rows: [{ id: 1 }], // what saving the order answers: a row for a new order, nothing for a repeat
  saved: [], // the orders the listener asked to save
  confirm: vi.fn(async () => ({ status: 'sent' })),
  notice: vi.fn(async () => ({ status: 'sent' })),
  place: vi.fn(async () => ({ patch: { status: 'sent' } })),
}))
vi.mock('../lib/serviceKey.js', () => ({ serviceFetch: async (_path, init) => { h.saved.push(JSON.parse(init.body)); return { ok: true, status: 201, json: async () => h.rows } } }))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: (...a) => h.confirm(...a), sendNotice: (...a) => h.notice(...a) }))
vi.mock('../lib/orderFlow.js', () => ({ placeAndNotify: (...a) => h.place(...a) }))

import { POST } from '../api/stripe-webhook.js'

const SECRET = 'whsec_test_secret'
const session = (live) => ({
  id: live ? 'cs_live_abc123' : 'cs_test_abc123',
  payment_status: 'paid',
  amount_total: 8900,
  currency: 'gbp',
  payment_intent: 'pi_1',
  customer_details: { name: 'Jane Smith', email: 'jane@example.com', phone: '07700900123' },
  shipping_details: { name: 'Jane Smith', address: { line1: '1 High St', city: 'Leeds', country: 'GB', postal_code: 'LS1 1AA' } },
  line_items: { data: [{ quantity: 1, description: 'x', price: { unit_amount: 8900, product: { name: 'Floating', description: '21 × 30 cm, unframed', metadata: { variant_id: 'v1', ch_variant_id: 'ch1' } } } }] },
})
const send = async (live) => {
  const event = { type: 'checkout.session.completed', livemode: live, data: { object: session(live) } }
  const raw = JSON.stringify(event)
  const t = Math.floor(Date.now() / 1000)
  const v1 = createHmac('sha256', SECRET).update(`${t}.${raw}`).digest('hex')
  return POST(new Request('https://x.test/api/stripe-webhook', { method: 'POST', body: raw, headers: { 'stripe-signature': `t=${t},v1=${v1}` } }))
}
const live = (extra = {}) => { Object.assign(process.env, { STRIPE_SECRET_KEY: 'sk_live_x', ...extra }); vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => session(true) }))) }

beforeEach(() => {
  h.rows = [{ id: 1 }]; h.saved = []
  for (const m of [h.confirm, h.notice, h.place]) m.mockClear()
  h.confirm.mockImplementation(async () => ({ status: 'sent' }))
  h.notice.mockImplementation(async () => ({ status: 'sent' }))
  h.place.mockImplementation(async () => ({ patch: { status: 'sent' } }))
  process.env.STRIPE_WEBHOOK_SECRET = SECRET
  process.env.CREATIVEHUB_API_KEY = 'ch_key'
  delete process.env.SEND_ORDERS_AUTOMATICALLY
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => session(false) })))
})

describe('a test payment', () => {
  it('gets its confirmation once, with the customer\u2019s details, and is never ordered or told "received"', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    const res = await send(false)
    expect(res.status).toBe(200)
    expect(h.confirm).toHaveBeenCalledTimes(1)
    const order = h.confirm.mock.calls[0][0]
    expect(order).toMatchObject({ customer_email: 'jane@example.com', stripe_session_id: 'cs_test_abc123', livemode: false })
    expect(order.items[0]).toMatchObject({ title: 'Floating', qty: 1, unit_amount: 8900 })
    expect(h.place).not.toHaveBeenCalled(); expect(h.notice).not.toHaveBeenCalled()
    expect(h.saved[0].status).toBe('test_not_sent')
  })
  it('does nothing when Stripe repeats the message (the order is already saved)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    h.rows = []
    const res = await send(false)
    expect(res.status).toBe(200)
    for (const m of [h.confirm, h.notice, h.place]) expect(m).not.toHaveBeenCalled()
  })
})

describe('a real payment while automatic sending is OFF (the default)', () => {
  it('is saved as HELD, nothing is ordered, and the customer is told their payment has arrived (not yet confirmed)', async () => {
    live()
    const res = await send(true)
    expect(res.status).toBe(200)
    expect(h.saved[0]).toMatchObject({ status: 'held', livemode: true })
    expect(h.saved[0].note).toMatch(/Held: automatic sending is switched off/)
    expect(h.place).not.toHaveBeenCalled()
    expect(h.confirm).not.toHaveBeenCalled() // no confirmation: the contract has not begun
    expect(h.notice).toHaveBeenCalledTimes(1)
    expect(h.notice.mock.calls[0][0]).toBe('received')
    expect(h.notice.mock.calls[0][1]).toMatchObject({ customer_email: 'jane@example.com', stripe_session_id: 'cs_live_abc123', status: 'held' })
  })
  it('stays held for anything that is not exactly "yes" (a typo cannot switch it on)', async () => {
    for (const value of ['', 'true', '1', 'Yes please', 'no']) {
      h.saved = []; h.place.mockClear(); live({ SEND_ORDERS_AUTOMATICALLY: value })
      await send(true)
      expect(h.saved[0].status, value).toBe('held'); expect(h.place, value).not.toHaveBeenCalled()
    }
  })
  it('does not tell the customer twice when Stripe repeats the message', async () => {
    live(); h.rows = []
    await send(true)
    for (const m of [h.confirm, h.notice, h.place]) expect(m).not.toHaveBeenCalled()
  })
  it('still answers 200, and keeps the held order, even if the notice email were to throw', async () => {
    live(); h.notice.mockImplementation(async () => { throw new Error('email exploded') })
    const res = await send(true)
    expect(res.status).toBe(200)
    expect(h.saved[0].status).toBe('held')
  })
})

describe('a real payment with automatic sending ON', () => {
  it('goes to Creative Hub once; the listener leaves the emails to the flow (confirmation only after acceptance)', async () => {
    live({ SEND_ORDERS_AUTOMATICALLY: 'yes' })
    const res = await send(true)
    expect(res.status).toBe(200)
    expect(h.saved[0].status).toBe('sending')
    expect(h.place).toHaveBeenCalledTimes(1)
    expect(h.place.mock.calls[0][0]).toMatchObject({ stripe_session_id: 'cs_live_abc123', customer_email: 'jane@example.com' })
    expect(h.place.mock.calls[0][1]).toBe('stripe_session_id=eq.cs_live_abc123')
    expect(h.confirm).not.toHaveBeenCalled(); expect(h.notice).not.toHaveBeenCalled()
  })
  it('does not go to Creative Hub when the order cannot be placed (no key): it is "needs attention" and the customer is told "received"', async () => {
    live({ SEND_ORDERS_AUTOMATICALLY: 'yes' }); delete process.env.CREATIVEHUB_API_KEY; delete process.env.CREATIVEHUB_API_TOKEN
    const res = await send(true)
    expect(res.status).toBe(200)
    expect(h.saved[0].status).toBe('needs_attention')
    expect(h.place).not.toHaveBeenCalled()
    expect(h.notice).toHaveBeenCalledTimes(1); expect(h.notice.mock.calls[0][0]).toBe('received')
  })
  it('does not order twice when Stripe repeats the message', async () => {
    live({ SEND_ORDERS_AUTOMATICALLY: 'yes' }); h.rows = []
    await send(true)
    expect(h.place).not.toHaveBeenCalled()
  })
})

describe('a message that is not to be trusted', () => {
  it('with a bad signature: no order, no email', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    const res = await POST(new Request('https://x.test/api/stripe-webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=bad' } }))
    expect(res.status).toBe(400)
    for (const m of [h.confirm, h.notice, h.place]) expect(m).not.toHaveBeenCalled()
    expect(h.saved).toEqual([])
  })
})
