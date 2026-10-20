// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-promotions-admin.py')
const FIX = path.resolve('test/fixtures/promotions-admin')
const FILES = ['lib/membershipAdmin.js', 'src/App.jsx', 'src/admin/adminTools.js', 'src/data/pageMeta.js']
const NEW = ['INSTALL-PROMOTIONS-ADMIN.txt', 'lib/promotionsAdmin.js', 'src/admin/AdminPromotions.jsx', 'src/admin/adminpromotions.css', 'src/admin/promotionsAdminApi.js', 'src/admin/promotionsRules.js']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'promotest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  put('src/admin/AdminMembers.jsx', '// the members page\n')
  put('src/admin/membersRules.js', '// the members rules\n')
    put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('building the promotions page', () => {
  it('changes the four files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-promotions-admin', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-promotions-admin`)).toBe(before(rel))
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
    const odd = before('src/App.jsx').replace("import AdminMembers from './admin/AdminMembers'", "import AdminMembers from './admin/AdminMembersX'")
    expect(odd).not.toBe(before('src/App.jsx'))
    const dir = project({ change: { 'src/App.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/App.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-promotions-admin`))).toBe(false)
    expect(read(dir, 'src/App.jsx')).toBe(odd)
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
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-promotions-admin-20oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
