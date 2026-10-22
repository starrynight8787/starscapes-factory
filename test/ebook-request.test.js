// @vitest-environment node
// The free ebook (22 October 2026): getting it needs NO tick and does not join the newsletter. It is a one-purpose request, kept in its own table (email_requests), confirmed by email first.
// The newsletter is a separate OPTIONAL box: only if it was ticked AND the link is pressed does the person join the newsletter list, with the words next to that box.
// Against a pretend database and a pretend Resend.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/ebook-signup.js'
import { COOLDOWN_MS } from '../lib/newsletter.js'
import { CONSENT_TEXT, OPTIONAL_NEWSLETTER_TEXT, SITE, cleanSubscribe, confirmationEmail, confirmUrl, consentFor, ebookLinkEmail, sourceOf } from '../src/newsletter/newsletterRules.js'
import { EBOOK } from '../src/ebook/ebookConfig.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const T1 = 'a1'.repeat(24)
const T2 = 'b2'.repeat(24)
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()
const req = (over = {}) => ({ id: 'r-1', email: 'ann@example.com', purpose: 'ebook', status: 'pending', token: T1, consent_text: EBOOK.request, wants_newsletter: false, newsletter_text: null, confirmation_sent_at: hoursAgo(1), confirmed_at: null, ...over })
const person = (over = {}) => ({ id: 's-1', email: 'ann@example.com', status: 'confirmed', token: T2, consent_text: CONSENT_TEXT, source: 'site', confirmation_sent_at: hoursAgo(90), unsubscribed_at: null, confirmed_at: hoursAgo(90), ...over })
const originalFile = EBOOK.file

function world({ requests = [], people = [], resendFails = false } = {}) {
  const reqs = requests.map((r) => ({ ...r })); const subs = people.map((r) => ({ ...r })); const sent = []; const calls = []
  const table = (u) => (u.startsWith('https://db.test/rest/v1/email_requests') ? reqs : u.startsWith('https://db.test/rest/v1/newsletter_subscribers') ? subs : null)
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const u = String(url); const method = init.method || 'GET'; calls.push({ u, method })
    if (u.startsWith('https://api.resend.com/emails')) { if (resendFails) return json({ message: 'no re_secret_key_zzzz' }, 500); const b = JSON.parse(init.body); sent.push(b); return json({ id: `em_${sent.length}` }) }
    const rows = table(u)
    if (rows) {
      const q = new URL(u).searchParams
      if (method === 'GET') { const g = (k) => (q.get(k) || '').replace(/^eq\./, ''); const found = rows.find((r) => (g('email') && r.email === g('email') && (!g('purpose') || r.purpose === g('purpose'))) || (g('token') && r.token === g('token'))); return json(found ? [{ ...found }] : []) }
      if (method === 'POST') { const r = JSON.parse(init.body); if (rows.some((x) => x.email === r.email && x.purpose === r.purpose)) return json({ code: '23505' }, 409); rows.push({ id: `id-${rows.length + 1}`, unsubscribed_at: null, confirmed_at: null, ...r }); return json(null, 201) }
      if (method === 'PATCH') { const id = q.get('id').replace(/^eq\./, ''); Object.assign(rows.find((x) => x.id === id), JSON.parse(init.body)); return json(null, 204) }
    }
    throw new Error(`unexpected request: ${method} ${u}`)
  }))
  return { reqs, subs, sent, calls }
}
const call = async (r) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', query: {}, headers: {}, ...r }, res)
  return out
}
const sub = (body) => call({ query: { newsletter: 'subscribe' }, body })
const confirm = (token) => call({ query: { newsletter: 'confirm' }, body: { token } })
const ebook = (over = {}) => ({ email: 'ann@example.com', source: 'ebook', ...over })

beforeEach(() => { Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'srv-key-secret-value-0000', RESEND_API_KEY: 're_secret_key_zzzz', NEWSLETTER_OPEN: 'yes' }); delete process.env.VITE_SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; EBOOK.file = '' })
afterEach(() => { EBOOK.file = originalFile; vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('asking for the ebook needs no tick and does not touch the newsletter list', () => {
  it('stores a waiting request (not confirmed) with the server’s own words, and nothing in the newsletter list', async () => {
    const w = world(); const out = await sub(ebook({ email: 'Ann@Example.com ' }))
    expect(out.status).toBe(200); expect(out.body).toEqual({ ok: true })
    expect(w.reqs).toHaveLength(1); expect(w.reqs[0]).toMatchObject({ email: 'ann@example.com', purpose: 'ebook', status: 'pending', consent_text: EBOOK.request, wants_newsletter: false, newsletter_text: null })
    expect(w.reqs[0].consent_text).not.toMatch(/newsletter/i); expect(w.subs).toHaveLength(0)
  })
  it('never lets a browser choose the words that are recorded', async () => {
    const w = world(); await sub(ebook({ consent_text: 'I agree to anything', newsletter_text: 'x', consent: false })); expect(w.reqs[0].consent_text).toBe(EBOOK.request); expect(w.reqs[0].newsletter_text).toBe(null)
  })
  it('emails once, asking only to confirm the ebook: no newsletter in it', async () => {
    const w = world(); await sub(ebook()); expect(w.sent).toHaveLength(1); const mail = w.sent[0]
    expect(mail.to).toEqual(['ann@example.com']); expect(mail.subject).toBe('Please confirm your email to get your free ebook'); expect(mail.text).toContain('asked for the free ebook to be sent'); const words = (t) => t.replace(/https?:\/\/\S+/g, ''); expect(words(mail.text)).not.toMatch(/newsletter/i); expect(words(mail.html.replace(/<[^>]+>/g, ' '))).not.toMatch(/newsletter/i)
    expect(mail.text).toContain(`${SITE}/newsletter/confirm?t=${w.reqs[0].token}&for=ebook`); expect(mail.text).not.toContain('/downloads/')
  })
  it('the optional newsletter box, when ticked, is kept as its own flag and words, and the email says so; ticking is only ever a literal true', async () => {
    const w = world(); await sub(ebook({ newsletter: true })); expect(w.reqs[0]).toMatchObject({ wants_newsletter: true, newsletter_text: OPTIONAL_NEWSLETTER_TEXT }); expect(w.subs).toHaveLength(0)
    expect(w.sent[0].subject).toBe('Please confirm to get your free ebook and the Starscapes Factory newsletter'); expect(w.sent[0].html).toContain('Yes, send me the free ebook and the newsletter')
    for (const v of ['true', 'on', 1, 'yes', [true], undefined, null, false]) { const x = world(); await sub(ebook({ newsletter: v })); expect(x.reqs[0].wants_newsletter, String(v)).toBe(false) }
  })
  it('a site (footer) sign-up is unchanged: it still needs its tick, joins the list as waiting, and says nothing about the ebook', async () => {
    const none = await sub({ email: 'ann@example.com', consent: false }); expect(none.status).toBe(400); expect(none.body).toMatchObject({ field: 'consent', message: 'Please tick the box to say you would like the newsletter.' })
    for (const body of [{ email: 'ann@example.com', consent: true, source: 'site' }, { email: 'ann@example.com', consent: true }, { email: 'ann@example.com', consent: true, source: 'EBOOK' }]) {
      const w = world(); await sub(body); expect(w.subs[0]).toMatchObject({ source: 'site', status: 'pending', consent_text: CONSENT_TEXT }); expect(w.reqs).toHaveLength(0); expect(w.sent[0].subject).toBe('Please confirm you would like the Starscapes Factory newsletter'); expect(w.sent[0].text).not.toMatch(/ebook/i)
    }
  })
  it('keeps nothing and sends nothing for a robot, and never while sign-ups are closed; a bad address is refused in plain words', async () => {
    const w = world(); const robot = await sub(ebook({ website: 'http://spam.example' })); expect(robot.status).toBe(200); expect(w.reqs).toHaveLength(0); expect(w.sent).toHaveLength(0)
    const bad = await sub(ebook({ email: 'nope' })); expect(bad.status).toBe(400); expect(bad.body.field).toBe('email')
    delete process.env.NEWSLETTER_OPEN; const closed = await sub(ebook()); expect(closed.status).toBe(403); expect(w.reqs).toHaveLength(0)
  })
})

describe('the page can never tell who asked before', () => {
  it('gives the very same answer for a new address, a waiting one and a confirmed one, and a confirmed address is the only one sent the link', async () => {
    EBOOK.file = '/downloads/leading-from-the-middle.pdf'; const answers = []
    for (const r of [null, req({ confirmation_sent_at: hoursAgo(5) }), req({ status: 'confirmed', confirmed_at: hoursAgo(9) })]) {
      const w = world({ requests: r ? [r] : [] }); answers.push(await sub(ebook()))
      const kinds = w.sent.map((m) => (m.subject.startsWith('Please confirm') ? 'confirm' : 'link')); expect(kinds).toEqual(r && r.status === 'confirmed' ? ['link'] : ['confirm'])
    }
    for (const a of answers) { expect(a.status).toBe(200); expect(a.body).toEqual({ ok: true }) }
  })
  it('someone who confirmed already, while there is no PDF: nothing is sent and nothing changes', async () => {
    const w = world({ requests: [req({ status: 'confirmed', confirmed_at: hoursAgo(9) })] }); const out = await sub(ebook()); expect(out.body).toEqual({ ok: true }); expect(w.sent).toHaveLength(0); expect(w.calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
  })
  it('once there is a PDF: one email with the link, saying nothing about the newsletter, and the record is untouched', async () => {
    EBOOK.file = '/downloads/leading-from-the-middle.pdf'; const w = world({ requests: [req({ status: 'confirmed', confirmed_at: hoursAgo(9) })] }); await sub(ebook())
    expect(w.sent).toHaveLength(1); const mail = w.sent[0]; expect(mail.subject).toBe('Your free ebook: Leading from the Middle'); expect(mail.text).toContain(`${SITE}/downloads/leading-from-the-middle.pdf`); expect(mail.text).not.toMatch(/already on the/i)
    expect(w.reqs[0]).toMatchObject({ status: 'confirmed' }); expect(w.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })
  it('says plainly, without the mailing tool’s words or key, when the email cannot be sent', async () => {
    world({ resendFails: true }); const out = await sub(ebook()); expect(out.status).toBe(502); expect(out.body.ok).toBe(false); expect(JSON.stringify(out.body)).not.toMatch(/re_secret|no re_/)
  })
})

describe('asking again', () => {
  it('a moment later: no second email, but the record follows the box as it is now', async () => {
    const w = world({ requests: [req({ confirmation_sent_at: new Date(Date.now() - COOLDOWN_MS / 4).toISOString() })] }); await sub(ebook({ newsletter: true }))
    expect(w.sent).toHaveLength(0); expect(w.reqs[0]).toMatchObject({ wants_newsletter: true, newsletter_text: OPTIONAL_NEWSLETTER_TEXT })
    await sub(ebook({ newsletter: false })); expect(w.reqs[0]).toMatchObject({ wants_newsletter: false, newsletter_text: null })
  })
  it('later, while still waiting: a fresh confirmation email and the box as it is now', async () => {
    const w = world({ requests: [req({ confirmation_sent_at: hoursAgo(30), wants_newsletter: true, newsletter_text: OPTIONAL_NEWSLETTER_TEXT })] }); await sub(ebook()); expect(w.sent).toHaveLength(1); expect(w.reqs[0]).toMatchObject({ status: 'pending', wants_newsletter: false, newsletter_text: null })
  })
  it('someone who confirmed the ebook and now also ticks the newsletter: a new confirm email for that, and they are not on the list until they press it', async () => {
    const w = world({ requests: [req({ status: 'confirmed', confirmed_at: hoursAgo(9) })] }); await sub(ebook({ newsletter: true }))
    expect(w.reqs[0]).toMatchObject({ status: 'pending', wants_newsletter: true }); expect(w.sent).toHaveLength(1); expect(w.sent[0].subject).toMatch(/newsletter/); expect(w.subs).toHaveLength(0)
  })
  it('but someone already on the newsletter list who confirmed the ebook just gets the link (nothing more to confirm)', async () => {
    EBOOK.file = '/downloads/x.pdf'; const w = world({ requests: [req({ status: 'confirmed', confirmed_at: hoursAgo(9) })], people: [person()] }); await sub(ebook({ newsletter: true }))
    expect(w.sent).toHaveLength(1); expect(w.sent[0].subject).toMatch(/^Your free ebook/); expect(w.reqs[0].status).toBe('confirmed')
  })
  it('an ebook request never changes someone who is on the newsletter list: no change to their record, and no confirm email for it', async () => {
    const w = world({ people: [person({ status: 'unsubscribed', unsubscribed_at: hoursAgo(50) })] }); await sub(ebook())
    expect(w.subs[0].status).toBe('unsubscribed'); expect(w.reqs).toHaveLength(1)
  })
})

describe('confirming', () => {
  it('confirms the ebook request only: the newsletter list is untouched when the box was not ticked', async () => {
    const w = world({ requests: [req()] }); const out = await confirm(T1)
    expect(out.status).toBe(200); expect(out.body).toEqual({ ok: true, state: 'confirmed', source: 'ebook', kind: 'request', newsletter: false }); expect(w.reqs[0].status).toBe('confirmed'); expect(w.subs).toHaveLength(0)
    expect((await confirm(T1)).body).toEqual({ ok: true, state: 'already', source: 'ebook', kind: 'request', newsletter: false })
  })
  it('when the box was ticked, pressing the link also adds a CONFIRMED newsletter subscriber, with the words next to the box and the ebook as the source', async () => {
    const w = world({ requests: [req({ wants_newsletter: true, newsletter_text: OPTIONAL_NEWSLETTER_TEXT })] }); const out = await confirm(T1)
    expect(out.body).toEqual({ ok: true, state: 'confirmed', source: 'ebook', kind: 'request', newsletter: true })
    expect(w.subs).toHaveLength(1); expect(w.subs[0]).toMatchObject({ email: 'ann@example.com', status: 'confirmed', source: 'ebook', consent_text: OPTIONAL_NEWSLETTER_TEXT }); expect(w.subs[0].token).toMatch(/^[a-f0-9]{48}$/); expect(w.subs[0].confirmed_at).toBeTruthy()
  })
  it('brings back someone who had left, only because they ticked it themselves just now; and leaves someone already confirmed exactly as they are', async () => {
    const left = world({ requests: [req({ wants_newsletter: true, newsletter_text: OPTIONAL_NEWSLETTER_TEXT })], people: [person({ status: 'unsubscribed', unsubscribed_at: hoursAgo(50) })] }); await confirm(T1)
    expect(left.subs[0]).toMatchObject({ status: 'confirmed', unsubscribed_at: null, source: 'ebook', consent_text: OPTIONAL_NEWSLETTER_TEXT })
    const on = world({ requests: [req({ wants_newsletter: true, newsletter_text: OPTIONAL_NEWSLETTER_TEXT })], people: [person()] }); await confirm(T1); expect(on.subs[0]).toMatchObject({ source: 'site', consent_text: CONSENT_TEXT }); expect(on.calls.filter((c) => c.method !== 'GET' && c.u.includes('newsletter_subscribers'))).toHaveLength(0)
  })
  it('still works as before for the newsletter list, and a code nobody has is "not valid"', async () => {
    const w = world({ people: [person({ status: 'pending', confirmed_at: null })] }); expect((await confirm(T2)).body).toEqual({ ok: true, state: 'confirmed', source: 'site' }); expect(w.subs[0].status).toBe('confirmed')
    world(); expect((await confirm(T1)).status).toBe(404); const bad = await confirm('not-a-code'); expect(bad.status).toBe(400); expect(bad.body).not.toHaveProperty('source')
  })
})

describe('the words and emails', () => {
  it('chooses the source and the words from a short list, and anything odd means the footer', () => {
    expect(sourceOf({ source: 'ebook' })).toBe('ebook'); for (const v of [undefined, null, '', 'site', 'EBOOK', ['ebook'], { x: 1 }, 5]) expect(sourceOf({ source: v }), String(v)).toBe('site'); expect(sourceOf(null)).toBe('site')
    expect(consentFor('ebook')).toBe(OPTIONAL_NEWSLETTER_TEXT); expect(consentFor('site')).toBe(CONSENT_TEXT); expect(consentFor('anything')).toBe(CONSENT_TEXT); expect(consentFor()).toBe(CONSENT_TEXT)
  })
  it('the optional box has one set of words: it starts "Optional:", has the way out, and no price or pass; the ebook request words say nothing about the newsletter', () => {
    expect(OPTIONAL_NEWSLETTER_TEXT).toBe('Optional: also send me the Starscapes Factory newsletter by email, with new posts and news. I can unsubscribe at any time, with the link in every email.'); expect(OPTIONAL_NEWSLETTER_TEXT).not.toMatch(/pass|pay|£|price|member/i)
    expect(EBOOK.request).not.toMatch(/newsletter/i); expect(EBOOK.smallPrint).toMatch(/for that only, unless you tick the box/); expect(EBOOK).not.toHaveProperty('consent')
  })
  it('cleanSubscribe: the ebook needs only an email (newsletter true only for a literal true); the footer still needs its tick', () => {
    expect(cleanSubscribe({ email: ' A@B.com ', source: 'ebook' })).toEqual({ ok: true, email: 'a@b.com', newsletter: false }); expect(cleanSubscribe({ email: 'a@b.com', source: 'ebook', newsletter: true })).toEqual({ ok: true, email: 'a@b.com', newsletter: true })
    expect(cleanSubscribe({ email: 'a@b.com', source: 'ebook', newsletter: 'true' }).newsletter).toBe(false); expect(cleanSubscribe({ email: 'a@b.com' })).toMatchObject({ ok: false, field: 'consent' }); expect(cleanSubscribe({ email: '', source: 'ebook' }).field).toBe('email')
  })
  it('the confirm links: the "for=ebook" only changes the words on the page', () => {
    expect(confirmUrl(T1)).toBe(`${SITE}/newsletter/confirm?t=${T1}`); expect(confirmUrl(T1, SITE, 'ebook')).toBe(`${SITE}/newsletter/confirm?t=${T1}&for=ebook`); expect(confirmUrl(T1, SITE, 'x')).toBe(`${SITE}/newsletter/confirm?t=${T1}`)
  })
  it('the confirmation emails carry the link and the "do nothing" promise; the ebook-only one never mentions the newsletter', () => {
    const a = confirmationEmail({ confirmUrl: 'https://x.test/c?t=1' }); const b = confirmationEmail({ confirmUrl: 'https://x.test/c?t=1', source: 'ebook' }); const c = confirmationEmail({ confirmUrl: 'https://x.test/c?t=1', source: 'ebook', newsletter: true })
    for (const m of [a, b, c]) { expect(m.text).toContain('https://x.test/c?t=1'); expect(m.html).toContain('https://x.test/c?t=1'); expect(m.text).toContain('If it was not you, do nothing: you will not be signed up') }
    expect(a.text).not.toMatch(/ebook/i); expect(b.text.replace(/https?:\/\/\S+/g, '')).not.toMatch(/newsletter/i); expect(b.html.replace(/<[^>]+>/g, ' ').replace(/https?:\/\/\S+/g, '')).not.toMatch(/newsletter/i); expect(c.text).toMatch(/free ebook, and the Starscapes Factory newsletter/)
  })
  it('the ebook link email puts the link in as an address and the file note, escapes anything odd, and does not claim they are on any list', () => {
    const m = ebookLinkEmail({ file: '/downloads/a b.pdf?x=<script>' }); expect(m.html).not.toContain('<script>'); expect(m.text).toContain(`${SITE}/downloads/a b.pdf?x=<script>`); expect(m.html).toContain('&lt;script&gt;'); expect(m.html).toContain(EBOOK.fileNote); expect(m.text).not.toMatch(/already on/i)
  })
})

describe('the old separate ebook sign-up is still gone, and the new table is server-only', () => {
  it('has no old ebook server code or table, and the address answers "not found" to anything that is not the newsletter', async () => {
    expect(existsSync(join(process.cwd(), 'lib/ebookSignup.js'))).toBe(false)
    const w = world(); for (const method of ['POST', 'GET']) { const out = await call({ method, body: { email: 'ann@example.com' } }); expect(out.status).toBe(404) }
    expect(w.calls).toHaveLength(0)
  })
  it('the page asks the newsletter’s server and nowhere else', () => {
    const page = readFileSync(join(process.cwd(), 'src/ebook/FreeEbookPage.jsx'), 'utf8'); expect(page).toMatch(/source: 'ebook'/); expect(page).not.toMatch(/fetch\(/); expect(page).not.toMatch(/consent/)
  })
  it('the SQL file makes email_requests with row level security, no policies, and the server’s key only', () => {
    const sql = readFileSync(join(process.cwd(), 'sql/email-requests.sql'), 'utf8'); expect(sql).toMatch(/create table if not exists public\.email_requests/); expect(sql).toMatch(/unique \(email, purpose\)/); expect(sql).toMatch(/enable row level security/); expect(sql).toMatch(/revoke all on public\.email_requests from anon, authenticated;/)
    const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n'); expect(code).toMatch(/^grant select, insert, update, delete on public\.email_requests to service_role;/m); expect(code).not.toMatch(/create policy/i); expect(code).not.toMatch(/grant[^;]*to[^;]*(anon|authenticated)/i)
  })
})
