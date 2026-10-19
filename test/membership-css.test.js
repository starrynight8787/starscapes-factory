// @vitest-environment node
// The look of "Choose your passes" (src/membership/membership.css): the rules that keep it readable and usable.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const css = fs.readFileSync(path.resolve('src/membership/membership.css'), 'utf8')
const page = fs.readFileSync(path.resolve('src/membership/MembershipPage.jsx'), 'utf8')

describe('the page column and layout', () => {
  it('lets the hero band run the full width of the window, as drawn (the ordinary page column is only 720 pixels wide)', () => {
    expect(css).toMatch(/\.container:has\(> \.mb\) \{\s*max-width: none;[^}]*padding: 0;\s*margin: 0;/)
  })
  it('puts the passes and the price side by side on a computer (600 and 342 pixels, as in the design), and one under the other on a tablet or phone', () => {
    expect(css).toMatch(/\.mb__body \{[^}]*grid-template-columns: minmax\(0, 600px\) minmax\(0, 342px\)/)
    expect(css).toMatch(/@media \(max-width: 900px\) \{\s*\.mb__body \{\s*grid-template-columns: minmax\(0, 640px\)/)
  })
})

describe('reading and using it', () => {
  it('has no text under 14px', () => {
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('shows where the keyboard is on the tick boxes and the buttons', () => {
    expect(css).toMatch(/\.mb__check:focus-visible \+ \.mb__box \{\s*outline: 3px solid/)
    expect(css).toMatch(/\.mb__bill:focus-visible,\s*\.mb__go:focus-visible \{\s*outline: 3px solid/)
  })
  it('hides the real tick boxes only visually (they stay in the page for the keyboard and screen readers)', () => {
    expect(css).toMatch(/\.mb__check \{\s*position: absolute;\s*width: 1px;\s*height: 1px;[^}]*opacity: 0/)
    expect(css).not.toMatch(/\.mb__check \{[^}]*display: none/)
    expect(css).not.toMatch(/\.mb__check \{[^}]*visibility: hidden/)
  })
  it('makes a greyed-out "Continue to payment" look greyed out and refuse clicks', () => {
    expect(css).toMatch(/\.mb__go:disabled \{\s*opacity: 0\.55;\s*cursor: not-allowed/)
  })
  it('keeps every button and field at least 44 pixels tall', () => {
    expect(css).toMatch(/\.mb__go \{[^}]*min-height: 44px/); expect(css).toMatch(/\.mb__field \{[^}]*min-height: 44px/)
  })
  it('keeps the room pictures on a phone, as in the phone design', () => {
    expect(css).not.toMatch(/\.mb__pass \.sf-room-icon \{\s*display: none/)
  })
})

describe('the page file itself', () => {
  it('uses no inline styles', () => {
    expect(page).not.toMatch(/style=\{/)
  })
})
