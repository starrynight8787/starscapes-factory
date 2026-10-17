// @vitest-environment node
// The script that adds the order confirmation email to the five existing files: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-order-email.py')
const FIX = path.resolve('test/fixtures/order-email')
const FILES = ['api/checkout.js', 'api/order-actions.js', 'api/orders.js', 'api/stripe-webhook.js', 'src/artloft/OrdersPanel.jsx']
const NEW = ['lib/orderEmailText.js', 'lib/sendEmail.js', 'lib/orderConfirmation.js', 'sql/orders-confirmation.sql']
const flat = (rel) => rel.replace(/\//g, '__')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orderemailtest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8'))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  put('src/unrelated.js', 'export const x = 1\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')

describe('adding the order confirmation email', () => {
  it('changes the five files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) expect(read(dir, rel)).toBe(after(rel))
    for (const rel of FILES) expect(r.out).toContain(`changed       ${rel}`)
  })
  it('keeps a copy of each file as it was, ending .before-order-email', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-order-email`)).toBe(before(rel))
  })
  it('touches nothing else', () => {
    const dir = project()
    run(dir)
    expect(read(dir, 'src/unrelated.js')).toBe('export const x = 1\n')
    for (const rel of NEW) expect(read(dir, rel)).toBe('// new file\n')
  })
  it('is safe to run twice: the second time changes nothing and says it is already done', () => {
    const dir = project()
    run(dir)
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) {
      expect(read(dir, rel)).toBe(after(rel))
      expect(r.out).toContain(`already done  ${rel}`)
    }
    expect(r.out).toMatch(/already in place/)
  })
  it('changes NOTHING at all if even one file is not the way it expects, and says which', () => {
    const odd = before('api/checkout.js').replace('const STRIPE', 'const STRIPE_CHANGED')
    const dir = project({ change: { 'api/checkout.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('api/checkout.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-order-email`))).toBe(false)
    expect(read(dir, 'api/stripe-webhook.js')).toBe(before('api/stripe-webhook.js'))
    expect(read(dir, 'api/checkout.js')).toBe(odd)
  })
  it('refuses a half-done file rather than guessing', () => {
    const half = before('api/orders.js').replace("const EXTRA = 'creativehub_order_number,creativehub_due,creativehub_checked_at,sent_at'\n", "const EXTRA = 'creativehub_order_number,creativehub_due,creativehub_checked_at,sent_at'\nconst CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'\n")
    const dir = project({ change: { 'api/orders.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('api/orders.js')
    expect(read(dir, 'api/orders.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-order-email-17oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('says so, and changes nothing, if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orderemailtest-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOT FOUND/)
  })
})
