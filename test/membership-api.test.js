// The browser's calls to the membership server (src/membership/membershipApi.js).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const db = vi.hoisted(() => ({ token: 'tok', row: null, error: null, selected: null }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: db.token ? { access_token: db.token } : null } }) },
    from: (table) => ({ select: (cols) => { db.selected = { table, cols }; return { maybeSingle: async () => ({ data: db.row, error: db.error }) } } }),
  },
}))

import { startMembershipCheckout, checkPromoCode, fetchMyMembership } from '../src/membership/membershipApi'

const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
beforeEach(() => { db.token = 'tok'; db.row = null; db.error = null })
afterEach(() => vi.unstubAllGlobals())
const stub = (fn) => { const f = vi.fn(fn); vi.stubGlobal('fetch', f); return f }

describe('starting a payment', () => {
  it('sends ONLY the passes, the way of paying and the agreement, with the person\u2019s sign-in, and never a price', async () => {
    const f = stub(async () => reply({ ok: true, url: 'https://checkout.stripe.com/c/pay/x' }))
    const url = await startMembershipCheckout({ passes: ['blueprints'], interval: 'year', consent: true, code: '', price: 1, amount: 1 })
    expect(url).toBe('https://checkout.stripe.com/c/pay/x')
    const [address, init] = f.mock.calls[0]
    expect(address).toBe('/api/membership-checkout'); expect(init.method).toBe('POST'); expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body)).toEqual({ passes: ['blueprints'], interval: 'year', consent: true })
  })
  it('sends a promo code only when there is one', async () => {
    const f = stub(async () => reply({ ok: true, url: 'https://checkout.stripe.com/c/pay/x' }))
    await startMembershipCheckout({ passes: ['blueprints'], interval: 'month', consent: true, code: 'WELCOME' })
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ passes: ['blueprints'], interval: 'month', consent: true, code: 'WELCOME' })
  })
  it('only ever says the agreement is given when it is exactly true', async () => {
    const f = stub(async () => reply({ ok: true, url: 'https://checkout.stripe.com/c/pay/x' }))
    await startMembershipCheckout({ passes: ['blueprints'], interval: 'month', consent: 'yes' })
    expect(JSON.parse(f.mock.calls[0][1].body).consent).toBe(false)
  })
  it('sends no sign-in when there is none (the server then asks them to log in)', async () => {
    db.token = ''; const f = stub(async () => reply({ ok: true, url: 'https://checkout.stripe.com/c/pay/x' }))
    await startMembershipCheckout({ passes: ['blueprints'], interval: 'month', consent: true })
    expect(f.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })
  it('passes on the server\u2019s own kind message when it says no', async () => {
    stub(async () => reply({ ok: false, message: 'Memberships are not open yet.' }, 403))
    await expect(startMembershipCheckout({ passes: ['blueprints'], interval: 'month', consent: true })).rejects.toThrow('Memberships are not open yet.')
  })
  it('never sends a person anywhere but Stripe\u2019s own checkout page', async () => {
    for (const url of ['https://evil.example/checkout.stripe.com/', 'http://checkout.stripe.com/x', 'javascript:alert(1)', 'https://checkout.stripe.com.evil.example/']) {
      stub(async () => reply({ ok: true, url })); await expect(startMembershipCheckout({ passes: ['blueprints'], interval: 'month', consent: true }), url).rejects.toThrow(/could not start your payment/)
    }
  })
  it('says something kind if the site cannot be reached, or does not answer properly', async () => {
    stub(async () => { throw new Error('offline') }); await expect(startMembershipCheckout({ passes: ['blueprints'], interval: 'month', consent: true })).rejects.toThrow(/could not reach the site/)
    stub(async () => ({ ok: false, status: 404, json: async () => { throw new Error('not json') } })); await expect(startMembershipCheckout({ passes: ['blueprints'], interval: 'month', consent: true })).rejects.toThrow(/only work on the live site/)
  })
})

describe('checking a promo code', () => {
  it('asks the server, with the person\u2019s sign-in, and returns what the code gives', async () => {
    const f = stub(async () => reply({ ok: true, summary: '20% off for 3 months' }))
    await expect(checkPromoCode('WEL COME&x')).resolves.toBe('20% off for 3 months')
    expect(f.mock.calls[0][0]).toBe('/api/membership-checkout?code=WEL%20COME%26x'); expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
  })
  it('passes on the server\u2019s message for a code that does not work', async () => {
    stub(async () => reply({ ok: false, message: 'That code is not valid, or it has ended.' }, 404))
    await expect(checkPromoCode('NOPE')).rejects.toThrow('That code is not valid, or it has ended.')
  })
})

describe('reading your own membership', () => {
  it('asks only for the columns it needs, from the memberships table', async () => {
    db.row = { status: 'active', passes: ['blueprints'] }
    await expect(fetchMyMembership()).resolves.toEqual({ status: 'active', passes: ['blueprints'] })
    expect(db.selected.table).toBe('memberships'); expect(db.selected.cols).toBe('status, passes, billing_interval, current_period_end, cancel_at_period_end, offer_ends_at')
    expect(db.selected.cols).not.toMatch(/stripe|user_id|consent/)
  })
  it('gives null for someone with no membership, and an error with a safe message if the database says no', async () => {
    db.row = null; await expect(fetchMyMembership()).resolves.toBeNull()
    db.error = { message: 'permission denied' }; await expect(fetchMyMembership()).rejects.toThrow('permission denied')
  })
})
