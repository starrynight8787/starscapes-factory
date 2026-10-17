// The free ebook sign-up, on the server. It checks the sign-up, keeps the email (with the exact words they agreed to and when), and, once there is a PDF,
// emails the link from imagine@. It never says whether an address was already signed up, and a failed email never stops the person getting the download.
import { cleanSignup } from '../src/ebook/ebookRules.js'
import { EBOOK, SITE_URL } from '../src/ebook/ebookConfig.js'
import { CONTACT_EMAIL } from '../src/data/contact.js'
import { sendEmail } from './sendEmail.js'
import { serviceFetch } from './serviceKey.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function ebookEmail(file) {
  const link = `${SITE_URL}${file}`
  const subject = `Your free ebook: ${EBOOK.title.replace(/:.*$/, '')}`
  const text = `Hello,\n\nHere is the free ebook you asked for:\n\n${link}\n\n${EBOOK.fileNote}\n\nYou said yes to emails from me, so the free blog posts will follow. Every email will tell you how to stop them, or you can just reply to this one and ask.\n\nStarscapes Factory\n${CONTACT_EMAIL}\n`
  const html = `<p>Hello,</p><p>Here is the free ebook you asked for:</p><p><a href="${esc(link)}">Download the ebook (PDF)</a></p><p>${esc(EBOOK.fileNote)}</p><p>You said yes to emails from me, so the free blog posts will follow. Every email will tell you how to stop them, or you can just reply to this one and ask.</p><p>Starscapes Factory<br>${esc(CONTACT_EMAIL)}</p>`
  return { subject, text, html }
}

// body: { email, consent, website }. "website" is a box people cannot see: only a robot fills it in, and a robot gets a quiet "thank you" and nothing is kept.
export async function handleSignup(body, { save = saveSignup, send = sendEmail, now = () => new Date() } = {}) {
  if (body && typeof body.website === 'string' && body.website.trim() !== '') return { status: 200, body: { ok: true, file: '', emailed: false } }
  const clean = cleanSignup(body)
  if (!clean.ok) return { status: 400, body: { ok: false, errors: clean.errors } }
  try {
    await save(clean.email)
  } catch (e) {
    return { status: 502, body: { ok: false } }
  }
  let emailed = false
  if (EBOOK.file) {
    const message = ebookEmail(EBOOK.file)
    const day = now().toISOString().slice(0, 10)
    const result = await send({ to: clean.email, ...message, idempotencyKey: `ebook-${clean.email}-${day}` })
    emailed = Boolean(result && result.ok)
  }
  return { status: 200, body: { ok: true, file: EBOOK.file, emailed } }
}

// Keeps the email and the words they agreed to. A second sign-up with the same address is quietly ignored (the table allows each address once).
export async function saveSignup(email) {
  const response = await serviceFetch('/rest/v1/ebook_signups?on_conflict=email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ email, consent_text: EBOOK.consent }),
  })
  if (!response || !response.ok) throw new Error('not saved')
}
