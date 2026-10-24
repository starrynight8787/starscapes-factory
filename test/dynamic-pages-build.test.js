// @vitest-environment node
// The real build step, run against a pretend database: a page for each published post and print, nothing for drafts, and a build that carries
// on when the database is not there.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile) // asynchronous, so the pretend database in this same process can answer while the build runs

const SHELL = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <script type="module" crossorigin src="/assets/index-abc.js"></script>\n    <title>Starscapes Factory: where imagination takes shape</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n'
const POSTS = [
  { id: 'post-one', title: 'Day <b>Fourteen</b>', content: 'LEAKY PAID TEXT', image_url: 'https://pics.example.com/one.png', channel: 'factory-floor', published: true },
  { id: 'post-two', title: 'A second post', image_url: null, channel: 'idea-hatchery', published: true },
  { id: 'post-draft', title: 'A DRAFT NOBODY SHOULD SEE', channel: 'factory-floor', published: false },
  { id: '../../evil', title: 'A hostile id', channel: 'factory-floor', published: true },
]
const PRODUCTS = [
  { id: 'print-one', title: 'Forests', collection: 'Calm Series', images: ['https://files.creativehub.io/f.jpg'], published: true, fulfilment: 'creativehub' },
  { id: 'print-draft', title: 'AN UNPUBLISHED PRINT', collection: 'Calm Series', images: [], published: false, fulfilment: 'creativehub' },
  { id: 'orig-one', title: 'AN ORIGINAL', images: [], published: true, fulfilment: 'hand' },
]
const requests = []
let server, base
const dirs = []

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push({ url: req.url, apikey: req.headers.apikey, auth: req.headers.authorization })
    const wantsPublished = req.url.includes('published=eq.true')
    let rows = []
    if (req.url.startsWith('/rest/v1/posts?')) rows = POSTS
    else if (req.url.startsWith('/rest/v1/products?')) rows = PRODUCTS.filter((p) => !req.url.includes('fulfilment=eq.creativehub') || p.fulfilment === 'creativehub')
    if (wantsPublished) rows = rows.filter((r) => r.published)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(rows))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => { server.close(); while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

async function build(env) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dynpages-'))
  dirs.push(dist)
  fs.writeFileSync(path.join(dist, 'index.html'), SHELL)
  const { stdout } = await run('node', ['scripts/make-share-pages.mjs', dist], { encoding: 'utf8', env: { ...process.env, SEARCH_ENGINES_OVERRIDE: 'open', SHARE_IMAGE_SIZES: 'off', ...env } }) // SHARE_IMAGE_SIZES=off: the tests never call the internet to measure pictures
  return { dist, out: stdout }
}
const read = (dist, rel) => fs.readFileSync(path.join(dist, rel), 'utf8')

describe('a build with a database', () => {
  let result
  beforeAll(async () => {
    fs.rmSync(path.join(os.tmpdir(), 'evil'), { recursive: true, force: true }) // clear any leftover, so this test only ever sees what THIS build wrote
    result = await build({ VITE_SUPABASE_URL: base, VITE_SUPABASE_ANON_KEY: 'test-anon-key' })
  }, 60000)
  it('writes a page for each published post and print, and says how many', () => {
    expect(fs.existsSync(path.join(result.dist, 'post/post-one/index.html'))).toBe(true)
    expect(fs.existsSync(path.join(result.dist, 'post/post-two/index.html'))).toBe(true)
    expect(fs.existsSync(path.join(result.dist, 'art-loft/prints/print-one/index.html'))).toBe(true)
    expect(result.out).toMatch(/2 posts and 1 print \(/) // three post rows come back, but the one with a hostile id is skipped
  })
  it('gives each its own title, address and picture, with the post\u2019s own picture where it has one', () => {
    const html = read(result.dist, 'post/post-one/index.html')
    expect(html).toContain('rel="canonical" href="https://starscapesfactory.com/post/post-one"')
    expect(html).toContain('property="og:image" content="https://pics.example.com/one.png"')
    expect(read(result.dist, 'post/post-two/index.html')).toContain('content="https://starscapesfactory.com/share/idea-hatchery.png"')
    expect(read(result.dist, 'art-loft/prints/print-one/index.html')).toContain('content="https://files.creativehub.io/f.jpg"')
    expect(html).toContain('<script type="module" crossorigin src="/assets/index-abc.js"></script>')
  })
  it('escapes the title, and never includes a post\u2019s text', () => {
    const html = read(result.dist, 'post/post-one/index.html')
    expect(html).not.toContain('<b>Fourteen')
    expect(html).toContain('Day &lt;b&gt;Fourteen&lt;/b&gt;')
    expect(html).not.toContain('LEAKY')
  })
  it('writes nothing for a draft, an unpublished print or an original (originals have no page of their own yet)', () => {
    expect(fs.existsSync(path.join(result.dist, 'post/post-draft'))).toBe(false)
    expect(fs.existsSync(path.join(result.dist, 'art-loft/prints/print-draft'))).toBe(false)
    expect(fs.existsSync(path.join(result.dist, 'art-loft/prints/orig-one'))).toBe(false)
    expect(JSON.stringify(fs.readdirSync(result.dist, { recursive: true }))).not.toMatch(/DRAFT|UNPUBLISHED/)
  })
  it('cannot be tricked by a hostile id into writing outside the build folder', () => {
    const parent = path.dirname(result.dist)
    expect(fs.existsSync(path.join(parent, 'evil'))).toBe(false)
    expect(fs.readdirSync(result.dist, { recursive: true }).some((f) => String(f).includes('evil'))).toBe(false)
  })
  it('asks the database only for published rows, with the public key', () => {
    const mine = requests.filter((r) => r.apikey === 'test-anon-key')
    expect(mine.length).toBeGreaterThanOrEqual(2)
    for (const r of mine) {
      expect(r.url).toContain('published=eq.true')
      expect(r.auth).toBe('Bearer test-anon-key')
    }
  })
  it('puts the collections, posts and prints in the sitemap', () => {
    const sitemap = read(result.dist, 'sitemap.xml')
    for (const loc of ['/art-loft/collections/calm-series', '/post/post-one', '/post/post-two', '/art-loft/prints/print-one']) expect(sitemap).toContain(`<loc>https://starscapesfactory.com${loc}</loc>`)
    expect(sitemap).not.toMatch(/post-draft|print-draft|evil|orig-one/)
  })
})

describe('a build with no database', () => {
  it('still writes the fixed pages and the collections, says what was skipped, and does not fail', async () => {
    const { dist, out } = await build({ VITE_SUPABASE_URL: 'http://127.0.0.1:1', VITE_SUPABASE_ANON_KEY: 'k' })
    expect(out).toMatch(/0 posts and 0 prints/)
    expect(out).toMatch(/could not be reached/)
    expect(fs.existsSync(path.join(dist, 'idea-hatchery/index.html'))).toBe(true)
    expect(fs.existsSync(path.join(dist, 'art-loft/collections/calm-series/index.html'))).toBe(true)
  })
  it('does not fail when the database refuses', async () => {
    const refusing = http.createServer((req, res) => { res.statusCode = 401; res.end('{}') })
    return new Promise((resolve, reject) => refusing.listen(0, '127.0.0.1', async () => {
      try {
        const { out } = await build({ VITE_SUPABASE_URL: `http://127.0.0.1:${refusing.address().port}`, VITE_SUPABASE_ANON_KEY: 'k' })
        expect(out).toMatch(/answered 401/)
        refusing.close(resolve)
      } catch (e) { refusing.close(() => reject(e)) }
    }))
  })
})

describe('the collections', () => {
  it('each get their own page, with their name in the title', async () => {
    const { dist } = await build({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' })
    const html = read(dist, 'art-loft/collections/calm-series/index.html')
    expect(html).toContain('<title>Calm Series | Starscapes Factory</title>')
    expect(html).toContain('rel="canonical" href="https://starscapesfactory.com/art-loft/collections/calm-series"')
  })
})
