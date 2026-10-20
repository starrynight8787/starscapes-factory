// The owner's discount codes ("Promotions", /admin/promotions): list them, make one, switch one off or on. Handled inside the membership function's admin hand-off
// (lib/membershipAdmin.js), which has ALREADY checked that the person asking is the owner before anything here runs. The free Vercel plan allows 12 functions and all 12 are used.
//
// A code is two things in Stripe: a COUPON (what it takes off, and for how long) and a PROMOTION CODE (the text a member types, with an optional limit and last day).
// Checkout already looks a code up by its text and works the price out itself (lib/membershipStripe.js), so nothing more is needed on that side.
// Every form is checked with the SAME rules as the page (src/admin/promotionsRules.js) before anything is sent to Stripe, and Stripe's own words are never passed on.
import { STRIPE, stripeHeaders, stripeMode, describeCoupon, logProblem } from './membershipStripe.js'
import { couponWords, parseForm } from '../src/admin/promotionsRules.js'

const clean = (v) => String(v || '').trim()
const MAX_BODY = 4000
const FORM = { 'Content-Type': 'application/x-www-form-urlencoded' }
const TAG = 'starscapes_promo' // marks the coupons and codes made on the Promotions page
const say = (res, status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra })

async function call(path, key, init = {}) {
  const response = await fetch(`${STRIPE}${path}`, { ...init, headers: stripeHeaders(key, init.headers || {}), signal: AbortSignal.timeout(15000) })
  const body = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, body }
}
const why = (r) => String((r.body && r.body.error && r.body.error.message) || '')
const failure = (what, r) => new Error(`stripe could not ${what} (${r.status})${why(r) ? `: ${why(r)}` : ''}`)

const iso = (secs) => (Number.isFinite(secs) && secs > 0 ? new Date(secs * 1000).toISOString() : null)

// A code, as the page needs it
export function shapeCode(item) {
  const c = (item && item.coupon) || {}
  return {
    id: clean(item && item.id),
    code: clean(item && item.code),
    active: !item || item.active !== false,
    summary: describeCoupon(item && item.coupon),
    percentOff: Number.isFinite(c.percent_off) ? Number(c.percent_off) : null,
    amountOff: Number.isInteger(c.amount_off) ? c.amount_off : null,
    duration: clean(c.duration),
    months: Number.isInteger(c.duration_in_months) ? c.duration_in_months : null,
    used: Number.isInteger(item && item.times_redeemed) ? item.times_redeemed : 0,
    maxUses: Number.isInteger(item && item.max_redemptions) && item.max_redemptions > 0 ? item.max_redemptions : null,
    expiresAt: iso(item && item.expires_at),
    created: iso(item && item.created),
    couponValid: c.valid !== false,
  }
}

function readBody(body) {
  let data = body
  if (typeof data === 'string') {
    if (data.length > MAX_BODY) return null
    try { data = JSON.parse(data) } catch (e) { return null }
  }
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null
}

async function list(res, key, mode) {
  const found = await call('/v1/promotion_codes?limit=100&expand[]=data.coupon', key)
  if (!found.ok) {
    logProblem('listing promo codes', failure('list the codes', found))
    return say(res, 502, 'Stripe could not list the codes just now. Please try again in a moment.')
  }
  const data = found.body && Array.isArray(found.body.data) ? found.body.data : []
  return res.status(200).json({ ok: true, mode, codes: data.map(shapeCode), more: Boolean(found.body && found.body.has_more) })
}

async function create(res, key, input) {
  const parsed = parseForm(input)
  if (!parsed.ok) return say(res, 400, parsed.message, { field: parsed.field })
  const v = parsed.value

  const coupon = new URLSearchParams()
  if (v.percentOff !== null) coupon.set('percent_off', String(v.percentOff))
  else { coupon.set('amount_off', String(v.amountOff)); coupon.set('currency', 'gbp') }
  coupon.set('duration', v.duration)
  if (v.duration === 'repeating') coupon.set('duration_in_months', String(v.months))
  coupon.set('name', `${v.code}: ${couponWords(v)}`.slice(0, 40))
  coupon.set(`metadata[${TAG}]`, 'yes')
  let madeCoupon
  try {
    madeCoupon = await call('/v1/coupons', key, { method: 'POST', headers: FORM, body: coupon.toString() })
    if (!madeCoupon.ok || !madeCoupon.body || typeof madeCoupon.body.id !== 'string') throw failure('make the coupon', madeCoupon)
  } catch (e) {
    logProblem('making a coupon', e)
    return say(res, 502, 'Stripe could not make the code just now. Nothing was made. Please try again in a moment.')
  }

  const promo = new URLSearchParams()
  promo.set('coupon', madeCoupon.body.id)
  promo.set('code', v.code)
  promo.set(`metadata[${TAG}]`, 'yes')
  if (v.maxUses) promo.set('max_redemptions', String(v.maxUses))
  if (v.expiresAt) promo.set('expires_at', String(v.expiresAt))
  promo.append('expand[]', 'coupon')
  let madeCode
  try {
    madeCode = await call('/v1/promotion_codes', key, { method: 'POST', headers: FORM, body: promo.toString() })
    if (!madeCode.ok || !madeCode.body || typeof madeCode.body.id !== 'string') throw failure('make the code', madeCode)
  } catch (e) {
    // do not leave a coupon with no code behind
    try { await call(`/v1/coupons/${encodeURIComponent(madeCoupon.body.id)}`, key, { method: 'DELETE' }) } catch (x) { /* nothing more can be done */ }
    logProblem('making a promo code', e)
    if (/already exists|already.*in use/i.test(String(e && e.message))) return say(res, 409, 'That code already exists and is working. Choose another name, or switch the old one off first.', { field: 'code' })
    return say(res, 502, 'Stripe could not make the code just now. Nothing was made. Please try again in a moment.')
  }
  return res.status(201).json({ ok: true, code: shapeCode(madeCode.body) })
}

async function change(res, key, input) {
  const id = clean(input.id)
  if (!/^promo_[A-Za-z0-9]+$/.test(id) || typeof input.active !== 'boolean') return say(res, 400, 'That did not look right. Please reload the page and try again.')
  const form = new URLSearchParams()
  form.set('active', input.active ? 'true' : 'false')
  form.append('expand[]', 'coupon')
  try {
    const done = await call(`/v1/promotion_codes/${encodeURIComponent(id)}`, key, { method: 'POST', headers: FORM, body: form.toString() })
    if (!done.ok || !done.body || typeof done.body.id !== 'string') throw failure('change the code', done)
    return res.status(200).json({ ok: true, code: shapeCode(done.body) })
  } catch (e) {
    logProblem('switching a promo code', e)
    return say(res, 502, `Stripe could not switch that code ${input.active ? 'on' : 'off'} just now. Please try again in a moment.`)
  }
}

export async function handlePromotions(req, res) {
  const key = clean(process.env.STRIPE_SECRET_KEY)
  const mode = stripeMode(key)
  if (!key) return say(res, 503, 'Stripe is not set up on this deployment (STRIPE_SECRET_KEY is missing), so codes cannot be looked at or made.')
  if (mode === 'unknown') return say(res, 503, 'The Stripe key on this deployment is not one I recognise, so codes cannot be looked at or made.')
  if (req.method === 'GET') return list(res, key, mode)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return say(res, 405, 'Codes can only be looked at or changed here.')
  }
  const input = readBody(req.body)
  if (!input) return say(res, 400, 'That did not look right. Please try again.')
  if (input.action === 'create') return create(res, key, input)
  if (input.action === 'switch') return change(res, key, input)
  return say(res, 400, 'That did not look right. Please reload the page and try again.')
}
