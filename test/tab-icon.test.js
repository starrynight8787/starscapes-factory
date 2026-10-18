// @vitest-environment node
// The tab icon is the shooting star from the banner, not one room's icon.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderHead, ICONS } from '../scripts/shareHead.mjs'

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')
const png = (p) => { const b = fs.readFileSync(path.resolve(p)); return { signature: b.subarray(0, 8).toString('hex'), width: b.readUInt32BE(16), height: b.readUInt32BE(20), colourType: b[25] } }
const SHELL = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>x</title>\n  </head>\n  <body></body>\n</html>\n'
const META = { title: 'T', description: 'D', siteName: 'S', url: 'https://x.example/p', imageUrl: 'https://x.example/i.png', imageAlt: 'A', index: true }
const starOf = (text) => text.match(/d="(M18 8 L[^"]+)"/)[1]

describe('the banner mark: the star and its three trails', () => {
  const logo = read('src/components/Logo.jsx')
  const starMark = logo.slice(logo.indexOf('export function StarMark'), logo.indexOf('export default function Logo'))
  const shapesOf = (text) => [...text.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1])
  it('is drawn from the banner\u2019s own shapes (the star and all three trails), so the two cannot drift apart', () => {
    const svg = read('public/icons/star.svg')
    const banner = shapesOf(starMark)
    expect(banner).toHaveLength(4) // the star and three trails
    for (const d of banner) expect(shapesOf(svg), d).toContain(d)
  })
  it('is in the banner\u2019s blue, with the trails drawn bolder than in the banner so they still show at tab size', () => {
    const svg = read('public/icons/star.svg')
    expect(svg).toContain('fill="#2E8FD0"'); expect(logo).toMatch(/color = '#2E8FD0'/)
    const banner = Number(starMark.match(/strokeWidth="(\d+(?:\.\d+)?)"/)[1])
    const strokes = [...svg.matchAll(/stroke-width="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]))
    expect(strokes).toHaveLength(3)
    for (const w of strokes) expect(w, 'trail thickness').toBeGreaterThan(banner)
  })
  it('sits in a square picture (the mark is twice as wide as it is tall), so a browser tab does not squash it, with a name for anything that reads it', () => {
    const svg = read('public/icons/star.svg')
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)
    expect(w).toBe(h)
    expect(svg).toContain('<title>Starscapes Factory</title>')
  })
  it('has a 32 pixel picture for browsers that need one, with a see-through background', () => {
    const p = png('public/icons/star-32.png')
    expect(p).toMatchObject({ signature: '89504e470d0a1a0a', width: 32, height: 32, colourType: 6 })
  })
  it('has a 180 pixel home-screen icon for phones, with NO see-through parts (a phone would draw black behind them)', () => {
    const p = png('public/icons/apple-touch-icon.png')
    expect(p).toMatchObject({ signature: '89504e470d0a1a0a', width: 180, height: 180, colourType: 2 })
  })
})

describe('where it is used', () => {
  it('every page the build writes gets the star as its icon, and none gets a room\u2019s icon', () => {
    const html = renderHead(SHELL, META)
    expect(html).toContain(`<link rel="icon" type="image/svg+xml" href="${ICONS.svg}" />`)
    expect(html).toContain(`<link rel="icon" type="image/png" sizes="32x32" href="${ICONS.png}" />`)
    expect(html).toContain(`<link rel="apple-touch-icon" href="${ICONS.apple}" />`)
    expect(html).not.toMatch(/icons\/rooms/)
  })
  it('puts the icon in once, and putting a page through twice gives the same page', () => {
    const once = renderHead(SHELL, META)
    expect(once.match(/rel="icon"/g)).toHaveLength(2) // the picture and the 32 pixel one
    expect(once.match(/rel="apple-touch-icon"/g)).toHaveLength(1)
    expect(renderHead(once, META)).toBe(once)
  })
  it('is the same in the project\u2019s own index.html, which every page starts from', () => {
    const index = read('index.html')
    expect(index).toContain('<link rel="icon" type="image/svg+xml" href="/icons/star.svg" />')
    expect(index).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/icons/star-32.png" />')
    expect(index).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />')
    expect(index).not.toMatch(/icons\/rooms/)
  })
  it('points at files that really exist', () => {
    for (const href of Object.values(ICONS)) expect(fs.existsSync(path.resolve('public', href.replace(/^\//, ''))), href).toBe(true)
  })
  it('leaves each room\u2019s own icon for the menu and the room cards, which still use them', () => {
    for (const room of ['art-loft', 'factory-floor', 'knowledge-nook']) expect(fs.existsSync(path.resolve('public/icons/rooms', `${room}.png`)), room).toBe(true)
  })
})
