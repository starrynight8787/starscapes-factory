// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-home-v2.py')
const FIX = path.resolve('test/fixtures/home-v2')
const FILES = ['src/App.jsx', 'src/admin/adminTools.js', 'src/data/pageMeta.js', 'src/pages/ChannelDirectory.jsx']
const NEW = ['sql/home.sql', 'src/home/homeRules.js', 'src/home/homeApi.js', 'src/home/HomeSections.jsx', 'src/home/homeSections.css', 'src/data/membership.js', 'src/admin/AdminHome.jsx']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homev2test-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) put('src/data/siteSettings.js', '// from the tester kit\n'); put('src/admin/AdminBooks.jsx', '// from the Book Club update\n')
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('building the home page boxes', () => {
  it('changes the four files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-home-v2', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-home-v2`)).toBe(before(rel))
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
    const odd = before('src/pages/ChannelDirectory.jsx').replace("import { Link, useNavigate } from 'react-router-dom'\n", "import { Link, useNavigate } from 'react-router-dom' // changed by hand\n")
    expect(odd).not.toBe(before('src/pages/ChannelDirectory.jsx'))
    const dir = project({ change: { 'src/pages/ChannelDirectory.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/pages/ChannelDirectory.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-home-v2`))).toBe(false)
    expect(read(dir, 'src/App.jsx')).toBe(before('src/App.jsx'))
    expect(read(dir, 'src/pages/ChannelDirectory.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/App.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/App.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/App.jsx'))
    const dir = project({ change: { 'src/App.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/App.jsx')
    expect(read(dir, 'src/App.jsx')).toBe(half)
    expect(read(dir, 'src/admin/adminTools.js')).toBe(before('src/admin/adminTools.js'))
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-home-18oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('refuses unless the tester kit is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the tester kit first/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
