// @vitest-environment node
// The daily tidy-up (lib/newsletter.js, reached through api/ebook-signup.js?newsletter=tidy, run by Vercel's scheduler): it deletes people who signed up for the newsletter but never
// confirmed, 30 days after their last sign-up email, and nobody else. It needs CRON_SECRET, like the renewal reminders.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/ebook-signup.js'
import { UNCONFIRMED_DAYS } from '../src/newsletter/newsletterRules.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const DAY = 86400000
const ago = (days) => new Date(Date.now() - days * DAY).toISOString()
const person = (id, status, sentDaysAgo, over = {}) => ({ id, email: `${id}@example.com`, status, token: id.padEnd(48, 'a'), created_at: ago(sentDaysAgo), confirmation_sent_at: sentDaysAgo === null ? null : ago(sentDaysAgo), ...over })

function world(rows, { dbFails = false } = {}) {
  const db = rows.map((r) => ({ ...r })); const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url); const method = init.method || 'GET'; calls.push({ u, method })
    if (u.startsWith('https://db.test/rest/v1/newsletter_subscribers') && method === 'DELETE') {
      if (dbFails) return json({ message: 'boom srv-key-secret-value-0000' }, 500)
      const q = new URL(u).searchParams; const gone = []
      for (const r of [...db]) {
        if (r.status !== (q.get('status') || '').replace('eq.', '')) continue
        const sent = q.get('confirmation_sent_at'); const made = q.get('created_at')
        const ok = sent && sent.startsWith('lt.') ? (r.confirmation_sent_at && r.confirmation_sent_at < sent.slice(3)) : sent === 'is.null' ? (r.confirmation_sent_at === null && made && r.created_at < made.slice(3)) : false
        if (ok) { db.splice(db.indexOf(r), 1); gone.push({ ...r }) }
      }
      return json(gone)
    }
    throw new Error(`unexpected request: ${method} ${u}`)
  })
  vi.stubGlobal('fetch', fn)
  return { db, calls }
}
const call = async (req) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'GET', query: { newsletter: 'tidy' }, headers: { authorization: 'Bearer cron-secret-value' }, ...req }, res)
  return out
}
beforeEach(() => { Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'srv-key-secret-value-0000', CRON_SECRET: 'cron-secret-value' }); delete process.env.NEWSLETTER_OPEN; delete process.env.VITE_SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('who may run it', () => {
  it('refuses everyone without the secret, and deletes and asks for nothing', async () => {
    const w = world([person('old', 'pending', 90)])
    for (const headers of [{}, { authorization: '' }, { authorization: 'Bearer wrong' }, { authorization: 'cron-secret-value' }, { authorization: 'bearer cron-secret-value' }, { authorization: 'Bearer cron-secret-valuex' }]) { const out = await call({ headers }); expect([401], JSON.stringify(headers)).toContain(out.status); expect(out.body.ok).toBe(false) }
    expect(w.calls).toHaveLength(0); expect(w.db).toHaveLength(1)
  })
  it('refuses to run at all, saying why, when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET; const w = world([person('old', 'pending', 90)]); const out = await call({ headers: {} })
    expect(out.status).toBe(503); expect(out.body.message).toMatch(/CRON_SECRET is not set/); expect(w.calls).toHaveLength(0)
  })
  it('works when asked by the scheduler (a GET) or by hand (a POST), and refuses any other kind of request, before anything else', async () => {
    world([]); expect((await call({ method: 'GET' })).status).toBe(200); expect((await call({ method: 'POST' })).status).toBe(200)
    for (const method of ['PUT', 'DELETE', 'PATCH']) { const out = await call({ method, headers: {} }); expect(out.status, method).toBe(405); expect(out.headers.Allow).toBe('GET, POST') }
  })
  it('never lets an answer be kept', async () => { world([]); expect((await call()).headers['Cache-Control']).toBe('no-store') })
})

describe('who it deletes', () => {
  it('deletes only people who are still pending and whose last sign-up email was over 30 days ago, and says how many', async () => {
    const w = world([person('old', 'pending', 31), person('older', 'pending', 200), person('young', 'pending', 29), person('today', 'pending', 0)])
    const out = await call(); expect(out.body).toEqual({ ok: true, removed: 2 }); expect(w.db.map((r) => r.id).sort()).toEqual(['today', 'young'])
  })
  it('counts from the last sign-up email, not from the first: someone who left and signed up again today is never swept away because their record is old', async () => {
    const w = world([person('again', 'pending', 0, { created_at: ago(400) })]); const out = await call(); expect(out.body.removed).toBe(0); expect(w.db).toHaveLength(1)
  })
  it('NEVER touches anyone who confirmed, or anyone who unsubscribed (they stay, so they are never emailed again), however old', async () => {
    const w = world([person('c', 'confirmed', 500), person('u', 'unsubscribed', 500), person('p', 'pending', 500)])
    const out = await call(); expect(out.body.removed).toBe(1); expect(w.db.map((r) => r.id).sort()).toEqual(['c', 'u'])
    expect(w.calls.every((c) => /status=eq\.pending/.test(c.u))).toBe(true) // every delete is aimed at pending people only
  })
  it('has a safety net for a pending record that somehow has no sign-up email time: it goes by when the record was made', async () => {
    const w = world([person('nodate-old', 'pending', null, { created_at: ago(60) }), person('nodate-new', 'pending', null, { created_at: ago(3) })])
    const out = await call(); expect(out.body.removed).toBe(1); expect(w.db.map((r) => r.id)).toEqual(['nodate-new'])
  })
  it('uses the number of days the Privacy policy names: just inside it is kept, just outside it goes', async () => {
    expect(UNCONFIRMED_DAYS).toBe(30)
    const w = world([person('in', 'pending', UNCONFIRMED_DAYS - 0.1), person('out', 'pending', UNCONFIRMED_DAYS + 0.1)]); await call(); expect(w.db.map((r) => r.id)).toEqual(['in'])
  })
  it('is safe to run again: the second time there is nothing left to remove', async () => {
    world([person('old', 'pending', 90)]); expect((await call()).body.removed).toBe(1); expect((await call()).body.removed).toBe(0)
  })
  it('runs even while the sign-up is closed (people who signed up earlier must still be tidied away)', async () => {
    delete process.env.NEWSLETTER_OPEN; world([person('old', 'pending', 90)]); expect((await call()).body.removed).toBe(1)
  })
})

describe('when something is wrong', () => {
  it('says plainly, with none of the database\u2019s words or keys, when it cannot run, and says nothing was removed', async () => {
    world([person('old', 'pending', 90)], { dbFails: true }); const out = await call()
    expect(out.status).toBe(502); expect(JSON.stringify(out.body)).not.toMatch(/srv-key|boom/); expect(out.body.ok).toBe(false)
  })
  it('says what is missing, without any key, when the server has no database key', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY; const w = world([person('old', 'pending', 90)]); const out = await call(); expect(out.status).toBe(503); expect(w.calls).toHaveLength(0)
  })
})

describe('how it is scheduled and wired in', () => {
  it('is on Vercel\u2019s daily schedule beside the renewal reminders, at a different time, and there is still no 13th function', () => {
    const crons = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')).crons
    expect(crons.map((c) => c.path)).toEqual(['/api/membership-checkout?reminders=1', '/api/ebook-signup?newsletter=tidy']); expect(new Set(crons.map((c) => c.schedule)).size).toBe(2)
    expect(readdirSync(join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))).toHaveLength(12)
  })
})
