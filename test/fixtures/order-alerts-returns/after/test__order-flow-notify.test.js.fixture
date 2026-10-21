// @vitest-environment node
// Placing an order and then telling the customer the right thing (Gill, 21 October 2026). The CONFIRMATION goes only once Creative Hub has accepted the order (under our Terms
// that is the moment the contract begins). Otherwise the customer is told "we have received your payment" (once). An email problem never changes what happened to the order.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ patches: [], rows: [{ id: 'row1' }] }))
vi.mock('../lib/serviceKey.js', () => ({
  serviceFetch: async (path, init) => { h.patches.push({ path, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => h.rows } },
}))
import { placeAndNotify } from '../lib/orderFlow'

const order = (extra = {}) => ({
  stripe_session_id: 'cs_live_abc123', livemode: true, status: 'sending', customer_name: 'Jane Smith', customer_email: 'jane@example.com', customer_phone: '07700900123',
  shipping: { name: 'Jane Smith', address: { line1: '1 High St', city: 'Leeds', country: 'GB', postal_code: 'LS1 1AA' } },
  items: [{ ch_variant_id: 'ch1', title: 'Floating', qty: 1 }], ...extra,
})
const answer = (status, body) => vi.fn(async () => ({ status, json: async () => body }))
const accepted = () => answer(201, { order_id: 'o1', order_number: 'N1', currency: 'GBP', total_incl_vat: '40.00' })
const refused = () => answer(422, { message: 'no' })
const lost = () => vi.fn(async () => { throw new Error('timeout') })
const MATCH = 'stripe_session_id=eq.cs_live_abc123'
const mocks = () => ({ confirm: vi.fn(async () => ({ status: 'sent' })), notice: vi.fn(async () => ({ status: 'sent' })) })

beforeEach(() => { h.patches = []; h.rows = [{ id: 'row1' }]; process.env.CREATIVEHUB_API_KEY = 'ch_key' })

describe('when Creative Hub ACCEPTS the order', () => {
  it('sends the confirmation (and only that), after the order is recorded as sent', async () => {
    const m = mocks()
    const out = await placeAndNotify(order(), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice })
    expect(out.patch.status).toBe('sent')
    expect(h.patches[0].body).toMatchObject({ status: 'sent', creativehub_order_id: 'o1' })
    expect(m.confirm).toHaveBeenCalledTimes(1)
    expect(m.confirm.mock.calls[0][0]).toMatchObject({ customer_email: 'jane@example.com', stripe_session_id: 'cs_live_abc123' })
    expect(m.confirm.mock.calls[0][1]).toMatchObject({ match: MATCH })
    expect(m.notice).not.toHaveBeenCalled()
  })
  it('does not send the confirmation again if one has already gone', async () => {
    const m = mocks()
    await placeAndNotify(order({ confirmation_status: 'sent' }), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice })
    expect(m.confirm).not.toHaveBeenCalled(); expect(m.notice).not.toHaveBeenCalled()
  })
  it('does send it if an earlier attempt failed or was not sent', async () => {
    for (const status of ['failed', 'not_sent', null]) {
      const m = mocks()
      await placeAndNotify(order({ confirmation_status: status }), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice })
      expect(m.confirm, String(status)).toHaveBeenCalledTimes(1)
    }
  })
})

describe('when Creative Hub does NOT accept the order', () => {
  it('REFUSED: no confirmation (there is no contract); the customer is told "received", and the order says needs attention', async () => {
    const m = mocks()
    const out = await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice })
    expect(out.patch.status).toBe('needs_attention')
    expect(m.confirm).not.toHaveBeenCalled()
    expect(m.notice).toHaveBeenCalledTimes(1)
    expect(m.notice.mock.calls[0][0]).toBe('received')
    expect(m.notice.mock.calls[0][1]).toMatchObject({ customer_email: 'jane@example.com' })
    expect(m.notice.mock.calls[0][2]).toMatchObject({ match: MATCH })
  })
  it('LOST ANSWER: also "received", and the order says to check Creative Hub', async () => {
    const m = mocks()
    const out = await placeAndNotify(order(), MATCH, { fetchImpl: lost(), confirm: m.confirm, notice: m.notice })
    expect(out.patch.status).toBe('check_creativehub')
    expect(m.confirm).not.toHaveBeenCalled(); expect(m.notice).toHaveBeenCalledTimes(1)
  })
  it('NO SETTINGS (no Creative Hub key): also "received", and nothing is sent to Creative Hub', async () => {
    delete process.env.CREATIVEHUB_API_KEY; delete process.env.CREATIVEHUB_API_TOKEN
    const m = mocks(); const fetchImpl = accepted()
    const out = await placeAndNotify(order(), MATCH, { fetchImpl, confirm: m.confirm, notice: m.notice })
    expect(fetchImpl).not.toHaveBeenCalled(); expect(out.patch.status).toBe('needs_attention')
    expect(m.confirm).not.toHaveBeenCalled(); expect(m.notice).toHaveBeenCalledTimes(1)
  })
  it('does not tell the customer "received" a second time when the owner tries again after another refusal', async () => {
    const m = mocks()
    await placeAndNotify(order({ notice_kind: 'received', notice_status: 'sent' }), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice })
    expect(m.notice).not.toHaveBeenCalled(); expect(m.confirm).not.toHaveBeenCalled()
  })
  it('does tell them if the earlier notice failed or was not sent', async () => {
    for (const notice_status of ['failed', 'not_sent']) {
      const m = mocks()
      await placeAndNotify(order({ notice_kind: 'received', notice_status }), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice })
      expect(m.notice, notice_status).toHaveBeenCalledTimes(1)
    }
  })
  it('does not send the confirmation when the order was accepted but could not be written down (the order changed under it): it is not known to be safe, so "received" instead', async () => {
    h.rows = []
    const m = mocks()
    await placeAndNotify(order(), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice })
    expect(m.confirm).not.toHaveBeenCalled(); expect(m.notice).toHaveBeenCalledTimes(1)
  })
})

describe('an email problem never changes what happened to the order', () => {
  it('a confirmation that throws still returns the result, with the order recorded as sent', async () => {
    const m = mocks(); m.confirm.mockImplementation(async () => { throw new Error('email exploded') })
    const out = await placeAndNotify(order(), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice })
    expect(out.patch.status).toBe('sent'); expect(h.patches[0].body.status).toBe('sent')
  })
  it('a notice that throws still returns the result, with the order recorded as needs attention', async () => {
    const m = mocks(); m.notice.mockImplementation(async () => { throw new Error('email exploded') })
    const out = await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice })
    expect(out.patch.status).toBe('needs_attention'); expect(h.patches[0].body.status).toBe('needs_attention')
  })
  it('the email is only attempted AFTER the order has been recorded (so a slow or failing email can never hold up the record)', async () => {
    const order_of_events = []
    const m = mocks(); m.confirm.mockImplementation(async () => { order_of_events.push('email'); return { status: 'sent' } })
    const orig = h.patches.push.bind(h.patches); h.patches.push = (x) => { order_of_events.push('recorded'); return orig(x) }
    await placeAndNotify(order(), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice })
    expect(order_of_events).toEqual(['recorded', 'email'])
  })
})

describe('the alert to the owner (only when the caller asks for it)', () => {
  const withAlert = () => ({ ...mocks(), alert: vi.fn(async () => ({ status: 'sent' })) })
  it('REFUSED: the owner is alerted ("needs_attention", with the reason from the order note), and the customer is still told "received"', async () => {
    const m = withAlert()
    const out = await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice, alert: m.alert })
    expect(out.patch.status).toBe('needs_attention')
    expect(m.alert).toHaveBeenCalledTimes(1)
    expect(m.alert.mock.calls[0][0]).toBe('needs_attention')
    expect(m.alert.mock.calls[0][1]).toMatchObject({ stripe_session_id: 'cs_live_abc123' })
    expect(m.alert.mock.calls[0][2]).toMatchObject({ match: MATCH, detail: expect.stringMatching(/Nothing was ordered/) })
    expect(m.notice).toHaveBeenCalledTimes(1); expect(m.confirm).not.toHaveBeenCalled()
  })
  it('LOST ANSWER: the owner is alerted with the "check" kind', async () => {
    const m = withAlert()
    await placeAndNotify(order(), MATCH, { fetchImpl: lost(), confirm: m.confirm, notice: m.notice, alert: m.alert })
    expect(m.alert).toHaveBeenCalledTimes(1); expect(m.alert.mock.calls[0][0]).toBe('check')
  })
  it('ACCEPTED: nobody needs the owner, so there is no alert (just the confirmation)', async () => {
    const m = withAlert()
    await placeAndNotify(order(), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice, alert: m.alert })
    expect(m.alert).not.toHaveBeenCalled(); expect(m.confirm).toHaveBeenCalledTimes(1)
  })
  it('is NOT sent when no alert is asked for (the owner\u2019s own Send button does not alert her about what she is looking at)', async () => {
    const m = withAlert()
    await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice })
    expect(m.alert).not.toHaveBeenCalled(); expect(m.notice).toHaveBeenCalledTimes(1)
  })
  it('an alert that throws never stops the customer notice, the record, or the result', async () => {
    const m = withAlert(); m.alert.mockImplementation(async () => { throw new Error('email exploded') })
    const out = await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice, alert: m.alert })
    expect(out.patch.status).toBe('needs_attention'); expect(h.patches[0].body.status).toBe('needs_attention'); expect(m.notice).toHaveBeenCalledTimes(1)
  })
  it('a notice that throws never stops the alert', async () => {
    const m = withAlert(); m.notice.mockImplementation(async () => { throw new Error('email exploded') })
    await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice, alert: m.alert })
    expect(m.alert).toHaveBeenCalledTimes(1)
  })
})
