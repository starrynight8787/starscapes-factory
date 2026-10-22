// The owner's newsletter tools: see who is signed up, write and save newsletters, send a test to yourself, and send one for real. Handled inside the membership function's admin
// hand-off (lib/membershipAdmin.js), which has ALREADY checked that the person asking is the owner. The free Vercel plan allows 12 functions and all 12 are used.
//
// How a newsletter is sent, and why it is safe:
//   - It goes ONLY to people who are "confirmed" (pressed the link in the email) and still are when their turn comes. Pending and unsubscribed people never get it.
//   - When you press Send, one row is made for each person (newsletter_sends). Every request then sends the next 50 (Resend's limit is 100 per request and 2 requests a second),
//     marking each as sent. So nobody is sent the same newsletter twice, and a send that stops (Resend's daily limit on the free plan, say) carries on from where it stopped.
//   - Each batch is claimed first, and sent with a Resend idempotency key made from who is in it, so pressing the button twice at once, or retrying, cannot send a batch twice.
//   - Every email has the way to leave (a link, and the one-click unsubscribe header mail programs use) and who is sending it.
//   - Resend's own words and the key are never passed on.
import { createHash } from 'node:crypto'
import { serviceFetch, databaseUrl, serviceKeys } from './serviceKey.js'
import { sendEmail, FROM } from './sendEmail.js'
import { CONTACT_EMAIL } from '../src/data/contact.js'
import { isOpen, readBody } from './newsletter.js'
import { BATCH_SIZE, SITE, cleanDraft, doorOpenedEmail, isUuid, oneClickUrl, renderNewsletter, unsubscribePageUrl } from '../src/newsletter/newsletterRules.js'
import { JOURNAL, OPENING_DOORS } from '../src/explorers/explorersConfig.js'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
const say = (res, status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra })
const RESEND = 'https://api.resend.com'
const STUCK_MS = 2 * 60 * 1000 // a batch claimed but never finished (the server was cut off) is put back in the queue after two minutes
const note = (where, e) => console.error(`[newsletter] ${where}: ${String((e && e.message) || e).replace(/[A-Za-z0-9._-]{30,}/g, '…').slice(0, 160)}`)

const rest = (path, init = {}) => serviceFetch(`/rest/v1/${path}`, { ...init, headers: { Accept: 'application/json', ...(init.headers || {}) } })
const JSON_HEADERS = { 'Content-Type': 'application/json' }
async function rows(path, init) {
  const response = await rest(path, init)
  if (!response || !response.ok) throw new Error(`database ${response && response.status}`)
  const body = await response.json().catch(() => null)
  return Array.isArray(body) ? body : []
}
async function write(path, method, body, prefer = 'return=minimal') {
  const response = await rest(path, { method, headers: { ...JSON_HEADERS, Prefer: prefer }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  if (!response || !response.ok) throw new Error(`database ${response && response.status}`)
  return prefer.includes('representation') ? ((await response.json().catch(() => null)) || []) : null
}

export const shapeSubscriber = (r) => ({ id: r.id, email: r.email, status: r.status, source: r.source, createdAt: r.created_at || null, confirmedAt: r.confirmed_at || null, unsubscribedAt: r.unsubscribed_at || null })
export const shapeIssue = (r) => ({ id: r.id, subject: r.subject, body: r.body, status: r.status, createdAt: r.created_at || null, updatedAt: r.updated_at || null, sentAt: r.sent_at || null, total: r.total || 0, sent: r.sent || 0, failed: r.failed || 0 })

const SUB_COLUMNS = 'id,email,status,source,created_at,confirmed_at,unsubscribed_at'
const ISSUE_COLUMNS = 'id,subject,body,status,created_at,updated_at,sent_at,total,sent,failed'

async function list(res) {
  try {
    const [subs, issues] = await Promise.all([
      rows(`newsletter_subscribers?select=${SUB_COLUMNS}&order=created_at.desc&limit=5000`),
      rows(`newsletter_issues?select=${ISSUE_COLUMNS}&order=created_at.desc&limit=200`),
    ])
    return res.status(200).json({ ok: true, open: isOpen(), subscribers: subs.map(shapeSubscriber), issues: issues.map(shapeIssue) })
  } catch (e) {
    note('listing', e)
    return say(res, 502, 'The newsletter could not be read just now. Please try again in a moment.')
  }
}

async function saveDraft(res, input) {
  const d = cleanDraft(input)
  if (!d.ok) return say(res, 400, d.message, { field: d.field })
  try {
    if (input.id !== undefined && input.id !== null && input.id !== '') {
      if (!isUuid(input.id)) return say(res, 400, 'That did not look right. Please reload the page and try again.')
      const changed = await write(`newsletter_issues?id=eq.${input.id}&status=eq.draft`, 'PATCH', { ...d.value, updated_at: new Date().toISOString() }, 'return=representation')
      if (changed.length === 0) return say(res, 409, 'That newsletter has already gone out (or is going out), so it cannot be changed.')
      return res.status(200).json({ ok: true, issue: shapeIssue(changed[0]) })
    }
    const made = await write('newsletter_issues', 'POST', d.value, 'return=representation')
    if (made.length === 0) throw new Error('nothing saved')
    return res.status(201).json({ ok: true, issue: shapeIssue(made[0]) })
  } catch (e) {
    note('saving a draft', e)
    return say(res, 502, 'The draft could not be saved just now. Please try again in a moment.')
  }
}

async function deleteDraft(res, input) {
  if (!isUuid(input.id)) return say(res, 400, 'That did not look right. Please reload the page and try again.')
  try {
    const gone = await write(`newsletter_issues?id=eq.${input.id}&status=eq.draft`, 'DELETE', undefined, 'return=representation')
    if (gone.length === 0) return say(res, 409, 'Only a draft can be deleted: this one has gone out, or is already gone.')
    return res.status(200).json({ ok: true })
  } catch (e) {
    note('deleting a draft', e)
    return say(res, 502, 'The draft could not be deleted just now. Please try again in a moment.')
  }
}

async function removeSubscriber(res, input) {
  if (!isUuid(input.id)) return say(res, 400, 'That did not look right. Please reload the page and try again.')
  try {
    await write(`newsletter_subscribers?id=eq.${input.id}`, 'DELETE')
    return res.status(200).json({ ok: true })
  } catch (e) {
    note('removing a subscriber', e)
    return say(res, 502, 'That person could not be removed just now. Please try again in a moment.')
  }
}

// A test goes only to the owner's own address, marked [Test], with a link that does nothing (so a test can never unsubscribe anyone)
async function sendTest(res, input, ownerEmail) {
  const d = cleanDraft(input)
  if (!d.ok) return say(res, 400, d.message, { field: d.field })
  if (!clean(ownerEmail)) return say(res, 400, 'I do not know which address to send the test to.')
  const mail = renderNewsletter({ subject: `[Test] ${d.value.subject}`, body: d.value.body, unsubscribeUrl: `${SITE}/newsletter/unsubscribe` })
  const sent = await sendEmail({ to: ownerEmail, ...mail })
  if (!sent.ok) return say(res, 502, `The test could not be sent. ${sent.detail || ''}`.trim())
  return res.status(200).json({ ok: true, to: clean(ownerEmail) })
}

// One request to Resend for up to 100 emails. Never throws; says plainly what happened.
export async function resendBatch(emails, idempotencyKey, { env = process.env, fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  const key = clean(env.RESEND_API_KEY)
  if (!key) return { ok: false, reason: 'no_key' }
  try {
    const response = await fetchImpl(`${RESEND}/emails/batch`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey.slice(0, 256) }, body: JSON.stringify(emails), signal: AbortSignal.timeout(timeoutMs) })
    const body = await response.json().catch(() => null)
    if (response.ok && body && Array.isArray(body.data)) return { ok: true }
    const name = clean(body && body.name)
    // Resend's own words are kept short, and the key itself is stripped out even if it were ever echoed back: it is never stored or shown
    const said = clean(body && (body.message || body.name)).split(key).join('…').replace(/[A-Za-z0-9._-]{30,}/g, '…').slice(0, 160)
    if (response.status === 429) return { ok: false, reason: /quota/i.test(name) ? 'quota' : 'slow', detail: said }
    return { ok: false, reason: response.status >= 500 ? 'server' : 'refused', status: response.status, detail: said }
  } catch (e) {
    return { ok: false, reason: 'unreachable' }
  }
}

const countsOf = (list) => { const c = { queued: 0, sending: 0, sent: 0, failed: 0, skipped: 0 }; for (const r of list) if (r.status in c) c[r.status] += 1; return c }
const inList = (ids) => `in.(${ids.join(',')})`

async function sendIssue(res, input) {
  if (!isUuid(input.id)) return say(res, 400, 'That did not look right. Please reload the page and try again.')
  try {
    const found = await rows(`newsletter_issues?id=eq.${input.id}&select=${ISSUE_COLUMNS}&limit=1`)
    const issue = found[0]
    if (!issue) return say(res, 404, 'That newsletter was not found. Please reload the page.')
    if (issue.status === 'sent') return say(res, 409, 'That newsletter has already gone out to everyone.')

    if (issue.status === 'draft') { // first press of Send: list who it goes to, once
      const confirmed = await rows('newsletter_subscribers?status=eq.confirmed&select=id&order=created_at.asc&limit=10000')
      if (confirmed.length === 0) return say(res, 400, 'Nobody has confirmed yet, so there is nobody to send it to.')
      for (let i = 0; i < confirmed.length; i += 500) {
        await write('newsletter_sends?on_conflict=issue_id,subscriber_id', 'POST', confirmed.slice(i, i + 500).map((p) => ({ issue_id: issue.id, subscriber_id: p.id })), 'resolution=ignore-duplicates,return=minimal')
      }
      await write(`newsletter_issues?id=eq.${issue.id}&status=eq.draft`, 'PATCH', { status: 'sending', total: confirmed.length, sent_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    }

    // a batch that was claimed and never finished goes back in the queue
    await write(`newsletter_sends?issue_id=eq.${issue.id}&status=eq.sending&claimed_at=lt.${encodeURIComponent(new Date(Date.now() - STUCK_MS).toISOString())}`, 'PATCH', { status: 'queued', claimed_at: null })

    let stopped = ''
    const next = await rows(`newsletter_sends?issue_id=eq.${issue.id}&status=eq.queued&select=id,newsletter_subscribers(email,token,status)&order=id.asc&limit=${BATCH_SIZE}`)
    const usable = next.filter((r) => isUuid(r.id))
    if (usable.length > 0) {
      const claimed = await write(`newsletter_sends?issue_id=eq.${issue.id}&status=eq.queued&id=${inList(usable.map((r) => r.id))}`, 'PATCH', { status: 'sending', claimed_at: new Date().toISOString() }, 'return=representation')
      const mine = new Set(claimed.map((r) => r.id)) // only what THIS request really claimed: a second press at the same moment gets none of it
      const batch = usable.filter((r) => mine.has(r.id))
      const goers = batch.filter((r) => r.newsletter_subscribers && r.newsletter_subscribers.status === 'confirmed' && r.newsletter_subscribers.email && /^[a-f0-9]{48}$/.test(r.newsletter_subscribers.token))
      const skipped = batch.filter((r) => !goers.includes(r))
      if (skipped.length > 0) await write(`newsletter_sends?id=${inList(skipped.map((r) => r.id))}`, 'PATCH', { status: 'skipped', claimed_at: null }) // left since the list was made

      if (goers.length > 0) {
        const emails = goers.map((r) => {
          const p = r.newsletter_subscribers
          const mail = renderNewsletter({ subject: issue.subject, body: issue.body, unsubscribeUrl: unsubscribePageUrl(p.token) })
          return { from: FROM, to: [p.email], reply_to: CONTACT_EMAIL, subject: mail.subject, html: mail.html, text: mail.text, headers: { 'List-Unsubscribe': `<${oneClickUrl(p.token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
        })
        const ids = goers.map((r) => r.id)
        const key = `newsletter-${issue.id}-${createHash('sha1').update([...ids].sort().join(',')).digest('hex')}`
        const result = await resendBatch(emails, key)
        if (result.ok) await write(`newsletter_sends?id=${inList(ids)}`, 'PATCH', { status: 'sent', sent_at: new Date().toISOString(), claimed_at: null })
        else if (result.reason === 'refused') await write(`newsletter_sends?id=${inList(ids)}`, 'PATCH', { status: 'failed', error: `Resend refused this batch (${result.status}). ${result.detail || ''}`.slice(0, 300), claimed_at: null })
        else {
          await write(`newsletter_sends?id=${inList(ids)}`, 'PATCH', { status: 'queued', claimed_at: null }) // nothing was lost: they are first in line next time
          stopped = result.reason
        }
      }
    }

    const counts = countsOf(await rows(`newsletter_sends?issue_id=eq.${issue.id}&select=status&limit=20000`))
    const remaining = counts.queued + counts.sending
    const done = remaining === 0
    await write(`newsletter_issues?id=eq.${issue.id}`, 'PATCH', { sent: counts.sent, failed: counts.failed, ...(done ? { status: 'sent', sent_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() })
    const body = { ok: true, done, total: issue.total || counts.queued + counts.sending + counts.sent + counts.failed + counts.skipped, sent: counts.sent, failed: counts.failed, skipped: counts.skipped, remaining }
    if (stopped) {
      const words = { quota: 'Resend says the sending limit for today (or this month) has been reached. On the free plan that is 100 emails a day. Nothing was lost: press Send again later and it carries on from where it stopped.', slow: 'Resend asked us to slow down. Nothing was lost: press Send again in a moment and it carries on.', no_key: 'RESEND_API_KEY is not set in Vercel, so nothing could be sent.', server: 'Resend had a problem just now. Nothing was lost: press Send again in a moment.', unreachable: 'Resend could not be reached just now. Nothing was lost: press Send again in a moment.' }
      return res.status(200).json({ ...body, stopped, message: words[stopped] || words.server })
    }
    return res.status(200).json(body)
  } catch (e) {
    note('sending', e)
    return say(res, 502, 'The newsletter could not carry on just now. Nothing was lost: press Send again in a moment.')
  }
}

// Puts the ones that failed back in the queue, so Send tries them again
async function retryFailed(res, input) {
  if (!isUuid(input.id)) return say(res, 400, 'That did not look right. Please reload the page and try again.')
  try {
    await write(`newsletter_sends?issue_id=eq.${input.id}&status=eq.failed`, 'PATCH', { status: 'queued', error: null, claimed_at: null })
    await write(`newsletter_issues?id=eq.${input.id}&status=eq.sent`, 'PATCH', { status: 'sending', updated_at: new Date().toISOString() })
    return res.status(200).json({ ok: true })
  } catch (e) {
    note('retrying', e)
    return say(res, 502, 'That could not be done just now. Please try again in a moment.')
  }
}

// "Tell me when it opens": after the owner opens one of Explorer's Bay's taped doors, this sends ONE email to each person who asked for that door and confirmed (and has not been told yet), saying only
// that the door has opened. It carries no newsletter content, and it sends nothing unless the door really is open (checked in the database again here). Each call sends up to DOOR_BATCH and says how many
// are left, so the page asks again until none are. Someone is marked as told only after their email was accepted, so a failure leaves them in the queue.
const DOOR_BATCH = 20
async function doorOpened(res, input) {
  const door = typeof input.door === 'string' && Object.prototype.hasOwnProperty.call(OPENING_DOORS, input.door) ? input.door : ''
  if (!door) return say(res, 400, 'That door does not have a list of people to tell.')
  if (door === 'road-journal' && !JOURNAL.file) return say(res, 409, 'The Road journal file is not in the project yet, so nobody is told. Add the file first (src/explorers/explorersConfig.js).')
  try {
    const open = await rows(`doors?room=eq.explorers-bay&door=eq.${door}&open=eq.true&select=door&limit=1`)
    if (open.length === 0) return say(res, 409, 'That door is not open, so nobody has been told.')
    const purpose = `opens:${door}`
    const waiting = await rows(`email_requests?purpose=eq.${encodeURIComponent(purpose)}&status=eq.confirmed&notified_at=is.null&select=id,email&order=created_at.asc&limit=${DOOR_BATCH + 1}`)
    const now = waiting.slice(0, DOOR_BATCH)
    let sent = 0
    let failed = 0
    for (const person of now) {
      const mail = doorOpenedEmail({ door, url: `${SITE}/explorers-bay/${door}` })
      const result = await sendEmail({ to: person.email, ...mail, idempotencyKey: `door-opened-${door}-${person.id}` })
      if (result.ok) { await write(`email_requests?id=eq.${person.id}`, 'PATCH', { notified_at: new Date().toISOString() }); sent += 1 } else failed += 1
    }
    return res.status(200).json({ ok: true, sent, failed, more: waiting.length > DOOR_BATCH && failed === 0 })
  } catch (e) {
    note('door opened', e)
    return say(res, 502, 'The people waiting could not be told just now. The door is open. You can try again from the Open a door page.')
  }
}

export async function handleNewsletterAdmin(req, res, who) {
  if (!databaseUrl() || serviceKeys().length === 0) return say(res, 503, 'No server database key is set on this deployment, so the newsletter cannot be read. In Vercel, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is needed.')
  if (req.method === 'GET') return list(res)
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return say(res, 405, 'This can only be looked at or changed here.') }
  const input = readBody(req)
  if (!input) return say(res, 400, 'That did not look right. Please try again.')
  switch (input.action) {
    case 'save': return saveDraft(res, input)
    case 'delete': return deleteDraft(res, input)
    case 'test': return sendTest(res, input, who && who.email)
    case 'send': return sendIssue(res, input)
    case 'retry': return retryFailed(res, input)
    case 'remove': return removeSubscriber(res, input)
    case 'door-opened': return doorOpened(res, input)
    default: return say(res, 400, 'That did not look right. Please reload the page and try again.')
  }
}
