// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-story-ledger-v2.py')
const FIX = path.resolve('test/fixtures/story-ledger-v2')
const FILES = ['src/ledger/StoryLedgerPage.jsx', 'src/ledger/ledger.css', 'src/ledger/ledgerData.js']
const NEW = []
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'storyledgertest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) { put('src/entries/EntryPage.jsx', '// from the entry template update\n'); put('src/home/HomeSections.jsx', '// from the home page update\n') }
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('building the Story Ledger page', () => {
  it('changes the three files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-story-ledger-v2', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-story-ledger-v2`)).toBe(before(rel))
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
    const odd = before('src/ledger/ledger.css').replace(".sl__hero {", ".sl__hero { /* changed by hand */")
    expect(odd).not.toBe(before('src/ledger/ledger.css'))
    const dir = project({ change: { 'src/ledger/ledger.css': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/ledger/ledger.css')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-story-ledger-v2`))).toBe(false)
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
  it('refuses unless the entry template and home page updates are installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the entry template/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
