import { supabase } from '../supabaseClient'

// The owner's buttons on the Orders panel: refresh, look for an order at Creative Hub, link one, send one.
// Sends the owner's sign-in; the server checks it is the shop owner before doing anything.
export async function orderAction(action, extra = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data && data.session && data.session.access_token
  if (!token) throw new Error('Please sign in again, then try this once more.')
  let res
  try {
    res = await fetch('/api/order-actions', {
      method: 'POST',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
  } catch (e) {
    throw new Error('Could not reach the site to ask. Check your connection and try again.')
  }
  let body = null
  try {
    body = await res.json()
  } catch (e) {
    throw new Error('This only works on the live site, because the keys live there. Open starscapesfactory.com/art-loft/admin and try it there.')
  }
  if (!body || typeof body !== 'object') throw new Error('That did not give a sensible answer. Try again in a minute.')
  if (body.ok === false) throw new Error(body.message || 'That did not work. Try again in a minute.')
  return body
}
