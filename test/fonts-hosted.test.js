// @vitest-environment node
// The site's fonts are kept on the site (SFW-246): nothing is fetched from Google, so loading a page tells no other company about the visit.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const walk = (dir) => readdirSync(join(root, dir)).flatMap((n) => { const rel = `${dir}/${n}`; return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel] })
const fontsCss = read('src/styles/fonts.css')
// each @font-face rule: { family, weight, file, range }
const faces = [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => ({
  family: (m[1].match(/font-family:\s*'([^']+)'/) || [])[1], weight: Number((m[1].match(/font-weight:\s*(\d+)/) || [])[1]), display: (m[1].match(/font-display:\s*(\w+)/) || [])[1],
  src: (m[1].match(/src:\s*([^;]+);/) || [])[1], range: (m[1].match(/unicode-range:\s*([^;]+);/) || [])[1], style: (m[1].match(/font-style:\s*(\w+)/) || [])[1],
}))
// exactly what the site asked Google for before: these typefaces, in these weights
const WANTED = { Caveat: [400, 700], Inter: [400, 500, 600], 'Josefin Sans': [300, 400, 500, 600, 700], Sacramento: [400], Schoolbell: [400] }
const PACKAGE = { Caveat: 'caveat', Inter: 'inter', 'Josefin Sans': 'josefin-sans', Sacramento: 'sacramento', Schoolbell: 'schoolbell' }

describe('nothing is fetched from Google or anyone else', () => {
  it('the site\u2019s styles, code and page hold no address of Google\u2019s font services', () => {
    const files = [...walk('src'), 'index.html'].filter((f) => /\.(css|jsx?|html)$/.test(f))
    expect(files.filter((f) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(read(f)))).toEqual([])
  })
  it('the first line of site.css brings in the site\u2019s own font file, not an outside address', () => {
    expect(read('src/styles/site.css').split('\n')[0]).toBe("@import url('./fonts.css');")
  })
  it('every font file is an address on this site (/fonts/...), never http or https', () => {
    expect(faces.length).toBeGreaterThan(0)
    for (const f of faces) { expect(f.src, f.family).toMatch(/^url\('\/fonts\/[a-z-]+-(latin|latin-ext)-\d+-normal\.woff2'\) format\('woff2'\)$/); expect(f.src).not.toMatch(/https?:/) }
  })
})

describe('the same typefaces and weights as before, so the site looks the same', () => {
  it('has every typeface and weight the Google line asked for, and nothing else', () => {
    const have = {}; for (const f of faces) (have[f.family] ||= new Set()).add(f.weight)
    expect(Object.fromEntries(Object.entries(have).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]))).toEqual(WANTED)
  })
  it('gives each weight the plain letters (latin) and, where the typeface has them, the extended ones (latin-ext), each with the characters it covers', () => {
    for (const [family, weights] of Object.entries(WANTED)) for (const w of weights) {
      const mine = faces.filter((f) => f.family === family && f.weight === w); const subsets = mine.map((f) => f.src.match(/-(latin-ext|latin)-\d+-normal/)[1]).sort()
      expect(subsets, `${family} ${w}`).toEqual(family === 'Schoolbell' ? ['latin'] : ['latin', 'latin-ext'])
      for (const f of mine) expect(f.range, `${family} ${w}`).toMatch(/^U\+[0-9A-F]/)
    }
  })
  it('shows text at once in another font while a font loads (font-display: swap), and has no italics that were never asked for', () => {
    for (const f of faces) { expect(f.display, f.family).toBe('swap'); expect(f.style).toBe('normal') }
  })
  it('names the typefaces the way the site\u2019s styles do, so the browser finds them', () => {
    const css = read('src/styles/site.css')
    for (const name of ['Josefin Sans', 'Inter', 'Sacramento', 'Caveat', 'Schoolbell']) expect(css, name).toContain(`'${name}'`)
  })
})

describe('the font files are really there, and are what they say', () => {
  const files = faces.map((f) => f.src.match(/\/fonts\/([a-z0-9-]+\.woff2)/)[1])
  it('every file the styles name exists in public/fonts, and no file is left over that nothing uses', () => {
    for (const f of files) expect(existsSync(join(root, 'public/fonts', f)), f).toBe(true)
    expect(readdirSync(join(root, 'public/fonts')).filter((n) => n.endsWith('.woff2')).sort()).toEqual([...new Set(files)].sort())
  })
  it('each is a real WOFF2 font file (it starts with wOF2), not a page or an empty file', () => {
    for (const f of files) { const bytes = readFileSync(join(root, 'public/fonts', f)); expect(bytes.subarray(0, 4).toString('ascii'), f).toBe('wOF2'); expect(bytes.length, f).toBeGreaterThan(2000) }
  })
  it('each is small, so a page stays light (none over 70 KB, and the whole set under 600 KB)', () => {
    const sizes = files.map((f) => statSync(join(root, 'public/fonts', f)).size); expect(Math.max(...sizes)).toBeLessThan(70 * 1024); expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThan(600 * 1024)
  })
  it('each typeface comes with its licence (they are open fonts, free to host, if the licence travels with them)', () => {
    for (const [family, pkg] of Object.entries(PACKAGE)) { const lic = join(root, 'public/fonts/licenses', `${pkg}-LICENSE.txt`); expect(existsSync(lic), family).toBe(true); expect(readFileSync(lic, 'utf8'), family).toMatch(/SIL OPEN FONT LICENSE|Apache License/i) }
  })
})

describe('browsers keep the font files', () => {
  const config = JSON.parse(read('vercel.json'))
  it('tells browsers to keep each font file for a year, because a font file never changes (a new version would get a new file name)', () => {
    const rule = (config.headers || []).find((h) => h.source === '/fonts/(.*)'); expect(rule, 'a header rule for /fonts/').toBeTruthy()
    const cache = rule.headers.find((h) => h.key === 'Cache-Control'); expect(cache.value).toMatch(/max-age=31536000/); expect(cache.value).toMatch(/immutable/); expect(cache.value).toMatch(/^public/)
  })
  it('leaves the rest of the configuration as it was: the daily jobs and the rewrite that sends every page except the API to the site', () => {
    expect(config.crons.map((c) => c.path)).toEqual(['/api/membership-checkout?reminders=1', '/api/ebook-signup?newsletter=tidy']); expect(config.rewrites).toEqual([{ source: '/((?!api/.*).*)', destination: '/index.html' }])
  })
})

describe('the policies say so', () => {
  it('the Cookie policy and the Privacy policy no longer name Google Fonts, and say the lettering is kept on our own server', () => {
    const legal = read('src/data/legalPages.js'); expect(legal).not.toMatch(/\*\*Google Fonts\.\*\*/); expect(legal).not.toMatch(/fonts from Google/); expect(legal).not.toMatch(/block fonts or videos/)
    expect(legal).toContain('Our own lettering is kept on our own server'); expect(legal).toContain('Our fonts are kept on our own server')
  })
})
