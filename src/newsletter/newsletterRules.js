// The rules behind the newsletter: what a sign-up and a draft must look like, and how a newsletter written as plain text becomes a safe email. ONE set of rules, used by the pages
// (as you type, and for the preview) and by the server (again, before anything is stored or sent), so they can never disagree. Nothing here touches the screen or the network, so all
// of it is tested directly. The list lives in the shop's own database; Resend only delivers the emails (lib/newsletter.js, lib/newsletterAdmin.js).
import { emailFrame } from '../email/emailLayout.js'
import { COMPANY, companyLine } from '../data/company'
import { EBOOK } from '../ebook/ebookConfig.js'

export const SUBJECT_MAX = 150
export const BODY_MAX = 20000
export const UNCONFIRMED_DAYS = 30 // a sign-up that is never confirmed is deleted after this many days (the Privacy policy says so, and a test keeps the two the same)
export const BATCH_SIZE = 50 // emails sent per request to Resend (its limit is 100 per request and 2 requests a second)
export const TOKEN_PATTERN = /^[a-f0-9]{48}$/
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const CONSENT_TEXT = 'Send me the Starscapes Factory newsletter by email: new posts and news. I can unsubscribe at any time, with the link in every email.'
export const SITE = 'https://starscapesfactory.com'

// Where a sign-up came from: the footer box ('site') or the free ebook page ('ebook'). Both join the SAME list. The words recorded as their agreement are the ones on the box they ticked,
// chosen here on the server and never taken from the browser.
export const sourceOf = (input) => (input && input.source === 'ebook' ? 'ebook' : 'site')
export const consentFor = (source) => (source === 'ebook' ? EBOOK.consent : CONSENT_TEXT)

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
  if (f.consent !== true) return bad('consent', sourceOf(f) === 'ebook' ? 'Please tick the box to say you would like the free ebook and the newsletter.' : 'Please tick the box to say you would like the newsletter.')
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

const FRAME = (subject, inner, footerHtml, look) => emailFrame({ subject, bodyHtml: inner, footerHtml, background: '#f5f7fc', lang: 'en', ...look }) // the shared look for every email: see src/email/emailLayout.js

// The newsletter itself, ready to send: every one has the way to leave and who is sending it. Returns { subject, html, text }.
export function renderNewsletter({ subject, body, unsubscribeUrl, company = COMPANY }) {
  const b = renderBody(body)
  const line = companyLine(company)
  const footerHtml = `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#4a5170">You are getting this because you signed up for the Starscapes Factory newsletter. <a href="${esc(unsubscribeUrl)}" style="color:#14306a;text-decoration:underline">Unsubscribe</a> at any time.</p>\n<p style="margin:0;font-size:14px;line-height:1.5;color:#4a5170">${esc(line)}</p>`
  const footerText = `You are getting this because you signed up for the Starscapes Factory newsletter. Unsubscribe at any time: ${unsubscribeUrl}\n${line}`
  return { subject, html: FRAME(subject, b.html, footerHtml, { banner: 'general', title: subject, subtitle: 'The Starscapes Factory newsletter' }), text: `Starscapes Factory\n\n${b.text}\n\n--\n${footerText}\n` }
}

// The email that asks someone to confirm: they are only added once they press the link (double opt-in)
export function confirmationEmail({ confirmUrl, company = COMPANY, source = 'site' }) {
  const line = companyLine(company)
  const ebook = source === 'ebook' // asked for the free ebook, which joins the same list
  const what = ebook ? 'the free ebook and the Starscapes Factory newsletter' : 'the Starscapes Factory newsletter'
  const subject = ebook ? 'Please confirm to get your free ebook and the Starscapes Factory newsletter' : 'Please confirm you would like the Starscapes Factory newsletter'
  const text = `Hello,\n\nSomeone, hopefully you, asked for ${what} to be sent to this address.\n\nTo say yes${ebook ? ' and get the ebook' : ''}, open this link:\n${confirmUrl}\n\nIf it was not you, do nothing: you will not be signed up and you will not hear from us again.\n\n--\n${line}\n`
  const inner = `<p style="${P}">Hello,</p>\n<p style="${P}">Someone, hopefully you, asked for ${what} to be sent to this address.</p>\n<p style="${P}">To say yes${ebook ? ' and get the ebook' : ''}, press the button:</p>\n<p style="margin:0 0 16px"><a href="${esc(confirmUrl)}" style="display:inline-block;padding:12px 22px;background:#14306a;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:bold">${ebook ? 'Yes, send me the free ebook and the newsletter' : 'Yes, send me the newsletter'}</a></p>\n<p style="${P}">Or copy this link into your browser:<br><a href="${esc(confirmUrl)}" style="color:#14306a;word-break:break-all">${esc(confirmUrl)}</a></p>\n<p style="${P}">If it was not you, do nothing: you will not be signed up and you will not hear from us again.</p>`
  const footerHtml = `<p style="margin:0;font-size:14px;line-height:1.5;color:#4a5170">${esc(line)}</p>`
  return { subject, html: FRAME(subject, inner, footerHtml, { banner: 'general', title: 'Please confirm', subtitle: ebook ? 'To get your free ebook and the newsletter' : 'To get the Starscapes Factory newsletter' }), text }
}

// For someone who is ALREADY on the list and asks for the ebook (nothing to confirm, so it just gives the link). The page never says whether an address was already signed up: they find out in their inbox.
export function ebookLinkEmail({ file, company = COMPANY, site = SITE }) {
  const line = companyLine(company)
  const link = `${site}${file}`
  const subject = `Your free ebook: ${EBOOK.title.replace(/:.*$/, '')}`
  const text = `Hello,\n\nHere is the free ebook you asked for:\n${link}\n\n${EBOOK.fileNote}\n\nYou are already on the Starscapes Factory newsletter list, so there is nothing to confirm. Every newsletter has a link to unsubscribe.\n\n--\n${line}\n`
  const inner = `<p style="${P}">Hello,</p>\n<p style="${P}">Here is the free ebook you asked for:</p>\n<p style="margin:0 0 16px"><a href="${esc(link)}" style="display:inline-block;padding:12px 22px;background:#14306a;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:bold">Download the ebook (PDF)</a></p>\n<p style="${P}">${esc(EBOOK.fileNote)}</p>\n<p style="${P}">You are already on the Starscapes Factory newsletter list, so there is nothing to confirm. Every newsletter has a link to unsubscribe.</p>`
  const footerHtml = `<p style="margin:0;font-size:14px;line-height:1.5;color:#4a5170">${esc(line)}</p>`
  return { subject, html: FRAME(subject, inner, footerHtml, { banner: 'leadership-lounge', title: 'Your free ebook', subtitle: EBOOK.title.replace(/:.*$/, '') }), text }
}

export const confirmUrl = (token, site = SITE) => `${site}/newsletter/confirm?t=${token}`
export const unsubscribePageUrl = (token, site = SITE) => `${site}/newsletter/unsubscribe?t=${token}`
// The address a mail program posts to for one-click unsubscribe (RFC 8058): the server handles it, the person never has to open a page
export const oneClickUrl = (token, site = SITE) => `${site}/api/ebook-signup?newsletter=unsubscribe&t=${token}`

export const STATUS_WORDS = { confirmed: 'Confirmed', pending: 'Waiting to confirm', unsubscribed: 'Unsubscribed' }
export const ISSUE_WORDS = { draft: 'Draft', sending: 'Sending', sent: 'Sent' }
