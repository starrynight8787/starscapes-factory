// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-checkout-terms.py')
const FIX = path.resolve('test/fixtures/checkout-terms')
const FILES = ['api/checkout.js', 'src/cart/CartPage.jsx', 'src/cart/cart.css']
const NEW = ['INSTALL-CHECKOUT-TERMS.txt', 'tools/checkout-terms-files/src_cart_beforeYouPay.js.staged', 'tools/checkout-terms-files/src_cart_BeforeYouPayBox.jsx.staged', 'tools/checkout-terms-files/test_before-you-pay.test.jsx.staged', 'tools/checkout-terms-files/test_checkout-terms.test.js.staged', 'tools/checkout-terms-files/test_no-case-clashes.test.js.staged']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkouttest-'))
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

describe('the checkout terms changes', () => {
  it('changes all three files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-checkout-terms', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-checkout-terms`)).toBe(before(rel))
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
    const odd = before('api/checkout.js').replace("import { requireOwner } from '../lib/ownerGuard.js'", "import { requireOwner, SomethingElse } from '../lib/ownerGuard.js'")
    expect(odd).not.toBe(before('api/checkout.js'))
    const dir = project({ change: { 'api/checkout.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('api/checkout.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-checkout-terms`))).toBe(false)
    expect(read(dir, 'api/checkout.js')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['api/checkout.js']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('api/checkout.js').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('api/checkout.js'))
    const dir = project({ change: { 'api/checkout.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('api/checkout.js')
    expect(read(dir, 'api/checkout.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-checkout-terms-v2-22oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the five new files in place, only after every edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    for (const target of ['src/cart/beforeYouPay.js', 'src/cart/BeforeYouPayBox.jsx', 'test/before-you-pay.test.jsx', 'test/checkout-terms.test.js', 'test/no-case-clashes.test.js']) {
      expect(r.out.match(new RegExp('^replaced {6}' + target.replace(/[.]/g, '\\.'), 'gm')), target).toHaveLength(1)
      expect(read(dir, target), target).toBe('// new file\n')
    }
  })
  it('is safe to run twice with the new files too: the second time each says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0)
    for (const target of ['src/cart/beforeYouPay.js', 'src/cart/BeforeYouPayBox.jsx', 'test/before-you-pay.test.jsx', 'test/checkout-terms.test.js', 'test/no-case-clashes.test.js']) expect(second.out, target).toMatch(new RegExp('^already done {2}' + target.replace(/[.]/g, '\\.'), 'm'))
    expect(second.out).not.toContain('replaced ')
  })
  it('puts NOTHING in place when a file is not as expected (the checkout changes must never arrive half-installed)', () => {
    const dir = project({ change: { 'src/cart/CartPage.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    for (const target of ['src/cart/beforeYouPay.js', 'src/cart/BeforeYouPayBox.jsx', 'test/before-you-pay.test.jsx', 'test/checkout-terms.test.js', 'test/no-case-clashes.test.js']) expect(fs.existsSync(path.join(dir, target)), target).toBe(false)
  })
})
