// @vitest-environment node
// The old blanket rules (for nav, button, input, textarea and form) must not come back, and no page may rely on them unless it is marked "legacy".
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const jsx = walk('src').filter((f) => f.endsWith('.jsx')).map((f) => f.split(path.sep).join('/'))

// The pages that STILL rely on the old rules: each one's outer element carries the class "legacy". (The art-loft tools are all inside the two admin pages.)
// Each is listed by the CLASSES its outer element must have, in any order and alongside any others (a redesign may add classes such as ad--wide without un-marking the page).
const LEGACY_ROOTS = {
  'src/cart/CartPage.jsx': ['cart', 'legacy'],
  'src/artloft/AdminPrints.jsx': ['al', 'al-admin', 'legacy'],
  'src/artloft/AdminOriginals.jsx': ['al', 'al-admin', 'legacy'],
  'src/pages/ProductGallery.jsx': ['legacy'],
  'src/pages/ProductPage.jsx': ['legacy'],
  'src/factoryfloor/PostFilter.jsx': ['ff-filter', 'legacy'],
}
// Does any className in this source carry all of these classes?
const hasClasses = (source, classes) => [...source.matchAll(/className="([^"]*)"/g)].some((m) => classes.every((c) => m[1].split(/\s+/).includes(c)))
const INSIDE_ADMIN_PRINTS = ['src/artloft/DeliveryTools.jsx', 'src/artloft/DescriptionEditor.jsx', 'src/artloft/OrdersPanel.jsx', 'src/artloft/SyncPlan.jsx']
// Files with a bare checkbox, radio or hidden box that the browser or a class on its label draws, so they need none of the old rules
const BARE_INPUT_ONLY = {
  'src/admin/AdminBooks.jsx': 'the genre tick boxes',
  'src/admin/AdminSuggestions.jsx': 'the on/off switch',
  'src/components/FormMessages.jsx': 'the tick box, drawn by .sf-check',
  'src/ebook/FreeEbookPage.jsx': 'the hidden box for robots',
  'src/explorers/RequestForm.jsx': 'the hidden box for robots',
  'src/pages/EditPost.jsx': 'the pin switch, drawn by pinswitch.css',
  'src/suggest/SuggestPanel.jsx': 'the choice of kind, inside its chip',
}

function bare(source) {
  const found = {}
  for (const tag of ['button', 'input', 'textarea', 'select', 'form']) {
    for (const m of source.matchAll(new RegExp(`<${tag}(\\s[^>]*?)?(/?)>`, 'gs'))) {
      const attrs = m[1] || ''
      if (attrs.includes('className') || attrs.includes('{...p}')) continue
      found[tag] = (found[tag] || 0) + 1
    }
  }
  return found
}

describe('the shared stylesheet', () => {
  const index = read('src/index.css')
  it('no longer has blanket rules for nav, button, input, textarea or form', () => {
    const selectors = [...index.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}@]+)\{/g)].flatMap((m) => m[2].split(',').map((s) => s.trim()))
    for (const bad of ['nav', 'nav a', 'nav a:hover', 'button', 'button:hover', 'input', 'textarea', 'form']) expect(selectors, bad).not.toContain(bad)
  })
  it('keeps the few rules the whole site really shares', () => {
    expect(index).toMatch(/\* \{\s*box-sizing: border-box/)
    expect(index).toMatch(/body \{\s*margin: 0/)
    expect(index).toMatch(/\.container \{\s*max-width: 720px/)
  })
})

describe('the legacy stylesheet', () => {
  const legacy = read('src/styles/legacy.css')
  it('applies only inside a page marked "legacy", and at no extra priority (so a class of its own always wins, as before)', () => {
    const selectors = [...legacy.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}@]+)\{/g)].flatMap((m) => m[2].split(',').map((s) => s.trim()))
    expect(selectors.length).toBeGreaterThanOrEqual(5)
    for (const s of selectors) expect(s, s).toMatch(/^:where\(\.legacy\) (button|input|textarea|form)/)
  })
  it('is loaded after the shared stylesheet', () => {
    const main = read('src/main.jsx')
    expect(main.indexOf("import './index.css'")).toBeGreaterThan(-1)
    expect(main.indexOf("import './styles/legacy.css'")).toBeGreaterThan(main.indexOf("import './index.css'"))
  })
})

describe('every page that has a bare button, field or form', () => {
  const withBare = jsx.map((f) => [f, bare(read(f))]).filter(([, b]) => Object.keys(b).length > 0)
  it('is one of the known few, and nothing new has crept in', () => {
    const known = new Set([...Object.keys(LEGACY_ROOTS), ...INSIDE_ADMIN_PRINTS, ...Object.keys(BARE_INPUT_ONLY)])
    for (const [f, b] of withBare) expect(known.has(f), `${f} has a bare ${Object.keys(b).join(', ')}: give it a class of its own (see src/styles/pages.css and forms.css)`).toBe(true)
  })
  it('is marked "legacy" if it relies on the old rules', () => {
    for (const [file, classes] of Object.entries(LEGACY_ROOTS)) expect(hasClasses(read(file), classes), `${file} needs an element with the classes: ${classes.join(' ')}`).toBe(true)
    const admin = read('src/artloft/AdminPrints.jsx')
    for (const f of INSIDE_ADMIN_PRINTS) expect(admin, f).toContain(`<${path.basename(f, '.jsx')}`)
  })
  it('knows what "marked legacy" means: it finds the classes in any order, with others beside them, and does not mistake a look-alike class', () => {
    expect(hasClasses('<main className="al al-admin legacy ad--wide al-v2">', ['al', 'al-admin', 'legacy'])).toBe(true)
    expect(hasClasses('<main className="legacy al-admin al">', ['al', 'al-admin', 'legacy'])).toBe(true)
    expect(hasClasses('<main className="al al-admin">', ['al', 'al-admin', 'legacy'])).toBe(false)
    expect(hasClasses('<main className="al al-admin not-legacy">', ['al', 'al-admin', 'legacy'])).toBe(false)
    expect(hasClasses('<main className="al">x</main><p className="al-admin legacy">', ['al', 'al-admin', 'legacy'])).toBe(false)
  })
  it('has only a checkbox, radio or hidden box bare, where it is one of the exceptions', () => {
    for (const [f] of withBare.filter(([file]) => BARE_INPUT_ONLY[file])) expect(Object.keys(bare(read(f))), f).toEqual(['input'])
  })
})

describe('navigation lists', () => {
  it('every one has a class of its own, so none can pick up a stray box', () => {
    for (const f of jsx) for (const m of read(f).matchAll(/<nav(\s[^>]*?)?>/gs)) expect(m[1] || '', `${f}: a <nav> without a class`).toContain('className')
  })
  it('the footer\u2019s two lists still say "no box" for themselves', () => {
    expect(read('src/styles/site.css')).toMatch(/\.sf-footer nav \{[^}]*background:\s*transparent/s)
  })
})

describe('the seven restyled pages', () => {
  it('have no bare button, field or form at all (they are all drawn by forms.css and the shared field styles)', () => {
    for (const f of ['Login', 'Signup', 'ForgotPassword', 'ResetPassword', 'NewPost', 'NewProduct']) expect(bare(read(`src/pages/${f}.jsx`)), f).toEqual({})
    expect(Object.keys(bare(read('src/pages/EditPost.jsx')))).toEqual(['input']) // only the pin switch
  })
})
