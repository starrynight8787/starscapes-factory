// @vitest-environment node
// Print pages ready for Pinterest (24 October 2026): product markup, a picture size that is only stated when it is true, a title and description that are specific to each
// print, readable addresses, and the Pinterest claim tag. These all live in the page's HTML at build time, because Pinterest's crawler does not run the site's code.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderHead, productJsonLd, validProduct, pinterestTag, SHARE_PICTURE_SIZE, PINTEREST_CODE } from '../scripts/shareHead.mjs'
import { printPage, printFacts, safeSlug, sizeWords, imageDimensions, imageSize, databasePages } from '../scripts/dynamicPages.mjs'

const SHELL = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <script type="module" src="/assets/app.js"></script>\n    <title>Old</title>\n  </head>\n  <body><div id="root"></div></body>\n</html>\n'
const IMAGES = { site: { file: 'site.png', alt: 'The room icons.' }, 'art-loft': { file: 'art-loft.png', alt: 'An easel and prints.' } }
const ctx = { siteUrl: 'https://starscapesfactory.com', siteName: 'Starscapes Factory', rooms: {}, images: IMAGES, siteImage: 'site', imageUrl: (k) => `https://starscapesfactory.com/share/${IMAGES[k].file}` }
const v = (size_label, width_mm, height_mm, framed, frame_colour, price, position) => ({ size_label, width_mm, height_mm, framed, frame_colour, price, position })
const CURTAIN = {
  id: 'eb8bc42c-ad85-463e-a61c-3673b033e7c0', slug: 'behind-the-curtain', title: 'Behind the Curtain', collection: 'Out of this World', images: ['https://files.creativehub.io/converted/8b15.jpg'],
  product_variants: [v('60x80cm', 600, 800, true, 'Black', '189.00', 3), v('21x30cm', 210, 300, false, null, '89.00', 0), v('28x35cm', 280, 350, false, null, '99.00', 1), v('40x50cm', 400, 500, true, 'Black', '139.00', 2), v('40x50cm', 400, 500, false, null, '119.00', 4)],
}
const productMeta = (over = {}) => ({ name: 'Behind the Curtain', url: 'https://starscapesfactory.com/art-loft/prints/behind-the-curtain', image: 'https://files.creativehub.io/converted/8b15.jpg', description: 'A print.', sku: 'behind-the-curtain', brand: 'Starscapes Factory', amount: '89.00', currency: 'GBP', availability: 'InStock', ...over })
const pageMeta = (over = {}) => ({ title: 'T', description: 'D', siteName: 'S', url: 'https://x.test/a', imageUrl: 'https://x.test/i.jpg', imageAlt: 'alt', index: true, ...over })
const count = (html, needle) => html.split(needle).length - 1
const ldJson = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])

describe('product markup (what Pinterest reads)', () => {
  it('a print page says it is a product, with its price, currency and availability, in Open Graph tags AND in Schema.org JSON-LD that agree', () => {
    const html = renderHead(SHELL, pageMeta({ product: productMeta() }))
    expect(html).toContain('<meta property="og:type" content="product" />')
    expect(html).toContain('<meta property="product:price:amount" content="89.00" />')
    expect(html).toContain('<meta property="product:price:currency" content="GBP" />')
    expect(html).toContain('<meta property="og:availability" content="instock" />')
    const data = ldJson(html)
    expect(data['@type']).toBe('Product'); expect(data.name).toBe('Behind the Curtain'); expect(data.url).toBe('https://starscapesfactory.com/art-loft/prints/behind-the-curtain'); expect(data.image).toEqual(['https://files.creativehub.io/converted/8b15.jpg'])
    expect(data.sku).toBe('behind-the-curtain'); expect(data.brand).toEqual({ '@type': 'Brand', name: 'Starscapes Factory' })
    expect(data.offers).toEqual({ '@type': 'Offer', url: data.url, price: '89.00', priceCurrency: 'GBP', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition' })
  })
  it('a page with no product stays an ordinary page: type website, no price, no JSON-LD', () => {
    const html = renderHead(SHELL, pageMeta())
    expect(html).toContain('<meta property="og:type" content="website" />'); expect(html).not.toContain('product:price'); expect(html).not.toContain('ld+json'); expect(html).not.toContain('og:availability')
  })
  it('REFUSES product markup that does not look right (a wrong price in a pin is worse than none)', () => {
    for (const bad of [{ amount: '0' }, { amount: '-5.00' }, { amount: '89,00' }, { amount: '£89' }, { amount: '' }, { currency: 'gbp' }, { currency: '£' }, { availability: 'Plenty' }, { image: 'http://x.test/i.jpg' }, { image: '' }, { name: '' }, { description: '' }, { url: '' }]) {
      expect(validProduct(productMeta(bad)), JSON.stringify(bad)).toBe(false)
      const html = renderHead(SHELL, pageMeta({ product: productMeta(bad) }))
      expect(html, JSON.stringify(bad)).toContain('content="website"'); expect(html).not.toContain('ld+json')
    }
    expect(validProduct(null)).toBe(false); expect(validProduct(productMeta())).toBe(true)
  })
  it('nothing the database says can ever break out of the JSON-LD block: a hostile title stays inside it', () => {
    const evil = '</script><script>alert(1)</script> & <b>"x"</b>\u2028end'
    const html = renderHead(SHELL, pageMeta({ title: evil, product: productMeta({ name: evil, description: evil }) }))
    expect(count(html, '<script type="application/ld+json">')).toBe(1); expect(count(html, '<script')).toBe(2) // the page's own module script and the data block
    expect(html).not.toContain('<script>alert'); expect(html).not.toContain('</script><script>')
    expect(ldJson(html).name).toBe(evil) // and the words come out whole when the block is read as data
    expect(productJsonLd(productMeta({ name: evil }))).not.toMatch(/[<>&\u2028]/)
  })
  it('putting a page through twice gives the same page: one product block, one claim tag', () => {
    const once = renderHead(SHELL, pageMeta({ product: productMeta(), imageWidth: 1185, imageHeight: 1500 }), { pinterestVerify: 'abcdef1234567890abcdef1234567890' })
    const twice = renderHead(once, pageMeta({ product: productMeta(), imageWidth: 1185, imageHeight: 1500 }), { pinterestVerify: 'abcdef1234567890abcdef1234567890' })
    expect(twice).toBe(once); expect(count(twice, 'ld+json')).toBe(1); expect(count(twice, 'p:domain_verify')).toBe(1); expect(count(twice, 'product:price:amount')).toBe(1)
  })
})

describe('the link-preview picture size', () => {
  it('is stated only when it is known: the real size is written, and an unknown size writes NOTHING (never 1200 x 630 by default)', () => {
    const known = renderHead(SHELL, pageMeta({ imageWidth: 1185, imageHeight: 1500 }))
    expect(known).toContain('og:image:width" content="1185"'); expect(known).toContain('og:image:height" content="1500"')
    for (const none of [pageMeta(), pageMeta({ imageWidth: 1185 }), pageMeta({ imageWidth: 0, imageHeight: 0 }), pageMeta({ imageWidth: '1185', imageHeight: '1500' })]) {
      const html = renderHead(SHELL, none); expect(html).not.toContain('og:image:width'); expect(html).not.toContain('og:image:height')
    }
  })
  it('every picture in public/share really is the size the site states for them (1200 x 630)', () => {
    const dir = path.resolve('public/share'); const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')); expect(files.length).toBeGreaterThanOrEqual(10)
    for (const f of files) expect(imageDimensions(fs.readFileSync(path.join(dir, f))), f).toEqual({ width: SHARE_PICTURE_SIZE.width, height: SHARE_PICTURE_SIZE.height })
  })
  it('reads the real size of a JPEG (past a leading data block), a PNG and the three kinds of WebP, and of nothing else', () => {
    const be = (n) => [(n >> 8) & 255, n & 255]; const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255]
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc4, 0x00, 0x04, 0, 0, 0xff, 0xc0, 0x00, 0x11, 8, ...be(1500), ...be(1185), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])
    expect(imageDimensions(jpeg)).toEqual({ width: 1185, height: 1500 })
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 4, 0x91, 0, 0, 5, 0xdc, 8, 2, 0, 0, 0])
    expect(imageDimensions(png)).toEqual({ width: 1169, height: 1500 })
    const riff = (kind, data) => Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, ...[...kind].map((c) => c.charCodeAt(0)), 0, 0, 0, 0, ...data])
    const lossy = new Array(18).fill(0); lossy.splice(6, 2, ...[1185 & 255, 1185 >> 8], ...[1500 & 255, 1500 >> 8]) // after "VP8 " + size: 3 bytes, a start code of 3 bytes, then width and height (little endian)
    expect(imageDimensions(riff('VP8 ', lossy))).toEqual({ width: 1185, height: 1500 })
    const lossless = (1185 - 1) | ((1500 - 1) << 14); expect(imageDimensions(riff('VP8L', [0x2f, lossless & 255, (lossless >> 8) & 255, (lossless >> 16) & 255, (lossless >> 24) & 255, 0, 0, 0, 0, 0, 0, 0]))).toEqual({ width: 1185, height: 1500 })
    expect(imageDimensions(riff('VP8X', [0, 0, 0, 0, ...le24(1185 - 1), ...le24(1500 - 1), 0, 0, 0, 0]))).toEqual({ width: 1185, height: 1500 })
    for (const junk of [new Uint8Array(), Uint8Array.from([1, 2, 3]), Uint8Array.from([0xff, 0xd8, 0xff]), Uint8Array.from(new Array(40).fill(7)), null]) expect(imageDimensions(junk)).toBeNull()
  })
  it('measures a picture by reading only its first bytes, and says null (so no size is stated) when it cannot', async () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 8, 5, 0xdc, 4, 0x91, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])
    let cancelled = false; let reads = 0
    const body = { getReader: () => ({ read: async () => (reads++ < 3 ? { done: false, value: reads === 1 ? jpeg : new Uint8Array(200000) } : { done: true }), cancel: async () => { cancelled = true } }) }
    const fetchImpl = vi.fn(async () => ({ ok: true, body }))
    expect(await imageSize('https://files.creativehub.io/x.jpg', { fetchImpl })).toEqual({ width: 1169, height: 1500 })
    expect(cancelled).toBe(true); expect(fetchImpl.mock.calls[0][1].headers.Range).toMatch(/^bytes=0-/)
    expect(await imageSize('https://x/y.jpg', { fetchImpl: vi.fn(async () => ({ ok: false })) })).toBeNull()
    expect(await imageSize('https://x/y.jpg', { fetchImpl: vi.fn(async () => { throw new Error('offline') }) })).toBeNull()
    expect(await imageSize('https://x/y.jpg', { fetchImpl: vi.fn(async () => ({ ok: true, body: null, arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer })) })).toBeNull()
  })
})

describe('a print page says what the print really is', () => {
  it('has its own title, description and picture description, built from its own name, collection, finishes, sizes and lowest price', () => {
    const page = printPage(CURTAIN, ctx)
    expect(page.urlPath).toBe('/art-loft/prints/behind-the-curtain')
    expect(page.meta.title).toBe('Behind the Curtain: abstract acrylic art print | Starscapes Factory')
    expect(page.meta.description).toBe('Behind the Curtain: an abstract acrylic art print from the Out of this World collection, digitised from my original painting. Framed in black or unframed, in 4 sizes (21 \u00d7 30 cm, 28 \u00d7 35 cm, 40 \u00d7 50 cm and 60 \u00d7 80 cm), made to order.')
    expect(page.meta.imageAlt).toBe('Behind the Curtain, abstract art print, Out of this World collection')
    expect(page.meta.url).toBe('https://starscapesfactory.com/art-loft/prints/behind-the-curtain')
    expect(page.meta.product).toEqual({ name: 'Behind the Curtain', url: page.meta.url, image: 'https://files.creativehub.io/converted/8b15.jpg', description: page.meta.description, sku: 'behind-the-curtain', brand: 'Starscapes Factory', amount: '89.00', currency: 'GBP', availability: 'InStock' })
  })
  it('uses the LOWEST price of the sizes and frames as the "from" price, whatever order the rows come in', () => {
    const reversed = { ...CURTAIN, product_variants: [...CURTAIN.product_variants].reverse() }
    expect(printPage(reversed, ctx).meta.product.amount).toBe('89.00')
    expect(printFacts({ product_variants: [v('A', 1, 1, false, null, 150, 0), v('B', 2, 2, false, null, '95.5', 1), v('C', 3, 3, false, null, 0, 2), v('D', 4, 4, false, null, null, 3), v('E', 5, 5, false, null, 'x', 4)] }).from).toBe(95.5)
  })
  it('describes the finishes as they are: framed or unframed (with the colour if there is one), only framed, only unframed, several colours', () => {
    const d = (rows) => printPage({ ...CURTAIN, product_variants: rows }, ctx).meta.description
    expect(d([v('21x30cm', 210, 300, false, null, 89, 0)])).toBe('Behind the Curtain: an abstract acrylic art print from the Out of this World collection, digitised from my original painting. Unframed, in one size (21 \u00d7 30 cm), made to order.')
    expect(d([v('21x30cm', 210, 300, true, 'Oak', 129, 0)])).toContain('Framed in oak, in one size')
    expect(d([v('21x30cm', 210, 300, false, null, 89, 0), v('21x30cm', 210, 300, true, 'Oak', 129, 1), v('21x30cm', 210, 300, true, 'White', 129, 2)])).toContain('Framed or unframed, in one size')
    expect(d([v('21x30cm', 210, 300, false, null, 89, 0), v('30x40cm', 300, 400, false, null, 99, 1)])).toContain('Unframed, in 2 sizes (21 \u00d7 30 cm and 30 \u00d7 40 cm)')
  })
  it('makes every print\u2019s title and description different from the others\u2019 (unique, as the brief asks)', () => {
    const names = ['Afternoon Sun', 'Ballet', 'Ocean\u2019s Breeze', 'Into the Nebula', 'Murder on the Dance Floor']; const pages = names.map((n, i) => printPage({ ...CURTAIN, id: `00000000-0000-4000-8000-00000000000${i}`, slug: `p-${i}`, title: n }, ctx).meta)
    expect(new Set(pages.map((p) => p.title)).size).toBe(names.length); expect(new Set(pages.map((p) => p.description)).size).toBe(names.length)
    for (const p of pages) { expect(p.title.endsWith(': abstract acrylic art print | Starscapes Factory')).toBe(true); expect(p.description).toMatch(/made to order\.$/) }
  })
  it('claims nothing it cannot back up: no sizes, no price or no picture means no sizes in the words, or no product markup', () => {
    const none = printPage({ ...CURTAIN, product_variants: [] }, ctx).meta
    expect(none.product).toBeUndefined(); expect(none.description).toBe('Behind the Curtain: an abstract acrylic art print from the Out of this World collection, digitised from my original painting. Made to order.')
    expect(printPage({ ...CURTAIN, images: [] }, ctx).meta.product).toBeUndefined()
    expect(printPage({ ...CURTAIN, images: ['http://insecure.example/x.jpg'] }, ctx).meta.product).toBeUndefined()
    expect(printPage({ ...CURTAIN, product_variants: [v('A', 1, 1, false, null, 0, 0)] }, ctx).meta.product).toBeUndefined()
    expect(printPage({ ...CURTAIN, product_variants: undefined }, ctx).meta.title).toContain('abstract acrylic art print')
  })
  it('uses the readable address when it has a good one, and the long id when it does not (nothing else is ever used as an address)', () => {
    expect(printPage(CURTAIN, ctx).urlPath).toBe('/art-loft/prints/behind-the-curtain')
    for (const bad of [undefined, null, '', 'Behind The Curtain', 'behind--the-curtain', '-behind', '../etc', 'a'.repeat(81), 'q?x=1', 'caf\u00e9']) {
      expect(safeSlug(bad), String(bad)).toBe(''); expect(printPage({ ...CURTAIN, slug: bad }, ctx).urlPath).toBe(`/art-loft/prints/${CURTAIN.id}`)
    }
    expect(safeSlug('rain-forest')).toBe('rain-forest'); expect(safeSlug('parkside-2')).toBe('parkside-2')
  })
  it('writes sizes the way the print page does', () => { expect(sizeWords('21x30cm')).toBe('21 \u00d7 30 cm'); expect(sizeWords(' 60 x 80 cm ')).toBe('60 \u00d7 80 cm') })
})

describe('asking the database', () => {
  const env = { VITE_SUPABASE_URL: 'https://db.example.co', VITE_SUPABASE_ANON_KEY: 'anon-key' }
  const answer = (rows) => ({ ok: true, status: 200, json: async () => rows })
  it('also works with a database that has no address column yet: it asks again without it, and says so', async () => {
    const fetchImpl = vi.fn(async (url) => (url.includes('/posts?') ? answer([]) : url.includes('slug') ? { ok: false, status: 400, json: async () => ({}) } : answer([{ ...CURTAIN, slug: undefined }])))
    const out = await databasePages(env, ctx, { fetchImpl, measure: async () => null })
    expect(out.pages.map((p) => p.urlPath)).toEqual([`/art-loft/prints/${CURTAIN.id}`]); expect(out.notes.join(' ')).toMatch(/slug.*not in the database yet.*print-slugs\.sql/)
  })
  it('puts each print\u2019s real picture size into its page, and counts what carries product markup and a readable address', async () => {
    const fetchImpl = vi.fn(async (url) => (url.includes('/posts?') ? answer([]) : answer([CURTAIN, { ...CURTAIN, id: '00000000-0000-4000-8000-000000000002', slug: undefined, title: 'No Address Yet' }])))
    const measure = vi.fn(async () => ({ width: 1185, height: 1500 }))
    const out = await databasePages(env, ctx, { fetchImpl, measure })
    expect(out.pages.every((p) => p.meta.imageWidth === 1185 && p.meta.imageHeight === 1500)).toBe(true); expect(out.counts).toMatchObject({ prints: 2, printsWithSlug: 1, products: 2 })
  })
  it('states no size, and says how many, when a picture cannot be measured (never the old 1200 x 630)', async () => {
    const fetchImpl = vi.fn(async (url) => (url.includes('/posts?') ? answer([]) : answer([CURTAIN])))
    const out = await databasePages(env, ctx, { fetchImpl, measure: async () => null })
    expect(out.pages[0].meta.imageWidth).toBeUndefined(); expect(out.notes.join(' ')).toMatch(/1 of 1 pictures could not be measured/)
    expect(renderHead(SHELL, out.pages[0].meta)).not.toContain('og:image:width')
  })
  it('measures a post\u2019s own header picture too, but never the shared room pictures (those are known to be 1200 x 630)', async () => {
    const seen = []; const fetchImpl = vi.fn(async (url) => (url.includes('/posts?') ? answer([{ id: 'a1', title: 'Post', image_url: 'https://pics.example.com/a.png', channel: 'x' }, { id: 'a2', title: 'Plain' }]) : answer([])))
    const out = await databasePages(env, ctx, { fetchImpl, measure: async (u) => { seen.push(u); return { width: 800, height: 600 } } })
    expect(seen).toEqual(['https://pics.example.com/a.png']); const plain = out.pages.find((p) => p.urlPath === '/post/a2'); expect(plain.meta.imageWidth).toBe(1200); expect(plain.meta.imageHeight).toBe(630)
  })
})

describe('the Pinterest claim tag', () => {
  it('is written into the page when the code is a real one, once, and nothing else is ever written', () => {
    const code = 'abcdef1234567890abcdef1234567890'; expect(PINTEREST_CODE.test(code)).toBe(true)
    expect(pinterestTag(code)).toBe(`<meta name="p:domain_verify" content="${code}" />`)
    expect(count(renderHead(SHELL, pageMeta(), { pinterestVerify: code }), 'p:domain_verify')).toBe(1)
    for (const bad of ['', undefined, null, 'short', 'has space in it ok ok', '"><script>alert(1)</script>', 'x'.repeat(65), '<meta name="p:domain_verify" content="abc" />']) {
      expect(pinterestTag(bad), String(bad)).toBe(''); expect(renderHead(SHELL, pageMeta(), { pinterestVerify: bad })).not.toContain('p:domain_verify')
    }
  })
})

describe('the claim tag is wired into the build', () => {
  const script = fs.readFileSync(path.resolve('scripts/make-share-pages.mjs'), 'utf8')
  const settings = fs.readFileSync(path.resolve('src/data/siteSettings.js'), 'utf8')
  it('has a setting for it (empty until Pinterest\u2019s code is pasted in), and every page the build writes gets it', () => {
    expect(settings).toMatch(/export const PINTEREST_VERIFY = ''/) // when the code is pasted in, this test is updated with it: see the notes
    expect(script).toContain('const headOptions = { closed, pinterestVerify }'); expect(script).toContain('PINTEREST_CODE.test(pinterest)')
    const calls = script.match(/renderHead\(template, [^)]*\)\)/g) || []; expect(calls.length).toBe(2); for (const c of calls) expect(c).toContain('headOptions')
  })
  it('says so in the build\u2019s report: added, not yet set, or ignored because it is not a code', () => {
    expect(script).toContain('Pinterest verification tag: added to every page.'); expect(script).toContain('Pinterest verification tag: none yet'); expect(script).toContain('Pinterest verification tag: IGNORED')
  })
})
