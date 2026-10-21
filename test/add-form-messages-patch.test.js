// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-form-messages.py')
const FIX = path.resolve('test/fixtures/form-messages')
const FILES = ['src/components/FormMessages.jsx', 'src/pages/NewProduct.jsx', 'test/form-messages.test.jsx']
const NEW = ['tools/form-messages-files/productFormRules.js.staged', 'tools/form-messages-files/new-product-form.test.jsx.staged', 'INSTALL-FORM-MESSAGES.txt']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '') // reference copies of test files are stored under a name the test runner does not pick up
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'formtest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
    put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('the form messages', () => {
  it('changes all three files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-form-messages', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-form-messages`)).toBe(before(rel))
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
    const odd = before('src/pages/NewProduct.jsx').replace('label="Title">', 'label="Titles">')
    expect(odd).not.toBe(before('src/pages/NewProduct.jsx'))
    const dir = project({ change: { 'src/pages/NewProduct.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/pages/NewProduct.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-form-messages`))).toBe(false)
    expect(read(dir, 'src/pages/NewProduct.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/pages/NewProduct.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/pages/NewProduct.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/pages/NewProduct.jsx'))
    const dir = project({ change: { 'src/pages/NewProduct.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/pages/NewProduct.jsx')
    expect(read(dir, 'src/pages/NewProduct.jsx')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-form-messages-21oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the two new files in place, only after every edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code).toBe(0); expect(r.out.match(/^replaced {6}(src|test)\//gm)).toHaveLength(2)
    expect(read(dir, 'src/pages/productFormRules.js')).toBe('// new file\n'); expect(read(dir, 'test/new-product-form.test.jsx')).toBe('// new file\n')
  })
  it('is safe to run twice with the new files too: the second time both say already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0); expect(second.out.match(/^already done {2}(src\/pages\/productFormRules\.js|test\/new-product-form\.test\.jsx)/gm)).toHaveLength(2); expect(second.out).not.toContain('replaced ')
  })
  it('puts NO new file in place when a file is not as expected (tests must never move without the code)', () => {
    const dir = project({ change: { 'src/pages/NewProduct.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    expect(fs.existsSync(path.join(dir, 'src/pages/productFormRules.js'))).toBe(false); expect(fs.existsSync(path.join(dir, 'test/new-product-form.test.jsx'))).toBe(false)
  })
})
