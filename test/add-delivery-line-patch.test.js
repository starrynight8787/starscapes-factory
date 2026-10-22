// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-delivery-line.py')
const FIX = path.resolve('test/fixtures/delivery-line')
const FILES = ['src/artloft/artLoftData.js', 'src/cart/CartPage.jsx', 'src/cart/launchCountries.js']
const NEW = ['INSTALL-DELIVERY-LINE.txt', 'tools/delivery-line-files/delivery-line.test.js.staged']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deliverytest-'))
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

describe('the delivery line', () => {
  it('changes all three files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-delivery-line', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-delivery-line`)).toBe(before(rel))
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
    const odd = before('src/artloft/artLoftData.js').replace("import { IMPORT_TAX_NOTE } from '../cart/launchCountries'", "import { IMPORT_TAX_NOTE, SOMETHING_ELSE } from '../cart/launchCountries'")
    expect(odd).not.toBe(before('src/artloft/artLoftData.js'))
    const dir = project({ change: { 'src/artloft/artLoftData.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/artloft/artLoftData.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-delivery-line`))).toBe(false)
    expect(read(dir, 'src/artloft/artLoftData.js')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/artloft/artLoftData.js']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/artloft/artLoftData.js').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/artloft/artLoftData.js'))
    const dir = project({ change: { 'src/artloft/artLoftData.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/artloft/artLoftData.js')
    expect(read(dir, 'src/artloft/artLoftData.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-delivery-line-22oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the new test in place, only after every edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    expect(r.out.match(/^replaced {6}test\/delivery-line\.test\.js/gm)).toHaveLength(1)
    expect(read(dir, 'test/delivery-line.test.js')).toBe('// new file\n')
  })
  it('is safe to run twice with the new test too: the second time it says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0)
    expect(second.out).toMatch(/^already done {2}test\/delivery-line\.test\.js/m); expect(second.out).not.toContain('replaced ')
  })
  it('puts NO test in place when a file is not as expected (the test must never arrive without the edits)', () => {
    const dir = project({ change: { 'src/cart/CartPage.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    expect(fs.existsSync(path.join(dir, 'test/delivery-line.test.js'))).toBe(false)
  })
})
