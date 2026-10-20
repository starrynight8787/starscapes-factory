// The newsletter's public side, on the server: sign up, confirm, unsubscribe, and "is it open?". Handled inside the ebook sign-up function (api/ebook-signup.js hands anything
// with ?newsletter=... to handleNewsletter), because the free Vercel plan allows 12 functions and all 12 are used.
//
// How it keeps people safe:
//   - DOUBLE OPT-IN: signing up only stores the address as "pending" and emails a link. Nobody is on the list until they press it.
//   - The list is the shop's own (Supabase, server key only). Resend only delivers the emails. Someone who unsubscribes STAYS in the table, marked unsubscribed, so they are never emailed again.
//   - It never says whether an address is already signed up (the answer is the same), and a robot's hidden box gets a quiet "thank you" and nothing is kept.
//   - It is CLOSED until NEWSLETTER_OPEN is "yes" in Vercel (set it only once the Privacy policy is live).
//   - Each person has a private 48-letter code for their links; no link can be guessed, and a confirm or unsubscribe is done by a POST, never by just opening a link
//     (mail programs and virus scanners open links before people do).
import { randomBytes } from 'node:crypto'
import { sendEmail } from './sendEmail.js'
import { serviceFetch, databaseUrl, serviceKeys } from './serviceKey.js'
import { CONSENT_TEXT, cleanSubscribe, confirmationEmail, confirmUrl, isToken } from '../src/newsletter/newsletterRules.js'

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
const findByEmail = (email) => one(`newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=id,status,token,confirmation_sent_at&limit=1`)
const findByToken = (token) => one(`newsletter_subscribers?token=eq.${token}&select=id,status,email&limit=1`)
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

  const now = Date.now()
  const stamp = new Date(now).toISOString()
  let token = ''
  let sendConfirmation = false
  try {
    const existing = await findByEmail(check.email)
    if (!existing) {
      token = newToken()
      const made = await rest('newsletter_subscribers', { method: 'POST', headers: { ...JSON_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ email: check.email, token, status: 'pending', consent_text: CONSENT_TEXT, source: body.source === 'ebook' ? 'ebook' : 'site', confirmation_sent_at: stamp }) })
      if (made && made.status === 409) return say(res, 200, { ok: true }) // someone signed this address up a moment ago: nothing more to do
      if (!made || !made.ok) throw new Error('database')
      sendConfirmation = true
    } else if (existing.status === 'confirmed') {
      sendConfirmation = false // already on the list: the answer is the same, and nothing is sent
    } else {
      token = existing.token // the same private code for good, so links in older emails keep working
      const recent = existing.status === 'pending' && existing.confirmation_sent_at && now - Date.parse(existing.confirmation_sent_at) < COOLDOWN_MS
      if (!recent) {
        await patch(existing.id, { status: 'pending', consent_text: CONSENT_TEXT, confirmation_sent_at: stamp, unsubscribed_at: null }) // a fresh yes from someone who had left starts again from the beginning
        sendConfirmation = true
      }
    }
  } catch (e) {
    return say(res, 502, { ok: false, message: 'We could not sign you up just now. Please try again in a moment.' })
  }
  if (sendConfirmation) {
    const mail = confirmationEmail({ confirmUrl: confirmUrl(token) })
    const sent = await sendEmail({ to: check.email, ...mail, idempotencyKey: `newsletter-confirm-${check.email}-${Math.floor(now / COOLDOWN_MS)}` })
    if (!sent.ok) return say(res, 502, { ok: false, message: 'We could not send the confirmation email just now. Please try again in a moment.' })
  }
  return say(res, 200, { ok: true })
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
    if (!person) return say(res, 404, { ok: false, message: GONE_LINK })
    if (person.status === 'confirmed') return say(res, 200, { ok: true, state: 'already' })
    if (person.status === 'unsubscribed') return say(res, 410, { ok: false, message: 'You have unsubscribed from the newsletter. To join again, please sign up again.' })
    await patch(person.id, { status: 'confirmed', confirmed_at: new Date().toISOString() })
    return say(res, 200, { ok: true, state: 'confirmed' })
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

export async function handleNewsletter(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const what = clean(req.query && req.query.newsletter)
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
