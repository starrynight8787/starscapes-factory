// @vitest-environment node
// The one switch that closes the whole site to search engines while you build and while testers try it, and opens it again at launch.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { renderHead } from '../scripts/shareHead.mjs'
import { SEARCH_ENGINES_ALLOWED } from '../src/data/siteSettings.js'

const SHELL = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>x</title>\n  </head>\n  <body><div id="root"></div></body>\n</html>\n'
const META = { title: 'T', description: 'D', siteName: 'S', url: 'https://x.example/p', imageUrl: 'https://x.example/i.png', imageAlt: 'A', index: true }
const ENV = { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }
const html = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('index.html')).map((f) => [String(f), fs.readFileSync(path.join(dir, String(f)), 'utf8')])
function build(override) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'closedsite-'))
  fs.writeFileSync(path.join(dir, 'index.html'), SHELL)
  const env = { ...ENV }
  delete env.SEARCH_ENGINES_OVERRIDE
  if (override) env.SEARCH_ENGINES_OVERRIDE = override
  const out = execFileSync('node', ['scripts/make-share-pages.mjs', dir], { encoding: 'utf8', env })
  return { dir, out }
}
const made = []
afterAll(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })))

describe('the head of a page', () => {
  it('says noindex, nofollow on EVERY page when the site is closed, even one that is normally listed', () => {
    expect(renderHead(SHELL, META, { closed: true })).toContain('<meta name="robots" content="noindex, nofollow" />')
    expect(renderHead(SHELL, { ...META, index: false }, { closed: true })).toContain('<meta name="robots" content="noindex, nofollow" />')
  })
  it('when the site is open, only a private page says noindex (as before), and a public page says nothing', () => {
    expect(renderHead(SHELL, META)).not.toMatch(/robots/)
    expect(renderHead(SHELL, { ...META, index: false })).toContain('<meta name="robots" content="noindex" />')
    expect(renderHead(SHELL, { ...META, index: false })).not.toContain('nofollow')
  })
  it('carries the instruction once, and putting a page through twice gives the same page', () => {
    const once = renderHead(SHELL, META, { closed: true })
    expect(once.match(/name="robots"/g)).toHaveLength(1)
    expect(renderHead(once, META, { closed: true })).toBe(once)
  })
})

describe('the build, with the site closed', () => {
  let b
  beforeAll(() => { b = build('closed'); made.push(b.dir) }, 60000)
  it('makes every page, the home page that doubles as the fallback included, say noindex, nofollow', () => {
    const pages = html(b.dir)
    expect(pages.length).toBeGreaterThan(30)
    for (const [file, text] of pages) expect(text, file).toContain('<meta name="robots" content="noindex, nofollow" />')
  })
  it('leaves the sitemap with no addresses in it, and says so in plain words', () => {
    const sitemap = fs.readFileSync(path.join(b.dir, 'sitemap.xml'), 'utf8')
    expect(sitemap).not.toContain('<loc>')
    expect(sitemap).toContain('<urlset')
    expect(b.out).toMatch(/CLOSED to search engines/)
    expect(b.out).toMatch(/SEARCH_ENGINES_ALLOWED/)
  })
})

describe('the build, with the site open', () => {
  let b
  beforeAll(() => { b = build('open'); made.push(b.dir) }, 60000)
  it('lists the public pages and leaves the private ones out, exactly as before', () => {
    const sitemap = fs.readFileSync(path.join(b.dir, 'sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>https://starscapesfactory.com/blog</loc>')
    for (const p of ['/admin', '/cart', '/testers', '/page/contact', '/login']) expect(sitemap, p).not.toContain(`<loc>https://starscapesfactory.com${p}</loc>`)
    expect(b.out).toMatch(/OPEN to search engines/)
  })
  it('lets a public page be listed (no robots tag), and keeps the private ones noindex', () => {
    expect(fs.readFileSync(path.join(b.dir, 'blog/index.html'), 'utf8')).not.toMatch(/name="robots"/)
    expect(fs.readFileSync(path.join(b.dir, 'testers/index.html'), 'utf8')).toContain('<meta name="robots" content="noindex" />')
  })
})

describe('the setting in the project', () => {
  it('is a plain true or false, in one place', () => {
    expect(typeof SEARCH_ENGINES_ALLOWED).toBe('boolean')
    expect(fs.readFileSync('src/data/siteSettings.js', 'utf8')).toMatch(/AT LAUNCH, change it to true/)
  })
  it('is what the build follows when nothing overrides it', () => {
    const b = build(undefined); made.push(b.dir)
    expect(b.out).toMatch(SEARCH_ENGINES_ALLOWED ? /OPEN to search engines/ : /CLOSED to search engines/)
    const home = fs.readFileSync(path.join(b.dir, 'index.html'), 'utf8')
    expect(home.includes('noindex, nofollow')).toBe(!SEARCH_ENGINES_ALLOWED)
  }, 60000)
  it('does not stop the shop\u2019s private pages being kept out by robots.txt as well', () => {
    const robots = fs.readFileSync('public/robots.txt', 'utf8')
    for (const p of ['/admin', '/art-loft/admin', '/new', '/new-product', '/api/']) expect(robots).toContain(`Disallow: ${p}`)
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m) // never block the whole site there: a blocked page cannot be read to see its noindex
  })
})
