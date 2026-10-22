// The newsletter's public side, on the server: sign up, confirm, unsubscribe, and "is it open?". Handled inside the ebook sign-up function (api/ebook-signup.js hands anything
// with ?newsletter=... to handleNewsletter), because the free Vercel plan allows 12 functions and all 12 are used.
//
// How it keeps people safe:
//   - The FREE EBOOK is a one-purpose request, kept apart from the newsletter list (table email_requests): it needs no tick, and the newsletter is a separate OPTIONAL box. The newsletter list only
//     gets that person if they ticked the box AND pressed the confirm link.
//   - DOUBLE OPT-IN: signing up only stores the address as "pending" and emails a link. Nobody is on the list until they press it.
//   - The list is the shop's own (Supabase, server key only). Resend only delivers the emails. Someone who unsubscribes STAYS in the table, marked unsubscribed, so they are never emailed again.
//   - It never says whether an address is already signed up (the answer is the same), and a robot's hidden box gets a quiet "thank you" and nothing is kept.
//   - It is CLOSED until NEWSLETTER_OPEN is "yes" in Vercel (set it only once the Privacy policy is live).
//   - Each person has a private 48-letter code for their links; no link can be guessed, and a confirm or unsubscribe is done by a POST, never by just opening a link
//     (mail programs and virus scanners open links before people do).
import { randomBytes } from 'node:crypto'
import { sendEmail } from './sendEmail.js'
import { serviceFetch, databaseUrl, serviceKeys } from './serviceKey.js'
import { authorised } from './membershipReminders.js'
import { UNCONFIRMED_DAYS, cleanSubscribe, confirmationEmail, consentFor, ebookLinkEmail, confirmUrl, isToken, requestForPurpose, requestOf } from '../src/newsletter/newsletterRules.js'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
const MAX_BODY = 4000
export const COOLDOWN_MS = 10 * 60 * 1000 // the same address is not sent another confirmation email within ten minutes
export const isOpen = (env = process.env) => clean(env.NEWSLETTER_OPEN) === 'yes'
export const newToken = () => randomBytes(24).toString('hex')

const say = (res, status, body) => res.status(status).json(body)
const tokenFrom = (v) => (typeof v === 'string' ? v : '') // only real text, exactly as sent: a list, a number or text with anything extra is never a code
const noDatabase = () => !databaseUrl() || serviceKeys().length === 0

// The body of a request: JSON (an object, or text), or the form text a mail program sends for one-click unsubscribe ("List-Unsubscribe=One-Click")
export function readBody(req) {
  let data = req && req.body
  if (typeof data === 'string') {
    if (data.length > MAX_BODY) return null
    try { data = JSON.parse(data) } catch (e) { data = Object.fromEntries(new URLSearchParams(data)) }
  }
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null
}

const rest = (path, init = {}) => serviceFetch(`/rest/v1/${path}`, { ...init, headers: { Accept: 'application/json', ...(init.headers || {}) } })
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function one(path) {
  const response = await rest(path)
  if (!response || !response.ok) throw new Error('database')
  const rows = await response.json()
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}
const findByEmail = (email) => one(`newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=id,status,token,source,confirmation_sent_at&limit=1`)
const findByToken = (token) => one(`newsletter_subscribers?token=eq.${token}&select=id,status,email,source&limit=1`)
const findRequest = (email, purpose) => one(`email_requests?email=eq.${encodeURIComponent(email)}&purpose=eq.${purpose}&select=id,status,token,wants_newsletter,confirmation_sent_at&limit=1`)
const findRequestByToken = (token) => one(`email_requests?token=eq.${token}&select=id,status,email,purpose,wants_newsletter,newsletter_text&limit=1`)
async function patchRequest(id, fields) {
  const response = await rest(`email_requests?id=eq.${id}`, { method: 'PATCH', headers: { ...JSON_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify(fields) })
  if (!response || !response.ok) throw new Error('database')
}
async function patch(id, fields) {
  const response = await rest(`newsletter_subscribers?id=eq.${id}`, { method: 'PATCH', headers: { ...JSON_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify(fields) })
  if (!response || !response.ok) throw new Error('database')
}

async function subscribe(req, res) {
  if (!isOpen()) return say(res, 403, { ok: false, message: 'The newsletter is not open yet.' })
  if (noDatabase()) return say(res, 503, { ok: false, message: 'The newsletter is not available just now. Please try again soon.' })
  const body = readBody(req)
  if (!body) return say(res, 400, { ok: false, field: 'email', message: 'Please enter your email address.' })
  if (typeof body.website === 'string' && body.website.trim() !== '') return say(res, 200, { ok: true }) // a robot: thank it, keep nothing
  const check = cleanSubscribe(body)
  if (!check.ok) return say(res, 400, { ok: false, field: check.field, message: check.message })
  const kind = requestOf(body) // a one-purpose request (the free ebook, the Road journal, a door's list): a separate request with an optional newsletter box. Anything else is the footer's newsletter.
  if (kind) return subscribeRequest(res, check.email, check.newsletter === true, kind)
  const source = 'site'

  const now = Date.now()
  const stamp = new Date(now).toISOString()
  let token = ''
  let sendConfirmation = false
  try {
    const existing = await findByEmail(check.email)
    if (!existing) {
      token = newToken()
      const made = await rest('newsletter_subscribers', { method: 'POST', headers: { ...JSON_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ email: check.email, token, status: 'pending', consent_text: consentFor(source), source, confirmation_sent_at: stamp }) })
      if (made && made.status === 409) return say(res, 200, { ok: true }) // someone signed this address up a moment ago: nothing more to do
      if (!made || !made.ok) throw new Error('database')
      sendConfirmation = true
    } else if (existing.status === 'confirmed') {
      sendConfirmation = false // already on the list: the answer is the same, and nothing to confirm
    } else {
      token = existing.token // the same private code for good, so links in older emails keep working
      const recent = existing.status === 'pending' && existing.confirmation_sent_at && now - Date.parse(existing.confirmation_sent_at) < COOLDOWN_MS
      if (!recent) {
        await patch(existing.id, { status: 'pending', consent_text: consentFor(source), source, confirmation_sent_at: stamp, unsubscribed_at: null }) // a fresh yes from someone who had left starts again from the beginning
        sendConfirmation = true
      }
    }
  } catch (e) {
    return say(res, 502, { ok: false, message: 'We could not sign you up just now. Please try again in a moment.' })
  }
  if (sendConfirmation) {
    const mail = confirmationEmail({ confirmUrl: confirmUrl(token), source })
    const sent = await sendEmail({ to: check.email, ...mail, idempotencyKey: `newsletter-confirm-${check.email}-${Math.floor(now / COOLDOWN_MS)}` })
    if (!sent.ok) return say(res, 502, { ok: false, message: 'We could not send the confirmation email just now. Please try again in a moment.' })
  }
  return say(res, 200, { ok: true })
}

// A request for ONE thing (the free ebook, the Road journal, or to hear when a door opens), kept apart from the newsletter list. No tick is needed to get it. If they ticked the optional newsletter box, the same confirm link also confirms the newsletter.
async function subscribeRequest(res, email, wantsNewsletter, kind) {
  const now = Date.now()
  const stamp = new Date(now).toISOString()
  const newsletterText = wantsNewsletter ? consentFor('ebook') : null
  const purpose = kind.purpose
  let token = ''
  let sendConfirmation = false
  let sendEbook = false // someone who already confirmed asks again: the link, by email (the page says the same to everyone, so it never reveals who asked before)
  try {
    const existing = await findRequest(email, purpose)
    if (!existing) {
      token = newToken()
      const made = await rest('email_requests', { method: 'POST', headers: { ...JSON_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ email, purpose, token, status: 'pending', consent_text: kind.words, wants_newsletter: wantsNewsletter, newsletter_text: newsletterText, confirmation_sent_at: stamp }) })
      if (made && made.status === 409) return say(res, 200, { ok: true }) // someone asked for this address a moment ago: nothing more to do
      if (!made || !made.ok) throw new Error('database')
      sendConfirmation = true
    } else if (existing.status === 'confirmed') {
      let alreadyOnList = false
      if (wantsNewsletter && !existing.wants_newsletter) { const sub = await findByEmail(email); alreadyOnList = Boolean(sub && sub.status === 'confirmed') }
      if (wantsNewsletter && !existing.wants_newsletter && !alreadyOnList) { // they now also want the newsletter: that needs its own confirm link
        token = existing.token
        await patchRequest(existing.id, { status: 'pending', wants_newsletter: true, newsletter_text: newsletterText, confirmation_sent_at: stamp })
        sendConfirmation = true
      } else {
        token = existing.token
        sendEbook = Boolean(kind.file) // a door's list has no file: nothing to send again
      }
    } else {
      token = existing.token // the same private code for good, so links in older emails keep working
      const recent = existing.confirmation_sent_at && now - Date.parse(existing.confirmation_sent_at) < COOLDOWN_MS
      if (!recent) {
        await patchRequest(existing.id, { status: 'pending', wants_newsletter: wantsNewsletter, newsletter_text: newsletterText, consent_text: kind.words, confirmation_sent_at: stamp })
        sendConfirmation = true
      } else if (wantsNewsletter !== Boolean(existing.wants_newsletter)) {
        await patchRequest(existing.id, { wants_newsletter: wantsNewsletter, newsletter_text: newsletterText }) // they changed the box a moment later: no second email, the link they already have confirms what the box says now
      }
    }
  } catch (e) {
    return say(res, 502, { ok: false, message: 'We could not sign you up just now. Please try again in a moment.' })
  }
  if (sendConfirmation) {
    const mail = confirmationEmail({ confirmUrl: confirmUrl(token, undefined, kind.source), source: kind.source, newsletter: wantsNewsletter, door: kind.source === 'opens' ? purpose.slice(6) : '' })
    const sent = await sendEmail({ to: email, ...mail, idempotencyKey: `request-confirm-${purpose}-${email}-${Math.floor(now / COOLDOWN_MS)}` })
    if (!sent.ok) return say(res, 502, { ok: false, message: 'We could not send the confirmation email just now. Please try again in a moment.' })
  }
  if (sendEbook) {
    const mail = ebookLinkEmail({ file: kind.file, request: kind })
    const sent = await sendEmail({ to: email, ...mail, idempotencyKey: `request-link-${purpose}-${email}-${Math.floor(now / COOLDOWN_MS)}` })
    if (!sent.ok) return say(res, 502, { ok: false, message: 'We could not send the email just now. Please try again in a moment.' })
  }
  return say(res, 200, { ok: true })
}

// Someone confirmed the ebook AND ticked the optional newsletter box: only now are they added to the newsletter list, with the exact words next to that box.
async function joinNewsletter(email, words, stamp, source) {
  const existing = await findByEmail(email)
  if (!existing) {
    const made = await rest('newsletter_subscribers', { method: 'POST', headers: { ...JSON_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ email, token: newToken(), status: 'confirmed', consent_text: words, source, confirmation_sent_at: stamp, confirmed_at: stamp }) })
    if (made && made.status === 409) return
    if (!made || !made.ok) throw new Error('database')
  } else if (existing.status !== 'confirmed') {
    await patch(existing.id, { status: 'confirmed', consent_text: words, source, confirmed_at: stamp, unsubscribed_at: null })
  }
}

const BAD_LINK = 'That link does not look right. Please use the link in the email.'
const GONE_LINK = 'That link is not valid. It may be old or already used.'

async function confirm(req, res) {
  if (noDatabase()) return say(res, 503, { ok: false, message: 'This is not available just now. Please try again soon.' })
  const body = readBody(req)
  const token = tokenFrom(body && body.token)
  if (!isToken(token)) return say(res, 400, { ok: false, message: BAD_LINK })
  try {
    const person = await findByToken(token)
    if (!person) {
      const request = await findRequestByToken(token) // a one-purpose request (the free ebook), not the newsletter list
      if (!request) return say(res, 404, { ok: false, message: GONE_LINK })
      const wants = request.wants_newsletter === true
      const kind = requestForPurpose(request.purpose) || { source: 'ebook', join: 'ebook' }
      const door = kind.source === 'opens' ? request.purpose.slice(6) : undefined
      if (request.status === 'confirmed') return say(res, 200, { ok: true, state: 'already', source: kind.source, kind: 'request', newsletter: wants, door })
      const stamp = new Date().toISOString()
      await patchRequest(request.id, { status: 'confirmed', confirmed_at: stamp })
      if (wants) await joinNewsletter(request.email, request.newsletter_text || consentFor('ebook'), stamp, kind.join)
      return say(res, 200, { ok: true, state: 'confirmed', source: kind.source, kind: 'request', newsletter: wants, door })
    }
    if (person.status === 'confirmed') return say(res, 200, { ok: true, state: 'already', source: person.source })
    if (person.status === 'unsubscribed') return say(res, 410, { ok: false, message: 'You have unsubscribed from the newsletter. To join again, please sign up again.' })
    await patch(person.id, { status: 'confirmed', confirmed_at: new Date().toISOString() })
    return say(res, 200, { ok: true, state: 'confirmed', source: person.source })
  } catch (e) {
    return say(res, 502, { ok: false, message: 'We could not do that just now. Please try again in a moment.' })
  }
}

// From the page (a button), or one-click from a mail program (a POST to the link in the email's headers). Doing it twice is fine.
async function unsubscribe(req, res) {
  if (noDatabase()) return say(res, 503, { ok: false, message: 'This is not available just now. Please try again soon.' })
  const body = readBody(req)
  const token = tokenFrom(body && body.token) || tokenFrom(req.query && req.query.t)
  if (!isToken(token)) return say(res, 400, { ok: false, message: BAD_LINK })
  try {
    const person = await findByToken(token)
    if (!person) return say(res, 404, { ok: false, message: GONE_LINK })
    if (person.status !== 'unsubscribed') await patch(person.id, { status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    return say(res, 200, { ok: true, state: 'unsubscribed' })
  } catch (e) {
    return say(res, 502, { ok: false, message: 'We could not do that just now. Please try again in a moment.' })
  }
}

// The daily tidy-up (asked for by Vercel's scheduler, see vercel.json): deletes anyone who signed up but never pressed the confirm link, UNCONFIRMED_DAYS after their last sign-up email.
// Only people still "pending" are ever touched: nobody who confirmed, and nobody who unsubscribed (they stay, so they are never emailed again). Like the renewal reminders, it
// needs CRON_SECRET (set in Vercel) as "Authorization: Bearer ...", and refuses to run without it.
async function tidy(req, res) {
  const allowed = authorised(req)
  if (!allowed.ok) return say(res, allowed.status, { ok: false, message: allowed.message })
  if (noDatabase()) return say(res, 503, { ok: false, message: 'No server database key is set, so the tidy-up cannot run.' })
  const cutoff = encodeURIComponent(new Date(Date.now() - UNCONFIRMED_DAYS * 86400000).toISOString())
  try {
    let removed = 0
    // Newsletter sign-ups, and one-purpose requests (the free ebook), that were never confirmed. The second filter of each is only a safety net: every sign-up records when its email was sent.
    const targets = ['newsletter_subscribers', 'email_requests'].flatMap((table) => [`${table}?status=eq.pending&confirmation_sent_at=lt.${cutoff}`, `${table}?status=eq.pending&confirmation_sent_at=is.null&created_at=lt.${cutoff}`])
    for (const target of targets) {
      const gone = await rest(target, { method: 'DELETE', headers: { Prefer: 'return=representation' } })
      if (!gone || !gone.ok) throw new Error('database')
      const rows = await gone.json().catch(() => [])
      removed += Array.isArray(rows) ? rows.length : 0
    }
    return say(res, 200, { ok: true, removed })
  } catch (e) {
    return say(res, 502, { ok: false, message: 'The tidy-up could not run just now.' })
  }
}

export async function handleNewsletter(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const what = clean(req.query && req.query.newsletter)
  if (what === 'tidy') {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return say(res, 405, { ok: false }) }
    return tidy(req, res)
  }
  if (what === 'status') {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return say(res, 405, { ok: false }) }
    return say(res, 200, { ok: true, open: isOpen() })
  }
  if (what === 'subscribe' || what === 'confirm' || what === 'unsubscribe') {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return say(res, 405, { ok: false, message: 'That must be sent from the page.' }) }
    if (what === 'subscribe') return subscribe(req, res)
    if (what === 'confirm') return confirm(req, res)
    return unsubscribe(req, res)
  }
  return say(res, 404, { ok: false })
}
