// "The Art Loft" heading was white on a near-white page on phones and small tablets (a contrast of 1.06 to 1; AA needs 3 to 1 for large text, 4.5 to 1 for normal text).
// The cause: below 821px the Post-it and the night sky are switched off, but the general rule that turns a hero heading white still reached the heading.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const postit = fs.readFileSync(path.resolve('src/rooms/postit.css'), 'utf8')
const site = fs.readFileSync(path.resolve('src/styles/site.css'), 'utf8')
const luminance = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
// is the character at this index inside a @media { ... } block?
const insideMedia = (css, at) => { let depth = 0; let media = []; for (let i = 0; i < at; i++) { if (css[i] === '{') { depth += 1; const head = css.slice(Math.max(0, css.lastIndexOf('}', i) + 1), i); media.push(/@media/.test(head)) } else if (css[i] === '}') { depth -= 1; media.pop() } } return media.some(Boolean) && depth > 0 }

describe('the Art Loft heading', () => {
  it('shows the problem as it was: the hero heading rule is white, and the page behind the heading on a phone is near-white (so the old result was 1.06 to 1)', () => {
    expect(site).toMatch(/\.sf-hero h1 \{[^}]*color: #fff;/); expect(contrast('#ffffff', '#f6f8fc')).toBeLessThan(1.1)
  })
  it('keeps its own dark ink at EVERY width: the rule is outside any media query, so it also applies on a phone and a small tablet', () => {
    const at = postit.indexOf('.rs-sky .al h1 { color: #0e1530; }'); expect(at, 'the rule is in postit.css').toBeGreaterThan(0); expect(insideMedia(postit, at)).toBe(false)
    expect(postit.indexOf('.rs-sky .al h1', at + 5)).toBe(-1) // only the one rule
  })
  it('beats the white rule (a more specific selector), changes nothing but the colour, and is the colour the wide-screen rule already uses', () => {
    expect('.rs-sky .al h1'.split(/\s+/).length).toBeGreaterThan('.sf-hero h1'.split(/\s+/).length - 1); expect(postit).toMatch(/\.rs-sky \.rs-frame h1 \{ color: #0e1530; font-weight: 700; \}/)
    const rule = postit.slice(postit.indexOf('.rs-sky .al h1'), postit.indexOf('}', postit.indexOf('.rs-sky .al h1')) + 1); expect(rule.replace(/\s+/g, ' ')).toBe('.rs-sky .al h1 { color: #0e1530; }')
  })
  it('passes AA for normal text (4.5 to 1), not just large text, against the page on a phone and the white panel on a computer', () => {
    for (const bg of ['#f6f8fc', '#f8f9ff', '#ffffff']) expect(contrast('#0e1530', bg), bg).toBeGreaterThanOrEqual(4.5)
  })
})
