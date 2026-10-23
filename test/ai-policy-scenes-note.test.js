// @vitest-environment node
// The AI policy's first section says what is never made with AI; the second says where Claude does help, including the line-drawn scenes that frame the shop. Both are true, but a visitor
// could read them as clashing, so section 1 now ends with a short pointer to section 2 (a reader's suggestion, 21 October 2026). These tests keep the two sections in step.
import { describe, it, expect } from 'vitest'
import { DRAFT } from './legalState'
import { LEGAL_PAGES } from '../src/data/legalPages'

const policy = () => LEGAL_PAGES.find((p) => p.slug === 'ai-policy')
const sections = () => policy().sections
const first = () => sections()[0]
const second = () => sections()[1]
const NOTE = 'The line-drawn scenes that frame the shop, such as the Art Loft, are not on this list. Claude helps me draw those, and the next section, "Where I do use AI", says how. The artwork, photographs and writing above are never made that way.'
const SCENES = 'line-drawn scenes that frame the shop, such as the Art Loft'

describe('section 1 points to section 2 about the scenes', () => {
  it('ends with the short note, after the list of what is always made by hand', () => {
    expect(first().title).toBe('What is always made by me')
    const p = first().paragraphs
    expect(p.at(-1)).toBe(NOTE)
    expect(p.at(-2)).toMatch(/^\* every original artwork/)
  })
  it('names the next section exactly, and that really is the next section', () => {
    expect(NOTE).toContain(`"${second().title}"`)
    expect(second().title).toBe('Where I do use AI')
    expect(sections().indexOf(second())).toBe(sections().indexOf(first()) + 1)
  })
  it('says it in the same words section 2 uses, and section 2 really does list the scenes', () => {
    expect(first().paragraphs.at(-1)).toContain(SCENES)
    expect(second().paragraphs.join('\n')).toContain(`Draws the ${SCENES}`)
    expect(second().paragraphs.join('\n')).toMatch(/\| Illustrations around the site \|/)
  })
  it('is honest about it: it says Claude helps with the scenes (it does not deny it), and that the artwork, photographs and writing are never made that way', () => {
    expect(NOTE).toMatch(/Claude helps me draw those/); expect(NOTE).not.toMatch(/no AI|never use AI|not AI/i)
    expect(NOTE).toMatch(/artwork, photographs and writing above are never made that way/)
  })
})

describe('the promise itself is untouched', () => {
  it('section 1 still says, first, that the work is hers from start to finish and no AI image generators or writing tools are used on it', () => {
    expect(first().paragraphs[0]).toBe("The following are my own work, from start to finish. I don't use AI image generators or AI writing tools to create them, or to change them:")
  })
  it('the list of what is always hers is unchanged: artwork and prints, photographs, stories and books', () => {
    const list = first().paragraphs[1]
    for (const piece of ['every original artwork, and every print sold in the Art Loft', 'my photographs', 'my stories, books and other creative writing']) expect(list, piece).toContain(piece)
  })
  it('section 3 still says the work she sells or publishes as hers is never made, finished or altered by AI', () => {
    const never = sections().find((s) => s.title === 'What I never use AI for').paragraphs.join('\n')
    expect(never).toMatch(/Making or changing the work I sell or publish as mine/); expect(never).toMatch(/never made, finished or altered by AI/)
  })
  it.runIf(DRAFT)('the page is still a draft with the date as its only gap', () => {
    expect(policy().ready).toBe(false); expect(policy().updated).toBe('[date]')
    const text = [policy().updated, ...policy().intro, ...sections().flatMap((s) => s.paragraphs)].join('\n').replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '')
    expect([...new Set(text.match(/\[[^\]\n]+\]/g))]).toEqual(['[date]'])
  })
})
