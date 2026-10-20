// @vitest-environment node
// The owner's members request (lib/membershipAdmin.js, reached through api/membership-checkout.js?admin=members), against a pretend database and sign-in system:
// that only the owner can use it, that nothing is read before that is known, what comes back, and what never does.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/membership-checkout.js'
import { fetchEmails, handleAdmin, isAdminRequest, shapeMember } from '../lib/membershipAdmin.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const U1 = 'aaaaaaaa-1111-2222-3333-444444444444'
const U2 = 'bbbbbbbb-1111-2222-3333-444444444444'
const U3 = 'cccccccc-1111-2222-3333-444444444444'
const row = (id, over = {}) => ({ user_id: id, status: 'active', passes: ['blueprints'], billing_interval: 'month', current_period_end: '2026-11-20T20:16:55+00:00', cancel_at_period_end: false, offer_ends_at: '2027-10-20T20:16:55+00:00', offer_note: null, created_at: '2026-10-20T20:16:55+00:00', updated_at: '2026-10-20T20:36:27+00:00', stripe_customer_id: 'cus_abc123', ...over })

function network({ members = [], users = [], usersFail = false, membersFail = false, usersPages = null } = {}) {
  const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url); calls.push({ url: u, init })
    if (u.startsWith('https://db.test/auth/v1/user')) {
      const t = String((init.headers || {}).Authorization || '')
      if (t === 'Bearer owner-token') return json({ id: 'owner-id', email: 'gill@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' })
      if (t === 'Bearer unconfirmed-token') return json({ id: 'owner-id', email: 'gill@example.com' })
      if (t === 'Bearer member-token') return json({ id: 'member-id', email: 'someone@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' })
      return json({}, 401)
    }
    if (u.startsWith('https://db.test/auth/v1/admin/users')) {
      if (usersFail) return json({ message: 'no' }, 500)
      const page = Number(new URL(u).searchParams.get('page'))
      return json({ users: usersPages ? (usersPages[page - 1] || []) : users })
    }
    if (u.startsWith('https://db.test/rest/v1/memberships?')) return membersFail ? json({ code: 'XX000', message: 'boom with key srv-key-secret-value-0000000000000000' }, 500) : json(members)
    throw new Error(`unexpected request: ${u}`)
  })
  fn.calls = calls
  return fn
}
const withNetwork = (o) => { const fn = network(o); vi.stubGlobal('fetch', fn); return fn }
const read = (fn) => fn.calls.filter((c) => /\/rest\/v1\/|\/auth\/v1\/admin\//.test(c.url))

const call = async (req) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'GET', query: { admin: 'members' }, headers: { authorization: 'Bearer owner-token' }, ...req }, res)
  return out
}

beforeEach(() => {
  Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'srv-key-secret-value-0000000000000000', STRIPE_SECRET_KEY: 'sk_test_abc', OWNER_EMAIL: 'gill@example.com' })
  delete process.env.VITE_SUPABASE_URL; delete process.env.VITE_SUPABASE_ANON_KEY; delete process.env.SUPABASE_SECRET_KEY
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('who may ask', () => {
  it('lets the owner in, and reads the members only after checking who is asking', async () => {
    const fn = withNetwork({ members: [row(U1)], users: [{ id: U1, email: 'a@example.com' }] })
    const out = await call()
    expect(out.status).toBe(200); expect(out.body.ok).toBe(true)
    const order = fn.calls.map((c) => (c.url.includes('/auth/v1/user') ? 'who' : 'read'))
    expect(order[0]).toBe('who'); expect(order.slice(1).every((x) => x === 'read')).toBe(true)
  })
  it('turns away someone who is signed in but is not the owner, and reads nothing', async () => {
    const fn = withNetwork({ members: [row(U1)] })
    const out = await call({ headers: { authorization: 'Bearer member-token' } })
    expect(out.status).toBe(403); expect(out.body.ok).toBe(false); expect(read(fn)).toHaveLength(0)
    expect(JSON.stringify(out.body)).not.toMatch(/a@example|aaaaaaaa|cus_/)
  })
  it('turns away someone using the owner\u2019s email address when that address has never been confirmed, and reads nothing', async () => {
    const fn = withNetwork({ members: [row(U1)] })
    const out = await call({ headers: { authorization: 'Bearer unconfirmed-token' } })
    expect(out.status).toBe(403); expect(read(fn)).toHaveLength(0)
  })
  it('turns away someone not signed in, or with a token the sign-in system does not know, and reads nothing', async () => {
    const fn = withNetwork({ members: [row(U1)] })
    expect((await call({ headers: {} })).status).toBe(401)
    expect((await call({ headers: { authorization: 'Bearer forged' } })).status).toBe(401)
    expect(read(fn)).toHaveLength(0)
  })
  it('refuses everything while the owner email is not set, and reads nothing', async () => {
    delete process.env.OWNER_EMAIL
    const fn = withNetwork({ members: [row(U1)] })
    const out = await call(); expect(out.status).toBe(503); expect(read(fn)).toHaveLength(0)
  })
  it('only answers a GET: anything else is refused with the right header, after the owner check, and reads nothing', async () => {
    const fn = withNetwork({ members: [row(U1)] })
    const out = await call({ method: 'POST', body: '{}' })
    expect(out.status).toBe(405); expect(out.headers.Allow).toBe('GET'); expect(read(fn)).toHaveLength(0)
    expect((await call({ method: 'POST', headers: {} })).status).toBe(401)
  })
  it('does not know any other admin request yet: it says so plainly and reads nothing', async () => {
    const fn = withNetwork({ members: [row(U1)] })
    const out = await call({ query: { admin: 'anything-else' } }); expect(out.status).toBe(404); expect(read(fn)).toHaveLength(0)
  })
  it('is only reached by ?admin=...: an ordinary membership request is not taken for it', () => {
    expect(isAdminRequest({ query: { admin: 'members' } })).toBe(true)
    for (const q of [{}, { admin: '' }, { admin: ['members'] }, undefined]) expect(isAdminRequest({ query: q }), JSON.stringify(q)).toBe(false)
    expect(isAdminRequest(null)).toBe(false)
  })
  it('does not let the page be kept: every answer says not to store it', async () => {
    withNetwork({ members: [] }); expect((await call()).headers['Cache-Control']).toBe('no-store')
    withNetwork({ members: [] }); expect((await call({ headers: {} })).headers['Cache-Control']).toBe('no-store')
  })
})

describe('what comes back', () => {
  it('is each member with their email, matched by account id, newest change first (as the database sorted them)', async () => {
    const fn = withNetwork({ members: [row(U2, { status: 'past_due' }), row(U1), row(U3, { status: 'canceled' })], users: [{ id: U1, email: 'a@example.com' }, { id: U2, email: 'b@example.com' }] })
    const out = await call()
    expect(out.body.members.map((x) => x.email)).toEqual(['b@example.com', 'a@example.com', ''])
    expect(out.body.members.map((x) => x.view)).toEqual(['trouble', 'active', 'ended'])
    expect(out.body.emails_ok).toBe(true)
    expect(read(fn).find((c) => c.url.includes('/rest/v1/memberships?')).url).toContain('order=updated_at.desc')
  })
  it('works out each member\u2019s status the same way My passes does', async () => {
    withNetwork({ members: [row(U1), row(U2, { cancel_at_period_end: true }), row(U3, { status: 'incomplete' })] })
    const out = await call(); expect(out.body.members.map((x) => x.view)).toEqual(['active', 'cancelling', 'free'])
  })
  it('says which mode Stripe is in, so the page can warn about test customers', async () => {
    withNetwork({ members: [] }); expect((await call()).body.mode).toBe('test')
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc'; withNetwork({ members: [] }); expect((await call()).body.mode).toBe('live')
    delete process.env.STRIPE_SECRET_KEY; withNetwork({ members: [] }); expect((await call()).body.mode).toBe('unknown')
  })
  it('asks the sign-in system for the email addresses page by page, so more than a thousand people are all found', async () => {
    const filler = Array.from({ length: 1000 }, (_, i) => ({ id: `f-${i}`, email: `f${i}@example.com` }))
    const fn = withNetwork({ members: [row(U1)], usersPages: [filler, [{ id: U1, email: 'late@example.com' }]] })
    const out = await call(); expect(out.body.members[0].email).toBe('late@example.com')
    expect(fn.calls.filter((c) => c.url.includes('/auth/v1/admin/users')).map((c) => new URL(c.url).searchParams.get('page'))).toEqual(['1', '2'])
  })
  it('still shows the members, without addresses, and says so, if the sign-in system cannot be asked', async () => {
    withNetwork({ members: [row(U1)], usersFail: true })
    const out = await call(); expect(out.status).toBe(200); expect(out.body.emails_ok).toBe(false); expect(out.body.members[0].email).toBe(''); expect(out.body.members).toHaveLength(1)
  })
  it('is an empty list, not an error, when nobody has joined', async () => {
    withNetwork({ members: [] }); const out = await call(); expect(out.status).toBe(200); expect(out.body.members).toEqual([])
  })
})

describe('what never comes back', () => {
  it('never sends a full account id, a server key, a Stripe key, or the anon key', async () => {
    withNetwork({ members: [row(U1), row(U2)], users: [{ id: U1, email: 'a@example.com' }] })
    const text = JSON.stringify((await call()).body)
    for (const secret of [U1, U2, 'srv-key-secret', 'sk_test', 'anon', 'owner-token']) expect(text, secret).not.toContain(secret)
    expect(text).toContain('aaaaaaaa'); expect(text).toContain('bbbbbbbb') // a short label to tell people apart
  })
  it('sends only the fields the page shows', async () => {
    withNetwork({ members: [row(U1, { consent_text: 'secret words', stripe_subscription_id: 'sub_zzz' })] })
    const member = (await call()).body.members[0]
    expect(Object.keys(member).sort()).toEqual(['cancelling', 'customer', 'email', 'interval', 'offerEndsAt', 'offerNote', 'passes', 'periodEnd', 'ref', 'since', 'status', 'updated', 'view'])
  })
  it('keeps a Stripe customer id only if it looks like one, and drops unknown passes', () => {
    expect(shapeMember(row(U1, { stripe_customer_id: 'cus_abc123' })).customer).toBe('cus_abc123')
    for (const bad of ['sub_abc', 'cus_a/../b', '<script>', '', null]) expect(shapeMember(row(U1, { stripe_customer_id: bad })).customer, String(bad)).toBe('')
    expect(shapeMember(row(U1, { passes: ['blueprints', 'free-money', 'book-club', 'blueprints'] })).passes).toEqual(['blueprints', 'book-club'])
    expect(shapeMember(row(U1, { passes: null })).passes).toEqual([])
  })
  it('reads the interval safely: a year is a year, anything else is a month', () => {
    expect(shapeMember(row(U1, { billing_interval: 'year' })).interval).toBe('year'); expect(shapeMember(row(U1, { billing_interval: 'weekly' })).interval).toBe('month')
  })
  it('says nothing about the database or its key when something goes wrong', async () => {
    withNetwork({ membersFail: true })
    const out = await call(); expect(out.status).toBe(502)
    expect(JSON.stringify(out.body)).not.toMatch(/srv-key|secret-value/)
    expect(out.body.message).toMatch(/could not be read just now/)
  })
  it('says what is missing, without any key, when the server has no database key', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY; const fn = withNetwork({ members: [row(U1)] })
    const out = await call(); expect(out.status).toBe(503); expect(out.body.message).toMatch(/SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY/); expect(read(fn)).toHaveLength(0)
  })
  it('never throws when asking for emails goes wrong', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    expect(await fetchEmails()).toEqual({ byId: {}, ok: false })
  })
})

describe('how it is wired in', () => {
  const src = (p) => readFileSync(join(process.cwd(), p), 'utf8')
  it('is handed over by the membership function before it does anything else with a request, and there is no 13th function', () => {
    const code = src('api/membership-checkout.js')
    expect(code).toContain("import { handleAdmin, isAdminRequest } from '../lib/membershipAdmin.js'")
    expect(code.indexOf('isAdminRequest(req)')).toBeGreaterThan(-1)
    expect(code.indexOf('isAdminRequest(req)')).toBeLessThan(code.indexOf("res.setHeader('Cache-Control', 'no-store')\n\n  if (req.method === 'GET')"))
    expect(readdirSync(join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))).toHaveLength(12)
  })
  it('checks for the owner before it reads anything, in its own code too', () => {
    const code = src('lib/membershipAdmin.js')
    expect(code.indexOf('requireOwner(req)')).toBeGreaterThan(-1)
    expect(code.indexOf('requireOwner(req)')).toBeLessThan(code.indexOf('return members(res)'))
    expect(typeof handleAdmin).toBe('function')
  })
})
