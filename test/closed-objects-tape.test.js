import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (f) => readFileSync(join(process.cwd(), 'public/scenes/' + f), 'utf8')
const parse = (f) => new DOMParser().parseFromString(read(f), 'image/svg+xml')
const num = (v) => Number(v)

// Each closed object: the picture the tape is in, the picture the cone is in, where the tape is meant to be (in that picture's own coordinates)
const ROOMS = [
  { room: 'Idea Hatchery: Come Study With Me', item: 'idea-hatchery/item-come-study-with-me.svg', base: 'idea-hatchery/base.svg', tape: { cx: 718.5, cy: 558.3, length: 150, angle: -20 }, shift: -136, cone: { x: 665, y: 669.3, width: 44.2 } },
  { room: 'Leadership Lounge: Free Ebook', item: 'leadership-lounge/item-free-ebook.svg', base: 'leadership-lounge/base.svg', tape: { cx: 696, cy: 620, length: 165, angle: -14 }, shift: 0, cone: { x: 791.6, y: 692.2, width: 46.8 } },
  { room: 'Explorer\u2019s Bay: Something New', item: 'explorers-bay/item-coming-soon.svg', base: 'explorers-bay/base.svg', tape: { cx: 1061.7, cy: 718.4, length: 120, angle: -34 }, shift: 0, cone: { x: 1001.2, y: 758.4, width: 41.6 } },
]

describe.each(ROOMS)('$room: hazard tape across it', (r) => {
  const doc = parse(r.item)
  const group = doc.querySelector('g[data-tape-group]')
  const rect = doc.querySelector('rect[data-tape]')
  it('has one strip of yellow tape, with its navy stripes and outline', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.querySelectorAll('g[data-tape-group]')).toHaveLength(1)
    expect(rect.getAttribute('fill')).toBe('#FFD60A')
    // one navy stripe every 26 units along the strip, with one spare at each end so the ends are always striped
    expect(group.querySelectorAll('g[clip-path] path[fill="#14306A"]')).toHaveLength(Math.ceil((r.tape.length + 52) / 26))
    expect(group.querySelector('rect[fill="none"]').getAttribute('stroke-width')).toBe('4')
  })
  it('is the length, place and tilt in the design', () => {
    expect(num(rect.getAttribute('width'))).toBe(r.tape.length)
    expect(num(rect.getAttribute('height'))).toBe(26)
    const m = group.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/)
    expect([num(m[1]), num(m[2]), num(m[3])]).toEqual([r.tape.cx, r.tape.cy, r.tape.angle])
  })
  it('lies wholly inside the object\u2019s own picture, so none of it is cut off', () => {
    const [vx, vy, vw, vh] = doc.documentElement.getAttribute('viewBox').split(' ').map(num)
    const a = (r.tape.angle * Math.PI) / 180
    const halfW = (r.tape.length / 2) * Math.abs(Math.cos(a)) + 13 * Math.abs(Math.sin(a)) + 2
    const halfH = (r.tape.length / 2) * Math.abs(Math.sin(a)) + 13 * Math.abs(Math.cos(a)) + 2
    // the Hatchery's drawing is moved along the bench, so its tape travels with it
    const cx = r.tape.cx + r.shift
    expect(cx - halfW).toBeGreaterThanOrEqual(vx)
    expect(cx + halfW).toBeLessThanOrEqual(vx + vw)
    expect(r.tape.cy - halfH).toBeGreaterThanOrEqual(vy)
    expect(r.tape.cy + halfH).toBeLessThanOrEqual(vy + vh)
  })
  it('keeps its picture\u2019s frame exactly as it was measured', () => {
    expect(doc.documentElement.getAttribute('width')).toBe(String(num(doc.documentElement.getAttribute('viewBox').split(' ')[2])))
  })
})

describe.each(ROOMS)('$room: a red cone beside it', (r) => {
  const doc = parse(r.base)
  const cone = doc.querySelector('g[data-cone]')
  it('has one cone: a navy base, a red body with one white band, and its outline over the band\u2019s edges', () => {
    expect(doc.querySelectorAll('g[data-cone]')).toHaveLength(1)
    expect([...cone.children].map((k) => [k.tagName, k.getAttribute('fill')])).toEqual([['rect', '#14306A'], ['path', '#E5484D'], ['path', '#fff'], ['path', 'none']])
  })
  it('stands where the design has it, at the design\u2019s size, and well inside the picture', () => {
    const m = cone.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/)
    expect(num(m[1])).toBeCloseTo(r.cone.x, 1)
    expect(num(m[2])).toBeCloseTo(r.cone.y, 1)
    expect(num(m[3]) * 52).toBeCloseTo(r.cone.width, 0)
    const right = num(m[1]) + 52 * num(m[3])
    const bottom = num(m[2]) + 70 * num(m[3])
    expect(right).toBeLessThanOrEqual(1200)
    expect(bottom).toBeLessThanOrEqual(840)
  })
})

describe('the tape and cones are only pictures', () => {
  it.each(ROOMS)('$room: nothing that runs, loads or links', (r) => {
    for (const f of [r.item, r.base]) {
      const svg = read(f)
      expect(svg.startsWith('<svg'), f).toBe(true)
      expect(svg, f).not.toMatch(/<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|\son[a-z]+=|javascript:|<style|url\(["']?https?:/i)
    }
  })
})
