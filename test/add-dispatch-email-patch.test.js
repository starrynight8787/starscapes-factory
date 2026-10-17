// @vitest-environment node
// The script that adds the posted email to the three existing files: exact, all-or-nothing, backed up, safe to run twice, and it needs the
// confirmation email first.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-dispatch-email.py')
const FIX = path.resolve('test/fixtures/dispatch-email')
const FILES = ['api/order-actions.js', 'api/orders.js', 'src/artloft/OrdersPanel.jsx']
const NEW = ['lib/dispatchEmailText.js', 'lib/dispatchEmail.js', 'sql/orders-dispatch.sql']
const FIRST = ['lib/orderConfirmation.js', 'lib/sendEmail.js', 'lib/orderEmailText.js']
const flat = (rel) => rel.replace(/\//g, '__')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dispatchtest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8'))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) for (const rel of FIRST) put(rel, '// from the confirmation email update\n')
  put('src/unrelated.js', 'export const x = 1\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')

describe('adding the posted email', () => {
  it('changes the three files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-dispatch-email, and touches nothing else', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-dispatch-email`)).toBe(before(rel))
    expect(read(dir, 'src/unrelated.js')).toBe('export const x = 1\n')
  })
  it('is safe to run twice', () => {
    const dir = project()
    run(dir)
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`already done  ${rel}`) }
  })
  it('changes NOTHING if even one file is not the way it expects, and says which', () => {
    const odd = before('api/orders.js').replace('const CONFIRMATION =', 'const CONFIRMATION_CHANGED =')
    const dir = project({ change: { 'api/orders.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('api/orders.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-dispatch-email`))).toBe(false)
    expect(read(dir, 'api/order-actions.js')).toBe(before('api/order-actions.js'))
  })
  it('refuses a half-done file rather than guessing', () => {
    const half = before('api/orders.js').replace("const CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'\n", "const CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'\n// And the \"your order has been posted\" email (sql/orders-dispatch.sql).\nconst DISPATCH = 'dispatch_status,dispatch_note,dispatch_sent_at,tracking_url,tracking_number'\n")
    expect(half).not.toBe(before('api/orders.js'))
    const dir = project({ change: { 'api/orders.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('api/orders.js')
    expect(read(dir, 'api/orders.js')).toBe(half)
    expect(read(dir, 'api/order-actions.js')).toBe(before('api/order-actions.js'))
  })
  it('refuses unless the confirmation email is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the order confirmation email first/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-dispatch-email-17oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('says so if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dispatchtest-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOT FOUND/)
  })
})
