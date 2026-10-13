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
//   /api/creativehub-check?view=import-sql&email=YOU@EXAMPLE.COM   the SQL that imports your prints into the shop
//
// Creative Hub's address is https://escher-v2.creativehub.io. You can point at another one with the
// optional setting CREATIVEHUB_API_BASE.

const DEFAULT_BASE = 'https://escher-v2.creativehub.io'

// Importing 48 prints takes a few seconds, so allow this function a little longer than usual
export const config = { maxDuration: 60 }

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


// ---------------------------------------------------------------------------------------------
// Import SQL. Builds a block of SQL that you paste into Supabase's SQL editor. It adds your Creative
// Hub prints to the shop as DRAFTS (not published), with each size/frame as a variant. It is safe to
// run twice: it updates what it already added and never touches collections or published status.
// ---------------------------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// The import block is wrapped in a $sf_import$ ... $sf_import$ quote, so that tag must never appear inside the data
const sqlText = (value) =>
  `'${String(value === null || value === undefined ? '' : value).replace(/\u0000/g, '').replace(/\$sf_import\$/g, '').replace(/'/g, "''")}'`
const sqlNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : 'null'
}
const sqlInt = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? String(Math.round(n)) : 'null'
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getWithRetry(base, token, path) {
  let r = await getJson(base, token, path)
  if (r.status === 429) {
    await pause(2000)
    r = await getJson(base, token, path)
  }
  return r
}

async function listAllProducts(base, token) {
  const all = []
  for (let page = 0; page < 5; page++) {
    const r = await getWithRetry(base, token, `/v1/products?limit=200&offset=${page * 200}`)
    if (!r.ok) throw new Error(`product list failed (${r.status})`)
    const batch = (r.body && r.body.products) || []
    all.push(...batch)
    if (batch.length < 200) break
  }
  return all
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

function variantLabel(v) {
  return `${v.size || `${Math.round(v.print_width_mm / 10)}x${Math.round(v.print_height_mm / 10)}cm`} ${v.is_framed ? (v.frame_color || 'framed') + ' frame' : 'unframed'}`
}

function buildImportSql(email, products) {
  const lines = []
  lines.push('-- Starscapes Factory: import Creative Hub prints into the shop (as drafts).')
  lines.push('-- Paste all of this into Supabase > SQL Editor and click Run.')
  lines.push('-- Safe to run again: it updates these prints, and leaves collections and published status alone.')
  lines.push('do $sf_import$')
  lines.push('declare')
  lines.push('  me uuid;')
  lines.push('  pid uuid;')
  lines.push('  n int := 0;')
  lines.push('begin')
  lines.push(`  select id into me from auth.users where lower(email) = lower(${sqlText(email)}) limit 1;`)
  lines.push("  if me is null then raise exception 'No Supabase account found for that email. Check the email in the address and try again.'; end if;")
  for (const p of products) {
    const variants = p.variants
    const fromPrice = Math.min(...variants.map((v) => Number(v.retail_price)).filter((x) => Number.isFinite(x)))
    const image = p.artwork_preview_medium_url || p.artwork_url || p.artwork_thumbnail_url
    lines.push('')
    lines.push(`  -- ${String(p.name || '').replace(/[\r\n]+/g, ' ').replace(/\$sf_import\$/g, '')}`)
    lines.push('  insert into products (title, description, price, product_type, collection, author_id, published, images, creativehub_product_id, fulfilment)')
    lines.push(
      `  values (${sqlText(p.name)}, ${sqlText(p.description || '')}, ${Number.isFinite(fromPrice) ? sqlNum(fromPrice) : '0'}, 'print', '', me, false, ` +
        `${image ? `array[${sqlText(image)}]::text[]` : "'{}'::text[]"}, ${sqlText(p.id)}, 'creativehub')`
    )
    lines.push('  on conflict (creativehub_product_id) do update set title = excluded.title, description = excluded.description, price = excluded.price, images = excluded.images')
    lines.push('  returning id into pid;')
    lines.push('  insert into product_variants (product_id, label, size_label, width_mm, height_mm, framed, frame_colour, price, creativehub_variant_id, creativehub_sku, position) values')
    lines.push(
      variants
        .map(
          (v, i) =>
            `    (pid, ${sqlText(variantLabel(v))}, ${sqlText(v.size || '')}, ${sqlInt(v.print_width_mm)}, ${sqlInt(v.print_height_mm)}, ${v.is_framed ? 'true' : 'false'}, ` +
            `${v.is_framed && v.frame_color ? sqlText(v.frame_color) : 'null'}, ${sqlNum(v.retail_price)}, ${sqlText(v.id)}, ${sqlText(v.sku || '')}, ${i})`
        )
        .join(',\n')
    )
    lines.push(
      '  on conflict (creativehub_variant_id) do update set product_id = excluded.product_id, label = excluded.label, size_label = excluded.size_label, ' +
        'width_mm = excluded.width_mm, height_mm = excluded.height_mm, framed = excluded.framed, frame_colour = excluded.frame_colour, ' +
        'price = excluded.price, creativehub_sku = excluded.creativehub_sku, position = excluded.position;'
    )
    lines.push('  n := n + 1;')
  }
  lines.push('')
  lines.push("  raise notice 'Imported % prints with their sizes and frames.', n;")
  lines.push('end')
  lines.push('$sf_import$;')
  return lines.join('\n')
}

async function importSql(query, base, token) {
  const email = String(query.email || '').trim()
  if (!/^[^\s'"\\;<>]+@[^\s'"\\;<>]+\.[^\s'"\\;<>]+$/.test(email)) {
    return { ok: false, message: 'Add &email=YOUR_LOGIN_EMAIL to the address: the email you sign in to your shop with.' }
  }
  const list = await listAllProducts(base, token)
  const usable = list.filter((p) => p && UUID_RE.test(String(p.id)))
  const skipped = list.length - usable.length
  const failed = []
  const withVariants = await mapLimit(usable, 4, async (p) => {
    const r = await getWithRetry(base, token, `/v1/products/${p.id}/variants`)
    const variants = r.ok && r.body && Array.isArray(r.body.variants) ? r.body.variants.filter((v) => v && UUID_RE.test(String(v.id))) : []
    if (!r.ok || variants.length === 0) {
      failed.push(p.name || p.id)
      return null
    }
    return { ...p, variants: variants.sort((a, b) => a.print_width_mm * a.print_height_mm - b.print_width_mm * b.print_height_mm || Number(a.is_framed) - Number(b.is_framed)) }
  })
  if (failed.length) {
    return { ok: false, message: 'Some prints could not be read, so nothing was produced. Wait a minute and reload.', failed, skipped }
  }
  return { __text: buildImportSql(email, withVariants.filter(Boolean)) }
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

  if (mode === 'import-sql') return importSql(query, base, token)

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
      const result = await view(String(query.view), query, base, token)
      if (result && typeof result.__text === 'string') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.status(200).send(result.__text)
      }
      return res.status(200).json(result)
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
