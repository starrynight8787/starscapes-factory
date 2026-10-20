// The things a member does to their OWN passes. (Not a function of its own: the free Vercel plan allows only 12 functions, so api/membership-checkout.js hands these requests to this
// file. The page asks api/membership-checkout?account=1, or sends an action of portal, resume or change.) Only the person who holds them can use it (it checks their sign-in), and it only ever touches
// THEIR membership: nothing in a request says whose it is.
//
//   GET                       the card on file (brand and last four digits only), for the My passes page
//   POST { action: 'portal' } a link to Stripe's own page for changing a card, seeing receipts and cancelling
//   POST { action: 'resume' } takes back a cancellation (passes that were going to end will carry on)
//   POST { action: 'change', passes: [...], consent: true }  changes which passes they hold
//
// How a change works (a decision for Gill to confirm): it starts TODAY, and the new price applies from the NEXT payment. Nothing is charged or credited today, and nothing is
// refunded for a pass taken away. Adding a pass opens it straight away, so the person must tick the same agreement as at checkout (the 14-day right to cancel is lost for it).
// The price is always worked out here from the same rules as the page; nothing about price is read from the browser.
//
// While MEMBERSHIPS ARE CLOSED this works for anyone who already holds passes (the owner, testing). It takes no new payment, so it needs no open switch. It refuses a LIVE Stripe
// key, like the checkout does.

import { requireUser } from './userGuard.js'
import { serviceFetch } from './serviceKey.js'
import { cleanPassIds } from '../src/membership/passes.js'
import { stripeMode, ensureProduct, logProblem, fetchSubscription, buildChangeForm, updateSubscription, setCancelAtPeriodEnd, cardOnFile, createPortalSession, membershipRowFromSubscription } from './membershipStripe.js'
import { saveMembership } from '../api/membership-webhook.js'
import { changeWindow, closedMessage } from '../src/membership/changeWindow.js'

const SITE = 'https://starscapesfactory.com'
const clean = (v) => String(v || '').trim()
const say = (res, status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra })

function allowedOrigins() {
  const list = new Set([SITE, 'https://www.starscapesfactory.com', 'http://localhost:5173'])
  if (clean(process.env.SITE_URL)) list.add(clean(process.env.SITE_URL).replace(/\/+$/, ''))
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) if (clean(host)) list.add(`https://${clean(host)}`)
  return list
}

function stripeKey() {
  const key = clean(process.env.STRIPE_SECRET_KEY)
  if (!key) return { problem: [503, "Memberships aren't switched on yet."] }
  const mode = stripeMode(key)
  if (mode === 'unknown') return { problem: [503, "Memberships aren't set up correctly yet."] }
  if (mode === 'live') return { problem: [503, 'Memberships are not open for real payments yet.'] }
  return { key }
}

// THIS person's own row, and nobody else's
async function myMembership(userId) {
  const response = await serviceFetch(`/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}&select=status,passes,stripe_customer_id,stripe_subscription_id,cancel_at_period_end,current_period_end`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`database answered ${response.status}`)
  const rows = await response.json()
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

const HOLDING = ['active', 'trialing']
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

const ACTIONS = ['portal', 'resume', 'change']

// Is this request for a member's own passes (rather than starting a payment)? A GET with account=1, or a POST that names one of the three actions.
export function isAccountRequest(req) {
  if (!req) return false
  if (req.method === 'GET') return clean(req.query && req.query.account) === '1'
  if (req.method !== 'POST') return false
  let body = req.body
  if (typeof body === 'string') {
    if (body.length > 4000) return false
    try {
      body = JSON.parse(body)
    } catch (e) {
      return false
    }
  }
  return Boolean(body && typeof body === 'object' && ACTIONS.includes(body.action))
}

export async function handleAccount(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return say(res, 405, 'This is used from your account page.')
  }
  const origins = allowedOrigins()
  const origin = clean(req.headers && req.headers.origin)
  if (req.method === 'POST' && origin && !origins.has(origin)) return say(res, 403, 'That request did not come from the site.')
  const returnTo = origin || SITE

  const who = await requireUser(req)
  if (!who.ok) return res.status(who.status).json({ ok: false, reason: who.reason, message: who.message })
  const k = stripeKey()
  if (k.problem) return say(res, k.problem[0], k.problem[1])

  let row
  try {
    row = await myMembership(who.user.id)
  } catch (e) {
    logProblem('reading the membership row', e)
    return say(res, 502, "We couldn't check your account just now. Please try again in a moment.")
  }

  if (req.method === 'GET') {
    if (!row || !row.stripe_subscription_id) return res.status(200).json({ ok: true, card: null })
    try {
      return res.status(200).json({ ok: true, card: await cardOnFile(row.stripe_subscription_id, row.stripe_customer_id, k.key) })
    } catch (e) {
      return res.status(200).json({ ok: true, card: null }) // the card line is a nicety: never let it stop the page
    }
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body.length > 4000 ? '{}' : body)
    } catch (e) {
      body = {}
    }
  }
  body = body && typeof body === 'object' ? body : {}
  if (!row || !row.stripe_subscription_id) return say(res, 404, "You don't have any passes yet.", { reason: 'no_membership' })

  try {
    if (body.action === 'portal') {
      if (!row.stripe_customer_id) return say(res, 404, "You don't have any passes yet.", { reason: 'no_membership' })
      try {
        return res.status(200).json({ ok: true, url: await createPortalSession(row.stripe_customer_id, `${returnTo}/membership/passes`, k.key) })
      } catch (e) {
        if (e && e.code === 'portal_not_set_up') return say(res, 503, "The page for changing your card isn't switched on yet. We're sorting it out.", { reason: 'portal_not_set_up' })
        throw e
      }
    }

    if (body.action === 'resume') {
      if (!HOLDING.includes(row.status) || row.cancel_at_period_end !== true) return say(res, 409, 'There is nothing to take back: your passes are not set to end.')
      const updated = await setCancelAtPeriodEnd(row.stripe_subscription_id, false, k.key)
      const fresh = membershipRowFromSubscription(await fetchSubscription(updated.id || row.stripe_subscription_id, k.key))
      if (fresh) await saveMembership(fresh)
      return res.status(200).json({ ok: true })
    }

    if (body.action === 'change') {
      if (!HOLDING.includes(row.status) || row.cancel_at_period_end === true) return say(res, 409, 'You can change your passes while they are open and not set to end.')
      // Only in the last few days before the next payment (see src/membership/changeWindow.js)
      const win = changeWindow(row)
      if (!win.open) return say(res, 409, closedMessage(win), { reason: 'change_window_closed', opensAt: win.opensAt, nextPayment: win.nextPayment })
      const wanted = cleanPassIds(body.passes)
      if (wanted.length === 0) return say(res, 400, 'To stop all your passes, use "Manage payment or cancel" instead.')
      const current = cleanPassIds(row.passes)
      if (sameList(wanted, current)) return say(res, 400, 'Nothing has changed yet. Tick or untick a pass first.')
      const added = wanted.filter((id) => !current.includes(id))
      const removed = current.filter((id) => !wanted.includes(id))
      // A pass added opens straight away, so the agreement to that is needed again (exactly as at checkout)
      if (added.length > 0 && body.consent !== true) return say(res, 400, 'Please tick the box to open your new passes now. We need your agreement first.')
      const now = new Date().toISOString()
      const subscription = await fetchSubscription(row.stripe_subscription_id, k.key)
      const productId = await ensureProduct(k.key, undefined, wanted) // a product named for the passes they are changing to, so the invoice names them
      const form = buildChangeForm({ subscription, passes: wanted, changedAt: now, added, removed, consentAt: added.length > 0 ? now : '', productId })
      const updated = await updateSubscription(row.stripe_subscription_id, form, k.key)
      const fresh = membershipRowFromSubscription(updated)
      if (fresh) await saveMembership(fresh)
      return res.status(200).json({ ok: true, passes: wanted, added, removed })
    }

    return say(res, 400, 'That did not look right. Please try again.')
  } catch (e) {
    logProblem(`account action ${clean(body.action)}`, e)
    return say(res, 502, "We couldn't do that just now. Please try again in a moment.")
  }
}
