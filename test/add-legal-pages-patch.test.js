// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-legal-pages.py')
const FIX = path.resolve('test/fixtures/legal-pages')
const FILES = ['src/data/legalPages.js', 'src/data/staticPages.js', 'src/data/pageMeta.js', 'src/pages/LegalPage.jsx', 'src/pages/simpleMarkdown.jsx']
const NEW = ['src/pages/markdown.css']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legalpagestest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  put('src/pages/StaticPage.jsx', '// from the footer and pages update\n')
  if (!first) fs.rmSync(path.join(dir, 'src/pages/StaticPage.jsx')) // the footer and pages update has not been installed
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('adding the legal pages', () => {
  it('changes the five files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-legal-pages', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-legal-pages`)).toBe(before(rel))
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
    const odd = before('src/pages/LegalPage.jsx').replace('<p className="lg-updated">', '<p className="lg-updated" data-by-hand="1">')
    expect(odd).not.toBe(before('src/pages/LegalPage.jsx'))
    const dir = project({ change: { 'src/pages/LegalPage.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/pages/LegalPage.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-legal-pages`))).toBe(false)
    expect(read(dir, 'src/pages/LegalPage.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/pages/simpleMarkdown.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/pages/simpleMarkdown.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/pages/simpleMarkdown.jsx'))
    const dir = project({ change: { 'src/pages/simpleMarkdown.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/pages/simpleMarkdown.jsx')
    expect(read(dir, 'src/pages/simpleMarkdown.jsx')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-legal-pages-19oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('refuses unless the footer and pages update is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the footer and pages/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
