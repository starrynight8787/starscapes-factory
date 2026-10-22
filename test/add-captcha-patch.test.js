// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-captcha.py')
const FIX = path.resolve('test/fixtures/captcha')
const FILES = ['.env.example', 'src/pages/ForgotPassword.jsx', 'src/pages/Login.jsx', 'src/pages/Signup.jsx', 'src/pages/formRules.js']
const NEW = ['INSTALL-CAPTCHA.txt', 'tools/captcha-files/CaptchaCheck.jsx.staged', 'tools/captcha-files/captcha-check.test.jsx.staged', 'tools/captcha-files/captcha-forms.test.jsx.staged']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'captchatest-'))
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

describe('the security check', () => {
  it('changes all five files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-captcha', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-captcha`)).toBe(before(rel))
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
    const odd = before('src/pages/Signup.jsx').replace("import { emailProblem, signupMessage } from './formRules'", "import { emailProblem, signupMessage, somethingElse } from './formRules'")
    expect(odd).not.toBe(before('src/pages/Signup.jsx'))
    const dir = project({ change: { 'src/pages/Signup.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/pages/Signup.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-captcha`))).toBe(false)
    expect(read(dir, 'src/pages/Signup.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/pages/Signup.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/pages/Signup.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/pages/Signup.jsx'))
    const dir = project({ change: { 'src/pages/Signup.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/pages/Signup.jsx')
    expect(read(dir, 'src/pages/Signup.jsx')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-captcha-22oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the new component and its two test files in place, only after every edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    for (const target of ['src/components/CaptchaCheck.jsx', 'test/captcha-check.test.jsx', 'test/captcha-forms.test.jsx']) {
      expect(r.out.match(new RegExp('^replaced {6}' + target.replace(/[.]/g, '\\.'), 'gm')), target).toHaveLength(1)
      expect(read(dir, target), target).toBe('// new file\n')
    }
  })
  it('is safe to run twice with the new files too: the second time each says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0)
    for (const target of ['src/components/CaptchaCheck.jsx', 'test/captcha-check.test.jsx', 'test/captcha-forms.test.jsx']) expect(second.out, target).toMatch(new RegExp('^already done {2}' + target.replace(/[.]/g, '\\.'), 'm'))
    expect(second.out).not.toContain('replaced ')
  })
  it('puts NOTHING in place when a file is not as expected (the check must never arrive without the forms that use it)', () => {
    const dir = project({ change: { 'src/pages/Login.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    for (const target of ['src/components/CaptchaCheck.jsx', 'test/captcha-check.test.jsx', 'test/captcha-forms.test.jsx']) expect(fs.existsSync(path.join(dir, target)), target).toBe(false)
  })
})
