// The newsletter's public pages talking to the server (api/ebook-signup.js?newsletter=...). A problem comes back as plain words, and (when the server says which box was wrong) as error.field.
const URL_BASE = '/api/ebook-signup?newsletter='

async function ask(what, { method = 'POST', body, query = '' } = {}) {
  let res
  try {
    res = await fetch(`${URL_BASE}${what}${query}`, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) })
  } catch (e) {
    throw new Error('That did not go through just now. Please try again in a moment.')
  }
  let data
  try { data = await res.json() } catch (e) { throw new Error('That did not go through just now. Please try again in a moment.') }
  if (!res.ok || !data || data.ok !== true) {
    const error = new Error((data && data.message) || 'That did not go through just now. Please try again in a moment.')
    if (data && typeof data.field === 'string') error.field = data.field
    throw error
  }
  return data
}

// Is the sign-up open? Asked once per visit. Any trouble means "no", and the sign-up box simply does not show.
let openAnswer = null
export function resetStatus() { openAnswer = null }
export function fetchOpen() {
  if (!openAnswer) openAnswer = ask('status', { method: 'GET' }).then((d) => d.open === true).catch(() => false)
  return openAnswer
}

export const subscribe = ({ email, consent, website, source }) => ask('subscribe', { body: { email, consent, website, source: source === 'ebook' ? 'ebook' : 'site' } })
export const confirmSubscription = (token) => ask('confirm', { body: { token } })
export const unsubscribe = (token) => ask('unsubscribe', { body: { token } })
