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

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()
const squash = (v) => clean(v).replace(/\s+/g, ' ')
const cut = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}\u2026`)

export const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/
const PICTURE = /^https:\/\/[^\s'"<>]+\.(jpe?g|png|webp)(\?[^\s'"<>]*)?$/i

// A picture address that is safe and works in a share preview, or '' if it is not
export const safePicture = (url) => (PICTURE.test(clean(url)) && clean(url).length <= 2000 ? clean(url) : '')

// ---------- what one page says ----------
// ctx: { siteUrl, siteName, rooms: { slug: name }, images: { key: { file, alt } }, siteImage: key, imageUrl(key) }
function roomPicture(ctx, slug) {
  const key = ctx.images[slug] ? slug : ctx.siteImage
  return { imageUrl: ctx.imageUrl(key), imageAlt: ctx.images[key].alt }
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
  const picture = own ? { imageUrl: own, imageAlt: `${cut(title, 80)}, an art print.` } : roomPicture(ctx, 'art-loft')
  return {
    urlPath: `/art-loft/prints/${id}`,
    meta: {
      title: `${cut(title, 100)} | ${ctx.siteName}`,
      description: `${cut(title, 70)}: an art print${collection ? ` from the ${cut(collection, 40)} collection` : ''}, made to order in a choice of sizes and frames.`,
      siteName: ctx.siteName,
      url: `${ctx.siteUrl}/art-loft/prints/${id}`,
      ...picture,
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
export const PRINTS_QUERY = 'select=id,title,collection,images&fulfilment=eq.creativehub&published=eq.true&order=title.asc&limit=1000'

// Everything the database can add: one page for each post and print, plus the notes about anything skipped
export async function databasePages(env, ctx, opts = {}) {
  const posts = await readRows(env, 'posts', POSTS_QUERY, opts)
  const prints = await readRows(env, 'products', PRINTS_QUERY, opts)
  const pages = [
    ...posts.rows.map((r) => postPage(r, ctx)),
    ...prints.rows.map((r) => printPage(r, ctx)),
  ].filter(Boolean)
  // What was actually written, not what was read: a row with no title or an unsafe id is skipped
  const counts = { posts: pages.filter((p) => p.urlPath.startsWith('/post/')).length, prints: pages.filter((p) => p.urlPath.startsWith('/art-loft/prints/')).length }
  return { pages, counts, notes: [posts.note, prints.note].filter(Boolean) }
}
