// The "your passes are about to renew" emails: one for an ordinary renewal, one for when the price is going up. Plain text and HTML, safe with anything typed in.
// What each one must say (the law asks for these on a renewal reminder, and the Terms promise the price-change one): the date, the amount, that it renews unless the member cancels,
// how to cancel, and, when the price rises, the old and the new price.
//
// THE RAIL: WORDING_APPROVED is false until Gill has read this wording and said yes. While it is false, a reminder is only ever sent to the site owner (so she can see one, using her own test
// membership), never to a real member. To approve: change it to true, in this one place.

import { PASSES } from '../src/membership/passes.js'
import { formatPounds } from '../src/membership/pricing.js'
import { formatLondonDate } from '../src/membership/changeWindow.js'
import { CONTACT_EMAIL } from '../src/data/contact.js'
import { COMPANY } from './orderEmailText.js'
import { emailFrame } from '../src/email/emailLayout.js'

export const WORDING_APPROVED = false
export const MY_PASSES_URL = 'https://starscapesfactory.com/membership/passes'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
const esc = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const namesOf = (ids) => {
  const list = Array.isArray(ids) ? ids : []
  const names = PASSES.filter((p) => list.includes(p.id)).map((p) => p.name)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
const per = (interval) => (interval === 'year' ? 'year' : 'month')

// kind: 'renewal' or 'price-change'. row is the member's record; amount and previous are in pence (what will be taken, and what was taken last time).
export function buildReminder({ kind, row, amount, previous, approved = WORDING_APPROVED } = {}) {
  const date = formatLondonDate(row && row.current_period_end)
  const interval = per(row && row.billing_interval)
  const names = namesOf(row && row.passes)
  const price = formatPounds(amount)
  const rising = kind === 'price-change'
  const subject = rising ? `The price of your Starscapes Factory passes changes on ${date}` : `Your Starscapes Factory passes renew on ${date}`
  const why = row && row.offer_note ? 'because your discount comes to an end' : 'because the launch offer (half price for your first year) comes to an end'

  const paragraphs = [
    'Hello,',
    rising
      ? `Your Starscapes Factory passes will renew on ${date}, and the price is changing. Until now you have paid ${formatPounds(previous)}. From ${date} you will pay ${price} a ${interval}, ${why}. That is ${formatPounds(amount - previous)} more each ${interval}.`
      : `This is a reminder that your Starscapes Factory passes will renew automatically on ${date}.`,
    names ? `Your passes: ${names}.` : '',
    `On that day we will take ${price} (the price includes VAT) from your card, through Stripe. You do not need to do anything to keep your passes.`,
    `If you would like to stop them, you can cancel at any time before then: sign in, go to My passes, and choose "Manage payment or cancel". If you cancel, your passes stay open until the end of what you have paid for, and you will not be charged again.`,
    `My passes: ${MY_PASSES_URL}`,
    `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
    `${COMPANY.name}, company number ${COMPANY.number}. Registered office: ${COMPANY.office}.`,
  ].filter(Boolean)
  const banner = approved ? '' : 'DRAFT WORDING: this email has not been approved yet, so it is only sent to the site owner.'

  const text = [banner, banner && '', ...paragraphs.flatMap((p) => [p, ''])].filter((x) => x !== false && x !== undefined).join('\n').trim()
  const link = (p) => (p.startsWith('My passes: ') ? `<p style="margin:0 0 12px"><strong>My passes:</strong> <a href="${esc(MY_PASSES_URL)}" style="color:#1f6fa8">${esc(MY_PASSES_URL)}</a></p>` : `<p style="margin:0 0 12px">${esc(p)}</p>`)
  const html = [banner && `<p style="margin:0 0 16px;padding:12px;border:2px solid #b3261e;color:#b3261e;font-weight:bold">${esc(banner)}</p>`, ...paragraphs.map(link)].filter(Boolean).join('')
  return {
    subject,
    text,
    html: emailFrame({ subject, banner: 'general', title: rising ? 'Your pass price is changing' : 'Your passes renew soon', subtitle: `On ${date}`, bodyHtml: html }),
  }
}
