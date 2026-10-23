// @vitest-environment node
// The Star Atlas wording in the privacy policy appears only once the atlas is live (SFW-186). The policy has to be public at opening, but must not describe data the site does not yet collect.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { ALL_LEGAL_PAGES, LEGAL_PAGES, STAR_ATLAS_LIVE, withAtlasSwitch } from '../src/data/legalPages'

const ATLAS_SECTION = 'Your Star Atlas and reading check-ins'
const ATLAS_WORDS = /atlas|stardust|check-in|year-one survey|country stamp|taste week/i
const priv = (pages) => pages.find((p) => p.slug === 'privacy')
const lines = (pages) => priv(pages).sections.flatMap((s) => s.paragraphs.flatMap((t) => t.split('\n')))
const tableRows = (pages) => priv(pages).sections.find((s) => s.title === 'What we collect and why').paragraphs[0].split('\n').filter((l) => l.startsWith('|')).slice(2)
const keepBullets = (pages) => priv(pages).sections.find((s) => s.title === 'How long we keep it').paragraphs[0].split('\n').filter((l) => l.startsWith('*'))
const off = () => withAtlasSwitch(ALL_LEGAL_PAGES, false)

describe('the full text keeps all the atlas wording, written and tested', () => {
  it('has the section (4 paragraphs), four table rows and one retention bullet about the atlas', () => {
    expect(priv(ALL_LEGAL_PAGES).sections.find((s) => s.title === ATLAS_SECTION).paragraphs).toHaveLength(4)
    expect(tableRows(ALL_LEGAL_PAGES).filter((r) => ATLAS_WORDS.test(r) || r.startsWith('| The country you choose'))).toHaveLength(4)
    expect(keepBullets(ALL_LEGAL_PAGES).filter((b) => ATLAS_WORDS.test(b))).toHaveLength(1)
  })
})

describe('while the atlas is NOT live, the page the site shows has none of it', () => {
  it('not a word: no atlas, stardust, check-in, survey, country stamp or taste week anywhere in the privacy policy', () => {
    expect(JSON.stringify(priv(off()))).not.toMatch(ATLAS_WORDS)
  })
  it('exactly one section, four table rows and one retention bullet are gone, and nothing else (every other line is the same)', () => {
    const full = priv(ALL_LEGAL_PAGES), shown = priv(off())
    expect([full.sections.length, shown.sections.length]).toEqual([15, 14])
    expect([tableRows(ALL_LEGAL_PAGES).length, tableRows(off()).length]).toEqual([15, 11])
    expect([keepBullets(ALL_LEGAL_PAGES).length, keepBullets(off()).length]).toEqual([11, 10])
    const expectedGone = new Set([...full.sections.find((s) => s.title === ATLAS_SECTION).paragraphs.flatMap((t) => t.split('\n')), ...tableRows(ALL_LEGAL_PAGES).filter((r) => ATLAS_WORDS.test(r) || r.startsWith('| The country you choose')), ...keepBullets(ALL_LEGAL_PAGES).filter((b) => ATLAS_WORDS.test(b))])
    const gone = lines(ALL_LEGAL_PAGES).filter((l) => !lines(off()).includes(l))
    expect(new Set(gone)).toEqual(expectedGone)
  })
  it('the other four pages are exactly as written', () => {
    for (const slug of ['terms', 'returns', 'ai-policy', 'cookies']) expect(off().find((p) => p.slug === slug)).toEqual(ALL_LEGAL_PAGES.find((p) => p.slug === slug))
  })
})

describe('once the atlas is live, all of it appears by itself', () => {
  it('switching it on returns the full text, untouched', () => { expect(withAtlasSwitch(ALL_LEGAL_PAGES, true)).toEqual(ALL_LEGAL_PAGES) })
})

describe('the site uses the switch', () => {
  it('the page the site shows is the full text put through the switch with the real flag', () => { expect(LEGAL_PAGES).toEqual(withAtlasSwitch(ALL_LEGAL_PAGES, STAR_ATLAS_LIVE)) })
  it('the site reads LEGAL_PAGES (the shown page), never the full text', () => {
    const s = fs.readFileSync('src/data/staticPages.js', 'utf8'); expect(s).toMatch(/import \{ LEGAL_PAGES \} from '\.\/legalPages'/); expect(s).not.toMatch(/ALL_LEGAL_PAGES/)
  })
})
