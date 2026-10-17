// @vitest-environment node
// A real payment is only possible once its confirmation email can go out. Test payments are not held back by this.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../api/checkout.js'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const call = async (body = { items: [{ id: ID, qty: 1 }] }) => {
  const out = { status: null, body: null }
  const res = { setHeader() {}, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', headers: { origin: 'https://starscapesfactory.com' }, body }, res)
  return out
}

beforeEach(() => {
  process.env.CHECKOUT_OPEN = 'yes'
  process.env.ALLOW_LIVE_CHECKOUT = 'yes'
  delete process.env.RESEND_API_KEY
  process.env.SUPABASE_URL = 'https://db.test'
  process.env.SUPABASE_ANON_KEY = 'anon'
})

describe('live checkout and the confirmation email', () => {
  it('stays closed for real payments while the email is not ready, and never reaches the database or Stripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x'
    const net = vi.fn(async () => { throw new Error('should not be called') })
    vi.stubGlobal('fetch', net)
    const out = await call()
    expect(out.status).toBe(503)
    expect(out.body.message).toMatch(/not open for real payments/)
    expect(net).not.toHaveBeenCalled()
  })
  it('stays closed even if the Resend key is set, because the wording is not approved yet', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x'
    process.env.RESEND_API_KEY = 're_secretkey_1234567890abcdefghijklmnop'
    const net = vi.fn(async () => { throw new Error('should not be called') })
    vi.stubGlobal('fetch', net)
    expect((await call()).status).toBe(503)
    expect(net).not.toHaveBeenCalled()
  })
  it('does not hold back test payments: they get past this rail (and stop later only because the stand-in database says no)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    const out = await call()
    expect(out.status).toBe(502)
    expect(out.body.message).toMatch(/couldn't check the prints/)
  })
})
