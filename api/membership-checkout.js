// Vercel serverless function: starts a membership payment on Stripe's own checkout page (a SUBSCRIPTION, for the passes someone ticked).
//
// What it does: takes the pass ids, how they want to pay (monthly or yearly), the tick-box agreement and an optional promo code. It works out the price ITSELF from
// the same rules the page uses (src/membership/pricing.js), asks Stripe for a checkout page, and returns the address of that page.
//
// What it will NOT do:
//   - trust a price, total or discount sent from the browser (only pass ids, the way of paying and a promo CODE are read)
//   - start a payment unless the person is signed in with a confirmed email, and has ticked the box that opens their passes now (the law needs that agreement first)
//   - sell passes to someone who already holds them (they change their passes instead)
//   - take a REAL payment at all, yet. Live keys are refused until the welcome email and the Terms are ready (a later step).
//   - show or log the Stripe key
//
// CLOSED TO VISITORS BY DEFAULT: until MEMBERSHIP_OPEN is set to exactly yes in Vercel, only the signed-in owner can start one, and everyone else is told it is not open yet.
// The key lives in Vercel as STRIPE_SECRET_KEY and must be a TEST key (sk_test_) for now.

import { requireOwner } from '../lib/ownerGuard.js'
import { requireUser } from '../lib/userGuard.js'
import { handleReminders, isReminderRequest } from '../lib/membershipReminders.js'
import { serviceFetch } from '../lib/serviceKey.js'
import { cleanPassIds } from '../src/membership/passes.js'
import { LAUNCH_OFFER } from '../src/membership/pricing.js'
import { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'
import { saveMembership } from './membership-webhook.js'
import { STRIPE, stripeMode, stripeHeaders, logProblem, findHeldSubscription, membershipRowFromSubscription, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'

const SITE = 'https://starscapesfactory.com'
const MAX_BODY = 4000
const clean = (v) => String(v || '').trim()
const say = (res, status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra })
const isOpen = () => clean(process.env.MEMBERSHIP_OPEN) === 'yes'

async function ownerIsAsking(req) {
  try {
    const who = await requireOwner(req)
    return Boolean(who && who.ok)
  } catch (e) {
    return false
  }
}

function allowedOrigins() {
  const list = new Set([SITE, 'https://www.starscapesfactory.com', 'http://localhost:5173'])
  if (clean(process.env.SITE_URL)) list.add(clean(process.env.SITE_URL).replace(/\/+$/, ''))
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) if (clean(host)) list.add(`https://${clean(host)}`)
  return list
}

function readBody(body) {
  let data = body
  if (typeof data === 'string') {
    if (data.length > MAX_BODY) return { error: 'That did not look right. Please try again.' }
    try {
      data = JSON.parse(data)
    } catch (e) {
      return { error: 'That did not look right. Please try again.' }
    }
  }
  if (!data || typeof data !== 'object') return { error: 'That did not look right. Please try again.' }
  const passes = cleanPassIds(data.passes)
  if (passes.length === 0) return { error: 'Please choose at least one pass.' }
  if (data.interval !== 'month' && data.interval !== 'year') return { error: 'Please choose monthly or yearly.' }
  if (data.consent !== true) return { error: 'Please tick the box to open your passes now. We need your agreement before we can take a payment.' }
  const code = clean(data.code)
  if (code.length > 40) return { error: 'That code is not valid.' }
  return { passes, interval: data.interval, code }
}

// Does this person already hold passes? (Only the server can read the table for anyone: it uses the server key.)
async function currentMembership(userId) {
  const response = await serviceFetch(`/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}&select=status,stripe_customer_id`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`database answered ${response.status}`)
  const rows = await response.json()
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

// The Stripe key, and whether it is one we will use. Returns { key } or { problem: [status, message] }.
function stripeKey() {
  const key = clean(process.env.STRIPE_SECRET_KEY)
  if (!key) return { problem: [503, "Memberships aren't switched on yet."] }
  const mode = stripeMode(key)
  if (mode === 'unknown') return { problem: [503, "Memberships aren't set up correctly yet."] }
  if (mode === 'live') return { problem: [503, 'Memberships are not open for real payments yet.'] }
  return { key, mode }
}

export default async function handler(req, res) {
  // A member's own passes (card, billing page, resume, change) are handled in lib/membershipAccount.js: this is the only membership function, because the free Vercel plan allows 12.
  if (isAccountRequest(req)) return handleAccount(req, res)
  // The daily reminder job (asked for by Vercel's scheduler, see vercel.json) is handled in lib/membershipReminders.js, for the same reason
  if (isReminderRequest(req)) return handleReminders(req, res)
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const code = clean(req.query && req.query.code)
    // Is it open? (the page asks). Says nothing about why, and reveals nothing else.
    if (!code) {
      const open = isOpen()
      const can_test = open ? false : await ownerIsAsking(req)
      return res.status(200).json({ ok: true, open, can_test })
    }
    // "Does this promo code work, and what does it give?" Only a signed-in person may ask (so codes cannot be guessed anonymously).
    if (!isOpen() && !(await ownerIsAsking(req))) return say(res, 403, 'Memberships are not open yet.', { reason: 'not_open' })
    const who = await requireUser(req)
    if (!who.ok) return res.status(who.status).json({ ok: false, reason: who.reason, message: who.message })
    const k = stripeKey()
    if (k.problem) return say(res, k.problem[0], k.problem[1])
    try {
      const found = await findPromotionCode(code, k.key)
      if (!found) return say(res, 404, 'That code is not valid, or it has ended.')
      return res.status(200).json({ ok: true, summary: found.summary })
    } catch (e) {
      logProblem('checking a promo code', e)
      return say(res, 502, "We couldn't check that code just now. Please try again in a moment.")
    }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return say(res, 405, 'Payment is started from the membership page.')
  }

  // Only this site may start a payment (a page on another website cannot)
  const origins = allowedOrigins()
  const origin = clean(req.headers && req.headers.origin)
  if (origin && !origins.has(origin)) return say(res, 403, 'That request did not come from the site.')
  const returnTo = origin || SITE

  // Closed to visitors: only the owner may start one until MEMBERSHIP_OPEN is yes
  if (!isOpen() && !(await ownerIsAsking(req))) return say(res, 403, 'Memberships are not open yet.', { reason: 'not_open' })

  const who = await requireUser(req)
  if (!who.ok) return res.status(who.status).json({ ok: false, reason: who.reason, message: who.message })

  const parsed = readBody(req.body)
  if (parsed.error) return say(res, 400, parsed.error)

  const k = stripeKey()
  if (k.problem) return say(res, k.problem[0], k.problem[1])

  let existing
  try {
    existing = await currentMembership(who.user.id)
  } catch (e) {
    logProblem('reading the membership row', e)
    return say(res, 502, "We couldn't check your account just now. Please try again in a moment.")
  }
  if (existing && ['active', 'trialing', 'past_due', 'unpaid'].includes(existing.status)) {
    return say(res, 409, 'You already have passes. You can change them from your account instead.', { reason: 'already_member' })
  }

  // Our own table might not have caught up (a payment made but not yet recorded). So ask STRIPE too: if this person already holds passes there, do not take a second payment,
  // and put their membership right in our table while we are about it.
  let heldInStripe = null
  try {
    heldInStripe = await findHeldSubscription(who.user.id, who.user.email, k.key)
  } catch (e) {
    logProblem('looking for an existing subscription', e)
    return say(res, 502, "We couldn't check your account just now. Please try again in a moment.")
  }
  if (heldInStripe) {
    try {
      const row = membershipRowFromSubscription(heldInStripe)
      if (row) await saveMembership(row)
    } catch (e) {
      logProblem('putting a membership right', e)
    }
    return say(res, 409, 'You already have passes. If they have not shown on your account yet, give it a minute and refresh the page.', { reason: 'already_member' })
  }

  try {
    let promotionCodeId = null
    let offerNote = ''
    if (parsed.code) {
      const found = await findPromotionCode(parsed.code, k.key)
      if (!found) return say(res, 400, 'That code is not valid, or it has ended.')
      promotionCodeId = found.id
      offerNote = found.summary // kept on the subscription, so My passes can say what discount someone has
    }
    const launch = Boolean(LAUNCH_OFFER.active) && !promotionCodeId
    if (launch) await ensureLaunchCoupon(parsed.interval, k.key)

    const form = buildCheckoutForm({
      user: who.user,
      passes: parsed.passes,
      interval: parsed.interval,
      promotionCodeId,
      launch,
      offerNote,
      consentAt: new Date().toISOString(),
      returnTo,
      customerId: existing && existing.stripe_customer_id ? existing.stripe_customer_id : null,
    })
    const response = await fetch(`${STRIPE}/v1/checkout/sessions`, {
      method: 'POST',
      headers: stripeHeaders(k.key, { 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: form.toString(),
      signal: AbortSignal.timeout(15000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data || typeof data.url !== 'string') {
      logProblem('starting a payment', new Error(`stripe answered ${response.status}${data && data.error && data.error.message ? `: ${data.error.message}` : ''}`))
      return say(res, 502, "We couldn't start the payment just now. Please try again in a moment.")
    }
    return res.status(200).json({ ok: true, url: data.url, mode: k.mode })
  } catch (e) {
    logProblem('starting a payment', e)
    return say(res, 502, "We couldn't start the payment just now. Please try again in a moment.")
  }
}
