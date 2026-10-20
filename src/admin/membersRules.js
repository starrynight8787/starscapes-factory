// The rules behind the "Passes and members" page (/admin/members): who counts as holding passes, what each status is called, the counts, the filters, and the
// money and date lines. Nothing here touches the screen or the network, so all of it is tested directly. Prices and statuses come from the same files checkout and
// My passes use (src/membership/pricing.js, account.js), so this page can never disagree with them.
import { PASSES } from '../membership/passes'
import { formatDate, nameList, priceNow, unitWord } from '../membership/account'
import { LAUNCH_OFFER, formatPounds, ladderRows, offerPence } from '../membership/pricing'

// Passes are open while a membership is active, trialing or past_due (while Stripe tries a failed payment again): the same rule the database uses (sql/locked-posts.sql).
export const HOLDING_STATUSES = ['active', 'trialing', 'past_due']
export const holds = (m) => Boolean(m) && HOLDING_STATUSES.includes(m.status)

export const STATUS_CHOICES = [
  { value: 'all', label: 'Everyone' },
  { value: 'holding', label: 'Holding passes now' },
  { value: 'active', label: 'Active' },
  { value: 'cancelling', label: 'Cancelling (open until the period ends)' },
  { value: 'trouble', label: 'Payment trouble' },
  { value: 'ended', label: 'Ended' },
  { value: 'free', label: 'Never started' },
]

// What a member's status is called, in words
export function statusWords(m) {
  switch (m && m.view) {
    case 'active': return 'Active'
    case 'cancelling': return 'Cancelling'
    case 'trouble': return m.status === 'unpaid' ? 'Payment not made, passes closed' : 'Payment trouble, passes still open'
    case 'ended': return 'Ended'
    default: return 'Never started'
  }
}

export function summarise(members) {
  const list = Array.isArray(members) ? members : []
  const count = (view) => list.filter((m) => m.view === view).length
  return { total: list.length, holding: list.filter(holds).length, active: count('active'), cancelling: count('cancelling'), trouble: count('trouble'), ended: count('ended'), free: count('free') }
}

// For each of the five passes: how many people hold it now, and how many of those have cancelled (so it will not renew)
export function countByPass(members) {
  const list = (Array.isArray(members) ? members : []).filter(holds)
  return PASSES.map((p) => {
    const mine = list.filter((m) => m.passes.includes(p.id))
    return { id: p.id, name: p.name, holding: mine.length, cancelling: mine.filter((m) => m.cancelling).length }
  })
}

export function filterMembers(members, { pass = 'all', status = 'all', search = '' } = {}) {
  const q = String(search || '').trim().toLowerCase()
  return (Array.isArray(members) ? members : []).filter((m) => {
    if (pass !== 'all' && !m.passes.includes(pass)) return false
    if (status === 'holding' && !holds(m)) return false
    if (status !== 'all' && status !== 'holding' && m.view !== status) return false
    if (q && !String(m.email || '').toLowerCase().includes(q)) return false
    return true
  })
}

// "£2.50 a month (launch offer until 20 October 2027, then £5 a month)"
export function paymentLine(m, nowMs = Date.now()) {
  const count = m.passes.length
  if (count === 0 || m.view === 'free') return '' // someone who never paid is not shown a price
  const p = priceNow({ billing_interval: m.interval, offer_note: m.offerNote, offer_ends_at: m.offerEndsAt }, count, nowMs)
  let line = `${formatPounds(p.pence)} ${unitWord(p.per)}`
  if (p.onOffer) line += ` (launch offer until ${formatDate(p.until)}, then ${formatPounds(p.regular)} ${unitWord(p.per)})`
  else if (m.offerNote) line += ` (${m.offerNote})`
  return line
}

export function dateLine(m) {
  const end = formatDate(m.periodEnd)
  switch (m.view) {
    case 'active': return end ? `Next payment on ${end}` : ''
    case 'cancelling': return end ? `Passes open until ${end}, then they stop (not renewing)` : 'Cancelled: not renewing'
    case 'trouble': return end ? `A payment failed. It was due ${end}` : 'A payment failed'
    case 'ended': return end ? `Ended on ${end}` : 'Ended'
    default: return 'The payment never finished, so no passes were opened'
  }
}

export const passesLine = (m) => (m.passes.length === 0 ? 'No passes' : `${m.passes.length === 1 ? '1 pass' : `${m.passes.length} passes`}: ${nameList(m.passes)}`)

// Where to find this customer in Stripe (in whichever mode the site is using now). Only an id that looks like a Stripe customer id is ever linked.
export function stripeUrl(mode, customer) {
  if (!/^cus_[A-Za-z0-9]+$/.test(String(customer || ''))) return ''
  return `https://dashboard.stripe.com/${mode === 'test' ? 'test/' : ''}customers/${customer}`
}

// The price table at the top of the page, from the same sums checkout uses
export function priceRows() {
  return ladderRows().map((r) => ({
    key: r.key,
    label: r.label,
    month: formatPounds(r.month),
    year: formatPounds(r.year),
    offerMonth: LAUNCH_OFFER.active ? formatPounds(offerPence(r.month)) : '',
    offerYear: LAUNCH_OFFER.active ? formatPounds(offerPence(r.year)) : '',
  }))
}
export const offerWords = () => (LAUNCH_OFFER.active ? LAUNCH_OFFER.label : 'No launch offer is running')
