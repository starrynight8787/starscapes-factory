// Sending an order's confirmation email and writing down what happened. Used by the payment listener (once, when a new order is
// saved) and by the owner's "Send confirmation email" button (for an order whose email did not go).
//
// Rules this keeps:
//   - It NEVER throws, and a problem here never stops the order being placed at Creative Hub or the payment being recorded.
//   - A REAL payment only gets the email once its wording has been approved (WORDING_APPROVED in orderEmailText.js) and the Resend key is
//     set. Otherwise nothing is sent, the order says so in plain words, and live checkout stays closed (api/checkout.js uses
//     confirmationProblems for that), so a real customer can never be left without the confirmation the law requires.
//   - A TEST payment gets the email (with a clear TEST banner) as soon as the Resend key is set, so the email can be looked at.
//   - What happened is saved on the order as confirmation_status: "sent", "failed" or "not_sent", with a note. If those columns do
//     not exist yet (sql/orders-confirmation.sql), the email still goes; only the note is lost.

import { serviceFetch } from './serviceKey.js'
import { buildConfirmation, WORDING_APPROVED, pendingItems } from './orderEmailText.js'
import { sendEmail, isEmailAddress } from './sendEmail.js'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()

// What is stopping real confirmation emails from going out. Empty means ready.
export function confirmationProblems(env = process.env) {
  const problems = []
  if (!clean(env.RESEND_API_KEY)) problems.push('RESEND_API_KEY is not set in Vercel.')
  if (!WORDING_APPROVED) problems.push('The wording of the confirmation email has not been approved yet.')
  const open = pendingItems()
  if (open.length) problems.push(`Still to decide: ${open.join('; ')}.`)
  return problems
}

// Writes what happened on the order. Returns whether it was saved; never throws.
export async function recordConfirmation(match, fields) {
  try {
    const response = await serviceFetch(`/rest/v1/orders?${match}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    })
    return response.ok
  } catch (e) {
    return false
  }
}

const NOT_SENT = (note) => ({ confirmation_status: 'not_sent', confirmation_note: note, confirmation_sent_at: null })

export async function confirmOrder(order, { env = process.env, fetchImpl, record = recordConfirmation, match, keySuffix = '', now = () => new Date() } = {}) {
  const where = match || `stripe_session_id=eq.${encodeURIComponent(clean(order && order.stripe_session_id))}`
  let outcome
  try {
    const live = Boolean(order && order.livemode)
    if (!isEmailAddress(order && order.customer_email)) {
      outcome = NOT_SENT('There is no usable email address on this payment, so no confirmation could be sent. Email the customer yourself.')
    } else if (live && !WORDING_APPROVED) {
      outcome = NOT_SENT('Not sent: the wording of the confirmation email has not been approved yet. Email the customer yourself.')
    } else if (live && pendingItems().length) {
      outcome = NOT_SENT(`Not sent: still to decide: ${pendingItems().join('; ')}. Email the customer yourself.`)
    } else if (!clean(env.RESEND_API_KEY)) {
      outcome = NOT_SENT('Not sent: RESEND_API_KEY is not set in Vercel.')
    } else {
      const message = buildConfirmation(order)
      const sent = await sendEmail(
        { to: order.customer_email, ...message, idempotencyKey: `order-confirmation-${clean(order.stripe_session_id)}${keySuffix}` },
        { env, fetchImpl },
      )
      outcome = sent.ok
        ? { confirmation_status: 'sent', confirmation_note: null, confirmation_sent_at: now().toISOString() }
        : { confirmation_status: 'failed', confirmation_note: `Not sent: ${sent.detail}`, confirmation_sent_at: null }
    }
  } catch (e) {
    outcome = { confirmation_status: 'failed', confirmation_note: 'Not sent: something went wrong while preparing the email.', confirmation_sent_at: null }
  }
  let saved = false
  try {
    saved = await record(where, outcome)
  } catch (e) {
    saved = false
  }
  return { status: outcome.confirmation_status, note: outcome.confirmation_note, saved }
}
