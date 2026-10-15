// Vercel serverless function: is the Stripe connection working? Read-only.
//
// - Nothing here charges anyone, creates anything, or moves money. It only asks Stripe "which account is this key for?".
// - It never shows the key. The key lives in Vercel as STRIPE_SECRET_KEY (server side only), never in the code or the chat.
// - It tells you whether the key is a TEST key (no real money) or a LIVE key (real money).
// - This page is for setting up. It comes down, with the Creative Hub check pages, once ordering works.
//
// - It is LOCKED to the shop owner (the sign-in must match OWNER_EMAIL in Vercel). You use it from the publish page.
//
//   (no address to type)   is the connection working, and is it test or live?

import { requireOwner, sendDenied } from '../lib/ownerGuard.js'

const STRIPE = 'https://api.stripe.com'

function modeOf(key) {
  if (/^(sk|rk)_live_/.test(key)) return 'live'
  if (/^(sk|rk)_test_/.test(key)) return 'test'
  return 'unknown'
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)

  const key = (process.env.STRIPE_SECRET_KEY || '').trim()
  if (!key) {
    return res.status(200).json({
      connected: false,
      reason: 'no_key',
      message: 'STRIPE_SECRET_KEY is not set on this deployment. Add it in Vercel (Settings, Environment Variables), then redeploy.',
    })
  }

  const mode = modeOf(key)
  if (mode === 'unknown') {
    return res.status(200).json({
      connected: false,
      reason: 'wrong_kind_of_key',
      message: 'STRIPE_SECRET_KEY does not look like a Stripe secret key. It should start with sk_test_ (for testing) or sk_live_ (for real money). Do not use the publishable key, which starts pk_.',
    })
  }

  try {
    const response = await fetch(`${STRIPE}/v1/account`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    let body = null
    try {
      body = await response.json()
    } catch (e) {
      body = null
    }
    if (!response.ok) {
      const reasons = {
        401: ['invalid_key', 'Stripe did not accept this key. It may be wrong, revoked, or copied with a space.'],
        403: ['no_permission', 'The key was read, but it does not have permission to look at the account. Use the standard secret key.'],
        429: ['rate_limited', 'Too many requests just now. Try again in a minute.'],
      }
      const [reason, message] = reasons[response.status] || ['unexpected_status', `Stripe answered with status ${response.status}.`]
      return res.status(200).json({ connected: false, mode, status: response.status, reason, message })
    }
    const a = body || {}
    return res.status(200).json({
      connected: true,
      mode,
      message:
        mode === 'live'
          ? 'Connected to Stripe with a LIVE key. Real money can move. Use a test key (sk_test_) while you are building.'
          : 'Connected to Stripe in TEST mode. No real money can move.',
      account: {
        country: a.country || null,
        currency: a.default_currency || null,
        business_name: (a.business_profile && a.business_profile.name) || (a.settings && a.settings.dashboard && a.settings.dashboard.display_name) || null,
        details_submitted: Boolean(a.details_submitted),
        charges_enabled: Boolean(a.charges_enabled),
        payouts_enabled: Boolean(a.payouts_enabled),
      },
    })
  } catch (error) {
    return res.status(200).json({
      connected: false,
      mode,
      reason: 'network_error',
      message: 'Could not reach Stripe. ' + (error && error.name === 'TimeoutError' ? 'It took too long to answer.' : ''),
    })
  }
}
