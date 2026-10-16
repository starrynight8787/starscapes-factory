import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/rooms/roomscene.css'), 'utf8')
const rule = (selector) => {
  const m = css.match(new RegExp('(^|\\n)' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}'))
  return m ? m[2] : ''
}
const phone = css.match(/@media \(max-width: 820px\)\s*\{([\s\S]*?)\n\}/)[1]

describe('the illustrated rooms use the width of the screen', () => {
  it('lift the 720px page column, the same way the Art Loft and the Factory Floor do', () => {
    const r = rule('.container:has(> .rs)')
    expect(r).toMatch(/max-width:\s*none/)
    expect(r).toMatch(/padding-left:\s*0/)
    expect(r).toMatch(/padding-right:\s*0/)
  })
  it('set the picture\u2019s width from one number for how wide it may grow, set to the width in the design', () => {
    const root = rule(':root')
    expect(root).toMatch(/--rs-max:\s*1440px/)
    expect(root).toMatch(/--rs-ratio:\s*1\.4286/) // the pictures are 1200 by 840
    expect(rule('.rs')).toMatch(/max-width:\s*var\(--rs-max, 1440px\)/)
  })
  it('and also from the height of the screen, so the whole room is in view without zooming out', () => {
    const w = rule(':root').match(/--rs-stage-w:\s*([^;]+);/)[1]
    expect(w).toMatch(/min\(var\(--rs-max, 1440px\)/)
    expect(w).toMatch(/100vh/)
    expect(w).toMatch(/max\(560px,/) // never smaller than 560px wide
    expect(rule('.rs-stage')).toMatch(/max-width:\s*var\(--rs-stage-w\)/)
  })
  it('leave only the menu, the Home link\u2019s row and a little space above and below the picture (the heading is on it)', () => {
    expect(rule(':root')).toMatch(/--rs-above:\s*186px/)
  })
  it('keep the plain list for phones, where the picture is hidden', () => {
    expect(phone).toMatch(/\.rs-stage\s*\{\s*display:\s*none/)
    expect(phone).toMatch(/\.rs-list\s*\{\s*display:\s*block/)
  })
})

describe('the room\u2019s name sits on the picture', () => {
  it('shares the picture\u2019s place in the page, so it lies over the empty top-left corner', () => {
    expect(rule('.rs')).toMatch(/display:\s*grid/)
    expect(rule('.rs-home')).toMatch(/grid-area:\s*1 \/ 1/) // the Home link has the first row
    expect(rule('.rs-head')).toMatch(/grid-area:\s*2 \/ 1/)
    expect(rule('.rs-stage')).toMatch(/grid-area:\s*2 \/ 1/)
  })
  it('is as wide as the picture, so it lines up with its left edge, and is only writing: it never blocks a click', () => {
    const h = rule('.rs-head')
    expect(h).toMatch(/width:\s*var\(--rs-stage-w\)/)
    expect(h).toMatch(/pointer-events:\s*none/)
    expect(h).toMatch(/text-align:\s*left/)
  })
  it('grows and shrinks with the picture, but never below a readable size', () => {
    expect(rule('.rs-head h1')).toMatch(/font-size:\s*max\(18px, calc\(var\(--rs-stage-w\) \* var\(--rs-name, 0\.034\)\)\)/)
    expect(rule('.rs-tagline')).toMatch(/font-size:\s*max\(18px, calc\(var\(--rs-stage-w\) \* var\(--rs-tag, 0\.03\)\)\)/)
    expect(rule('.rs-blurb')).toMatch(/font-size:\s*max\(14px, calc\(var\(--rs-stage-w\) \* var\(--rs-line, 0\.0165\)\)\)/)
  })
  it('has three settings for how big the heading is, a little bigger than the design\u2019s 0.03, 0.026 and 0.0145', () => {
    const root = rule(':root')
    expect(root).toMatch(/--rs-name:\s*0\.034/)
    expect(root).toMatch(/--rs-tag:\s*0\.03/)
    expect(root).toMatch(/--rs-line:\s*0\.0165/)
  })
  it('is in the same top-left corner in every room, with no special offset (the moon was moved instead)', () => {
    expect(css).not.toMatch(/data-room='explorers-bay'\] \.rs-head/)
    expect(rule('.rs-head')).toMatch(/padding:\s*0 0 0 3%/)
  })
  it('goes back to being a centred heading above the list on a phone', () => {
    expect(phone).toMatch(/\.rs \{\s*display:\s*block/)
    expect(phone).toMatch(/\.rs-head \{[^}]*text-align:\s*center/)
    expect(phone).toMatch(/\.rs-head \{[^}]*width:\s*auto/)
    expect(phone).toMatch(/\.rs-head h1 \{[^}]*font-size:\s*2rem/)
  })
})

describe('the Drafting Desk keeps its heading above the picture', () => {
  const desk = (sel) => (css.match(new RegExp("\\.rs\\[data-room='drafting-desk'\\]" + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')) || [0, ''])[1]
  it('because its desk runs edge to edge, so there is no empty corner to put it in', () => {
    expect(desk('')).toMatch(/--rs-above:\s*276px/)
    expect(desk('')).toMatch(/--rs-stage-w:\s*min\(var\(--rs-max, 1440px\), max\(560px,/)
    expect(desk(' .rs-head')).toMatch(/text-align:\s*center/)
    expect(desk(' .rs-head')).toMatch(/width:\s*auto/)
    expect(desk(' .rs-stage')).toMatch(/grid-area:\s*3 \/ 1/) // the Home link, then the heading, then the desk
  })
  it('and the other rooms still put it on the picture', () => {
    expect(rule('.rs-head')).toMatch(/grid-area:\s*2 \/ 1/)
    expect(rule('.rs-stage')).toMatch(/grid-area:\s*2 \/ 1/)
  })
})

