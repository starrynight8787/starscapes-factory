// Vercel serverless function: Stripe tells the shop that a payment has been made, and the shop records it as an order.
//
// Rules this keeps:
//   - It only believes a message that Stripe has signed with STRIPE_WEBHOOK_SECRET. Anything else is thrown away.
//   - One payment, one order: the payment's reference is unique in the orders table, so if Stripe repeats a message
//     (it does, sometimes), the second copy changes nothing.
//   - A TEST payment is recorded and marked "test, not sent". It never orders anything.
//   - A REAL payment that cannot be ordered yet is recorded as "needs attention", so it can never go unnoticed.
//   - If something temporary goes wrong (Stripe or the database cannot be reached), it answers with an error so Stripe
//     sends the message again later. It never throws a paid order away.
//
// Ordering from Creative Hub is not connected yet. It will be added at the marked place below.

import { createHmac, timingSafeEqual } from 'node:crypto'

// Stripe signs the exact bytes it sends, so the body must reach us unparsed
export const config = { api: { bodyParser: false }, maxDuration: 30 }

const STRIPE = 'https://api.stripe.com'
const TOLERANCE_SECONDS = 300
const WANTED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const clean = (v) => String(v || '').trim()
const reply = (res, status, body) => res.status(status).json(body)

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

async function readRaw(req) {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function database() {
  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) throw new Error('database settings missing')
  return { url, key }
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
  let status, note
  if (!live) {
    status = 'test_not_sent'
    note = 'Test payment. No Creative Hub order is placed for test payments.'
  } else {
    status = 'needs_attention'
    note = 'Paid for real, but ordering from Creative Hub is not connected yet. Place this order by hand.'
  }
  if (!readFully) note += ' The items could not be read from Stripe, because the Stripe key in Vercel is for the other mode. Look the payment up in Stripe.'
  else if (unmatched) {
    if (live) status = 'needs_attention'
    note += ' Some items could not be matched to a Creative Hub print.'
  }
  return {
    stripe_session_id: session.id,
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent && session.payment_intent.id) || null,
    livemode: live,
    status,
    customer_name: details.name || (ship && ship.name) || null,
    customer_email: details.email || null,
    customer_phone: details.phone || null,
    shipping: ship ? { name: ship.name || null, address: ship.address || null } : null,
    amount_total: Number.isInteger(session.amount_total) ? session.amount_total : null,
    currency: session.currency || null,
    items,
    note,
  }
}

// Returns 'saved', or 'duplicate' if this payment is already recorded
async function saveOrder(order) {
  const { url, key } = database()
  const response = await fetch(`${url}/rest/v1/orders?on_conflict=stripe_session_id`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(order),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`database answered ${response.status}`)
  const rows = await response.json()
  return Array.isArray(rows) && rows.length > 0 ? 'saved' : 'duplicate'
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return reply(res, 405, { ok: false, message: 'This address only takes messages from Stripe.' })
  }
  const secret = clean(process.env.STRIPE_WEBHOOK_SECRET)
  if (!secret) return reply(res, 503, { ok: false, message: 'STRIPE_WEBHOOK_SECRET is not set on this deployment.' })

  const raw = await readRaw(req)
  const signature = (req.headers && (req.headers['stripe-signature'] || req.headers['Stripe-Signature'])) || ''
  if (!signatureIsGood(raw, signature, secret)) return reply(res, 400, { ok: false, message: 'The signature did not match, so this was ignored.' })

  let event
  try {
    event = JSON.parse(raw)
  } catch (e) {
    return reply(res, 400, { ok: false, message: 'That was not a Stripe message.' })
  }
  if (!event || !WANTED.has(event.type)) return reply(res, 200, { ok: true, ignored: event && event.type })
  const session = event.data && event.data.object
  if (!session || typeof session.id !== 'string') return reply(res, 400, { ok: false, message: 'That message had no payment in it.' })
  if (session.payment_status !== 'paid') return reply(res, 200, { ok: true, ignored: 'not paid yet' })

  try {
    const key = clean(process.env.STRIPE_SECRET_KEY)
    const keyIsLive = /^(sk|rk)_live_/.test(key)
    const keyMatchesEvent = Boolean(key) && keyIsLive === Boolean(event.livemode)
    // Read the full payment, with what was bought. If the key is for the other mode that is impossible, so record what the
    // message itself says and flag it, rather than lose a paid order.
    const full = keyMatchesEvent ? await fetchSession(session.id, key) : session
    const order = buildOrder(event, full, keyMatchesEvent)

    // ---- Ordering from Creative Hub will go here: only for order.livemode === true, with the payment reference as the idempotency key ----

    const outcome = await saveOrder(order)
    return reply(res, 200, { ok: true, order: outcome })
  } catch (e) {
    return reply(res, 500, { ok: false, message: 'Could not record the order just now. Stripe will send it again.' })
  }
}
