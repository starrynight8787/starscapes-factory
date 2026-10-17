// @vitest-environment node
// The script that adds the footer fix: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-footer-fix.py')
const FIX = path.resolve('test/fixtures/footer-fix')
const FILE = 'src/styles/site.css'
const flat = (rel) => rel.replace(/\//g, '__')
const before = () => fs.readFileSync(path.join(FIX, 'before', flat(FILE)), 'utf8')
const after = () => fs.readFileSync(path.join(FIX, 'after', flat(FILE)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, css = before() } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'footerfixtest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  put(FILE, css)
  if (newFiles) put('test/footer-nav.test.jsx', '// new file\n')
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir) => fs.readFileSync(path.join(dir, FILE), 'utf8')

describe('adding the footer fix', () => {
  it('changes the stylesheet into exactly the finished version, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    expect(read(dir)).toBe(after())
    expect(r.out).toContain(`changed       ${FILE}`)
    expect(read(dir)).toContain('.sf-footer nav {')
  })
  it('only adds to the end: everything that was there is still there, unchanged', () => {
    const dir = project()
    run(dir)
    expect(read(dir).startsWith(before().trimEnd())).toBe(true)
  })
  it('keeps a copy of the file as it was, ending .before-footer-fix', () => {
    const dir = project()
    run(dir)
    expect(fs.readFileSync(path.join(dir, `${FILE}.before-footer-fix`), 'utf8')).toBe(before())
  })
  it('is safe to run twice: the second time changes nothing', () => {
    const dir = project()
    run(dir)
    const once = read(dir)
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    expect(r.out).toMatch(/already done/)
    expect(read(dir)).toBe(once)
  })
  it('changes NOTHING if the stylesheet is not the way it expects, and says so', () => {
    const odd = before().replace('.sf-footer__follow a:hover {', '.sf-footer__follow a:hover { /* changed */')
    expect(odd).not.toBe(before())
    const dir = project({ css: odd })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(read(dir)).toBe(odd)
    expect(fs.existsSync(path.join(dir, `${FILE}.before-footer-fix`))).toBe(false)
  })
  it('asks you to unzip first if the new test file is not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-footer-fix-17oct\.zip/)
    expect(read(dir)).toBe(before())
  })
})
