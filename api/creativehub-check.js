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
//   /api/creativehub-check?view=delivery-check                     what free delivery costs you, country by country (cheapest and dearest print, 13 countries)
//   /api/creativehub-check?view=catalogue-json                     every print with its sizes and frames as plain data (the publish page's Sync button uses this)
//   /api/creativehub-check?view=variant-pictures-json              the same pictures as plain data (the publish page's button uses this)
//   /api/creativehub-check?view=variant-pictures-sql               the SQL that adds Creative Hub's picture of every size and frame to the shop
//   /api/creativehub-check?view=inspect                            what pictures does Creative Hub give for a print? (add &product=PRODUCT_ID to pick one)
//   /api/creativehub-check?view=import-sql&email=YOU@EXAMPLE.COM   the SQL that imports your prints into the shop
//        add &collections=yes to also put each print in its collection and show a check table
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
// Creative Hub's picture of one size/frame. Only plain https addresses are accepted, anything else becomes null.
const safePictureUrl = (value) =>
  typeof value === 'string' && value.length < 500 && /^https:\/\/[^\s'"<>\\$]+$/.test(value) ? value : null
const sqlPicture = (value) => {
  const url = safePictureUrl(value)
  return url ? sqlText(url) : 'null'
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


// Puts each print in its collection (matched by name) and then shows a check table.
// Good looks like: counts per collection, a TOTAL, and NO rows under "no collection yet",
// "duplicate name" or "blank name".
const COLLECTIONS_SQL = `-- Put each print in its collection, then check the result.
with lists(collection, names) as (values
  ('Dance Like You Just Don''t Care', array['tango','swing dance','tap dancing','salsa','party','jazz dance','murder on the dance floor','ballroom','ballet','contemporary','contempory','spinning']),
  ('Out of this World', array['tops of jupiter','stargazing','into the nebula','far far away','behind the curtain','heartless heart']),
  ('Ocean''s View', array['ocean''s breeze','sandy islands','beaches','before the sunset']),
  ('Calm Series', array['forests','tranquillity','tranquility','the first snow','freshly cut grass','afternoon sun','tartan','rainbows','lucky','festive season','neon lights','floating','sunrise']),
  ('Unique One of a Kind', array['rain forest','riverbank','retro','scrap materials','quilting','patchwork','mosaic','parkside','golden bridges'])
)
update products p
set collection = l.collection
from lists l
where p.fulfilment = 'creativehub'
  and lower(replace(trim(p.title), '\u2019', '''')) = any (l.names);

select 'collection count' as check, collection as detail, count(*)::text as value
  from products where fulfilment = 'creativehub' and coalesce(collection, '') <> '' group by collection
union all
select 'TOTAL prints', '', count(*)::text from products where fulfilment = 'creativehub'
union all
select 'no collection yet', title, creativehub_product_id from products
  where fulfilment = 'creativehub' and coalesce(collection, '') = ''
union all
select 'duplicate name', min(title), count(*)::text from products
  where fulfilment = 'creativehub' group by lower(trim(title)) having count(*) > 1
union all
select 'blank name', coalesce(title, ''), creativehub_product_id from products
  where fulfilment = 'creativehub' and trim(coalesce(title, '')) = ''
order by 1, 2;`

function buildImportSql(email, products, withCollections = false) {
  const lines = []
  lines.push('-- Starscapes Factory: import Creative Hub prints into the shop (as drafts).')
  lines.push('-- Paste all of this into Supabase > SQL Editor and click Run.')
  lines.push('-- Safe to run again: it updates these prints, and leaves collections and published status alone.')
  lines.push('do $sf_import$')
  lines.push('declare')
  lines.push('  me uuid;')
  lines.push('  pid uuid;')
  lines.push('  n int := 0;')
  lines.push('  removed int := 0;')
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
    lines.push('  insert into product_variants (product_id, label, size_label, width_mm, height_mm, framed, frame_colour, price, creativehub_variant_id, creativehub_sku, position, image_url) values')
    lines.push(
      variants
        .map(
          (v, i) =>
            `    (pid, ${sqlText(variantLabel(v))}, ${sqlText(v.size || '')}, ${sqlInt(v.print_width_mm)}, ${sqlInt(v.print_height_mm)}, ${v.is_framed ? 'true' : 'false'}, ` +
            `${v.is_framed && v.frame_color ? sqlText(v.frame_color) : 'null'}, ${sqlNum(v.retail_price)}, ${sqlText(v.id)}, ${sqlText(v.sku || '')}, ${i}, ${sqlPicture(v.visualised_product_url)})`
        )
        .join(',\n')
    )
    lines.push(
      '  on conflict (creativehub_variant_id) do update set product_id = excluded.product_id, label = excluded.label, size_label = excluded.size_label, ' +
        'width_mm = excluded.width_mm, height_mm = excluded.height_mm, framed = excluded.framed, frame_colour = excluded.frame_colour, ' +
        'price = excluded.price, creativehub_sku = excluded.creativehub_sku, position = excluded.position, ' +
        'image_url = coalesce(excluded.image_url, product_variants.image_url);'
    )
    lines.push('  n := n + 1;')
  }
  lines.push('')
  lines.push("  raise notice 'Imported % prints with their sizes and frames.', n;")
  const idList = `array[${products.map((p) => sqlText(p.id)).join(', ')}]::text[]`
  lines.push('')
  lines.push('  -- Prints that are no longer in Creative Hub: drafts are removed, and anything already published is unpublished instead.')
  lines.push('  if n >= 1 then')
  lines.push(`    delete from products where fulfilment = 'creativehub' and published = false and creativehub_product_id <> all (${idList});`)
  lines.push('    get diagnostics removed = row_count;')
  lines.push(`    update products set published = false where fulfilment = 'creativehub' and published = true and creativehub_product_id <> all (${idList});`)
  lines.push("    raise notice 'Removed % draft prints that are no longer in Creative Hub.', removed;")
  lines.push('  end if;')
  lines.push('end')
  lines.push('$sf_import$;')
  if (withCollections) {
    lines.push('')
    lines.push(COLLECTIONS_SQL)
  }
  return lines.join('\n')
}

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

async function importSql(query, base, token) {
  const email = String(query.email || '').trim()
  if (!/^[^\s'"\\;<>]+@[^\s'"\\;<>]+\.[^\s'"\\;<>]+$/.test(email)) {
    return { ok: false, message: 'Add &email=YOUR_LOGIN_EMAIL to the address: the email you sign in to your shop with.' }
  }
  const { withVariants, failed, skipped } = await loadProductsWithVariants(base, token)
  if (failed.length) {
    return { ok: false, message: 'Some prints could not be read, so nothing was produced. Wait a minute and reload.', failed, skipped }
  }
  const withCollections = String(query.collections || '').toLowerCase() === 'yes'
  return { __text: buildImportSql(email, withVariants, withCollections) }
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
    const c = q.body || {}
    const fee = stripeFee(price, country)
    const costIncl = Number(c.total_incl_vat)
    const costExcl = Number(c.total_excl_vat)
    // UK sales carry 20% VAT, which you pass on, so the margin is worked on the price without it. Overseas, the price is taken as it is.
    const revenue = country === 'GB' ? price / 1.2 : price
    const cost = country === 'GB' ? costExcl : costIncl
    const profit = revenue - cost - fee
    const margin = Math.round((profit / revenue) * 100)
    return {
      country,
      print: labelOf(v),
      your_price: price,
      production: money(c.production_cost),
      delivery_you_pay: money(c.delivery_cost),
      stripe_fee: money(fee),
      profit_if_delivery_is_free: money(profit),
      margin_percent: margin,
      flag: profit < 0 ? 'LOSS' : margin < 30 ? 'LOW' : 'ok',
    }
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

// Only the pictures: one UPDATE that gives every size and frame already in the shop its Creative Hub picture.
// It changes nothing else (not prices, collections, or what is published).
async function variantPicturesSql(base, token) {
  const { withVariants, failed, skipped } = await loadProductsWithVariants(base, token)
  if (failed.length) {
    return { ok: false, message: 'Some prints could not be read, so nothing was produced. Wait a minute and reload.', failed, skipped }
  }
  const { rows: found, total } = collectPictures(withVariants)
  const rows = found.map((r) => `  (${sqlText(r.variant_id)}, ${sqlText(r.url)})`)
  if (rows.length === 0) return { ok: false, message: 'Creative Hub did not give a picture for any size or frame.' }
  const text = [
    "-- Starscapes Factory: add Creative Hub's picture of each size and frame to the shop.",
    '-- Paste all of this into Supabase > SQL Editor and click Run. Safe to run more than once.',
    '-- It only fills in the picture column. Prices, collections and what is published are not touched.',
    `-- ${withVariants.length} prints, ${total} sizes and frames, ${rows.length} with a picture${total > rows.length ? ` (${total - rows.length} without one are left as they are)` : ''}.`,
    '',
    'update product_variants pv set image_url = v.url',
    'from (values',
    rows.join(',\n'),
    ') as v(variant_id, url)',
    'where pv.creativehub_variant_id = v.variant_id;',
    '',
    '-- The result below should show the same number in both columns (a few fewer if some prints are not in the shop yet).',
    'select count(*) filter (where image_url is not null) as with_pictures, count(*) as sizes_and_frames_in_shop from product_variants;',
    '',
  ].join('\n')
  return { __text: text }
}

// ---- inspect: find out what pictures Creative Hub gives us ---------------------------------------
// Read-only. It lists FIELD NAMES and picture links only (never prices or costs), because this page is open to anyone.
const looksLikeUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v)
const PICTURE_KEY = /image|img|mockup|mock_up|preview|thumb|photo|picture|media|render|lifestyle|scene|gallery|url/i

function pictureFields(value, where, depth = 0, found = []) {
  if (found.length >= 40 || value === null || typeof value !== 'object') return found
  for (const [key, v] of Object.entries(value)) {
    const here = Array.isArray(value) ? `${where}[${key}]` : `${where}.${key}`
    if (looksLikeUrl(v) || (typeof v === 'string' && PICTURE_KEY.test(key))) found.push({ where: here, value: String(v).slice(0, 300) })
    else if (v && typeof v === 'object' && depth < 4) pictureFields(v, here, depth + 1, found)
  }
  return found
}

async function inspectPictures(query, base, token) {
  const list = await getJson(base, token, '/v1/products?limit=200&offset=0')
  if (!list.ok) return { ok: false, status: list.status, message: explain(list.status, list.body) }
  const products = (list.body && list.body.products) || []
  if (products.length === 0) return { ok: false, message: 'Creative Hub has no products on this account.' }

  const wanted = String(query.product || '')
  if (wanted && !/^[A-Za-z0-9_-]{4,80}$/.test(wanted)) return { ok: false, message: 'That product id does not look right. Leave off &product=... to use your first product.' }
  const product = wanted ? products.find((p) => p && p.id === wanted) : products[0]
  if (!product) return { ok: false, message: 'Not one of your products. Leave off &product=... to use your first product.' }

  const vr = await getJson(base, token, `/v1/products/${product.id}/variants`)
  if (!vr.ok) return { ok: false, status: vr.status, message: explain(vr.status, vr.body) }
  const variants = ((vr.body && vr.body.variants) || []).filter(Boolean)
  const framed = variants.find((v) => v.is_framed)
  const unframed = variants.find((v) => !v.is_framed)

  // every picture-like field that appears on ANY variant, with one example each
  const onVariants = new Map()
  for (const v of variants) {
    for (const f of pictureFields(v, 'variant')) if (!onVariants.has(f.where)) onVariants.set(f.where, f.value)
  }

  // a few likely places for more pictures. These are only ever read, and a "not found" is harmless.
  const guesses = [`/v1/products/${product.id}`, `/v1/products/${product.id}/images`, `/v1/products/${product.id}/mockups`]
  if (framed) guesses.push(`/v1/products/${product.id}/variants/${framed.id}`, `/v1/variants/${framed.id}`)
  const otherPlaces = []
  for (const path of guesses) {
    const r = await getJson(base, token, path)
    otherPlaces.push({
      path: path.replace(framed ? framed.id : '\u0000', 'FRAMED_VARIANT_ID').replace(product.id, 'PRODUCT_ID'),
      status: r.status,
      field_names: r.ok && r.body && typeof r.body === 'object' ? Object.keys(r.body).slice(0, 60) : null,
      picture_fields: r.ok && r.body ? pictureFields(r.body, 'response') : [],
    })
  }

  return {
    ok: true,
    note: 'Read-only. Field names and picture links only. Send this whole page to Claude.',
    product: { name: product.name, id: product.id, variant_count: variants.length },
    product_field_names: Object.keys(product),
    picture_fields_on_product: pictureFields(product, 'product'),
    framed_variant_field_names: framed ? Object.keys(framed) : null,
    unframed_variant_field_names: unframed ? Object.keys(unframed) : null,
    picture_fields_on_variants: [...onVariants].map(([where, value]) => ({ where, example: value })),
    other_places_tried: otherPlaces,
  }
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

  if (mode === 'delivery-check') return deliveryCheck(query, base, token)
  if (mode === 'variant-pictures-sql') return variantPicturesSql(base, token)
  if (mode === 'variant-pictures-json') return variantPicturesJson(base, token)
  if (mode === 'catalogue-json') return catalogueJson(base, token)
  if (mode === 'inspect') return inspectPictures(query, base, token)

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
