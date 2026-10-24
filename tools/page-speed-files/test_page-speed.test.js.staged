// @vitest-environment node
// Page speed (the research agent's list on SFW-274, from real PageSpeed results: print page LCP 4.6 s, collection page 6.3 s; aim under 4 s):
//  - the hashed /assets files may be kept for a year, and the page itself may NOT be;
//  - each print page tells the browser, in its head, about the picture it shows first, so the picture starts downloading while the code loads;
//  - the build still works with an older database that lacks a column, and says so.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderHead, preloadTag } from '../scripts/shareHead.mjs'
import { printPage, databasePages, PRINTS_QUERY, PRINTS_QUERY_NO_SLUG, PRINTS_QUERY_NO_PICTURE, PRINTS_QUERY_PLAIN } from '../scripts/dynamicPages.mjs'

const CONFIG = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'))
const SHELL = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Old</title>\n  </head>\n  <body><div id="root"></div></body>\n</html>\n'
const IMAGES = { site: { file: 'site.png', alt: 'x' }, 'art-loft': { file: 'art-loft.png', alt: 'x' } }
const ctx = { siteUrl: 'https://starscapesfactory.com', siteName: 'Starscapes Factory', rooms: {}, images: IMAGES, siteImage: 'site', imageUrl: (k) => `https://starscapesfactory.com/share/${IMAGES[k].file}` }
const ART = 'https://files.creativehub.io/converted/art.jpg'
const v = (position, image_url, framed = false) => ({ size_label: '21x30cm', width_mm: 210, height_mm: 300, framed, frame_colour: framed ? 'Black' : null, price: 89 + position, position, image_url })
const print = (variants, over = {}) => ({ id: 'eb8bc42c-ad85-463e-a61c-3673b033e7c0', slug: 'behind-the-curtain', title: 'Behind the Curtain', collection: 'Out of this World', images: [ART], product_variants: variants, ...over })
const pageMeta = (over = {}) => ({ title: 'T', description: 'D', siteName: 'S', url: 'https://x.test/a', imageUrl: 'https://x.test/i.jpg', imageAlt: 'alt', index: true, ...over })
const count = (html, needle) => html.split(needle).length - 1
// a vercel.json header "source" as a pattern, the way Vercel reads it
const matches = (source, url) => new RegExp(`^${source}$`).test(url)

describe('caching (vercel.json)', () => {
  const rule = (src) => CONFIG.headers.find((h) => h.source === src)
  it('the hashed /assets files and the fonts may be kept for a year (their names change whenever they do)', () => {
    for (const src of ['/assets/(.*)', '/fonts/(.*)']) { expect(rule(src), src).toBeTruthy(); expect(rule(src).headers).toEqual([{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]) }
  })
  it('the pages themselves are NOT given a long life: no header rule reaches the home page, a print page, a collection page, the sitemap or robots.txt', () => {
    for (const url of ['/', '/index.html', '/art-loft', '/art-loft/prints/behind-the-curtain', '/art-loft/collections/calm-series', '/sitemap.xml', '/robots.txt']) for (const h of CONFIG.headers) expect(matches(h.source, url), `${h.source} must not match ${url}`).toBe(false)
    expect(matches('/assets/(.*)', '/assets/index-Dz4VWwkR.js')).toBe(true)
  })
  it('keeps the redirects, rewrites and daily jobs it already had', () => { expect(CONFIG.rewrites[0].destination).toBe('/index.html'); expect(Array.isArray(CONFIG.crons)).toBe(true); expect(CONFIG.redirects.length).toBe(43) })
})

describe('the picture preload in a print page\u2019s head', () => {
  it('is a preload for an image, high priority, with no crossorigin (the page\u2019s own image has none, so it is the same download)', () => {
    const html = renderHead(SHELL, pageMeta({ preloadImage: 'https://files.creativehub.io/composited/first.jpg' }))
    expect(html).toContain('<link rel="preload" as="image" href="https://files.creativehub.io/composited/first.jpg" fetchpriority="high" />'); expect(html).not.toContain('crossorigin')
  })
  it('is written once however many times a page is put through, and not at all without a picture', () => {
    const meta = pageMeta({ preloadImage: 'https://files.creativehub.io/composited/first.jpg' })
    const once = renderHead(SHELL, meta); const twice = renderHead(once, meta); expect(twice).toBe(once); expect(count(twice, 'rel="preload"')).toBe(1)
    expect(renderHead(SHELL, pageMeta())).not.toContain('preload')
    expect(renderHead(once, pageMeta())).not.toContain('preload') // an old one is taken out when there is no new one
  })
  it('only ever uses a plain https address: nothing else can become part of the page', () => {
    for (const bad of ['', undefined, null, 'http://files.example/x.jpg', '/relative.jpg', 'javascript:alert(1)', 'https://x.test/a b.jpg', 'https://x.test/"onload="x', "https://x.test/'x", 'https://x.test/<x>', 'data:image/png;base64,AAAA']) {
      expect(preloadTag(bad), String(bad)).toBe(''); expect(renderHead(SHELL, pageMeta({ preloadImage: bad }))).not.toContain('preload')
    }
  })
})

describe('which picture a print page preloads: the one the page shows first', () => {
  const meta = (p) => printPage(p, ctx).meta
  it('is the picture of the FIRST size (by its position), whatever order the rows come in', () => {
    expect(meta(print([v(2, 'https://files.creativehub.io/composited/third.jpg'), v(0, 'https://files.creativehub.io/composited/first.jpg'), v(1, 'https://files.creativehub.io/composited/second.jpg', true)])).preloadImage).toBe('https://files.creativehub.io/composited/first.jpg')
  })
  it('is the artwork when the first size has no picture of its own (even if another size has), exactly as the page chooses', () => {
    expect(meta(print([v(0, null), v(1, 'https://files.creativehub.io/composited/second.jpg')])).preloadImage).toBe(ART)
    expect(meta(print([v(0, 'http://insecure.example/x.jpg')])).preloadImage).toBe(ART)
    expect(meta(print([])).preloadImage).toBe(ART)
  })
  it('is nothing when there is no usable picture at all', () => { expect(meta(print([v(0, null)], { images: [] })).preloadImage).toBeUndefined() })
  it('does not change the picture used for link previews and pins: that is still the artwork', () => { expect(meta(print([v(0, 'https://files.creativehub.io/composited/first.jpg')])).imageUrl).toBe(ART) })
})

describe('the build against an older database', () => {
  const env = { VITE_SUPABASE_URL: 'https://db.example.co', VITE_SUPABASE_ANON_KEY: 'anon-key' }
  const rows = [print([v(0, 'https://files.creativehub.io/composited/first.jpg')])]
  const run = (refuses) => {
    const asked = []
    // like the real database: a column that was not asked for is not in the answer
    const answer = (url) => { const asked = decodeURIComponent(url); const slug = /(?<![a-z_])slug,/.test(asked); const picture = asked.includes('image_url'); return rows.map((r) => ({ ...r, slug: slug ? r.slug : undefined, product_variants: r.product_variants.map((x) => ({ ...x, image_url: picture ? x.image_url : undefined })) })) }
    const fetchImpl = vi.fn(async (url) => { asked.push(url); if (url.includes('/posts?')) return { ok: true, status: 200, json: async () => [] }; return refuses(url) ? { ok: false, status: 400, json: async () => ({}) } : { ok: true, status: 200, json: async () => answer(url) } })
    return databasePages(env, ctx, { fetchImpl, measure: async () => null }).then((out) => ({ out, asked: asked.filter((u) => u.includes('/products?')) }))
  }
  it('asks for the readable address and the sizes\u2019 pictures first, and needs nothing more when both are there', async () => {
    const { out, asked } = await run(() => false); expect(asked).toHaveLength(1); expect(decodeURIComponent(asked[0])).toContain(PRINTS_QUERY); expect(PRINTS_QUERY).toMatch(/slug,/); expect(PRINTS_QUERY).toMatch(/image_url/); expect(out.notes.join(' ')).not.toMatch(/column is not in the database/)
    expect(out.pages[0].meta.preloadImage).toBe('https://files.creativehub.io/composited/first.jpg')
  })
  it('copes with no picture column: keeps the readable address, loses only the preload, and says so', async () => {
    const { out, asked } = await run((u) => u.includes('image_url')); expect(asked.some((u) => decodeURIComponent(u).includes(PRINTS_QUERY_NO_PICTURE))).toBe(true); expect(PRINTS_QUERY_NO_PICTURE).toMatch(/slug,/); expect(PRINTS_QUERY_NO_PICTURE).not.toMatch(/image_url/)
    expect(out.pages).toHaveLength(1); expect(out.notes.join(' ')).toMatch(/picture column is not in the database yet/)
  })
  it('copes with no address column: keeps the preload, uses the long address, and says so', async () => {
    const { out } = await run((u) => /(?<![a-z_])slug/.test(decodeURIComponent(u))); expect(PRINTS_QUERY_NO_SLUG).not.toMatch(/slug/); expect(PRINTS_QUERY_NO_SLUG).toMatch(/image_url/); expect(out.pages[0].urlPath).toBe('/art-loft/prints/eb8bc42c-ad85-463e-a61c-3673b033e7c0'); expect(out.notes.join(' ')).toMatch(/print-slugs\.sql/)
  })
  it('copes with neither column, and still writes every print\u2019s page', async () => {
    const { out } = await run((u) => /slug|image_url/.test(decodeURIComponent(u))); expect(PRINTS_QUERY_PLAIN).not.toMatch(/slug|image_url/); expect(out.pages).toHaveLength(1); expect(out.pages[0].meta.preloadImage).toBe(ART); expect(out.notes.join(' ')).toMatch(/neither the address column nor/)
  })
  it('reports the original problem if every attempt is refused (and never fails the build)', async () => {
    const { out } = await run(() => true); expect(out.pages).toEqual([]); expect(out.notes.length).toBeGreaterThan(0)
  })
})
