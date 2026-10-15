// Lets only the shop's owner use the private tools (Creative Hub, Stripe, delivery costs).
//
// How it works: the publish page sends the owner's sign-in token. We ask Supabase who that token belongs to, and compare
// the email with OWNER_EMAIL (set in Vercel). If anything is missing or unclear, the answer is no.
//
// Why an email list and not "does this person own Creative Hub prints?": anyone can sign up to the shop and add a product of
// their own, so owning a product proves nothing. Only the email you list in Vercel counts.

const clean = (value) => String(value || '').trim()

export function ownerEmails() {
  return clean(process.env.OWNER_EMAIL).toLowerCase().split(/[,;\s]+/).filter(Boolean)
}

const deny = (status, reason, message) => ({ ok: false, status, reason, message })

export async function requireOwner(req) {
  const owners = ownerEmails()
  if (owners.length === 0) {
    return deny(503, 'owner_not_set', 'OWNER_EMAIL is not set on this deployment. In Vercel (Settings, Environment Variables) add OWNER_EMAIL, set to the email you sign in to the shop with, then redeploy.')
  }

  const headers = (req && req.headers) || {}
  const header = clean(headers.authorization || headers.Authorization)
  const token = /^Bearer\s+/i.test(header) ? header.replace(/^Bearer\s+/i, '').trim() : ''
  if (!token) return deny(401, 'not_signed_in', 'Please sign in to the shop, then use this from your publish page.')

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  if (!url || !anon) {
    return deny(503, 'database_not_set', 'The shop database settings are missing on this deployment (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY), so I cannot check who you are.')
  }

  let user
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    })
    if (response.status === 401 || response.status === 403) return deny(401, 'not_signed_in', 'Your sign-in has expired. Sign in again, then try again.')
    if (!response.ok) return deny(503, 'could_not_check', 'Could not check who you are just now. Try again in a moment.')
    user = await response.json()
  } catch (e) {
    return deny(503, 'could_not_check', 'Could not check who you are just now. Try again in a moment.')
  }

  const email = clean(user && user.email).toLowerCase()
  const confirmed = Boolean(user && (user.email_confirmed_at || user.confirmed_at))
  if (!email || !confirmed || !owners.includes(email)) return deny(403, 'not_owner', 'These tools are for the shop owner only.')
  return { ok: true, email }
}

export function sendDenied(res, denial) {
  return res.status(denial.status).json({ ok: false, reason: denial.reason, message: denial.message })
}
