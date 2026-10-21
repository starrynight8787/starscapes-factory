// @vitest-environment node
// The two short customer notices (Gill, 21 October 2026): "we have received your payment" (not yet the confirmation) and "we could not accept your order, you have been refunded".
import { describe, it, expect, vi } from 'vitest'
import { buildNotice, NOTICE_KINDS, reference, WORDING_APPROVED } from '../lib/orderEmailText'
import { sendNotice } from '../lib/orderConfirmation'
import { CONTACT_EMAIL } from '../src/data/contact'

const KEY = 're_secretkey_1234567890abcdefghijklmnop'
const order = (extra = {}) => ({
  stripe_session_id: 'cs_live_abc123XYZ789', livemode: true, customer_name: 'Jane Smith', customer_email: 'jane@example.com',
  amount_total: 8900, currency: 'gbp', items: [{ title: 'Floating', description: '21 × 30 cm, unframed', qty: 1, unit_amount: 8900 }], ...extra,
})
const testOrder = (extra = {}) => order({ stripe_session_id: 'cs_test_abc123XYZ789', livemode: false, ...extra })
const ok = () => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_1' }) }))

describe('the notices', () => {
  it('are exactly two: received and refused', () => { expect(NOTICE_KINDS).toEqual(['received', 'refused']) })
  it('"received" says the payment has arrived, that this is NOT yet the confirmation, that we refund if we cannot make it, and who to write to', () => {
    const n = buildNotice('received', order())
    expect(n.subject).toBe(`We have received your payment: order ${reference(order())}`)
    for (const piece of ['We have received your payment of £89.00', reference(order()), 'This is not yet the confirmation of your order', 'we will email you again as soon as it is confirmed', 'refund everything you paid', 'after 2 working days', CONTACT_EMAIL]) {
      expect(n.text, piece).toContain(piece); expect(n.html, piece).toContain(piece)
    }
  })
  it('"refused" says no contract was made, nothing will be made or posted, the amount refunded to the card, that the bank may take days, and who to write to', () => {
    const n = buildNotice('refused', order())
    expect(n.subject).toBe(`We could not accept your order ${reference(order())}: you have been refunded`)
    for (const piece of ['we could not accept your order', 'no contract has been made', 'nothing will be made or posted', 'refunded everything you paid (£89.00) to the card you paid with', 'Your bank may take a few days to show it', 'We are sorry for the trouble', CONTACT_EMAIL]) {
      expect(n.text, piece).toContain(piece); expect(n.html, piece).toContain(piece)
    }
  })
  it('never claim the order is confirmed, or promise a delivery date or tracking (they are not the confirmation)', () => {
    for (const kind of NOTICE_KINDS) {
      const { text } = buildNotice(kind, order())
      expect(text, kind).not.toMatch(/deliver|tracking|posted to you|within \d+ (to \d+ )?working days of/i)
      expect(text, kind).not.toMatch(/thank you for your order|your order is confirmed|we have confirmed|your right to cancel/i)
    }
  })
  it('read properly when the amount is not known (no "NaN", no "undefined", no stray gaps)', () => {
    for (const kind of NOTICE_KINDS) {
      const { text } = buildNotice(kind, order({ amount_total: null }))
      expect(text, kind).not.toMatch(/NaN|undefined|null|\(\)|  /)
    }
    expect(buildNotice('received', order({ amount_total: null })).text).toContain(`We have received your payment for order ${reference(order())}.`)
    expect(buildNotice('refused', order({ amount_total: null })).text).toContain('refunded everything you paid to the card you paid with')
  })
  it('carry the TEST banner and a [TEST] subject for a test order, and the DRAFT banner while the wording is not approved', () => {
    expect(WORDING_APPROVED).toBe(false) // the day this changes, the DRAFT banner goes and this expectation must change with it
    for (const kind of NOTICE_KINDS) {
      const t = buildNotice(kind, testOrder())
      expect(t.subject).toMatch(/^\[TEST\] /); expect(t.text).toContain('THIS IS A TEST ORDER'); expect(t.text).toContain('DRAFT WORDING')
      const l = buildNotice(kind, order())
      expect(l.subject).not.toMatch(/TEST/); expect(l.text).not.toContain('THIS IS A TEST ORDER')
    }
  })
  it('refuse a notice that does not exist', () => {
    expect(() => buildNotice('promise', order())).toThrow(/no notice called promise/)
  })
})

describe('sending a notice', () => {
  it('sends it for a test payment once the Resend key is set, with its own once-only key, and writes down that it went', async () => {
    const fetchImpl = ok(); const record = vi.fn(async () => true)
    const out = await sendNotice('received', testOrder(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record, now: () => new Date('2026-10-21T12:00:00Z') })
    expect(out).toMatchObject({ status: 'sent', saved: true })
    const [, init] = fetchImpl.mock.calls[0]
    expect(init.headers['Idempotency-Key']).toBe('order-received-cs_test_abc123XYZ789')
    expect(JSON.parse(init.body)).toMatchObject({ to: ['jane@example.com'], subject: expect.stringMatching(/^\[TEST\] We have received your payment/) })
    expect(record).toHaveBeenCalledWith('stripe_session_id=eq.cs_test_abc123XYZ789', { notice_kind: 'received', notice_status: 'sent', notice_note: null, notice_sent_at: '2026-10-21T12:00:00.000Z' })
  })
  it('uses a different once-only key for each kind, and the match it is given', async () => {
    const fetchImpl = ok(); const record = vi.fn(async () => true)
    await sendNotice('refused', testOrder(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record, match: 'id=eq.abc', keySuffix: '-x' })
    expect(fetchImpl.mock.calls[0][1].headers['Idempotency-Key']).toBe('order-refused-cs_test_abc123XYZ789-x')
    expect(record.mock.calls[0][0]).toBe('id=eq.abc'); expect(record.mock.calls[0][1].notice_kind).toBe('refused')
  })
  it('does NOT send to a real customer while the wording is not approved, and says so on the order', async () => {
    const fetchImpl = ok(); const record = vi.fn(async () => true)
    const out = await sendNotice('received', order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record })
    expect(out.status).toBe('not_sent'); expect(out.note).toMatch(/wording of the customer emails has not been approved/); expect(out.note).toMatch(/Email the customer yourself/)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(record.mock.calls[0][1]).toMatchObject({ notice_status: 'not_sent', notice_kind: 'received' })
  })
  it('is not sent, and the order says why, with no usable address or no Resend key', async () => {
    const fetchImpl = ok()
    const noAddress = await sendNotice('received', testOrder({ customer_email: 'not an email' }), { env: { RESEND_API_KEY: KEY }, fetchImpl, record: async () => true })
    expect(noAddress.status).toBe('not_sent'); expect(noAddress.note).toMatch(/no usable email address/)
    const noKey = await sendNotice('refused', testOrder(), { env: {}, fetchImpl, record: async () => true })
    expect(noKey.status).toBe('not_sent'); expect(noKey.note).toMatch(/RESEND_API_KEY/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('says it FAILED, with the reason, when the email service refuses (and never throws)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ message: 'nope' }) }))
    const out = await sendNotice('received', testOrder(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record: async () => true })
    expect(out.status).toBe('failed'); expect(out.note).toMatch(/^Not sent: /)
  })
  it('refuses a kind that does not exist, without sending anything', async () => {
    const fetchImpl = ok()
    const out = await sendNotice('promise', testOrder(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record: async () => true })
    expect(out.status).toBe('failed'); expect(out.note).toMatch(/does not exist/); expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('never throws, even if writing it down throws, and says it could not be written down', async () => {
    const out = await sendNotice('received', testOrder(), { env: { RESEND_API_KEY: KEY }, fetchImpl: ok(), record: async () => { throw new Error('db down') } })
    expect(out).toMatchObject({ status: 'sent', saved: false })
  })
})
