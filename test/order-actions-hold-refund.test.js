// @vitest-environment node
// The owner's buttons for a held order and for an order that cannot be made (Gill, 21 October 2026). The site never moves money: she refunds in Stripe, then says so here.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  owner: { ok: true },
  row: null,
  patch: { ok: true, rows: [{ id: 'x' }] },
  claim: { won: true, row: { status: 'sending' } },
  patchCalls: [],
  notice: vi.fn(async () => ({ status: 'sent', note: null, saved: true })),
  place: vi.fn(async () => ({ patch: { status: 'sent', note: 'Sent to Creative Hub as order N1.' } })),
  problems: ['The wording of the confirmation email has not been approved yet.'],
}))
vi.mock('../lib/ownerGuard.js', () => ({ requireOwner: async () => h.owner, sendDenied: (res) => res.status(403).json({ ok: false, message: 'no' }) }))
vi.mock('../lib/orderFlow.js', () => ({
  patchOrder: vi.fn(async (match, expected, body) => { h.patchCalls.push({ match, expected, body }); return h.patch }),
  claimOrder: vi.fn(async (match, from) => { h.patchCalls.push({ claim: true, match, from }); return h.claim }),
  placeAndNotify: (...a) => h.place(...a),
}))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: vi.fn(), sendNotice: (...a) => h.notice(...a), confirmationProblems: () => h.problems }))
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
const MIN = 60 * 1000
const row = (extra = {}) => ({
  id: ID, livemode: true, status: 'held', stripe_session_id: 'cs_live_1', customer_email: 'jane@example.com', customer_name: 'Jane Smith', amount_total: 8900, currency: 'gbp',
  created_at: new Date(Date.now() - 60 * MIN).toISOString(),
  shipping: { name: 'Jane Smith', address: { line1: '1 High St', city: 'Leeds', country: 'GB', postal_code: 'LS1 1AA' } },
  items: [{ ch_variant_id: 'ch1', title: 'Floating', qty: 1 }], ...extra,
})
const refund = (extra = {}) => call({ action: 'mark_refunded', id: ID, confirm_refunded: true, ...extra })

beforeEach(() => {
  h.owner = { ok: true }; h.row = row(); h.patch = { ok: true, rows: [{ id: ID, status: 'refunded' }] }; h.claim = { won: true, row: { status: 'sending' } }; h.patchCalls = []
  h.notice.mockClear(); h.notice.mockImplementation(async () => ({ status: 'sent', note: null, saved: true })); h.place.mockClear()
  h.place.mockImplementation(async () => ({ patch: { status: 'sent', note: 'Sent to Creative Hub as order N1.' } }))
  delete process.env.SEND_ORDERS_AUTOMATICALLY
})

describe('send: a HELD order (automatic sending is off) goes to Creative Hub when the owner says so', () => {
  it('claims it from "held" and sends it through the flow that emails the confirmation only after acceptance', async () => {
    const out = await call({ action: 'send', id: ID })
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, outcome: 'sent' })
    expect(h.patchCalls[0]).toMatchObject({ claim: true, match: `id=eq.${ID}`, from: ['held'] })
    expect(h.place).toHaveBeenCalledTimes(1)
    expect(h.place.mock.calls[0][1]).toBe(`id=eq.${ID}`)
  })
  it('will not send an order that is neither held nor needs attention (such as one already refunded)', async () => {
    h.row = row({ status: 'refunded' })
    const out = await call({ action: 'send', id: ID })
    expect(out.status).toBe(409); expect(h.place).not.toHaveBeenCalled()
  })
  it('will not send a held test payment', async () => {
    h.row = row({ livemode: false })
    expect((await call({ action: 'send', id: ID })).status).toBe(409); expect(h.place).not.toHaveBeenCalled()
  })
})

describe('mark_refunded: an order that cannot be made is cancelled once the payment has been refunded in Stripe', () => {
  it('cancels a HELD order, marks it refunded (only while it is still held), and emails the customer', async () => {
    const out = await refund()
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, outcome: 'refunded' })
    expect(out.body.message).toMatch(/customer has been emailed/)
    expect(h.patchCalls).toHaveLength(1)
    expect(h.patchCalls[0].match).toBe(`id=eq.${ID}`); expect(h.patchCalls[0].expected).toEqual(['held'])
    expect(h.patchCalls[0].body).toMatchObject({ status: 'refunded', note: expect.stringMatching(/refunded in Stripe/) })
    expect(Number.isNaN(new Date(h.patchCalls[0].body.refunded_at).getTime())).toBe(false)
    expect(h.notice).toHaveBeenCalledTimes(1)
    expect(h.notice.mock.calls[0][0]).toBe('refused')
    expect(h.notice.mock.calls[0][1]).toMatchObject({ customer_email: 'jane@example.com', stripe_session_id: 'cs_live_1', status: 'refunded' })
    expect(h.notice.mock.calls[0][2]).toMatchObject({ match: `id=eq.${ID}` })
  })
  it('cancels an order Creative Hub refused ("needs attention") the same way', async () => {
    h.row = row({ status: 'needs_attention' })
    const out = await refund()
    expect(out.status).toBe(200); expect(h.patchCalls[0].expected).toEqual(['needs_attention']); expect(h.notice).toHaveBeenCalledTimes(1)
  })
  it('does NOTHING unless the owner has confirmed she refunded it in Stripe: no change, no email', async () => {
    for (const body of [{ action: 'mark_refunded', id: ID }, { action: 'mark_refunded', id: ID, confirm_refunded: false }, { action: 'mark_refunded', id: ID, confirm_refunded: 'true' }]) {
      const out = await call(body)
      expect(out.status).toBe(409); expect(out.body.message).toMatch(/refunded this payment in Stripe/)
    }
    expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
  })
  it('is for the owner only', async () => {
    h.owner = { ok: false }
    expect((await refund()).status).toBe(403)
    expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
  })
  it('refuses something that is not an order', async () => {
    expect((await call({ action: 'mark_refunded', id: 'nope', confirm_refunded: true })).status).toBe(400)
  })
  it('refuses a test payment: no money was taken', async () => {
    h.row = row({ livemode: false })
    const out = await refund()
    expect(out.status).toBe(409); expect(out.body.message).toMatch(/test payment/); expect(h.notice).not.toHaveBeenCalled()
  })
  it('cannot be done twice: an order already refunded is refused and nobody is emailed again', async () => {
    h.row = row({ status: 'refunded' })
    const out = await refund()
    expect(out.status).toBe(409); expect(out.body.message).toMatch(/already been cancelled/)
    expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
  })
  it('cannot cancel an order that is already with Creative Hub: it must be cancelled there first', async () => {
    for (const r of [row({ status: 'sent', creativehub_order_id: 'o1' }), row({ status: 'needs_attention', creativehub_order_id: 'o1' }), row({ status: 'sent' })]) {
      h.row = r
      const out = await refund()
      expect(out.status).toBe(409); expect(out.body.message).toMatch(/already with Creative Hub/)
    }
    expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
  })
  it('cannot cancel an order that is still being sent: give it a few minutes', async () => {
    h.row = row({ status: 'sending', created_at: new Date(Date.now() - 1 * MIN).toISOString() })
    const out = await refund({ confirm_not_there: true })
    expect(out.status).toBe(409); expect(out.body.message).toMatch(/still being sent/); expect(h.patchCalls).toEqual([])
  })
  it('when Creative Hub\u2019s answer was lost, needs the owner to confirm she has looked and the order is not there', async () => {
    for (const status of ['check_creativehub', 'sending']) {
      h.row = row({ status, created_at: new Date(Date.now() - 30 * MIN).toISOString() }); h.patchCalls = []; h.notice.mockClear()
      const without = await refund()
      expect(without.status, status).toBe(409); expect(without.body.message).toMatch(/not known whether Creative Hub already has this order/)
      expect(h.patchCalls).toEqual([]); expect(h.notice).not.toHaveBeenCalled()
      const withIt = await refund({ confirm_not_there: true })
      expect(withIt.status, status).toBe(200); expect(h.patchCalls[0].expected).toEqual([status]); expect(h.notice).toHaveBeenCalledTimes(1)
    }
  })
  it('refuses an order in any other state', async () => {
    h.row = row({ status: 'paid' })
    expect((await refund()).status).toBe(409)
    expect(h.patchCalls).toEqual([])
  })
  it('does not email the customer if the order changed while she was doing this (nothing was cancelled)', async () => {
    h.patch = { ok: true, rows: [] }
    const out = await refund()
    expect(out.status).toBe(409); expect(out.body.message).toMatch(/changed while you were doing this/)
    expect(h.notice).not.toHaveBeenCalled()
  })
  it('says plainly, and keeps the order cancelled, when the customer email could not go', async () => {
    h.notice.mockImplementation(async () => ({ status: 'not_sent', note: 'Not sent: RESEND_API_KEY is not set in Vercel.', saved: true }))
    const out = await refund()
    expect(out.status).toBe(200); expect(out.body.outcome).toBe('refunded')
    expect(out.body.message).toMatch(/customer has NOT been emailed/); expect(out.body.message).toMatch(/RESEND_API_KEY is not set/); expect(out.body.message).toMatch(/email them yourself/)
  })
})

describe('sending_state: the Orders panel asks whether real payments go by themselves', () => {
  it('says OFF by default, names the setting, and passes on what is stopping the customer emails', async () => {
    const out = await call({ action: 'sending_state' })
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, auto_send: false, setting: 'SEND_ORDERS_AUTOMATICALLY', email_problems: h.problems })
  })
  it('says ON only for exactly "yes"', async () => {
    process.env.SEND_ORDERS_AUTOMATICALLY = 'yes'
    expect((await call({ action: 'sending_state' })).body.auto_send).toBe(true)
    process.env.SEND_ORDERS_AUTOMATICALLY = 'true'
    expect((await call({ action: 'sending_state' })).body.auto_send).toBe(false)
  })
  it('is for the owner only', async () => {
    h.owner = { ok: false }
    expect((await call({ action: 'sending_state' })).status).toBe(403)
  })
})
