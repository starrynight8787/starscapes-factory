import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'public/scenes/explorers-bay/'
const read = (f) => readFileSync(join(process.cwd(), dir + f), 'utf8')
const parse = (text) => new DOMParser().parseFromString(text, 'image/svg+xml')

const PHOTOS = ['#FFC78F', '#7FC4F0', '#8FD694', '#B79CF2'] // orange (the star), blue (the camera), green (the mountains), lilac (the moon)
const CASE = '#DDBB92'
const CLASP = '#C9A070'
const TAG = '#CFA678'

describe('Explorer\u2019s Bay: the four photographs', () => {
  const doc = parse(read('item-photography.svg'))
  const photos = [...doc.querySelectorAll('rect[data-photo]')]
  it('is a well-formed picture with four photographs', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(photos).toHaveLength(4)
  })
  it('has each in its own colour, in order: orange, blue, green, lilac', () => {
    expect(photos.map((p) => p.getAttribute('fill'))).toEqual(PHOTOS)
    expect(photos.map((p) => p.getAttribute('data-photo'))).toEqual(['1', '2', '3', '4'])
  })
  it('colours only the picture inside each frame: the white frames and the little pegs stay white', () => {
    const frames = [...doc.querySelectorAll('rect[width="66"]')]
    expect(frames).toHaveLength(4)
    for (const f of frames) expect(f.getAttribute('fill')).toBe('#fff')
    const pegs = [...doc.querySelectorAll('rect[width="10"][height="16"]')]
    expect(pegs).toHaveLength(4)
    for (const p of pegs) expect(p.getAttribute('fill')).toBe('#fff')
  })
  it('keeps the little navy pictures on them (the star and the moon) and the lens, mountains and string', () => {
    const body = read('item-photography.svg')
    expect((body.match(/fill="#14306A"/g) || []).length).toBe(2)
    expect(body).toContain('<circle cx="0" cy="42" r="9"')
    expect(body).toContain('M-24 62 L-8 36 L4 52 L12 42 L24 62')
    expect(body).toContain('M562 364 Q700 470 858 330')
  })
  it('stays exactly where it was measured', () => {
    expect(read('item-photography.svg')).toContain('viewBox="536 304 348 225"')
  })
})

describe('Explorer\u2019s Bay: the suitcase', () => {
  const doc = parse(read('item-writing-in-transit.svg'))
  it('has a light tan body, darker tan clasps and a luggage tag in between', () => {
    expect(doc.querySelector('[data-case="body"]').getAttribute('fill')).toBe(CASE)
    const clasps = [...doc.querySelectorAll('[data-case="clasp"]')]
    expect(clasps).toHaveLength(2)
    for (const c of clasps) expect(c.getAttribute('fill')).toBe(CLASP)
    expect(doc.querySelector('[data-case="tag"]').getAttribute('fill')).toBe(TAG)
  })
  it('are the right shapes: the body is the 140 by 92 case, the tag is the pointed tag', () => {
    const body = doc.querySelector('[data-case="body"]')
    expect([body.getAttribute('width'), body.getAttribute('height')]).toEqual(['140', '92'])
    expect(doc.querySelector('[data-case="tag"]').getAttribute('d')).toBe('M104 24 H128 L134 40 L128 56 H104 Z')
  })
  it('leaves the notebook beside it white, with its navy star and marks on the case', () => {
    const notebook = doc.querySelector('rect[width="76"][height="86"]')
    expect(notebook.getAttribute('fill')).toBe('#fff')
    expect(read('item-writing-in-transit.svg')).toContain('fill="#14306A"') // the star on the case
  })
  it('stays exactly where it was measured', () => {
    expect(read('item-writing-in-transit.svg')).toContain('viewBox="132 444 296 207"')
  })
})

describe('Explorer\u2019s Bay: nothing else changed', () => {
  it('the boat, the pier and the little Something New sign are as they were', () => {
    expect(read('item-coming-soon.svg')).toMatch(/fill="#fff"/)
    const base = read('base.svg')
    expect(base).toMatch(/<g id="boat"/)
    expect(base).toMatch(/<g id="pier"/)
    for (const c of [...PHOTOS, CASE, CLASP, TAG]) expect(base.toLowerCase()).not.toContain(c.toLowerCase())
  })
  it('uses only the colours it is meant to', () => {
    const allowed = new Set(['#fff', '#14306A', 'none', ...PHOTOS, CASE, CLASP, TAG, '#FFD60A', '#E5484D']) // plus the yellow of the hazard tape and the red of the cone
    for (const f of ['base.svg', 'item-photography.svg', 'item-writing-in-transit.svg', 'item-coming-soon.svg']) {
      for (const m of read(f).matchAll(/fill="([^"]+)"/g)) expect(allowed.has(m[1]), `${f}: ${m[1]}`).toBe(true)
    }
  })
})

describe('Explorer\u2019s Bay: the moon has moved to make room for the heading', () => {
  const doc = parse(read('base.svg'))
  const moon = doc.querySelector('path[data-moon]')
  it('is the same crescent, moved across the sky by a fixed amount', () => {
    expect(moon.getAttribute('d')).toBe('M140 98 A52 52 0 1 0 140 202 A41 41 0 1 1 140 98 Z')
    expect(moon.getAttribute('transform')).toBe('translate(640 -10)')
    expect(moon.getAttribute('fill')).toBe('#fff')
  })
  it('now sits well clear of the heading corner (the heading takes the left 560 units and the top 200)', () => {
    const [dx, dy] = moon.getAttribute('transform').match(/-?\d+/g).map(Number)
    const box = { left: 88 + dx, right: 142 + dx, top: 94 + dy, bottom: 206 + dy } // the crescent and its outline
    expect(box.left).toBeGreaterThanOrEqual(560)
    expect(box.top).toBeGreaterThanOrEqual(40)
    expect(box.bottom).toBeLessThanOrEqual(260)
  })
  it('does not sit on any of the stars or the flag', () => {
    const [dx, dy] = moon.getAttribute('transform').match(/-?\d+/g).map(Number)
    const box = [88 + dx, 94 + dy, 142 + dx, 206 + dy]
    const others = [[1008, 158], [941, 219], [403, 200], [213, 247], [866, 234]] // the stars, and the top of the sail's flag
    for (const [x, y] of others) expect(x < box[0] - 30 || x > box[2] + 30 || y < box[1] - 30 || y > box[3] + 30, `${x},${y}`).toBe(true)
  })
})
