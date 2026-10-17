// @vitest-environment node
// The table of page titles, descriptions and share pictures: complete, honest and the right shape.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { PAGES, IMAGES, SITE_URL, HOME_TITLE, fullTitleFor, urlFor, imageUrlFor } from '../src/data/pageMeta'
import { staticPages } from '../src/data/staticPages'

const entries = Object.entries(PAGES)
const indexable = entries.filter(([, p]) => p.index !== false)
// Two addresses that share a title because the page's own title setting uses the same name. A later update can give the story page its own.
const SAME_TITLE_OK = [['/factory-floor', '/factory-floor/floor']]

describe('every page in the table', () => {
  it('has an address in the right shape: starts with a slash, no trailing slash, no changing parts', () => {
    for (const [p] of entries) {
      expect(p, p).toMatch(/^\/[a-z0-9\-/]*$/)
      if (p !== '/') expect(p.endsWith('/'), p).toBe(false)
    }
  })
  it('has a title, a description and a picture that exists', () => {
    for (const [p, page] of entries) {
      expect(fullTitleFor(page).length, p).toBeGreaterThan(5)
      expect(String(page.description || '').length, p).toBeGreaterThan(10)
      expect(IMAGES[page.image], `${p} uses a picture that is not in IMAGES`).toBeTruthy()
    }
  })
  it('has no placeholder wording in what search results and shared links will show', () => {
    for (const [p, page] of entries) expect(`${fullTitleFor(page)} ${page.description}`, p).not.toMatch(/\[|\]|todo|lorem|replace this|placeholder/i)
  })
})

describe('what search results will show', () => {
  it('keeps every page title short enough not to be cut off (60 characters)', () => {
    for (const [p, page] of indexable) expect(fullTitleFor(page).length, p).toBeLessThanOrEqual(60)
  })
  it('keeps every public description between 70 and 155 characters', () => {
    for (const [p, page] of indexable) {
      expect(page.description.length, p).toBeGreaterThanOrEqual(70)
      expect(page.description.length, p).toBeLessThanOrEqual(155)
    }
  })
  it('gives every public page its own description, and its own title except where noted', () => {
    const descriptions = indexable.map(([, p]) => p.description)
    expect(new Set(descriptions).size).toBe(descriptions.length)
    const byTitle = {}
    for (const [p, page] of indexable) (byTitle[fullTitleFor(page)] ||= []).push(p)
    for (const [title, paths] of Object.entries(byTitle)) {
      if (paths.length > 1) expect(SAME_TITLE_OK.some((pair) => pair.length === paths.length && pair.every((x) => paths.includes(x))), `${title}: ${paths}`).toBe(true)
    }
  })
  it('does not describe a private or placeholder page as a public one', () => {
    for (const p of ['/admin', '/admin/doors', '/art-loft/admin', '/art-loft/admin/originals', '/cart', '/login', '/signup', '/forgot-password', '/reset-password', '/checkout/success', '/products', '/new', '/new-product', '/page/about', '/page/contact', '/page/terms', '/page/privacy', '/page/ai-policy', '/drafting-desk/authors-notebook']) {
      expect(PAGES[p], p).toBeTruthy()
      expect(PAGES[p].index, p).toBe(false)
    }
  })
  it('puts the home page and the rooms in, as public pages', () => {
    for (const p of ['/', '/blog', '/drafting-desk', '/idea-hatchery', '/leadership-lounge', '/explorers-bay', '/knowledge-nook', '/sarah-jrs-den', '/art-loft', '/factory-floor']) expect(PAGES[p].index, p).not.toBe(false)
    expect(fullTitleFor(PAGES['/'])).toBe(HOME_TITLE)
  })
})

describe('the share pictures', () => {
  const dir = path.resolve('public/share')
  const size = (file) => { const b = fs.readFileSync(path.join(dir, file)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), kb: b.length / 1024, png: b.subarray(1, 4).toString() === 'PNG' } }
  it('are real PNG files, 1200 by 630, and small enough to share quickly (under 300 KB)', () => {
    for (const [name, img] of Object.entries(IMAGES)) {
      expect(fs.existsSync(path.join(dir, img.file)), name).toBe(true)
      const s = size(img.file)
      expect(s.png, name).toBe(true)
      expect([s.w, s.h], name).toEqual([1200, 630])
      expect(s.kb, name).toBeLessThan(300)
    }
  })
  it('each have words describing them, for people who cannot see them', () => {
    for (const [name, img] of Object.entries(IMAGES)) expect(img.alt.length, name).toBeGreaterThan(30)
  })
  it('are written out in full web addresses', () => {
    expect(imageUrlFor(PAGES['/idea-hatchery'])).toBe(`${SITE_URL}/share/idea-hatchery.png`)
    expect(urlFor('/')).toBe(`${SITE_URL}/`)
    expect(urlFor('/art-loft')).toBe(`${SITE_URL}/art-loft`)
  })
})

describe('the old starter pages', () => {
  it('every one of them is in the table, so a new one cannot be forgotten', () => {
    for (const s of staticPages) expect(PAGES[`/page/${s.slug}`], s.slug).toBeTruthy()
  })
})
