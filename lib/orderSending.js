// WHETHER A REAL PAYMENT GOES TO CREATIVE HUB BY ITSELF (Gill, 21 October 2026: "yes" to a hold switch, after the launch review asked for Creative Hub's written
// confirmation before checkout opens, and for a plan if an order were refused).
//
// The SAFE state is the default: unless the Vercel setting SEND_ORDERS_AUTOMATICALLY is exactly "yes", a real payment is saved as "held" and waits for the owner's OK in the
// Orders panel ("Send to Creative Hub"). Nothing is ordered, charged or printed until she presses it. Switch automatic sending on only once Creative Hub's written reply has
// arrived and the supervised first order has gone through (SFW-252, SFW-8).
//
// A test payment never goes to Creative Hub either way.

const clean = (v) => String(v === null || v === undefined ? '' : v).trim().toLowerCase()

export const AUTO_SEND_SETTING = 'SEND_ORDERS_AUTOMATICALLY'

export function autoSendIsOn(env = process.env) {
  return clean(env[AUTO_SEND_SETTING]) === 'yes'
}

export const HELD_NOTE = 'Held: automatic sending is switched off, so this paid order is waiting for your OK. Press "Send to Creative Hub" when you are ready, or cancel and refund it.'
