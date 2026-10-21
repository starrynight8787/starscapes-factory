// AN EMAIL TO THE OWNER WHEN A REAL PAID ORDER NEEDS HER (Gill, 21 October 2026: "yes" to an alert). While real payments are held (lib/orderSending.js), or when Creative Hub refuses an
// order or its answer is lost, nothing else tells her a payment has arrived, and the customer has been told to write to us after 2 working days.
//
// What it will NOT do: it never carries a customer's name, email address or delivery address (she reads those in the Orders panel). It has the order number, the amount, how many
// items, why it needs her, and a link to the panel. A TEST payment never sends one. It is an internal email, so it is not held back by the customer-email approval rule; it needs only
// the Resend key. It NEVER throws, and a problem sending it never changes what happens to the order: what happened is written on the order (owner_alert_status, sql/orders-notices.sql).

import { sendEmail } from './sendEmail.js'
import { recordConfirmation } from './orderConfirmation.js'
import { SITE, reference, money } from './orderEmailText.js'
import { CONTACT_EMAIL } from '../src/data/contact.js'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
export const PANEL_URL = `${SITE}/art-loft/admin`

// kind: held (automatic sending is off), needs_attention (it could not be ordered, or Creative Hub refused it), check (Creative Hub's answer was lost)
const KINDS = {
  held: { label: 'held for your OK', why: 'Automatic sending is switched off, so this paid order is waiting for you. Nothing has been ordered or charged at Creative Hub.', todo: 'Press "Send to Creative Hub" when you are ready, or "Cancel and refund..." if you cannot make it.' },
  needs_attention: { label: 'could not be sent', why: 'It could not be sent to Creative Hub, or Creative Hub refused it. Nothing has been ordered.', todo: 'Read the note on the order, fix the cause, then press "Send to Creative Hub", or press "Cancel and refund..." if you cannot make it.' },
  check: { label: 'check Creative Hub', why: 'Creative Hub\'s answer was lost, so it may or may not have this order.', todo: 'Press "Look for it at Creative Hub" first. Do NOT send it again until you have looked.' },
}
export const ALERT_KINDS = Object.keys(KINDS)

export function buildOwnerAlert(kind, order, { detail = '' } = {}) {
  if (!Object.prototype.hasOwnProperty.call(KINDS, kind)) throw new Error(`There is no alert called ${kind}.`)
  const k = KINDS[kind]
  const items = Array.isArray(order && order.items) ? order.items : []
  const count = items.reduce((n, i) => n + (Number.isInteger(i && i.qty) && i.qty > 0 ? i.qty : 1), 0)
  const amount = money(order && order.amount_total, order && order.currency)
  const subject = `A paid order needs you: ${reference(order)} (${k.label})`
  const lines = [
    'A real payment has come in and needs you.',
    '',
    `Order: ${reference(order)}`,
    ...(amount ? [`Amount: ${amount}`] : []),
    ...(count ? [`Items: ${count}`] : []),
    `Status: ${k.why}`,
    ...(clean(detail) ? [`Note: ${clean(detail).slice(0, 400)}`] : []),
    '',
    k.todo,
    `Open the Orders panel: ${PANEL_URL} (then "Show recent orders").`,
    '',
    'Until you act, the customer has not had their order confirmation. This email has no customer details in it on purpose: they are in the panel.',
  ]
  const text = `${lines.join('\n')}\n`
  const esc = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#14306a;max-width:560px">${lines
    .map((l) => (l === '' ? '' : `<p style="margin:0 0 10px">${l.includes(PANEL_URL) ? esc(l).replace(esc(PANEL_URL), `<a href="${esc(PANEL_URL)}">${esc(PANEL_URL)}</a>`) : esc(l)}</p>`))
    .join('')}</div>`
  return { subject, text, html }
}

export async function sendOwnerAlert(kind, order, { env = process.env, fetchImpl, record = recordConfirmation, match, detail = '', now = () => new Date() } = {}) {
  const where = match || `stripe_session_id=eq.${encodeURIComponent(clean(order && order.stripe_session_id))}`
  let outcome
  try {
    if (!order || !order.livemode) outcome = null // a test payment never sends one, and writes nothing
    else if (!clean(env.RESEND_API_KEY)) outcome = { owner_alert_status: 'not_sent', owner_alert_sent_at: null }
    else {
      const message = buildOwnerAlert(kind, order, { detail })
      const sent = await sendEmail({ to: CONTACT_EMAIL, ...message, idempotencyKey: `owner-alert-${kind}-${clean(order.stripe_session_id)}` }, { env, fetchImpl })
      outcome = sent.ok ? { owner_alert_status: 'sent', owner_alert_sent_at: now().toISOString() } : { owner_alert_status: 'failed', owner_alert_sent_at: null }
    }
  } catch (e) {
    outcome = { owner_alert_status: 'failed', owner_alert_sent_at: null }
  }
  if (!outcome) return { status: 'skipped', saved: false }
  let saved = false
  try {
    saved = await record(where, outcome)
  } catch (e) {
    saved = false
  }
  return { status: outcome.owner_alert_status, saved }
}
