// @vitest-environment node
// The owner's "Send posted email" button: only for an order really with Creative Hub (or a test order), only once, only with safe tracking.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ owner: { ok: true }, row: null, claim: [], dispatch: vi.fn(async () => ({ status: 'sent', note: null, saved: true })), calls: [] }))
vi.mock('../lib/ownerGuard.js', () => ({ requireOwner: async () => h.owner, sendDenied: (res) => res.status(403).json({ ok: false, message: 'no' }) }))
vi.mock('../lib/orderFlow.js', () => ({ patchOrder: vi.fn(), claimOrder: vi.fn(), placeAndRecord: vi.fn() }))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: vi.fn() }))
vi.mock('../lib/dispatchEmail.js', () => ({ dispatchOrder: (...a) => h.dispatch(...a) }))
vi.mock('../lib/serviceKey.js', () => ({
  databaseUrl: () => 'https://db.test',
  serviceKeys: () => ['k'],
  saidWhat: async () => '',
  serviceFetch: async (path, init = {}) => {
    h.calls.push({ path, method: init.method || 'GET' })
    if ((init.method || 'GET') === 'PATCH') return { ok: true, status: 200, json: async () => h.claim }
    return { ok: true, status: 200, json: async () => (h.row ? [h.row] : []) }
  },
}))

import handler from '../api/order-actions.js'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const call = async (body) => {
  const out = { status: null, body: null }
  const res = { setHeader() {}, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', headers: {}, body }, res)
  return out
}
const go = (extra = {}) => call({ action: 'send_dispatch', id: ID, ...extra })
const row = (extra = {}) => ({ id: ID, livemode: true, status: 'sent', customer_email: 'jane@example.com', stripe_session_id: 'cs_1', dispatch_status: null, ...extra })

beforeEach(() => {
  h.owner = { ok: true }
  h.row = row()
  h.claim = [row({ dispatch_status: 'sending' })]
  h.dispatch.mockClear()
  h.dispatch.mockImplementation(async () => ({ status: 'sent', note: null, saved: true }))
  h.calls = []
})

describe('send_dispatch', () => {
  it('sends the posted email for an order that is with Creative Hub, claiming it first, and passes on the tracking', async () => {
    const out = await go({ tracking_url: 'https://t.example.com/x', tracking_number: 'AB123' })
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, outcome: 'sent' })
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.dispatch.mock.calls[0][1]).toEqual({ ok: true, url: 'https://t.example.com/x', number: 'AB123' })
    expect(h.dispatch.mock.calls[0][2].match).toBe(`id=eq.${ID}`)
    expect(h.calls.some((c) => c.method === 'PATCH')).toBe(true)
  })
  it('works with no tracking at all, and for a test order that was never sent', async () => {
    expect((await go()).status).toBe(200)
    h.row = row({ livemode: false, status: 'test_not_sent' })
    expect((await go()).status).toBe(200)
  })
  it('refuses a REAL order that has not been sent to Creative Hub, because "posted" would be untrue', async () => {
    for (const status of ['needs_attention', 'sending', 'check_creativehub']) {
      h.row = row({ status })
      const out = await go()
      expect(out.status).toBe(409)
      expect(out.body.message).toMatch(/cannot have been posted/)
    }
    expect(h.dispatch).not.toHaveBeenCalled()
  })
  it('refuses an email already sent, or being sent, and sends nothing', async () => {
    h.row = row({ dispatch_status: 'sent' })
    expect((await go()).status).toBe(409)
    h.row = row({ dispatch_status: 'sending' })
    expect((await go()).status).toBe(409)
    expect(h.dispatch).not.toHaveBeenCalled()
  })
  it('does not send if someone else claimed it first (two clicks can never send two emails)', async () => {
    h.claim = []
    expect((await go()).status).toBe(409)
    expect(h.dispatch).not.toHaveBeenCalled()
  })
  it('refuses unsafe tracking before touching anything', async () => {
    const out = await go({ tracking_url: 'javascript:alert(1)' })
    expect(out.status).toBe(400)
    expect(h.calls).toEqual([])
    expect(h.dispatch).not.toHaveBeenCalled()
  })
  it('tells you to run the SQL if the new columns are missing', async () => {
    const { dispatch_status, ...without } = row()
    h.row = without
    const out = await go()
    expect(out.status).toBe(409)
    expect(out.body.message).toMatch(/orders-dispatch\.sql/)
  })
  it('passes on the plain reason when the email could not go', async () => {
    h.dispatch.mockImplementation(async () => ({ status: 'not_sent', note: 'Not sent: RESEND_API_KEY is not set in Vercel.', saved: true }))
    const out = await go()
    expect(out.body).toMatchObject({ outcome: 'not_sent' })
    expect(out.body.message).toMatch(/RESEND_API_KEY/)
  })
  it('refuses a bad id, an unknown order and anyone who is not the owner', async () => {
    expect((await call({ action: 'send_dispatch', id: 'nope' })).status).toBe(400)
    h.row = null
    expect((await go()).status).toBe(404)
    h.row = row()
    h.owner = { ok: false }
    expect((await go()).status).toBe(403)
    expect(h.dispatch).not.toHaveBeenCalled()
  })
})
