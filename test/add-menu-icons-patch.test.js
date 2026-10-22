// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-menu-icons.py')
const FIX = path.resolve('test/fixtures/menu-icons')
const FILES = ['src/styles/site.css']
const NEW = ['INSTALL-MENU-ICONS.txt', 'tools/menu-icons-files/mobile-menu-icons.test.jsx.staged']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'menuicontest-'))
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

describe('the white menu icons', () => {
  it('changes the file into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-menu-icons', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-menu-icons`)).toBe(before(rel))
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
    const odd = before('src/styles/site.css').replace('the navy line art needs a light backing', 'the navy line art needs a light backing!')
    expect(odd).not.toBe(before('src/styles/site.css'))
    const dir = project({ change: { 'src/styles/site.css': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/styles/site.css')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-menu-icons`))).toBe(false)
    expect(read(dir, 'src/styles/site.css')).toBe(odd)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-menu-icons-22oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the new test in place, only after the edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    expect(r.out.match(/^replaced {6}test\/mobile-menu-icons\.test\.jsx/gm)).toHaveLength(1)
    expect(read(dir, 'test/mobile-menu-icons.test.jsx')).toBe('// new file\n')
  })
  it('is safe to run twice with the new test too: the second time it says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0)
    expect(second.out).toMatch(/^already done {2}test\/mobile-menu-icons\.test\.jsx/m); expect(second.out).not.toContain('replaced ')
  })
  it('puts NO test in place when the stylesheet is not as expected (the test must never move without the edit)', () => {
    const dir = project({ change: { 'src/styles/site.css': '/* somebody changed this file */\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    expect(fs.existsSync(path.join(dir, 'test/mobile-menu-icons.test.jsx'))).toBe(false)
  })
})
