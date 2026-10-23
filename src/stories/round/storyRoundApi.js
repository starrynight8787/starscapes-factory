// The member's page talking to the server (lib/storyRounds.js, reached through /api/membership-checkout?story=...). The sign-in token goes with every request.
// Every function either returns the server's answer or throws an Error whose message is safe to show.
import { supabase } from '../../supabaseClient'

async function signInToken() {
  try {
    const { data } = await supabase.auth.getSession()
    return (data && data.session && data.session.access_token) || ''
  } catch (e) {
    return ''
  }
}

const TROUBLE = 'We could not reach the site just now. Please check your connection and try again.'

async function call(url, init = {}) {
  const token = await signInToken()
  let res
  try {
    res = await fetch(url, { cache: 'no-store', ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  } catch (e) {
    throw Object.assign(new Error(TROUBLE), { reason: 'network' })
  }
  let body = null
  try { body = await res.json() } catch (e) { body = null }
  if (!res.ok || !body || body.ok !== true) throw Object.assign(new Error((body && body.message) || TROUBLE), { reason: (body && body.reason) || 'trouble', field: (body && body.field) || null, left: body && body.left })
  return body
}

export const loadRound = (token) => call(`/api/membership-checkout?story=round&token=${encodeURIComponent(token)}`)
export const sendAnswers = ({ token, answers, names }) => call('/api/membership-checkout?story=submit', { method: 'POST', body: JSON.stringify({ token, answers, names }) })
export const reportName = ({ token, questionId, optionIndex }) => call('/api/membership-checkout?story=report', { method: 'POST', body: JSON.stringify({ token, questionId, optionIndex }) })
