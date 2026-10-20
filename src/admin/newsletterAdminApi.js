import { supabase } from '../supabaseClient'

// The owner's newsletter tools, from the server (api/membership-checkout.js?admin=newsletter), which checks that the person asking is the owner before it does anything.
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
    res = await fetch('/api/membership-checkout?admin=newsletter', {
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
    throw new Error('The newsletter only works on the live site. Open starscapesfactory.com and try again there.')
  }
  if (!res.ok || !data || data.ok !== true) {
    const error = new Error((data && data.message) || 'That did not go through just now. Please try again in a moment.')
    if (data && typeof data.field === 'string') error.field = data.field
    throw error
  }
  return data
}

export async function fetchNewsletter() {
  const d = await ask('GET')
  return { open: d.open === true, subscribers: Array.isArray(d.subscribers) ? d.subscribers : [], issues: Array.isArray(d.issues) ? d.issues : [] }
}
export const saveDraft = async ({ id, subject, body }) => (await ask('POST', { action: 'save', ...(id ? { id } : {}), subject, body })).issue
export const deleteDraft = (id) => ask('POST', { action: 'delete', id })
export const sendTest = ({ subject, body }) => ask('POST', { action: 'test', subject, body })
export const sendStep = (id) => ask('POST', { action: 'send', id })
export const retryFailed = (id) => ask('POST', { action: 'retry', id })
export const removeSubscriber = (id) => ask('POST', { action: 'remove', id })
