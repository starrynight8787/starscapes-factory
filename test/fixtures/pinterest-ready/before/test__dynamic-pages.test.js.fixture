// @vitest-environment node
// What each post, print and collection says when it is shared, and how the database is asked.
import { describe, it, expect, vi } from 'vitest'
import { postPage, printPage, collectionPage, safePicture, readRows, databasePages, POSTS_QUERY, PRINTS_QUERY, SAFE_ID } from '../scripts/dynamicPages.mjs'

const IMAGES = { site: { file: 'site.png', alt: 'The room icons.' }, 'art-loft': { file: 'art-loft.png', alt: 'An easel and prints.' }, 'factory-floor': { file: 'factory-floor.png', alt: 'A blueprint.' } }
const ctx = { siteUrl: 'https://starscapesfactory.com', siteName: 'Starscapes Factory', rooms: { 'factory-floor': 'The Factory Floor', 'art-loft': 'The Art Loft' }, images: IMAGES, siteImage: 'site', imageUrl: (k) => `https://starscapesfactory.com/share/${IMAGES[k].file}` }

describe('a post', () => {
  const post = { id: '6b6f-12', title: 'Day Fourteen: The Parcel Can\u2019t Carry the Paperwork', content: 'SECRET PAID WORDS', image_url: 'https://x.supabase.co/storage/v1/object/public/post-images/a.png', channel: 'factory-floor' }
  it('is shared under its own address, title and room', () => {
    const { urlPath, meta } = postPage(post, ctx)
    expect(urlPath).toBe('/post/6b6f-12')
    expect(meta.url).toBe('https://starscapesfactory.com/post/6b6f-12')
    expect(meta.title).toBe('Day Fourteen: The Parcel Can\u2019t Carry the Paperwork | Starscapes Factory')
    expect(meta.description).toMatch(/a post from The Factory Floor on Starscapes Factory\.$/)
    expect(meta.index).toBe(true)
  })
  it('NEVER puts the post\u2019s own text in the description, so a members-only post cannot leak into a preview', () => {
    const { meta } = postPage({ ...post, content: 'A long secret sentence about the book that only paying members may read.' }, ctx)
    expect(JSON.stringify(meta)).not.toMatch(/secret|paying|members may/i)
    expect(postPage(post, ctx).meta.description).not.toContain('PAID')
  })
  it('uses the post\u2019s own picture when it is a safe https picture, with words describing it', () => {
    const { meta } = postPage(post, ctx)
    expect(meta.imageUrl).toBe(post.image_url)
    expect(meta.imageAlt).toMatch(/header picture for "Day Fourteen/)
  })
  it('falls back to the room\u2019s share picture, then the site\u2019s, when the post\u2019s picture is missing or unsafe', () => {
    for (const image_url of [null, '', 'http://insecure.example.com/a.png', 'https://x.example.com/a.svg', 'javascript:alert(1)', 'https://x.example.com/a.png"onload=1']) {
      expect(postPage({ ...post, image_url }, ctx).meta.imageUrl, String(image_url)).toBe('https://starscapesfactory.com/share/factory-floor.png')
    }
    expect(postPage({ ...post, image_url: null, channel: 'nowhere' }, ctx).meta.imageUrl).toBe('https://starscapesfactory.com/share/site.png')
  })
  it('copes with no room, a very long title, and odd spacing', () => {
    expect(postPage({ id: 'a1', title: '  A   spaced   title ' }, ctx).meta.description).toBe('A spaced title: a post on Starscapes Factory.')
    const long = postPage({ id: 'a2', title: 'word '.repeat(80), channel: 'art-loft' }, ctx).meta
    expect(long.title.length).toBeLessThanOrEqual(125)
    expect(long.description.length).toBeLessThanOrEqual(155)
  })
  it('gives nothing for a post with no title or an unsafe id, so nothing odd can name a file', () => {
    expect(postPage({ id: 'a1', title: '   ' }, ctx)).toBeNull()
    for (const id of ['../../evil', 'a/b', 'a b', '', null, 'x'.repeat(65), '..', 'a;rm']) expect(postPage({ id, title: 'T' }, ctx), String(id)).toBeNull()
    expect(SAFE_ID.test('6b6f-12')).toBe(true)
  })
})

describe('a print', () => {
  const print = { id: 'p-1', title: 'Forests', collection: 'Calm Series', images: ['https://files.creativehub.io/a/forests.jpg', 'https://x/b.jpg'] }
  it('is shared as an art print, with its collection, and its own picture', () => {
    const { urlPath, meta } = printPage(print, ctx)
    expect(urlPath).toBe('/art-loft/prints/p-1')
    expect(meta.title).toBe('Forests | Starscapes Factory')
    expect(meta.description).toBe('Forests: an art print from the Calm Series collection, made to order in a choice of sizes and frames.')
    expect(meta.imageUrl).toBe('https://files.creativehub.io/a/forests.jpg')
    expect(meta.url).toBe('https://starscapesfactory.com/art-loft/prints/p-1')
  })
  it('works with no collection and no picture, falling back to the Art Loft\u2019s share picture', () => {
    const { meta } = printPage({ id: 'p-2', title: 'Tango', collection: null, images: [] }, ctx)
    expect(meta.description).toBe('Tango: an art print, made to order in a choice of sizes and frames.')
    expect(meta.imageUrl).toBe('https://starscapesfactory.com/share/art-loft.png')
    expect(printPage({ id: 'p-3', title: 'X', images: null }, ctx).meta.imageUrl).toContain('art-loft.png')
  })
  it('gives nothing for a print with no title or an unsafe id', () => {
    expect(printPage({ id: '../x', title: 'T' }, ctx)).toBeNull()
    expect(printPage({ id: 'p', title: '' }, ctx)).toBeNull()
  })
})

describe('a collection', () => {
  it('is shared with its own name and blurb, and the Art Loft picture', () => {
    const { urlPath, meta } = collectionPage({ slug: 'calm-series', name: 'Calm Series', blurb: 'Quiet colour and soft light.' }, ctx)
    expect(urlPath).toBe('/art-loft/collections/calm-series')
    expect(meta.title).toBe('Calm Series | Starscapes Factory')
    expect(meta.description).toBe('Quiet colour and soft light. A collection of art prints from the Art Loft.')
    expect(meta.imageUrl).toContain('art-loft.png')
    expect(collectionPage({ slug: '../x', name: 'N' }, ctx)).toBeNull()
  })
})

describe('safePicture', () => {
  it('accepts a plain https jpg, png or webp address and nothing else', () => {
    for (const ok of ['https://a.example.com/x.jpg', 'https://a.example.com/x.JPEG', 'https://a.example.com/x.png?v=2', 'https://a.example.com/x.webp']) expect(safePicture(ok), ok).toBe(ok)
    for (const bad of ['', null, 'http://a.example.com/x.jpg', 'https://a.example.com/x.svg', 'https://a.example.com/x.gif', 'https://a.example.com/x', 'https://a.example.com/x.png"', 'https://a.example.com/ x.png', `https://a.example.com/${'x'.repeat(2100)}.png`]) expect(safePicture(bad), String(bad)).toBe('')
  })
})

describe('asking the database', () => {
  const env = { VITE_SUPABASE_URL: 'https://db.example.co/', VITE_SUPABASE_ANON_KEY: 'anon-key' }
  const answer = (status, body) => vi.fn(async () => ({ ok: status < 300, status, json: async () => body }))
  it('asks only for published rows, with the public key, and gives the rows back', async () => {
    const fetchImpl = answer(200, [{ id: 'a' }])
    const out = await readRows(env, 'posts', POSTS_QUERY, { fetchImpl })
    expect(out).toEqual({ rows: [{ id: 'a' }], note: '' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(`https://db.example.co/rest/v1/posts?${POSTS_QUERY}`)
    expect(init.headers.apikey).toBe('anon-key')
    expect(POSTS_QUERY).toContain('published=eq.true')
    expect(PRINTS_QUERY).toContain('published=eq.true')
    expect(PRINTS_QUERY).toContain('fulfilment=eq.creativehub')
  })
  it('gives no rows and a plain note, and never throws, when there are no settings, no connection or a refusal', async () => {
    expect((await readRows({}, 'posts', POSTS_QUERY, { fetchImpl: vi.fn() })).note).toMatch(/no database settings/)
    expect((await readRows(env, 'posts', POSTS_QUERY, { fetchImpl: vi.fn(async () => { throw new Error('boom anon-key') }) })).note).toMatch(/could not be reached/)
    expect((await readRows(env, 'posts', POSTS_QUERY, { fetchImpl: answer(401, {}) })).note).toMatch(/answered 401/)
    expect((await readRows(env, 'posts', POSTS_QUERY, { fetchImpl: answer(200, { not: 'a list' }) })).note).toMatch(/not a list/)
    const out = await readRows(env, 'posts', POSTS_QUERY, { fetchImpl: vi.fn(async () => { throw new Error('boom anon-key') }) })
    expect(JSON.stringify(out)).not.toContain('anon-key')
  })
  it('turns posts and prints into pages and counts them, skipping anything unusable', async () => {
    const fetchImpl = vi.fn(async (url) => ({ ok: true, status: 200, json: async () => (url.includes('/posts?') ? [{ id: 'a1', title: 'One' }, { id: '../bad', title: 'Two' }] : [{ id: 'p1', title: 'Forests' }]) }))
    const out = await databasePages(env, ctx, { fetchImpl })
    expect(out.counts).toEqual({ posts: 1, prints: 1 }) // the count is the pages written: the post with the unsafe id is skipped
    expect(out.pages.map((p) => p.urlPath).sort()).toEqual(['/art-loft/prints/p1', '/post/a1'])
    expect(out.notes).toEqual([])
  })
})
