// @vitest-environment node
// The build step that writes each page's own copy: run for real on a small stand-in build folder.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { PAGES } from '../src/data/pageMeta'

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'sharepages-'))
const SHELL = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <script type="module" crossorigin src="/assets/index-abc.js"></script>\n    <title>Starscapes Factory: where imagination takes shape</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n'
const read = (rel) => fs.readFileSync(path.join(dist, rel), 'utf8')
const fileFor = (p) => (p === '/' ? 'index.html' : `${p.slice(1)}/index.html`)
let output = ''

beforeAll(() => {
  fs.writeFileSync(path.join(dist, 'index.html'), SHELL)
  output = execFileSync('node', ['scripts/make-share-pages.mjs', dist], { encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } }) // no database: this test is about the fixed pages
}, 60000)
afterAll(() => fs.rmSync(dist, { recursive: true, force: true }))

describe('the build step that writes each page\u2019s own copy', () => {
  it('writes a copy for every address in the table, and says how many', () => {
    for (const p of Object.keys(PAGES)) expect(fs.existsSync(path.join(dist, fileFor(p))), p).toBe(true)
    expect(output).toContain(`${Object.keys(PAGES).length} written`)
  })
  it('gives each copy its own title, address and share picture, and keeps the page\u2019s own script', () => {
    const room = read('idea-hatchery/index.html')
    expect(room).toContain('<title>The Idea Hatchery | Starscapes Factory</title>')
    expect(room).toContain('rel="canonical" href="https://starscapesfactory.com/idea-hatchery"')
    expect(room).toContain('content="https://starscapesfactory.com/share/idea-hatchery.png"')
    expect(room).toContain('<script type="module" crossorigin src="/assets/index-abc.js"></script>')
    expect(room).toContain('<div id="root"></div>')
  })
  it('points every copy at a share picture that really exists in the project', () => {
    for (const p of Object.keys(PAGES)) {
      const html = read(fileFor(p))
      const m = html.match(/property="og:image" content="https:\/\/starscapesfactory\.com\/(share\/[a-z-]+\.png)"/)
      expect(m, p).toBeTruthy()
      expect(fs.existsSync(path.resolve('public', m[1])), `${p} -> ${m && m[1]}`).toBe(true)
    }
  })
  it('makes the home page file carry no address of its own, because Vercel also serves it for every unlisted address such as a post', () => {
    const home = read('index.html')
    expect(home).toContain('<title>Starscapes Factory: where imagination takes shape</title>')
    expect(home).not.toContain('rel="canonical"')
    expect(home).not.toContain('og:url')
  })
  it('marks private pages noindex, and leaves them out of the sitemap along with everything else not public', () => {
    const sitemap = read('sitemap.xml')
    for (const [p, page] of Object.entries(PAGES)) {
      const html = read(fileFor(p))
      if (page.index === false) {
        expect(html, p).toContain('content="noindex"')
        expect(sitemap, p).not.toContain(`<loc>https://starscapesfactory.com${p}</loc>`)
      } else {
        expect(html, p).not.toContain('noindex')
        expect(sitemap, p).toContain(`<loc>https://starscapesfactory.com${p === '/' ? '/' : p}</loc>`)
      }
    }
  })
  it('does not write a separate shell file: nothing depends on one existing', () => {
    expect(fs.existsSync(path.join(dist, 'shell.html'))).toBe(false)
    expect(fs.readFileSync(path.resolve('vercel.json'), 'utf8')).toContain('"destination": "/index.html"')
  })
  it('is safe to run again on its own output', () => {
    const before = read('idea-hatchery/index.html')
    execFileSync('node', ['scripts/make-share-pages.mjs', dist], { encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } }) // no database: this test is about the fixed pages
    expect(read('idea-hatchery/index.html')).toBe(before)
  })
})

describe('how the project builds', () => {
  it('runs the step after the normal build', () => {
    const scripts = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8')).scripts
    expect(scripts.build).toBe('vite build && node scripts/make-share-pages.mjs')
  })
  it('has a robots file that points to the sitemap and keeps the shop\u2019s behind-the-scenes pages out', () => {
    const robots = fs.readFileSync(path.resolve('public/robots.txt'), 'utf8')
    expect(robots).toContain('Sitemap: https://starscapesfactory.com/sitemap.xml')
    for (const p of ['/admin', '/art-loft/admin', '/api/']) expect(robots).toContain(`Disallow: ${p}`)
    expect(robots).not.toMatch(/Disallow: \/\s*$/m)
  })
})
