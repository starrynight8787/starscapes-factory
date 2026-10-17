// Sending an order's "it has been posted" email and writing down what happened. Used by the owner's "Send dispatch email" button.
//
// Rules this keeps:
//   - It NEVER throws. What happened is saved on the order as dispatch_status: "sent", "failed" or "not_sent", with a note.
//   - The tracking link and number are kept on the order (tracking_url, tracking_number) so they can be seen later.
//   - Only the owner can trigger it, and only an email that has not gone can be sent (the button's claim, in api/order-actions.js).
//   - If the new columns do not exist yet (sql/orders-dispatch.sql), the email still goes; only the note is lost.

import { serviceFetch } from './serviceKey.js'
import { buildDispatch, cleanTracking } from './dispatchEmailText.js'
import { sendEmail, isEmailAddress } from './sendEmail.js'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()

export async function recordDispatch(match, fields) {
  try {
    const response = await serviceFetch(`/rest/v1/orders?${match}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(fields) })
    return response.ok
  } catch (e) {
    return false
  }
}

export async function dispatchOrder(order, tracking = {}, { env = process.env, fetchImpl, record = recordDispatch, match, keySuffix = '', now = () => new Date() } = {}) {
  const where = match || `stripe_session_id=eq.${encodeURIComponent(clean(order && order.stripe_session_id))}`
  const checked = cleanTracking(tracking)
  let fields
  if (!checked.ok) {
    fields = { dispatch_status: 'not_sent', dispatch_note: `Not sent: ${checked.message}`, dispatch_sent_at: null }
  } else if (!isEmailAddress(order && order.customer_email)) {
    fields = { dispatch_status: 'not_sent', dispatch_note: 'There is no usable email address on this order, so nothing was sent. Email the customer yourself.', dispatch_sent_at: null }
  } else if (!clean(env.RESEND_API_KEY)) {
    fields = { dispatch_status: 'not_sent', dispatch_note: 'Not sent: RESEND_API_KEY is not set in Vercel.', dispatch_sent_at: null }
  } else {
    try {
      const message = buildDispatch(order, checked)
      const sent = await sendEmail({ to: order.customer_email, ...message, idempotencyKey: `order-dispatch-${clean(order.stripe_session_id)}${keySuffix}` }, { env, fetchImpl })
      fields = sent.ok
        ? { dispatch_status: 'sent', dispatch_note: null, dispatch_sent_at: now().toISOString(), tracking_url: checked.url || null, tracking_number: checked.number || null }
        : { dispatch_status: 'failed', dispatch_note: `Not sent: ${sent.detail}`, dispatch_sent_at: null }
    } catch (e) {
      fields = { dispatch_status: 'failed', dispatch_note: 'Not sent: something went wrong while preparing the email.', dispatch_sent_at: null }
    }
  }
  let saved = false
  try {
    saved = await record(where, fields)
  } catch (e) {
    saved = false
  }
  return { status: fields.dispatch_status, note: fields.dispatch_note || null, saved }
}
