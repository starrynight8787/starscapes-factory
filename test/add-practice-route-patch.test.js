// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-practice-route.py')
const FIX = path.resolve('test/fixtures/practice-route')
const FILES = ['api/order-actions.js', 'src/artloft/OrdersPanel.jsx', 'test/order-actions-hold-refund.test.js', 'test/orders-panel-cards.test.jsx', 'test/orders-panel-hold-refund.test.jsx']
const NEW = ['INSTALL-PRACTICE-ROUTE.txt', 'tools/practice-route-files/order-actions-practice.test.js.staged', 'tools/practice-route-files/orders-panel-practice.test.jsx.staged']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '') // reference copies of test files are stored under a name the test runner does not pick up
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {}, prerequisite = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'practicetest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
    put('package.json', '{}\n')
    if (prerequisite) put('lib/ownerAlert.js', '// the order alerts package is in\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('the practice route', () => {
  it('changes all five files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-practice-route', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-practice-route`)).toBe(before(rel))
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
    const odd = before('api/order-actions.js').replace('//   sending_state  whether real payments go to Creative Hub by themselves', '//   sending_state  whether real payments go to Creative Hub by themselves!')
    expect(odd).not.toBe(before('api/order-actions.js'))
    const dir = project({ change: { 'api/order-actions.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('api/order-actions.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-practice-route`))).toBe(false)
    expect(read(dir, 'api/order-actions.js')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['api/order-actions.js']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('api/order-actions.js').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('api/order-actions.js'))
    const dir = project({ change: { 'api/order-actions.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('api/order-actions.js')
    expect(read(dir, 'api/order-actions.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-practice-route-21oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the two new tests in place, only after every edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    for (const target of ['test/order-actions-practice.test.js', 'test/orders-panel-practice.test.jsx']) {
      expect(r.out.match(new RegExp('^replaced {6}' + target.replace(/[.]/g, '\\.'), 'gm')), target).toHaveLength(1)
      expect(read(dir, target), target).toBe('// new file\n')
    }
  })
  it('is safe to run twice with the new tests too: the second time each says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0)
    for (const target of ['test/order-actions-practice.test.js', 'test/orders-panel-practice.test.jsx']) expect(second.out, target).toMatch(new RegExp('^already done {2}' + target.replace(/[.]/g, '\\.'), 'm'))
    expect(second.out).not.toContain('replaced ')
  })
  it('puts NO test in place when a file is not as expected (tests must never move without the code)', () => {
    const dir = project({ change: { 'src/artloft/OrdersPanel.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    for (const target of ['test/order-actions-practice.test.js', 'test/orders-panel-practice.test.jsx']) expect(fs.existsSync(path.join(dir, target)), target).toBe(false)
  })
  it('refuses to do anything, and says why, when the order alerts package has not been installed first', () => {
    const dir = project({ prerequisite: false }); const r = run(dir)
    expect(r.code).not.toBe(0); expect(r.out).toMatch(/Install starscapes-order-alerts-returns-21oct\.zip first/); expect(r.out).toContain('lib/ownerAlert.js')
    for (const rel of FILES) expect(read(dir, rel), rel).toBe(before(rel))
    for (const target of ['test/order-actions-practice.test.js', 'test/orders-panel-practice.test.jsx']) expect(fs.existsSync(path.join(dir, target)), target).toBe(false)
  })
})
