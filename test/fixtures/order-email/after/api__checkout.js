// Vercel serverless function: starts a payment on Stripe's own checkout page.
//
// What it does: takes the print ids and quantities from the cart, looks every price up again in the shop database
// (the cart's own prices are never used), and asks Stripe for a checkout page. It returns the address of that page.
//
// What it will NOT do:
//   - trust a price, name or total sent from the browser
//   - sell a print that is not published, or that has no Creative Hub id
//   - take a LIVE payment unless ALLOW_LIVE_CHECKOUT is set to yes in Vercel, AND the confirmation email is ready (see lib/orderConfirmation.js).
//     (Do not set ALLOW_LIVE_CHECKOUT until orders reach Creative Hub, or a real payment could be taken without an order being placed.)
//   - show or log the Stripe key
//
// The key lives in Vercel as STRIPE_SECRET_KEY, and should be a TEST key (sk_test_) while you are building.
//
// CLOSED TO VISITORS BY DEFAULT: until CHECKOUT_OPEN is set to exactly yes in Vercel, only the signed-in shop owner
// can start a checkout, and everyone else is told it opens soon. The cart page asks GET /api/checkout whether it is open.

import { LAUNCH_COUNTRIES } from '../src/cart/launchCountries.js'
import { requireOwner } from '../lib/ownerGuard.js'
import { confirmationProblems } from '../lib/orderConfirmation.js'

const STRIPE = 'https://api.stripe.com'
const SITE = 'https://starscapesfactory.com'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_LINES = 20 // different prints in one order (also the most Creative Hub takes)
const MAX_QTY = 10 // of one print
const MAX_ORDER_PENCE = 500000 // 5,000 pounds: anything bigger is not a normal order
const MAX_BODY = 10000

const clean = (v) => String(v || '').trim()
const say = (res, status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra })

// Open to everyone only when CHECKOUT_OPEN is exactly yes. Anything else (unset, true, 1, YES) means closed.
const isOpen = () => clean(process.env.CHECKOUT_OPEN) === 'yes'
async function ownerIsAsking(req) {
  try {
    const who = await requireOwner(req)
    return Boolean(who && who.ok)
  } catch (e) {
    return false
  }
}

function allowedOrigins() {
  const list = new Set([SITE, 'https://www.starscapesfactory.com', 'http://localhost:5173'])
  if (clean(process.env.SITE_URL)) list.add(clean(process.env.SITE_URL).replace(/\/+$/, ''))
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) if (clean(host)) list.add(`https://${clean(host)}`)
  return list
}

function readItems(body) {
  let data = body
  if (typeof data === 'string') {
    if (data.length > MAX_BODY) return { error: 'That order is too big.' }
    try {
      data = JSON.parse(data)
    } catch (e) {
      return { error: 'That did not look like an order.' }
    }
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.items) || data.items.length === 0) return { error: 'Your cart is empty.' }
  if (data.items.length > MAX_LINES) return { error: `Please order no more than ${MAX_LINES} different prints at a time.` }
  const wanted = new Map()
  for (const item of data.items) {
    const id = clean(item && item.id)
    const qty = item && item.qty
    if (!UUID_RE.test(id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `Each print can be ordered 1 to ${MAX_QTY} at a time.` }
    wanted.set(id.toLowerCase(), Math.min((wanted.get(id.toLowerCase()) || 0) + qty, MAX_QTY)) // the same print twice becomes one line
  }
  return { wanted }
}

// What the shop sells: only variants of PUBLISHED prints are visible to the public key, so a draft cannot be bought
async function lookUp(ids) {
  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  if (!url || !anon) throw new Error('database settings missing')
  const select = 'id,size_label,framed,frame_colour,price,image_url,creativehub_variant_id,products!inner(title,published,images)'
  const response = await fetch(`${url}/rest/v1/product_variants?select=${select}&id=in.(${ids.join(',')})`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`database answered ${response.status}`)
  const rows = await response.json()
  return Array.isArray(rows) ? rows : []
}

const niceSize = (label) => String(label || '').replace(/\s*x\s*/i, ' × ').replace(/\s*cm$/i, ' cm').trim()

// Stripe can only show some picture types, so only plain https jpg or png addresses are passed on
function pictureFor(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'string' && c.length <= 2000 && /^https:\/\/[^\s'"<>]+$/.test(c) && /\.(jpe?g|png)(\?|$)/i.test(c)) return c
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // The cart page asks whether checkout is open. It says nothing about why, and reveals nothing else.
  if (req.method === 'GET') {
    const open = isOpen()
    const can_test = open ? false : await ownerIsAsking(req)
    return res.status(200).json({ ok: true, open, can_test })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return say(res, 405, 'Checkout is started from the cart page.')
  }

  // Only this site may start a checkout (a page on another website cannot)
  const origins = allowedOrigins()
  const origin = clean(req.headers && req.headers.origin)
  if (origin && !origins.has(origin)) return say(res, 403, 'That request did not come from the shop.')
  const returnTo = origin || SITE

  // Closed to visitors: only the owner may start a checkout until CHECKOUT_OPEN is yes
  if (!isOpen() && !(await ownerIsAsking(req))) {
    return say(res, 403, 'Checkout opens soon. Your cart is saved on this device until then.', { reason: 'not_open' })
  }

  const parsed = readItems(req.body)
  if (parsed.error) return say(res, 400, parsed.error)

  const key = clean(process.env.STRIPE_SECRET_KEY)
  if (!key) return say(res, 503, "Checkout isn't switched on yet.")
  const mode = /^(sk|rk)_live_/.test(key) ? 'live' : /^(sk|rk)_test_/.test(key) ? 'test' : 'unknown'
  if (mode === 'unknown') return say(res, 503, "Checkout isn't set up correctly yet.")
  if (mode === 'live' && clean(process.env.ALLOW_LIVE_CHECKOUT) !== 'yes') return say(res, 503, 'Checkout is not open for real payments yet.')
  // A real payment must be able to get its confirmation email (the law requires one, and nothing can go in the parcel). So real
  // payments stay closed until the Resend key is set AND the wording of that email has been approved.
  if (mode === 'live' && confirmationProblems().length > 0) return say(res, 503, 'Checkout is not open for real payments yet.')

  let rows
  try {
    rows = await lookUp([...parsed.wanted.keys()])
  } catch (e) {
    return say(res, 502, "We couldn't check the prints just now. Please try again in a moment.")
  }
  const byId = new Map(rows.map((r) => [String(r.id).toLowerCase(), r]))
  const lines = []
  for (const [id, qty] of parsed.wanted) {
    const row = byId.get(id)
    const price = Number(row && row.price)
    const product = row && row.products
    if (!row || !product || product.published !== true || !clean(row.creativehub_variant_id) || !Number.isFinite(price) || price <= 0) {
      return say(res, 409, "One of the prints in your cart isn't available any more. Please check your cart and try again.")
    }
    lines.push({ row, product, qty, pence: Math.round(price * 100) })
  }
  if (lines.reduce((sum, l) => sum + l.pence * l.qty, 0) > MAX_ORDER_PENCE) return say(res, 400, 'That is a large order. Please get in touch and we will sort it out together.')

  // The Stripe session. Delivery is free, so there is no delivery line, and the address is limited to the launch countries.
  const form = new URLSearchParams()
  form.set('mode', 'payment')
  form.set('submit_type', 'pay')
  form.set('success_url', `${returnTo}/checkout/success?session_id={CHECKOUT_SESSION_ID}`)
  form.set('cancel_url', `${returnTo}/cart?checkout=cancelled`)
  form.set('phone_number_collection[enabled]', 'true')
  form.set('custom_text[shipping_address][message]', 'Delivery is free. Each print is made to order and posted straight to you from the print studio.')
  LAUNCH_COUNTRIES.forEach((code, i) => form.set(`shipping_address_collection[allowed_countries][${i}]`, code))
  lines.forEach(({ row, product, qty, pence }, i) => {
    const finish = row.framed ? `${row.frame_colour || 'framed'} frame` : 'unframed'
    const picture = pictureFor(row.image_url, Array.isArray(product.images) ? product.images[0] : null)
    const base = `line_items[${i}]`
    form.set(`${base}[quantity]`, String(qty))
    form.set(`${base}[price_data][currency]`, 'gbp')
    form.set(`${base}[price_data][unit_amount]`, String(pence))
    form.set(`${base}[price_data][product_data][name]`, String(product.title))
    form.set(`${base}[price_data][product_data][description]`, `${niceSize(row.size_label)}, ${finish}`)
    form.set(`${base}[price_data][product_data][metadata][variant_id]`, String(row.id))
    form.set(`${base}[price_data][product_data][metadata][ch_variant_id]`, clean(row.creativehub_variant_id))
    if (picture) form.set(`${base}[price_data][product_data][images][0]`, picture)
  })

  try {
    const response = await fetch(`${STRIPE}/v1/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(15000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data || typeof data.url !== 'string') return say(res, 502, "We couldn't start checkout just now. Please try again in a moment.")
    return res.status(200).json({ ok: true, url: data.url, mode })
  } catch (e) {
    return say(res, 502, "We couldn't start checkout just now. Please try again in a moment.")
  }
}
