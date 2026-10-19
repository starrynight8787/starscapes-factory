// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-layout-pass.py')
const FIX = path.resolve('test/fixtures/layout-pass')
const FILES = ['src/components/pagebanner.css', 'src/entries/entries.css', 'src/ledger/ledger.css', 'src/leadership/leadership.css', 'src/den/youtube.css', 'src/home/homeSections.css', 'src/home/HomeSections.jsx', 'src/entries/EntryPage.jsx', 'src/leadership/LeadershipBlogPage.jsx', 'src/pages/markdown.css']
const NEW = [] // this update only changes files that already exist
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layoutpasstest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  put('src/pages/StaticPage.jsx', '// from the footer and pages update\n')
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('the layout pass', () => {
  it('changes the ten files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-layout-pass', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-layout-pass`)).toBe(before(rel))
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
    const odd = before('src/ledger/ledger.css').replace(".sl__video {\n  display: block;", ".sl__video {\n  display: block; /* changed by hand */")
    expect(odd).not.toBe(before('src/ledger/ledger.css'))
    const dir = project({ change: { 'src/ledger/ledger.css': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/ledger/ledger.css')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-layout-pass`))).toBe(false)
    expect(read(dir, 'src/ledger/ledger.css')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/ledger/ledger.css']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/ledger/ledger.css').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/ledger/ledger.css'))
    const dir = project({ change: { 'src/ledger/ledger.css': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/ledger/ledger.css')
    expect(read(dir, 'src/ledger/ledger.css')).toBe(half)
  })
})
