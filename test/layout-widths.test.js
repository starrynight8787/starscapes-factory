// @vitest-environment node
// How the pages built at the Figma width (1200 pixels) sit on a laptop, a tablet and a phone. These rules were found by LOOKING at the pages in a real browser: the
// page column the whole site sits in is only 720 pixels wide, so the wide pages were squeezed into a narrow strip; narrow screens left each card only as wide as its
// words; the placeholder star was the same pale blue as its panel; and a tablet got a phone layout. Each is checked here so it cannot come back.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')
const css = { md: read('src/pages/markdown.css'), banner: read('src/components/pagebanner.css'), en: read('src/entries/entries.css'), sl: read('src/ledger/ledger.css'), lb: read('src/leadership/leadership.css'), yt: read('src/den/youtube.css'), hs: read('src/home/homeSections.css') }
// the text inside one @media block (the first one that starts with the given width)
const media = (text, width) => { const start = text.indexOf(`@media (max-width: ${width}px) {`); if (start < 0) return ''; let depth = 0, i = text.indexOf('{', start); const from = i; for (; i < text.length; i++) { if (text[i] === '{') depth++; if (text[i] === '}') { depth--; if (depth === 0) break } } return text.slice(from, i + 1) }

describe('the page column is wide enough for the pages that were drawn 1200 pixels wide', () => {
  it('lifts the 720 pixel limit for every page with a banner, the entry pages and the Story Ledger (1272 is 1232 plus the 20 pixels of padding each side)', () => {
    expect(css.banner).toMatch(/\.container:has\(> \.rp > \.pb\) \{\s*max-width: 1272px/)
    expect(css.en).toMatch(/\.container:has\(> \.rp\.en\) \{\s*max-width: 1272px/)
    expect(css.sl).toMatch(/\.container:has\(> \.rp\.sl\) \{\s*max-width: 1272px/)
  })
  it('matches the inner page widths it is meant to hold', () => {
    expect(css.banner).toMatch(/\.rp:has\(> \.pb\) \{\s*max-width: 1232px/); expect(css.en).toMatch(/\.rp\.en \{\s*max-width: 1232px/); expect(css.sl).toMatch(/\.rp\.sl \{\s*max-width: 1232px/)
    expect(read('src/index.css')).toMatch(/\.container \{\s*max-width: 720px/) // the ordinary page column, which these rules override only for these pages
  })
})

describe('the legal pages have room for their contents list and a table', () => {
  it('lift the page column to fit the legal page (960 plus the padding), but not the narrow accessibility statement', () => {
    expect(css.md).toMatch(/\.container:has\(> \.lg:not\(\.lg--narrow\)\) \{\s*max-width: 1000px/)
    expect(read('src/pages/systempages.css')).toMatch(/\.lg \{\s*max-width: 960px/); expect(read('src/pages/systempages.css')).toMatch(/\.lg--narrow \{\s*max-width: 720px/)
  })
})

describe('on a tablet or a phone every box stretches across the page', () => {
  it('the Leadership Blog and the entry pages stop lining their boxes up at the top, which left each only as wide as its words', () => {
    expect(media(css.lb, 960)).toMatch(/\.lb__cols \{[^}]*flex-direction: column;[^}]*align-items: stretch/)
    expect(media(css.en, 960)).toMatch(/\.en__cols \{[^}]*flex-direction: column;[^}]*align-items: stretch/)
  })
})

describe('the placeholder picture is never invisible', () => {
  it('uses a star darker than the pale panel behind it (the panel is #DCE6FF)', () => {
    for (const f of ['src/home/HomeSections.jsx', 'src/entries/EntryPage.jsx', 'src/leadership/LeadershipBlogPage.jsx']) { const src = read(f); expect(src, f).toMatch(/<StarMark width=\{72\} color="#8AA2DA" \/>/); expect(src, f).not.toMatch(/StarMark[^>]*color="#DCE6FF"/i) }
  })
  it('puts the Story Ledger\u2019s star in the middle of its picture panel, whatever order the rules come in', () => {
    expect(css.sl).toMatch(/\.sl__video\.sl__img--empty \{\s*display: grid;[^}]*place-items: center/)
  })
})

describe('a tablet gets its own layout, not a stretched phone', () => {
  it('Home keeps Next event beside Membership, and the featured room and latest post in two columns, down to 721 pixels', () => {
    const tablet = media(css.hs, 960), phone = media(css.hs, 720)
    expect(tablet).toMatch(/\.hs__top \{[^}]*grid-template-columns: 1fr 1fr/); expect(tablet).toMatch(/\.hs__room \{[^}]*grid-template-columns: 280px 1fr/); expect(tablet).toMatch(/\.hs__post \{[^}]*grid-template-columns: 320px 1fr/)
    expect(phone).toMatch(/\.hs__top,\s*\.hs__room,\s*\.hs__post \{\s*grid-template-columns: 1fr/); expect(phone).toMatch(/\.hs__buttons \.pg-btn \{\s*width: 100%/)
    expect(tablet).not.toMatch(/\.hs__buttons \.pg-btn \{\s*width: 100%/) // buttons stay their own size on a tablet
  })
  it('YouTube and the entry pages show two videos or entries to a row on a tablet, and one on a phone', () => {
    expect(media(css.yt, 960)).toMatch(/\.yt__grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/); expect(media(css.yt, 700)).toMatch(/\.yt__grid \{\s*grid-template-columns: 1fr/)
    expect(media(css.en, 960)).toMatch(/\.en__grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/); expect(media(css.en, 720)).toMatch(/\.en__grid \{\s*grid-template-columns: 1fr/)
  })
  it('the Leadership Blog keeps its three \"More ways in\" boxes in a row on a tablet, and stacks them only on a phone', () => {
    expect(media(css.lb, 960)).not.toMatch(/\.lb__boxes/); expect(media(css.lb, 720)).toMatch(/\.lb__boxes \{\s*grid-template-columns: 1fr/)
  })
  it('the Story Ledger keeps its boxes side by side on a tablet (rows, the Mosaic at 24 across) and stacks them, with the Mosaic 16 across, only on a phone', () => {
    const tablet = media(css.sl, 960), phone = media(css.sl, 720)
    expect(tablet).not.toMatch(/\.sl__row--wide/); expect(tablet).not.toMatch(/\.sl__mosaic/)
    expect(phone).toMatch(/\.sl__row--wide,\s*\.sl__row--even \{\s*grid-template-columns: minmax\(0, 1fr\)/); expect(phone).toMatch(/\.sl__mosaic \{\s*grid-template-columns: repeat\(16, minmax\(0, 1fr\)\)/)
  })
})
