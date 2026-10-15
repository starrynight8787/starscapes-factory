// Vercel serverless function: the owner's private Creative Hub tools. Everything here is read-only.
//
// - Nothing here places an order or costs anything. A quote only asks "what would this cost?".
// - It never shows the Creative Hub key. The key lives in Vercel as CREATIVEHUB_API_KEY, on the server only.
// - It shows catalogue and cost information, so it is LOCKED to the shop owner: every request must carry the owner's
//   sign-in, and the email must match OWNER_EMAIL in Vercel (see lib/ownerGuard.js). Nobody else gets anything.
// - You use it from the publish page (/art-loft/admin), not by typing addresses.
//
// What it can do:
//   (no view)                  is the connection working?
//   view=catalogue-json        every print with its sizes and frames (the Sync button uses this)
//   view=variant-pictures-json every size and frame's picture (the Pictures only button uses this)
//   view=delivery-table        delivery cost and margin for every size and frame, by zone
//   view=delivery-check        the cheapest and dearest print to 13 countries, with the margin if delivery is free
//
// Creative Hub's address is https://escher-v2.creativehub.io. You can point at another one with the
// optional setting CREATIVEHUB_API_BASE.

import { requireOwner, sendDenied } from '../lib/ownerGuard.js'

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
const safePictureUrl = (value) =>
  typeof value === 'string' && value.length < 500 && /^https:\/\/[^\s'"<>\\$]+$/.test(value) ? value : null

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


// Puts each print in its collection (matched by name) and then shows a check table.
// Good looks like: counts per collection, a TOTAL, and NO rows under "no collection yet",
// "duplicate name" or "blank name".

// Every print in Creative Hub with all of its sizes and frames. Used by the import and by the pictures page.
async function loadProductsWithVariants(base, token) {
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
  return { withVariants: withVariants.filter(Boolean), failed, skipped }
}

// Every size and frame that has a picture we can trust, as { variant_id, url }
function collectPictures(withVariants) {
  const rows = []
  let total = 0
  for (const p of withVariants) {
    for (const v of p.variants) {
      total++
      const url = safePictureUrl(v.visualised_product_url)
      if (url) rows.push({ variant_id: v.id, url })
    }
  }
  return { rows, total }
}

// What you keep on one order if delivery is free: the same sum everywhere it is shown.
// UK sales carry 20% VAT, which you pass on, so a UK margin is worked on the price without VAT. Overseas, the price is taken as it is.
function workOutMargin(country, price, quote) {
  const fee = stripeFee(price, country)
  const costIncl = Number(quote.total_incl_vat)
  const costExcl = Number(quote.total_excl_vat)
  const revenue = country === 'GB' ? price / 1.2 : price
  const cost = country === 'GB' ? costExcl : costIncl
  const profit = revenue - cost - fee
  const margin = Math.round((profit / revenue) * 100)
  return {
    production: money(quote.production_cost),
    delivery_you_pay: money(quote.delivery_cost),
    stripe_fee: money(fee),
    profit_if_delivery_is_free: money(profit),
    margin_percent: margin,
    flag: profit < 0 ? 'LOSS' : margin < 30 ? 'LOW' : 'ok',
  }
}

// ---- delivery-check: what free delivery costs you, country by country ------------------------------------------
// Asks Creative Hub's own quote (free, nothing is ordered) for the cheapest print and the most expensive print to each
// country, and works out the margin you keep if delivery is free. Read-only. It shows costs, so it is scaffolding for you,
// not for visitors: it comes down with the other check pages.
const DELIVERY_CHECK_COUNTRIES = ['GB', 'IE', 'DE', 'FR', 'US', 'CA', 'AU', 'NZ', 'JP', 'SG', 'AE', 'ZA', 'BR']

async function quoteWithRetry(base, token, variantId, country) {
  let q = await quoteOne(base, token, variantId, country)
  if (q.status === 429) {
    await pause(2500)
    q = await quoteOne(base, token, variantId, country)
  }
  return q
}

async function deliveryCheck(query, base, token) {
  let product = String(query.product || '')
  if (!product) {
    const list = await getJson(base, token, '/v1/products?limit=1&offset=0')
    product = list.ok && list.body && list.body.products && list.body.products[0] && list.body.products[0].id
  }
  if (!product || !/^[A-Za-z0-9_-]{1,100}$/.test(product)) return { ok: false, message: 'No product found. Add ?product=PRODUCT_ID.' }
  const vr = await getJson(base, token, `/v1/products/${product}/variants`)
  if (!vr.ok) return { ok: false, status: vr.status, message: explain(vr.status, vr.body) }
  const variants = ((vr.body && vr.body.variants) || [])
    .filter((v) => v && Number.isFinite(Number(v.retail_price)))
    .sort((a, b) => a.print_width_mm * a.print_height_mm - b.print_width_mm * b.print_height_mm || Number(a.is_framed) - Number(b.is_framed))
  if (variants.length === 0) return { ok: false, message: 'That print has no sizes with a price.' }
  const cheapest = variants.find((v) => !v.is_framed) || variants[0]
  const dearest = [...variants].reverse().find((v) => v.is_framed) || variants[variants.length - 1]
  const picks = cheapest.id === dearest.id ? [cheapest] : [cheapest, dearest]
  const labelOf = (v) => `${v.size} ${v.is_framed ? (v.frame_color || 'framed') + ' frame' : 'unframed'}`

  const jobs = DELIVERY_CHECK_COUNTRIES.flatMap((country) => picks.map((v) => ({ country, v })))
  const rows = await mapLimit(jobs, 3, async ({ country, v }) => {
    const price = Number(v.retail_price)
    const q = await quoteWithRetry(base, token, v.id, country)
    if (!q.ok) return { country, print: labelOf(v), your_price: price, error: explain(q.status, q.body) }
    return { country, print: labelOf(v), your_price: price, ...workOutMargin(country, price, q.body || {}) }
  })
  const good = rows.filter((r) => r.margin_percent !== undefined)
  const worst = good.slice().sort((a, b) => a.margin_percent - b.margin_percent)[0] || null
  return {
    ok: true,
    note: 'Read-only. Uses Creative Hub quotes (free, nothing ordered). Shows your costs, so it is scaffolding that comes down with the other check pages.',
    product_id: product,
    assumptions: [
      'Delivery is free to the customer, so you pay whatever Creative Hub charges for it.',
      'UK prices include 20% VAT, which is passed on, so UK margins are worked on the price without VAT.',
      'Overseas, the price is taken as it is (UK VAT does not normally apply to exports, to be confirmed by your accountant). Import taxes and duties abroad are not included.',
      'Stripe fee: 1.5% + 20p for UK cards, 2.5% + 20p for European cards, 3.25% + 20p for others.',
      'Profit is before tax, packaging, returns and your own time.',
    ],
    summary: {
      worst_margin_percent: worst ? worst.margin_percent : null,
      worst_case: worst ? `${worst.print} to ${worst.country}` : null,
      losing_money: good.filter((r) => r.flag === 'LOSS').map((r) => `${r.print} to ${r.country}`),
      low_margin: good.filter((r) => r.flag === 'LOW').map((r) => `${r.print} to ${r.country}`),
      could_not_check: rows.filter((r) => r.error).map((r) => `${r.print} to ${r.country}`),
    },
    rows: rows.slice().sort((a, b) => (a.margin_percent ?? 999) - (b.margin_percent ?? 999)),
  }
}

// The whole catalogue as plain data, for the publish page's Sync button. Names, prices, sizes and picture links only.
async function catalogueJson(base, token) {
  const { withVariants, failed, skipped } = await loadProductsWithVariants(base, token)
  if (failed.length) return { ok: false, message: 'Some prints could not be read just now. Wait a minute and try again.', failed, skipped }
  if (withVariants.length === 0) return { ok: false, message: 'Creative Hub has no prints on this account.' }
  const round2 = (n) => Math.round(Number(n) * 100) / 100
  const prints = withVariants.map((p) => ({
    id: p.id,
    name: String(p.name || '').trim().slice(0, 200),
    description: String(p.description || '').slice(0, 5000),
    image: safePictureUrl(p.artwork_preview_medium_url) || safePictureUrl(p.artwork_url) || safePictureUrl(p.artwork_thumbnail_url) || null,
    variants: p.variants
      .filter((v) => Number.isFinite(Number(v.retail_price)))
      .map((v) => ({
        id: v.id,
        sku: String(v.sku || ''),
        size: String(v.size || ''),
        width_mm: Number.isFinite(Number(v.print_width_mm)) ? Math.round(Number(v.print_width_mm)) : null,
        height_mm: Number.isFinite(Number(v.print_height_mm)) ? Math.round(Number(v.print_height_mm)) : null,
        framed: Boolean(v.is_framed),
        frame_colour: v.is_framed && v.frame_color ? String(v.frame_color) : null,
        price: round2(v.retail_price),
        label: variantLabel(v),
        picture: safePictureUrl(v.visualised_product_url),
      })),
  }))
  return { ok: true, count: prints.length, skipped, prints }
}

// The same list as plain data. The publish page uses this to fill in the pictures with a button, no pasting needed.
async function variantPicturesJson(base, token) {
  const { withVariants, failed, skipped } = await loadProductsWithVariants(base, token)
  if (failed.length) return { ok: false, message: 'Some prints could not be read just now. Wait a minute and try again.', failed, skipped }
  const { rows, total } = collectPictures(withVariants)
  if (rows.length === 0) return { ok: false, message: 'Creative Hub did not give a picture for any size or frame.' }
  return { ok: true, prints: withVariants.length, sizes_and_frames: total, with_picture: rows.length, pictures: rows }
}

// ---- delivery-table: delivery cost and margin for every size and frame, by zone -----------------------------------
// Creative Hub prices delivery by zone, so one country stands for each zone. The 13-country check confirms the others.
const ZONES = [
  { key: 'uk', label: 'UK', country: 'GB' },
  { key: 'eu_na', label: 'Europe and North America', country: 'US' },
  { key: 'row', label: 'Rest of the world', country: 'AU' },
]

async function deliveryTable(query, base, token) {
  let product = String(query.product || '')
  if (!product) {
    const list = await getJson(base, token, '/v1/products?limit=1&offset=0')
    product = list.ok && list.body && list.body.products && list.body.products[0] && list.body.products[0].id
  }
  if (!product || !/^[A-Za-z0-9_-]{1,100}$/.test(product)) return { ok: false, message: 'No product found. Add ?product=PRODUCT_ID.' }
  const vr = await getJson(base, token, `/v1/products/${product}/variants`)
  if (!vr.ok) return { ok: false, status: vr.status, message: explain(vr.status, vr.body) }
  const variants = ((vr.body && vr.body.variants) || [])
    .filter((v) => v && Number.isFinite(Number(v.retail_price)))
    .sort((a, b) => a.print_width_mm * a.print_height_mm - b.print_width_mm * b.print_height_mm || Number(a.is_framed) - Number(b.is_framed))
  if (variants.length === 0) return { ok: false, message: 'That print has no sizes with a price.' }

  const jobs = variants.flatMap((v) => ZONES.map((zone) => ({ v, zone })))
  const cells = await mapLimit(jobs, 3, async ({ v, zone }) => {
    const price = Number(v.retail_price)
    const q = await quoteWithRetry(base, token, v.id, zone.country)
    if (!q.ok) return { error: explain(q.status, q.body) }
    return workOutMargin(zone.country, price, q.body || {})
  })
  const rows = variants.map((v, i) => ({
    label: `${v.size} ${v.is_framed ? (v.frame_color || 'framed') + ' frame' : 'unframed'}`,
    your_price: Number(v.retail_price),
    zones: Object.fromEntries(ZONES.map((zone, j) => [zone.key, cells[i * ZONES.length + j]])),
  }))
  const flat = rows.flatMap((r) => ZONES.map((z) => ({ print: r.label, zone: z.label, cell: r.zones[z.key] }))).filter((x) => x.cell.margin_percent !== undefined)
  const worst = flat.slice().sort((a, b) => a.cell.margin_percent - b.cell.margin_percent)[0] || null
  return {
    ok: true,
    note: 'Read-only. Uses Creative Hub quotes (free, nothing ordered).',
    product_id: product,
    zones: ZONES.map(({ key, label, country }) => ({ key, label, country })),
    assumptions: [
      'Delivery is free to the customer, so you pay whatever Creative Hub charges for it.',
      'UK prices include 20% VAT, which is passed on, so UK margins are worked on the price without VAT.',
      'Overseas, the price is taken as it is (UK VAT does not normally apply to exports, to be confirmed by your accountant). Import taxes and duties abroad are not included.',
      'Stripe fee: 1.5% + 20p for UK cards, 2.5% + 20p for European cards, 3.25% + 20p for others.',
      'Profit is before tax, packaging, returns and your own time.',
      'One country stands for each zone: the UK for the UK, the US for Europe and North America, Australia for the rest of the world.',
    ],
    summary: {
      worst_margin_percent: worst ? worst.cell.margin_percent : null,
      worst_case: worst ? `${worst.print} to ${worst.zone}` : null,
      losing_money: flat.filter((x) => x.cell.flag === 'LOSS').map((x) => `${x.print} to ${x.zone}`),
      low_margin: flat.filter((x) => x.cell.flag === 'LOW').map((x) => `${x.print} to ${x.zone}`),
    },
    rows,
  }
}

async function view(mode, query, base, token) {
  if (mode === 'delivery-table') return deliveryTable(query, base, token)
  if (mode === 'delivery-check') return deliveryCheck(query, base, token)
  if (mode === 'variant-pictures-json') return variantPicturesJson(base, token)
  if (mode === 'catalogue-json') return catalogueJson(base, token)
  return { ok: false, message: 'Unknown page.' }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // Everything below is private. Only the shop owner gets past here.
  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)

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
    if (r.ok) return res.status(200).json({ connected: true, status: r.status, message: 'Creative Hub accepted the key.' })
    const reasons = { 401: 'invalid_token', 403: 'api_access_disabled', 429: 'rate_limited' }
    return res.status(200).json({ connected: false, status: r.status, reason: reasons[r.status] || 'unexpected_status', message: explain(r.status, r.body) })
  } catch (error) {
    return res.status(200).json({ connected: false, reason: 'network_error', message: 'Could not reach Creative Hub. ' + (error && error.name === 'TimeoutError' ? 'It took too long to answer.' : '') })
  }
}
