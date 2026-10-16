// Sending one saved order to Creative Hub and writing down what happened. Used by the payment listener (for a real payment, the
// moment it arrives) and by the owner's Send button (for an order that needs another go).
//
// The rule that keeps two things from ever ordering twice: an order is only ever changed while it is still in the state we expect.
// The caller first CLAIMS the order by moving it into "sending" (only one caller can win that), then places it, then this writes the
// result, again only if the order is still "sending".

import { serviceFetch } from './serviceKey.js'
import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, buildPayload, placeOrder, patchFor } from './creativehubOrders.js'

// The table's columns before and after the extra columns were added (sql/orders-creativehub.sql). If those have not been added yet,
// a write that mentions them is refused, so it is tried again with only the columns that have always been there.
const ALWAYS_THERE = ['status', 'note', 'creativehub_order_id', 'creativehub_status']
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

// Changes the order row (or rows) that match, but only while its status is one of "expected". Returns the rows it changed,
// so an empty list means somebody else got there first.
export async function patchOrder(match, expected, body) {
  const path = `/rest/v1/orders?${match}&status=in.(${expected.join(',')})`
  const attempt = async (data) => {
    const response = await serviceFetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(data) })
    if (!response.ok) return { ok: false, status: response.status, rows: [] }
    const rows = await response.json().catch(() => [])
    return { ok: true, status: response.status, rows: Array.isArray(rows) ? rows : [] }
  }
  try {
    let r = await attempt(body)
    if (!r.ok && r.status >= 400 && r.status < 500) r = await attempt(pick(body, ALWAYS_THERE)) // the extra columns may not exist yet
    return { ok: r.ok, rows: r.rows }
  } catch (e) {
    return { ok: false, rows: [] }
  }
}

// Claims an order for sending: moves it from one of the states it may be sent from into "sending", and says whether this caller won.
export async function claimOrder(match, from) {
  const { ok, rows } = await patchOrder(match, from, { status: 'sending', note: 'Sending to Creative Hub…' })
  return { won: ok && rows.length === 1, row: rows[0] || null }
}

// Places an order that has ALREADY been claimed (it is "sending"), and writes the result. It never throws: whatever goes wrong becomes
// a status and a plain-words note.
export async function placeAndRecord(order, match, { fetchImpl } = {}) {
  const settings = creativehubSettings()
  const built = buildPayload(order)
  let result
  if (!settingsUsable(settings)) result = { outcome: 'rejected', message: SETTINGS_PROBLEM }
  else if (!built.ok) result = { outcome: 'rejected', message: built.message }
  else {
    try {
      result = await placeOrder(built.payload, { ...settings, fetchImpl })
    } catch (e) {
      result = { outcome: 'unknown', message: 'Something went wrong while sending, so it is not known whether Creative Hub received it.' }
    }
  }
  const patch = patchFor(result)
  const saved = await patchOrder(match, ['sending'], patch)
  return { result, patch, saved }
}
