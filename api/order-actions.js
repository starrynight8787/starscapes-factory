// Vercel serverless function: the owner's buttons on the Orders panel. Locked to the shop owner.
//
//   refresh  ask Creative Hub where one order (or every order sent so far) stands, and write it down
//   check    look through Creative Hub's recent orders for one that looks like this order (changes nothing)
//   link     tell the shop "this order IS that Creative Hub order", once you have found it there
//   send     send an order to Creative Hub (again)
//   resend_confirmation  send the customer's confirmation email again (only if it has not gone)
//
// Rules this keeps:
//   - Only a real payment is ever sent. A test payment never is.
//   - An order that already has a Creative Hub order number is never sent again.
//   - An order whose answer was lost ("check Creative Hub") is only sent again after you say you have looked and it is not there.
//   - To send, the order is first CLAIMED (moved into "sending"), which only one caller can win, so two clicks, or a click and the
//     payment listener, can never both send it.
//   - Nothing here shows the Creative Hub key or the database key.

import { requireOwner, sendDenied } from '../lib/ownerGuard.js'
import { databaseUrl, serviceKeys, serviceFetch, saidWhat } from '../lib/serviceKey.js'
import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, getOrder, listOrders, summariseOrder, candidatesFor, isSafeOrderId, buildPayload } from '../lib/creativehubOrders.js'
import { patchOrder, claimOrder, placeAndRecord } from '../lib/orderFlow.js'
import { confirmOrder } from '../lib/orderConfirmation.js'

export const config = { maxDuration: 60 }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CHECKABLE = ['check_creativehub', 'sending', 'needs_attention'] // orders it makes sense to look for at Creative Hub
const STUCK_AFTER_MS = 5 * 60 * 1000 // an order still "sending" after five minutes is not in flight any more
const REFRESH_AT_MOST = 20
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const bad = (res, status, message) => res.status(status).json({ ok: false, message })

function readBody(req) {
  let body = req && req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (e) {
      body = null
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

async function loadOrder(id) {
  const response = await serviceFetch(`/rest/v1/orders?id=eq.${id}&select=*&limit=1`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`database answered ${response.status}`)
  const rows = await response.json()
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

// Creative Hub's list may come back as a plain list or wrapped in a field; read whichever it is
const entriesOf = (body) => (Array.isArray(body) ? body : body && Array.isArray(body.orders) ? body.orders : body && Array.isArray(body.data) ? body.data : null)

// ---------- refresh ----------
async function refresh(res, body, settings) {
  if (!settingsUsable(settings)) return bad(res, 503, SETTINGS_PROBLEM)
  let rows
  if (body.id !== undefined) {
    if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
    const row = await loadOrder(body.id)
    if (!row) return bad(res, 404, 'That order could not be found.')
    if (!row.creativehub_order_id) return bad(res, 409, 'That order has not been sent to Creative Hub, so there is nothing to refresh.')
    rows = [row]
  } else {
    const response = await serviceFetch(`/rest/v1/orders?status=eq.sent&creativehub_order_id=not.is.null&order=created_at.desc&limit=${REFRESH_AT_MOST}&select=*`, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`database answered ${response.status}`)
    rows = await response.json()
    if (!Array.isArray(rows)) rows = []
  }
  const results = []
  for (const row of rows) {
    const got = await getOrder(row.creativehub_order_id, settings)
    if (!got.ok) {
      results.push({ id: row.id, ok: false, message: got.message })
    } else {
      const s = summariseOrder(got.body)
      const saved = await patchOrder(`id=eq.${row.id}`, ['sent'], { creativehub_status: s.status, creativehub_due: s.due || null, creativehub_checked_at: new Date().toISOString() })
      results.push({ id: row.id, ok: saved.ok && saved.rows.length === 1, status: s.status, due: s.due })
    }
    if (rows.length > 1) await pause(300) // Creative Hub limits how fast it can be asked
  }
  const done = results.filter((r) => r.ok).length
  const message = rows.length === 0 ? 'No sent orders to check yet.' : `Checked ${done} of ${rows.length} ${rows.length === 1 ? 'order' : 'orders'} with Creative Hub.`
  return res.status(200).json({ ok: true, results, message })
}

// ---------- check ----------
async function check(res, body, settings) {
  if (!settingsUsable(settings)) return bad(res, 503, SETTINGS_PROBLEM)
  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
  const row = await loadOrder(body.id)
  if (!row) return bad(res, 404, 'That order could not be found.')
  if (!row.livemode) return bad(res, 409, 'That is a test payment, which is never sent to Creative Hub.')
  if (row.creativehub_order_id) return bad(res, 409, 'That order already has a Creative Hub order number.')
  if (!CHECKABLE.includes(row.status)) return bad(res, 409, 'There is nothing to look for: that order is not waiting on Creative Hub.')
  const list = await listOrders(settings, 50)
  if (!list.ok) return bad(res, 502, list.message || 'Creative Hub would not give its list of orders.')
  const entries = entriesOf(list.body)
  if (!entries) return bad(res, 502, "Creative Hub's list of orders was not in a shape I could read. Look for the order in Creative Hub yourself.")
  const candidates = candidatesFor(row, entries)
  return res.status(200).json({
    ok: true,
    candidates,
    searched: entries.length,
    message: candidates.length === 0
      ? `Looked through the latest ${entries.length} orders at Creative Hub and found nothing that looks like this one.`
      : `Found ${candidates.length} ${candidates.length === 1 ? 'order' : 'orders'} at Creative Hub that could be this one.`,
  })
}

// ---------- link ----------
async function link(res, body, settings) {
  if (!settingsUsable(settings)) return bad(res, 503, SETTINGS_PROBLEM)
  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
  const chId = body.creativehub_order_id
  if (!isSafeOrderId(chId)) return bad(res, 400, 'That is not a Creative Hub order id.')
  const row = await loadOrder(body.id)
  if (!row) return bad(res, 404, 'That order could not be found.')
  if (!row.livemode) return bad(res, 409, 'That is a test payment, which is never sent to Creative Hub.')
  if (row.creativehub_order_id) return bad(res, 409, 'That order already has a Creative Hub order number.')
  if (!CHECKABLE.includes(row.status)) return bad(res, 409, 'That order is not waiting on Creative Hub.')
  const got = await getOrder(chId, settings)
  if (!got.ok) return bad(res, 502, got.status === 404 ? 'Creative Hub has no order with that id.' : got.message)
  const taken = await serviceFetch(`/rest/v1/orders?creativehub_order_id=eq.${encodeURIComponent(chId)}&select=id&limit=1`, { headers: { Accept: 'application/json' } })
  if (!taken.ok) throw new Error(`database answered ${taken.status}`)
  const used = await taken.json()
  if (Array.isArray(used) && used.length > 0) return bad(res, 409, 'That Creative Hub order is already linked to another order in the shop.')
  const s = summariseOrder(got.body)
  const saved = await patchOrder(`id=eq.${row.id}`, CHECKABLE, {
    status: 'sent',
    creativehub_order_id: chId,
    creativehub_order_number: s.number || null,
    creativehub_status: s.status,
    creativehub_due: s.due || null,
    sent_at: new Date().toISOString(),
    note: `Linked by hand to Creative Hub order ${s.number || chId}.`,
  })
  if (!saved.ok || saved.rows.length !== 1) return bad(res, 409, 'That order changed while you were doing this. Refresh the orders and look again.')
  return res.status(200).json({ ok: true, message: `Linked to Creative Hub order ${s.number || chId}.` })
}

// ---------- send ----------
async function send(res, body, settings) {
  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
  const row = await loadOrder(body.id)
  if (!row) return bad(res, 404, 'That order could not be found.')
  if (!row.livemode) return bad(res, 409, 'That is a test payment, which is never sent to Creative Hub.')
  if (row.creativehub_order_id) return bad(res, 409, 'That order already has a Creative Hub order number, so it will not be sent again.')
  if (row.status === 'sent') return bad(res, 409, 'That order has already been sent.')
  if (row.status === 'check_creativehub' || row.status === 'sending') {
    if (row.status === 'sending' && Date.now() - new Date(row.created_at).getTime() < STUCK_AFTER_MS) {
      return bad(res, 409, 'That order is still being sent. Give it a few minutes, then look for it at Creative Hub before sending it again.')
    }
    if (body.confirm_not_there !== true) {
      return bad(res, 409, "It is not known whether Creative Hub already has this order, so it will not be sent until you have looked for it there and confirmed it is not there.")
    }
  } else if (row.status !== 'needs_attention') {
    return bad(res, 409, 'That order cannot be sent from where it is.')
  }
  if (!settingsUsable(settings)) return bad(res, 503, SETTINGS_PROBLEM)
  const built = buildPayload(row)
  if (!built.ok) return bad(res, 422, `${built.message} Place this order by hand in Creative Hub.`)

  const claim = await claimOrder(`id=eq.${row.id}`, [row.status])
  if (!claim.won) return bad(res, 409, 'That order changed while you were doing this, so it was not sent. Refresh the orders and look again.')
  const { patch } = await placeAndRecord({ ...row, ...(claim.row || {}) }, `id=eq.${row.id}`)
  return res.status(200).json({ ok: true, outcome: patch.status, message: patch.note })
}

// ---------- resend the confirmation email ----------
// Only an email that has NOT gone can be sent. The order is first CLAIMED (confirmation_status moved to "sending"), which only one
// caller can win, so two clicks can never send two emails.
const NOT_YET_SENT = 'or=(confirmation_status.is.null,confirmation_status.in.(failed,not_sent))'
async function resendConfirmation(res, body) {
  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
  const row = await loadOrder(body.id)
  if (!row) return bad(res, 404, 'That order could not be found.')
  if (!('confirmation_status' in row)) return bad(res, 409, 'The orders table does not have the confirmation columns yet. Run sql/orders-confirmation.sql in Supabase first.')
  if (row.confirmation_status === 'sent') return bad(res, 409, 'The confirmation email for that order has already been sent.')
  if (row.confirmation_status === 'sending') return bad(res, 409, 'That email is being sent right now. Give it a minute, then refresh the orders.')
  const claim = await serviceFetch(`/rest/v1/orders?id=eq.${row.id}&${NOT_YET_SENT}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ confirmation_status: 'sending', confirmation_note: 'Sending the confirmation email…' }),
  })
  const won = claim.ok ? await claim.json().catch(() => []) : []
  if (!Array.isArray(won) || won.length !== 1) return bad(res, 409, 'That order changed while you were doing this, so nothing was sent. Refresh the orders and look again.')
  const result = await confirmOrder({ ...row, ...won[0] }, { match: `id=eq.${row.id}`, keySuffix: `-manual-${Date.now()}` })
  if (result.status === 'sent') {
    return res.status(200).json({ ok: true, outcome: 'sent', message: result.saved ? 'The confirmation email has been sent.' : 'The confirmation email was sent, but that could not be written down on the order.' })
  }
  return res.status(200).json({ ok: true, outcome: result.status, message: result.note || 'The email was not sent.' })
}

const ACTIONS = { refresh, check, link, send, resend_confirmation: resendConfirmation }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)
  if (req.method !== 'POST') return bad(res, 405, 'These buttons only take a request from the Orders panel.')
  if (!databaseUrl() || serviceKeys().length === 0) {
    return bad(res, 503, 'No server database key is set on this deployment. In Vercel, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is needed.')
  }
  const body = readBody(req)
  const run = typeof body.action === 'string' && Object.prototype.hasOwnProperty.call(ACTIONS, body.action) ? ACTIONS[body.action] : null
  if (!run) return bad(res, 400, 'That is not something this can do.')
  try {
    return await run(res, body, creativehubSettings())
  } catch (e) {
    return bad(res, 500, 'Something went wrong just now, and nothing was changed that I know of. Refresh the orders and look again.')
  }
}
