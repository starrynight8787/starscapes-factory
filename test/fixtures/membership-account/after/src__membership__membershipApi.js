// The membership page talking to the server. Only WHICH passes, HOW they pay, the tick-box agreement and a promo CODE are ever sent. No price is, ever:
// the server works every price out again (api/membership-checkout.js).
import { supabase } from '../supabaseClient'

async function signInToken() {
  try {
    const { data } = await supabase.auth.getSession()
    return (data && data.session && data.session.access_token) || ''
  } catch (e) {
    return ''
  }
}

const authHeader = (token) => (token ? { Authorization: `Bearer ${token}` } : {})

async function readJson(res) {
  try {
    return await res.json()
  } catch (e) {
    throw new Error('Memberships only work on the live site. Open starscapesfactory.com and try again there.')
  }
}

// Starts the payment. Returns the address of Stripe's own checkout page, or throws an Error whose message is safe to show.
export async function startMembershipCheckout({ passes, interval, consent, code }) {
  const token = await signInToken()
  let res
  try {
    res = await fetch('/api/membership-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ passes, interval, consent: consent === true, ...(code ? { code } : {}) }),
    })
  } catch (e) {
    throw new Error('We could not reach the site to start your payment. Check your connection and try again.')
  }
  const body = await readJson(res)
  if (!res.ok || !body || body.ok !== true || typeof body.url !== 'string') throw new Error((body && body.message) || 'We could not start your payment just now. Please try again in a moment.')
  // only ever send a person to Stripe's own checkout page
  if (!/^https:\/\/checkout\.stripe\.com\//.test(body.url)) throw new Error('We could not start your payment just now. Please try again in a moment.')
  return body.url
}

// Does this promo code work, and what does it give? Returns a short plain sentence like "20% off for 3 months", or throws an Error with a message safe to show.
export async function checkPromoCode(code) {
  const token = await signInToken()
  let res
  try {
    res = await fetch(`/api/membership-checkout?code=${encodeURIComponent(code)}`, { cache: 'no-store', headers: authHeader(token) })
  } catch (e) {
    throw new Error('We could not check that code just now. Please try again in a moment.')
  }
  const body = await readJson(res)
  if (!res.ok || !body || body.ok !== true || typeof body.summary !== 'string') throw new Error((body && body.message) || 'We could not check that code just now. Please try again in a moment.')
  return body.summary
}

// The signed-in person's own membership row (the database only ever shows them their own), or null if they have none.
export async function fetchMyMembership() {
  const { data, error } = await supabase.from('memberships').select('status, passes, billing_interval, current_period_end, cancel_at_period_end, offer_ends_at, offer_note').maybeSingle()
  if (error) throw new Error(error.message || 'Could not read your passes.')
  return data || null
}

// The card on file, for the My passes page: { brand, last4 } or null. It never throws (a missing card line must not stop the page).
export async function fetchAccount() {
  const token = await signInToken()
  try {
    const res = await fetch('/api/membership-account', { cache: 'no-store', headers: authHeader(token) })
    const body = await res.json()
    const card = body && body.ok === true && body.card && /^\d{4}$/.test(String(body.card.last4)) ? { brand: String(body.card.brand || 'card'), last4: String(body.card.last4) } : null
    return { card }
  } catch (e) {
    return { card: null }
  }
}

async function accountAction(action, extra = {}) {
  const token = await signInToken()
  let res
  try {
    res = await fetch('/api/membership-account', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader(token) }, body: JSON.stringify({ action, ...extra }) })
  } catch (e) {
    throw new Error('We could not reach the site just now. Check your connection and try again.')
  }
  const body = await readJson(res)
  if (!res.ok || !body || body.ok !== true) throw new Error((body && body.message) || 'We could not do that just now. Please try again in a moment.')
  return body
}

// Stripe's own page for changing a card, seeing receipts and cancelling. Returns its address (only ever a Stripe address).
export async function openBillingPortal() {
  const body = await accountAction('portal')
  if (typeof body.url !== 'string' || !/^https:\/\/billing\.stripe\.com\//.test(body.url)) throw new Error('We could not open that page just now. Please try again in a moment.')
  return body.url
}

// Takes back a cancellation: passes that were going to end carry on.
export const resumePasses = () => accountAction('resume')

// Changes which passes someone holds. Only the passes and the agreement (for any NEW pass) are sent: never a price.
export const changePasses = ({ passes, consent }) => accountAction('change', { passes, consent: consent === true })
