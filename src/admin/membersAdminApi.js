import { supabase } from '../supabaseClient'

// The owner's list of members, from the server (api/membership-checkout.js?admin=members), which checks that the person asking is the owner before it reads anything.
// A problem comes back as plain words.
async function signInToken() {
  try {
    const { data } = await supabase.auth.getSession()
    return (data && data.session && data.session.access_token) || ''
  } catch (e) {
    return ''
  }
}

export async function fetchMembers() {
  const token = await signInToken()
  let res
  try {
    res = await fetch('/api/membership-checkout?admin=members', { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch (e) {
    throw new Error('The members could not load just now. Please try again in a moment.')
  }
  let body
  try {
    body = await res.json()
  } catch (e) {
    throw new Error('The members only load on the live site. Open starscapesfactory.com and try again there.')
  }
  if (!res.ok || !body || body.ok !== true) throw new Error((body && body.message) || 'The members could not load just now. Please try again in a moment.')
  return {
    members: Array.isArray(body.members) ? body.members : [],
    mode: body.mode === 'live' ? 'live' : body.mode === 'test' ? 'test' : 'unknown',
    emailsOk: body.emails_ok !== false,
  }
}
