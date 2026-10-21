// @vitest-environment node
// The email to the OWNER when a real paid order needs her (Gill, 21 October 2026). It never carries a customer's details, never goes for a test payment, and never changes what
// happens to the order.
import { describe, it, expect, vi } from 'vitest'
import { buildOwnerAlert, sendOwnerAlert, ALERT_KINDS, PANEL_URL } from '../lib/ownerAlert'
import { reference, WORDING_APPROVED } from '../lib/orderEmailText'
import { CONTACT_EMAIL } from '../src/data/contact'

const KEY = 're_secretkey_1234567890abcdefghijklmnop'
const order = (extra = {}) => ({
  stripe_session_id: 'cs_live_abc123XYZ789', livemode: true, customer_name: 'Jane Smith', customer_email: 'jane@example.com', customer_phone: '07700900123',
  shipping: { name: 'Jane Smith', address: { line1: '1 High St', city: 'Leeds', country: 'GB', postal_code: 'LS1 1AA' } },
  amount_total: 8900, currency: 'gbp', items: [{ title: 'Floating', qty: 2 }], ...extra,
})
const ok = () => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_1' }) }))

describe('the alert', () => {
  it('has three kinds: held, needs_attention, check', () => { expect(ALERT_KINDS).toEqual(['held', 'needs_attention', 'check']) })
  it('for a HELD order says why, what to press, where the panel is, and the order number, amount and items', () => {
    const a = buildOwnerAlert('held', order())
    expect(a.subject).toBe(`A paid order needs you: ${reference(order())} (held for your OK)`)
    for (const piece of [`Order: ${reference(order())}`, 'Amount: £89.00', 'Items: 2', 'Automatic sending is switched off', 'Nothing has been ordered or charged at Creative Hub', 'Send to Creative Hub', 'Cancel and refund', PANEL_URL]) {
      expect(a.text, piece).toContain(piece)
    }
    expect(PANEL_URL).toBe('https://starscapesfactory.com/art-loft/admin')
    expect(a.html).toContain(`<a href="${PANEL_URL}">${PANEL_URL}</a>`)
  })
  it('for an order that could not be sent says nothing was ordered and to fix the cause, or cancel and refund', () => {
    const a = buildOwnerAlert('needs_attention', order())
    expect(a.subject).toMatch(/could not be sent/); expect(a.text).toMatch(/Nothing has been ordered/); expect(a.text).toMatch(/Cancel and refund/)
  })
  it('for a lost answer says to LOOK at Creative Hub first and not to send it again', () => {
    const a = buildOwnerAlert('check', order())
    expect(a.subject).toMatch(/check Creative Hub/); expect(a.text).toMatch(/may or may not have this order/); expect(a.text).toMatch(/Look for it at Creative Hub/); expect(a.text).toMatch(/Do NOT send it again until you have looked/)
  })
  it('NEVER carries a customer\u2019s name, email address, phone number or delivery address, in any kind, subject, text or HTML', () => {
    for (const kind of ALERT_KINDS) {
      const a = buildOwnerAlert(kind, order(), { detail: 'Creative Hub refused the order as it was sent.' })
      for (const secret of ['Jane', 'Smith', 'jane@example.com', '07700900123', 'High St', 'Leeds', 'LS1 1AA']) {
        for (const part of [a.subject, a.text, a.html]) expect(part, `${kind}: ${secret}`).not.toContain(secret)
      }
    }
  })
  it('includes a note when given one, cut to a sensible length, and never lets it break the HTML', () => {
    const a = buildOwnerAlert('needs_attention', order(), { detail: '<script>alert(1)</script> ' + 'x'.repeat(600) })
    expect(a.text).toMatch(/^Note: /m); expect(a.text.split('\n').find((l) => l.startsWith('Note: ')).length).toBeLessThanOrEqual(406)
    expect(a.html).not.toContain('<script>'); expect(a.html).toContain('&lt;script&gt;')
    expect(buildOwnerAlert('held', order()).text).not.toMatch(/^Note: /m)
  })
  it('leaves out the amount and items when they are not known, with no "NaN" or "undefined"', () => {
    const a = buildOwnerAlert('held', order({ amount_total: null, items: [] }))
    expect(a.text).not.toMatch(/Amount:|Items:|NaN|undefined|null/)
  })
  it('refuses an alert that does not exist', () => { expect(() => buildOwnerAlert('hello', order())).toThrow(/no alert called hello/) })
})

describe('sending it', () => {
  it('goes to the shop\u2019s own address for a real order, with a once-only key, and writes down that it went', async () => {
    const fetchImpl = ok(); const record = vi.fn(async () => true)
    const out = await sendOwnerAlert('held', order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record, now: () => new Date('2026-10-21T12:00:00Z') })
    expect(out).toEqual({ status: 'sent', saved: true })
    const [, init] = fetchImpl.mock.calls[0]
    expect(JSON.parse(init.body)).toMatchObject({ to: [CONTACT_EMAIL], subject: expect.stringMatching(/^A paid order needs you: SF-/) })
    expect(init.headers['Idempotency-Key']).toBe('owner-alert-held-cs_live_abc123XYZ789')
    expect(record).toHaveBeenCalledWith('stripe_session_id=eq.cs_live_abc123XYZ789', { owner_alert_status: 'sent', owner_alert_sent_at: '2026-10-21T12:00:00.000Z' })
  })
  it('is not held back by the customer-email approval (it is internal): it goes while that wording is still unapproved', async () => {
    expect(WORDING_APPROVED).toBe(false)
    const fetchImpl = ok()
    expect((await sendOwnerAlert('held', order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record: async () => true })).status).toBe('sent')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it('uses the match it is given, and a different once-only key for each kind', async () => {
    const fetchImpl = ok(); const record = vi.fn(async () => true)
    await sendOwnerAlert('check', order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record, match: 'id=eq.abc', detail: 'x' })
    expect(fetchImpl.mock.calls[0][1].headers['Idempotency-Key']).toBe('owner-alert-check-cs_live_abc123XYZ789'); expect(record.mock.calls[0][0]).toBe('id=eq.abc')
  })
  it('is NEVER sent for a test payment, and writes nothing', async () => {
    const fetchImpl = ok(); const record = vi.fn(async () => true)
    const out = await sendOwnerAlert('held', order({ livemode: false }), { env: { RESEND_API_KEY: KEY }, fetchImpl, record })
    expect(out.status).toBe('skipped'); expect(fetchImpl).not.toHaveBeenCalled(); expect(record).not.toHaveBeenCalled()
  })
  it('says NOT SENT, on the order, when there is no Resend key', async () => {
    const fetchImpl = ok(); const record = vi.fn(async () => true)
    const out = await sendOwnerAlert('held', order(), { env: {}, fetchImpl, record })
    expect(out.status).toBe('not_sent'); expect(fetchImpl).not.toHaveBeenCalled()
    expect(record.mock.calls[0][1]).toEqual({ owner_alert_status: 'not_sent', owner_alert_sent_at: null })
  })
  it('says FAILED, on the order, when the email service refuses, and never throws', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ message: 'no' }) })); const record = vi.fn(async () => true)
    const out = await sendOwnerAlert('held', order(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record })
    expect(out.status).toBe('failed'); expect(record.mock.calls[0][1]).toEqual({ owner_alert_status: 'failed', owner_alert_sent_at: null })
  })
  it('never throws, even for a kind that does not exist or when writing it down throws', async () => {
    const bad = await sendOwnerAlert('hello', order(), { env: { RESEND_API_KEY: KEY }, fetchImpl: ok(), record: async () => true })
    expect(bad.status).toBe('failed')
    const out = await sendOwnerAlert('held', order(), { env: { RESEND_API_KEY: KEY }, fetchImpl: ok(), record: async () => { throw new Error('db down') } })
    expect(out).toEqual({ status: 'sent', saved: false })
  })
})
