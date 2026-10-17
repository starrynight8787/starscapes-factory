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
