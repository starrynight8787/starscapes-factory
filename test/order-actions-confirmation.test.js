// @vitest-environment node
// The owner's "Send confirmation email" button: only for an email that has not gone, and never twice.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ owner: { ok: true }, row: null, claim: [], confirm: vi.fn(async () => ({ status: 'sent', note: null, saved: true })), calls: [] }))
vi.mock('../lib/ownerGuard.js', () => ({ requireOwner: async () => h.owner, sendDenied: (res) => res.status(403).json({ ok: false, message: 'no' }) }))
vi.mock('../lib/orderFlow.js', () => ({ patchOrder: vi.fn(), claimOrder: vi.fn(), placeAndRecord: vi.fn() }))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: (...a) => h.confirm(...a) }))
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
const go = () => call({ action: 'resend_confirmation', id: ID })
const row = (extra = {}) => ({ id: ID, livemode: false, customer_email: 'jane@example.com', stripe_session_id: 'cs_1', confirmation_status: 'failed', ...extra })

beforeEach(() => {
  h.owner = { ok: true }
  h.row = row()
  h.claim = [row({ confirmation_status: 'sending' })]
  h.confirm.mockClear()
  h.confirm.mockImplementation(async () => ({ status: 'sent', note: null, saved: true }))
  h.calls = []
})

describe('resend_confirmation', () => {
  it('sends the email for an order whose email failed, claiming it first, and says so', async () => {
    const out = await go()
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ ok: true, outcome: 'sent' })
    expect(h.confirm).toHaveBeenCalledTimes(1)
    expect(h.confirm.mock.calls[0][1].match).toBe(`id=eq.${ID}`)
    expect(h.confirm.mock.calls[0][1].keySuffix).toMatch(/^-manual-\d+$/)
    expect(h.calls.some((c) => c.method === 'PATCH')).toBe(true)
  })
  it('also works for an order that was never sent (not_sent) or has no status yet', async () => {
    h.row = row({ confirmation_status: 'not_sent' })
    expect((await go()).status).toBe(200)
    h.row = row({ confirmation_status: null })
    expect((await go()).status).toBe(200)
  })
  it('refuses an email that has already been sent, and sends nothing', async () => {
    h.row = row({ confirmation_status: 'sent' })
    const out = await go()
    expect(out.status).toBe(409)
    expect(out.body.message).toMatch(/already been sent/)
    expect(h.confirm).not.toHaveBeenCalled()
  })
  it('refuses one that is being sent right now', async () => {
    h.row = row({ confirmation_status: 'sending' })
    expect((await go()).status).toBe(409)
    expect(h.confirm).not.toHaveBeenCalled()
  })
  it('does not send if someone else claimed it first (two clicks can never send two emails)', async () => {
    h.claim = []
    const out = await go()
    expect(out.status).toBe(409)
    expect(h.confirm).not.toHaveBeenCalled()
  })
  it('tells you to run the SQL if the new columns are missing, and sends nothing', async () => {
    const { confirmation_status, ...without } = row()
    h.row = without
    const out = await go()
    expect(out.status).toBe(409)
    expect(out.body.message).toMatch(/orders-confirmation\.sql/)
    expect(h.confirm).not.toHaveBeenCalled()
  })
  it('passes on the plain reason when the email still could not go (for example the wording is not approved)', async () => {
    h.confirm.mockImplementation(async () => ({ status: 'not_sent', note: 'Not sent: the wording of the confirmation email has not been approved yet.', saved: true }))
    const out = await go()
    expect(out.status).toBe(200)
    expect(out.body).toMatchObject({ outcome: 'not_sent' })
    expect(out.body.message).toMatch(/not been approved/)
  })
  it('refuses a bad order id, an unknown order and anyone who is not the owner', async () => {
    expect((await call({ action: 'resend_confirmation', id: 'nope' })).status).toBe(400)
    h.row = null
    expect((await go()).status).toBe(404)
    h.row = row()
    h.owner = { ok: false }
    expect((await go()).status).toBe(403)
    expect(h.confirm).not.toHaveBeenCalled()
  })
})
