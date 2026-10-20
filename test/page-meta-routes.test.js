// @vitest-environment node
// Every page the app can show is accounted for in the table, so a new page cannot be added and forgotten.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { PAGES } from '../src/data/pageMeta'

const app = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8')
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1])
// Addresses with a changing part: each post, product, print, channel or old starter page is not one fixed address
const CHANGING = ['/channel/:slug', '/post/:id', '/page/:slug', '/products/:id']

describe('the app\u2019s pages and the table', () => {
  it('finds the routes it expects in App.jsx (so this test is not passing by finding nothing)', () => {
    expect(routes.length).toBeGreaterThan(15)
    expect(routes).toContain('/')
    expect(routes).toContain('/art-loft/*')
  })
  it('has an entry for every fixed address', () => {
    for (const r of routes.filter((r) => !r.includes(':') && !r.includes('*'))) expect(PAGES[r], `${r} is a page in App.jsx but not in src/data/pageMeta.js`).toBeTruthy()
  })
  it('has an entry for the front page of every section that has pages inside it', () => {
    for (const r of routes.filter((r) => r.endsWith('/*') && r !== '*')) expect(PAGES[r.slice(0, -2)], `${r} has no front page in src/data/pageMeta.js`).toBeTruthy()
  })
  it('knows which addresses have a changing part, and has nothing in the table that is not a real page', () => {
    for (const c of CHANGING) expect(routes, c).toContain(c)
    const fixed = new Set(routes.filter((r) => !r.includes(':') && !r.includes('*')))
    const fronts = new Set(routes.filter((r) => r.endsWith('/*')).map((r) => r.slice(0, -2)))
    const inside = ['/art-loft/prints', '/art-loft/originals', '/art-loft/admin', '/art-loft/admin/originals', '/factory-floor/floor', '/factory-floor/blueprints', '/drafting-desk/archive-entries', '/drafting-desk/come-write-with-me', '/idea-hatchery/lets-write-a-story', '/drafting-desk/authors-notebook', '/drafting-desk/writing-prompts', '/drafting-desk/poems', '/knowledge-nook/story-ledger']
    for (const p of Object.keys(PAGES)) {
      const known = fixed.has(p) || fronts.has(p) || inside.includes(p) || p.startsWith('/page/')
      expect(known, `${p} is in the table but is not a page in App.jsx`).toBe(true)
    }
  })
})
