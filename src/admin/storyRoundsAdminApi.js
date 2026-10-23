// The owner's story-round console talking to the server (lib/storyRounds.js). Every request carries the owner's sign-in; the server refuses anyone else.
import { supabase } from '../supabaseClient'

const TROUBLE = 'That did not go through just now. Please try again in a moment.'

async function call(url, init = {}) {
  let token = ''
  try { const { data } = await supabase.auth.getSession(); token = (data && data.session && data.session.access_token) || '' } catch (e) { token = '' }
  let res
  try {
    res = await fetch(url, { cache: 'no-store', ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  } catch (e) {
    throw new Error('We could not reach the site. Check your connection and try again.')
  }
  let body = null
  try { body = await res.json() } catch (e) { body = null }
  if (!res.ok || !body || body.ok !== true) throw Object.assign(new Error((body && body.message) || TROUBLE), { reason: body && body.reason })
  return body
}

export const listRounds = () => call('/api/membership-checkout?story=admin')
export const roundResults = (id) => call(`/api/membership-checkout?story=admin_results&id=${encodeURIComponent(id)}`)
export const act = (payload) => call('/api/membership-checkout?story=admin', { method: 'POST', body: JSON.stringify(payload) })
