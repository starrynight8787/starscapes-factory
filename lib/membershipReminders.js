// The daily job that emails members a reminder before their passes renew (and before the price goes up). It is not a function of its own: the free Vercel plan allows only 12, so
// api/membership-checkout.js hands the request to this file, as it does for the account pages. Vercel's scheduler (see vercel.json) asks for it once a day.
//
//   GET /api/membership-checkout?reminders=1          run it
//   GET /api/membership-checkout?reminders=1&dry=1    say who WOULD be sent what, and send nothing
//   GET /api/membership-checkout?reminders=1&sample=renewal        email the OWNER a sample of that reminder (or sample=price-change), made-up numbers, marked [SAMPLE]; touches no member, writes nothing
//
// SAFEGUARDS
//   * Only the scheduler or Gill may run it: the request must carry CRON_SECRET (set in Vercel) as "Authorization: Bearer ...". Without CRON_SECRET it refuses to run at all.
//   * It asks STRIPE what will really be taken and what was taken last time, so the email never states an amount we have worked out ourselves.
//   * Each renewal date is written to the membership_notices table BEFORE sending, so a member can never get two for the same date, however often the job runs; a failed one is tried again next time.
//   * While the wording is not approved (reminderEmailText.js), it is only ever sent to the site owner.
//   * It never reads or returns a member's email address in its answer: only counts, and the first letters of an id in a dry run.

import { timingSafeEqual } from 'node:crypto'
import { serviceFetch } from './serviceKey.js'
import { STRIPE, stripeHeaders, stripeMode, logProblem } from './membershipStripe.js'
import { sendEmail } from './sendEmail.js'
import { ownerEmails } from './ownerGuard.js'
import { buildReminder, WORDING_APPROVED } from './reminderEmailText.js'
import { WINDOW_DAYS, inWindow, decide } from '../src/membership/reminderRules.js'

const clean = (v) => String(v || '').trim()
const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_PER_RUN = 100
export const TIME_BUDGET_MS = 8000
const STALE_SENDING_MS = 2 * 60 * 60 * 1000 // a claim that never finished (the job was cut off) can be tried again after two hours

export const isReminderRequest = (req) => Boolean(req && req.method === 'GET' && req.query && String(req.query.reminders) === '1')

// Is this the scheduler (or Gill)? { ok } or { ok: false, status, message }
export function authorised(req, env = process.env) {
  const secret = clean(env.CRON_SECRET)
  if (!secret) return { ok: false, status: 503, message: 'CRON_SECRET is not set in Vercel, so the reminder job cannot run.' }
  const given = clean(req && req.headers && (req.headers.authorization || req.headers.Authorization))
  const want = `Bearer ${secret}`
  const a = Buffer.from(given)
  const b = Buffer.from(want)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, status: 401, message: 'Not allowed.' }
  return { ok: true }
}

async function database(path, init = {}) {
  const response = await serviceFetch(path, init)
  if (!response.ok) throw new Error(`database answered ${response.status}`)
  return response
}
const jsonRows = async (response) => {
  const body = await response.json().catch(() => null)
  return Array.isArray(body) ? body : []
}
const inList = (ids) => `(${ids.map((id) => encodeURIComponent(id)).join(',')})`

async function stripeGet(path, key, fetchImpl) {
  const response = await fetchImpl(`${STRIPE}${path}`, { headers: stripeHeaders(key), signal: AbortSignal.timeout(10000) })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body) throw new Error(`stripe answered ${response.status}`)
  return body
}

// What Stripe will take next, and what it took last time, in pence
export async function stripeAmounts(subscriptionId, key, fetchImpl = fetch) {
  const id = encodeURIComponent(subscriptionId)
  const upcoming = await stripeGet(`/v1/invoices/upcoming?subscription=${id}`, key, fetchImpl)
  const paid = await stripeGet(`/v1/invoices?subscription=${id}&status=paid&limit=1`, key, fetchImpl)
  const lastInvoice = paid && Array.isArray(paid.data) ? paid.data[0] : null
  return { next: { total: Number.isFinite(upcoming.total) ? upcoming.total : null }, last: { total: lastInvoice && Number.isFinite(lastInvoice.total) ? lastInvoice.total : null } }
}

async function emailOf(userId) {
  const response = await database(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: { Accept: 'application/json' } })
  const body = await response.json().catch(() => null)
  return clean(body && body.email).toLowerCase()
}

// Writes down that we are about to send this one (so no other run can), or says it is already taken. Returns true if it is ours to send.
export async function claim(row, decision, now) {
  const record = { user_id: row.user_id, kind: decision.kind, period_end: row.current_period_end, amount_pence: decision.amount, previous_pence: decision.previous, status: 'sending' }
  const inserted = await jsonRows(await database('/rest/v1/membership_notices?on_conflict=user_id,period_end', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=ignore-duplicates' }, body: JSON.stringify(record) }))
  if (inserted.length > 0) return true
  const stale = new Date(now.getTime() - STALE_SENDING_MS).toISOString()
  const where = `user_id=eq.${encodeURIComponent(row.user_id)}&period_end=eq.${encodeURIComponent(row.current_period_end)}&or=(status.eq.failed,and(status.eq.sending,created_at.lt.${encodeURIComponent(stale)}))`
  const retried = await jsonRows(await database(`/rest/v1/membership_notices?${where}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status: 'sending', kind: decision.kind, amount_pence: decision.amount, previous_pence: decision.previous, note: null, created_at: now.toISOString() }) }))
  return retried.length > 0
}

async function finish(row, patch) {
  await database(`/rest/v1/membership_notices?user_id=eq.${encodeURIComponent(row.user_id)}&period_end=eq.${encodeURIComponent(row.current_period_end)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
}

// Does the whole job. { dry } says who would be sent what and sends nothing. Counts only, never an address.
export async function runReminders({ now = new Date(), dry = false, env = process.env, fetchImpl = fetch } = {}) {
  const key = clean(env.STRIPE_SECRET_KEY)
  if (!key || stripeMode(key) === 'unknown') throw new Error('the Stripe key is not set up')
  const nowMs = now.getTime()
  const summary = { dry, checked: 0, due: 0, sent: 0, failed: 0, heldBack: 0, skipped: 0, errors: 0, stoppedEarly: false, items: [] }
  const started = Date.now()

  const from = new Date(nowMs).toISOString()
  const to = new Date(nowMs + WINDOW_DAYS * DAY_MS).toISOString()
  const members = await jsonRows(await database(`/rest/v1/memberships?status=in.(active,trialing)&cancel_at_period_end=eq.false&stripe_subscription_id=not.is.null&current_period_end=gt.${encodeURIComponent(from)}&current_period_end=lt.${encodeURIComponent(to)}&select=user_id,status,passes,billing_interval,current_period_end,offer_note,stripe_subscription_id&order=current_period_end.asc&limit=${MAX_PER_RUN}`, { headers: { Accept: 'application/json' } }))
  const candidates = members.filter((row) => inWindow(row, nowMs))
  if (candidates.length === 0) return summary
  const notices = await jsonRows(await database(`/rest/v1/membership_notices?user_id=in.${inList(candidates.map((r) => r.user_id))}&select=user_id,kind,period_end,status,sent_at,created_at`, { headers: { Accept: 'application/json' } }))
  const owners = ownerEmails()

  for (const row of candidates) {
    if (Date.now() - started > TIME_BUDGET_MS) { summary.stoppedEarly = true; break }
    summary.checked += 1
    try {
      const { next, last } = await stripeAmounts(row.stripe_subscription_id, key, fetchImpl)
      const decision = decide({ row, next, last, notices, nowMs })
      if (!decision) { summary.skipped += 1; continue }
      summary.due += 1
      const email = await emailOf(row.user_id)
      if (!WORDING_APPROVED && !owners.includes(email)) { summary.heldBack += 1; continue } // not approved yet: only the owner is ever sent one
      if (dry) { summary.items.push({ user: String(row.user_id).slice(0, 8), kind: decision.kind, days: Math.round(decision.days * 10) / 10, amount: decision.amount, previous: decision.previous }); continue }
      if (!(await claim(row, decision, now))) { summary.skipped += 1; continue }
      const message = buildReminder({ kind: decision.kind, row, amount: decision.amount, previous: decision.previous, approved: WORDING_APPROVED })
      const sent = await sendEmail({ to: email, subject: message.subject, text: message.text, html: message.html, idempotencyKey: `reminder-${row.user_id}-${Date.parse(row.current_period_end)}` }, { env, fetchImpl })
      if (sent.ok) { await finish(row, { status: 'sent', sent_at: new Date().toISOString(), note: null }); summary.sent += 1 }
      else { await finish(row, { status: 'failed', note: clean(sent.detail || sent.reason).slice(0, 200) }); summary.failed += 1 }
    } catch (e) {
      summary.errors += 1
      logProblem('a renewal reminder', e)
    }
  }
  return summary
}

// A sample for the owner to read before approving the wording: made-up passes and amounts, sent only to the owner's own address, marked [SAMPLE], never recorded.
export const SAMPLE_KINDS = ['renewal', 'price-change']
export async function sendSample(kind, { now = new Date(), env = process.env, fetchImpl = fetch } = {}) {
  const to = ownerEmails()[0]
  if (!to) return { ok: false, status: 400, message: 'OWNER_EMAIL is not set in Vercel, so there is nobody to send a sample to.' }
  const row = { user_id: 'sample', passes: ['blueprints', 'book-club'], billing_interval: 'year', current_period_end: new Date(now.getTime() + 10 * DAY_MS).toISOString(), offer_note: null }
  const rising = kind === 'price-change'
  const message = buildReminder({ kind, row, amount: rising ? 10000 : 5000, previous: 5000, approved: WORDING_APPROVED })
  const sent = await sendEmail({ to, subject: `[SAMPLE] ${message.subject}`, text: `THIS IS A SAMPLE. The names and amounts are made up. No member was sent anything.\n\n${message.text}`, html: `<p style="margin:0 0 16px;padding:12px;border:2px solid #1f6fa8;font-weight:bold">THIS IS A SAMPLE. The names and amounts are made up. No member was sent anything.</p>${message.html}` }, { env, fetchImpl })
  return sent.ok ? { ok: true, status: 200, message: 'A sample has been sent to the site owner.' } : { ok: false, status: 502, message: `The sample could not be sent: ${clean(sent.detail || sent.reason)}` }
}

export async function handleReminders(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const who = authorised(req)
  if (!who.ok) return res.status(who.status).json({ ok: false, message: who.message })
  const sample = req.query && req.query.sample !== undefined ? String(req.query.sample) : ''
  if (sample) {
    if (!SAMPLE_KINDS.includes(sample)) return res.status(400).json({ ok: false, message: 'The sample must be "renewal" or "price-change".' })
    try {
      const result = await sendSample(sample)
      return res.status(result.status).json({ ok: result.ok, sample, message: result.message })
    } catch (e) {
      logProblem('a sample reminder', e)
      return res.status(502).json({ ok: false, message: 'The sample could not be sent. The reason is in the Vercel logs.' })
    }
  }
  try {
    const summary = await runReminders({ dry: String(req.query && req.query.dry) === '1' })
    return res.status(200).json({ ok: true, ...summary })
  } catch (e) {
    logProblem('the reminder job', e)
    return res.status(502).json({ ok: false, message: 'The reminder job could not run. The reason is in the Vercel logs.' })
  }
}
