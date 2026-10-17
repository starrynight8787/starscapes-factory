// Sending one email through Resend (the email service already used for sign-up and password-reset emails).
//
// This is for emails the SHOP sends (order confirmations, later dispatch emails), using a second send-only Resend key kept in
// Vercel as RESEND_API_KEY (hidden). The sign-in emails use a different key, inside Supabase, and are not touched by this.
//
// Rules this keeps:
//   - The key is only ever sent to https://api.resend.com, and is never printed, logged or returned.
//   - The address is checked first, and anything that could add a second header line (a line break) is refused.
//   - It never throws. What happened comes back as { ok: true, id } or { ok: false, reason, detail } in plain words.
//   - An idempotency key can be passed, so that if the same email is sent twice by mistake, Resend only sends one.

import { CONTACT_EMAIL } from '../src/data/contact.js'

const RESEND = 'https://api.resend.com'
const clean = (v) => String(v === null || v === undefined ? '' : v).trim()

export const FROM = `Starscapes Factory <${CONTACT_EMAIL}>`
export const isEmailAddress = (v) => {
  const s = clean(v)
  return s.length <= 254 && /^[^\s@<>",;:\\]+@[^\s@<>",;:\\]+\.[^\s@<>",;:\\]+$/.test(s)
}

export async function sendEmail({ to, subject, text, html, idempotencyKey }, { env = process.env, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const key = clean(env.RESEND_API_KEY)
  if (!key) return { ok: false, reason: 'no_key', detail: 'RESEND_API_KEY is not set in Vercel.' }
  if (!isEmailAddress(to)) return { ok: false, reason: 'bad_address', detail: 'That is not a usable email address.' }
  if (/[\r\n]/.test(clean(subject)) || !clean(subject)) return { ok: false, reason: 'bad_message', detail: 'The subject line is missing or has a line break in it.' }
  if (!clean(text) || !clean(html)) return { ok: false, reason: 'bad_message', detail: 'The message is empty.' }

  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  if (clean(idempotencyKey)) headers['Idempotency-Key'] = clean(idempotencyKey).slice(0, 256)
  try {
    const response = await fetchImpl(`${RESEND}/emails`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ from: FROM, to: [clean(to)], reply_to: CONTACT_EMAIL, subject: clean(subject), text, html }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = await response.json().catch(() => null)
    if (response.ok && body && typeof body.id === 'string') return { ok: true, id: body.id }
    // Resend's own short message is safe to pass on (it never contains the key), but only a few words of it
    const said = clean(body && (body.message || body.name)).replace(/[A-Za-z0-9._-]{30,}/g, '…').slice(0, 160)
    return { ok: false, reason: 'refused', detail: `Resend answered ${response.status}${said ? `: ${said}` : ''}.` }
  } catch (e) {
    return { ok: false, reason: 'unreachable', detail: 'Resend could not be reached just now.' }
  }
}
