// Vercel serverless function: the owner's buttons on the Orders panel. Locked to the shop owner.
//
//   refresh  ask Creative Hub where one order (or every order sent so far) stands, and write it down
//   check    look through Creative Hub's recent orders for one that looks like this order (changes nothing)
//   link     tell the shop "this order IS that Creative Hub order", once you have found it there
//   send     send an order to Creative Hub: a HELD order for the first time (automatic sending is off), or one that needs another go
//   mark_refunded  record that an order Creative Hub does not have has been cancelled and refunded IN STRIPE (the site never moves money), and tell the customer
//   sending_state  whether real payments go to Creative Hub by themselves, and whether the customer emails are ready
//   backup_plan, backup_page, backup_users   the owner's "Download a backup" (Admin): the list of tables, then one page of a table or of the accounts at a time (lib/backupData.js)
//   send_sample    for a TEST order only: send the owner a sample of a short customer email (with its TEST banner), so she can read the wording before approving it
//   (mark_refunded can also be PRACTISED on a TEST order, so a tester can rehearse the refund journey: no money was taken and nothing goes near Creative Hub)
//   resend_confirmation  send the customer's confirmation email again (only if it has not gone)
//   send_dispatch        send the customer the "your order has been posted" email, with a tracking link or number if you give one
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
import { backupPlan, readTablePage, readUsersPage } from '../lib/backupData.js'
import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, getOrder, listOrders, summariseOrder, candidatesFor, isSafeOrderId, buildPayload } from '../lib/creativehubOrders.js'
import { patchOrder, claimOrder, placeAndNotify } from '../lib/orderFlow.js'
import { confirmOrder, sendNotice, confirmationProblems } from '../lib/orderConfirmation.js'
import { autoSendIsOn, AUTO_SEND_SETTING } from '../lib/orderSending.js'
import { dispatchOrder } from '../lib/dispatchEmail.js'
import { cleanTracking } from '../lib/dispatchEmailText.js'

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
  } else if (row.status !== 'needs_attention' && row.status !== 'held') {
    return bad(res, 409, 'That order cannot be sent from where it is.')
  }
  if (!settingsUsable(settings)) return bad(res, 503, SETTINGS_PROBLEM)
  const built = buildPayload(row)
  if (!built.ok) return bad(res, 422, `${built.message} Place this order by hand in Creative Hub.`)

  const claim = await claimOrder(`id=eq.${row.id}`, [row.status])
  if (!claim.won) return bad(res, 409, 'That order changed while you were doing this, so it was not sent. Refresh the orders and look again.')
  // The customer is emailed the CONFIRMATION only once Creative Hub has accepted the order; if it has not, they are told their payment has arrived (once).
  const { patch } = await placeAndNotify({ ...row, ...(claim.row || {}) }, `id=eq.${row.id}`)
  return res.status(200).json({ ok: true, outcome: patch.status, message: patch.note })
}

// ---------- cancel an order that cannot be made, once the payment has been refunded in Stripe ----------
// The site NEVER moves money: the owner refunds the payment herself in Stripe, then says so here (and ticks a box to confirm it). Only then is the customer emailed that
// we could not accept the order and they have been refunded. Only an order that Creative Hub does NOT have can be cancelled this way: one that is held, one Creative Hub refused
// ("needs attention"), or one whose answer was lost, once the owner has looked at Creative Hub and confirmed it is not there. An order already with Creative Hub cannot.
const REFUNDABLE = ['held', 'needs_attention']
async function markRefunded(res, body) {
  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
  if (body.confirm_refunded !== true) return bad(res, 409, 'Please tick the box to say you have refunded this payment in Stripe first. The customer is told they have been refunded, so it must be true.')
  const row = await loadOrder(body.id)
  if (!row) return bad(res, 404, 'That order could not be found.')
  // A TEST payment can be PRACTISED on (Gill, 21 October 2026, so a tester can rehearse the refund journey): only while it is "test_not_sent", and the owner still ticks that she refunded it in
  // Stripe's TEST mode. No money was ever taken and nothing goes near Creative Hub; the customer email carries the TEST banner.
  const practice = !row.livemode
  if (practice && row.status !== 'test_not_sent' && row.status !== 'refunded') return bad(res, 409, 'That is a test payment that cannot be practised on from where it is.')
  if (row.status === 'refunded') return bad(res, 409, 'That order has already been cancelled and marked as refunded.')
  if (row.creativehub_order_id || row.status === 'sent') return bad(res, 409, 'That order is already with Creative Hub, so it cannot be cancelled here. Ask Creative Hub to cancel it before printing starts, and only then refund it.')
  const stillSending = row.status === 'sending' && Date.now() - new Date(row.created_at).getTime() < STUCK_AFTER_MS
  if (stillSending) return bad(res, 409, 'That order is still being sent. Give it a few minutes, then look for it at Creative Hub before cancelling it.')
  const unsure = row.status === 'check_creativehub' || row.status === 'sending'
  if (practice) {
    // nothing to look for at Creative Hub: a test payment never goes there
  } else if (unsure) {
    if (body.confirm_not_there !== true) return bad(res, 409, 'It is not known whether Creative Hub already has this order, so it will not be cancelled until you have looked for it there and confirmed it is not there.')
  } else if (!REFUNDABLE.includes(row.status)) {
    return bad(res, 409, 'That order cannot be cancelled from where it is.')
  }
  const saved = await patchOrder(`id=eq.${row.id}`, [row.status], { status: 'refunded', refunded_at: new Date().toISOString(), note: practice ? 'PRACTICE: cancelled, and refunded in Stripe test mode. A TEST email was sent.' : 'Cancelled, and refunded in Stripe by you. The customer is told.' })
  if (!saved.ok || saved.rows.length !== 1) return bad(res, 409, 'That order changed while you were doing this, so nothing was changed. Refresh the orders and look again.')
  const told = await sendNotice('refused', { ...row, ...(saved.rows[0] || {}), status: 'refunded' }, { match: `id=eq.${row.id}` })
  return res.status(200).json({
    ok: true,
    outcome: 'refunded',
    message: practice
      ? told.status === 'sent'
        ? 'Practice done: this test order is marked as cancelled and refunded, and a TEST email has been sent to the address on it.'
        : `Practice done: this test order is marked as cancelled and refunded, but the TEST email was NOT sent.${told.note ? ` ${told.note}` : ''}`
      : told.status === 'sent'
        ? 'The order is cancelled and marked as refunded, and the customer has been emailed.'
        : `The order is cancelled and marked as refunded, but the customer has NOT been emailed.${told.note ? ` ${told.note}` : ''} Please email them yourself.`,
  })
}

// ---------- a sample of a customer email, for a TEST order ----------
// So the owner can READ the wording of each short customer email before approving it (Gill, 21 October 2026). TEST ORDERS ONLY: a real order is refused, so a real customer can never be sent
// a sample by mistake. It goes to the address on the test order, carries the TEST banner, and changes nothing on the order but the note of which notice went.
const SAMPLE_KINDS = ['received', 'refused']
const SAMPLE_NAME = { received: 'payment received', refused: 'order refused' }
async function sendSample(res, body) {
  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
  if (!SAMPLE_KINDS.includes(body.kind)) return bad(res, 400, 'That is not a sample I can send.')
  const row = await loadOrder(body.id)
  if (!row) return bad(res, 404, 'That order could not be found.')
  if (row.livemode) return bad(res, 409, 'Samples are only sent for a test order, so that a real customer can never be sent one by mistake.')
  const result = await sendNotice(body.kind, row, { match: `id=eq.${row.id}`, keySuffix: `-sample-${Date.now()}` })
  return res.status(200).json({
    ok: true,
    outcome: result.status,
    message: result.status === 'sent' ? `A sample of the "${SAMPLE_NAME[body.kind]}" email has been sent to the address on this test order. It carries a TEST banner.` : `The sample was not sent.${result.note ? ` ${result.note}` : ''}`,
  })
}

// ---------- the state of automatic sending ----------
async function sendingState(res) {
  return res.status(200).json({ ok: true, auto_send: autoSendIsOn(), setting: AUTO_SEND_SETTING, email_problems: confirmationProblems() })
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

// ---------- the "your order has been posted" email ----------
// Only the owner can send it, only once an order really is with Creative Hub (or is a test order), and only an email that has NOT gone can be
// sent. The order is first CLAIMED (dispatch_status moved to "sending"), which only one caller can win, so two clicks can never send two emails.
const DISPATCH_NOT_YET = 'or=(dispatch_status.is.null,dispatch_status.in.(failed,not_sent))'
async function sendDispatch(res, body) {
  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')
  const tracking = cleanTracking({ url: body.tracking_url, number: body.tracking_number })
  if (!tracking.ok) return bad(res, 400, tracking.message)
  const row = await loadOrder(body.id)
  if (!row) return bad(res, 404, 'That order could not be found.')
  if (!('dispatch_status' in row)) return bad(res, 409, 'The orders table does not have the dispatch columns yet. Run sql/orders-dispatch.sql in Supabase first.')
  if (row.livemode && row.status !== 'sent') return bad(res, 409, 'That order has not been sent to Creative Hub, so it cannot have been posted. A posted email would be wrong.')
  if (row.dispatch_status === 'sent') return bad(res, 409, 'The posted email for that order has already been sent.')
  if (row.dispatch_status === 'sending') return bad(res, 409, 'That email is being sent right now. Give it a minute, then refresh the orders.')
  const claim = await serviceFetch(`/rest/v1/orders?id=eq.${row.id}&${DISPATCH_NOT_YET}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ dispatch_status: 'sending', dispatch_note: 'Sending the posted email…' }),
  })
  const won = claim.ok ? await claim.json().catch(() => []) : []
  if (!Array.isArray(won) || won.length !== 1) return bad(res, 409, 'That order changed while you were doing this, so nothing was sent. Refresh the orders and look again.')
  const result = await dispatchOrder({ ...row, ...won[0] }, tracking, { match: `id=eq.${row.id}`, keySuffix: `-manual-${Date.now()}` })
  if (result.status === 'sent') {
    return res.status(200).json({ ok: true, outcome: 'sent', message: result.saved ? 'The posted email has been sent.' : 'The posted email was sent, but that could not be written down on the order.' })
  }
  return res.status(200).json({ ok: true, outcome: result.status, message: result.note || 'The email was not sent.' })
}

// ---------- the owner's backup (Admin, "Download a backup") ----------
// Read-only. Only for the owner (the same guard as everything here), and only tables on the approved list in lib/backupTables.js. The answers are never kept: the browser puts them in a file on her computer.
const reading = async (res, work, what) => {
  try {
    const r = await work()
    if (!r.ok) return bad(res, r.status || 502, r.message)
    return res.status(200).json(r)
  } catch (e) {
    return bad(res, 502, `The backup could not read ${what} just now. Nothing was changed. Please try again in a moment.`)
  }
}
async function backupPlanAction(res) { return res.status(200).json({ ok: true, ...backupPlan() }) }
async function backupPageAction(res, body) { return reading(res, () => readTablePage(body.table, body.offset), 'the data') }
async function backupUsersAction(res, body) { return reading(res, () => readUsersPage(body.page), 'the list of accounts') }

const ACTIONS = { backup_plan: backupPlanAction, backup_page: backupPageAction, backup_users: backupUsersAction, refresh, check, link, send, mark_refunded: markRefunded, send_sample: sendSample, sending_state: sendingState, resend_confirmation: resendConfirmation, send_dispatch: sendDispatch }

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
