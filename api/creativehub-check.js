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
//   /api/creativehub-check?view=margins&country=GB                 every size/frame priced against your cost
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


// Countries whose cards Stripe charges at its European rate (everything else outside the UK is "international")
const EEA = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE'])

// Stripe's published UK card rates: 1.5% + 20p (UK cards), 2.5% + 20p (EEA cards), 3.25% + 20p (international cards).
// This assumes the customer's card is from the country the order is going to.
function stripeFee(price, country) {
  const pct = country === 'GB' ? 0.015 : EEA.has(country) ? 0.025 : 0.0325
  return price * pct + 0.2
}

const money = (n) => (n === null || n === undefined ? null : Math.round(n * 100) / 100)

async function quoteOne(base, token, variantId, country) {
  const response = await fetch(`${base}/v1/orders/quote`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ items: [{ variant_id: variantId, quantity: 1 }], delivery_country_code: country }),
    signal: AbortSignal.timeout(10000),
  })
  let body = null
  try {
    body = await response.json()
  } catch (e) {
    body = null
  }
  return { ok: response.ok, status: response.status, body }
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

  if (mode === 'margins') {
    const country = String(query.country || 'GB').toUpperCase()
    if (!/^[A-Z]{2}$/.test(country)) return { ok: false, message: 'country must be two letters, like GB.' }
    let product = String(query.product || '')
    if (!product) {
      const list = await getJson(base, token, '/v1/products?limit=1&offset=0')
      product = list.ok && list.body && list.body.products && list.body.products[0] && list.body.products[0].id
    }
    if (!product || !/^[A-Za-z0-9_-]{1,100}$/.test(product)) return { ok: false, message: 'No product found. Add ?product=PRODUCT_ID.' }
    const vr = await getJson(base, token, `/v1/products/${product}/variants`)
    if (!vr.ok) return { ok: false, status: vr.status, message: explain(vr.status, vr.body) }
    const variants = ((vr.body && vr.body.variants) || []).slice().sort(
      (a, b) => a.print_width_mm * a.print_height_mm - b.print_width_mm * b.print_height_mm || Number(a.is_framed) - Number(b.is_framed)
    )
    const rows = await Promise.all(
      variants.map(async (v) => {
        const label = `${v.size} ${v.is_framed ? (v.frame_color || 'framed') + ' frame' : 'unframed'}`
        const q = await quoteOne(base, token, v.id, country)
        if (!q.ok) return { label, price: v.retail_price, error: explain(q.status, q.body) }
        const c = q.body
        const price = Number(v.retail_price)
        const fee = stripeFee(price, country)
        const costIncl = Number(c.total_incl_vat)
        const costExcl = Number(c.total_excl_vat)
        const profitNoVat = price - costIncl - fee
        const row = {
          label,
          your_price: price,
          creative_hub_cost_incl_vat: money(costIncl),
          of_which_production: money(c.production_cost),
          of_which_delivery: money(c.delivery_cost),
          stripe_fee: money(fee),
          profit_if_not_vat_registered: money(profitNoVat),
          margin_if_not_vat_registered: Math.round((profitNoVat / price) * 100) + '%',
        }
        if (country === 'GB') {
          const net = price / 1.2
          const profitVat = net - costExcl - fee
          row.profit_if_vat_registered = money(profitVat)
          row.margin_if_vat_registered = Math.round((profitVat / net) * 100) + '%'
        }
        return row
      })
    )
    return {
      ok: true,
      country,
      product_id: product,
      assumptions: [
        'your_price is the retail price set in Creative Hub. It is not a price on your own site yet.',
        'Stripe fee uses its published UK card rates for a card from the same country as the delivery address.',
        'Profit is before tax, and before any packaging, returns or your own time.',
        'If you are not VAT-registered, the VAT Creative Hub charges you is a real cost. If you are, you can reclaim it, and your price includes 20% VAT (UK only).',
      ],
      rows,
    }
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
