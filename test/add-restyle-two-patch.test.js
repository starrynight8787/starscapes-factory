// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-restyle-two.py')
const FIX = path.resolve('test/fixtures/restyle-two')
const FILES = ['src/admin/adminTools.js', 'src/artloft/AdminOriginals.jsx', 'src/artloft/AdminPrints.jsx', 'src/cart/CartPage.jsx', 'src/factoryfloor/PostFilter.jsx', 'src/index.css', 'src/main.jsx', 'src/pages/EditPost.jsx', 'src/pages/ForgotPassword.jsx', 'src/pages/Login.jsx', 'src/pages/NewPost.jsx', 'src/pages/NewProduct.jsx', 'src/pages/ProductGallery.jsx', 'src/pages/ProductPage.jsx', 'src/pages/ResetPassword.jsx', 'src/pages/Signup.jsx']
const NEW = ['src/styles/forms.css', 'src/styles/legacy.css', 'src/pages/postFormRules.js']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'restyletwotest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) put('src/bookclub/BookClubPage.jsx', '// from the Book Club update\n'); put('src/styles/pages.css', '/* from the restyled pages update */\n')
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('restyling the sign-in pages and the owner forms and retiring the old rules', () => {
  it('changes the sixteen files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-restyle-two', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-restyle-two`)).toBe(before(rel))
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
    const odd = before('src/main.jsx').replace("import './index.css'\n", "import './index.css' // changed by hand\n")
    expect(odd).not.toBe(before('src/main.jsx'))
    const dir = project({ change: { 'src/main.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/main.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-restyle-two`))).toBe(false)
    expect(read(dir, 'src/index.css')).toBe(before('src/index.css'))
    expect(read(dir, 'src/main.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/pages/EditPost.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/pages/EditPost.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/pages/EditPost.jsx'))
    const dir = project({ change: { 'src/pages/EditPost.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/pages/EditPost.jsx')
    expect(read(dir, 'src/pages/EditPost.jsx')).toBe(half)
    expect(read(dir, 'src/main.jsx')).toBe(before('src/main.jsx'))
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-restyle-two-18oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('refuses unless the Book Club update is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the Book Club update first/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
