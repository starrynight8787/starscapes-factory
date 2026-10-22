// What a sign-up for the free ebook must contain. The page and the server both use this, so they always agree.
export const isEmail = (value) => {
  const s = String(value === null || value === undefined ? '' : value).trim()
  return s.length <= 254 && /^[^\s@<>",;:\\]+@[^\s@<>",;:\\]+\.[^\s@<>",;:\\]+$/.test(s)
}

// Returns { ok: true, email, newsletter } or { ok: false, errors } with plain words. Getting the ebook needs only an email address: there is NO required tick.
// "newsletter" is the separate, optional box: true only when they ticked it themselves.
export function cleanSignup(input) {
  const email = String((input && input.email) || '').trim().toLowerCase()
  const errors = {}
  if (!email) errors.email = 'Enter your email address.'
  else if (!isEmail(email)) errors.email = 'Enter your email address in the form name@example.com.'
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, email, newsletter: Boolean(input && input.newsletter === true) }
}
