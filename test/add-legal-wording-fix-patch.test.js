// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-legal-wording-fix.py')
const FIX = path.resolve('test/fixtures/legal-wording-fix')
const FILES = ['src/data/legalPages.js']
const TESTS = ['test/legal-pages.test.jsx', 'test/legal-check-wording.test.js', 'test/newsletter-privacy.test.js']
const NEW = ['tools/legal-wording-fix-files/legal-pages.test.jsx.staged', 'tools/legal-wording-fix-files/legal-check-wording.test.js.staged', 'tools/legal-wording-fix-files/newsletter-privacy.test.js.staged', 'INSTALL-LEGAL-WORDING-FIX.txt']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legalfixtest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
    put('package.json', '{}\n')
  for (const t of TESTS) put(t, '// old test\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('fixing the legal wording', () => {
  it('changes the one file into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-legal-wording-fix', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-legal-wording-fix`)).toBe(before(rel))
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
    const odd = before('src/data/legalPages.js').replace('and Stripe passes us only the confirmation.', 'and Stripe passes us only the confirmations.')
    expect(odd).not.toBe(before('src/data/legalPages.js'))
    const dir = project({ change: { 'src/data/legalPages.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/data/legalPages.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-legal-wording-fix`))).toBe(false)
    expect(read(dir, 'src/data/legalPages.js')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/data/legalPages.js']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/data/legalPages.js').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/data/legalPages.js'))
    const dir = project({ change: { 'src/data/legalPages.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/data/legalPages.js')
    expect(read(dir, 'src/data/legalPages.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-legal-wording-fix-21oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('replaces the three tests, keeping a copy of each as it was, only after the legal pages edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code).toBe(0); expect(r.out.match(/^replaced {6}test\//gm)).toHaveLength(3)
    for (const t of TESTS) { expect(read(dir, t), t).toBe('// new file\n'); expect(read(dir, `${t}.before-legal-wording-fix`), t).toBe('// old test\n') }
  })
  it('is safe to run twice with the tests too: the second time each says already done and nothing new is kept', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0); expect(second.out.match(/^already done {2}test\//gm)).toHaveLength(3); expect(second.out).not.toContain('replaced ')
  })
  it('changes NO test when the legal pages are not as expected (the mix-up that started this: tests must never move without the policy)', () => {
    const dir = project({ change: { 'src/data/legalPages.js': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    for (const t of TESTS) { expect(read(dir, t), t).toBe('// old test\n'); expect(fs.existsSync(path.join(dir, `${t}.before-legal-wording-fix`)), t).toBe(false) }
  })
  it('changes no test when the staged copies from the zip are not there yet', () => {
    const dir = project({ newFiles: false }); const r = run(dir); expect(r.code).not.toBe(0); for (const t of TESTS) expect(read(dir, t), t).toBe('// old test\n')
  })
})
