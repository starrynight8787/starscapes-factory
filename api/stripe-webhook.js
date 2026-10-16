// Vercel serverless function: Stripe tells the shop that a payment has been made, and the shop records it as an order.
//
// Rules this keeps:
//   - It only believes a message that Stripe has signed with STRIPE_WEBHOOK_SECRET. Anything else is thrown away.
//   - One payment, one order: the payment's reference is unique in the orders table, so if Stripe repeats a message
//     (it does, sometimes), the second copy changes nothing.
//   - A TEST payment is recorded and marked "test, not sent". It never orders anything.
//   - A REAL payment is recorded FIRST, as "sending", and only then sent to Creative Hub. Creative Hub has no reference field to
//     stop a duplicate, so this is the protection: the order row exists before anything is sent, and a repeated message from
//     Stripe finds it already there and does nothing.
//   - What Creative Hub answers is written on the order in plain words: "sent", "needs attention" (it definitely said no, so it is
//     safe to try again), or "check Creative Hub" (the answer was lost, so it may or may not exist, and it is never resent blindly).
//   - A REAL payment that cannot be ordered (an item that cannot be matched, an incomplete address, no Creative Hub key) is
//     recorded as "needs attention" with the reason, so it can never go unnoticed.
//   - If something temporary goes wrong BEFORE the order is saved (Stripe or the database cannot be reached), it answers with an
//     error so Stripe sends the message again later. It never throws a paid order away.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { serviceFetch } from '../lib/serviceKey.js'
import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, buildPayload } from '../lib/creativehubOrders.js'
import { placeAndRecord } from '../lib/orderFlow.js'

// Stripe signs the exact bytes it sends, so the body must reach us untouched. This uses the standard web request form
// (request.text() gives the raw body), which is the way Vercel's own guide recommends for webhooks.
export const config = { maxDuration: 30 }

const STRIPE = 'https://api.stripe.com'
const TOLERANCE_SECONDS = 300
const WANTED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const clean = (v) => String(v || '').trim()
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export function signatureIsGood(raw, header, secret, nowMs = Date.now()) {
  const parts = String(header || '').split(',').map((p) => p.trim().split('='))
  const t = (parts.find(([k]) => k === 't') || [])[1]
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v)
  if (!t || !/^\d+$/.test(t) || signatures.length === 0) return false
  if (Math.abs(nowMs / 1000 - Number(t)) > TOLERANCE_SECONDS) return false // too old: could be someone replaying a stolen message
  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex'))
  return signatures.some((s) => {
    const given = Buffer.from(String(s))
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

async function fetchSession(id, key) {
  const response = await fetch(`${STRIPE}/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items.data.price.product`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`stripe answered ${response.status}`)
  return response.json()
}

function buildOrder(event, session, readFully) {
  const details = session.customer_details || {}
  const collected = session.collected_information && session.collected_information.shipping_details // newer Stripe versions
  const ship = collected || session.shipping_details || null
  const lines = (session.line_items && session.line_items.data) || []
  const items = lines.map((l) => {
    const product = l.price && l.price.product && typeof l.price.product === 'object' ? l.price.product : {}
    const md = product.metadata || {}
    return {
      variant_id: md.variant_id || null,
      ch_variant_id: md.ch_variant_id || null,
      title: product.name || l.description || '',
      description: product.description || null,
      qty: l.quantity,
      unit_amount: l.price ? l.price.unit_amount : null,
    }
  })
  const unmatched = items.some((i) => !i.ch_variant_id)
  const live = Boolean(event.livemode)
  const draft = {
    customer_name: details.name || (ship && ship.name) || null,
    customer_phone: details.phone || null,
    shipping: ship ? { name: ship.name || null, address: ship.address || null } : null,
    items,
  }
  let status, note
  if (!live) {
    status = 'test_not_sent'
    note = 'Test payment. No Creative Hub order is placed for test payments.'
  } else {
    // A real payment goes to Creative Hub unless something stops it, and then the reason is written down plainly.
    const built = buildPayload(draft)
    const reason = !readFully
      ? 'The items could not be read from Stripe, because the Stripe key in Vercel is for the other mode. Look the payment up in Stripe and place this order by hand.'
      : unmatched
        ? 'Some items could not be matched to a Creative Hub print. Place this order by hand.'
        : !built.ok
          ? `${built.message} Place this order by hand.`
          : !settingsUsable(creativehubSettings())
            ? `${SETTINGS_PROBLEM} Add it, redeploy, then press Send on this order.`
            : ''
    if (reason) {
      status = 'needs_attention'
      note = `Paid for real, but nothing was ordered. ${reason}`
    } else {
      status = 'sending'
      note = 'Sending to Creative Hub…'
    }
  }
  return {
    stripe_session_id: session.id,
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent && session.payment_intent.id) || null,
    livemode: live,
    status,
    customer_name: draft.customer_name,
    customer_email: details.email || null,
    customer_phone: draft.customer_phone,
    shipping: draft.shipping,
    amount_total: Number.isInteger(session.amount_total) ? session.amount_total : null,
    currency: session.currency || null,
    items,
    note,
  }
}

// Returns 'saved', or 'duplicate' if this payment is already recorded
async function saveOrder(order) {
  const response = await serviceFetch('/rest/v1/orders?on_conflict=stripe_session_id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(order),
  })
  if (!response.ok) throw new Error(`database answered ${response.status}`)
  const rows = await response.json()
  return Array.isArray(rows) && rows.length > 0 ? 'saved' : 'duplicate'
}

// Anything but a POST gets a polite no (Vercel itself refuses methods that are not exported)
export function GET() {
  return reply(405, { ok: false, message: 'This address only takes messages from Stripe.' })
}

export async function POST(request) {
  const secret = clean(process.env.STRIPE_WEBHOOK_SECRET)
  if (!secret) return reply(503, { ok: false, message: 'STRIPE_WEBHOOK_SECRET is not set on this deployment.' })

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
  const session = event.data && event.data.object
  if (!session || typeof session.id !== 'string') return reply(400, { ok: false, message: 'That message had no payment in it.' })
  if (session.payment_status !== 'paid') return reply(200, { ok: true, ignored: 'not paid yet' })

  try {
    const key = clean(process.env.STRIPE_SECRET_KEY)
    const keyIsLive = /^(sk|rk)_live_/.test(key)
    const keyMatchesEvent = Boolean(key) && keyIsLive === Boolean(event.livemode)
    // Read the full payment, with what was bought. If the key is for the other mode that is impossible, so record what the
    // message itself says and flag it, rather than lose a paid order.
    const full = keyMatchesEvent ? await fetchSession(session.id, key) : session
    const order = buildOrder(event, full, keyMatchesEvent)

    // 1. Save the order first. For a real payment this is also the "claim": if a repeat of this message finds the order already
    //    there, it does nothing, so one payment can never become two orders at Creative Hub.
    const outcome = await saveOrder(order)
    if (outcome === 'duplicate' || order.status !== 'sending') return reply(200, { ok: true, order: outcome })

    // 2. Only now send it. This never throws, and never makes Stripe repeat the message: if what comes back is lost, the order says
    //    so and waits for you, rather than being sent a second time.
    const sent = await placeAndRecord(order, `stripe_session_id=eq.${encodeURIComponent(order.stripe_session_id)}`)
    return reply(200, { ok: true, order: outcome, creativehub: sent.patch.status })
  } catch (e) {
    // The detail is one of this file's own short messages (never a key), and only Stripe, with a valid signature, ever sees it
    return reply(500, { ok: false, message: 'Could not record the order just now. Stripe will send it again.', detail: String((e && e.message) || '').slice(0, 120) })
  }
}
