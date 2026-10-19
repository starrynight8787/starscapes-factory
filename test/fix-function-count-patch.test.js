// @vitest-environment node
// The script that fixes the failed deployments (tools/fix-function-count.py): exact, all-or-nothing, backed up, safe to run twice, and it only removes the function file if it is exactly the one it expects.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/fix-function-count.py')
const FIX = path.resolve('test/fixtures/function-count')
const FILES = ['api/membership-checkout.js', 'src/membership/membershipApi.js', 'tools/health-check.mjs']
const NEW = ['lib/membershipAccount.js']
const OLD_FUNCTION = 'api/membership-account.js'
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const original = fs.readFileSync(path.join(FIX, 'original', flat(OLD_FUNCTION)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, oldFunction = original, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'functioncounttest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (oldFunction !== null) put(OLD_FUNCTION, oldFunction)
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('fixing the failed deployments', () => {
  it('changes the three files into exactly the finished versions, and removes the extra function, and says so', () => {
    const dir = project(); const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
    expect(fs.existsSync(path.join(dir, OLD_FUNCTION))).toBe(false); expect(r.out).toContain(`removed       ${OLD_FUNCTION}`)
  })
  it('keeps a copy of everything it changes or removes, ending .before-function-count', () => {
    const dir = project(); run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-function-count`)).toBe(before(rel))
    expect(read(dir, `${OLD_FUNCTION}.before-function-count`)).toBe(original)
  })
  it('is safe to run twice: the second time changes nothing', () => {
    const dir = project(); run(dir); const r = run(dir)
    expect(r.code, r.out).toBe(0); expect(r.out).toContain('Everything was already in place.'); expect(r.out).not.toContain('changed       ')
    for (const rel of FILES) expect(read(dir, rel)).toBe(after(rel))
  })
  it('changes NOTHING, not even the other files, if one of the three is not the way it expects, and says which', () => {
    const odd = before('api/membership-checkout.js').replace('export default async function handler(req, res) {', 'export default async function handler(req, res) { // changed by hand')
    expect(odd).not.toBe(before('api/membership-checkout.js'))
    const dir = project({ change: { 'api/membership-checkout.js': odd } }); const r = run(dir)
    expect(r.code).toBe(1); expect(r.out).toContain('NOTHING WAS CHANGED'); expect(r.out).toContain('api/membership-checkout.js')
    expect(read(dir, 'api/membership-checkout.js')).toBe(odd); expect(read(dir, 'src/membership/membershipApi.js')).toBe(before('src/membership/membershipApi.js')); expect(fs.existsSync(path.join(dir, OLD_FUNCTION))).toBe(true)
  })
  it('will not remove the function file if it has been changed by hand, and then changes nothing at all', () => {
    const dir = project({ oldFunction: `${original}\n// my own change\n` }); const r = run(dir)
    expect(r.code).toBe(1); expect(r.out).toContain('NOTHING WAS CHANGED'); expect(r.out).toContain(OLD_FUNCTION); expect(r.out).toContain('I will not remove it')
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel)); expect(read(dir, OLD_FUNCTION)).toContain('my own change')
  })
  it('asks you to unzip first if the new file is not there, and changes nothing', () => {
    const dir = project({ newFiles: false }); const r = run(dir)
    expect(r.code).toBe(1); expect(r.out).toContain('lib/membershipAccount.js'); expect(r.out).toContain('Nothing was changed')
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel)); expect(fs.existsSync(path.join(dir, OLD_FUNCTION))).toBe(true)
  })
  it('treats a function file that is already gone as already removed, and still does the rest', () => {
    const dir = project({ oldFunction: null }); const r = run(dir)
    expect(r.code, r.out).toBe(0); expect(r.out).toContain('already removed')
    for (const rel of FILES) expect(read(dir, rel)).toBe(after(rel))
  })
})
