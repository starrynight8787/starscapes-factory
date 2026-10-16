import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'public/scenes/idea-hatchery/'
const read = (f) => readFileSync(join(process.cwd(), dir + f), 'utf8')
const parse = (text) => new DOMParser().parseFromString(text, 'image/svg+xml')

const LIQUIDS = [
  ['item-stop-motion.svg', '#FFB36B', 'orange'],
  ['item-short-stories.svg', '#8FD694', 'green'],
  ['item-writing-prompts.svg', '#B79CF2', 'lilac'],
]

describe('Idea Hatchery: the liquids', () => {
  for (const [file, colour, name] of LIQUIDS) {
    describe(`${file} is ${name}`, () => {
      const doc = parse(read(file))
      const liquid = doc.querySelector('path[data-liquid]')
      it('is a well-formed picture with exactly one liquid', () => {
        expect(doc.querySelector('parsererror')).toBeNull()
        expect(doc.querySelectorAll('path[data-liquid]')).toHaveLength(1)
      })
      it('has the colour from the design, with no outline of its own', () => {
        expect(liquid.getAttribute('fill')).toBe(colour)
        expect(liquid.getAttribute('stroke')).toBe('none')
      })
      it('sits inside the vessel (its clipped group), so the colour cannot spill outside the glass', () => {
        expect(liquid.parentElement.getAttribute('clip-path')).toMatch(/^url\(#clip-/)
      })
      it('is drawn underneath the wavy line and the marks on the glass, so those stay visible', () => {
        const kids = [...liquid.parentElement.children]
        expect(kids.indexOf(liquid)).toBe(0)
        expect(kids.length).toBeGreaterThan(2)
      })
      it('follows the same wavy top edge as the line drawn on it, and fills down to the bottom', () => {
        const wave = liquid.nextElementSibling.getAttribute('d')
        const start = wave.match(/^M([\d.]+)/)[1]
        expect(liquid.getAttribute('d')).toBe(`${wave} V 720 H ${start} Z`)
      })
    })
  }
  it('the dotted beaker (coming soon) and the empty glassware have no liquid', () => {
    expect(read('item-come-study-with-me.svg')).not.toMatch(/data-liquid/)
    const base = read('base.svg')
    expect(base).not.toMatch(/data-liquid/)
    // the empty beakers keep their white insides
    expect(base).toMatch(/id="beaker-empty-1"[\s\S]*?fill="#fff"/)
  })
})

describe('Idea Hatchery: the egg under the dome', () => {
  const doc = parse(read('base.svg'))
  const cap = doc.querySelector('path[data-egg-top]')
  it('has a dark top, in the dark navy from the design', () => {
    expect(cap).not.toBeNull()
    expect(cap.getAttribute('fill')).toBe('#070B26')
    expect(cap.getAttribute('stroke')).toBe('none')
  })
  it('is cut to the egg\u2019s own shape, so it cannot go outside the egg', () => {
    expect(cap.getAttribute('clip-path')).toBe('url(#clip-egg-top)')
    const eggShape = doc.querySelector('#clip-egg-top path').getAttribute('d')
    expect(eggShape).toBe('M164 610 C164 582 178 560 190 560 C202 560 216 582 216 610 Z')
  })
  it('ends along the zigzag crack, so only the part above the crack is dark', () => {
    const d = cap.getAttribute('d')
    for (const point of ['L200 594', 'L191 586', 'L182 594', 'L173 586', 'L164 594']) expect(d).toContain(point)
  })
  it('is drawn over the egg\u2019s white, with the egg\u2019s outline and crack drawn over it', () => {
    const group = cap.parentElement
    const kids = [...group.children]
    const i = kids.indexOf(cap)
    expect(kids[i - 1].tagName.toLowerCase()).toBe('defs') // the egg-shaped cutter
    expect(kids[i - 2].getAttribute('fill')).toBe('#fff') // the white egg, underneath
    expect(kids[i + 1].getAttribute('fill')).toBe('none') // the outline again, on top
    expect(kids[i + 1].getAttribute('d')).toBe(doc.querySelector('#clip-egg-top path').getAttribute('d'))
    expect(kids[i + 2].getAttribute('d')).toMatch(/^M164 594 l9 -8/) // then the crack line
  })
})

describe('Idea Hatchery: nothing else changed', () => {
  it('uses only the colours it is meant to', () => {
    const allowed = new Set(['#fff', '#14306A', 'none', '#FFB36B', '#8FD694', '#B79CF2', '#070B26'])
    for (const f of ['base.svg', ...LIQUIDS.map((l) => l[0]), 'item-come-study-with-me.svg']) {
      for (const m of read(f).matchAll(/fill="([^"]+)"/g)) expect(allowed.has(m[1]), `${f}: ${m[1]}`).toBe(true)
    }
  })
  it('keeps the sizes of the objects, and the places of the ones that did not move', () => {
    const g = JSON.parse(read('geometry.json'))
    expect(Object.keys(g).sort()).toEqual(['come-study-with-me', 'short-stories', 'stop-motion', 'writing-prompts'])
    expect(g['stop-motion']).toMatchObject({ cx: 847, cy: 555, w: 140, h: 198 }) // second from the end of the bench
  })
})
