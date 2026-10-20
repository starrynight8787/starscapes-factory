// @vitest-environment node
// The owner's newsletter tools (lib/newsletterAdmin.js, reached through api/membership-checkout.js?admin=newsletter), against a pretend database and a pretend Resend.
// The things that could hurt: someone emailed twice, someone emailed after leaving, a limit hit halfway, two presses of Send at once, a stranger using the tools.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/membership-checkout.js'
import { resendBatch } from '../lib/newsletterAdmin.js'
import { BATCH_SIZE } from '../src/newsletter/newsletterRules.js'
import { COMPANY, companyLine } from '../src/data/company'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const hex = (n) => n.toString(16).padStart(2, '0').repeat(24)
const sub = (n, over = {}) => ({ id: randomUUID(), email: `person${n}@example.com`, status: 'confirmed', token: hex(n % 250), source: 'site', created_at: `2026-10-${String(1 + (n % 20)).padStart(2, '0')}T10:00:00Z`, confirmed_at: '2026-10-02T10:00:00Z', unsubscribed_at: null, ...over })
const issue = (over = {}) => ({ id: randomUUID(), subject: 'Autumn news', body: 'Hello **you**.\n\nSecond paragraph.', status: 'draft', created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T10:00:00Z', sent_at: null, total: 0, sent: 0, failed: 0, ...over })

function world({ subscribers = [], issues = [], sends = [], resend = [] } = {}) {
  const S = subscribers.map((r) => ({ ...r })); const I = issues.map((r) => ({ ...r })); const Q = sends.map((r) => ({ ...r }))
  const script = [...resend] // what Resend does on each batch call, in turn: 'ok' (the default), or 'quota', 'slow', 'server', 'refused', 'down'
  const batches = []; const singles = []; const calls = []
  const tables = { newsletter_subscribers: S, newsletter_issues: I, newsletter_sends: Q }
  const match = (r, q) => { for (const [k, v] of q) { if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue; if (v.startsWith('eq.')) { if (String(r[k]) !== v.slice(3)) return false } else if (v.startsWith('in.(')) { if (!v.slice(4, -1).split(',').includes(String(r[k]))) return false } else if (v.startsWith('lt.')) { if (!(r[k] && r[k] < v.slice(3))) return false } } return true }
  const withJoin = (r) => ({ ...r, newsletter_subscribers: S.find((x) => x.id === r.subscriber_id) ? (({ email, token, status }) => ({ email, token, status }))(S.find((x) => x.id === r.subscriber_id)) : null })
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url); const method = init.method || 'GET'; calls.push({ u, method, body: init.body })
    if (u.startsWith('https://db.test/auth/v1/user')) {
      const t = String((init.headers || {}).Authorization || '')
      if (t === 'Bearer owner-token') return json({ id: 'o', email: 'gill@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' })
      if (t === 'Bearer member-token') return json({ id: 'm', email: 'someone@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' })
      return json({}, 401)
    }
    if (u === 'https://api.resend.com/emails/batch') {
      const body = JSON.parse(init.body); const how = script.shift() || 'ok'; batches.push({ body, headers: init.headers, how })
      if (how === 'ok') return json({ data: body.map((_, i) => ({ id: `em_${batches.length}_${i}` })) })
      if (how === 'quota') return json({ name: 'daily_quota_exceeded', message: 'You have reached your daily email sending quota.' }, 429)
      if (how === 'slow') return json({ name: 'rate_limit_exceeded', message: 'Too many requests.' }, 429)
      if (how === 'server') return json({ name: 'internal_server_error', message: 'Oops re_secret_key_zzzz' }, 500)
      if (how === 'refused') return json({ name: 'validation_error', message: 'Invalid `to` field re_secret_key_zzzz' }, 422)
      throw new Error('network down')
    }
    if (u === 'https://api.resend.com/emails') { singles.push(JSON.parse(init.body)); return json({ id: `single_${singles.length}` }) }
    const m = /^https:\/\/db\.test\/rest\/v1\/([a-z_]+)\?(.*)$/.exec(u) || /^https:\/\/db\.test\/rest\/v1\/([a-z_]+)$/.exec(u)
    if (m) {
      const table = tables[m[1]]; const q = new URL(u).searchParams; const prefer = (init.headers || {}).Prefer || ''
      if (method === 'GET') { let r = table.filter((x) => match(x, q)); const lim = Number(q.get('limit')); if (q.get('order') === 'id.asc') r = [...r].sort((a, b) => String(a.id).localeCompare(String(b.id))); if (q.get('order') === 'created_at.desc') r = [...r].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); if (lim) r = r.slice(0, lim); return json(m[1] === 'newsletter_sends' && String(q.get('select')).includes('newsletter_subscribers') ? r.map(withJoin) : r.map((x) => ({ ...x }))) }
      if (method === 'POST') {
        const rows = [].concat(JSON.parse(init.body)); const made = []
        for (const r of rows) {
          if (m[1] === 'newsletter_sends' && table.some((x) => x.issue_id === r.issue_id && x.subscriber_id === r.subscriber_id)) continue
          const row = m[1] === 'newsletter_issues' ? issue({ ...r }) : { id: randomUUID(), status: 'queued', error: null, claimed_at: null, sent_at: null, ...r }
          table.push(row); made.push({ ...row })
        }
        return json(prefer.includes('representation') ? made : null, 201)
      }
      if (method === 'PATCH') { const hit = table.filter((x) => match(x, q)); const patch = JSON.parse(init.body); hit.forEach((x) => Object.assign(x, patch)); return json(prefer.includes('representation') ? hit.map((x) => ({ ...x })) : null, prefer.includes('representation') ? 200 : 204) }
      if (method === 'DELETE') {
        const hit = table.filter((x) => match(x, q)); hit.forEach((x) => { table.splice(table.indexOf(x), 1); if (m[1] === 'newsletter_subscribers') for (let i = Q.length - 1; i >= 0; i -= 1) if (Q[i].subscriber_id === x.id) Q.splice(i, 1); if (m[1] === 'newsletter_issues') for (let i = Q.length - 1; i >= 0; i -= 1) if (Q[i].issue_id === x.id) Q.splice(i, 1) })
        return json(prefer.includes('representation') ? hit.map((x) => ({ ...x })) : null, prefer.includes('representation') ? 200 : 204)
      }
    }
    throw new Error(`unexpected request: ${method} ${u}`)
  })
  vi.stubGlobal('fetch', fn)
  return { S, I, Q, batches, singles, calls, fn }
}
const call = async (req) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'GET', query: { admin: 'newsletter' }, headers: { authorization: 'Bearer owner-token' }, ...req }, res)
  return out
}
const act = (body, over = {}) => call({ method: 'POST', body, ...over })
const db = (w) => w.calls.filter((c) => c.u.includes('/rest/v1/'))
const recipients = (w) => w.batches.filter((b) => b.how === 'ok').flatMap((b) => b.body.map((e) => e.to[0]))

beforeEach(() => {
  Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'srv-key-secret-value-0000', RESEND_API_KEY: 're_secret_key_zzzz', OWNER_EMAIL: 'gill@example.com', NEWSLETTER_OPEN: 'yes' })
  delete process.env.VITE_SUPABASE_URL; delete process.env.VITE_SUPABASE_ANON_KEY; delete process.env.SUPABASE_SECRET_KEY
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('who may use it', () => {
  it('turns away everyone but the owner, for looking and for every kind of change, and touches nothing', async () => {
    const w = world({ subscribers: [sub(1)], issues: [issue()] })
    for (const headers of [{}, { authorization: 'Bearer forged' }, { authorization: 'Bearer member-token' }]) {
      for (const body of [undefined, { action: 'save', subject: 's', body: 'b' }, { action: 'send', id: w.I[0].id }, { action: 'remove', id: w.S[0].id }, { action: 'delete', id: w.I[0].id }, { action: 'test', subject: 's', body: 'b' }]) {
        const out = await call({ method: body ? 'POST' : 'GET', body, headers }); expect([401, 403], JSON.stringify([headers, body])).toContain(out.status)
      }
    }
    expect(db(w)).toHaveLength(0); expect(w.batches).toHaveLength(0); expect(w.singles).toHaveLength(0)
  })
  it('only knows GET and POST, never lets an answer be kept, and says what is missing (without a key) when the server has no database key', async () => {
    let w = world(); const put = await call({ method: 'PUT' }); expect(put.status).toBe(405); expect(put.headers.Allow).toBe('GET, POST'); expect(put.headers['Cache-Control']).toBe('no-store')
    delete process.env.SUPABASE_SERVICE_ROLE_KEY; w = world(); const out = await call(); expect(out.status).toBe(503); expect(out.body.message).toMatch(/SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY/); expect(db(w)).toHaveLength(0)
  })
  it('refuses a request it cannot read, or one with no or an unknown action, before touching anything', async () => {
    const w = world({ issues: [issue()] })
    for (const body of ['not json', 'x'.repeat(5000), [1], null, '', {}, { action: 'wipe-everything' }, { action: 5 }]) expect((await act(body)).status, String(JSON.stringify(body)).slice(0, 30)).toBe(400)
    expect(db(w)).toHaveLength(0)
  })
})

describe('looking at the list', () => {
  it('gives every person and every newsletter, newest first, and whether the sign-up box is open', async () => {
    const w = world({ subscribers: [sub(1, { created_at: '2026-10-01T00:00:00Z' }), sub(2, { status: 'pending', created_at: '2026-10-03T00:00:00Z' })], issues: [issue({ subject: 'Old', created_at: '2026-10-01T00:00:00Z' }), issue({ subject: 'New', created_at: '2026-10-09T00:00:00Z' })] })
    const out = await call(); expect(out.body).toMatchObject({ ok: true, open: true }); expect(out.body.subscribers.map((s) => s.email)).toEqual(['person2@example.com', 'person1@example.com']); expect(out.body.issues.map((i) => i.subject)).toEqual(['New', 'Old'])
    expect(w.S).toHaveLength(2)
    delete process.env.NEWSLETTER_OPEN; world(); expect((await call()).body.open).toBe(false)
  })
  it('SECURITY: never sends a person\u2019s private code to the browser, only what the page shows', async () => {
    world({ subscribers: [sub(7)] }); const { body } = await call(); const text = JSON.stringify(body)
    expect(text).not.toContain(hex(7)); expect(Object.keys(body.subscribers[0]).sort()).toEqual(['confirmedAt', 'createdAt', 'email', 'id', 'source', 'status', 'unsubscribedAt'])
    for (const secret of ['srv-key-secret', 're_secret_key', 'owner-token']) expect(text).not.toContain(secret)
  })
  it('says plainly, without the database\u2019s words, when it cannot read', async () => {
    world(); vi.stubGlobal('fetch', vi.fn(async (u, i) => (String(u).includes('/rest/v1/') ? json({ message: 'boom srv-key-secret-value-0000' }, 500) : json({ id: 'o', email: 'gill@example.com', email_confirmed_at: 'x' })))); const out = await call()
    expect(out.status).toBe(502); expect(JSON.stringify(out.body)).not.toMatch(/srv-key|boom/)
  })
})

describe('drafts', () => {
  it('saves a new draft, tidied, and gives it back', async () => {
    const w = world(); const out = await act({ action: 'save', subject: '  Hello   there ', body: 'First.\r\n\r\nSecond.' })
    expect(out.status).toBe(201); expect(out.body.issue).toMatchObject({ subject: 'Hello there', body: 'First.\n\nSecond.', status: 'draft' }); expect(w.I).toHaveLength(1)
  })
  it('changes an existing draft, and says so plainly if that newsletter has already gone out', async () => {
    const d = issue(); const s = issue({ status: 'sent' }); const w = world({ issues: [d, s] })
    const out = await act({ action: 'save', id: d.id, subject: 'Changed', body: 'New words' }); expect(out.status).toBe(200); expect(w.I[0]).toMatchObject({ subject: 'Changed', body: 'New words' })
    const locked = await act({ action: 'save', id: s.id, subject: 'Sneaky', body: 'x' }); expect(locked.status).toBe(409); expect(w.I[1].subject).toBe('Autumn news')
  })
  it('refuses a draft with no subject or no words, or an id that is not an id, saying which, and writes nothing', async () => {
    const w = world(); for (const [b, field] of [[{ subject: '', body: 'x' }, 'subject'], [{ subject: 's', body: '  ' }, 'body']]) { const out = await act({ action: 'save', ...b }); expect(out.status).toBe(400); expect(out.body.field).toBe(field) }
    for (const id of ['x', "1' or '1'='1", '123']) expect((await act({ action: 'save', id, subject: 's', body: 'b' })).status, id).toBe(400)
    expect(w.I).toHaveLength(0)
  })
  it('deletes only a draft', async () => {
    const d = issue(); const s = issue({ status: 'sent' }); const w = world({ issues: [d, s] })
    expect((await act({ action: 'delete', id: d.id })).status).toBe(200); expect(w.I.map((i) => i.id)).toEqual([s.id]); expect((await act({ action: 'delete', id: s.id })).status).toBe(409); expect(w.I).toHaveLength(1)
    expect((await act({ action: 'delete', id: 'nope' })).status).toBe(400)
  })
  it('removes a person for good, with their send records, and refuses anything that is not an id', async () => {
    const a = sub(1); const b = sub(2); const i = issue(); const w = world({ subscribers: [a, b], issues: [i], sends: [{ id: randomUUID(), issue_id: i.id, subscriber_id: a.id, status: 'sent' }] })
    expect((await act({ action: 'remove', id: a.id })).status).toBe(200); expect(w.S.map((x) => x.id)).toEqual([b.id]); expect(w.Q).toHaveLength(0)
    for (const id of ['', 'x', "a' or '1'='1", `${b.id}&status=eq.pending`]) expect((await act({ action: 'remove', id })).status, id).toBe(400); expect(w.S).toHaveLength(1)
  })
})

describe('sending a test', () => {
  it('goes only to the owner\u2019s own address, marked [Test], with a link that does nothing, and to no subscriber', async () => {
    const w = world({ subscribers: [sub(1), sub(2)] }); const out = await act({ action: 'test', subject: 'Autumn news', body: 'Hello' })
    expect(out.body).toEqual({ ok: true, to: 'gill@example.com' }); expect(w.singles).toHaveLength(1); expect(w.singles[0].to).toEqual(['gill@example.com']); expect(w.singles[0].subject).toBe('[Test] Autumn news')
    expect(w.singles[0].html).toContain('href="https://starscapesfactory.com/newsletter/unsubscribe"'); expect(w.singles[0].html).not.toMatch(/\?t=/); expect(w.batches).toHaveLength(0)
  })
  it('refuses a draft that is not right, and says plainly if the test could not be sent', async () => {
    let w = world(); expect((await act({ action: 'test', subject: '', body: 'x' })).status).toBe(400); expect(w.singles).toHaveLength(0)
    delete process.env.RESEND_API_KEY; w = world(); const out = await act({ action: 'test', subject: 's', body: 'b' }); expect(out.status).toBe(502); expect(out.body.message).toMatch(/RESEND_API_KEY is not set/)
  })
})

describe('sending for real', () => {
  const people = (n, over) => Array.from({ length: n }, (_, i) => sub(i + 1, over))
  it('sends only to people who are confirmed, with the way to leave in every email, and nothing to anyone else', async () => {
    const c = people(3); const pending = sub(50, { status: 'pending' }); const gone = sub(51, { status: 'unsubscribed' }); const i = issue()
    const w = world({ subscribers: [...c, pending, gone], issues: [i] }); const out = await act({ action: 'send', id: i.id })
    expect(out.body).toMatchObject({ ok: true, done: true, total: 3, sent: 3, failed: 0, remaining: 0 }); expect(recipients(w).sort()).toEqual(c.map((p) => p.email).sort()); expect(recipients(w)).not.toContain(pending.email); expect(recipients(w)).not.toContain(gone.email)
    expect(w.I[0]).toMatchObject({ status: 'sent', total: 3, sent: 3, failed: 0 }); expect(w.I[0].sent_at).toBeTruthy()
  })
  it('gives each person their OWN private unsubscribe link, in the email and in the one-click header, and names who is sending it', async () => {
    const c = people(2); const i = issue(); const w = world({ subscribers: c, issues: [i] }); await act({ action: 'send', id: i.id })
    for (const p of c) {
      const e = w.batches[0].body.find((x) => x.to[0] === p.email)
      expect(e.html).toContain(`https://starscapesfactory.com/newsletter/unsubscribe?t=${p.token}`); expect(e.text).toContain(`t=${p.token}`); expect(e.headers['List-Unsubscribe']).toBe(`<https://starscapesfactory.com/api/ebook-signup?newsletter=unsubscribe&t=${p.token}>`); expect(e.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
      expect(e.html).toContain(companyLine(COMPANY).split('.')[0]); expect(e.from).toContain('imagine@starscapesfactory.com'); expect(e.reply_to).toBe('imagine@starscapesfactory.com'); expect(e.subject).toBe('Autumn news')
      for (const other of c.filter((o) => o !== p)) { expect(e.html).not.toContain(other.token); expect(e.html).not.toContain(other.email) } // nobody sees anyone else
    }
  })
  it('sends to Resend\u2019s batch address with the key only in the header, one person to each email', async () => {
    const i = issue(); const w = world({ subscribers: people(2), issues: [i] }); await act({ action: 'send', id: i.id })
    expect(w.calls.find((c) => c.u === 'https://api.resend.com/emails/batch')).toBeTruthy(); expect(w.batches[0].headers.Authorization).toBe('Bearer re_secret_key_zzzz'); expect(w.batches[0].body.every((e) => e.to.length === 1)).toBe(true)
    expect(JSON.stringify(w.batches[0].body)).not.toContain('re_secret_key')
  })
  it('refuses to send when nobody has confirmed, and leaves the newsletter a draft', async () => {
    const i = issue(); const w = world({ subscribers: [sub(1, { status: 'pending' })], issues: [i] }); const out = await act({ action: 'send', id: i.id })
    expect(out.status).toBe(400); expect(out.body.message).toMatch(/Nobody has confirmed/); expect(w.I[0].status).toBe('draft'); expect(w.Q).toHaveLength(0); expect(w.batches).toHaveLength(0)
  })
  it('sends fifty at a time, carries on each time it is pressed, and everyone gets it exactly once', async () => {
    const c = people(120); const i = issue(); const w = world({ subscribers: c, issues: [i] })
    const first = await act({ action: 'send', id: i.id }); expect(first.body).toMatchObject({ done: false, total: 120, sent: 50, remaining: 70 }); expect(w.I[0].status).toBe('sending')
    const second = await act({ action: 'send', id: i.id }); expect(second.body).toMatchObject({ done: false, sent: 100, remaining: 20 })
    const third = await act({ action: 'send', id: i.id }); expect(third.body).toMatchObject({ done: true, sent: 120, remaining: 0 })
    expect(w.batches.map((b) => b.body.length)).toEqual([50, 50, 20]); expect(BATCH_SIZE).toBe(50)
    const got = recipients(w); expect(got).toHaveLength(120); expect(new Set(got).size).toBe(120); expect(w.I[0]).toMatchObject({ status: 'sent', sent: 120, failed: 0 })
  })
  it('does not send a newsletter that has already gone out', async () => {
    const i = issue(); const w = world({ subscribers: people(2), issues: [i] }); await act({ action: 'send', id: i.id })
    const again = await act({ action: 'send', id: i.id }); expect(again.status).toBe(409); expect(w.batches).toHaveLength(1); expect(recipients(w)).toHaveLength(2)
  })
  it('skips, and never emails, someone who unsubscribed after the list was made', async () => {
    const c = people(60); const i = issue(); const w = world({ subscribers: c, issues: [i] })
    await act({ action: 'send', id: i.id }); const leaver = w.S.find((s) => !recipients(w).includes(s.email)); leaver.status = 'unsubscribed'
    const out = await act({ action: 'send', id: i.id }); expect(out.body).toMatchObject({ done: true, sent: 50 + 9, skipped: 1 }); expect(recipients(w)).not.toContain(leaver.email); expect(recipients(w)).toHaveLength(59)
  })
  it('does not email anyone twice when Send is pressed twice at the same moment', async () => {
    const c = people(30); const i = issue(); const w = world({ subscribers: c, issues: [i] })
    await Promise.all([act({ action: 'send', id: i.id }), act({ action: 'send', id: i.id })])
    const got = recipients(w); expect(new Set(got).size).toBe(got.length); expect(got.length).toBeLessThanOrEqual(30)
    await act({ action: 'send', id: i.id }); const all = recipients(w); expect(new Set(all).size).toBe(all.length); expect(all).toHaveLength(30)
  })
  it('stops cleanly when Resend\u2019s daily limit is reached, loses nobody, and carries on when pressed again', async () => {
    const c = people(120); const i = issue(); const w = world({ subscribers: c, issues: [i], resend: ['ok', 'quota'] })
    await act({ action: 'send', id: i.id }); const stop = await act({ action: 'send', id: i.id })
    expect(stop.body).toMatchObject({ ok: true, done: false, stopped: 'quota', sent: 50, remaining: 70 }); expect(stop.body.message).toMatch(/100 emails a day.*Nothing was lost/); expect(w.Q.filter((r) => r.status === 'queued')).toHaveLength(70); expect(w.Q.filter((r) => r.status === 'sending')).toHaveLength(0)
    for (let n = 0; n < 3; n += 1) await act({ action: 'send', id: i.id })
    const got = recipients(w); expect(got).toHaveLength(120); expect(new Set(got).size).toBe(120); expect(w.I[0].status).toBe('sent')
  })
  it('says the right thing, and loses nobody, for each other way Resend can stop', async () => {
    const cases = [['slow', 'slow', /slow down/], ['server', 'server', /had a problem/], ['down', 'unreachable', /could not be reached/]]
    for (const [how, reason, words] of cases) {
      const i = issue(); const w = world({ subscribers: people(3), issues: [i], resend: [how] }); const out = await act({ action: 'send', id: i.id })
      expect(out.body.stopped, how).toBe(reason); expect(out.body.message, how).toMatch(words); expect(JSON.stringify(out.body)).not.toContain('re_secret'); expect(w.Q.every((r) => r.status === 'queued'), how).toBe(true)
      await act({ action: 'send', id: i.id }); expect(recipients(w), how).toHaveLength(3)
    }
    delete process.env.RESEND_API_KEY; const i = issue(); const w = world({ subscribers: people(2), issues: [i] }); const out = await act({ action: 'send', id: i.id })
    expect(out.body).toMatchObject({ stopped: 'no_key' }); expect(out.body.message).toMatch(/RESEND_API_KEY is not set/); expect(w.Q.every((r) => r.status === 'queued')).toBe(true)
  })
  it('marks a batch Resend refuses as failed (with Resend\u2019s words kept short and the key removed), carries on with the rest, and sends them again when asked', async () => {
    const i = issue(); const w = world({ subscribers: people(120), issues: [i], resend: ['refused'] })
    const first = await act({ action: 'send', id: i.id }); expect(first.body).toMatchObject({ done: false, sent: 0, failed: 50, remaining: 70 }); expect(w.Q.filter((r) => r.status === 'failed')[0].error).not.toContain('re_secret'); expect(JSON.stringify(first.body)).not.toContain('re_secret')
    await act({ action: 'send', id: i.id }); const last = await act({ action: 'send', id: i.id }); expect(last.body).toMatchObject({ done: true, sent: 70, failed: 50 }); expect(w.I[0]).toMatchObject({ status: 'sent', failed: 50 })
    expect((await act({ action: 'retry', id: i.id })).status).toBe(200); expect(w.I[0].status).toBe('sending'); expect(w.Q.filter((r) => r.status === 'failed')).toHaveLength(0)
    const redo = await act({ action: 'send', id: i.id }); expect(redo.body).toMatchObject({ done: true, sent: 120, failed: 0 }); expect(new Set(recipients(w)).size).toBe(120)
  })
  it('uses a Resend idempotency key made from the newsletter and exactly who is in the batch, so a retry of the same batch can never send it twice', async () => {
    const i = issue(); const w = world({ subscribers: people(3), issues: [i], resend: ['server', 'ok'] })
    await act({ action: 'send', id: i.id }); await act({ action: 'send', id: i.id })
    const [a, b] = w.batches.map((x) => x.headers['Idempotency-Key']); expect(a).toBe(b); expect(a).toContain(i.id); expect(a).toMatch(/^newsletter-[0-9a-f-]{36}-[0-9a-f]{40}$/)
    const j = issue(); const w2 = world({ subscribers: people(3), issues: [j] }); await act({ action: 'send', id: j.id }); expect(w2.batches[0].headers['Idempotency-Key']).not.toBe(a)
  })
  it('puts a batch that was claimed and never finished (the server was cut off) back in the queue after two minutes, but leaves a fresh one alone', async () => {
    const c = people(3); const i = issue({ status: 'sending', total: 3 })
    const old = new Date(Date.now() - 10 * 60000).toISOString(); const fresh = new Date(Date.now() - 20000).toISOString()
    const w = world({ subscribers: c, issues: [i], sends: [{ id: '00000000-0000-4000-8000-000000000001', issue_id: i.id, subscriber_id: c[0].id, status: 'sending', claimed_at: old }, { id: '00000000-0000-4000-8000-000000000002', issue_id: i.id, subscriber_id: c[1].id, status: 'sending', claimed_at: fresh }, { id: '00000000-0000-4000-8000-000000000003', issue_id: i.id, subscriber_id: c[2].id, status: 'queued' }] })
    const out = await act({ action: 'send', id: i.id }); expect(recipients(w).sort()).toEqual([c[0].email, c[2].email].sort()); expect(out.body.remaining).toBe(1) // the fresh one is someone else's, still in progress
  })
  it('says the newsletter was not found, or that the id is wrong, and sends nothing', async () => {
    const w = world({ subscribers: people(2) }); expect((await act({ action: 'send', id: randomUUID() })).status).toBe(404); for (const id of ['', 'x', "1' or '1'='1"]) expect((await act({ action: 'send', id })).status, id).toBe(400); expect(w.batches).toHaveLength(0)
  })
  it('never lets a key or the database\u2019s words reach the browser while sending', async () => {
    const i = issue(); world({ subscribers: people(2), issues: [i] }); const ok = await act({ action: 'send', id: i.id })
    for (const secret of ['srv-key-secret', 're_secret_key', 'owner-token']) expect(JSON.stringify(ok.body)).not.toContain(secret)
  })
})

describe('the Resend call on its own', () => {
  it('never throws: it says what happened, and sends nothing without a key', async () => {
    expect(await resendBatch([], 'k', { env: {} })).toEqual({ ok: false, reason: 'no_key' })
    const echoed = await resendBatch([{}], 'k', { env: { RESEND_API_KEY: 're_my_key_1' }, fetchImpl: async () => json({ message: 'bad key re_my_key_1 here' }, 422) }); expect(echoed.detail).not.toContain('re_my_key_1')
    expect(await resendBatch([{}], 'k', { env: { RESEND_API_KEY: 'x' }, fetchImpl: async () => { throw new Error('down') } })).toEqual({ ok: false, reason: 'unreachable' })
    const r = await resendBatch([{}], 'k', { env: { RESEND_API_KEY: 'x' }, fetchImpl: async () => json({ name: 'validation_error', message: `bad ${'z'.repeat(40)}` }, 422) }); expect(r).toMatchObject({ ok: false, reason: 'refused', status: 422 }); expect(r.detail).not.toContain('z'.repeat(40))
  })
})

describe('how it is wired in', () => {
  const src = (p) => readFileSync(join(process.cwd(), p), 'utf8')
  it('is handed over only after the owner check, and there is still no 13th function', () => {
    const code = src('lib/membershipAdmin.js')
    expect(code).toContain("import { handleNewsletterAdmin } from './newsletterAdmin.js'"); expect(code.indexOf('requireOwner(req)')).toBeLessThan(code.indexOf('handleNewsletterAdmin(req, res, who)'))
    expect(readdirSync(join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))).toHaveLength(12)
  })
  it('uses the same rules as the pages, so the two cannot disagree', () => {
    expect(src('lib/newsletterAdmin.js')).toContain("from '../src/newsletter/newsletterRules.js'"); expect(src('src/admin/AdminNewsletter.jsx')).toContain("from '../newsletter/newsletterRules'")
  })
})
