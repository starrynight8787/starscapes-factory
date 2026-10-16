import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const text = readFileSync(join(process.cwd(), 'public/scenes/art-loft.svg'), 'utf8')
const doc = new DOMParser().parseFromString(text, 'image/svg+xml')

describe('Art Loft: the under-construction barrier and cone at Digital Downloads', () => {
  it('is a well-formed picture', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 1200 840')
  })
  it('has yellow hazard tape with its navy stripes', () => {
    const tape = doc.querySelector('rect[data-tape]')
    expect(tape.getAttribute('fill')).toBe('#FFD60A')
    expect(tape.getAttribute('stroke')).toBe('none')
    expect([tape.getAttribute('x'), tape.getAttribute('y'), tape.getAttribute('width'), tape.getAttribute('height')]).toEqual(['590', '627', '222', '26'])
    const stripes = [...doc.querySelectorAll('#tape-b')].length
    expect(stripes).toBe(1)
    const striped = [...tape.parentElement.querySelectorAll('g[clip-path] path[fill="#14306A"]')]
    expect(striped).toHaveLength(10)
  })
  it('has a red cone: a navy base, a red body, one white band, and the outline drawn over the band\u2019s edges', () => {
    const cone = doc.querySelector('g[data-cone]')
    const kids = [...cone.children].map((k) => [k.tagName, k.getAttribute('fill')])
    expect(kids).toEqual([['rect', '#14306A'], ['path', '#E5484D'], ['path', '#fff'], ['path', 'none']])
    expect(cone.children[1].getAttribute('d')).toBe(cone.children[3].getAttribute('d')) // the same outline, twice
    expect(cone.querySelector('path[data-cone-band]').getAttribute('stroke')).toBe('none')
  })
  it('puts the white band inside the cone, between its two sides', () => {
    // the cone narrows from 40 across at the base (814 to 854) to 16 at the top (826 to 842); the band must sit inside that at its height
    const edge = (y) => ({ left: 826 - ((y - 646) * 12) / 60, right: 842 + ((y - 646) * 12) / 60 })
    const nums = doc.querySelector('path[data-cone-band]').getAttribute('d').match(/-?[\d.]+/g).map(Number)
    const pts = [[nums[0], nums[1]], [nums[2], nums[1]], [nums[3], nums[4]], [nums[5], nums[4]]]
    for (const [x, y] of pts) {
      const e = edge(y)
      expect(x).toBeGreaterThanOrEqual(e.left - 0.5)
      expect(x).toBeLessThanOrEqual(e.right + 0.5)
    }
  })
  it('leaves the four objects and the stars as they were', () => {
    for (const id of ['object-originals', 'object-prints', 'object-downloads', 'object-redbubble']) expect(doc.getElementById(id), id).not.toBeNull()
    expect(doc.getElementById('object-downloads').getAttribute('opacity')).toBe('0.75') // the dotted outline is still faded
  })
  it('uses only the colours it is meant to', () => {
    const allowed = new Set(['#fff', '#14306A', 'none', '#FFD60A', '#E5484D', '#F6F8FC']) // the pale page colour was already there (the easel\u2019s canvas)
    for (const m of text.matchAll(/fill="([^"]+)"/g)) expect(allowed.has(m[1]), m[1]).toBe(true)
  })
})
