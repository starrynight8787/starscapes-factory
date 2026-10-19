// What the passes cost, in ONE place. The choose-your-passes page uses it to show prices, and the payment server will use the SAME rules to work out what to charge
// (it never trusts a price sent from the browser). Nothing here touches the screen or the network, so it is easy to test.
//
// The rules (Gill, 17 October 2026): one pass 5 pounds a month, two 7, three 10, and four or more ("Everything") 12. Paying for a year costs ten months, so two months are free.
// The launch offer (decided 19 October): half price for the FIRST YEAR, then the full price.
// Money is worked out in pence (whole numbers), so there are never rounding mistakes.

export const PRICE_LADDER_POUNDS = { 1: 5, 2: 7, 3: 10 } // a month; anything from 4 passes up is EVERYTHING_POUNDS
export const EVERYTHING_POUNDS = 12
export const EVERYTHING_FROM = 4 // four or more passes
export const YEARLY_MONTHS = 10 // a year costs ten months

// The launch offer. To end it, set active to false: the page then shows plain prices, and the server charges them.
export const LAUNCH_OFFER = {
  active: true,
  label: 'Launch offer: half price for your first year',
  fraction: 0.5, // of the normal price
}

const clampCount = (n) => Math.max(0, Math.floor(Number(n) || 0))

// The normal price, in pence, of a month's passes for this many passes. 0 passes costs nothing, and means "nothing chosen yet".
export function monthlyPence(count) {
  const n = clampCount(count)
  if (n === 0) return 0
  if (n >= EVERYTHING_FROM) return EVERYTHING_POUNDS * 100
  return PRICE_LADDER_POUNDS[n] * 100
}
export const yearlyPence = (count) => monthlyPence(count) * YEARLY_MONTHS

// The launch-offer price in pence for the first year, or null when the offer is off (or nothing is chosen).
export function offerPence(regularPence, offer = LAUNCH_OFFER) {
  if (!offer || !offer.active || !regularPence) return null
  return Math.round(regularPence * offer.fraction)
}

// "£5", "£2.50": whole pounds without pence, anything else with two figures.
export function formatPounds(pence) {
  const whole = Math.floor(pence / 100)
  const rest = pence % 100
  return rest === 0 ? `£${whole}` : `£${whole}.${String(rest).padStart(2, '0')}`
}

// Everything the price box needs to say for this many passes: both ways of paying, with and without the offer.
export function priceFor(count, offer = LAUNCH_OFFER) {
  const n = clampCount(count)
  const month = monthlyPence(n)
  const year = yearlyPence(n)
  return {
    count: n,
    month: { regular: month, offer: offerPence(month, offer) },
    year: { regular: year, offer: offerPence(year, offer) },
    offerActive: Boolean(offer && offer.active && month > 0),
  }
}

// The rows of the "the more passes you take" table, as drawn: 1 pass, 2 passes, 3 passes, Everything.
export function ladderRows() {
  return [1, 2, 3, EVERYTHING_FROM].map((n) => ({
    key: n >= EVERYTHING_FROM ? 'everything' : String(n),
    label: n >= EVERYTHING_FROM ? 'Everything' : n === 1 ? '1 pass' : `${n} passes`,
    count: n,
    month: monthlyPence(n),
    year: yearlyPence(n),
  }))
}

// Which table row a number of passes sits on (so that row can be shown in bold), or null when nothing is chosen.
export function ladderKey(count) {
  const n = clampCount(count)
  if (n === 0) return null
  return n >= EVERYTHING_FROM ? 'everything' : String(n)
}
