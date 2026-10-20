// The "your order has been posted" email: what it says, in plain text and HTML. Pure functions, so all of it can be tried without sending.
//
// It is only ever sent when the shop owner presses the button, after she has seen that the order has actually been posted. It never says
// "tracking" unless she has given a tracking link or number, so it cannot promise something that is not there. (Creative Hub's help pages
// say they email the seller and the customer for store-connected orders, but their reply to us said they send no emails for orders placed
// through the API. Until that is settled, this email is the shop's own.)
//
// Times come from the same numbers as the print page (printDetails.js, from Creative Hub). This is not legal advice.

import { CONTACT_EMAIL } from '../src/data/contact.js'
import { JOURNEY_DAYS, REST_OF_WORLD_DAYS, SHIPS_IN_6_TO_10 } from '../src/artloft/printDetails.js'
import { COMPANY, reference } from './orderEmailText.js'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
const esc = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// What the owner may type in: an https tracking link and/or a tracking number. Anything else is refused, so nothing odd can reach a customer.
export function cleanTracking(input) {
  const { url, number } = input && typeof input === 'object' ? input : {}
  const link = clean(url)
  const code = clean(number)
  if (link && (link.length > 500 || !/^https:\/\/[^\s<>"']+$/i.test(link))) return { ok: false, message: 'The tracking link must start with https:// and be one line with no spaces.' }
  if (code && !/^[A-Za-z0-9][A-Za-z0-9 \-_/.]{0,39}$/.test(code)) return { ok: false, message: 'The tracking number can only have letters, numbers, spaces and dashes, up to 40 characters.' }
  return { ok: true, url: link, number: code }
}

const firstName = (name) => clean(name).split(/\s+/)[0] || 'there'
const countryName = (code) => {
  try {
    return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(String(code).toUpperCase()) : ''
  } catch (e) {
    return clean(code)
  }
}

export function buildDispatch(order, tracking = {}) {
  const t = cleanTracking(tracking)
  const track = t.ok ? t : { url: '', number: '' }
  const test = !(order && order.livemode)
  const a = (order && order.shipping && order.shipping.address) || {}
  const fast = SHIPS_IN_6_TO_10.has(String(a.country || '').toUpperCase())
  const days = `${JOURNEY_DAYS[0]} to ${fast ? JOURNEY_DAYS[1] : REST_OF_WORLD_DAYS} working days`
  const items = Array.isArray(order && order.items) ? order.items : []
  const where = [clean(a.city), countryName(a.country)].filter(Boolean).join(', ')
  const ref = reference(order)
  const subject = `${test ? '[TEST] ' : ''}Your Starscapes Factory order ${ref} has been posted`

  const lines = items.map((i) => `${Number(i.qty) || 1} x ${clean(i.title)}${clean(i.description) ? ` (${clean(i.description)})` : ''}`)
  const paragraphs = [
    `Hello ${firstName(order && order.customer_name)},`,
    `Good news: your order ${ref} has been posted${where ? ` to ${where}` : ''}.`,
  ]
  const trackLines = []
  if (track.url) trackLines.push(`Track your parcel: ${track.url}`)
  if (track.number) trackLines.push(`Tracking number: ${track.number}`)
  const after = [
    `We expect it to reach you within ${days} of your order. That is an estimate, not a promise.`,
    'When it arrives, please check the parcel and the print. If anything is damaged or not as it should be, email us with photos and we will put it right.',
    `Your 14-day right to cancel runs from the day you receive your print: the confirmation email we sent when you ordered explains how to use it. Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
    `${COMPANY.name}, company number ${COMPANY.number}. Registered office: ${COMPANY.office}.`,
  ]
  const banner = test ? 'THIS IS A TEST ORDER. Nothing was posted.' : ''

  const text = [banner, banner && '', ...paragraphs.flatMap((p) => [p, '']), 'What is in it:', ...lines, '', ...(trackLines.length ? [...trackLines, ''] : []), ...after.flatMap((p) => [p, ''])].filter((x) => x !== false && x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'

  const html = [
    banner && `<p style="margin:0 0 16px;padding:12px;border:2px solid #b3261e;color:#b3261e;font-weight:bold">${esc(banner)}</p>`,
    ...paragraphs.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`),
    lines.length ? `<p style="margin:0 0 4px"><strong>What is in it:</strong></p><ul style="margin:0 0 12px;padding-left:20px">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '',
    track.url ? `<p style="margin:0 0 12px"><strong>Track your parcel:</strong> <a href="${esc(track.url)}" style="color:#1f6fa8">${esc(track.url)}</a></p>` : '',
    track.number ? `<p style="margin:0 0 12px"><strong>Tracking number:</strong> ${esc(track.number)}</p>` : '',
    ...after.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`),
  ].filter(Boolean).join('')
  return {
    subject,
    text,
    html: `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(subject)}</title></head><body style="margin:0;background:#ffffff"><div style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1b1b1b">${html}</div></body></html>`,
  }
}
