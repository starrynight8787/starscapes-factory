// Finds out WHO is asking, for the pages any signed-in member may use (starting a membership payment). Like ownerGuard, but without the owner list.
//
// How it works: the page sends the person's sign-in token. We ask Supabase who that token belongs to. If anything is missing or unclear, the answer is no.
// A person must have confirmed their email address (the same rule the owner guard uses).

const clean = (value) => String(value || '').trim()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const deny = (status, reason, message) => ({ ok: false, status, reason, message })

export async function requireUser(req) {
  const headers = (req && req.headers) || {}
  const header = clean(headers.authorization || headers.Authorization)
  const token = /^Bearer\s+/i.test(header) ? header.replace(/^Bearer\s+/i, '').trim() : ''
  if (!token) return deny(401, 'not_signed_in', 'Please log in first, then try again.')

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  if (!url || !anon) return deny(503, 'database_not_set', 'Memberships are not set up on this site yet.')

  let user
  try {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) })
    if (response.status === 401 || response.status === 403) return deny(401, 'not_signed_in', 'Your login has expired. Please log in again, then try again.')
    if (!response.ok) return deny(503, 'could_not_check', 'We could not check who you are just now. Please try again in a moment.')
    user = await response.json()
  } catch (e) {
    return deny(503, 'could_not_check', 'We could not check who you are just now. Please try again in a moment.')
  }

  const id = clean(user && user.id)
  const email = clean(user && user.email).toLowerCase()
  const confirmed = Boolean(user && (user.email_confirmed_at || user.confirmed_at))
  if (!UUID_RE.test(id) || !email) return deny(401, 'not_signed_in', 'Please log in first, then try again.')
  if (!confirmed) return deny(403, 'email_not_confirmed', 'Please confirm your email address first (we sent you a link when you signed up), then try again.')
  return { ok: true, user: { id: id.toLowerCase(), email } }
}
