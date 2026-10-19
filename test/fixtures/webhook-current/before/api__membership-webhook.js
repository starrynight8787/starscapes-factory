// Vercel serverless function: Stripe tells the site that a membership was paid for, changed or cancelled, and the site records it.
//
// It has its OWN address and its OWN signing secret (STRIPE_MEMBERSHIP_WEBHOOK_SECRET), separate from the shop's, so nothing here can touch print orders.
//
// Rules this keeps:
//   - It only believes a message that Stripe has signed with that secret. Anything else is thrown away.
//   - It never trusts what a message SAYS about a membership. It takes the subscription's id from the message and asks Stripe for its CURRENT state, so a message that
//     arrives late, early or twice cannot leave a membership in the wrong state. One person, one row: saving is "insert or update", so repeats change nothing.
//   - A subscription that did not come from our checkout (no user on it) is ignored.
//   - If something temporary goes wrong (Stripe or the database cannot be reached), it answers with an error so Stripe sends the message again later.

import { signatureIsGood } from './stripe-webhook.js'
import { serviceFetch } from '../lib/serviceKey.js'
import { fetchSubscription, membershipRowFromSubscription, stripeMode, logProblem } from '../lib/membershipStripe.js'

export const config = { maxDuration: 30 }

const WANTED = new Set(['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'])
const clean = (v) => String(v || '').trim()
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function saveMembership(row) {
  const response = await serviceFetch('/rest/v1/memberships?on_conflict=user_id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  })
  if (!response.ok) throw new Error(`database answered ${response.status}`)
}

export function GET() {
  return reply(405, { ok: false, message: 'This address only takes messages from Stripe.' })
}

export async function POST(request) {
  const secret = clean(process.env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET)
  if (!secret) return reply(503, { ok: false, message: 'STRIPE_MEMBERSHIP_WEBHOOK_SECRET is not set on this deployment.' })

  const raw = await request.text()
  const signature = request.headers.get('stripe-signature') || ''
  if (!signatureIsGood(raw, signature, secret)) return reply(400, { ok: false, message: 'The signature did not match, so this was ignored.' })

  let event
  try {
    event = JSON.parse(raw)
  } catch (e) {
    return reply(400, { ok: false, message: 'That was not a Stripe message.' })
  }
  if (!event || !WANTED.has(event.type)) return reply(200, { ok: true, ignored: event && event.type })
  const object = event.data && event.data.object
  if (!object) return reply(400, { ok: false, message: 'That message had nothing in it.' })

  // Which subscription is this about?
  let subscriptionId = ''
  if (event.type === 'checkout.session.completed') {
    if (object.mode !== 'subscription') return reply(200, { ok: true, ignored: 'not a membership' }) // a print order: the shop's own listener deals with it
    subscriptionId = typeof object.subscription === 'string' ? object.subscription : (object.subscription && object.subscription.id) || ''
  } else {
    subscriptionId = clean(object.id)
  }
  if (!subscriptionId) return reply(200, { ok: true, ignored: 'no subscription' })

  const key = clean(process.env.STRIPE_SECRET_KEY)
  const keyMode = stripeMode(key)
  // A message from the other mode (a test message with a live key, or the reverse) cannot be read: say so, and do not pretend.
  if (keyMode === 'unknown' || (keyMode === 'live') !== Boolean(event.livemode)) return reply(200, { ok: true, ignored: 'wrong mode for this key' })

  try {
    const sub = await fetchSubscription(subscriptionId, key)
    const row = membershipRowFromSubscription(sub)
    if (!row) return reply(200, { ok: true, ignored: 'not from our checkout' })
    await saveMembership(row)
    return reply(200, { ok: true, membership: row.status })
  } catch (e) {
    logProblem(`recording a membership (${event.type})`, e)
    return reply(500, { ok: false, message: 'Could not record the membership just now. Stripe will send it again.', detail: String((e && e.message) || '').slice(0, 120) })
  }
}
