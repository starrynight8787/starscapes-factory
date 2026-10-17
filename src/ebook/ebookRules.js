// What a sign-up for the free ebook must contain. The page and the server both use this, so they always agree.
export const isEmail = (value) => {
  const s = String(value === null || value === undefined ? '' : value).trim()
  return s.length <= 254 && /^[^\s@<>",;:\\]+@[^\s@<>",;:\\]+\.[^\s@<>",;:\\]+$/.test(s)
}

// Returns { ok: true, email } or { ok: false, errors } with plain words. The tick box must be ticked: it is the person's agreement to the emails.
export function cleanSignup(input) {
  const email = String((input && input.email) || '').trim().toLowerCase()
  const errors = {}
  if (!email) errors.email = 'Enter your email address.'
  else if (!isEmail(email)) errors.email = 'Enter your email address in the form name@example.com.'
  if (!(input && input.consent === true)) errors.consent = 'Tick the box to say yes to the emails, so I can send you the ebook.'
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, email }
}
