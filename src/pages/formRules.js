// What the account forms say when something is wrong, in plain words that also say what to do about it.
// A problem the person can fix is shown by the form (a summary at the top, and a message under the field).
// A problem on our side (too many tries, the network) is shown as a plain failure message instead, because there is nothing for them to fix.

export const NO_EMAIL = 'Enter your email address, for example name@example.com'
export const BAD_EMAIL = 'Add the @ and the ending, for example .com'

// '' when the email looks fine, otherwise what to say
export function emailProblem(value) {
  const v = String(value == null ? '' : value).trim()
  if (!v) return NO_EMAIL
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return BAD_EMAIL
  return ''
}

export const isRateLimit = (error) => Boolean(error) && (error.status === 429 || /rate limit|too many|only request this after/i.test(error.message || ''))

// Supabase said no to a log in. Returns { fix } for something to correct, or { failure } for something on our side.
export function loginMessage(error) {
  const text = (error && error.message) || ''
  if (/invalid login credentials/i.test(text)) return { fix: 'Your email or password is not right. Check them and try again.' }
  if (/email not confirmed/i.test(text)) return { fix: 'Please confirm your email first. Check your inbox for the link we sent you.' }
  if (isRateLimit(error)) return { failure: 'Too many tries just now. Please wait a few minutes and try again.' }
  return { failure: "We couldn't log you in just now. Please try again in a moment." }
}

// Supabase said no to a sign up. Returns { email }, { password } (which keeps Supabase's own words, since they name the rule missed) or { failure }.
export function signupMessage(error) {
  const text = (error && error.message) || ''
  if (/already registered|already been registered|already exists/i.test(text)) return { email: 'There is already an account with that email address. Try logging in instead.' }
  if (isRateLimit(error)) return { failure: 'Too many tries just now. Please wait a few minutes and try again.' }
  if (/password/i.test(text)) return { password: text }
  return { failure: "We couldn't create your account just now. Please try again in a moment." }
}
