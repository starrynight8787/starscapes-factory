import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FILES = ['src/artloft/artloft.css', 'src/artloft/printdetails.css', 'src/cart/cart.css', 'src/rooms/roompages.css', 'src/rooms/roomscene.css', 'src/draftingdesk/draftingdesk.css']
const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')

// every rule as { selector, body }
function rules(css) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) out.push({ selector: m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '), body: m[2] })
  return out
}
const rule = (path, selector) => (rules(read(path)).find((r) => r.selector === selector) || { body: '' }).body

// Writing laid on the drawn scenes (plaques, hover notes, labels on the paper) may go down to 12px; everything else must be 14px or more
const SCENE = /^(\.al-plaque|\.al-tip|\.al-sign|\.rs-label|\.rs-plaque|\.rs-tip)/
// The smallest size a font-size declaration can come out at, in px; null if it depends on the parent (em)
function floorPx(value) {
  const v = value.trim()
  const clamp = v.match(/^clamp\(\s*([\d.]+)(px|rem)/)
  if (clamp) return Number(clamp[1]) * (clamp[2] === 'rem' ? 16 : 1)
  const max = v.match(/^max\([^,]+,\s*([\d.]+)(px|rem)\)/)
  if (max) return Number(max[1]) * (max[2] === 'rem' ? 16 : 1)
  const plain = v.match(/^([\d.]+)(px|rem)$/)
  if (plain) return Number(plain[1]) * (plain[2] === 'rem' ? 16 : 1)
  return null
}

describe('no small text in the shop, cart, rooms and Drafting Desk styles', () => {
  for (const file of FILES) {
    it(file, () => {
      const problems = []
      for (const { selector, body } of rules(read(file))) {
        for (const d of body.matchAll(/font-size:\s*([^;]+);/g)) {
          const px = floorPx(d[1])
          const need = SCENE.test(selector) ? 12 : 14
          if (px === null) problems.push(`${selector}: ${d[1].trim()} depends on its parent`)
          else if (px < need) problems.push(`${selector}: ${d[1].trim()} is ${px}px, needs ${need}`)
        }
      }
      expect(problems).toEqual([])
    })
  }
})

describe('buttons', () => {
  it('the ordinary buttons use the shared size: 40px with a mouse, 44px on touch (set in site.css)', () => {
    for (const sel of ['.al-choice button', '.al-admin__pictures button', '.al-btn']) {
      expect(rule('src/artloft/artloft.css', sel), sel).toMatch(/min-height: var\(--sf-btn-h, 40px\)/)
    }
  })
  it('the two big buttons, Buy and Checkout, are 48px (still above the 44px touch size)', () => {
    expect(rule('src/artloft/artloft.css', '.al-buy')).toMatch(/min-height: 48px/)
    expect(rule('src/cart/cart.css', '.cart-checkout')).toMatch(/min-height: 48px/)
  })
  it('on a touch screen the ordinary buttons are 44px, written in the stylesheet itself', () => {
    const css = read('src/artloft/artloft.css')
    expect(css.slice(css.lastIndexOf('@media (pointer: coarse)'))).toMatch(/\.al-btn,[\s\S]*\.al-choice button,[\s\S]*\.al-admin__pictures button \{\s*min-height: 44px/)
  })
  it('no button is below 40px', () => {
    for (const file of FILES) {
      for (const { selector, body } of rules(read(file))) {
        if (!/button|\.al-btn|\.al-buy|checkout|\.al-choice/.test(selector) || /img|thumb|icon/.test(selector)) continue
        for (const d of body.matchAll(/(?:^|[^-])(?:min-)?height:\s*(\d+)px/g)) expect(Number(d[1]), `${selector} ${d[0].trim()}`).toBeGreaterThanOrEqual(40)
      }
    }
  })
})

describe('entry titles in the room lists and the Drafting Desk', () => {
  for (const [file, sel] of [['src/rooms/roompages.css', '.rp-entry__title'], ['src/draftingdesk/draftingdesk.css', '.dd-entry__title']]) {
    it(`${sel} is Schoolbell, one weight, with room for its width`, () => {
      const b = rule(file, sel)
      expect(b).toMatch(/font-family: var\(--sf-school, 'Schoolbell'/)
      expect(b).toMatch(/font-weight: 400/)
      expect(b).toMatch(/line-height: 1\.2/)
      expect(b).toMatch(/font-size: 1\.4rem/)
    })
  }
  it('the scene labels and plaques are left in their handwriting for now (they sit on drawn paper)', () => {
    expect(rule('src/rooms/roomscene.css', '.rs-label')).toMatch(/--sf-hand/)
    expect(rule('src/rooms/roomscene.css', '.rs-plaque')).toMatch(/--sf-hand/)
    expect(rule('src/artloft/artloft.css', '.al-plaque')).toMatch(/--sf-hand/)
  })
})

describe('the keyboard focus rings in these files are still visible on pale pages', () => {
  it('none is white', () => {
    for (const file of FILES) expect(read(file), file).not.toMatch(/outline:[^;]*(#fff|white)\b/i)
  })
})
