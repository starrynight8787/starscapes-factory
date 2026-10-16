import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'public/scenes/leadership-lounge/'
const read = (f) => readFileSync(join(process.cwd(), dir + f), 'utf8')
const parse = (text) => new DOMParser().parseFromString(text, 'image/svg+xml')

const COUCH = '#DBE3FF'
const SHADE = '#E1F3E8'
const POT = '#FFB27A'

describe('Leadership Lounge: the couch', () => {
  const doc = parse(read('item-leading-from-the-middle.svg'))
  const group = doc.querySelector('[data-couch]')
  it('is a well-formed picture', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(group).not.toBeNull()
  })
  it('is periwinkle all over: the back, both arms, both seat cushions and the base', () => {
    const shapes = [...group.querySelectorAll('rect')]
    expect(shapes).toHaveLength(6)
    for (const r of shapes) expect(r.getAttribute('fill')).toBe(COUCH)
  })
  it('keeps its navy star and outlines, and has no white left', () => {
    expect(read('item-leading-from-the-middle.svg')).not.toMatch(/fill="#fff"/)
    expect(group.querySelector('path[fill="#14306A"]')).not.toBeNull() // the star
    expect(group.parentElement.getAttribute('stroke')).toBe('#14306A')
  })
  it('stays exactly where it was measured (same frame, same size)', () => {
    expect(read('item-leading-from-the-middle.svg')).toContain('viewBox="280 272 640 416"')
  })
})

describe('Leadership Lounge: the lamp shade and the plant pot', () => {
  const doc = parse(read('base.svg'))
  it('the lamp shade is pale mint, and the plant pot is terracotta', () => {
    expect(doc.querySelector('path[data-shade]').getAttribute('fill')).toBe(SHADE)
    expect(doc.querySelector('path[data-pot]').getAttribute('fill')).toBe(POT)
  })
  it('they are the right shapes: the shade is the lamp\u2019s, the pot is the plant\u2019s', () => {
    expect(doc.querySelector('#lamp path[data-shade]')).not.toBeNull()
    expect(doc.querySelector('#plant path[data-pot]')).not.toBeNull()
    expect(doc.querySelector('path[data-shade]').getAttribute('d')).toBe('M978 360 L994 280 H1066 L1082 360 Z')
    expect(doc.querySelector('path[data-pot]').getAttribute('d')).toBe('M94 656 H186 L174 748 H106 Z')
  })
  it('the plant\u2019s leaves, the coffee table and the rug are left as they were', () => {
    const leaves = [...doc.querySelectorAll('#plant path')].filter((p) => !p.hasAttribute('data-pot') && p.getAttribute('fill') === '#fff')
    expect(leaves.length).toBe(7)
    expect(doc.querySelector('#coffee-table rect').getAttribute('fill')).toBe('#fff')
  })
})

describe('Leadership Lounge: nothing else changed', () => {
  it('the other four objects are untouched (still white)', () => {
    for (const f of ['item-audiobook.svg', 'item-blog.svg', 'item-free-ebook.svg', 'item-udemy-course.svg']) {
      expect(read(f), f).not.toMatch(new RegExp(COUCH + '|' + SHADE + '|' + POT, 'i'))
      expect(read(f), f).toMatch(/fill="#fff"/)
    }
  })
  it('uses only the colours it is meant to', () => {
    const allowed = new Set(['#fff', '#14306A', 'none', COUCH, SHADE, POT])
    for (const f of ['base.svg', 'item-leading-from-the-middle.svg', 'item-audiobook.svg', 'item-blog.svg', 'item-free-ebook.svg', 'item-udemy-course.svg']) {
      for (const m of read(f).matchAll(/fill="([^"]+)"/g)) expect(allowed.has(m[1]), `${f}: ${m[1]}`).toBe(true)
    }
  })
})
