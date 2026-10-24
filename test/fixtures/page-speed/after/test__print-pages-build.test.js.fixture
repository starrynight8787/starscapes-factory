// @vitest-environment node
// The real build step, run against a pretend database, for the print pages and the sitemap: each print gets its own page under its readable address, with product markup;
// the old long address is not built for a print that has a readable one; the sitemap lists exactly what search engines may see; and a database that has no address column
// yet still gets a working build.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { COLLECTIONS } from '../src/artloft/artLoftData.js'

const run = promisify(execFile)
const SHELL = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <script type="module" crossorigin src="/assets/index-abc.js"></script>\n    <title>Starscapes Factory</title>\n  </head>\n  <body><div id="root"></div></body>\n</html>\n'
const v = (size_label, width_mm, height_mm, framed, frame_colour, price, position, image_url) => ({ size_label, width_mm, height_mm, framed, frame_colour, price, position, image_url })
const VARIANTS = [v('21x30cm', 210, 300, false, null, 89, 0, 'https://files.creativehub.io/composited/first.jpg'), v('21x30cm', 210, 300, true, 'Oak', 129, 1, 'https://files.creativehub.io/composited/second.webp'), v('40x50cm', 400, 500, false, null, 119, 2, 'https://files.creativehub.io/composited/third.jpg')]
const CURTAIN_ID = 'eb8bc42c-ad85-463e-a61c-3673b033e7c0'
const NOADDR_ID = '7c4129c7-fd68-4597-8123-ff75156bcee8'
const PRODUCTS = [
  { id: CURTAIN_ID, slug: 'behind-the-curtain', title: 'Behind the Curtain', collection: 'Out of this World', images: ['https://files.creativehub.io/converted/curtain.jpg'], published: true, fulfilment: 'creativehub', product_variants: VARIANTS },
  { id: NOADDR_ID, slug: null, title: 'Afternoon Sun', collection: 'Calm Series', images: ['https://files.creativehub.io/converted/sun.jpg'], published: true, fulfilment: 'creativehub', product_variants: VARIANTS },
  { id: '11111111-1111-4111-8111-111111111111', slug: 'a-hidden-draft', title: 'A DRAFT NOBODY SHOULD SEE', images: [], published: false, fulfilment: 'creativehub', product_variants: VARIANTS },
  { id: '22222222-2222-4222-8222-222222222222', slug: null, title: 'AN ORIGINAL', images: [], published: true, fulfilment: 'hand', product_variants: [] },
]
let server, base, noSlugColumn = false
const dirs = []
beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    if (req.url.startsWith('/rest/v1/products?')) {
      if (noSlugColumn && req.url.includes('slug')) { res.statusCode = 400; return res.end('{"message":"column products.slug does not exist"}') }
      const rows = PRODUCTS.filter((p) => req.url.includes('fulfilment=eq.creativehub') ? p.fulfilment === 'creativehub' : true).filter((p) => (req.url.includes('published=eq.true') ? p.published : true)).map((p) => (noSlugColumn ? (({ slug, ...rest }) => rest)(p) : p))
      return res.end(JSON.stringify(rows))
    }
    res.end('[]')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => { server.close(); while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

async function build(over = {}) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'printpages-')); dirs.push(dist); fs.writeFileSync(path.join(dist, 'index.html'), SHELL)
  const { stdout } = await run('node', ['scripts/make-share-pages.mjs', dist], { encoding: 'utf8', env: { ...process.env, SHARE_IMAGE_SIZES: 'off', VITE_SUPABASE_URL: base, VITE_SUPABASE_ANON_KEY: 'test-anon-key', SEARCH_ENGINES_OVERRIDE: 'open', ...over } })
  return { dist, out: stdout }
}
const read = (dist, rel) => fs.readFileSync(path.join(dist, rel), 'utf8')
const locs = (dist) => [...read(dist, 'sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://starscapesfactory.com', '') || '/')

describe('a build with prints that have readable addresses', () => {
  let r
  beforeAll(async () => { noSlugColumn = false; r = await build() }, 60000)
  it('writes the print\u2019s page under its readable address, with product markup, and NOT under its long address', () => {
    const html = read(r.dist, 'art-loft/prints/behind-the-curtain/index.html')
    expect(html).toContain('<title>Behind the Curtain: abstract acrylic art print | Starscapes Factory</title>'); expect(html).toContain('<link rel="canonical" href="https://starscapesfactory.com/art-loft/prints/behind-the-curtain" />')
    expect(html).toContain('og:type" content="product"'); expect(html).toContain('product:price:amount" content="89.00"'); expect(html).toContain('product:price:currency" content="GBP"'); expect(html).toContain('og:availability" content="instock"'); expect(html).toContain('application/ld+json')
    expect(html).toContain('digitised from my original painting. Framed in oak or unframed, in 2 sizes (21 \u00d7 30 cm and 40 \u00d7 50 cm), made to order.')
    expect(fs.existsSync(path.join(r.dist, 'art-loft/prints', CURTAIN_ID))).toBe(false)
  })
  it('keeps the long address for a print that has no readable one yet, and never builds drafts or originals', () => {
    expect(fs.existsSync(path.join(r.dist, 'art-loft/prints', NOADDR_ID, 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(r.dist, 'art-loft/prints/a-hidden-draft'))).toBe(false)
    const folder = path.join(r.dist, 'art-loft/prints'); expect(fs.readdirSync(folder).filter((n) => fs.statSync(path.join(folder, n)).isDirectory()).sort()).toEqual([NOADDR_ID, 'behind-the-curtain'].sort())
  })
  it('states no picture size for a print photo it could not measure, and still states 1200 x 630 for the shared pictures that really are that size', () => {
    expect(read(r.dist, 'art-loft/prints/behind-the-curtain/index.html')).not.toContain('og:image:width')
    const room = read(r.dist, 'art-loft/index.html'); expect(room).toContain('og:image:width" content="1200"'); expect(room).toContain('og:image:height" content="630"')
  })
  it('tells the browser, in the page head, to start downloading the picture the page shows first (the first size\u2019s own picture, not the artwork), once', () => {
    const html = read(r.dist, 'art-loft/prints/behind-the-curtain/index.html')
    expect(html).toContain('<link rel="preload" as="image" href="https://files.creativehub.io/composited/first.jpg" fetchpriority="high" />'); expect(html.split('rel="preload"').length - 1).toBe(1)
    expect(html).toContain('og:image" content="https://files.creativehub.io/converted/curtain.jpg"') // the link preview and pins still use the artwork
    expect(read(r.dist, 'art-loft/index.html')).not.toContain('rel="preload"')
  })
  it('says what it did: how many prints have a readable address and how many carry product markup', () => { expect(r.out).toContain('Prints: 1 of 2 have a readable address, and 2 carry product markup') })
  it('lists in the sitemap the home page, the Art Loft pages, every collection and the published prints (by readable address), and nothing private', () => {
    const all = locs(r.dist)
    for (const must of ['/', '/art-loft', '/art-loft/prints', '/art-loft/originals', '/art-loft/prints/behind-the-curtain', `/art-loft/prints/${NOADDR_ID}`, ...COLLECTIONS.map((c) => `/art-loft/collections/${c.slug}`)]) expect(all, must).toContain(must)
    for (const never of [`/art-loft/prints/${CURTAIN_ID}`, '/art-loft/prints/a-hidden-draft', '/art-loft/admin', '/art-loft/admin/originals', '/cart', '/login', '/new', '/new-product']) expect(all, never).not.toContain(never)
    expect(all.filter((u) => u.startsWith('/admin'))).toEqual([]); expect(new Set(all).size).toBe(all.length)
  })
})

describe('a build while the whole site is closed to search engines', () => {
  it('has an empty sitemap and says noindex on every page, including the print pages (the product markup is still there)', async () => {
    noSlugColumn = false; const r = await build({ SEARCH_ENGINES_OVERRIDE: 'closed' })
    expect(locs(r.dist)).toEqual([]); const html = read(r.dist, 'art-loft/prints/behind-the-curtain/index.html')
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />'); expect(html).toContain('og:type" content="product"')
    expect(r.out).toMatch(/CLOSED to search engines/)
  }, 60000)
})

describe('a build against a database with no address column yet', () => {
  it('still writes every print\u2019s page, under its long address, and tells you to run the SQL', async () => {
    noSlugColumn = true
    try {
      const r = await build()
      expect(fs.existsSync(path.join(r.dist, 'art-loft/prints', CURTAIN_ID, 'index.html'))).toBe(true); expect(fs.existsSync(path.join(r.dist, 'art-loft/prints/behind-the-curtain'))).toBe(false)
      expect(r.out).toMatch(/Prints: 0 of 2 have a readable address/); expect(r.out).toMatch(/print-slugs\.sql/)
    } finally { noSlugColumn = false }
  }, 60000)
})
