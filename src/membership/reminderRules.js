// WHEN a member is sent a reminder that their passes are about to renew, and WHICH one. Plain rules, nothing here touches the network, so the days can be tested to the hour.
// This file has no imports, so the payment server and the tests both use it.
//
// WORKING RULES (the new UK subscription law starts in January 2027, but its detailed regulations are not published yet, so these are Gill's promise in the Terms plus a cautious reading of what the law
// firms say; change them here, in one place, when the government's guidance is out):
//   * PRICE CHANGE: if the next payment is MORE than the last one (for example when the launch offer, half price for the first year, ends), the member is told 14 days before it, with both prices.
//     The Terms promise this ("we will email you before the price changes").
//   * YEARLY: every yearly renewal gets a reminder 14 days before.
//   * MONTHLY: a reminder about once every six months (when none has been sent for 150 days), 7 days before a payment.
//   * ONE reminder for each renewal date, never two.
//   * Only a member whose passes are open, who has not cancelled, is ever reminded.

export const PRICE_CHANGE_DAYS = 14
export const YEARLY_DAYS = 14
export const MONTHLY_DAYS = 7
export const MONTHLY_EVERY_DAYS = 150
export const WINDOW_DAYS = Math.max(PRICE_CHANGE_DAYS, YEARLY_DAYS, MONTHLY_DAYS) // nobody further from their payment than this is even looked at

const DAY_MS = 24 * 60 * 60 * 1000
const HOLDING = ['active', 'trialing']

export const daysUntil = (iso, nowMs) => {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? (t - nowMs) / DAY_MS : NaN
}

// Cheap first look, before Stripe is asked anything: open passes, not cancelled, a subscription to ask about, and a next payment inside the window and still to come.
export function inWindow(row, nowMs) {
  if (!row || !HOLDING.includes(row.status) || row.cancel_at_period_end === true || !row.stripe_subscription_id) return false
  const days = daysUntil(row.current_period_end, nowMs)
  return Number.isFinite(days) && days > 0 && days <= WINDOW_DAYS
}

const sameMoment = (a, b) => Number.isFinite(Date.parse(a)) && Date.parse(a) === Date.parse(b)

// What is due for this member, or null. next and last are what Stripe says: { total } in pence for the next payment and for the last one paid.
// Returns { kind: 'price-change' | 'renewal', days, amount, previous, interval }.
export function decide({ row, next, last, notices = [], nowMs }) {
  if (!inWindow(row, nowMs)) return null
  const mine = (Array.isArray(notices) ? notices : []).filter((n) => n && n.user_id === row.user_id)
  if (mine.some((n) => sameMoment(n.period_end, row.current_period_end) && (n.status === 'sent' || n.status === 'sending'))) return null // one for each renewal date
  const days = daysUntil(row.current_period_end, nowMs)
  const interval = row.billing_interval === 'year' ? 'year' : 'month'
  const amount = next && Number.isFinite(next.total) ? next.total : null
  const previous = last && Number.isFinite(last.total) ? last.total : null
  if (amount === null || amount <= 0) return null // we do not know what will be taken, so we say nothing rather than guess
  const base = { days, amount, previous, interval }
  if (previous !== null && amount > previous && days <= PRICE_CHANGE_DAYS) return { kind: 'price-change', ...base }
  if (interval === 'year' && days <= YEARLY_DAYS) return { kind: 'renewal', ...base }
  if (interval === 'month' && days <= MONTHLY_DAYS) {
    const sentAt = mine.filter((n) => n.status === 'sent' && Number.isFinite(Date.parse(n.sent_at))).map((n) => Date.parse(n.sent_at))
    const latest = sentAt.length ? Math.max(...sentAt) : null
    if (latest === null || nowMs - latest >= MONTHLY_EVERY_DAYS * DAY_MS) return { kind: 'renewal', ...base }
  }
  return null
}
