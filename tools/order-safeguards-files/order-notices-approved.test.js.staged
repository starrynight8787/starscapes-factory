// @vitest-environment node
// The day the wording of the customer emails IS approved, a real customer gets the notices (and only then). Here the approval switch is forced on to prove it.
import { describe, it, expect, vi } from 'vitest'
vi.mock('../lib/orderEmailText.js', async (importOriginal) => ({ ...(await importOriginal()), WORDING_APPROVED: true }))
import { sendNotice } from '../lib/orderConfirmation'

const KEY = 're_secretkey_1234567890abcdefghijklmnop'
const live = (extra = {}) => ({ stripe_session_id: 'cs_live_abc123XYZ789', livemode: true, customer_email: 'jane@example.com', amount_total: 8900, currency: 'gbp', items: [], ...extra })

describe('once the wording is approved', () => {
  it('a real customer is told "received", once, with the notice kind written on the order', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_1' }) })); const record = vi.fn(async () => true)
    const out = await sendNotice('received', live(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record, now: () => new Date('2026-10-21T12:00:00Z') })
    expect(out.status).toBe('sent')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][1].headers['Idempotency-Key']).toBe('order-received-cs_live_abc123XYZ789')
    expect(record).toHaveBeenCalledWith('stripe_session_id=eq.cs_live_abc123XYZ789', { notice_kind: 'received', notice_status: 'sent', notice_note: null, notice_sent_at: '2026-10-21T12:00:00.000Z' })
  })
  it('a real customer is told "refused" with no TEST wording in it', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_2' }) }))
    const out = await sendNotice('refused', live(), { env: { RESEND_API_KEY: KEY }, fetchImpl, record: async () => true })
    expect(out.status).toBe('sent')
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(body.subject).not.toMatch(/TEST/); expect(body.text).not.toMatch(/TEST ORDER/); expect(body.text).toContain('no contract has been made')
  })
})
