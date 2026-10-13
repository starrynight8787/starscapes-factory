// Vercel serverless function: checks the Creative Hub connection and, read-only, lets you look at
// your Creative Hub products and test a price quote.
//
// - Nothing here places an order or costs anything. A quote only asks "what would this cost?".
// - It never shows the token. The token lives in Vercel as CREATIVEHUB_API_KEY (server side only).
// - These pages are for setting up. We remove them once ordering is built.
//
// Pages:
//   /api/creativehub-check                                         is the connection working?
//   /api/creativehub-check?view=catalogue                          your products at Creative Hub
//   /api/creativehub-check?view=variants&product=PRODUCT_ID        the sizes/frames of one product
//   /api/creativehub-check?view=quote&variant=VARIANT_ID&country=GB&qty=1    a price quote
//
// Creative Hub's address is https://escher-v2.creativehub.io. You can point at another one with the
// optional setting CREATIVEHUB_API_BASE.

const DEFAULT_BASE = 'https://escher-v2.creativehub.io'

function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra }
}

async function getJson(base, token, path) {
  const response = await fetch(`${base}${path}`, { headers: authHeaders(token), signal: AbortSignal.timeout(8000) })
  let body = null
  try {
    body = await response.json()
  } catch (e) {
    body = null
  }
  return { ok: response.ok, status: response.status, body }
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj && k in obj).map((k) => [k, obj[k]]))

const VARIANT_FIELDS = [
  'id', 'sku', 'size', 'print_width_mm', 'print_height_mm', 'is_framed', 'frame_color', 'frame_type',
  'mount_board_size', 'paper_id', 'retail_price', 'price_currency',
  'delivery_price_uk', 'delivery_price_eu_na', 'delivery_price_row',
]

function explain(status, body) {
  if (status === 401) return 'Creative Hub did not accept this token. It may be wrong, revoked, or copied with a space.'
  if (status === 403) return 'The token was read, but API access is not switched on for this account.'
  if (status === 404) return 'Not found. The id may be wrong, or it is not one of your products.'
  if (status === 429) return 'Too many requests just now. Try again in a minute.'
  if (status === 409 && body && body.message) return body.message
  return `Creative Hub answered with status ${status}.`
}

async function view(mode, query, base, token) {
  if (mode === 'catalogue') {
    const r = await getJson(base, token, '/v1/products?limit=200&offset=0')
    if (!r.ok) return { ok: false, status: r.status, message: explain(r.status, r.body) }
    const products = ((r.body && r.body.products) || []).map((p) => pick(p, ['id', 'name', 'variant_count', 'shopify_handle']))
    return { ok: true, count: products.length, products }
  }

  if (mode === 'variants') {
    const product = String(query.product || '')
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(product)) return { ok: false, message: 'Add ?product=PRODUCT_ID (from the catalogue page).' }
    const r = await getJson(base, token, `/v1/products/${product}/variants`)
    if (!r.ok) return { ok: false, status: r.status, message: explain(r.status, r.body) }
    const variants = ((r.body && r.body.variants) || []).map((v) => pick(v, VARIANT_FIELDS))
    return { ok: true, product_id: product, count: variants.length, variants }
  }

  if (mode === 'quote') {
    const variant = String(query.variant || '')
    const country = String(query.country || 'GB').toUpperCase()
    const qty = Number.parseInt(query.qty || '1', 10)
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(variant)) return { ok: false, message: 'Add ?variant=VARIANT_ID (from the variants page).' }
    if (!/^[A-Z]{2}$/.test(country)) return { ok: false, message: 'country must be two letters, like GB.' }
    if (!(qty >= 1 && qty <= 50)) return { ok: false, message: 'qty must be between 1 and 50.' }
    const response = await fetch(`${base}/v1/orders/quote`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ items: [{ variant_id: variant, quantity: qty }], delivery_country_code: country }),
      signal: AbortSignal.timeout(10000),
    })
    let body = null
    try {
      body = await response.json()
    } catch (e) {
      body = null
    }
    if (!response.ok) return { ok: false, status: response.status, message: explain(response.status, body), detail: body && (body.detail || body.error_code) }
    return { ok: true, note: 'This is only a quote. Nothing was ordered.', quote: body }
  }

  return { ok: false, message: 'Unknown page.' }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const token = process.env.CREATIVEHUB_API_KEY || process.env.CREATIVEHUB_API_TOKEN
  const base = (process.env.CREATIVEHUB_API_BASE || DEFAULT_BASE).replace(/\/+$/, '')

  if (!token) {
    return res.status(200).json({
      connected: false,
      reason: 'no_token',
      message: 'CREATIVEHUB_API_KEY is not set on this deployment. Add it in Vercel, then redeploy.',
    })
  }

  const query = (req && req.query) || {}
  if (query.view) {
    try {
      return res.status(200).json(await view(String(query.view), query, base, token))
    } catch (error) {
      return res.status(200).json({ ok: false, message: 'Could not reach Creative Hub. ' + (error && error.name === 'TimeoutError' ? 'It took too long.' : '') })
    }
  }

  // The basic check: can we read your orders list?
  try {
    const r = await getJson(base, token, '/v1/orders?limit=1&offset=0')
    if (r.ok) return res.status(200).json({ connected: true, status: r.status, message: 'Creative Hub accepted the token.' })
    const reasons = { 401: 'invalid_token', 403: 'api_access_disabled', 429: 'rate_limited' }
    return res.status(200).json({ connected: false, status: r.status, reason: reasons[r.status] || 'unexpected_status', message: explain(r.status, r.body) })
  } catch (error) {
    return res.status(200).json({ connected: false, reason: 'network_error', message: 'Could not reach Creative Hub. ' + (error && error.name === 'TimeoutError' ? 'It took too long to answer.' : '') })
  }
}
