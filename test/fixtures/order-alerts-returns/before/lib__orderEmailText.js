// The order confirmation email: what it says, in plain text and in HTML. Pure functions, so all of it can be tried without sending anything.
//
// WHY THIS EMAIL MATTERS: UK distance-selling law (Consumer Contracts Regulations 2013, as explained by Business Companion, the Trading
// Standards Institute's free guide) says the customer must be sent a confirmation of the contract on a durable medium (email counts)
// no later than delivery, carrying the pre-contract information again, including how to cancel. The prints are posted from the print
// studio in plain packaging, so nothing can go in the parcel: this email is the only place it can be. If the cancellation information is
// missing, the 14-day period can stretch to up to 12 months.
//
// THE RAIL: WORDING_APPROVED is false until Gill has read this wording and said yes (and every item in pendingItems() is settled).
// While it is false, a TEST payment gets the email with a visible banner (so she can see it), and a REAL payment gets nothing and is
// flagged, and live checkout refuses to open (api/checkout.js). A test fails if this is ever switched on with a gap still open.
//
// This is not legal advice. The wording follows Business Companion's model terms (reviewed March 2026) and the draft Terms and Returns pages.

import { emailFrame } from '../src/email/emailLayout.js'
import { CONTACT_EMAIL } from '../src/data/contact.js'
import { JOURNEY_DAYS, REST_OF_WORLD_DAYS, SHIPS_IN_6_TO_10 } from '../src/artloft/printDetails.js'

export const WORDING_APPROVED = false

export const SITE = 'https://starscapesfactory.com'
export const COMPANY = Object.freeze({
  name: 'Starscapes Factory Ltd',
  number: '14173440',
  registeredIn: 'England and Wales',
  office: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ',
  vat: 'GB445903680',
})

// Where a customer sends a print back, and what to tell them about the cost of sending a large framed print back. Both are Gill's to decide
// (tasks SFW-185 and the checklist in "Legal pages: checked against the official model terms"). Until they are filled in, the email is not approved.
export const RETURN = Object.freeze({ address: '', largeFramedNote: '' })

// The pages the email links to, once they are published (task SFW-186). Empty means "no link", so the email never points at a page that is not there.
export const PAGES = Object.freeze({ terms: '', returns: '', privacy: '' })

export const COMPLAINT_REPLY_DAYS = 5 // working days; Gill to confirm

export function pendingItems() {
  const open = []
  if (!RETURN.address) open.push('the address a print is sent back to')
  if (!RETURN.largeFramedNote) open.push('what to say about the cost of sending a large framed print back')
  return open
}

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
const esc = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function money(pence, currency = 'gbp') {
  if (!Number.isFinite(pence)) return ''
  const symbol = String(currency).toLowerCase() === 'gbp' ? '£' : `${String(currency).toUpperCase()} `
  return `${symbol}${(pence / 100).toFixed(2)}`
}

export function reference(order) {
  const id = clean(order && order.stripe_session_id).replace(/[^A-Za-z0-9]/g, '')
  return id.length >= 8 ? `SF-${id.slice(-8).toUpperCase()}` : 'SF-ORDER'
}

const countryName = (code) => {
  try {
    return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(String(code).toUpperCase()) : ''
  } catch (e) {
    return clean(code)
  }
}

const isFramed = (item) => /frame/i.test(clean(item && item.description)) && !/unframed/i.test(clean(item && item.description))

// "6 to 10 working days" for the whole journey, from the order to the parcel arriving (making AND delivering, framed or unframed). Uses the same numbers as the print page, which come from Creative Hub.
export function deliveryEstimate(items, countryCode) {
  const list = Array.isArray(items) ? items : []
  const framed = list.some(isFramed)
  const fast = SHIPS_IN_6_TO_10.has(String(countryCode || '').toUpperCase())
  const low = JOURNEY_DAYS[0]
  const high = fast ? JOURNEY_DAYS[1] : REST_OF_WORLD_DAYS
  return { framed, low, high, text: `${low} to ${high} working days` }
}

const firstName = (name) => clean(name).split(/\s+/)[0] || 'there'
const dateText = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

// The email as sections: { heading, paragraphs: [], list: [], form: [] }. Both the text and the HTML are made from this, so they cannot disagree.
export function buildSections(order) {
  const items = Array.isArray(order && order.items) ? order.items : []
  const ship = (order && order.shipping) || {}
  const a = ship.address || {}
  const country = countryName(a.country)
  const est = deliveryEstimate(items, a.country)
  const total = Number.isFinite(order && order.amount_total) ? order.amount_total : items.reduce((s, i) => s + (Number(i.unit_amount) || 0) * (Number(i.qty) || 0), 0)
  const currency = (order && order.currency) || 'gbp'
  const sections = []

  sections.push({
    heading: '',
    paragraphs: [
      `Hello ${firstName(order && order.customer_name)},`,
      'Thank you for your order. We have accepted it, and your contract with us begins with this email. It sets out everything you need to know about your order, including your right to cancel. Please keep it.',
    ],
  })

  sections.push({
    heading: `Your order ${reference(order)}`,
    paragraphs: [`Placed on ${dateText(order && order.created_at) || 'the date of this email'}. Paid by card through Stripe.`],
    lines: items.map((i) => ({
      title: clean(i.title),
      details: clean(i.description),
      qty: Number(i.qty) || 1,
      each: money(Number(i.unit_amount), currency),
      line: money((Number(i.unit_amount) || 0) * (Number(i.qty) || 1), currency),
    })),
    totals: [
      ['Delivery', 'Free'],
      ['Total paid, including VAT', money(total, currency)],
    ],
  })

  const where = [clean(ship.name || (order && order.customer_name)), clean(a.line1), clean(a.line2), clean(a.city), clean(a.state), clean(a.postal_code), country].filter(Boolean)
  sections.push({
    heading: 'Delivery',
    paragraphs: [
      'Each print is made to order by our printing partner, Creative Hub (Printspace Studios Limited), and posted straight to you in plain packaging. Delivery is free.',
      `We expect your print to reach you within ${est.text} of your order (${est.framed ? 'framing' : 'printing'} and delivery together). These are estimates, not promises, and if we have not agreed a date with you we will deliver within 30 days of your order. We will email you when your order has been posted, with your tracking details.`,
      'If something is wrong with the delivery address, email us straight away: we can only change it before your order has been posted.',
      'The print is your responsibility once it reaches you (or someone you have asked us to deliver it to). Until then it is at our risk, so if it is lost or damaged on the way, that is for us to sort out, not you.',
    ],
    address: where,
  })

  const sendBack = RETURN.address ? `to ${RETURN.address}` : 'to [RETURN ADDRESS: not yet decided]'
  sections.push({
    heading: 'Your right to cancel',
    paragraphs: [
      'You have the right to cancel this contract within 14 days without giving any reason. The cancellation period ends 14 days after the day you (or someone you have named) receive the last of the prints.',
      `To cancel, tell us clearly that you have decided to: email ${CONTACT_EMAIL}. You may use the form at the end of this email, but you do not have to.`,
      `If you cancel, you must send the print back ${sendBack} without delay, and no later than 14 days after you tell us you are cancelling. You pay the cost of sending it back.`,
      ...(RETURN.largeFramedNote ? [RETURN.largeFramedNote] : ['[LARGE FRAMED PRINTS: what it costs to send one back is not yet decided]']),
      'We will refund everything you paid, including the original delivery charge (delivery is free, so there is none), without delay and within 14 days of getting the print back or of you showing us proof that you have posted it, whichever is earlier. We refund to the card you paid with.',
      'We may reduce your refund if the print has lost value because you handled it more than was needed to see what it is like (the way you could in a shop). We cannot charge any other fee for cancelling.',
    ],
  })

  sections.push({
    heading: 'If something is wrong with your print',
    paragraphs: [
      'We must supply a print that matches what you ordered. If it arrives faulty, damaged or not as described, the 14-day process above does not apply: email us with photos and we will put it right under your legal rights as a consumer, for example by replacing it or refunding you. You do not pay to send a faulty print back. This does not affect your legal rights.',
    ],
  })

  sections.push({
    heading: 'Questions or complaints',
    paragraphs: [
      `Reply to this email or write to ${CONTACT_EMAIL}. We normally reply within ${COMPLAINT_REPLY_DAYS} working days. We are not members of an alternative dispute resolution scheme.`,
    ],
  })

  const links = [
    PAGES.terms && `Terms and conditions: ${PAGES.terms}`,
    PAGES.returns && `Returns and refunds: ${PAGES.returns}`,
    PAGES.privacy && `Privacy policy: ${PAGES.privacy}`,
  ].filter(Boolean)
  sections.push({
    heading: 'Who we are',
    paragraphs: [
      `${COMPANY.name}, a company registered in ${COMPANY.registeredIn} with company number ${COMPANY.number}. Registered office: ${COMPANY.office}. VAT number: ${COMPANY.vat}. Email: ${CONTACT_EMAIL}.`,
      ...(links.length ? ['The full terms that apply to your order:'] : []),
    ],
    list: links,
  })

  sections.push({
    heading: 'Model cancellation form',
    paragraphs: ['Only fill in and send back this form if you want to cancel.'],
    form: [
      `To: ${COMPANY.name}, ${COMPANY.office}, ${CONTACT_EMAIL}`,
      'I / We [*] hereby give notice that I / We [*] cancel my / our contract of sale of the following goods [*]: (write what you ordered here)',
      `Ordered on [*] / received on [*]: (your order is ${reference(order)})`,
      'Name of consumer(s):',
      'Address of consumer(s):',
      'Signature of consumer(s) (only if this form is sent on paper):',
      'Date:',
      '[*] Delete as appropriate',
    ],
  })
  return sections
}

// The link to the customer's invoice page. Only built for a real Stripe session id, so the email never points at a page that cannot open.
export function invoiceLink(order) {
  const id = clean(order && order.stripe_session_id)
  return /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id) ? `${SITE}/invoice?session_id=${encodeURIComponent(id)}` : ''
}

// Two short notices that go with the confirmation (Gill, 21 October 2026). Under the Terms the contract begins when we email the CONFIRMATION, and that now goes only once
// Creative Hub has accepted the order. So:
//   received  sent when a payment has arrived but the order is not yet accepted (held for the owner's OK, or Creative Hub has not said yes): it says plainly this is NOT
//             yet the confirmation, and that we refund if we cannot make it.
//   refused   sent only AFTER the owner has refunded the payment in Stripe and said so: no contract was made, everything is refunded.
// Both sit under the same approval rail as the confirmation (WORDING_APPROVED).
const NOTICES = {
  received: (order) => ({
    subject: `We have received your payment: order ${reference(order)}`,
    title: 'We have received your payment',
    paragraphs: [
      `Thank you. We have received your payment${money(order && order.amount_total, order && order.currency) ? ` of ${money(order && order.amount_total, order && order.currency)}` : ''} for order ${reference(order)}.`,
      'This is not yet the confirmation of your order. We are checking it with our print studio, and we will email you again as soon as it is confirmed. That is usually quick, but it can take longer.',
      'If we cannot make your order, we will tell you and refund everything you paid.',
      `If you have not heard from us after 2 working days, please email ${CONTACT_EMAIL} and tell us the order number ${reference(order)}.`,
    ],
  }),
  refused: (order) => ({
    subject: `We could not accept your order ${reference(order)}: you have been refunded`,
    title: 'We could not accept your order',
    paragraphs: [
      `We are sorry: we could not accept your order ${reference(order)}, so no contract has been made and nothing will be made or posted.`,
      `We have refunded everything you paid${money(order && order.amount_total, order && order.currency) ? ` (${money(order && order.amount_total, order && order.currency)})` : ''} to the card you paid with. Your bank may take a few days to show it.`,
      `You do not need to do anything. If you have a question, email ${CONTACT_EMAIL} and tell us the order number ${reference(order)}.`,
      'We are sorry for the trouble.',
    ],
  }),
}
export const NOTICE_KINDS = Object.keys(NOTICES)

export function buildNotice(kind, order, { test = !(order && order.livemode) } = {}) {
  if (!Object.prototype.hasOwnProperty.call(NOTICES, kind)) throw new Error(`There is no notice called ${kind}.`)
  const { subject: bare, title, paragraphs } = NOTICES[kind](order)
  const banners = []
  if (test) banners.push('THIS IS A TEST ORDER. Nothing will be made or posted, and no money has been taken.')
  if (!WORDING_APPROVED) banners.push('DRAFT WORDING: this email has not been approved yet, so it is only sent for test orders.')
  const subject = `${test ? '[TEST] ' : ''}${bare}`
  const text = [...banners.flatMap((b) => [b, '']), ...paragraphs.flatMap((p) => [p, ''])].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
  const h = []
  banners.forEach((b) => h.push(`<p style="margin:0 0 16px;padding:12px;border:2px solid #b3261e;color:#b3261e;font-weight:bold">${esc(b)}</p>`))
  paragraphs.forEach((p) => h.push(`<p style="margin:0 0 12px">${esc(p)}</p>`))
  const foot = `<p style="margin:0;font-size:12px;line-height:1.5;color:#5b6585">${esc(COMPANY.name)} · ${esc(COMPANY.office)} · VAT ${esc(COMPANY.vat)}</p>`
  const html = emailFrame({ subject, banner: 'art-loft', title, subtitle: `Order ${reference(order)}`, bodyHtml: h.join(''), footerHtml: foot })
  return { subject, text, html }
}

export function buildConfirmation(order, { test = !(order && order.livemode) } = {}) {
  const sections = buildSections(order)
  const invoiceUrl = invoiceLink(order)
  const banners = []
  if (test) banners.push('THIS IS A TEST ORDER. Nothing will be made or posted, and no money has been taken.')
  if (!WORDING_APPROVED) banners.push('DRAFT WORDING: this email has not been approved yet, so it is only sent for test orders.')
  const subject = `${test ? '[TEST] ' : ''}Your Starscapes Factory order ${reference(order)}`

  // ----- plain text -----
  const t = []
  banners.forEach((b) => t.push(b, ''))
  sections.forEach((s) => {
    if (s.heading) t.push(s.heading.toUpperCase(), '')
    ;(s.paragraphs || []).forEach((p) => t.push(p, ''))
    ;(s.lines || []).forEach((l) => t.push(`${l.qty} x ${l.title}${l.details ? ` (${l.details})` : ''}: ${l.each} each, ${l.line}`))
    if (s.lines && s.lines.length) t.push('')
    ;(s.totals || []).forEach(([k, v]) => t.push(`${k}: ${v}`))
    if (s.totals) t.push('')
    if (invoiceUrl && /^Your order/.test(s.heading || '')) t.push(`View or print your invoice: ${invoiceUrl}`, '')
    if (s.address) t.push('Delivering to:', ...s.address, '')
    ;(s.list || []).forEach((x) => t.push(`- ${x}`))
    if (s.list && s.list.length) t.push('')
    ;(s.form || []).forEach((x) => t.push(x))
    if (s.form) t.push('')
  })
  const text = t.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'

  // ----- HTML (simple, readable, and works with images switched off) -----
  const h = []
  banners.forEach((b) => h.push(`<p style="margin:0 0 16px;padding:12px;border:2px solid #b3261e;color:#b3261e;font-weight:bold">${esc(b)}</p>`))
  sections.forEach((s) => {
    if (s.heading) h.push(`<h2 style="font-size:18px;color:#14306a;margin:28px 0 8px">${esc(s.heading)}</h2>`)
    ;(s.paragraphs || []).forEach((p) => h.push(`<p style="margin:0 0 12px">${esc(p)}</p>`))
    if (s.lines && s.lines.length) {
      h.push('<table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:8px 0">')
      s.lines.forEach((l) =>
        h.push(
          `<tr><td style="border-bottom:1px solid #dce6ff;padding:12px 6px"><strong>${esc(l.title)}</strong>${l.details ? `<br>${esc(l.details)}` : ''}</td><td align="right" style="white-space:nowrap;border-bottom:1px solid #dce6ff;padding:12px 6px;color:#5b6585">${esc(l.qty)} × ${esc(l.each)}</td><td align="right" style="white-space:nowrap;border-bottom:1px solid #dce6ff;padding:12px 6px"><strong>${esc(l.line)}</strong></td></tr>`,
        ),
      )
      ;(s.totals || []).forEach(([k, v]) => h.push(`<tr><td colspan="2" align="right"><strong>${esc(k)}</strong></td><td align="right"><strong>${esc(v)}</strong></td></tr>`))
      h.push('</table>')
      if (invoiceUrl && /^Your order/.test(s.heading || '')) {
        h.push(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td bgcolor="#1f6fa8" style="border-radius:24px"><a href="${esc(invoiceUrl)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:bold;text-decoration:none;border-radius:24px">View or print your invoice</a></td></tr></table>`)
      }
    }
    if (s.address) h.push(`<p style="margin:0 0 12px"><strong>Delivering to:</strong><br>${s.address.map(esc).join('<br>')}</p>`)
    if (s.list && s.list.length) h.push(`<ul style="margin:0 0 12px;padding-left:20px">${s.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)
    if (s.form) h.push(`<div style="border:1px solid #14306a;padding:12px;margin:0 0 12px">${s.form.map((x) => `<p style="margin:0 0 8px">${esc(x)}</p>`).join('')}</div>`)
  })
  const foot = `<p style="margin:0;font-size:12px;line-height:1.5;color:#5b6585">${esc(COMPANY.name)} · ${esc(COMPANY.office)} · VAT ${esc(COMPANY.vat)}</p>`
  const html = emailFrame({ subject, banner: 'art-loft', title: 'Thank you for your order', subtitle: `Your order ${reference(order)}. Please keep this email.`, bodyHtml: h.join(''), footerHtml: foot })
  return { subject, text, html }
}
