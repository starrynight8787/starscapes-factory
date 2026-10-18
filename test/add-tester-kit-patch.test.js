// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-tester-kit.py')
const FIX = path.resolve('test/fixtures/tester-kit')
const FILES = ['scripts/make-share-pages.mjs', 'scripts/shareHead.mjs', 'src/App.jsx', 'src/components/Footer.jsx', 'src/components/Navbar.jsx', 'src/data/pageMeta.js', 'src/data/staticPages.js', 'src/pages/StaticPage.jsx']
const NEW = ['src/data/siteSettings.js', 'src/testers/testersData.js', 'src/testers/TestersPage.jsx', 'src/testers/testers.css']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testerkittest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) put('src/styles/forms.css', '/* from restyle part 2 */\n'); put('src/styles/legacy.css', '/* from restyle part 2 */\n')
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('adding the tester kit', () => {
  it('changes the eight files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-tester-kit', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-tester-kit`)).toBe(before(rel))
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
    const odd = before('src/pages/StaticPage.jsx').replace("import { staticPages } from '../data/staticPages'\n", "import { staticPages } from '../data/staticPages' // changed by hand\n")
    expect(odd).not.toBe(before('src/pages/StaticPage.jsx'))
    const dir = project({ change: { 'src/pages/StaticPage.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/pages/StaticPage.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-tester-kit`))).toBe(false)
    expect(read(dir, 'src/data/staticPages.js')).toBe(before('src/data/staticPages.js'))
    expect(read(dir, 'src/pages/StaticPage.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/components/Navbar.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/components/Navbar.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/components/Navbar.jsx'))
    const dir = project({ change: { 'src/components/Navbar.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/components/Navbar.jsx')
    expect(read(dir, 'src/components/Navbar.jsx')).toBe(half)
    expect(read(dir, 'src/App.jsx')).toBe(before('src/App.jsx'))
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-tester-kit-18oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('refuses unless restyle part 2 is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install restyle part 2 first/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
