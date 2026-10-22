// @vitest-environment node
// The free ebook and the newsletter are ONE list (21 October 2026): asking for the ebook signs someone up to the newsletter list (source 'ebook'), through the same confirm-by-email step.
// Against a pretend database and a pretend Resend. The words recorded as their agreement are the ones on the box they ticked, chosen by the server; nobody is told whether an address was already
// signed up; nobody gets the ebook link before confirming; and the old separate ebook sign-up is gone.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/ebook-signup.js'
import { COOLDOWN_MS } from '../lib/newsletter.js'
import { CONSENT_TEXT, SITE, confirmationEmail, consentFor, ebookLinkEmail, sourceOf } from '../src/newsletter/newsletterRules.js'
import { EBOOK } from '../src/ebook/ebookConfig.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const T1 = 'a1'.repeat(24)
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()
const row = (over = {}) => ({ id: 'id-1', email: 'ann@example.com', status: 'pending', token: T1, consent_text: CONSENT_TEXT, source: 'site', confirmation_sent_at: hoursAgo(1), unsubscribed_at: null, confirmed_at: null, ...over })
const originalFile = EBOOK.file

function world({ rows = [], resendFails = false } = {}) {
  const db = rows.map((r) => ({ ...r })); const sent = []; const calls = []
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const u = String(url); const method = init.method || 'GET'; calls.push({ u, method })
    if (u.startsWith('https://api.resend.com/emails')) { if (resendFails) return json({ message: 'no re_secret_key_zzzz' }, 500); const b = JSON.parse(init.body); sent.push(b); return json({ id: `em_${sent.length}` }) }
    if (u.startsWith('https://db.test/rest/v1/newsletter_subscribers')) {
      const q = new URL(u).searchParams
      if (method === 'GET') { const e = (q.get('email') || '').replace(/^eq\./, ''); const t = (q.get('token') || '').replace(/^eq\./, ''); const found = db.find((r) => (e && r.email === e) || (t && r.token === t)); return json(found ? [{ ...found }] : []) }
      if (method === 'POST') { const r = JSON.parse(init.body); if (db.some((x) => x.email === r.email)) return json({ code: '23505' }, 409); db.push({ id: `id-${db.length + 1}`, unsubscribed_at: null, confirmed_at: null, ...r }); return json(null, 201) }
      if (method === 'PATCH') { const id = q.get('id').replace(/^eq\./, ''); const r = db.find((x) => x.id === id); Object.assign(r, JSON.parse(init.body)); return json(null, 204) }
    }
    throw new Error(`unexpected request: ${method} ${u}`)
  }))
  return { db, sent, calls }
}
const call = async (req) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', query: {}, headers: {}, ...req }, res)
  return out
}
const sub = (body) => call({ query: { newsletter: 'subscribe' }, body })
const confirm = (token) => call({ query: { newsletter: 'confirm' }, body: { token } })
const ebook = (over = {}) => ({ email: 'ann@example.com', consent: true, source: 'ebook', ...over })

beforeEach(() => { Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'srv-key-secret-value-0000', RESEND_API_KEY: 're_secret_key_zzzz', NEWSLETTER_OPEN: 'yes' }); delete process.env.VITE_SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; EBOOK.file = '' })
afterEach(() => { EBOOK.file = originalFile; vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('asking for the ebook signs someone up to the newsletter list', () => {
  it('keeps them as waiting to confirm (not on the list yet), marked as coming from the ebook, with the exact words on the ebook\u2019s tick box, and says only "ok"', async () => {
    const w = world(); const out = await sub(ebook({ email: 'Ann@Example.com ' }))
    expect(out.status).toBe(200); expect(out.body).toEqual({ ok: true })
    expect(w.db).toHaveLength(1); expect(w.db[0]).toMatchObject({ email: 'ann@example.com', status: 'pending', source: 'ebook', consent_text: EBOOK.consent }); expect(w.db[0].consent_text).toMatch(/free ebook and the Starscapes Factory newsletter/)
  })
  it('chooses the words itself: a browser cannot make the server record other words as their agreement', async () => {
    const w = world(); await sub(ebook({ consent_text: 'I agree to anything', consentText: 'x' })); expect(w.db[0].consent_text).toBe(EBOOK.consent)
  })
  it('sends exactly one email, to that address, asking them to confirm, and it mentions the free ebook and the newsletter (not just the newsletter)', async () => {
    const w = world(); await sub(ebook()); expect(w.sent).toHaveLength(1); const mail = w.sent[0]
    expect(mail.to).toEqual(['ann@example.com']); expect(mail.subject).toBe('Please confirm to get your free ebook and the Starscapes Factory newsletter'); expect(mail.text).toContain('asked for the free ebook and the Starscapes Factory newsletter'); expect(mail.html).toContain('Yes, send me the free ebook and the newsletter')
    expect(mail.text).toContain(`${SITE}/newsletter/confirm?t=`); expect(mail.text).not.toContain('/downloads/') // the ebook is not given before they confirm
  })
  it('sends the plain newsletter email from the footer box, unchanged: the footer words, and no mention of the ebook', async () => {
    for (const body of [{ email: 'ann@example.com', consent: true, source: 'site' }, { email: 'ann@example.com', consent: true }, { email: 'ann@example.com', consent: true, source: 'something-else' }, { email: 'ann@example.com', consent: true, source: ['ebook'] }]) {
      const w = world(); await sub(body); expect(w.db[0]).toMatchObject({ source: 'site', consent_text: CONSENT_TEXT }); expect(w.sent[0].subject).toBe('Please confirm you would like the Starscapes Factory newsletter'); expect(w.sent[0].text).not.toMatch(/ebook/i); expect(w.sent[0].html).not.toMatch(/ebook/i)
    }
  })
  it('asks for the right tick in the right words: without it, an ebook sign-up says "free ebook and the newsletter"; the footer says "the newsletter"', async () => {
    world(); const a = await sub(ebook({ consent: false })); expect(a.status).toBe(400); expect(a.body).toMatchObject({ ok: false, field: 'consent', message: 'Please tick the box to say you would like the free ebook and the newsletter.' })
    const b = await sub({ email: 'ann@example.com', consent: false }); expect(b.body.message).toBe('Please tick the box to say you would like the newsletter.')
  })
  it('keeps nothing and sends nothing for a robot (the hidden box filled in), and never while the newsletter is closed', async () => {
    const w = world(); const robot = await sub(ebook({ website: 'http://spam.example' })); expect(robot.status).toBe(200); expect(w.db).toHaveLength(0); expect(w.sent).toHaveLength(0)
    delete process.env.NEWSLETTER_OPEN; const closed = await sub(ebook()); expect(closed.status).toBe(403); expect(w.db).toHaveLength(0); expect(w.sent).toHaveLength(0)
  })
})

describe('the page can never tell who is already signed up', () => {
  it('gives the very same answer whether the address is new, waiting, already confirmed or had left (and the ebook link never goes to anyone unconfirmed)', async () => {
    EBOOK.file = '/downloads/leading-from-the-middle.pdf'
    const answers = []
    for (const r of [null, row({ status: 'pending', confirmation_sent_at: hoursAgo(5) }), row({ status: 'confirmed', confirmed_at: hoursAgo(9) }), row({ status: 'unsubscribed', unsubscribed_at: hoursAgo(9) })]) {
      const w = world({ rows: r ? [r] : [] }); const out = await sub(ebook()); answers.push(out)
      const kinds = w.sent.map((m) => (m.subject.startsWith('Please confirm') ? 'confirm' : 'link')); if (!r || r.status !== 'confirmed') expect(kinds).toEqual(['confirm']) // anyone not confirmed gets only the confirm email
    }
    for (const a of answers) { expect(a.status).toBe(200); expect(a.body).toEqual({ ok: true }) }
  })
})

describe('someone already on the list asks for the ebook', () => {
  it('while there is no PDF: nothing is sent and nothing changes (they hear when it is ready, like everyone on the list)', async () => {
    const w = world({ rows: [row({ status: 'confirmed', confirmed_at: hoursAgo(9) })] }); const out = await sub(ebook()); expect(out.body).toEqual({ ok: true }); expect(w.sent).toHaveLength(0); expect(w.db[0]).toMatchObject({ status: 'confirmed', source: 'site', consent_text: CONSENT_TEXT })
  })
  it('once there is a PDF: they get ONE email with the link (nothing to confirm), and their record is untouched', async () => {
    EBOOK.file = '/downloads/leading-from-the-middle.pdf'; const w = world({ rows: [row({ status: 'confirmed', confirmed_at: hoursAgo(9) })] }); await sub(ebook())
    expect(w.sent).toHaveLength(1); const mail = w.sent[0]; expect(mail.to).toEqual(['ann@example.com']); expect(mail.subject).toBe('Your free ebook: Leading from the Middle'); expect(mail.text).toContain(`${SITE}/downloads/leading-from-the-middle.pdf`); expect(mail.text).toContain('nothing to confirm')
    expect(w.db[0]).toMatchObject({ status: 'confirmed', source: 'site', consent_text: CONSENT_TEXT }); expect(w.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })
  it('from the footer box they get nothing more (the answer is the same, and nothing is sent)', async () => {
    EBOOK.file = '/downloads/x.pdf'; const w = world({ rows: [row({ status: 'confirmed', confirmed_at: hoursAgo(9) })] }); await sub({ email: 'ann@example.com', consent: true }); expect(w.sent).toHaveLength(0)
  })
  it('says plainly, with none of the mailing tool\u2019s words or key, when that email cannot be sent', async () => {
    EBOOK.file = '/downloads/x.pdf'; world({ rows: [row({ status: 'confirmed', confirmed_at: hoursAgo(9) })], resendFails: true }); const out = await sub(ebook())
    expect(out.status).toBe(502); expect(out.body.ok).toBe(false); expect(JSON.stringify(out.body)).not.toMatch(/re_secret|no re_/)
  })
})

describe('someone already waiting, or who had left, asks for the ebook', () => {
  it('a moment after joining from the footer: no second email, but the record now says they came for the ebook and holds the words they ticked last', async () => {
    const w = world({ rows: [row({ status: 'pending', confirmation_sent_at: new Date(Date.now() - COOLDOWN_MS / 4).toISOString() })] }); await sub(ebook())
    expect(w.sent).toHaveLength(0); expect(w.db[0]).toMatchObject({ status: 'pending', source: 'ebook', consent_text: EBOOK.consent })
  })
  it('later: a fresh confirmation email (the ebook one), and the record holds the ebook words', async () => {
    const w = world({ rows: [row({ status: 'pending', confirmation_sent_at: hoursAgo(30) })] }); await sub(ebook()); expect(w.sent).toHaveLength(1); expect(w.sent[0].subject).toMatch(/free ebook/); expect(w.db[0]).toMatchObject({ source: 'ebook', consent_text: EBOOK.consent, status: 'pending' })
  })
  it('someone who had unsubscribed starts again from the beginning: waiting to confirm, with the ebook words, and a confirmation email (not the link)', async () => {
    EBOOK.file = '/downloads/x.pdf'; const w = world({ rows: [row({ status: 'unsubscribed', unsubscribed_at: hoursAgo(50) })] }); await sub(ebook())
    expect(w.db[0]).toMatchObject({ status: 'pending', source: 'ebook', consent_text: EBOOK.consent, unsubscribed_at: null }); expect(w.sent).toHaveLength(1); expect(w.sent[0].subject).toMatch(/^Please confirm/)
  })
})

describe('confirming', () => {
  it('tells the confirm page where they came from (so it can offer the ebook), only for a real private code, and changes nothing else', async () => {
    const w = world({ rows: [row({ source: 'ebook' })] }); const out = await confirm(T1); expect(out.status).toBe(200); expect(out.body).toEqual({ ok: true, state: 'confirmed', source: 'ebook' }); expect(w.db[0].status).toBe('confirmed')
    const again = await confirm(T1); expect(again.body).toEqual({ ok: true, state: 'already', source: 'ebook' })
    world({ rows: [row({ source: 'site' })] }); expect((await confirm(T1)).body).toEqual({ ok: true, state: 'confirmed', source: 'site' })
    const bad = await confirm('not-a-code'); expect(bad.status).toBe(400); expect(bad.body).not.toHaveProperty('source')
  })
})

describe('the words and emails', () => {
  it('chooses the source and the words from a short list, and anything odd means the footer', () => {
    expect(sourceOf({ source: 'ebook' })).toBe('ebook'); for (const v of [undefined, null, '', 'site', 'EBOOK', ['ebook'], { x: 1 }, 5]) expect(sourceOf({ source: v }), String(v)).toBe('site'); expect(sourceOf(null)).toBe('site'); expect(sourceOf(undefined)).toBe('site')
    expect(consentFor('ebook')).toBe(EBOOK.consent); expect(consentFor('site')).toBe(CONSENT_TEXT); expect(consentFor('anything')).toBe(CONSENT_TEXT); expect(consentFor()).toBe(CONSENT_TEXT)
  })
  it('the ebook\u2019s words say yes to both, the way out, and no price or pass', () => {
    expect(EBOOK.consent).toMatch(/free ebook and the Starscapes Factory newsletter by email/); expect(EBOOK.consent).toMatch(/unsubscribe at any time/); expect(EBOOK.consent).not.toMatch(/pass|pay|£|price|member/i)
  })
  it('the two confirmation emails differ only where they should, and both carry the link and the unsubscribe-free promise "do nothing and you will not be signed up"', () => {
    const a = confirmationEmail({ confirmUrl: 'https://x.test/c?t=1' }); const b = confirmationEmail({ confirmUrl: 'https://x.test/c?t=1', source: 'ebook' })
    expect(a.subject).not.toBe(b.subject); for (const m of [a, b]) { expect(m.text).toContain('https://x.test/c?t=1'); expect(m.html).toContain('https://x.test/c?t=1'); expect(m.text).toContain('If it was not you, do nothing: you will not be signed up') }
    expect(a.text).not.toMatch(/ebook/i); expect(b.text).toMatch(/free ebook/)
  })
  it('the ebook link email puts the link in as an address and the file note, escapes anything odd, and says there is nothing to confirm', () => {
    const m = ebookLinkEmail({ file: '/downloads/a b.pdf?x=<script>' }); expect(m.html).not.toContain('<script>'); expect(m.text).toContain(`${SITE}/downloads/a b.pdf?x=<script>`); expect(m.html).toContain('&lt;script&gt;'); expect(m.html).toContain(EBOOK.fileNote); expect(m.text).toContain('nothing to confirm')
  })
})

describe('the old separate ebook sign-up is gone', () => {
  it('has no server code of its own, no table in use, and the address answers "not found" to anything that is not the newsletter', async () => {
    expect(existsSync(join(process.cwd(), 'lib/ebookSignup.js'))).toBe(false)
    const files = [...readdirSync(join(process.cwd(), 'lib')).map((f) => `lib/${f}`), ...readdirSync(join(process.cwd(), 'api')).map((f) => `api/${f}`), 'src/ebook/FreeEbookPage.jsx', 'src/newsletter/newsletterApi.js']
    expect(files.filter((f) => /ebook_signups|handleSignup|ebookSignup/.test(readFileSync(join(process.cwd(), f), 'utf8')))).toEqual([])
    const w = world(); for (const method of ['POST', 'GET']) { const out = await call({ method, body: { email: 'ann@example.com', consent: true } }); expect(out.status).toBe(404) }
    expect(w.db).toHaveLength(0); expect(w.calls).toHaveLength(0)
  })
  it('the page asks the newsletter\u2019s server and nowhere else, and says where the sign-up came from', () => {
    const page = readFileSync(join(process.cwd(), 'src/ebook/FreeEbookPage.jsx'), 'utf8'); expect(page).toMatch(/source: 'ebook'/); expect(page).not.toMatch(/fetch\(/); expect(readFileSync(join(process.cwd(), 'src/newsletter/newsletterApi.js'), 'utf8')).toMatch(/source: source === 'ebook' \? 'ebook' : 'site'/)
  })
  it('the daily tidy-up treats ebook sign-ups like any other: it never looks at where they came from', () => {
    const tidy = readFileSync(join(process.cwd(), 'lib/newsletter.js'), 'utf8').split('async function tidy')[1].split('export async function handleNewsletter')[0]; expect(tidy).not.toMatch(/source/)
  })
})
