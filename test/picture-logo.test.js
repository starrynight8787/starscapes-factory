// @vitest-environment node
// The Story Ledger TV shows the Story Ledger logo on its screen: the one image a room picture may hold. This keeps that exception as narrow as it was meant to be (SFW-176).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { LOGO, LOGO_MAX_DATA, PHOTO, PHOTO_MAX_DATA, withoutLogo } from './allowedLogo'

const root = process.cwd()
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })
const allPictures = walk(join(root, 'public')).filter((p) => p.endsWith('.svg')).map((p) => relative(root, p).split('\\').join('/'))
const TV = ['public/scenes/knowledge-nook/item-story-ledger.svg', 'public/scenes/knowledge-nook/item-story-ledger-open.svg']
const DEN = 'public/scenes/sarah-jrs-den/base.svg'
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const FORBIDDEN = /<text|<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|\son[a-z]+=|javascript:|<style|<title|<desc|font-family|url\(["']?https?:/i

describe('the one image a picture may hold', () => {
  it('only the two Story Ledger TV pictures (closed and open) and the Clubhouse wall frame hold an image at all; every other picture on the site is pure drawing', () => {
    expect(allPictures.length).toBeGreaterThan(40)
    for (const rel of allPictures) expect(/<image/i.test(read(rel)), rel).toBe(TV.includes(rel) || rel === DEN)
  })
  it('the Clubhouse wall frame holds exactly one photo, in exactly the allowed shape: marked as the photo, stored inside the picture, clipped to the frame and not too heavy', () => {
    const s = read(DEN)
    expect((s.match(/<image/gi) || []).length).toBe(1); expect((s.match(PHOTO) || []).length).toBe(1)
    const tag = s.match(PHOTO)[0]; const data = tag.match(/base64,([A-Za-z0-9+/=]+)/)[1]
    expect(tag.replace(/base64,[A-Za-z0-9+/=]+/, 'base64,')).not.toMatch(/https?:|\/\//); expect(tag).toContain('clip-path="url(#frame-photo)"'); expect(data.length).toBeLessThan(PHOTO_MAX_DATA); expect(data.length).toBeGreaterThan(500)
    expect(s.replace(PHOTO, '')).not.toMatch(FORBIDDEN)
  })
  it('each of those holds exactly one, in exactly the allowed shape: marked as the logo, clipped to the screen, and nothing else about it left open', () => {
    for (const rel of TV) { const s = read(rel); expect((s.match(/<image/gi) || []).length, rel).toBe(1); expect((s.match(LOGO) || []).length, rel).toBe(1) }
  })
  it('is stored inside the picture (a WebP data address), so no outside address is ever asked for, and it is small', () => {
    for (const rel of TV) {
      const tag = read(rel).match(LOGO)[0]; const data = tag.match(/base64,([A-Za-z0-9+/=]+)"/)[1]
      expect(tag.replace(/base64,[A-Za-z0-9+/=]+/, 'base64,'), rel).not.toMatch(/https?:|\/\//); expect(tag, rel).toContain('href="data:image/webp;base64,'); expect(data.length, rel).toBeLessThan(LOGO_MAX_DATA); expect(data.length, rel).toBeGreaterThan(500)
      expect(Buffer.from(data, 'base64').subarray(0, 4).toString('ascii'), rel).toBe('RIFF') // it really is a picture file (WebP starts with RIFF), not text dressed up as one
    }
  })
  it('sits on the TV screen: clipped to the screen shape that is in the same picture, so it cannot spill over the television', () => {
    for (const rel of TV) { const s = read(rel); expect(s.match(LOGO)[0], rel).toContain('clip-path="url(#tv-screen)"'); expect(s, rel).toContain('id="tv-screen"') }
  })
  it('is the same logo whether the TV is closed or open', () => {
    const [a, b] = TV.map((rel) => read(rel).match(LOGO)[0].match(/base64,([A-Za-z0-9+/=]+)"/)[1]); expect(a).toBe(b)
  })
  it('leaves everything else about the pictures as strict as before: without the logo, they hold nothing that runs, loads or links', () => {
    for (const rel of TV) expect(withoutLogo(rel, read(rel)), rel).not.toMatch(FORBIDDEN)
  })
  it('does not widen to any other picture: the same logo in another file is not accepted by the picture tests', () => {
    const logo = read(TV[0]).match(LOGO)[0]; expect(withoutLogo('public/scenes/knowledge-nook/item-other.svg', `<svg>${logo}</svg>`)).toMatch(/<image/)
    expect(withoutLogo(TV[0], `<svg>${logo}<image href="https://example.com/x.png" /></svg>`)).toMatch(/<image href="https:/)
  })
})
