// @vitest-environment node
// The payment listener and the confirmation email: once per new order, never for a repeat, and never in the way of the order.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

const h = vi.hoisted(() => ({
  rows: [{ id: 1 }], // what saving the order answers: a row for a new order, nothing for a repeat
  confirm: vi.fn(async () => ({ status: 'sent' })),
  place: vi.fn(async () => ({ patch: { status: 'sent' } })),
}))
vi.mock('../lib/serviceKey.js', () => ({ serviceFetch: async () => ({ ok: true, status: 201, json: async () => h.rows }) }))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: (...a) => h.confirm(...a) }))
vi.mock('../lib/orderFlow.js', () => ({ placeAndRecord: (...a) => h.place(...a) }))

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

beforeEach(() => {
  h.rows = [{ id: 1 }]
  h.confirm.mockClear()
  h.place.mockClear()
  h.confirm.mockImplementation(async () => ({ status: 'sent' }))
  process.env.STRIPE_WEBHOOK_SECRET = SECRET
  process.env.CREATIVEHUB_API_KEY = 'ch_key'
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => session(false) })))
})

describe('the payment listener and the confirmation email', () => {
  it('sends the confirmation once, for a new order, with the customer\u2019s details', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    const res = await send(false)
    expect(res.status).toBe(200)
    expect(h.confirm).toHaveBeenCalledTimes(1)
    const order = h.confirm.mock.calls[0][0]
    expect(order).toMatchObject({ customer_email: 'jane@example.com', stripe_session_id: 'cs_test_abc123', livemode: false })
    expect(order.items[0]).toMatchObject({ title: 'Floating', qty: 1, unit_amount: 8900 })
  })
  it('does not send it again when Stripe repeats the message (the order is already saved)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    h.rows = []
    const res = await send(false)
    expect(res.status).toBe(200)
    expect(h.confirm).not.toHaveBeenCalled()
  })
  it('still places the real order at Creative Hub, and still answers 200, even if the email step were to throw', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x'
    h.confirm.mockImplementation(async () => { throw new Error('email exploded') })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => session(true) })))
    const res = await send(true)
    expect(res.status).toBe(200)
    expect(h.confirm).toHaveBeenCalledTimes(1)
    expect(h.place).toHaveBeenCalledTimes(1)
  })
  it('ignores a message with a bad signature: no order, no email', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    const res = await POST(new Request('https://x.test/api/stripe-webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=bad' } }))
    expect(res.status).toBe(400)
    expect(h.confirm).not.toHaveBeenCalled()
  })
})
