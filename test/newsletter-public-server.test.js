// @vitest-environment node
// The newsletter's public side (lib/newsletter.js, reached through api/ebook-signup.js?newsletter=...), against a pretend database and a pretend Resend:
// sign up, confirm, unsubscribe. Nobody is added without confirming, nobody is told who is already signed up, opening a link changes nothing, and leaving always works.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/ebook-signup.js'
import { COOLDOWN_MS, isOpen, newToken, readBody } from '../lib/newsletter.js'
import { CONSENT_TEXT } from '../src/newsletter/newsletterRules.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const T1 = 'a1'.repeat(24)
const T2 = 'b2'.repeat(24)
const row = (over = {}) => ({ id: 'id-1', email: 'ann@example.com', status: 'pending', token: T1, consent_text: CONSENT_TEXT, source: 'site', confirmation_sent_at: new Date(Date.now() - 3600000).toISOString(), unsubscribed_at: null, confirmed_at: null, ...over })

function world({ rows = [], resendFails = false, dbFails = false } = {}) {
  const db = rows.map((r) => ({ ...r })); const sent = []; const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url); const method = init.method || 'GET'; calls.push({ u, method, body: init.body })
    if (u.startsWith('https://api.resend.com/emails')) { if (resendFails) return json({ message: 'no re_secret_key_zzzz' }, 500); const b = JSON.parse(init.body); sent.push(b); return json({ id: `em_${sent.length}` }) }
    if (u.startsWith('https://db.test/rest/v1/newsletter_subscribers')) {
      if (dbFails) return json({ message: 'boom srv-key-secret-value-0000' }, 500)
      const q = new URL(u).searchParams
      if (method === 'GET') { const e = (q.get('email') || '').replace(/^eq\./, ''); const t = (q.get('token') || '').replace(/^eq\./, ''); const found = db.find((r) => (e && r.email === e) || (t && r.token === t)); return json(found ? [{ ...found }] : []) }
      if (method === 'POST') { const r = JSON.parse(init.body); if (db.some((x) => x.email === r.email)) return json({ code: '23505' }, 409); db.push({ id: `id-${db.length + 1}`, unsubscribed_at: null, confirmed_at: null, ...r }); return json(null, 201) }
      if (method === 'PATCH') { const id = q.get('id').replace(/^eq\./, ''); const r = db.find((x) => x.id === id); Object.assign(r, JSON.parse(init.body)); return json(null, 204) }
    }
    throw new Error(`unexpected request: ${method} ${u}`)
  })
  vi.stubGlobal('fetch', fn)
  return { db, sent, calls, fn }
}
const call = async (req) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', query: {}, headers: {}, ...req }, res)
  return out
}
const sub = (body, over = {}) => call({ query: { newsletter: 'subscribe' }, body, ...over })
const confirm = (token, over = {}) => call({ query: { newsletter: 'confirm' }, body: { token }, ...over })
const leave = (token, over = {}) => call({ query: { newsletter: 'unsubscribe' }, body: { token }, ...over })
const yes = { email: 'ann@example.com', consent: true }

beforeEach(() => { Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'srv-key-secret-value-0000', RESEND_API_KEY: 're_secret_key_zzzz', NEWSLETTER_OPEN: 'yes' }); delete process.env.VITE_SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('is it open?', () => {
  it('says yes only when NEWSLETTER_OPEN is exactly "yes", and closed otherwise, and never says why', async () => {
    world(); expect((await call({ method: 'GET', query: { newsletter: 'status' } })).body).toEqual({ ok: true, open: true })
    for (const v of ['', 'no', 'YES', 'true', '1', ' ', undefined]) { if (v === undefined) delete process.env.NEWSLETTER_OPEN; else process.env.NEWSLETTER_OPEN = v; expect(isOpen(), String(v)).toBe(false); expect((await call({ method: 'GET', query: { newsletter: 'status' } })).body.open).toBe(false) }
    process.env.NEWSLETTER_OPEN = ' yes '; expect(isOpen()).toBe(true)
  })
  it('only answers a GET, and never lets any answer be kept', async () => {
    world(); const out = await call({ method: 'POST', query: { newsletter: 'status' } }); expect(out.status).toBe(405); expect(out.headers.Allow).toBe('GET'); expect(out.headers['Cache-Control']).toBe('no-store')
  })
  it('refuses a sign-up while closed, and stores and sends nothing', async () => {
    delete process.env.NEWSLETTER_OPEN; const w = world(); const out = await sub(yes)
    expect(out.status).toBe(403); expect(out.body.message).toBe('The newsletter is not open yet.'); expect(w.calls).toHaveLength(0)
  })
})

describe('signing up', () => {
  it('stores the person as PENDING with the words they agreed to, and emails a link to confirm: nobody is on the list yet', async () => {
    const w = world(); const out = await sub({ email: '  Ann@Example.COM ', consent: true })
    expect(out).toMatchObject({ status: 200, body: { ok: true } }); expect(w.db).toHaveLength(1)
    expect(w.db[0]).toMatchObject({ email: 'ann@example.com', status: 'pending', consent_text: CONSENT_TEXT, source: 'site' }); expect(w.db[0].token).toMatch(/^[a-f0-9]{48}$/); expect(Date.parse(w.db[0].confirmation_sent_at)).toBeGreaterThan(Date.now() - 5000)
    expect(w.sent).toHaveLength(1); expect(w.sent[0].to).toEqual(['ann@example.com']); expect(w.sent[0].text).toContain(`https://starscapesfactory.com/newsletter/confirm?t=${w.db[0].token}`); expect(w.sent[0].subject).toMatch(/confirm/i)
  })
  it('never sends the private code, a key, or anything about the list back to the browser', async () => {
    const w = world(); const text = JSON.stringify((await sub(yes)).body)
    expect(text).toBe('{"ok":true}'); expect(text).not.toContain(w.db[0].token)
  })
  it('gives exactly the same answer for an address that is already confirmed, and sends nothing and changes nothing', async () => {
    const w = world({ rows: [row({ status: 'confirmed', confirmed_at: '2026-10-01T00:00:00Z' })] }); const out = await sub(yes)
    expect(out).toMatchObject({ status: 200, body: { ok: true } }); expect(w.sent).toHaveLength(0); expect(w.db[0].status).toBe('confirmed'); expect(w.calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
  })
  it('does not send a second confirmation within ten minutes, and gives the same answer', async () => {
    const w = world({ rows: [row({ confirmation_sent_at: new Date(Date.now() - 60000).toISOString() })] }); const out = await sub(yes)
    expect(out.body).toEqual({ ok: true }); expect(w.sent).toHaveLength(0); expect(COOLDOWN_MS).toBe(600000)
  })
  it('sends the confirmation again after the ten minutes, with the SAME private code (so older emails keep working)', async () => {
    const w = world({ rows: [row()] }); await sub(yes)
    expect(w.sent).toHaveLength(1); expect(w.sent[0].text).toContain(`t=${T1}`); expect(w.db[0].token).toBe(T1); expect(Date.parse(w.db[0].confirmation_sent_at)).toBeGreaterThan(Date.now() - 5000)
  })
  it('lets someone who had left sign up again, from the beginning: pending again, asked to confirm again, same private code', async () => {
    const w = world({ rows: [row({ status: 'unsubscribed', unsubscribed_at: '2026-09-01T00:00:00Z' })] }); await sub(yes)
    expect(w.db[0]).toMatchObject({ status: 'pending', unsubscribed_at: null, token: T1 }); expect(w.sent).toHaveLength(1)
  })
  it('remembers a sign-up that came from the ebook page, and calls anything else the site', async () => {
    let w = world(); await sub({ ...yes, source: 'ebook' }); expect(w.db[0].source).toBe('ebook')
    w = world(); await sub({ ...yes, source: 'carrier-pigeon' }); expect(w.db[0].source).toBe('site')
  })
  it('turns away a bad address or an unticked box, saying which, and stores and sends nothing', async () => {
    const w = world()
    for (const [b, field] of [[{ email: '', consent: true }, 'email'], [{ email: 'nope', consent: true }, 'email'], [{ email: 'a@b.com' }, 'consent'], [{ email: 'a@b.com', consent: 'true' }, 'consent'], [{ email: 'a@b.com', consent: false }, 'consent']]) { const out = await sub(b); expect(out.status, JSON.stringify(b)).toBe(400); expect(out.body.field).toBe(field); expect(out.body.message.length).toBeGreaterThan(10) }
    expect(w.calls).toHaveLength(0)
  })
  it('gives a robot (the hidden box filled in) a quiet thank you, and keeps nothing and sends nothing', async () => {
    const w = world(); const out = await sub({ ...yes, website: 'http://spam.example' }); expect(out).toMatchObject({ status: 200, body: { ok: true } }); expect(w.calls).toHaveLength(0)
  })
  it('refuses a body it cannot read, and one that is too big', async () => {
    const w = world(); for (const body of [null, undefined, 'x'.repeat(5000), [1, 2]]) expect((await sub(body)).status, String(body).slice(0, 20)).toBe(400); expect(w.calls).toHaveLength(0)
  })
  it('accepts the sign-up as JSON text too', async () => {
    const w = world(); expect((await sub(JSON.stringify(yes))).status).toBe(200); expect(w.db).toHaveLength(1)
  })
  it('keeps the person pending, and says so plainly, if the confirmation email could not be sent', async () => {
    const w = world({ resendFails: true }); const out = await sub(yes)
    expect(out.status).toBe(502); expect(out.body.message).toMatch(/could not send the confirmation email/); expect(JSON.stringify(out.body)).not.toMatch(/re_secret|no re_/); expect(w.db[0].status).toBe('pending')
  })
  it('says plainly, with none of the database\u2019s words or keys, if the database cannot be used', async () => {
    const w = world({ dbFails: true }); const out = await sub(yes)
    expect(out.status).toBe(502); expect(JSON.stringify(out.body)).not.toMatch(/srv-key|boom/); expect(w.sent).toHaveLength(0)
  })
  it('says the newsletter is not available, and touches nothing, when the server has no database key', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY; const w = world(); const out = await sub(yes); expect(out.status).toBe(503); expect(w.calls).toHaveLength(0)
  })
  it('quietly accepts it if someone signed the same address up a moment before (the table allows one row each), and sends nothing more', async () => {
    const w = world(); const real = global.fetch
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => { if (String(url).includes('newsletter_subscribers') && (init.method || 'GET') === 'GET') return json([]); if ((init.method || 'GET') === 'POST' && String(url).includes('newsletter_subscribers')) return json({ code: '23505' }, 409); return real(url, init) }))
    const out = await sub(yes); expect(out).toMatchObject({ status: 200, body: { ok: true } }); expect(w.sent).toHaveLength(0)
  })
})

describe('confirming', () => {
  it('makes a pending person confirmed, with the time, only when the right private code is posted', async () => {
    const w = world({ rows: [row()] }); const out = await confirm(T1)
    expect(out).toMatchObject({ status: 200, body: { ok: true, state: 'confirmed' } }); expect(w.db[0].status).toBe('confirmed'); expect(Date.parse(w.db[0].confirmed_at)).toBeGreaterThan(Date.now() - 5000)
  })
  it('says "already" the second time, and changes nothing more', async () => {
    const w = world({ rows: [row({ status: 'confirmed', confirmed_at: '2026-10-01T00:00:00Z' })] }); const out = await confirm(T1)
    expect(out.body).toEqual({ ok: true, state: 'already' }); expect(w.db[0].confirmed_at).toBe('2026-10-01T00:00:00Z')
  })
  it('does NOT bring back someone who has unsubscribed: they must sign up again', async () => {
    const w = world({ rows: [row({ status: 'unsubscribed' })] }); const out = await confirm(T1)
    expect(out.status).toBe(410); expect(out.body.message).toMatch(/sign up again/); expect(w.db[0].status).toBe('unsubscribed')
  })
  it('says the link is not valid for a code nobody has', async () => {
    world({ rows: [row()] }); const out = await confirm(T2); expect(out.status).toBe(404); expect(out.body.ok).toBe(false)
  })
  it('SECURITY: asks the database nothing at all for a code that is not 48 letters of hex, so nothing can be slipped into a question', async () => {
    const w = world({ rows: [row()] })
    for (const bad of ['', 'x', T1.toUpperCase(), `${T1}x`, `${T1.slice(1)}`, "a' or '1'='1", `${T1}&status=eq.confirmed`, `${T1}\n`, null, undefined, 5, {}, [T1], { x: T1 }]) expect((await confirm(bad)).status, JSON.stringify(bad)).toBe(400)
    expect(w.calls).toHaveLength(0)
  })
  it('SECURITY: never confirms from opening a link (a GET): mail programs and virus scanners open links before people do', async () => {
    const w = world({ rows: [row()] }); const out = await call({ method: 'GET', query: { newsletter: 'confirm', t: T1 } })
    expect(out.status).toBe(405); expect(out.headers.Allow).toBe('POST'); expect(w.db[0].status).toBe('pending'); expect(w.calls).toHaveLength(0)
  })
  it('works even while the sign-up box is closed, so someone already waiting to confirm is not stranded', async () => {
    delete process.env.NEWSLETTER_OPEN; const w = world({ rows: [row()] }); expect((await confirm(T1)).status).toBe(200); expect(w.db[0].status).toBe('confirmed')
  })
  it('says plainly, without the database\u2019s words, when something goes wrong', async () => {
    world({ dbFails: true }); const out = await confirm(T1); expect(out.status).toBe(502); expect(JSON.stringify(out.body)).not.toMatch(/srv-key|boom/)
  })
})

describe('unsubscribing', () => {
  it('unsubscribes with the time, and keeps the person in the table marked as such, so they are never emailed again', async () => {
    const w = world({ rows: [row({ status: 'confirmed' })] }); const out = await leave(T1)
    expect(out).toMatchObject({ status: 200, body: { ok: true, state: 'unsubscribed' } }); expect(w.db).toHaveLength(1); expect(w.db[0].status).toBe('unsubscribed'); expect(Date.parse(w.db[0].unsubscribed_at)).toBeGreaterThan(Date.now() - 5000)
  })
  it('works for someone who never confirmed, and is fine to do twice', async () => {
    const w = world({ rows: [row()] }); await leave(T1); const first = w.db[0].unsubscribed_at; const again = await leave(T1)
    expect(again.body).toEqual({ ok: true, state: 'unsubscribed' }); expect(w.db[0].unsubscribed_at).toBe(first); expect(w.calls.filter((c) => c.method === 'PATCH')).toHaveLength(1)
  })
  it('works one-click from a mail program: a POST to the link, with the code in the address and the standard form text as the body', async () => {
    const w = world({ rows: [row({ status: 'confirmed' })] }); const out = await call({ query: { newsletter: 'unsubscribe', t: T1 }, body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    expect(out.status).toBe(200); expect(w.db[0].status).toBe('unsubscribed')
  })
  it('says the link is not valid for a code nobody has, and asks nothing for a malformed one', async () => {
    let w = world({ rows: [row()] }); expect((await leave(T2)).status).toBe(404)
    w = world({ rows: [row()] }); for (const bad of ['', 'x', "a' or '1'='1", `${T1}&x=1`, null, undefined]) expect((await leave(bad)).status, String(bad)).toBe(400); expect(w.calls).toHaveLength(0)
  })
  it('SECURITY: never unsubscribes from opening a link (a GET)', async () => {
    const w = world({ rows: [row({ status: 'confirmed' })] }); const out = await call({ method: 'GET', query: { newsletter: 'unsubscribe', t: T1 } })
    expect(out.status).toBe(405); expect(w.db[0].status).toBe('confirmed'); expect(w.calls).toHaveLength(0)
  })
  it('works while the sign-up box is closed: leaving must always be possible', async () => {
    delete process.env.NEWSLETTER_OPEN; const w = world({ rows: [row({ status: 'confirmed' })] }); expect((await leave(T1)).status).toBe(200); expect(w.db[0].status).toBe('unsubscribed')
  })
  it('after leaving, an old confirm link does not bring them back', async () => {
    const w = world({ rows: [row()] }); await leave(T1); expect((await confirm(T1)).status).toBe(410); expect(w.db[0].status).toBe('unsubscribed')
  })
})

describe('the small helpers and how it is wired in', () => {
  it('makes a private code of 48 hex letters, a different one each time', () => {
    const a = newToken(); const b = newToken(); expect(a).toMatch(/^[a-f0-9]{48}$/); expect(a).not.toBe(b)
  })
  it('reads JSON, JSON text and form text, and nothing else', () => {
    expect(readBody({ body: { a: 1 } })).toEqual({ a: 1 }); expect(readBody({ body: '{"a":1}' })).toEqual({ a: 1 }); expect(readBody({ body: 'List-Unsubscribe=One-Click' })).toEqual({ 'List-Unsubscribe': 'One-Click' })
    for (const body of [null, undefined, [1], 5, 'x'.repeat(5000)]) expect(readBody({ body }), String(body).slice(0, 10)).toBeNull()
  })
  it('does not disturb the ebook sign-up: with no ?newsletter, the old behaviour is unchanged', async () => {
    const w = world(); const out = await call({ query: {}, body: { email: '', consent: false } }); expect(out.status).toBe(400); expect(out.body.errors).toBeTruthy(); expect(w.calls).toHaveLength(0)
    expect((await call({ method: 'GET', query: {} })).status).toBe(405)
  })
  it('is handed over before the ebook code, inside the same function: there is no 13th function', () => {
    const code = readFileSync(join(process.cwd(), 'api/ebook-signup.js'), 'utf8')
    expect(code).toContain("import { handleNewsletter } from '../lib/newsletter.js'"); expect(code.indexOf('handleNewsletter(req, res)')).toBeLessThan(code.indexOf("if (req.method !== 'POST')"))
    expect(readdirSync(join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))).toHaveLength(12)
  })
  it('knows no other request, and says nothing about it', async () => {
    const w = world(); expect((await call({ query: { newsletter: 'everyone' } })).status).toBe(404); expect(w.calls).toHaveLength(0)
  })
})
