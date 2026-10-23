// WHAT A CUSTOMER MUST BE TOLD BEFORE THEY PAY (SFW-14; finding M1 of the legal review, SFW-181). The law asks for the cancellation information, who pays to send a print back, and the model cancellation form to be given
// BEFORE the customer is bound; if it is missing the 14-day cancellation period can stretch to up to 12 months. So this wording is shown in three places, all taken from here so they cannot disagree:
//   1. the cart page, in a "Before you pay" box above the pay button (src/cart/BeforeYouPay.jsx);
//   2. Stripe's own page, as the short returns summary beside the pay button (custom_text.submit);
//   3. Stripe's page again, as the wording of the REQUIRED tick box for the Terms (consent_collection.terms_of_service). Stripe records each customer's acceptance on the order, which is better proof than anything we could store.
// The server (api/checkout.js) imports this file, so it is imported with its .js ending, and the addresses are written out in full.
import { LARGE_FRAMED_RETURN } from '../data/returns.js'

export const TERMS_URL = 'https://starscapesfactory.com/page/terms'
export const RETURNS_URL = 'https://starscapesfactory.com/page/returns'

// THE RAIL: real payments stay closed until the legal pages are published (they are drafts until SFW-186), because the tick box and the summary point at them. Set this to true IN THE SAME CHANGE that sets
// ready: true on the legal pages: test/before-you-pay.test.jsx fails if the two disagree. Test payments are not held back by it.
export const LEGAL_PAGES_PUBLISHED = true

// Said in plain words, the same wording on the cart and on Stripe. Every line must stay true of the Returns page and the Terms (the test checks the ones it can).
export const BEFORE_YOU_PAY = [
  'You can change your mind: cancel at any time until 14 days after your print is delivered, without giving a reason.',
  `${LARGE_FRAMED_RETURN}.`,
  'If a print arrives faulty, damaged or not as you ordered, email us and we will put it right. You do not pay to send it back.',
  'When you press Pay you make an offer to buy. We accept it, and the contract begins, when we email you to confirm your order.',
]

// Stripe allows up to 1200 characters in each piece of custom text, and understands [words](address) links
export const STRIPE_TEXT_LIMIT = 1200
export const STRIPE_SUBMIT_MESSAGE = `${BEFORE_YOU_PAY.join(' ')} The full Returns and refunds page, with the cancellation form, is at [Returns and refunds](${RETURNS_URL}).`
export const STRIPE_TERMS_MESSAGE = `I have read and agree to the [Terms and conditions](${TERMS_URL}) and the [Returns and refunds](${RETURNS_URL}) page, which includes my 14-day right to cancel.`
