import { supabase } from '../supabaseClient'

// The owner's discount codes, from the server (api/membership-checkout.js?admin=promotions), which checks that the person asking is the owner before it does anything.
// A problem comes back as plain words, and (when the server says which box was wrong) as error.field.
async function signInToken() {
  try {
    const { data } = await supabase.auth.getSession()
    return (data && data.session && data.session.access_token) || ''
  } catch (e) {
    return ''
  }
}

async function ask(method, body) {
  const token = await signInToken()
  let res
  try {
    res = await fetch('/api/membership-checkout?admin=promotions', {
      method,
      cache: 'no-store',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (e) {
    throw new Error('That did not go through just now. Please try again in a moment.')
  }
  let data
  try {
    data = await res.json()
  } catch (e) {
    throw new Error('Codes only work on the live site. Open starscapesfactory.com and try again there.')
  }
  if (!res.ok || !data || data.ok !== true) {
    const error = new Error((data && data.message) || 'That did not go through just now. Please try again in a moment.')
    if (data && typeof data.field === 'string') error.field = data.field
    throw error
  }
  return data
}

export async function fetchPromotions() {
  const data = await ask('GET')
  return { codes: Array.isArray(data.codes) ? data.codes : [], mode: data.mode === 'live' ? 'live' : data.mode === 'test' ? 'test' : 'unknown', more: data.more === true }
}

export async function createCode(form) {
  const data = await ask('POST', { action: 'create', ...form })
  return data.code
}

export async function switchCode(id, active) {
  const data = await ask('POST', { action: 'switch', id, active })
  return data.code
}
