import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'public/scenes/drafting-desk/'
const read = (f) => readFileSync(join(process.cwd(), dir + f), 'utf8')
const doc = new DOMParser().parseFromString(read('base.svg'), 'image/svg+xml')

describe('Drafting Desk: a light oak desk', () => {
  it('is a well-formed picture', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
  })
  it('has a warm oak surface at half strength, inside its thick navy edge', () => {
    const s = doc.querySelector('[data-oak="surface"]')
    expect(s.getAttribute('fill')).toBe('#E3D2B4')
    expect(s.getAttribute('fill-opacity')).toBe('0.5')
    expect(s.getAttribute('stroke-width')).toBe('9')
    expect([s.getAttribute('x'), s.getAttribute('y'), s.getAttribute('width'), s.getAttribute('height')]).toEqual(['30', '30', '1140', '780'])
    expect(s.parentElement.parentElement.getAttribute('stroke')).toBe('#14306A') // the outline is still navy
  })
  it('has a soft tan line just inside the edge', () => {
    const b = doc.querySelector('[data-oak="border"]')
    expect(b.getAttribute('stroke')).toBe('#C9B08A')
    expect(b.getAttribute('stroke-opacity')).toBe('0.6')
  })
  it('has six wavy lines of tan grain', () => {
    const grain = [...doc.querySelectorAll('[data-oak="grain"]')]
    expect(grain).toHaveLength(6)
    for (const g of grain) {
      expect(g.getAttribute('stroke')).toBe('#C2A57C')
      expect(g.getAttribute('stroke-opacity')).toBe('0.65')
      expect(g.getAttribute('d')).toMatch(/^M\d+ \d+ C/)
    }
  })
  it('keeps the old pale blue off the desk', () => {
    expect(read('base.svg')).not.toMatch(/E9EFFB/i)
  })
})

describe('Drafting Desk: everything on the desk is as it was', () => {
  it('keeps the sticky note, the mug, the scrap, the paper ball and the pen', () => {
    const b = read('base.svg')
    for (const id of ['decor-sticky-note', 'decor-mug', 'decor-crumpled-paper', 'decor-scrap', 'decor-pen']) expect(b, id).toContain(`id="${id}"`)
    expect(b).toContain('fill="#FFF1B8"')
    expect(b).toContain('fill="#B8CCF5"')
  })
  it('keeps the four papers white, and does not put oak on them', () => {
    for (const f of ['sheet-archive-entries.svg', 'sheet-authors-notebook.svg', 'sheet-come-write-with-me.svg', 'sheet-overthink-archive.svg']) {
      expect(read(f), f).not.toMatch(/E3D2B4|C9B08A|C2A57C/i)
      expect(read(f), f).toMatch(/fill="#fff"|fill="#F6F8FC"/)
    }
  })
  it('uses only the colours it is meant to', () => {
    const allowed = new Set(['#fff', '#14306A', 'none', '#FFF1B8', '#B8CCF5', '#E3D2B4'])
    for (const m of read('base.svg').matchAll(/fill="([^"]+)"/g)) expect(allowed.has(m[1]), m[1]).toBe(true)
    const strokes = new Set(['#14306A', '#C9B08A', '#C2A57C'])
    for (const m of read('base.svg').matchAll(/ stroke="([^"]+)"/g)) expect(m[1] === 'none' || strokes.has(m[1]), m[1]).toBe(true)
  })
})
