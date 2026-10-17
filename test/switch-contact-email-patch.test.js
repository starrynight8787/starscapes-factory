// @vitest-environment node
// The script that makes the originals page use the single contact address, and reports any old address still lying about.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/switch-contact-email.py')
const FIX = path.resolve('test/fixtures/contact/originals.before.js')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ originals, extra = {}, contact = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contacttest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  put('src/artloft/originals.js', originals ?? fs.readFileSync(FIX, 'utf8'))
  if (contact) put('src/data/contact.js', "export const CONTACT_EMAIL = 'imagine@starscapesfactory.com'\n")
  for (const [rel, text] of Object.entries(extra)) put(rel, text)
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('making the originals page use the contact file', () => {
  it('replaces the page\u2019s own copy of the address with the contact file\u2019s, and nothing else', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    const after = read(dir, 'src/artloft/originals.js')
    expect(after).toContain("import { CONTACT_EMAIL } from '../data/contact'")
    expect(after).toContain('export const ENQUIRY_EMAIL = CONTACT_EMAIL')
    expect(after).not.toContain('inspire@')
    const before = fs.readFileSync(FIX, 'utf8')
    expect(after.replace(/import \{ CONTACT_EMAIL \}[^\n]*\n\n\/\/ The originals page uses[^\n]*\nexport const ENQUIRY_EMAIL = CONTACT_EMAIL\n/, "export const ENQUIRY_EMAIL = 'inspire@starscapesfactory.com'\n")).toBe(before)
  })
  it('keeps a copy of the file, ending .before-contact', () => {
    const dir = project()
    run(dir)
    expect(read(dir, 'src/artloft/originals.js.before-contact')).toBe(fs.readFileSync(FIX, 'utf8'))
  })
  it('is safe to run twice', () => {
    const dir = project()
    run(dir)
    const once = read(dir, 'src/artloft/originals.js')
    const again = run(dir)
    expect(again.code).toBe(0)
    expect(again.out).toContain('already done')
    expect(read(dir, 'src/artloft/originals.js')).toBe(once)
  })
})

describe('looking for the old address elsewhere', () => {
  it('lists each file that still has it, and how many times, without changing any of them', () => {
    const dir = project({ extra: { 'src/components/Footer.jsx': "<a>inspire@starscapesfactory.com</a> and inspire@starscapesfactory.com", 'public/about.html': 'write to inspire@starscapesfactory.com' } })
    const r = run(dir)
    expect(r.out).toMatch(/src[\\/]components[\\/]Footer\.jsx {2}\(2 times\)/)
    expect(r.out).toMatch(/public[\\/]about\.html {2}\(1 time\)/)
    expect(read(dir, 'src/components/Footer.jsx')).toContain('inspire@starscapesfactory.com')
  })
  it('says so when the old address is nowhere', () => {
    const r = run(project())
    expect(r.out).toMatch(/not left anywhere/)
  })
})

describe('when something is not as expected', () => {
  it('refuses to change a file whose copy of the address is not the one it expects, and still does the look', () => {
    const odd = fs.readFileSync(FIX, 'utf8').replace("'inspire@starscapesfactory.com'", "'inspire@starscapesfactory.com' // mine")
    const dir = project({ originals: odd })
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/NOT CHANGED/)
    expect(read(dir, 'src/artloft/originals.js')).toBe(odd)
    expect(r.out).toMatch(/originals\.js/)
  })
  it('tells you to unzip the contact email files first if the contact file is missing', () => {
    const dir = project({ contact: false })
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/Unzip the contact email zip first/)
    expect(read(dir, 'src/artloft/originals.js')).toBe(fs.readFileSync(FIX, 'utf8'))
  })
  it('says what is wrong if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contacttest-empty-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/project folder/)
  })
})
