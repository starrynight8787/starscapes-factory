// Share pages for the things that come from the database: each post, each print, and each collection.
// Plain functions with no dependencies except fetch, so the build script and the tests use exactly the same code.
//
// Rules this keeps:
//   - Only PUBLISHED posts and prints are ever asked for, with the public (anon) key, which is the same view a visitor has.
//   - A post's TEXT is never put in the page's description. Its title and room are enough, and this means a members-only post can never leak its
//     words into a share preview when paid posts exist. (A real excerpt can come later, once each post has an access setting to check.)
//   - A picture is only used if its address is https and a normal picture type; otherwise the room's own share picture stands in.
//   - An id is only used to name a file if it is made of letters, numbers and dashes, so nothing from the database can write outside the build folder.
//   - If the database cannot be reached, or says no, this returns nothing and says why. It never makes the build fail.
//   - A print's page says only what the print's own rows say: its sizes, its frame colour, its lowest price. A price that cannot be read means NO product markup at all.
//   - A print's address is its readable slug when it has one (a safe, lower-case, hyphenated name that is set once and never changes), otherwise its id. Nothing from
//     the database is ever put into the page's code unescaped (see productJsonLd in shareHead.mjs).
//   - A picture's real size is read from the picture itself (the first few kilobytes). If that fails, NO size is stated: a wrong size is worse than none.

import { SHARE_PICTURE_SIZE } from './shareHead.mjs'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
const squash = (v) => clean(v).replace(/\s+/g, ' ')
const cut = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}\u2026`)

export const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/
const PICTURE = /^https:\/\/[^\s'"<>]+\.(jpe?g|png|webp)(\?[^\s'"<>]*)?$/i

// A print's readable address: lower-case letters and numbers joined by single hyphens ("behind-the-curtain"). Anything else is not used as an address.
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const safeSlug = (v) => (SLUG.test(clean(v)) && clean(v).length <= 80 ? clean(v) : '')

// "21x30cm" -> "21 \u00d7 30 cm", the way the print page itself writes a size
export const sizeWords = (label) => clean(label).replace(/\s*x\s*/i, ' \u00d7 ').replace(/\s*cm$/i, ' cm').trim()
const listWords = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

// What the print's own sizes and frames say: the sizes (smallest first), whether it comes framed, unframed or both, the frame colour if there is just one, and the lowest price
export function printFacts(print) {
  const rows = (Array.isArray(print && print.product_variants) ? print.product_variants : []).filter((v) => v && typeof v === 'object')
  const area = (v) => (Number(v.width_mm) > 0 && Number(v.height_mm) > 0 ? Number(v.width_mm) * Number(v.height_mm) : Number.MAX_SAFE_INTEGER)
  const sizes = []
  for (const v of rows.slice().sort((a, b) => area(a) - area(b) || (a.position ?? 0) - (b.position ?? 0))) {
    const label = sizeWords(v.size_label)
    if (label && !sizes.includes(label)) sizes.push(label)
  }
  const framedRows = rows.filter((v) => v.framed)
  const colours = [...new Set(framedRows.map((v) => squash(v.frame_colour).toLowerCase()).filter(Boolean))]
  const prices = rows.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0)
  return { sizes, framed: framedRows.length > 0, unframed: rows.some((v) => !v.framed), colour: colours.length === 1 ? colours[0] : '', from: prices.length ? Math.min(...prices) : null }
}

// A picture address that is safe and works in a share preview, or '' if it is not
export const safePicture = (url) => (PICTURE.test(clean(url)) && clean(url).length <= 2000 ? clean(url) : '')

// ---------- what one page says ----------
// ctx: { siteUrl, siteName, rooms: { slug: name }, images: { key: { file, alt } }, siteImage: key, imageUrl(key) }
function roomPicture(ctx, slug) {
  const key = ctx.images[slug] ? slug : ctx.siteImage
  return { imageUrl: ctx.imageUrl(key), imageAlt: ctx.images[key].alt, imageWidth: SHARE_PICTURE_SIZE.width, imageHeight: SHARE_PICTURE_SIZE.height }
}

export function postPage(post, ctx) {
  const id = clean(post && post.id)
  const title = squash(post && post.title)
  if (!SAFE_ID.test(id) || !title) return null
  const room = ctx.rooms[clean(post.channel)]
  const own = safePicture(post.image_url)
  const picture = own ? { imageUrl: own, imageAlt: `The header picture for "${cut(title, 80)}".` } : roomPicture(ctx, clean(post.channel))
  return {
    urlPath: `/post/${id}`,
    ownPicture: own,
    meta: {
      title: `${cut(title, 100)} | ${ctx.siteName}`,
      description: `${cut(title, 90)}: a post${room ? ` from ${room}` : ''} on ${ctx.siteName}.`,
      siteName: ctx.siteName,
      url: `${ctx.siteUrl}/post/${id}`,
      ...picture,
      index: true,
    },
  }
}

export function printPage(print, ctx) {
  const id = clean(print && print.id)
  const title = squash(print && print.title)
  if (!SAFE_ID.test(id) || !title) return null
  const collection = squash(print.collection)
  const images = Array.isArray(print.images) ? print.images : []
  const own = safePicture(images[0])
  const slug = safeSlug(print.slug)
  const name = cut(title, 70)
  const facts = printFacts(print)
  const url = `${ctx.siteUrl}/art-loft/prints/${slug || id}`
  const finish = facts.framed && facts.unframed ? `Framed${facts.colour ? ` in ${facts.colour}` : ''} or unframed` : facts.framed ? `Framed${facts.colour ? ` in ${facts.colour}` : ''}` : facts.unframed ? 'Unframed' : ''
  const sizes = facts.sizes.length ? `in ${facts.sizes.length === 1 ? 'one size' : `${facts.sizes.length} sizes`} (${listWords(facts.sizes)})` : ''
  const choices = [finish, sizes].filter(Boolean).join(', ')
  const description = cut(`${name}: an abstract acrylic art print${collection ? ` from the ${cut(collection, 40)} collection` : ''}, digitised from my original painting. ${choices ? `${choices}, made` : 'Made'} to order.`, 320)
  // The picture the page shows FIRST is the first size's own picture (the sizes are in their set order), or the artwork when that size has none: exactly what the page chooses
  const firstSize = (Array.isArray(print.product_variants) ? print.product_variants : []).filter((v) => v && typeof v === 'object').slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]
  const preloadImage = safePicture(firstSize && firstSize.image_url) || own
  const picture = own ? { imageUrl: own, imageAlt: `${cut(title, 80)}, abstract art print${collection ? `, ${cut(collection, 40)} collection` : ''}` } : roomPicture(ctx, 'art-loft')
  // Product markup only when there is a real picture of the print and a real price: otherwise the page stays an ordinary page
  const product = own && facts.from !== null ? { name, url, image: own, description, sku: slug || id, brand: ctx.siteName, amount: facts.from.toFixed(2), currency: 'GBP', availability: 'InStock' } : undefined
  return {
    urlPath: `/art-loft/prints/${slug || id}`,
    hasSlug: Boolean(slug),
    ownPicture: own,
    meta: {
      title: `${name}: abstract acrylic art print | ${ctx.siteName}`,
      description,
      siteName: ctx.siteName,
      url,
      ...picture,
      ...(preloadImage ? { preloadImage } : {}),
      ...(product ? { product } : {}),
      index: true,
    },
  }
}

export function collectionPage(collection, ctx) {
  const slug = clean(collection && collection.slug)
  const name = squash(collection && collection.name)
  if (!SAFE_ID.test(slug) || !name) return null
  return {
    urlPath: `/art-loft/collections/${slug}`,
    meta: {
      title: `${name} | ${ctx.siteName}`,
      description: `${cut(squash(collection.blurb), 100)} A collection of art prints from the Art Loft.`.trim(),
      siteName: ctx.siteName,
      url: `${ctx.siteUrl}/art-loft/collections/${slug}`,
      ...roomPicture(ctx, 'art-loft'),
      index: true,
    },
  }
}

// ---------- asking the database ----------
// Returns { rows, note }. Any trouble (no settings, no connection, a refusal) gives no rows and a plain note, and never throws.
export async function readRows(env, table, query, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const url = clean(env.VITE_SUPABASE_URL || env.SUPABASE_URL).replace(/\/+$/, '')
  const key = clean(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY)
  if (!/^https?:\/\//.test(url) || !key) return { rows: [], note: `${table}: no database settings at build time, so these pages were skipped` }
  try {
    const response = await fetchImpl(`${url}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) return { rows: [], note: `${table}: the database answered ${response.status}, so these pages were skipped` }
    const rows = await response.json()
    return Array.isArray(rows) ? { rows, note: '' } : { rows: [], note: `${table}: the database gave an answer that was not a list, so these pages were skipped` }
  } catch (e) {
    return { rows: [], note: `${table}: the database could not be reached, so these pages were skipped` }
  }
}

export const POSTS_QUERY = 'select=id,title,image_url,channel,created_at&published=eq.true&order=created_at.desc&limit=1000'
const VARIANT_COLUMNS = 'size_label,width_mm,height_mm,framed,frame_colour,price,position'
const printsQuery = ({ slug, picture }) => `select=id,${slug ? 'slug,' : ''}title,collection,images,product_variants(${VARIANT_COLUMNS}${picture ? ',image_url' : ''})&fulfilment=eq.creativehub&published=eq.true&order=title.asc&limit=1000`
export const PRINTS_QUERY = printsQuery({ slug: true, picture: true })
// The same without the address column, for a database that has not had print-slugs.sql run yet: prints then keep their long addresses
export const PRINTS_QUERY_NO_SLUG = printsQuery({ slug: false, picture: true })
// And without the sizes' pictures, for an older database that has no picture column: the page then has no preload, and nothing else is lost
export const PRINTS_QUERY_NO_PICTURE = printsQuery({ slug: true, picture: false })
export const PRINTS_QUERY_PLAIN = printsQuery({ slug: false, picture: false })

// ---------- reading a picture's real size ----------
// From the first bytes of a JPEG, PNG or WebP. Returns { width, height } or null (never throws).
export function imageDimensions(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])
  const u16 = (i) => (b[i] << 8) | b[i + 1]
  const le16 = (i) => b[i] | (b[i + 1] << 8)
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const width = ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0
    const height = ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0
    return width > 0 && height > 0 ? { width, height } : null
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue }
      const marker = b[i + 1]
      if (marker === 0xff) { i += 1; continue }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        const height = u16(i + 5)
        const width = u16(i + 7)
        return width > 0 && height > 0 ? { width, height } : null
      }
      i += 2 + u16(i + 2)
    }
    return null
  }
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to))
  if (b.length > 30 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    const kind = ascii(12, 16)
    if (kind === 'VP8 ') { const width = le16(26) & 0x3fff; const height = le16(28) & 0x3fff; return width > 0 && height > 0 ? { width, height } : null }
    if (kind === 'VP8L') { const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0; return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 } }
    if (kind === 'VP8X') return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) }
  }
  return null
}

// Fetch only the start of a picture (a few hundred kilobytes at most) and read its size. null when it cannot be read: the page then states no size.
export async function imageSize(url, { fetchImpl = fetch, timeoutMs = 8000, limit = 262144 } = {}) {
  try {
    const response = await fetchImpl(url, { headers: { Range: `bytes=0-${limit - 1}`, Accept: 'image/*' }, signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return null
    const chunks = []
    let total = 0
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader()
      while (total < limit) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        total += value.length
      }
      try { await reader.cancel() } catch (e) { /* the rest is not needed */ }
    } else {
      const all = new Uint8Array(await response.arrayBuffer())
      chunks.push(all.subarray(0, limit))
    }
    const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
    let at = 0
    for (const c of chunks) { bytes.set(c, at); at += c.length }
    return imageDimensions(bytes)
  } catch (e) {
    return null
  }
}

async function eachWithLimit(items, limit, work) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await work(items[next++])
  }))
}

// Everything the database can add: one page for each post and print, plus the notes about anything skipped
export async function databasePages(env, ctx, opts = {}) {
  const posts = await readRows(env, 'posts', POSTS_QUERY, opts)
  let prints = await readRows(env, 'products', PRINTS_QUERY, opts)
  const notes = [posts.note]
  if (prints.note) {
    // A database that is missing a column answers 400: ask again without it, so the prints still get their own pages
    const first = prints.note
    for (const [query, why] of [
      [PRINTS_QUERY_NO_SLUG, 'products: the address (slug) column is not in the database yet, so prints keep their long addresses. Run sql/print-slugs.sql.'],
      [PRINTS_QUERY_NO_PICTURE, 'products: the sizes\' picture column is not in the database yet, so print pages have no picture preload.'],
      [PRINTS_QUERY_PLAIN, 'products: neither the address column nor the sizes\' picture column is in the database yet, so prints keep their long addresses and have no picture preload.'],
    ]) {
      const again = await readRows(env, 'products', query, opts)
      if (!again.note) { prints = { rows: again.rows, note: '' }; notes.push(why); break }
    }
    if (prints.note) notes.push(first)
  }
  const pages = [
    ...posts.rows.map((r) => postPage(r, ctx)),
    ...prints.rows.map((r) => printPage(r, ctx)),
  ].filter(Boolean)
  // Read each picture's real size, so the page never states a wrong one. SHARE_IMAGE_SIZES=off skips this (the tests use it so they never call the internet).
  const measure = opts.measure || (env.SHARE_IMAGE_SIZES === 'off' ? async () => null : (url) => imageSize(url, opts))
  const withPicture = pages.filter((p) => p.ownPicture)
  let measured = 0
  await eachWithLimit(withPicture, 6, async (page) => {
    const size = await measure(page.ownPicture)
    if (size && size.width > 0 && size.height > 0) {
      page.meta.imageWidth = size.width
      page.meta.imageHeight = size.height
      measured += 1
    }
  })
  if (withPicture.length && measured < withPicture.length) notes.push(`${withPicture.length - measured} of ${withPicture.length} pictures could not be measured, so those pages state no picture size`)
  // What was actually written, not what was read: a row with no title or an unsafe id is skipped
  const printPages = pages.filter((p) => p.urlPath.startsWith('/art-loft/prints/'))
  const counts = { posts: pages.filter((p) => p.urlPath.startsWith('/post/')).length, prints: printPages.length, printsWithSlug: printPages.filter((p) => p.hasSlug).length, products: printPages.filter((p) => p.meta.product).length }
  return { pages, counts, notes: [...notes, prints.note].filter(Boolean) }
}
