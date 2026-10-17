// @vitest-environment node
// The script that adds the share pages to the four existing files: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-share-pages.py')
const FIX = path.resolve('test/fixtures/share-pages')
const FILES = ['index.html', 'package.json', 'src/App.jsx', 'src/pages/PostPage.jsx']
const NEW = ['src/data/pageMeta.js', 'src/components/RouteTitle.jsx', 'scripts/shareHead.mjs', 'scripts/make-share-pages.mjs', 'public/robots.txt', 'public/share/site.png']
const flat = (rel) => rel.replace(/\//g, '__')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharepagestest-'))
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

describe('adding the share pages', () => {
  it('changes the three files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-share-pages, and touches nothing else', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-share-pages`)).toBe(before(rel))
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
    const odd = before('package.json').replace('"build": "vite build"', '"build": "vite build --mode odd"')
    expect(odd).not.toBe(before('package.json'))
    const dir = project({ change: { 'package.json': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('package.json')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-share-pages`))).toBe(false)
    expect(read(dir, 'src/App.jsx')).toBe(before('src/App.jsx'))
    expect(read(dir, 'package.json')).toBe(odd)
  })
  it('refuses a half-done file rather than guessing', () => {
    const half = before('src/App.jsx').replace("import SkipLink from './components/SkipLink'\n", "import SkipLink from './components/SkipLink'\nimport RouteTitle from './components/RouteTitle'\n")
    expect(half).not.toBe(before('src/App.jsx'))
    const dir = project({ change: { 'src/App.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/App.jsx')
    expect(read(dir, 'src/App.jsx')).toBe(half)
    expect(read(dir, 'package.json')).toBe(before('package.json'))
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-share-pages-17oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('says so if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharepagestest-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOT FOUND/)
  })
})
