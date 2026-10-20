// @vitest-environment node
// The owner's discount codes request (lib/promotionsAdmin.js, reached through api/membership-checkout.js?admin=promotions), against a pretend sign-in system and Stripe:
// who may use it, exactly what is sent to Stripe, that nothing wrong reaches Stripe, and the clean-up when something fails halfway.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/membership-checkout.js'
import { shapeCode } from '../lib/promotionsAdmin.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const FAR = Math.floor(Date.parse('2099-12-31T23:59:59Z') / 1000)

function network({ codes = [], hasMore = false, couponFails = false, codeFails = null, switchFails = false, listFails = false } = {}) {
  const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url); const method = init.method || 'GET'; calls.push({ url: u, method, init, form: init.body ? Object.fromEntries(new URLSearchParams(String(init.body))) : null, forms: init.body ? new URLSearchParams(String(init.body)) : null })
    if (u.startsWith('https://db.test/auth/v1/user')) {
      const t = String((init.headers || {}).Authorization || '')
      if (t === 'Bearer owner-token') return json({ id: 'o', email: 'gill@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' })
      if (t === 'Bearer unconfirmed-token') return json({ id: 'o', email: 'gill@example.com' })
      if (t === 'Bearer member-token') return json({ id: 'm', email: 'someone@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' })
      return json({}, 401)
    }
    if (u.startsWith('https://api.stripe.com/v1/promotion_codes?')) return listFails ? json({ error: { message: 'Invalid API Key provided: sk_test_secret_value_zzzz' } }, 401) : json({ data: codes, has_more: hasMore })
    if (u === 'https://api.stripe.com/v1/coupons' && method === 'POST') return couponFails ? json({ error: { message: 'Something with sk_test_secret_value_zzzz' } }, 400) : json({ id: 'cpn_new1' })
    if (u.startsWith('https://api.stripe.com/v1/coupons/') && method === 'DELETE') return json({ id: 'cpn_new1', deleted: true })
    if (u === 'https://api.stripe.com/v1/promotion_codes' && method === 'POST') {
      if (codeFails) return json({ error: { message: codeFails } }, 400)
      const f = Object.fromEntries(new URLSearchParams(String(init.body)))
      return json({ id: 'promo_new1', code: f.code, active: true, times_redeemed: 0, max_redemptions: f.max_redemptions ? Number(f.max_redemptions) : null, expires_at: f.expires_at ? Number(f.expires_at) : null, created: 1790000000, coupon: { id: 'cpn_new1', percent_off: 20, duration: 'once', valid: true } })
    }
    if (u.startsWith('https://api.stripe.com/v1/promotion_codes/') && method === 'POST') {
      if (switchFails) return json({ error: { message: 'no' } }, 400)
      const f = Object.fromEntries(new URLSearchParams(String(init.body)))
      return json({ id: u.split('/').pop(), code: 'SPRING20', active: f.active === 'true', times_redeemed: 2, max_redemptions: null, expires_at: null, created: 1790000000, coupon: { id: 'cpn_1', percent_off: 20, duration: 'once', valid: true } })
    }
    throw new Error(`unexpected request: ${method} ${u}`)
  })
  fn.calls = calls
  return fn
}
const withNetwork = (o) => { const fn = network(o); vi.stubGlobal('fetch', fn); return fn }
const stripeCalls = (fn) => fn.calls.filter((c) => c.url.startsWith('https://api.stripe.com'))
const call = async (req) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'GET', query: { admin: 'promotions' }, headers: { authorization: 'Bearer owner-token' }, ...req }, res)
  return out
}
const post = (body, over = {}) => call({ method: 'POST', body, ...over })
const good = { action: 'create', code: 'spring20', kind: 'percent', value: '20', duration: 'once', months: '', maxUses: '', expiresOn: '' }
const item = (over = {}) => ({ id: 'promo_1', code: 'SPRING20', active: true, times_redeemed: 3, max_redemptions: 10, expires_at: FAR, created: 1790000000, coupon: { id: 'cpn_1', percent_off: 20, duration: 'repeating', duration_in_months: 3, valid: true }, ...over })

beforeEach(() => {
  Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'srv', STRIPE_SECRET_KEY: 'sk_test_secret_value_zzzz', OWNER_EMAIL: 'gill@example.com' })
  delete process.env.VITE_SUPABASE_URL; delete process.env.VITE_SUPABASE_ANON_KEY; delete process.env.SUPABASE_SECRET_KEY
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('who may use it', () => {
  it('turns away everyone but the owner, for looking and for changing, and sends nothing to Stripe', async () => {
    const fn = withNetwork({ codes: [item()] })
    for (const headers of [{}, { authorization: 'Bearer forged' }, { authorization: 'Bearer member-token' }, { authorization: 'Bearer unconfirmed-token' }]) {
      for (const req of [{}, { method: 'POST', body: good }, { method: 'POST', body: { action: 'switch', id: 'promo_1', active: false } }]) {
        const out = await call({ ...req, headers }); expect([401, 403], JSON.stringify([headers, req.method])).toContain(out.status); expect(out.body.ok).toBe(false)
      }
    }
    expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('checks who is asking before it does anything with Stripe', async () => {
    const fn = withNetwork({ codes: [item()] }); await call()
    expect(fn.calls[0].url).toContain('/auth/v1/user'); expect(fn.calls.findIndex((c) => c.url.includes('stripe.com'))).toBeGreaterThan(0)
  })
  it('never lets a page be kept, and only knows GET and POST', async () => {
    withNetwork({ codes: [] }); expect((await call()).headers['Cache-Control']).toBe('no-store')
    const out = await call({ method: 'PUT' }); expect(out.status).toBe(405); expect(out.headers.Allow).toBe('GET, POST')
    expect((await call({ method: 'DELETE' })).status).toBe(405)
  })
})

describe('Stripe not being ready', () => {
  it('says what is missing, without any key, when there is no Stripe key, or one it does not recognise, and calls Stripe for nothing', async () => {
    delete process.env.STRIPE_SECRET_KEY; let fn = withNetwork(); let out = await call()
    expect(out.status).toBe(503); expect(out.body.message).toMatch(/STRIPE_SECRET_KEY is missing/); expect(stripeCalls(fn)).toHaveLength(0)
    process.env.STRIPE_SECRET_KEY = 'whatever_secret_zzz'; fn = withNetwork(); out = await call()
    expect(out.status).toBe(503); expect(JSON.stringify(out.body)).not.toContain('whatever_secret_zzz'); expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('works in live mode as well as test mode, and says which', async () => {
    withNetwork({ codes: [] }); expect((await call()).body.mode).toBe('test')
    process.env.STRIPE_SECRET_KEY = 'sk_live_secret_value_zzzz'; withNetwork({ codes: [] }); expect((await call()).body.mode).toBe('live')
  })
})

describe('looking at the codes', () => {
  it('asks Stripe for the newest hundred codes with their coupons, using the same Stripe version as checkout, and says if there are more', async () => {
    const fn = withNetwork({ codes: [], hasMore: true }); const out = await call()
    const c = stripeCalls(fn)[0]; expect(c.url).toBe('https://api.stripe.com/v1/promotion_codes?limit=100&expand[]=data.coupon'); expect(c.method).toBe('GET')
    expect(c.init.headers.Authorization).toBe('Bearer sk_test_secret_value_zzzz'); expect(c.init.headers['Stripe-Version']).toBe('2024-06-20')
    expect(out.body).toMatchObject({ ok: true, mode: 'test', codes: [], more: true })
  })
  it('names each code for the page: the text, what it gives (in the words checkout uses), how often it was used, the limit, the last day, and whether it still works', async () => {
    withNetwork({ codes: [item(), item({ id: 'promo_2', code: 'FIVER', active: false, max_redemptions: null, expires_at: null, times_redeemed: 0, coupon: { id: 'cpn_2', amount_off: 500, currency: 'gbp', duration: 'once', valid: false } })] })
    const { body } = await call()
    expect(body.codes[0]).toEqual({ id: 'promo_1', code: 'SPRING20', active: true, summary: '20% off for 3 months', percentOff: 20, amountOff: null, duration: 'repeating', months: 3, used: 3, maxUses: 10, expiresAt: '2099-12-31T23:59:59.000Z', created: new Date(1790000000 * 1000).toISOString(), couponValid: true })
    expect(body.codes[1]).toMatchObject({ code: 'FIVER', active: false, summary: '\u00a35 off your first payment', amountOff: 500, percentOff: null, maxUses: null, expiresAt: null, used: 0, couponValid: false })
  })
  it('copes with an odd or empty code from Stripe', () => {
    expect(shapeCode({})).toMatchObject({ id: '', code: '', active: true, used: 0, maxUses: null, expiresAt: null, percentOff: null, amountOff: null })
    expect(shapeCode(null).summary).toBe('a discount'); expect(shapeCode({ max_redemptions: 0, expires_at: 0, coupon: { percent_off: 10, duration: 'forever' } })).toMatchObject({ maxUses: null, expiresAt: null, summary: '10% off for as long as you keep your passes' })
  })
  it('says plainly, with none of Stripe\u2019s words or the key, when it cannot list them', async () => {
    withNetwork({ listFails: true }); const out = await call()
    expect(out.status).toBe(502); expect(JSON.stringify(out.body)).not.toMatch(/sk_test|Invalid API/); expect(out.body.message).toMatch(/could not list the codes just now/)
  })
})

describe('making a code', () => {
  const fields = (c) => Object.fromEntries([...c.forms.entries()])
  it('makes the coupon first and then the code, with exactly what the form says, and tells the page what was made', async () => {
    const fn = withNetwork(); const out = await post({ ...good, duration: 'repeating', months: '3', maxUses: '10', expiresOn: '2099-12-31' })
    const [coupon, code] = stripeCalls(fn); expect(coupon.url).toBe('https://api.stripe.com/v1/coupons'); expect(code.url).toBe('https://api.stripe.com/v1/promotion_codes')
    expect(fields(coupon)).toEqual({ percent_off: '20', duration: 'repeating', duration_in_months: '3', name: 'SPRING20: 20% off for 3 months', 'metadata[starscapes_promo]': 'yes' })
    expect(code.forms.get('coupon')).toBe('cpn_new1'); expect(code.forms.get('code')).toBe('SPRING20'); expect(code.forms.get('max_redemptions')).toBe('10'); expect(code.forms.get('expires_at')).toBe(String(Date.UTC(2099, 11, 31, 23, 59, 59) / 1000)); expect(code.forms.getAll('expand[]')).toEqual(['coupon'])
    expect(out.status).toBe(201); expect(out.body.ok).toBe(true); expect(out.body.code).toMatchObject({ id: 'promo_new1', code: 'SPRING20', active: true, used: 0, maxUses: 10 })
  })
  it('takes off an amount in pence, in pounds sterling, when it is an amount', async () => {
    const fn = withNetwork(); await post({ ...good, kind: 'amount', value: '2.50', duration: 'forever' })
    const f = fields(stripeCalls(fn)[0]); expect(f).toMatchObject({ amount_off: '250', currency: 'gbp', duration: 'forever' }); expect(f.percent_off).toBeUndefined(); expect(f.duration_in_months).toBeUndefined()
  })
  it('sends no limit and no last day when there are none', async () => {
    const fn = withNetwork(); await post(good); const code = stripeCalls(fn)[1]
    expect(code.forms.has('max_redemptions')).toBe(false); expect(code.forms.has('expires_at')).toBe(false)
  })
  it('keeps the coupon\u2019s name within Stripe\u2019s 40 letters', async () => {
    const fn = withNetwork(); await post({ ...good, code: 'A'.repeat(40), kind: 'amount', value: '119.99', duration: 'repeating', months: '36' })
    expect(fields(stripeCalls(fn)[0]).name.length).toBeLessThanOrEqual(40)
  })
  it('accepts the form as JSON text too', async () => {
    const fn = withNetwork(); expect((await post(JSON.stringify(good))).status).toBe(201); expect(stripeCalls(fn)).toHaveLength(2)
  })
  it('turns away a form the rules refuse, saying which box and why, and sends NOTHING to Stripe', async () => {
    const fn = withNetwork()
    const cases = [{ code: 'x' }, { code: 'a b' }, { value: '101' }, { value: '0' }, { kind: 'amount', value: '121' }, { kind: 'free' }, { duration: 'weekly' }, { duration: 'repeating', months: '0' }, { maxUses: '0' }, { expiresOn: '2020-01-01' }, { expiresOn: '2026-02-30' }]
    for (const c of cases) { const out = await post({ ...good, ...c }); expect(out.status, JSON.stringify(c)).toBe(400); expect(typeof out.body.field).toBe('string'); expect(out.body.message.length).toBeGreaterThan(10) }
    expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('cannot be tricked into sending Stripe extra settings through a box', async () => {
    const fn = withNetwork()
    for (const attack of [{ code: 'A&percent_off=100' }, { code: 'ab\n&coupon=evil' }, { value: '20&duration=forever' }, { duration: 'once&x=1' }, { maxUses: '5&max_redemptions=1' }]) expect((await post({ ...good, ...attack })).status, JSON.stringify(attack)).toBe(400)
    expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('ignores extra fields in the form: only the ones it knows reach Stripe', async () => {
    const fn = withNetwork(); await post({ ...good, redeem_by: 1, 'metadata[x]': 'y', applies_to: 'everything', currency: 'usd' })
    const all = stripeCalls(fn).map((c) => [...c.forms.keys()]).flat(); for (const k of ['redeem_by', 'metadata[x]', 'applies_to']) expect(all).not.toContain(k)
    expect(fields(stripeCalls(fn)[0]).currency).toBeUndefined()
  })
})

describe('when making a code goes wrong', () => {
  it('says the name is taken, in plain words, and tidies away the coupon it had already made', async () => {
    const fn = withNetwork({ codeFails: 'An active promotion code with `code: SPRING20` already exists.' }); const out = await post(good)
    expect(out.status).toBe(409); expect(out.body.field).toBe('code'); expect(out.body.message).toMatch(/already exists and is working/)
    const del = stripeCalls(fn).find((c) => c.method === 'DELETE'); expect(del.url).toBe('https://api.stripe.com/v1/coupons/cpn_new1')
  })
  it('says nothing was made, and tidies away the coupon, if the code itself fails for any other reason', async () => {
    const fn = withNetwork({ codeFails: 'Boom with sk_test_secret_value_zzzz' }); const out = await post(good)
    expect(out.status).toBe(502); expect(out.body.message).toMatch(/Nothing was made/); expect(JSON.stringify(out.body)).not.toMatch(/sk_test|Boom/)
    expect(stripeCalls(fn).filter((c) => c.method === 'DELETE')).toHaveLength(1)
  })
  it('does not try to make the code if the coupon fails, and says nothing was made', async () => {
    const fn = withNetwork({ couponFails: true }); const out = await post(good)
    expect(out.status).toBe(502); expect(out.body.message).toMatch(/Nothing was made/); expect(JSON.stringify(out.body)).not.toMatch(/sk_test|Something with/)
    expect(stripeCalls(fn)).toHaveLength(1)
  })
})

describe('switching a code off or on', () => {
  it('changes only that code, and tells the page what it is now', async () => {
    const fn = withNetwork(); const off = await post({ action: 'switch', id: 'promo_abc123', active: false })
    const c = stripeCalls(fn)[0]; expect(c.url).toBe('https://api.stripe.com/v1/promotion_codes/promo_abc123'); expect(c.forms.get('active')).toBe('false'); expect(c.forms.getAll('expand[]')).toEqual(['coupon'])
    expect(off.status).toBe(200); expect(off.body.code).toMatchObject({ id: 'promo_abc123', active: false })
    const on = await post({ action: 'switch', id: 'promo_abc123', active: true }); expect(on.body.code.active).toBe(true); expect(stripeCalls(fn)[1].forms.get('active')).toBe('true')
  })
  it('refuses anything that is not a promotion code id, or not a plain yes or no, and sends nothing to Stripe', async () => {
    const fn = withNetwork()
    for (const bad of [{ id: 'cus_1', active: false }, { id: 'promo_1/../x', active: false }, { id: '', active: true }, { id: 'promo_1', active: 'false' }, { id: 'promo_1' }, { id: 'promo_1 ', active: 1 }, { id: 'coupon_1?x=1', active: true }]) expect((await post({ action: 'switch', ...bad })).status, JSON.stringify(bad)).toBe(400)
    expect(stripeCalls(fn)).toHaveLength(0)
  })
  it('says plainly if Stripe could not do it', async () => {
    withNetwork({ switchFails: true }); const out = await post({ action: 'switch', id: 'promo_1', active: false })
    expect(out.status).toBe(502); expect(out.body.message).toBe('Stripe could not switch that code off just now. Please try again in a moment.')
  })
})

describe('a request that does not make sense', () => {
  it('is refused: bad text, too much text, a list, no action, an unknown action', async () => {
    const fn = withNetwork()
    for (const body of ['not json', 'x'.repeat(5000), JSON.stringify([1, 2]), [1, 2], null, undefined, '', JSON.stringify({}), { action: 'delete-everything' }, { action: 'create' }]) { const out = await post(body); expect([400], String(JSON.stringify(body)).slice(0, 40)).toContain(out.status) }
    expect(stripeCalls(fn)).toHaveLength(0)
  })
})

describe('how it is wired in', () => {
  const src = (p) => readFileSync(join(process.cwd(), p), 'utf8')
  it('is handed over only after the owner check, and there is still no 13th function', () => {
    const code = src('lib/membershipAdmin.js')
    expect(code).toContain("import { handlePromotions } from './promotionsAdmin.js'")
    expect(code.indexOf('requireOwner(req)')).toBeLessThan(code.indexOf('handlePromotions(req, res)'))
    expect(readdirSync(join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))).toHaveLength(12)
  })
  it('uses the same rules as the page, so the two cannot disagree', () => {
    expect(src('lib/promotionsAdmin.js')).toContain("from '../src/admin/promotionsRules.js'"); expect(src('src/admin/AdminPromotions.jsx')).toContain("from './promotionsRules'")
  })
})
