// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-reminders.py')
const FIX = path.resolve('test/fixtures/reminders')
const FILES = ['api/membership-checkout.js', 'vercel.json']
const NEW = ['lib/membershipReminders.js', 'lib/reminderEmailText.js', 'src/membership/reminderRules.js', 'sql/membership-notices.sql', 'INSTALL-REMINDERS.txt']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reminderstest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  put('src/membership/changeWindow.js', '// from the passes terms update\n')
  put('lib/orderEmailText.js', '// from the order email update\n')
  put('lib/membershipStripe.js', '// from the membership payment update\n')
    put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('adding the renewal reminders', () => {
  it('changes the two files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-reminders', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-reminders`)).toBe(before(rel))
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
    const odd = before('api/membership-checkout.js').replace("import { requireUser } from '../lib/userGuard.js'", "import { requireUser } from '../lib/userGuard.js' // changed by hand")
    expect(odd).not.toBe(before('api/membership-checkout.js'))
    const dir = project({ change: { 'api/membership-checkout.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('api/membership-checkout.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-reminders`))).toBe(false)
    expect(read(dir, 'api/membership-checkout.js')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['api/membership-checkout.js']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('api/membership-checkout.js').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('api/membership-checkout.js'))
    const dir = project({ change: { 'api/membership-checkout.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('api/membership-checkout.js')
    expect(read(dir, 'api/membership-checkout.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-reminders-20oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
