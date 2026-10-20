// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-small-fixes.py')
const FIX = path.resolve('test/fixtures/small-fixes')
const FILES = ['src/bookclub/bookRules.js', 'src/bookclub/bookApi.js', 'src/bookclub/BookClubPage.jsx', 'src/bookclub/bookclub.css', 'src/admin/AdminBooks.jsx', 'sql/books.sql']
const NEW = ['sql/books-about.sql', 'INSTALL-SMALL-FIXES.txt']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smallfixestest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  put('src/suggest/SuggestPanel.jsx', '// from the suggest box update\n')
  put('src/bookclub/bookClubData.js', '// from the Book Club update\n')
    put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('adding the Book Club description and the small fixes', () => {
  it('changes the six files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-small-fixes', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-small-fixes`)).toBe(before(rel))
  })
  it('is safe to run twice: the second time changes nothing', () => {
    const dir = project()
    run(dir)
    const once = FILES.map((rel) => read(dir, rel))
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    expect(r.out).toMatch(/Everything was already in place/)
    expect(FILES.map((rel) => read(dir, rel))).toEqual(once)
  })
  it('changes NOTHING if even one file is not the way it expects, and says which', () => {
    const odd = before('src/bookclub/bookRules.js').replace('export const LIMITS = { title: 150, author: 100, note: 300, theme: 120, goalMax: 999 }', 'export const LIMITS = { title: 150, author: 100, note: 300, theme: 120, goalMax: 999 } // changed by hand')
    expect(odd).not.toBe(before('src/bookclub/bookRules.js'))
    const dir = project({ change: { 'src/bookclub/bookRules.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/bookclub/bookRules.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-small-fixes`))).toBe(false)
    expect(read(dir, 'src/bookclub/bookRules.js')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/bookclub/bookRules.js']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/bookclub/bookRules.js').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/bookclub/bookRules.js'))
    const dir = project({ change: { 'src/bookclub/bookRules.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/bookclub/bookRules.js')
    expect(read(dir, 'src/bookclub/bookRules.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-small-fixes-20oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
