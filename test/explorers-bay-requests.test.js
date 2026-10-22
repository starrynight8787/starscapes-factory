// @vitest-environment node
// Explorer's Bay sign-ups (22 October 2026): the Road journal and "tell me when it opens" follow the same rule as the free ebook (no tick, an optional newsletter box, confirm first, kept apart from the
// newsletter list), and the "it has opened" email goes once to each confirmed person when the owner opens the door, and carries no newsletter content. Against a pretend database and Resend.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import publicHandler from '../api/ebook-signup.js'
import adminHandler from '../api/membership-checkout.js'
import { OPTIONAL_NEWSLETTER_TEXT, SITE, confirmationEmail, doorOpenedEmail, ebookLinkEmail, requestForPurpose, requestOf } from '../src/newsletter/newsletterRules.js'
import { JOURNAL, OPENING_DOORS } from '../src/explorers/explorersConfig.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const originalFile = JOURNAL.file
const T = (n) => String(n).repeat(2).padStart(2, '0').repeat(24).slice(0, 48)

function world({ requests = [], subs = [], doors = [{ room: 'explorers-bay', door: 'lessons-from-the-road', open: true }], resendFails = false } = {}) {
  const reqs = requests.map((r) => ({ ...r })); const people = subs.map((r) => ({ ...r })); const sent = []
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const u = String(url); const method = init.method || 'GET'
    if (u.startsWith('https://db.test/auth/v1/user')) return String((init.headers || {}).Authorization) === 'Bearer owner-token' ? json({ id: 'o', email: 'gill@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }) : json({}, 401)
    if (u.startsWith('https://api.resend.com/emails')) { if (resendFails) return json({ message: 'no re_secret_key_zzzz' }, 500); const b = JSON.parse(init.body); sent.push(b); return json({ id: `em_${sent.length}` }) }
    const q = u.includes('?') ? new URL(u).searchParams : new URLSearchParams()
    const g = (k) => (q.get(k) || '').replace(/^eq\./, '')
    if (u.startsWith('https://db.test/rest/v1/doors')) return json(doors.filter((d) => d.room === g('room') && d.door === g('door') && String(d.open) === g('open')))
    const rows = u.startsWith('https://db.test/rest/v1/email_requests') ? reqs : u.startsWith('https://db.test/rest/v1/newsletter_subscribers') ? people : null
    if (rows) {
      if (method === 'GET') {
        let found = rows.filter((r) => (!g('email') || r.email === g('email')) && (!g('purpose') || r.purpose === g('purpose')) && (!g('token') || r.token === g('token')) && (!g('status') || r.status === g('status')) && (q.get('notified_at') !== 'is.null' || !r.notified_at))
        const lim = Number(q.get('limit')); if (lim) found = found.slice(0, lim)
        return json(found.map((r) => ({ ...r })))
      }
      if (method === 'POST') { const r = JSON.parse(init.body); if (rows.some((x) => x.email === r.email && x.purpose === r.purpose)) return json({ code: '23505' }, 409); rows.push({ id: `id-${rows.length + 1}`, confirmed_at: null, unsubscribed_at: null, notified_at: null, ...r }); return json(null, 201) }
      if (method === 'PATCH') { const id = g('id'); Object.assign(rows.find((x) => x.id === id), JSON.parse(init.body)); return json(null, 204) }
    }
    throw new Error(`unexpected request: ${method} ${u}`)
  }))
  return { reqs, people, sent }
}
const run = async (handler, r) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', query: {}, headers: {}, ...r }, res)
  return out
}
const sub = (body) => run(publicHandler, { query: { newsletter: 'subscribe' }, body })
const confirm = (token) => run(publicHandler, { query: { newsletter: 'confirm' }, body: { token } })
const tell = (door) => run(adminHandler, { query: { admin: 'newsletter' }, headers: { authorization: 'Bearer owner-token' }, body: { action: 'door-opened', door } })
const waiting = (n, over = {}) => ({ id: `w-${n}`, email: `p${n}@example.com`, purpose: 'opens:lessons-from-the-road', status: 'confirmed', token: T(n + 10), consent_text: 'x', wants_newsletter: false, newsletter_text: null, confirmation_sent_at: '2026-10-01T00:00:00Z', created_at: `2026-10-0${n}T00:00:00Z`, notified_at: null, ...over })

beforeEach(() => { Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'srv-key-secret-value-0000', RESEND_API_KEY: 're_secret_key_zzzz', OWNER_EMAIL: 'gill@example.com', NEWSLETTER_OPEN: 'yes' }); delete process.env.VITE_SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; JOURNAL.file = '' })
afterEach(() => { JOURNAL.file = originalFile; vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('what a request is', () => {
  it('knows three kinds, from a short list: the ebook, the Road journal, and a taped door’s list; anything else is the footer’s newsletter', () => {
    expect(requestOf({ source: 'road-journal' })).toMatchObject({ purpose: 'road-journal', join: 'road-journal', words: JOURNAL.request })
    expect(requestOf({ source: 'opens', door: 'travel-map' })).toMatchObject({ purpose: 'opens:travel-map', join: 'door' })
    for (const bad of [{ source: 'opens' }, { source: 'opens', door: 'nonsense' }, { source: 'opens', door: 'constructor' }, { source: 'opens', door: ['travel-map'] }, { source: 'Road-Journal' }, { source: 'site' }, {}, null]) expect(requestOf(bad), JSON.stringify(bad)).toBeNull()
    expect(requestForPurpose('opens:lessons-from-the-road').source).toBe('opens'); expect(requestForPurpose('opens:nonsense')).toBeNull(); expect(requestForPurpose('ebook').source).toBe('ebook'); expect(requestForPurpose('x')).toBeNull()
  })
  it('puts no mention of the newsletter in the words recorded for what they asked for', () => {
    for (const k of [requestOf({ source: 'road-journal' }), ...Object.keys(OPENING_DOORS).map((door) => requestOf({ source: 'opens', door }))]) expect(k.words, k.purpose).not.toMatch(/newsletter/i)
  })
})

describe('the Road journal sign-up', () => {
  it('needs only an email: a waiting request with the server’s words, nothing in the newsletter list, and an email about the journal only', async () => {
    const w = world(); const out = await sub({ email: 'Ann@Example.com', source: 'road-journal' })
    expect(out.body).toEqual({ ok: true }); expect(w.people).toHaveLength(0); expect(w.reqs[0]).toMatchObject({ email: 'ann@example.com', purpose: 'road-journal', status: 'pending', consent_text: JOURNAL.request, wants_newsletter: false })
    expect(w.sent).toHaveLength(1); expect(w.sent[0].subject).toBe('Please confirm your email to get your free Road journal'); expect(w.sent[0].text.replace(/https?:\/\/\S+/g, '')).not.toMatch(/newsletter/i); expect(w.sent[0].text).toContain('&for=road-journal')
  })
  it('joins the newsletter list only after the link is pressed, and only if the optional box was ticked, with the Road journal as the source', async () => {
    const w = world(); await sub({ email: 'ann@example.com', source: 'road-journal', newsletter: true }); expect(w.people).toHaveLength(0); expect(w.reqs[0].newsletter_text).toBe(OPTIONAL_NEWSLETTER_TEXT)
    const out = await confirm(w.reqs[0].token); expect(out.body).toMatchObject({ ok: true, state: 'confirmed', source: 'road-journal', kind: 'request', newsletter: true })
    expect(w.people).toHaveLength(1); expect(w.people[0]).toMatchObject({ status: 'confirmed', source: 'road-journal', consent_text: OPTIONAL_NEWSLETTER_TEXT })
  })
  it('sends the link again to someone who confirmed, once the file exists, and says nothing about a list', async () => {
    JOURNAL.file = '/downloads/road-journal.pdf'; const w = world({ requests: [{ ...waiting(1), purpose: 'road-journal' }] }); await sub({ email: 'p1@example.com', source: 'road-journal' })
    expect(w.sent).toHaveLength(1); expect(w.sent[0].subject).toBe('Your free Road journal: The Road Journal'); expect(w.sent[0].text).toContain(`${SITE}/downloads/road-journal.pdf`); expect(w.sent[0].text).not.toMatch(/already on/i)
  })
})

describe('"tell me when it opens"', () => {
  it('keeps one waiting request for that door, asks to confirm, and sends nothing else', async () => {
    const w = world(); await sub({ email: 'ann@example.com', source: 'opens', door: 'lessons-from-the-road' })
    expect(w.reqs[0]).toMatchObject({ purpose: 'opens:lessons-from-the-road', status: 'pending', wants_newsletter: false }); expect(w.people).toHaveLength(0)
    expect(w.sent).toHaveLength(1); expect(w.sent[0].subject).toBe('Please confirm your email to hear when Lessons from the road opens'); expect(w.sent[0].html).toContain('Yes, tell me when it opens'); expect(w.sent[0].text).toContain('&for=opens')
  })
  it('an unknown door is not accepted as a request: it falls back to the newsletter box, which needs its tick', async () => {
    const w = world(); const out = await sub({ email: 'ann@example.com', source: 'opens', door: 'nonsense' }); expect(out.status).toBe(400); expect(out.body.field).toBe('consent'); expect(w.reqs).toHaveLength(0); expect(w.sent).toHaveLength(0)
  })
  it('the same address can wait for two doors, one request each', async () => {
    const w = world(); await sub({ email: 'ann@example.com', source: 'opens', door: 'lessons-from-the-road' }); await sub({ email: 'ann@example.com', source: 'opens', door: 'travel-map' })
    expect(w.reqs.map((r) => r.purpose).sort()).toEqual(['opens:lessons-from-the-road', 'opens:travel-map'])
  })
  it('confirming says which door, and never offers a file; asking again after confirming sends nothing', async () => {
    const w = world(); await sub({ email: 'ann@example.com', source: 'opens', door: 'travel-map' })
    expect((await confirm(w.reqs[0].token)).body).toEqual({ ok: true, state: 'confirmed', source: 'opens', kind: 'request', newsletter: false, door: 'travel-map' })
    w.sent.length = 0; await sub({ email: 'ann@example.com', source: 'opens', door: 'travel-map' }); expect(w.sent).toHaveLength(0)
  })
  it('the email that says a door has opened has a link and nothing about the newsletter', () => {
    const m = doorOpenedEmail({ door: 'lessons-from-the-road', url: `${SITE}/explorers-bay/lessons-from-the-road` })
    expect(m.subject).toBe('Lessons from the road has opened'); expect(m.text).toContain(`${SITE}/explorers-bay/lessons-from-the-road`); expect(m.html).toContain(`${SITE}/explorers-bay/lessons-from-the-road`)
    expect(m.text.replace(/https?:\/\/\S+/g, '')).not.toMatch(/newsletter|subscribe|unsubscribe/i); expect(m.html.replace(/<[^>]+>/g, ' ').replace(/https?:\/\/\S+/g, '')).not.toMatch(/newsletter|subscribe/i)
  })
  it('the confirmation email for a door and for the Road journal each differ only where they should', () => {
    const a = confirmationEmail({ confirmUrl: 'https://x.test/c', source: 'opens', door: 'travel-map', newsletter: true }); expect(a.subject).toMatch(/^Please confirm to get a message when The Travel map opens and the Starscapes Factory newsletter$/); expect(a.html).toContain('Yes, tell me when it opens, and send me the newsletter')
    expect(ebookLinkEmail({ file: '/d.pdf', request: requestOf({ source: 'road-journal' }) }).subject).toMatch(/Road journal/)
  })
})

describe('telling the people waiting, when the owner opens a door', () => {
  it('emails each confirmed, not-yet-told person once, marks them told, and sends nothing to anyone else', async () => {
    const w = world({ requests: [waiting(1), waiting(2), waiting(3, { status: 'pending' }), waiting(4, { purpose: 'opens:travel-map' }), waiting(5, { notified_at: '2026-10-10T00:00:00Z' })] })
    const out = await tell('lessons-from-the-road'); expect(out.status).toBe(200); expect(out.body).toEqual({ ok: true, sent: 2, failed: 0, more: false })
    expect(w.sent.map((m) => m.to[0]).sort()).toEqual(['p1@example.com', 'p2@example.com']); expect(w.reqs.filter((r) => r.notified_at).map((r) => r.id).sort()).toEqual(['w-1', 'w-2', 'w-5'])
    w.sent.length = 0; expect((await tell('lessons-from-the-road')).body.sent).toBe(0); expect(w.sent).toHaveLength(0) // twice is safe
  })
  it('sends nothing, and says so, unless the door really is open', async () => {
    const w = world({ requests: [waiting(1)], doors: [{ room: 'explorers-bay', door: 'lessons-from-the-road', open: false }] }); const out = await tell('lessons-from-the-road')
    expect(out.status).toBe(409); expect(w.sent).toHaveLength(0); expect(w.reqs[0].notified_at).toBeNull()
  })
  it('does not tell the Road journal’s list until the file exists', async () => {
    const w = world({ requests: [waiting(1, { purpose: 'opens:road-journal' })], doors: [{ room: 'explorers-bay', door: 'road-journal', open: true }] }); const out = await tell('road-journal'); expect(out.status).toBe(409); expect(w.sent).toHaveLength(0)
    JOURNAL.file = '/downloads/road-journal.pdf'; expect((await tell('road-journal')).body.sent).toBe(1)
  })
  it('keeps someone in the queue when their email fails, and never passes on the mailing tool’s words', async () => {
    const w = world({ requests: [waiting(1)], resendFails: true }); const out = await tell('lessons-from-the-road'); expect(out.body).toMatchObject({ sent: 0, failed: 1 }); expect(w.reqs[0].notified_at).toBeNull(); expect(JSON.stringify(out.body)).not.toMatch(/re_secret/)
  })
  it('refuses a door with no list, and everyone but the owner', async () => {
    world({ requests: [waiting(1)] }); expect((await tell('nonsense')).status).toBe(400)
    const stranger = await run(adminHandler, { query: { admin: 'newsletter' }, headers: { authorization: 'Bearer nope' }, body: { action: 'door-opened', door: 'lessons-from-the-road' } }); expect(stranger.status).toBeGreaterThanOrEqual(401); expect(stranger.status).toBeLessThan(404)
  })
})

describe('the database file', () => {
  const sql = readFileSync(join(process.cwd(), 'sql/email-requests.sql'), 'utf8')
  it('has the column that remembers who was told, lets the other sign-up kinds join the newsletter list only through the same check, and keeps visitors out', () => {
    expect(sql).toMatch(/notified_at timestamptz/); expect(sql).toMatch(/source in \('site', 'ebook', 'road-journal', 'door'\)/); expect(sql).not.toMatch(/create policy/i)
  })
})
