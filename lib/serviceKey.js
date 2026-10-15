// Talking to the shop database as the SERVER (not as a visitor). Used by the Stripe listener and the orders list.
//
// Supabase has two kinds of server key, and a project can have either or both:
//   - the older "service_role" key (SUPABASE_SERVICE_ROLE_KEY), which is a sign-in token
//   - the newer secret key, starting sb_secret_ (SUPABASE_SECRET_KEY), which is NOT a token
// A newer key goes in the apikey header only. If the database refuses one key, the other is tried, so switching the
// older keys off in Supabase does not break the shop.

const clean = (v) => String(v || '').trim()

export function databaseUrl() {
  return clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
}

export function serviceKeys() {
  const keys = []
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY']) {
    const value = clean(process.env[name])
    if (value && !keys.includes(value)) keys.push(value)
  }
  return keys
}

export function serviceHeaders(key, extra = {}) {
  return /^sb_secret_/.test(key) ? { apikey: key, ...extra } : { apikey: key, Authorization: `Bearer ${key}`, ...extra }
}

// Asks the database, trying each server key in turn if one is refused (401 or 403). Throws only if nothing is set up.
export async function serviceFetch(path, init = {}) {
  const url = databaseUrl()
  const keys = serviceKeys()
  if (!url || keys.length === 0) throw new Error('database settings missing')
  let last
  for (const key of keys) {
    const response = await fetch(`${url}${path}`, { ...init, headers: serviceHeaders(key, init.headers || {}), signal: init.signal || AbortSignal.timeout(10000) })
    if (response.status !== 401 && response.status !== 403) return response
    last = response
  }
  return last
}

// What the database said was wrong, in a few safe words (never anything that looks like a key)
export async function saidWhat(response) {
  try {
    const body = await response.json()
    const text = [body && body.code, body && body.message].filter(Boolean).join(': ')
    return text.replace(/[A-Za-z0-9._-]{30,}/g, '…').slice(0, 160)
  } catch (e) {
    return ''
  }
}
