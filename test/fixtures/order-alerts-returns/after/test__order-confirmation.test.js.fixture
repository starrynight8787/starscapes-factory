// @vitest-environment node
// Deciding whether to send the confirmation, sending it, and writing down what happened.
import { describe, it, expect, vi } from 'vitest'
import { confirmOrder, confirmationProblems } from '../lib/orderConfirmation'
import { WORDING_APPROVED } from '../lib/orderEmailText'

const KEY = 're_secretkey_1234567890abcdefghijklmnop'
const order = (extra = {}) => ({
  stripe_session_id: 'cs_test_abc123XYZ789',
  livemode: false,
  customer_name: 'Jane Smith',
  customer_email: 'jane@example.com',
  shipping: { name: 'Jane Smith', address: { line1: '1 High St', city: 'Leeds', country: 'GB' } },
  amount_total: 8900,
  currency: 'gbp',
  items: [{ title: 'Floating', description: '21 × 30 cm, unframed', qty: 1, unit_amount: 8900 }],
  ...extra,
})
const ok = () => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_1' }) }))

describe('a test payment', () => {
  it('gets the email once the Resend key is set, and the order says it was sent', async () => {
    const fetchImpl = ok()
    const record = vi.fn(async () => true)
    const out = await confirmOrder(order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record, now: () => new Date('2026-10-17T12:00:00Z') })
    expect(out).toMatchObject({ status: 'sent', saved: true })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [, init] = fetchImpl.mock.calls[0]
    expect(init.headers['Idempotency-Key']).toBe('order-confirmation-cs_test_abc123XYZ789')
    expect(JSON.parse(init.body).subject).toMatch(/^\[TEST\] /)
    expect(record).toHaveBeenCalledWith('stripe_session_id=eq.cs_test_abc123XYZ789', { confirmation_status: 'sent', confirmation_note: null, confirmation_sent_at: '2026-10-17T12:00:00.000Z' })
  })
  it('is not sent, and the order says why, when there is no Resend key', async () => {
    const fetchImpl = vi.fn()
    const record = vi.fn(async () => true)
    const out = await confirmOrder(order(), { env: {}, fetchImpl, record })
    expect(out.status).toBe('not_sent')
    expect(out.note).toMatch(/RESEND_API_KEY/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('a real payment', () => {
  it('gets NOTHING while the wording is unapproved, and the order says so in plain words', async () => {
    expect(WORDING_APPROVED).toBe(false)
    const fetchImpl = vi.fn()
    const record = vi.fn(async () => true)
    const out = await confirmOrder(order({ livemode: true }), { env: { RESEND_API_KEY: KEY }, fetchImpl, record })
    expect(out.status).toBe('not_sent')
    expect(out.note).toMatch(/not been approved/)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(record.mock.calls[0][1].confirmation_status).toBe('not_sent')
  })
})

describe('when things go wrong', () => {
  it('records a failure with Resend\u2019s reason, and never the key', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ message: `bad ${KEY}` }) }))
    const record = vi.fn(async () => true)
    const out = await confirmOrder(order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record })
    expect(out.status).toBe('failed')
    expect(out.note).toMatch(/403/)
    expect(JSON.stringify(record.mock.calls)).not.toContain(KEY)
  })
  it('does not send, and says so, if the payment has no usable email address', async () => {
    const fetchImpl = vi.fn()
    const out = await confirmOrder(order({ customer_email: null }), { env: { RESEND_API_KEY: KEY }, fetchImpl, record: vi.fn(async () => true) })
    expect(out.status).toBe('not_sent')
    expect(out.note).toMatch(/no usable email address/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('never throws, even if writing the result down fails or the order is broken', async () => {
    await expect(confirmOrder(order(), { env: { RESEND_API_KEY: KEY }, fetchImpl: ok(), record: vi.fn(async () => { throw new Error('db down') }) })).resolves.toMatchObject({ status: 'sent', saved: false })
    await expect(confirmOrder(null, { env: {}, fetchImpl: vi.fn(), record: vi.fn(async () => true) })).resolves.toBeTruthy()
    await expect(confirmOrder(order({ items: 'nonsense', shipping: 5 }), { env: { RESEND_API_KEY: KEY }, fetchImpl: ok(), record: vi.fn(async () => true) })).resolves.toBeTruthy()
  })
  it('uses a different Resend idempotency key for a manual resend, so a failed first try cannot block it', async () => {
    const fetchImpl = ok()
    await confirmOrder(order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record: vi.fn(async () => true), match: 'id=eq.1', keySuffix: '-manual-5' })
    expect(fetchImpl.mock.calls[0][1].headers['Idempotency-Key']).toBe('order-confirmation-cs_test_abc123XYZ789-manual-5')
  })
})

describe('confirmationProblems (what keeps real checkout closed)', () => {
  it('lists the missing key and the unapproved wording, and no gap about returns (nothing is left to decide there: Gill, 21 October 2026)', () => {
    const problems = confirmationProblems({})
    expect(problems.join(' ')).toMatch(/RESEND_API_KEY/)
    expect(problems.join(' ')).toMatch(/not been approved/)
    expect(problems.join(' ')).not.toMatch(/Still to decide/)
    expect(problems).toHaveLength(2)
  })
  it('is never empty while the wording is unapproved, even with the key set', () => {
    expect(confirmationProblems({ RESEND_API_KEY: KEY }).length).toBeGreaterThan(0)
  })
})
