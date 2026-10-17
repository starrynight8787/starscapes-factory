// @vitest-environment node
// Sending the posted email and writing down what happened.
import { describe, it, expect, vi } from 'vitest'
import { dispatchOrder } from '../lib/dispatchEmail'

const KEY = 're_secretkey_1234567890abcdefghijklmnop'
const order = (extra = {}) => ({ stripe_session_id: 'cs_live_abc123', livemode: true, customer_name: 'Jane Smith', customer_email: 'jane@example.com', shipping: { address: { city: 'Leeds', country: 'GB' } }, items: [{ title: 'Floating', description: '21 × 30 cm, unframed', qty: 1 }], ...extra })
const ok = () => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_1' }) }))

describe('dispatchOrder', () => {
  it('sends the email and records it, keeping the tracking details', async () => {
    const fetchImpl = ok()
    const record = vi.fn(async () => true)
    const out = await dispatchOrder(order(), { url: 'https://t.example.com/x', number: 'AB123' }, { env: { RESEND_API_KEY: KEY }, fetchImpl, record, now: () => new Date('2026-10-17T12:00:00Z'), match: 'id=eq.1', keySuffix: '-manual-9' })
    expect(out).toMatchObject({ status: 'sent', saved: true })
    expect(fetchImpl.mock.calls[0][1].headers['Idempotency-Key']).toBe('order-dispatch-cs_live_abc123-manual-9')
    expect(record).toHaveBeenCalledWith('id=eq.1', { dispatch_status: 'sent', dispatch_note: null, dispatch_sent_at: '2026-10-17T12:00:00.000Z', tracking_url: 'https://t.example.com/x', tracking_number: 'AB123' })
  })
  it('sends without tracking when none is given, and records no tracking', async () => {
    const record = vi.fn(async () => true)
    await dispatchOrder(order(), {}, { env: { RESEND_API_KEY: KEY }, fetchImpl: ok(), record })
    expect(record.mock.calls[0][1]).toMatchObject({ dispatch_status: 'sent', tracking_url: null, tracking_number: null })
  })
  it('sends nothing, and says why, with no key, no address, or bad tracking', async () => {
    for (const [o, t, env, re] of [
      [order(), {}, {}, /RESEND_API_KEY/],
      [order({ customer_email: null }), {}, { RESEND_API_KEY: KEY }, /no usable email address/],
      [order(), { url: 'http://insecure.example.com' }, { RESEND_API_KEY: KEY }, /https/],
    ]) {
      const fetchImpl = vi.fn()
      const out = await dispatchOrder(o, t, { env, fetchImpl, record: vi.fn(async () => true) })
      expect(out.status).toBe('not_sent')
      expect(out.note).toMatch(re)
      expect(fetchImpl).not.toHaveBeenCalled()
    }
  })
  it('records a failure with the reason, and never the key', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ message: `bad ${KEY}` }) }))
    const record = vi.fn(async () => true)
    const out = await dispatchOrder(order(), {}, { env: { RESEND_API_KEY: KEY }, fetchImpl, record })
    expect(out.status).toBe('failed')
    expect(out.note).toMatch(/403/)
    expect(JSON.stringify(record.mock.calls)).not.toContain(KEY)
  })
  it('never throws, even if writing the result down fails or the order is broken', async () => {
    await expect(dispatchOrder(order(), {}, { env: { RESEND_API_KEY: KEY }, fetchImpl: ok(), record: vi.fn(async () => { throw new Error('db') }) })).resolves.toMatchObject({ status: 'sent', saved: false })
    await expect(dispatchOrder(null, null, { env: {}, fetchImpl: vi.fn(), record: vi.fn(async () => true) })).resolves.toBeTruthy()
  })
})
