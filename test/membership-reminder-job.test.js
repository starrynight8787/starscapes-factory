// @vitest-environment node
// The daily reminder job (lib/membershipReminders.js), against a pretend database, Stripe and Resend: who it emails, that nobody gets two, what it refuses, and what it never reveals.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({ approved: false }))
vi.mock('../lib/reminderEmailText.js', async (original) => {
  const m = await original()
  return { ...m, get WORDING_APPROVED() { return h.approved } }
})
import handler from '../api/membership-checkout.js'
import { runReminders, handleReminders, authorised, isReminderRequest, MAX_PER_RUN } from '../lib/membershipReminders.js'

const DAY = 86400000
const NOW = new Date('2026-11-01T12:00:00Z')
const inDays = (d) => new Date(NOW.getTime() + d * DAY).toISOString().replace('Z', '+00:00')
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const member = (id, over = {}) => ({ user_id: id, status: 'active', passes: ['blueprints'], billing_interval: 'year', current_period_end: inDays(10), offer_note: null, stripe_subscription_id: `sub_${id}`, ...over })
const OWNER_ID = 'owner-0000-0000'
const emailOf = (id) => (id === OWNER_ID ? 'gill@example.com' : `${id}@example.com`)

function network({ members = [], notices = [], next = 5000, last = 5000, stripeFailsFor = '', insertDuplicate = false, retryRows = [], resendFails = false } = {}) {
  const calls = []
  const fn = vi.fn(async (url, init = {}) => {
    const u = String(url); calls.push({ url: u, init })
    if (u.includes('/rest/v1/memberships?')) return json(members)
    if (u.includes('/rest/v1/membership_notices?user_id=in.')) return json(notices)
    if (u.includes('/rest/v1/membership_notices?on_conflict')) return insertDuplicate ? json([]) : json([{ id: 'n1' }], 201)
    if (u.includes('/rest/v1/membership_notices?') && init.method === 'PATCH') return JSON.parse(init.body).status === 'sending' ? json(retryRows) : json(null, 204)
    if (u.includes('/auth/v1/admin/users/')) return json({ email: emailOf(decodeURIComponent(u.split('/auth/v1/admin/users/')[1])) })
    if (u.startsWith('https://api.stripe.com/v1/invoices/upcoming')) return u.includes(stripeFailsFor) && stripeFailsFor ? json({ error: { message: 'no' } }, 404) : json({ total: next })
    if (u.startsWith('https://api.stripe.com/v1/invoices?')) return json({ data: [{ total: last }] })
    if (u === 'https://api.resend.com/emails') return resendFails ? json({ message: 'no' }, 500) : json({ id: 'em_1' })
    throw new Error(`unexpected request: ${u}`)
  })
  fn.calls = calls
  return fn
}
const withNetwork = (o) => { const fn = network(o); vi.stubGlobal('fetch', fn); return fn }
const sentMail = (fn) => fn.calls.filter((c) => c.url === 'https://api.resend.com/emails')
const writes = (fn) => fn.calls.filter((c) => c.url.includes('/rest/v1/membership_notices') && ['POST', 'PATCH'].includes(c.init.method))
const run = (opts = {}) => runReminders({ now: NOW, ...opts })

beforeEach(() => {
  Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'srv', STRIPE_SECRET_KEY: 'sk_test_abc', OWNER_EMAIL: 'gill@example.com', RESEND_API_KEY: 're_test', CRON_SECRET: 'cron-secret-123' })
  h.approved = false
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('while the wording is not approved', () => {
  it('sends a reminder only to the owner: a real member is held back, claimed nowhere, and emailed nothing', async () => {
    const fn = withNetwork({ members: [member('u1'), member(OWNER_ID)] })
    const r = await run()
    expect(r).toMatchObject({ checked: 2, due: 2, sent: 1, heldBack: 1, failed: 0 })
    expect(sentMail(fn)).toHaveLength(1); expect(JSON.parse(sentMail(fn)[0].init.body).to).toEqual(['gill@example.com'])
    expect(writes(fn).filter((c) => c.init.method === 'POST')).toHaveLength(1); expect(JSON.parse(writes(fn)[0].init.body).user_id).toBe(OWNER_ID)
  })
  it('puts the draft banner in the owner\u2019s email', async () => {
    const fn = withNetwork({ members: [member(OWNER_ID)] }); await run()
    expect(JSON.parse(sentMail(fn)[0].init.body).text).toMatch(/^DRAFT WORDING/)
  })
})

describe('once the wording is approved', () => {
  beforeEach(() => { h.approved = true })
  it('sends a real member their reminder with the amount Stripe says, no banner, and one note written down first', async () => {
    const fn = withNetwork({ members: [member('u1')], next: 5000, last: 5000 })
    const r = await run(); expect(r).toMatchObject({ checked: 1, due: 1, sent: 1, heldBack: 0 })
    const body = JSON.parse(sentMail(fn)[0].init.body)
    expect(body.to).toEqual(['u1@example.com']); expect(body.subject).toBe('Your Starscapes Factory passes renew on 11 November 2026'); expect(body.text).toContain('we will take £50'); expect(body.text).not.toMatch(/DRAFT/)
    const order = fn.calls.map((c) => (c.url.includes('on_conflict') ? 'claim' : c.url === 'https://api.resend.com/emails' ? 'send' : c.init.method === 'PATCH' && JSON.parse(c.init.body || '{}').status === 'sent' ? 'done' : ''))
    expect(order.filter(Boolean)).toEqual(['claim', 'send', 'done'])
  })
  it('says the price is changing when Stripe says the next payment is more than the last', async () => {
    const fn = withNetwork({ members: [member('u1')], next: 10000, last: 5000 }); await run()
    const body = JSON.parse(sentMail(fn)[0].init.body); expect(body.subject).toBe('The price of your Starscapes Factory passes changes on 11 November 2026'); expect(body.text).toContain('Until now you have paid £50. From 11 November 2026 you will pay £100 a year')
    expect(JSON.parse(writes(fn)[0].init.body)).toMatchObject({ kind: 'price-change', amount_pence: 10000, previous_pence: 5000, status: 'sending' })
  })
  it('gives Resend a key that is the same each time for the same member and date, so a repeat can never send twice', async () => {
    const fn = withNetwork({ members: [member('u1')] }); await run()
    expect(sentMail(fn)[0].init.headers['Idempotency-Key']).toBe(`reminder-u1-${Date.parse(inDays(10))}`)
  })
  it('writes "sent" with the time once it has gone', async () => {
    const fn = withNetwork({ members: [member('u1')] }); await run()
    const done = writes(fn).find((c) => c.init.method === 'PATCH'); expect(JSON.parse(done.init.body)).toMatchObject({ status: 'sent', note: null }); expect(JSON.parse(done.init.body).sent_at).toMatch(/^2\d{3}-/)
  })
  it('does not send twice for the same date: a note already written means skipped, with no Stripe question, no claim and no email', async () => {
    const fn = withNetwork({ members: [member('u1')], notices: [{ user_id: 'u1', kind: 'renewal', period_end: inDays(10), status: 'sent', sent_at: inDays(-1) }] })
    const r = await run(); expect(r).toMatchObject({ sent: 0, skipped: 1 }); expect(sentMail(fn)).toHaveLength(0); expect(writes(fn)).toHaveLength(0)
  })
  it('skips a date another run has just claimed (the claim finds it taken and nothing is retried)', async () => {
    const fn = withNetwork({ members: [member('u1')], insertDuplicate: true, retryRows: [] }); const r = await run()
    expect(r).toMatchObject({ sent: 0, skipped: 1 }); expect(sentMail(fn)).toHaveLength(0)
  })
  it('tries a failed one again: the claim takes it back, and the email goes', async () => {
    const fn = withNetwork({ members: [member('u1')], insertDuplicate: true, retryRows: [{ id: 'n1' }] }); const r = await run()
    expect(r).toMatchObject({ sent: 1 }); expect(sentMail(fn)).toHaveLength(1)
    const retry = fn.calls.find((c) => c.init.method === 'PATCH' && JSON.parse(c.init.body).status === 'sending'); expect(retry.url).toContain('or=(status.eq.failed,and(status.eq.sending,created_at.lt.')
  })
  it('writes "failed" with a short reason, counts it, and does not say it was sent, if the email cannot go', async () => {
    const fn = withNetwork({ members: [member('u1')], resendFails: true }); const r = await run()
    expect(r).toMatchObject({ sent: 0, failed: 1 }); const done = writes(fn).find((c) => c.init.method === 'PATCH'); expect(JSON.parse(done.init.body)).toMatchObject({ status: 'failed' }); expect(JSON.parse(done.init.body).note.length).toBeGreaterThan(0)
  })
  it('keeps going if Stripe cannot answer for one member: that one is counted as an error, the next is still sent', async () => {
    const fn = withNetwork({ members: [member('u1'), member('u2')], stripeFailsFor: 'sub_u1' }); const r = await run()
    expect(r).toMatchObject({ checked: 2, errors: 1, sent: 1 }); expect(JSON.parse(sentMail(fn)[0].init.body).to).toEqual(['u2@example.com'])
  })
  it('says nothing to a member who is not in the window or who Stripe cannot price, and never guesses an amount', async () => {
    const fn = withNetwork({ members: [member('far', { current_period_end: inDays(30) }), member('cancelled', { cancel_at_period_end: true }), member('nosub', { stripe_subscription_id: null })] })
    expect(await run()).toMatchObject({ checked: 0, sent: 0 }); expect(sentMail(fn)).toHaveLength(0)
    const fn2 = withNetwork({ members: [member('u1')], next: 0 }); expect(await run()).toMatchObject({ checked: 1, due: 0, skipped: 1, sent: 0 }); expect(sentMail(fn2)).toHaveLength(0)
  })
  it('stops when it runs out of time and says so, so the rest are done tomorrow, not lost', async () => {
    withNetwork({ members: [member('u1'), member('u2')] })
    const real = Date.now.bind(Date); let n = 0; vi.spyOn(Date, 'now').mockImplementation(() => real() + (n++ > 0 ? 60000 : 0))
    const r = await run(); expect(r.stoppedEarly).toBe(true); expect(r.sent).toBeLessThan(2)
  })
})

describe('a dry run', () => {
  it('says who WOULD get what and changes nothing: no note written, no email sent', async () => {
    h.approved = true; const fn = withNetwork({ members: [member('u1', {}), member('u2')], next: 10000, last: 5000 })
    const r = await run({ dry: true })
    expect(r).toMatchObject({ dry: true, due: 2, sent: 0 }); expect(r.items).toEqual([{ user: 'u1', kind: 'price-change', days: 10, amount: 10000, previous: 5000 }, { user: 'u2', kind: 'price-change', days: 10, amount: 10000, previous: 5000 }])
    expect(sentMail(fn)).toHaveLength(0); expect(writes(fn)).toHaveLength(0)
  })
  it('never contains an email address, in the answer or the id it shows (only the first 8 letters)', async () => {
    h.approved = true; withNetwork({ members: [member('abcdefgh-1234-5678')] }); const r = await run({ dry: true })
    expect(JSON.stringify(r)).not.toMatch(/@/); expect(r.items[0].user).toBe('abcdefgh')
  })
})

describe('what it asks the database', () => {
  it('asks only for open, uncancelled memberships with a subscription whose payment falls in the next 14 days, soonest first, at most 100 at a time', async () => {
    const fn = withNetwork({ members: [] }); await run()
    const q = decodeURIComponent(fn.calls[0].url); expect(q).toContain('status=in.(active,trialing)'); expect(q).toContain('cancel_at_period_end=eq.false'); expect(q).toContain('stripe_subscription_id=not.is.null')
    expect(q).toContain(`current_period_end=gt.${NOW.toISOString()}`); expect(q).toContain(`current_period_end=lt.${new Date(NOW.getTime() + 14 * DAY).toISOString()}`); expect(q).toContain('order=current_period_end.asc'); expect(q).toContain(`limit=${MAX_PER_RUN}`)
    expect(MAX_PER_RUN).toBe(100)
  })
  it('encodes the + in a time so it is not read as a space', async () => {
    h.approved = true; const fn = withNetwork({ members: [member('u1')], insertDuplicate: true, retryRows: [] }); await run()
    const patch = fn.calls.find((c) => c.init.method === 'PATCH'); expect(patch.url).toContain('period_end=eq.2026-11-11T12%3A00%3A00.000%2B00%3A00')
  })
  it('refuses to run without a usable Stripe key', async () => {
    delete process.env.STRIPE_SECRET_KEY; withNetwork({ members: [] }); await expect(run()).rejects.toThrow(/Stripe key/)
    process.env.STRIPE_SECRET_KEY = 'not-a-key'; await expect(run()).rejects.toThrow(/Stripe key/)
  })
})

describe('who may run it', () => {
  const res = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v }, status(n) { this.code = n; return this }, json(b) { this.body = b; return this } })
  const ask = async (headers = {}, query = { reminders: '1' }) => { const r = res(); await handleReminders({ method: 'GET', headers, query }, r); return r }
  it('refuses to run at all if CRON_SECRET is not set, and says why', async () => {
    delete process.env.CRON_SECRET; const r = await ask({ authorization: 'Bearer anything' }); expect(r.code).toBe(503); expect(r.body.message).toMatch(/CRON_SECRET is not set/)
  })
  it('refuses a missing or wrong secret (401), including the right words with something extra, and shows nothing', async () => {
    withNetwork({ members: [member('u1')] })
    for (const h2 of [{}, { authorization: 'Bearer wrong' }, { authorization: 'cron-secret-123' }, { authorization: 'Bearer cron-secret-123 ' + 'x' }, { authorization: 'Bearer ' }]) { const r = await ask(h2); expect(r.code, JSON.stringify(h2)).toBe(401); expect(r.body).toEqual({ ok: false, message: 'Not allowed.' }) }
  })
  it('does not take the secret from the address (so it cannot end up in a log)', async () => {
    const r = await ask({}, { reminders: '1', secret: 'cron-secret-123', cron_secret: 'cron-secret-123' }); expect(r.code).toBe(401)
  })
  it('runs for the right secret and answers with counts only', async () => {
    withNetwork({ members: [] }); const r = await ask({ authorization: 'Bearer cron-secret-123' })
    expect(r.code).toBe(200); expect(r.body).toMatchObject({ ok: true, dry: false, checked: 0, sent: 0 }); expect(r.headers['Cache-Control']).toBe('no-store')
  })
  it('says it could not run, in plain words and without the reason, if something is wrong underneath', async () => {
    delete process.env.STRIPE_SECRET_KEY; withNetwork({ members: [] }); const r = await ask({ authorization: 'Bearer cron-secret-123' })
    expect(r.code).toBe(502); expect(r.body.message).toBe('The reminder job could not run. The reason is in the Vercel logs.')
  })
  it('knows a reminder request from other requests', () => {
    expect(isReminderRequest({ method: 'GET', query: { reminders: '1' } })).toBe(true); expect(isReminderRequest({ method: 'GET', query: { reminders: 1 } })).toBe(true)
    for (const req of [{ method: 'POST', query: { reminders: '1' } }, { method: 'GET', query: {} }, { method: 'GET', query: { reminders: '0' } }, { method: 'GET', query: { account: '1' } }, null, undefined]) expect(isReminderRequest(req), JSON.stringify(req)).toBe(false)
  })
  it('is reached through the existing payment function (no 13th function), and does not take over the account or code requests', async () => {
    withNetwork({ members: [] }); const r = res(); await handler({ method: 'GET', headers: { authorization: 'Bearer cron-secret-123' }, query: { reminders: '1' } }, r); expect(r.code).toBe(200); expect(r.body.ok).toBe(true)
    const wrong = res(); await handler({ method: 'GET', headers: {}, query: { reminders: '1' } }, wrong); expect(wrong.code).toBe(401)
  })
  it('compares in constant time and exactly (a longer or shorter secret is not a prefix match)', () => {
    expect(authorised({ headers: { authorization: 'Bearer cron-secret-123' } }, { CRON_SECRET: 'cron-secret-123' }).ok).toBe(true)
    expect(authorised({ headers: { authorization: 'Bearer cron-secret-12' } }, { CRON_SECRET: 'cron-secret-123' }).ok).toBe(false); expect(authorised({ headers: { authorization: 'Bearer cron-secret-1234' } }, { CRON_SECRET: 'cron-secret-123' }).ok).toBe(false)
    expect(authorised({ headers: {} }, { CRON_SECRET: '   ' }).status).toBe(503)
  })
})

describe('a sample for the owner to read before approving the wording', () => {
  const res = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v }, status(n) { this.code = n; return this }, json(b) { this.body = b; return this } })
  const ask = async (query, headers = { authorization: 'Bearer cron-secret-123' }) => { const r = res(); await handleReminders({ method: 'GET', headers, query: { reminders: '1', ...query } }, r); return r }
  it('emails ONLY the owner, marked [SAMPLE], with made-up numbers, for each kind, and touches no member and writes nothing', async () => {
    for (const kind of ['renewal', 'price-change']) {
      const fn = withNetwork({ members: [member('u1')] }); const r = await ask({ sample: kind })
      expect(r.code, kind).toBe(200); expect(r.body).toEqual({ ok: true, sample: kind, message: 'A sample has been sent to the site owner.' })
      const mails = sentMail(fn); expect(mails).toHaveLength(1); const body = JSON.parse(mails[0].init.body)
      expect(body.to).toEqual(['gill@example.com']); expect(body.subject).toMatch(/^\[SAMPLE\] /); expect(body.text).toMatch(/^THIS IS A SAMPLE\. The names and amounts are made up\. No member was sent anything\./)
      expect(fn.calls.some((c) => c.url.includes('/rest/v1/') || c.url.includes('/auth/v1/') || c.url.startsWith('https://api.stripe.com'))).toBe(false)
    }
  })
  it('shows the price change with both prices, and the draft banner while the wording is not approved', async () => {
    const fn = withNetwork(); await ask({ sample: 'price-change' }); const body = JSON.parse(sentMail(fn)[0].init.body)
    expect(body.text).toContain('Until now you have paid £50.'); expect(body.text).toContain('you will pay £100 a year'); expect(body.text).toContain('DRAFT WORDING')
  })
  it('needs the secret like everything else, and sends nothing without it', async () => {
    const fn = withNetwork(); const r = await ask({ sample: 'renewal' }, {}); expect(r.code).toBe(401); expect(sentMail(fn)).toHaveLength(0)
  })
  it('refuses a sample of anything else, and sends nothing', async () => {
    const fn = withNetwork(); for (const bad of ['everything', 'RENEWAL', '1', 'renewal,price-change']) { const r = await ask({ sample: bad }); expect(r.code, bad).toBe(400) }
    expect(sentMail(fn)).toHaveLength(0)
  })
  it('says plainly when there is no owner address to send it to, or when the email cannot go', async () => {
    delete process.env.OWNER_EMAIL; withNetwork(); expect((await ask({ sample: 'renewal' })).body.message).toMatch(/OWNER_EMAIL is not set/)
    process.env.OWNER_EMAIL = 'gill@example.com'; vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'no' }, 500))); const r = await ask({ sample: 'renewal' }); expect(r.code).toBe(502); expect(r.body.message).toMatch(/could not be sent/)
  })
})
