// @vitest-environment node
// The site's contact address lives in ONE place (src/data/contact.js). This fails if it is ever written out by hand anywhere else,
// or if the old address is left anywhere in the code, the server files, the database files or the public folder.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CONTACT_EMAIL } from '../src/data/contact'
import { ENQUIRY_EMAIL } from '../src/artloft/originals'

const TEXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.html', '.css', '.svg', '.md', '.txt', '.sql'])
function files(entry) {
  const full = path.resolve(entry)
  if (!fs.existsSync(full)) return []
  if (fs.statSync(full).isFile()) return [full]
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(entry, e.name)) : TEXT.has(path.extname(e.name)) && !e.name.includes('.before-') ? [path.join(full, e.name)] : []))
}
const everywhere = ['src', 'api', 'lib', 'public', 'index.html', 'sql', 'scripts'].flatMap(files)
const where = (needle, except = []) => everywhere.filter((f) => fs.readFileSync(f, 'utf8').includes(needle) && !except.some((e) => f.endsWith(e))).map((f) => path.relative(process.cwd(), f))

describe('the contact address', () => {
  it('is imagine@starscapesfactory.com', () => {
    expect(CONTACT_EMAIL).toBe('imagine@starscapesfactory.com')
  })
  it('is the one the originals page uses for its enquiry button, not a second copy', () => {
    expect(ENQUIRY_EMAIL).toBe(CONTACT_EMAIL)
    expect(fs.readFileSync(path.resolve('src/artloft/originals.js'), 'utf8')).toMatch(/ENQUIRY_EMAIL = CONTACT_EMAIL/)
  })
  it('is written out by hand in the contact file only', () => {
    expect(where('@starscapesfactory.com', ['src/data/contact.js'])).toEqual([])
  })
  it('has left the old address nowhere in the code, server, database files or public folder', () => {
    expect(where('inspire@')).toEqual([])
  })
})

// The words on the pages are written with a placeholder and filled in from the contact file, so the pages must actually show the address,
// and the placeholder must never be seen. (Added when the hand-written copies in the legal pages, the delivery page and the calendar file were removed.)
import { LEGAL_PAGES } from '../src/data/legalPages'
import { staticPages } from '../src/data/staticPages'
import { makeIcs } from '../src/home/homeRules'

describe('the pages show the contact address from the contact file', () => {
  const words = (page) => [page.updated, ...(page.intro || []), ...(page.sections || []).flatMap((s) => [s.title, ...s.paragraphs])].filter((t) => typeof t === 'string').join('\n')
  it('every legal page that offers an email address shows the real one, as plain text and as a mailto link, and none shows the placeholder', () => {
    const withEmail = LEGAL_PAGES.filter((p) => words(p).includes(CONTACT_EMAIL))
    expect(withEmail.map((p) => p.slug).sort()).toEqual(['ai-policy', 'privacy', 'returns', 'terms'])
    for (const page of LEGAL_PAGES) {
      expect(words(page), page.slug).not.toMatch(/\{\{|\}\}/)
      if (withEmail.includes(page)) expect(words(page), page.slug).toContain(`(mailto:${CONTACT_EMAIL})`)
    }
  })
  it('the delivery page shows it too, as a link', () => {
    const delivery = staticPages.find((p) => p.slug === 'delivery')
    expect(delivery.content).toContain(`[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`); expect(delivery.content).not.toMatch(/\$\{|\{\{/)
  })
  it('the calendar file still gives each event an id ending in the site domain, taken from the same constant', () => {
    const ics = makeIcs({ id: 'abc-1', title: 'T', starts_at: '2026-12-05T19:00:00Z' }, { siteUrl: 'https://example.com', now: new Date('2026-10-01T00:00:00Z') })
    expect(ics).toContain(`UID:abc-1@${CONTACT_EMAIL.split('@')[1]}`)
  })
  it('written out in a page once more by hand, the first test above would catch it (the legal pages file has no copy of the address)', () => {
    expect(fs.readFileSync(path.resolve('src/data/legalPages.js'), 'utf8')).not.toContain('@starscapesfactory.com')
  })
})
