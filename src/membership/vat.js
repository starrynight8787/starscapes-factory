// VAT on the passes (decided by Gill, 20 October 2026): the price on the site is the price the member pays, and it already INCLUDES VAT. At checkout Stripe shows the VAT
// as its own line, as a breakdown of that same price (so £5 shows as £4.17 plus £0.83 VAT). The rate is the UK standard rate; passes are for customers in the UK for now.
// Money is in pence (whole numbers), like pricing.js. Nothing here touches the screen or the network.

export const UK_VAT_PERCENT = 20
export const VAT_NAME = 'VAT' // the name Stripe shows on the checkout page, receipts and invoices
export const VAT_RATE_TAG = 'uk-20-inclusive' // written on our tax rate in Stripe, so we always find and reuse our own and never someone else's

// The VAT inside a price that already includes it, in whole pence (as Stripe works it out for a price that includes tax).
export function vatIncluded(grossPence, percent = UK_VAT_PERCENT) {
  const gross = Math.max(0, Math.round(Number(grossPence) || 0))
  return Math.round(gross - gross / (1 + percent / 100))
}
// What is left once that VAT is taken out.
export const netOfVat = (grossPence, percent = UK_VAT_PERCENT) => Math.max(0, Math.round(Number(grossPence) || 0)) - vatIncluded(grossPence, percent)
