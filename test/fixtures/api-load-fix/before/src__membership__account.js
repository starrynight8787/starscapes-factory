// Small, plain helpers for the account pages (My passes, Change my passes). Nothing here touches the screen or the network, so all of it is tested directly.
import { PASSES, cleanPassIds } from './passes'
import { LAUNCH_OFFER, monthlyPence, yearlyPence, offerPence } from './pricing'

// Which page a person should see, from their membership row (or none).
//   free        no membership, or a payment that never finished
//   active      holds passes
//   cancelling  has cancelled, but the passes stay open until the end of what they paid for
//   ended       the passes have ended
//   trouble     a payment failed: Stripe is trying again, and they can fix their card
export function accountView(row) {
  if (!row) return 'free'
  switch (row.status) {
    case 'active':
    case 'trialing':
      return row.cancel_at_period_end ? 'cancelling' : 'active'
    case 'past_due':
    case 'unpaid':
      return 'trouble'
    case 'canceled':
      return 'ended'
    default:
      return 'free' // incomplete, or anything we do not understand: never treated as holding passes
  }
}

// "16 November 2026", in London time (the day a member sees is the London day)
export function formatDate(iso) {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

export const unitWord = (per) => (per === 'year' ? 'a year' : 'a month')

// "Blueprints", "Blueprints and Book Club", "A, B and C" (in the order the passes are drawn)
export function nameList(ids) {
  const names = PASSES.filter((p) => ids.includes(p.id)).map((p) => p.name)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// What a member pays for this many passes, taking their own launch offer into account (it lasts until their offer_ends_at). A member with a promo code has a discount
// we cannot work out here, so the full price is shown and the discount is named beside it (row.offer_note).
export function priceNow(row, count, nowMs = Date.now()) {
  const per = row && row.billing_interval === 'year' ? 'year' : 'month'
  const regular = per === 'year' ? yearlyPence(count) : monthlyPence(count)
  const onOffer = Boolean(row && !row.offer_note && row.offer_ends_at && Date.parse(row.offer_ends_at) > nowMs && regular > 0)
  const pence = onOffer ? offerPence(regular, { active: true, fraction: LAUNCH_OFFER.fraction }) : regular
  return { per, regular, pence, onOffer, until: onOffer ? row.offer_ends_at : null }
}

// What a change adds and removes, by pass id (real passes only, in the order drawn)
export function changeOf(currentIds, wantedIds) {
  const current = cleanPassIds(currentIds)
  const wanted = cleanPassIds(wantedIds)
  return { wanted, added: wanted.filter((id) => !current.includes(id)), removed: current.filter((id) => !wanted.includes(id)) }
}
