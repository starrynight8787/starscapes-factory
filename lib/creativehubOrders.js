// Placing an order with Creative Hub, and reading one back. Plain logic with thin calls, so all of it can be tried without Creative Hub.
//
// What Creative Hub's own documentation says (read on 16 October 2026):
//   POST /v1/orders       items[] (variant_id, quantity), delivery_name, delivery_line1, delivery_city and delivery_country_code are
//                         required. delivery_postcode, delivery_county, delivery_phone and delivery_email are optional, and "line2" is
//                         mentioned as optional without its field being named. Answers 201 with { order_id, order_number, currency,
//                         total_incl_vat, lines }, or 409 delivery_zone_unavailable, in which case nothing is placed.
//   GET  /v1/orders       your orders, newest first (limit and offset). GET /v1/orders/{order_id} is one order with its items and
//                         their production status.
//   There is NO reference field on an order, so Creative Hub cannot stop a duplicate: that protection is ours alone.
//   There are no webhooks yet, so an order's progress is read by asking for it.
//
// This file never prints, logs or returns the API key.

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()

export const DEFAULT_BASE = 'https://escher-v2.creativehub.io'
export const LIMITS = { lines: 20, qtyMin: 1, qtyMax: 50, text: 120, phone: 30, postcode: 20 }

// The documentation says "line2 optional" without giving its field name. Until Creative Hub confirms it, a second address line is joined
// onto the first, so it can never be lost or refused. When the name is confirmed, put it here (for example 'delivery_line2').
export const LINE2_FIELD = null

// ---------- settings ----------
export function creativehubSettings(env = process.env) {
  const token = clean(env.CREATIVEHUB_API_KEY || env.CREATIVEHUB_API_TOKEN)
  const raw = clean(env.CREATIVEHUB_API_BASE) || DEFAULT_BASE
  const base = /^https:\/\/[^\s/]+/i.test(raw) ? raw.replace(/\/+$/, '') : '' // never send the key over anything but https
  return { token, base }
}
export const settingsUsable = (s) => Boolean(s && s.token && s.base)
export const SETTINGS_PROBLEM = 'CREATIVEHUB_API_KEY is not set in Vercel (or CREATIVEHUB_API_BASE does not start with https://), so nothing could be ordered.'

const authHeaders = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra })

// ---------- turning a saved order into what Creative Hub asks for ----------
const tidy = (v, max = LIMITS.text) => clean(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const tidyPhone = (v) => {
  const p = clean(v).replace(/[^\d+()\-\s.]/g, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.phone)
  return (p.match(/\d/g) || []).length >= 6 ? p : ''
}
const fail = (message) => ({ ok: false, message })

// The customer's email is deliberately NOT sent: Creative Hub does not email buyers, so it would only be spreading it for no benefit.
export function buildPayload(order) {
  const items = Array.isArray(order && order.items) ? order.items : []
  if (items.length === 0) return fail('The order has no items.')
  if (items.length > LIMITS.lines) return fail(`The order has more than ${LIMITS.lines} lines, which Creative Hub does not take in one order.`)
  const lines = []
  for (let n = 0; n < items.length; n += 1) {
    const item = items[n] || {}
    const id = clean(item.ch_variant_id)
    if (!id || id.length > 100 || /\s/.test(id)) return fail(`Item ${n + 1} could not be matched to a Creative Hub print.`)
    const qty = typeof item.qty === 'number' ? item.qty : Number(clean(item.qty))
    if (!Number.isInteger(qty) || qty < LIMITS.qtyMin || qty > LIMITS.qtyMax) return fail(`Item ${n + 1} has a quantity Creative Hub cannot take (it must be ${LIMITS.qtyMin} to ${LIMITS.qtyMax}).`)
    lines.push({ variant_id: id, quantity: qty })
  }
  const ship = order && order.shipping && typeof order.shipping === 'object' ? order.shipping : {}
  const a = ship.address && typeof ship.address === 'object' ? ship.address : {}
  const name = tidy(ship.name || (order && order.customer_name))
  const line1 = tidy(a.line1)
  const line2 = tidy(a.line2)
  const city = tidy(a.city)
  const country = clean(a.country).toUpperCase()
  if (!name) return fail('There is no delivery name.')
  if (!line1) return fail('The delivery address has no first line.')
  if (!city) return fail('The delivery address has no town or city.')
  if (!/^[A-Z]{2}$/.test(country)) return fail('The delivery address has no valid country.')

  const payload = {
    items: lines,
    delivery_name: name,
    delivery_line1: line2 && !LINE2_FIELD ? tidy(`${line1}, ${line2}`, LIMITS.text * 2) : line1,
    delivery_city: city,
    delivery_country_code: country,
  }
  if (line2 && LINE2_FIELD) payload[LINE2_FIELD] = line2
  const postcode = tidy(a.postal_code, LIMITS.postcode)
  if (postcode) payload.delivery_postcode = postcode
  const county = tidy(a.state)
  if (county) payload.delivery_county = county
  const phone = tidyPhone(order && order.customer_phone)
  if (phone) payload.delivery_phone = phone
  return { ok: true, payload }
}

// ---------- plain words for what Creative Hub said ----------
export function describeFailure(status, body) {
  const code = body && typeof body.error_code === 'string' ? body.error_code : ''
  const said = tidy(body && (body.message || body.error), 200).replace(/[A-Za-z0-9._-]{30,}/g, '…')
  const tail = said ? ` They said: ${said}` : ''
  if (status === 409 && code === 'delivery_zone_unavailable') {
    const where = tidy(body && body.country, 8)
    return `Creative Hub has no delivery rate for ${where || 'that country'}, so this order needs a manual quote.${tail}`
  }
  if (status === 401) return 'Creative Hub did not accept the API key. It may be wrong, revoked, or copied with a space.'
  if (status === 403) return 'Creative Hub read the key, but API access is not switched on for this account.'
  if (status === 404) return `Creative Hub could not find one of the prints on this order.${tail}`
  if (status === 429) return 'Creative Hub was too busy just now (too many requests). Nothing was ordered.'
  if (status === 400 || status === 422) return `Creative Hub refused the order as it was sent.${tail}`
  if (status === 409) return `Creative Hub refused the order.${tail}`
  return `Creative Hub answered with status ${status}.${tail}`
}

// ---------- placing an order ----------
// Three honest answers, because the third matters most:
//   placed    Creative Hub says it has the order.
//   rejected  Creative Hub definitely did NOT place it (it said no), so it is safe to try again once the cause is fixed.
//   unknown   we cannot tell (no answer, a timeout, a server error, or a yes with no order number). It MAY exist, so never resend blindly.
export async function placeOrder(payload, { token, base, fetchImpl, timeoutMs = 15000 } = {}) {
  const call = fetchImpl || ((...args) => fetch(...args))
  let response
  try {
    response = await call(`${base}/v1/orders`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (e) {
    return { outcome: 'unknown', message: 'Creative Hub could not be reached, or did not answer in time.' }
  }
  let body = null
  try {
    body = await response.json()
  } catch (e) {
    body = null
  }
  const status = response.status
  const gaveId = body && (typeof body.order_id === 'string' || typeof body.order_id === 'number') && clean(body.order_id)
  if ((status === 201 || status === 200) && gaveId) {
    return { outcome: 'placed', orderId: clean(body.order_id), orderNumber: clean(body.order_number), currency: clean(body.currency), total: clean(body.total_incl_vat) }
  }
  if (status === 201 || status === 200) return { outcome: 'unknown', message: 'Creative Hub said yes but did not say which order it was.' }
  if ([400, 401, 403, 404, 409, 422, 429].includes(status)) return { outcome: 'rejected', status, message: describeFailure(status, body) }
  return { outcome: 'unknown', message: `Creative Hub answered with status ${status}, which does not say whether the order was placed.` }
}

// What to write on the order row for each answer
export function patchFor(result, now = new Date()) {
  if (result.outcome === 'placed') {
    const number = result.orderNumber ? ` as order ${result.orderNumber}` : ''
    return {
      status: 'sent',
      creativehub_order_id: result.orderId,
      creativehub_order_number: result.orderNumber || null,
      creativehub_status: 'ordered',
      sent_at: now.toISOString(),
      note: `Sent to Creative Hub${number}.`,
    }
  }
  if (result.outcome === 'rejected') return { status: 'needs_attention', note: `${result.message} Nothing was ordered.` }
  return {
    status: 'check_creativehub',
    note: `Could not tell whether Creative Hub received this order. ${result.message} Do NOT send it again until you have looked for it in Creative Hub's orders.`,
  }
}

// ---------- reading orders back ----------
async function getJson(path, { token, base, fetchImpl, timeoutMs = 10000 }) {
  const call = fetchImpl || ((...args) => fetch(...args))
  let response
  try {
    response = await call(`${base}${path}`, { headers: authHeaders(token), signal: AbortSignal.timeout(timeoutMs) })
  } catch (e) {
    return { ok: false, status: 0, body: null, message: 'Creative Hub could not be reached just now.' }
  }
  let body = null
  try {
    body = await response.json()
  } catch (e) {
    body = null
  }
  return { ok: response.ok, status: response.status, body, message: response.ok ? '' : describeFailure(response.status, body) }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/
export const isSafeOrderId = (id) => typeof id === 'string' && SAFE_ID.test(id)

export const getOrder = (id, ctx) => (isSafeOrderId(id) ? getJson(`/v1/orders/${encodeURIComponent(id)}`, ctx) : Promise.resolve({ ok: false, status: 0, body: null, message: 'That is not a Creative Hub order id.' }))
export const listOrders = (ctx, limit = 30) => getJson(`/v1/orders?limit=${Math.min(Math.max(Number(limit) || 30, 1), 100)}&offset=0`, ctx)

// A few safe words about where one order stands. The documentation does not name the statuses, so this reads what is there and
// invents nothing: the order's own status if it has one, otherwise the item statuses.
export function summariseOrder(chOrder) {
  const o = chOrder && typeof chOrder === 'object' ? chOrder : {}
  const own = tidy(o.status, 60)
  const items = Array.isArray(o.items) ? o.items : []
  const each = [...new Set(items.map((i) => tidy(i && (i.status || i.production_status), 60)).filter(Boolean))]
  return {
    status: own || each.join(', ') || 'unknown',
    due: tidy(o.date_due, 40),
    number: tidy(o.order_number, 60),
    items: each,
  }
}

// Looking through Creative Hub's list for an order that is probably this one. The documentation does not name the fields of the
// delivery summary, so this compares text: the postcode (or the town) and the surname must both appear in the entry.
const flat = (v) => clean(v).toLowerCase().replace(/[^a-z0-9]/g, '')
export function candidatesFor(order, entries) {
  const ship = order && order.shipping && typeof order.shipping === 'object' ? order.shipping : {}
  const a = ship.address && typeof ship.address === 'object' ? ship.address : {}
  const surname = flat(clean(ship.name || (order && order.customer_name)).split(/\s+/).filter(Boolean).pop())
  const place = flat(a.postal_code) || flat(a.city)
  if (!surname || !place || !Array.isArray(entries)) return []
  return entries
    .filter((e) => e && typeof e === 'object')
    .filter((e) => {
      const text = flat(JSON.stringify(e))
      return text.includes(surname) && text.includes(place)
    })
    .map((e) => ({
      id: tidy(e.order_id !== undefined ? e.order_id : e.id, 64),
      number: tidy(e.order_number, 60),
      status: tidy(e.status, 60),
      total: tidy(e.total_incl_vat, 20),
    }))
    .filter((c) => isSafeOrderId(c.id))
}
