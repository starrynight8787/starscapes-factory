// Everything the membership payment needs to say to Stripe, and to understand what Stripe says back. No part of it touches the screen, and the Stripe and database
// calls take the network as a parameter, so it is all tested without ever reaching Stripe.
//
// The rules this keeps (the same as the shop's checkout):
//   - The PRICE is worked out here, from the pass ids, using the same rules file the page uses (src/membership/pricing.js). Nothing about price is ever read from the browser.
//   - Only real pass ids get through (cleanPassIds), each once.
//   - The launch offer is a Stripe coupon (half price for the first year), made once and reused. A promo code from Stripe REPLACES it (Stripe allows one discount per checkout).
//   - What the customer agreed to (the tick box wording, and when) is written on the Stripe subscription, so there is a record.
//   - Stripe is asked for the CURRENT state of a subscription every time (never trusting an old message), so messages arriving late or twice cannot put a membership in the wrong state.

import { PASSES, cleanPassIds, CONSENT_TEXT } from '../src/membership/passes.js'
import { LAUNCH_OFFER, monthlyPence, yearlyPence, formatPounds } from '../src/membership/pricing.js'

export const STRIPE = 'https://api.stripe.com'
// Every call asks for THIS version of Stripe's interface, so the shape of what comes back never changes underneath us when the account's own default moves on.
export const STRIPE_VERSION = '2024-06-20'
export const stripeHeaders = (key, extra = {}) => ({ Authorization: `Bearer ${key}`, 'Stripe-Version': STRIPE_VERSION, ...extra })
const clean = (v) => String(v || '').trim()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const stripeMode = (key) => (/^(sk|rk)_live_/.test(clean(key)) ? 'live' : /^(sk|rk)_test_/.test(clean(key)) ? 'test' : 'unknown')

const nameOf = (id) => (PASSES.find((p) => p.id === id) || {}).name || id

// The percentage taken off by the launch offer (the page's fraction is what you PAY: 0.5 means half price, 50 percent off)
export const launchPercentOff = (offer = LAUNCH_OFFER) => Math.round((1 - offer.fraction) * 100)

// One coupon per interval. The percentage is in its name, so if the offer ever changes a NEW coupon is made, and an old one is never reused with the wrong terms.
export const couponIdFor = (interval, offer = LAUNCH_OFFER) => `launch-off${launchPercentOff(offer)}-first-year-${interval === 'year' ? 'year' : 'month'}`

// The price, in pence, of this set of passes for this way of paying. (Before any discount.)
export function chargePence(passIds, interval) {
  const count = cleanPassIds(passIds).length
  return interval === 'year' ? yearlyPence(count) : monthlyPence(count)
}

export function buildCheckoutForm({ user, passes, interval, promotionCodeId = null, launch = false, offerNote = '', consentAt, returnTo, customerId = null }) {
  const ids = cleanPassIds(passes)
  const pence = chargePence(ids, interval)
  const per = interval === 'year' ? 'year' : 'month'
  const form = new URLSearchParams()
  form.set('mode', 'subscription')
  form.set('success_url', `${returnTo}/membership/welcome?session_id={CHECKOUT_SESSION_ID}`)
  form.set('cancel_url', `${returnTo}/membership?checkout=cancelled`)
  form.set('client_reference_id', user.id)
  if (customerId) form.set('customer', customerId)
  else form.set('customer_email', user.email)
  form.set('line_items[0][quantity]', '1')
  form.set('line_items[0][price_data][currency]', 'gbp')
  form.set('line_items[0][price_data][unit_amount]', String(pence))
  form.set('line_items[0][price_data][recurring][interval]', per)
  form.set('line_items[0][price_data][product_data][name]', `Starscapes Factory passes: ${ids.length} ${ids.length === 1 ? 'pass' : 'passes'}`)
  form.set('line_items[0][price_data][product_data][description]', ids.map(nameOf).join(', '))
  form.set('custom_text[submit][message]', 'Your passes open as soon as you pay, and you have said you understand that you then lose your 14-day right to cancel and get a refund. Cancel any time: you keep your passes until the end of what you have paid for.')
  const metadata = {
    user_id: user.id,
    passes: ids.join(','),
    interval: per,
    launch_offer: launch && !promotionCodeId ? 'yes' : 'no',
    consent_text: CONSENT_TEXT,
    consent_at: consentAt,
  }
  if (promotionCodeId && clean(offerNote)) metadata.offer_note = clean(offerNote).slice(0, 200)
  for (const [k, v] of Object.entries(metadata)) {
    form.set(`metadata[${k}]`, v)
    form.set(`subscription_data[metadata][${k}]`, v)
  }
  if (promotionCodeId) form.set('discounts[0][promotion_code]', promotionCodeId)
  else if (launch) form.set('discounts[0][coupon]', couponIdFor(per))
  return form
}

async function stripeCall(path, key, doFetch, init = {}) {
  const response = await doFetch(`${STRIPE}${path}`, { ...init, headers: stripeHeaders(key, init.headers || {}), signal: AbortSignal.timeout(15000) })
  const body = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, body }
}

// Makes the launch coupon if it is not there yet, and returns its id. "Already exists" is fine: that is the normal case after the first customer.
export async function ensureLaunchCoupon(interval, key, doFetch = fetch, offer = LAUNCH_OFFER) {
  const id = couponIdFor(interval, offer)
  const form = new URLSearchParams()
  form.set('id', id)
  form.set('percent_off', String(launchPercentOff(offer)))
  form.set('name', 'Launch offer: half price, first year')
  if (interval === 'year') form.set('duration', 'once')
  else { form.set('duration', 'repeating'); form.set('duration_in_months', '12') }
  const made = await stripeCall('/v1/coupons', key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })
  if (made.ok) return id
  const code = made.body && made.body.error && made.body.error.code
  if (code === 'resource_already_exists') return id
  throw new Error(`stripe could not make the launch coupon (${made.status})`)
}

// "20% off for 3 months", in plain words, from a Stripe coupon
export function describeCoupon(coupon) {
  if (!coupon) return 'a discount'
  let what = 'a discount'
  if (Number.isFinite(coupon.percent_off)) what = `${Number(coupon.percent_off)}% off`
  else if (Number.isInteger(coupon.amount_off) && String(coupon.currency || '').toLowerCase() === 'gbp') what = `${formatPounds(coupon.amount_off)} off`
  if (coupon.duration === 'once') return `${what} your first payment`
  if (coupon.duration === 'repeating' && Number.isInteger(coupon.duration_in_months)) return `${what} for ${coupon.duration_in_months} ${coupon.duration_in_months === 1 ? 'month' : 'months'}`
  if (coupon.duration === 'forever') return `${what} for as long as you keep your passes`
  return what
}

// Looks a promo code up in Stripe. Returns { id, summary } for a code that exists and still works, or null.
export async function findPromotionCode(code, key, doFetch = fetch) {
  const text = clean(code)
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(text)) return null
  const found = await stripeCall(`/v1/promotion_codes?code=${encodeURIComponent(text)}&active=true&limit=1&expand[]=data.coupon`, key, doFetch)
  if (!found.ok) throw new Error(`stripe could not look the code up (${found.status})`)
  const item = found.body && Array.isArray(found.body.data) ? found.body.data[0] : null
  if (!item || typeof item.id !== 'string') return null
  if (item.coupon && item.coupon.valid === false) return null
  return { id: item.id, summary: describeCoupon(item.coupon) }
}

export async function fetchSubscription(id, key, doFetch = fetch) {
  const got = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch)
  if (!got.ok || !got.body) throw new Error(`stripe answered ${got.status}`)
  return got.body
}

// Stripe's states, in the words our table allows. Anything unexpected is treated as cancelled (access is never given by a state we do not understand).
const STATUS = { incomplete: 'incomplete', incomplete_expired: 'canceled', trialing: 'trialing', active: 'active', past_due: 'past_due', canceled: 'canceled', unpaid: 'unpaid', paused: 'unpaid' }

const isoFromSeconds = (s) => (Number.isFinite(Number(s)) && Number(s) > 0 ? new Date(Number(s) * 1000).toISOString() : null)

// One membership row, from a Stripe subscription. Returns null for a subscription that did not come from our checkout (no user on it).
export function membershipRowFromSubscription(sub, nowIso = new Date().toISOString()) {
  if (!sub || typeof sub !== 'object') return null
  const md = sub.metadata || {}
  const userId = clean(md.user_id)
  if (!UUID_RE.test(userId)) return null
  const item = sub.items && Array.isArray(sub.items.data) ? sub.items.data[0] : null
  const interval = (item && item.price && item.price.recurring && item.price.recurring.interval) || clean(md.interval)
  const periodEnd = sub.current_period_end ?? (item && item.current_period_end) // newer Stripe versions keep it on the item
  const started = Number(sub.start_date || sub.created)
  let offerEnds = null
  if (md.launch_offer === 'yes' && Number.isFinite(started) && started > 0) {
    const d = new Date(started * 1000)
    d.setUTCFullYear(d.getUTCFullYear() + 1)
    offerEnds = d.toISOString()
  }
  const row = {
    user_id: userId.toLowerCase(),
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : (sub.customer && sub.customer.id) || null,
    stripe_subscription_id: clean(sub.id) || null,
    status: STATUS[sub.status] || 'canceled',
    passes: cleanPassIds(clean(md.passes).split(',')),
    billing_interval: interval === 'year' ? 'year' : interval === 'month' ? 'month' : null,
    current_period_end: isoFromSeconds(periodEnd),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    offer_ends_at: offerEnds,
    updated_at: nowIso,
  }
  if (clean(md.consent_at)) { row.consent_at = clean(md.consent_at); row.consent_text = clean(md.consent_text) || null }
  row.offer_note = clean(md.offer_note) || null
  return row
}

// ---- The account pages: change passes, cancel and resume, the card on file, and the billing page ----

const productIdOf = (item) => (item && item.price && (typeof item.price.product === 'string' ? item.price.product : item.price.product && item.price.product.id)) || ''

// The Stripe request that changes a subscription to a new set of passes. The change starts TODAY and the new price applies from the next payment:
// nothing is charged or credited today (proration_behavior none). Whatever discount the member already has (a percentage coupon or promo code) carries on.
// What was added and removed, and when the member agreed to any new passes opening now, is written on the subscription.
export function buildChangeForm({ subscription, passes, changedAt, added, removed, consentAt = '' }) {
  const ids = cleanPassIds(passes)
  const item = subscription && subscription.items && Array.isArray(subscription.items.data) ? subscription.items.data[0] : null
  const interval = item && item.price && item.price.recurring && item.price.recurring.interval
  const productId = productIdOf(item)
  if (!item || !item.id || !productId || (interval !== 'month' && interval !== 'year') || ids.length === 0) throw new Error('that subscription cannot be changed')
  const form = new URLSearchParams()
  form.set('items[0][id]', item.id)
  form.set('items[0][price_data][currency]', 'gbp')
  form.set('items[0][price_data][product]', productId)
  form.set('items[0][price_data][unit_amount]', String(chargePence(ids, interval)))
  form.set('items[0][price_data][recurring][interval]', interval)
  form.set('proration_behavior', 'none')
  form.set('metadata[passes]', ids.join(','))
  form.set('metadata[last_change_at]', changedAt)
  form.set('metadata[last_change_added]', cleanPassIds(added).join(','))
  form.set('metadata[last_change_removed]', cleanPassIds(removed).join(','))
  if (clean(consentAt)) {
    form.set('metadata[last_change_consent_at]', consentAt)
    form.set('metadata[last_change_consent_text]', CONSENT_TEXT)
  }
  return form
}

export async function updateSubscription(id, form, key, doFetch = fetch) {
  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })
  if (!done.ok || !done.body) throw new Error(`stripe could not change the subscription (${done.status})`)
  return done.body
}

// Cancel at the end of what has been paid for (true), or take that back (false). Nothing is refunded and nothing stops today.
export async function setCancelAtPeriodEnd(id, cancel, key, doFetch = fetch) {
  const form = new URLSearchParams()
  form.set('cancel_at_period_end', cancel ? 'true' : 'false')
  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })
  if (!done.ok || !done.body) throw new Error(`stripe could not update the subscription (${done.status})`)
  return done.body
}

// The card on file, as "Visa ending 4242", or null if Stripe cannot say
export async function cardOnFile(subscriptionId, customerId, key, doFetch = fetch) {
  const pick = (pm) => (pm && typeof pm === 'object' && pm.card && /^\d{4}$/.test(String(pm.card.last4)) ? { brand: String(pm.card.brand || 'card'), last4: String(pm.card.last4) } : null)
  const sub = await stripeCall(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=default_payment_method`, key, doFetch)
  if (sub.ok && sub.body && pick(sub.body.default_payment_method)) return pick(sub.body.default_payment_method)
  if (!customerId) return null
  const customer = await stripeCall(`/v1/customers/${encodeURIComponent(customerId)}?expand[]=invoice_settings.default_payment_method`, key, doFetch)
  return customer.ok && customer.body && customer.body.invoice_settings ? pick(customer.body.invoice_settings.default_payment_method) : null
}

// Stripe's own page for changing a card, seeing receipts and cancelling. Throws an Error whose .code is 'portal_not_set_up' if it has not been switched on in Stripe yet.
export async function createPortalSession(customerId, returnUrl, key, doFetch = fetch) {
  const form = new URLSearchParams()
  form.set('customer', customerId)
  form.set('return_url', returnUrl)
  const made = await stripeCall('/v1/billing_portal/sessions', key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })
  if (!made.ok || !made.body || typeof made.body.url !== 'string') {
    const message = String((made.body && made.body.error && made.body.error.message) || '')
    const error = new Error(`stripe could not open the billing page (${made.status})`)
    if (/configuration/i.test(message)) error.code = 'portal_not_set_up'
    throw error
  }
  if (!/^https:\/\/billing\.stripe\.com\//.test(made.body.url)) throw new Error('stripe gave an unexpected address')
  return made.body.url
}
