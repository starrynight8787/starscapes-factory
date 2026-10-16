import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const css = readFileSync(join(process.cwd(), "src/factoryfloor/factoryfloor.css"), "utf8")
const rule = (selector) => { const i = css.indexOf(selector + " {"); if (i < 0) return ""; return css.slice(i, css.indexOf("}", i)) }

describe("Factory Floor: the plaques under the two big objects", () => {
  it("have dark writing that the page-wide white link colour cannot override", () => {
    expect(css).toMatch(/\.ff \.ff-obj \{\s*color: var\(--sf-navy-900/)
    expect(rule(".ff-obj__name")).toMatch(/color: var\(--sf-navy-900/)
  })
  it("still show the name in Schoolbell", () => {
    expect(rule(".ff-obj__name")).toMatch(/Schoolbell/)
  })
})

describe("Factory Floor: post-it notes", () => {
  it("are written in Schoolbell, with no fake bold", () => {
    expect(rule(".ff-note")).toMatch(/--sf-school/)
    expect(rule(".ff-note__title")).toMatch(/font-weight: 400/)
  })
  it("keep dark writing on every colour of note", () => {
    expect(css).toMatch(/\.ff \.ff-note \{\s*color: var\(--sf-navy-700/)
  })
  it("give a title four lines in the small lists and five in the big ones", () => {
    expect(rule(".ff-note__title")).toMatch(/-webkit-line-clamp: 5/)
    expect(rule(".ff-latest--all .ff-note__title")).toMatch(/-webkit-line-clamp: 4/)
  })
})

describe("Factory Floor: the page title is left as it was", () => {
  it("keeps the heading font on the title and the script on the tagline", () => {
    expect(rule(".ff h1")).toMatch(/--sf-head/)
    expect(rule(".ff-tagline")).toMatch(/--sf-written/)
  })
})

describe("Factory Floor: a pale backdrop, matching the other rooms", () => {
  it("washes the blueprint photo with one tunable number, kept pale", () => {
    const m = css.match(/--ff-wash:\s*([0-9.]+)/)
    expect(m).not.toBeNull()
    expect(Number(m[1])).toBeGreaterThanOrEqual(0.7)
    expect(Number(m[1])).toBeLessThanOrEqual(0.95)
    expect(rule(".ff")).toMatch(/rgba\(246, 248, 252, var\(--ff-wash\)\)/)
    expect(rule(".ff")).toMatch(/factory-floor-bg\.jpg/)
  })
  it("writes in navy on the page, not white", () => {
    expect(rule(".ff")).toMatch(/color: var\(--sf-navy-700/)
    for (const sel of [".ff h1", ".ff-tagline", ".ff-back a", ".ff-latest__title"]) expect(rule(sel)).not.toMatch(/color: #fff/)
    expect(rule(".ff-tagline")).toMatch(/color: var\(--sf-navy-700/)
  })
  it("has no white writing, white focus rings or dark glow left, except the New badge", () => {
    const rules = css.split("}").filter((r) => /color: #fff|color: var\(--sf-star|outline: 3px solid #fff|text-shadow/.test(r))
    expect(rules.length).toBe(1)
    expect(rules[0]).toMatch(/\.ff-new/)
  })
  it("the title, tagline and plaques keep their fonts", () => {
    expect(rule(".ff h1")).toMatch(/--sf-head/)
    expect(rule(".ff-tagline")).toMatch(/--sf-written/)
    expect(rule(".ff-obj__name")).toMatch(/Schoolbell/)
  })
  it("shows the tape and the focus rings on a pale page", () => {
    expect(rule(".ff-note::before")).toMatch(/rgba\(176, 192, 226/)
    expect(css).toMatch(/\.ff-note:focus-visible \{\s*outline: 3px solid var\(--sf-navy-700/)
    expect(css).toMatch(/\.ff-obj:focus-visible \{\s*outline: 3px solid var\(--sf-navy-700/)
  })
})

describe("Factory Floor: the section label on each note", () => {
  it("is bold capitals at full strength, so The Factory Floor and Blueprints notes can be told apart", () => {
    const r = (css.match(/^\.ff-note__kind \{[^}]*\}/m) || [""])[0]
    expect(r).toMatch(/font-weight: 700/)
    expect(r).toMatch(/text-transform: uppercase/)
    expect(r).toMatch(/font-family: var\(--sf-body/)
    expect(r).not.toMatch(/opacity/)
    expect(r).toMatch(/font-size: 0\.875rem/)
  })
})

