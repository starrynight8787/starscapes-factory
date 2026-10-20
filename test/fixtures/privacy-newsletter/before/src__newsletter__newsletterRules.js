// The rules behind the newsletter: what a sign-up and a draft must look like, and how a newsletter written as plain text becomes a safe email. ONE set of rules, used by the pages
// (as you type, and for the preview) and by the server (again, before anything is stored or sent), so they can never disagree. Nothing here touches the screen or the network, so all
// of it is tested directly. The list lives in the shop's own database; Resend only delivers the emails (lib/newsletter.js, lib/newsletterAdmin.js).
import { COMPANY, companyLine } from '../data/company'

export const SUBJECT_MAX = 150
export const BODY_MAX = 20000
export const BATCH_SIZE = 50 // emails sent per request to Resend (its limit is 100 per request and 2 requests a second)
export const TOKEN_PATTERN = /^[a-f0-9]{48}$/
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const CONSENT_TEXT = 'Send me the Starscapes Factory newsletter by email: new posts and news. I can unsubscribe at any time, with the link in every email.'
export const SITE = 'https://starscapesfactory.com'

export const isToken = (t) => TOKEN_PATTERN.test(String(t === null || t === undefined ? '' : t))
export const isUuid = (t) => UUID_PATTERN.test(String(t === null || t === undefined ? '' : t))
const text = (v) => String(v === null || v === undefined ? '' : v)
const bad = (field, message) => ({ ok: false, field, message })

const EMAIL = /^[^\s@<>",;:\\]+@[^\s@<>",;:\\]+\.[^\s@<>",;:\\]+$/

// A sign-up: an email address and a ticked box. Returns { ok: true, email } (in lower case) or { ok: false, field, message }.
export function cleanSubscribe(input) {
  const f = input && typeof input === 'object' ? input : {}
  const email = text(f.email).trim().toLowerCase()
  if (!email) return bad('email', 'Please enter your email address.')
  if (email.length > 254 || !EMAIL.test(email)) return bad('email', 'That does not look like an email address. Please check it.')
  if (f.consent !== true) return bad('consent', 'Please tick the box to say you would like the newsletter.')
  return { ok: true, email }
}

// A draft newsletter: a one-line subject and the words. Returns { ok: true, value: { subject, body } } or { ok: false, field, message }.
export function cleanDraft(input) {
  const f = input && typeof input === 'object' ? input : {}
  const subject = text(f.subject).replace(/\s+/g, ' ').trim()
  if (!subject) return bad('subject', 'Please write a subject: it is the first thing people see.')
  if (subject.length > SUBJECT_MAX) return bad('subject', `The subject is too long. Keep it to ${SUBJECT_MAX} letters or fewer.`)
  const body = text(f.body).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
  if (!body) return bad('body', 'Please write the newsletter itself.')
  if (body.length > BODY_MAX) return bad('body', `The newsletter is too long. Keep it to ${BODY_MAX.toLocaleString('en-GB')} letters or fewer.`)
  return { ok: true, value: { subject, body } }
}

export const esc = (s) => text(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const safeUrl = (u) => (/^https:\/\/[^\s<>"'`]{1,500}$/i.test(u) || /^mailto:[^\s<>"'`]{3,200}$/i.test(u) ? u : '')

// **bold** and [label](https://address) are understood; everything else is plain words. A link is only made for an https:// or mailto: address; anything else is shown as plain words.
const INLINE = /\*\*([^*\n]{1,300})\*\*|\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g
function inlineHtml(s) {
  let out = ''; let last = 0; let m
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(s)) !== null) {
    out += esc(s.slice(last, m.index))
    if (m[1] !== undefined) out += `<strong>${esc(m[1])}</strong>`
    else { const url = safeUrl(m[3]); out += url ? `<a href="${esc(url)}" style="color:#14306a;text-decoration:underline">${esc(m[2])}</a>` : esc(m[2]) }
    last = m.index + m[0].length
  }
  return out + esc(s.slice(last))
}
function inlineText(s) {
  return s.replace(INLINE, (all, bold, label, url) => (bold !== undefined ? bold : (safeUrl(url) ? `${label} (${url})` : label)))
}

// The newsletter as blocks: a blank line starts a new one. "## Heading" is a heading, lines starting "- " are a list, anything else is a paragraph.
export function blocksOf(body) {
  return text(body).replace(/\r\n?/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 1 && /^##\s+\S/.test(lines[0])) return { type: 'heading', text: lines[0].replace(/^##\s+/, '') }
    if (lines.every((l) => /^[-*]\s+\S/.test(l))) return { type: 'list', items: lines.map((l) => l.replace(/^[-*]\s+/, '')) }
    return { type: 'paragraph', lines }
  })
}

const P = 'margin:0 0 16px'
export function renderBody(body) {
  const html = blocksOf(body).map((b) => {
    if (b.type === 'heading') return `<h2 style="margin:24px 0 8px;font-size:22px;line-height:1.3;color:#14306a">${inlineHtml(b.text)}</h2>`
    if (b.type === 'list') return `<ul style="margin:0 0 16px;padding-left:24px">${b.items.map((i) => `<li style="margin:0 0 6px">${inlineHtml(i)}</li>`).join('')}</ul>`
    return `<p style="${P}">${b.lines.map(inlineHtml).join('<br>')}</p>`
  }).join('\n')
  const plain = blocksOf(body).map((b) => {
    if (b.type === 'heading') return inlineText(b.text).toUpperCase()
    if (b.type === 'list') return b.items.map((i) => `- ${inlineText(i)}`).join('\n')
    return b.lines.map(inlineText).join('\n')
  }).join('\n\n')
  return { html, text: plain }
}

const FRAME = (title, inner, footerHtml) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>\n<body style="margin:0;padding:0;background:#f5f7fc">\n<div style="max-width:600px;margin:0 auto;padding:24px 20px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.6;color:#0e1530">\n<p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#14306a">Starscapes Factory</p>\n${inner}\n<hr style="border:0;border-top:1px solid #dde3f0;margin:28px 0 16px">\n${footerHtml}\n</div></body></html>`

// The newsletter itself, ready to send: every one has the way to leave and who is sending it. Returns { subject, html, text }.
export function renderNewsletter({ subject, body, unsubscribeUrl, company = COMPANY }) {
  const b = renderBody(body)
  const line = companyLine(company)
  const footerHtml = `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#4a5170">You are getting this because you signed up for the Starscapes Factory newsletter. <a href="${esc(unsubscribeUrl)}" style="color:#14306a;text-decoration:underline">Unsubscribe</a> at any time.</p>\n<p style="margin:0;font-size:14px;line-height:1.5;color:#4a5170">${esc(line)}</p>`
  const footerText = `You are getting this because you signed up for the Starscapes Factory newsletter. Unsubscribe at any time: ${unsubscribeUrl}\n${line}`
  return { subject, html: FRAME(subject, b.html, footerHtml), text: `Starscapes Factory\n\n${b.text}\n\n--\n${footerText}\n` }
}

// The email that asks someone to confirm: they are only added once they press the link (double opt-in)
export function confirmationEmail({ confirmUrl, company = COMPANY }) {
  const line = companyLine(company)
  const subject = 'Please confirm you would like the Starscapes Factory newsletter'
  const text = `Hello,\n\nSomeone, hopefully you, asked for the Starscapes Factory newsletter to be sent to this address.\n\nTo say yes, open this link:\n${confirmUrl}\n\nIf it was not you, do nothing: you will not be signed up and you will not hear from us again.\n\n--\n${line}\n`
  const inner = `<p style="${P}">Hello,</p>\n<p style="${P}">Someone, hopefully you, asked for the Starscapes Factory newsletter to be sent to this address.</p>\n<p style="${P}">To say yes, press the button:</p>\n<p style="margin:0 0 16px"><a href="${esc(confirmUrl)}" style="display:inline-block;padding:12px 22px;background:#14306a;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:bold">Yes, send me the newsletter</a></p>\n<p style="${P}">Or copy this link into your browser:<br><a href="${esc(confirmUrl)}" style="color:#14306a;word-break:break-all">${esc(confirmUrl)}</a></p>\n<p style="${P}">If it was not you, do nothing: you will not be signed up and you will not hear from us again.</p>`
  const footerHtml = `<p style="margin:0;font-size:14px;line-height:1.5;color:#4a5170">${esc(line)}</p>`
  return { subject, html: FRAME(subject, inner, footerHtml), text }
}

export const confirmUrl = (token, site = SITE) => `${site}/newsletter/confirm?t=${token}`
export const unsubscribePageUrl = (token, site = SITE) => `${site}/newsletter/unsubscribe?t=${token}`
// The address a mail program posts to for one-click unsubscribe (RFC 8058): the server handles it, the person never has to open a page
export const oneClickUrl = (token, site = SITE) => `${site}/api/ebook-signup?newsletter=unsubscribe&t=${token}`

export const STATUS_WORDS = { confirmed: 'Confirmed', pending: 'Waiting to confirm', unsubscribed: 'Unsubscribed' }
export const ISSUE_WORDS = { draft: 'Draft', sending: 'Sending', sent: 'Sent' }
