// @vitest-environment node
// The menu's Subscribe button, and the look of the account pages.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')

describe('the menu\u2019s Subscribe button', () => {
  const nav = read('src/components/Navbar.jsx')
  it('goes to the passes page once memberships are open, and to ordinary sign-up until then (both the wide menu and the phone menu)', () => {
    const links = [...nav.matchAll(/<Link to=\{MEMBERSHIP\.open \? '\/membership' : '\/signup'\} className=\"([^\"]+)\"[^>]*>\s*Subscribe/g)]
    expect(links.map((m) => m[1])).toEqual(['sf-cta', 'sf-btn sf-btn--solid'])
    expect(nav).toMatch(/import \{ MEMBERSHIP \} from '\.\.\/data\/membership'/)
    expect(nav).not.toMatch(/<Link to=\"\/signup\"[^>]*>\s*Subscribe/)
  })
})

describe('the account pages\u2019 look', () => {
  const css = read('src/membership/membership.css')
  it('fills in the box of an open pass on My passes (there is no real checkbox there to do it)', () => {
    expect(css).toMatch(/\.mb__pass--static\.is-on \.mb__box \{\s*background: var\(--sf-blue/)
  })
  it('has no text under 14px, still', () => {
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('keeps the account buttons at least 44 pixels tall and shows where the keyboard is on them', () => {
    expect(css).toMatch(/\.mb__wbtn \{[^}]*min-height: 44px/); expect(css).toMatch(/\.mb__wbtn:focus-visible \{\s*outline: 3px solid/)
  })
})

describe('the account pages\u2019 routes', () => {
  const app = read('src/App.jsx')
  it('are for signed-in people only', () => {
    expect(app).toMatch(/path=\"\/membership\/passes\" element=\{ <ProtectedRoute session=\{session\}> <MyPassesPage owner=\{owner\} \/> <\/ProtectedRoute> \}/)
    expect(app).toMatch(/path=\"\/membership\/change\" element=\{ <ProtectedRoute session=\{session\}> <ChangePassesPage owner=\{owner\} \/> <\/ProtectedRoute> \}/)
  })
})
