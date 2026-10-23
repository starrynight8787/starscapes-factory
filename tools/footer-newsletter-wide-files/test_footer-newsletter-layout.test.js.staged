// @vitest-environment node
// The footer's sign-up box (Gill, 23 October 2026: "that newsletter component on the footer on desktop is big"). On a computer-sized screen it now stretches across the footer in two columns (the words on the left,
// the form on the right) instead of sitting narrow and tall; phones and tablets keep the single column. Only the look changed: the words, and the ORDER in the page (email, then the tick box, then the button), are
// the same, so a keyboard user is taken round it in the same order as what they see (nothing is reordered with CSS).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/newsletter/newsletter.css', 'utf8')
const jsx = readFileSync('src/newsletter/NewsletterSignup.jsx', 'utf8')
const at = css.indexOf('@media (min-width: 900px)')
const wide = at === -1 ? '' : css.slice(at)
const rule = (block, selector) => { const m = block.match(new RegExp('(?:^|\\n)\\s*' + selector.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}')); return m ? m[1] : '' }

describe('the footer sign-up box on a computer-sized screen', () => {
  it('only changes from 900 pixels wide: phones and tablets keep the single column, with the old width limit', () => {
    expect(at, 'a 900 pixel rule exists').toBeGreaterThan(-1)
    expect(css.slice(0, at)).toMatch(/\.nl-signup \{[^}]*max-width: 560px/)
    expect(css.slice(0, at)).not.toMatch(/\.nl-signup \{[^}]*grid-template-columns/)
  })
  it('stretches across the footer (no width limit) and sits in two columns', () => {
    const box = rule(wide, '.nl-signup'); expect(box).toMatch(/max-width:\s*none/); expect(box).toMatch(/display:\s*grid/); expect(box).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1\.1fr\)/)
  })
  it('puts the title and the two paragraphs in the first column and the form in the second', () => {
    expect(rule(wide, '.nl-signup__title, .nl-signup__text')).toMatch(/grid-column:\s*1\b/); expect(rule(wide, '.nl-signup__form')).toMatch(/grid-column:\s*2\b/)
  })
  it('lets the "thank you" message use the whole width', () => {
    expect(rule(wide, '.nl-signup__done')).toMatch(/grid-column:\s*1\s*\/\s*-1/)
  })
  it('does not reorder anything with CSS: no order property, so the screen order is the page order', () => {
    expect(css).not.toMatch(/(^|[\s;{])order\s*:/m)
  })
  it('keeps the page order the same: email address, then the tick box, then the button', () => {
    const email = jsx.indexOf('id="nl-email"'); const tick = jsx.indexOf('id="nl-consent"'); const button = jsx.indexOf('type="submit"')
    expect(email).toBeGreaterThan(-1); expect(tick).toBeGreaterThan(email); expect(button).toBeGreaterThan(tick)
  })
})
