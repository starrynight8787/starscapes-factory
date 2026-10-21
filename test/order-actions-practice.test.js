// @vitest-environment node
// The PRACTICE route (Gill, 21 October 2026), so a tester can rehearse the cancel-and-refund journey with TEST payments: no money was taken, nothing goes near Creative Hub, and the
// customer emails carry a TEST banner. Plus samples of the two short customer emails, for TEST orders only, so she can read them before approving the wording.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  owner: { ok: true }, row: null, patch: { ok: true, rows: [{ id: 'x' }] }, patchCalls: [],
  notice: vi.fn(async () => ({ status: 'sent', note: null, saved: true })),
  place: vi.fn(async () => ({ patch: { status: 'sent' } })),
}))
vi.mock('../lib/ownerGuard.js', () => ({ requireOwner: async () => h.owner, sendDenied: (res) => res.status(403).json({ ok: false, message: 'no' }) }))
vi.mock('../lib/orderFlow.js', () => ({
  patchOrder: vi.fn(async (match, expected, body) => { h.patchCalls.push({ match, expected, body }); return h.patch }),
  claimOrder: vi.fn(async () => ({ won: true, row: {} })),
  placeAndNotify: (...a) => h.place(...a),
}))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: vi.fn(), sendNotice: (...a) => h.notice(...a), confirmationProblems: () => [] }))
vi.mock('../lib/creativehubOrders.js', async (importOriginal) => ({ ...(await importOriginal()), creativehubSettings: () => ({ token: 't', base: 'https://ch.test' }), settingsUsable: () => true }))
vi.mock('../lib/serviceKey.js', () => ({ databaseUrl: () => 'https://db.test', serviceKeys: () => ['k'], saidWhat: async () => '', serviceFetch: async () => ({ ok: true, status: 200, json: async () => (h.row ? [h.row] : []) }) }))

import handler from '../api/order-actions.js'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const call = async (body) => {
  const out = { status: null, body: null }
  const res = { setHeader() {}, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', headers: {}, body }, res)
  return out
}
const testRow = (extra = {}) => ({ id: ID, livemode: false, status: 'test_not_sent', stripe_session_id: 'cs_test_1', customer_email: 'tester@example.com', customer_name: 'Terry Tester', amount_total: 8900, currency: 'gbp', created_at: new Date().toISOString(), items: [], ...extra })
const liveRow = (extra = {}) => testRow({ livemode: true, status: 'held', stripe_session_id: 'cs_live_1', ...extra })
const practise = (extra = {}) => call({ action: 'mark_refunded', id: ID, confirm_refunded: true, ...extra })
const sample = (extra = {}) => call({ action: 'send_sample', id: ID, kind: 'received', ...extra })

beforeEach(() => {
  h.owner = { ok: true }; h.row = testRow(); h.patch = { ok: true, rows: [{ id: ID, status: 'refunded' }] }; h.patchCalls = []
  h.notice.mockClear(); h.notice.mockImplementation(async () => ({ status: 'sent', note: null, saved: true })); h.place.mockClear()
})
afterEach(() => { vi.useRealTimers() })

describe('practising cancel and refund on a TEST order', () => {
  it('marks it refunded (only while it is "test_not_sent"), says it was practice, and sends the TEST email', async () => {
    const out = await practise()
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, outcome: 'refunded' })
    expect(out.body.message).toMatch(/^Practice done/); expect(out.body.message).toMatch(/TEST email has been sent/)
    expect(h.patchCalls).toHaveLength(1)
    expect(h.patchCalls[0].expected).toEqual(['test_not_sent'])
    expect(h.patchCalls[0].body).toMatchObject({ status: 'refunded', note: expect.stringMatching(/^PRACTICE: cancelled, and refunded in Stripe test mode/) })
    expect(h.notice).toHaveBeenCalledTimes(1)
    expect(h.notice.mock.calls[0][0]).toBe('refused')
    expect(h.notice.mock.calls[0][1]).toMatchObject({ livemode: false, customer_email: 'tester@example.com', status: 'refunded' })
  })
  it('never goes near Creative Hub, and needs no "I looked at Creative Hub" confirmation', async () => {
    await practise()
    expect(h.place).not.toHaveBeenCalled()
  })
  it('still needs the owner to tick that she refunded it (in Stripe\u2019s test mode): no change, no email, without it', async () => {
    for (const body of [{ action: 'mark_refunded', id: ID }, { action: 'mark_refunded', id: ID, confirm_refunded: false }]) {
      const out = await call(body)
      expect(out.status).toBe(409); expect(out.body.message).toMatch(/refunded this payment in Stripe/)
    }
    expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
  })
  it('is for the owner only', async () => {
    h.owner = { ok: false }
    expect((await practise()).status).toBe(403)
    expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
  })
  it('cannot be done twice, and never emails again', async () => {
    h.row = testRow({ status: 'refunded' })
    const out = await practise()
    expect(out.status).toBe(409); expect(out.body.message).toMatch(/already been cancelled/)
    expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
  })
  it('refuses a test payment in any other state', async () => {
    for (const status of ['held', 'sent', 'needs_attention', 'sending', 'paid']) {
      h.row = testRow({ status }); h.patchCalls = []
      const out = await practise()
      expect(out.status, status).toBe(409); expect(out.body.message, status).toMatch(/cannot be practised on/); expect(h.patchCalls, status).toEqual([])
    }
    expect(h.notice).not.toHaveBeenCalled()
  })
  it('does not email if the order changed while she was doing this', async () => {
    h.patch = { ok: true, rows: [] }
    const out = await practise()
    expect(out.status).toBe(409); expect(h.notice).not.toHaveBeenCalled()
  })
  it('says plainly, and keeps the practice recorded, when the TEST email could not go', async () => {
    h.notice.mockImplementation(async () => ({ status: 'not_sent', note: 'Not sent: RESEND_API_KEY is not set in Vercel.', saved: true }))
    const out = await practise()
    expect(out.status).toBe(200); expect(out.body.outcome).toBe('refunded')
    expect(out.body.message).toMatch(/TEST email was NOT sent/); expect(out.body.message).toMatch(/RESEND_API_KEY/)
  })
  it('does not change how a REAL order is cancelled (it still says the customer has been emailed, and still refuses what it refused)', async () => {
    h.row = liveRow()
    const ok = await practise()
    expect(ok.status).toBe(200); expect(ok.body.message).toMatch(/customer has been emailed/); expect(ok.body.message).not.toMatch(/Practice/)
    expect(h.patchCalls[0].expected).toEqual(['held']); expect(h.notice.mock.calls[0][1]).toMatchObject({ livemode: true })
    h.row = liveRow({ status: 'sent', creativehub_order_id: 'o1' })
    expect((await practise()).status).toBe(409)
  })
})

describe('send_sample: a sample of a short customer email, for a TEST order only', () => {
  it.each([['received', 'payment received'], ['refused', 'order refused']])('sends the %s sample, with its own once-only key, and changes nothing on the order', async (kind, name) => {
    const out = await sample({ kind })
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, outcome: 'sent' })
    expect(out.body.message).toContain(`"${name}"`); expect(out.body.message).toMatch(/TEST banner/)
    expect(h.notice).toHaveBeenCalledTimes(1)
    expect(h.notice.mock.calls[0][0]).toBe(kind)
    expect(h.notice.mock.calls[0][1]).toMatchObject({ livemode: false, customer_email: 'tester@example.com' })
    expect(h.notice.mock.calls[0][2]).toMatchObject({ match: `id=eq.${ID}`, keySuffix: expect.stringMatching(/^-sample-\d+$/) })
    expect(h.patchCalls).toEqual([]) // the order itself is untouched
  })
  it('can be sent again and again: each sample has a different once-only key', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-21T12:00:00Z'))
    await sample(); vi.setSystemTime(new Date('2026-10-21T12:00:05Z')); await sample()
    expect(h.notice.mock.calls[0][2].keySuffix).not.toBe(h.notice.mock.calls[1][2].keySuffix)
  })
  it('is REFUSED for a real order, so a real customer can never be sent a sample by mistake', async () => {
    for (const status of ['held', 'sent', 'needs_attention', 'refunded']) {
      h.row = liveRow({ status })
      const out = await sample()
      expect(out.status, status).toBe(409); expect(out.body.message, status).toMatch(/only sent for a test order/)
    }
    expect(h.notice).not.toHaveBeenCalled()
  })
  it('refuses a sample that does not exist, something that is not an order, and an order that is not there', async () => {
    expect((await sample({ kind: 'confirmation' })).status).toBe(400)
    expect((await sample({ kind: undefined })).status).toBe(400)
    expect((await sample({ id: 'nope' })).status).toBe(400)
    h.row = null
    expect((await sample()).status).toBe(404)
    expect(h.notice).not.toHaveBeenCalled()
  })
  it('is for the owner only', async () => {
    h.owner = { ok: false }
    expect((await sample()).status).toBe(403); expect(h.notice).not.toHaveBeenCalled()
  })
  it('says plainly when the sample was not sent, and why', async () => {
    h.notice.mockImplementation(async () => ({ status: 'not_sent', note: 'Not sent: RESEND_API_KEY is not set in Vercel.', saved: true }))
    const out = await sample()
    expect(out.status).toBe(200); expect(out.body.outcome).toBe('not_sent'); expect(out.body.message).toMatch(/^The sample was not sent\./); expect(out.body.message).toMatch(/RESEND_API_KEY/)
  })
})
