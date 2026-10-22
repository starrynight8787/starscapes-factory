// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-childrens-code.py')
const FIX = path.resolve('test/fixtures/childrens-code')
const FILES = ['src/components/Footer.jsx', 'src/data/legalPages.js', 'src/den/YouTubeSeriesPage.jsx', 'src/ebook/FreeEbookPage.jsx', 'src/explorers/RequestForm.jsx', 'src/newsletter/NewsletterSignup.jsx', 'src/pages/Signup.jsx', 'src/rooms/RoomHome.jsx', 'test/newsletter-free.test.jsx', 'test/newsletter-pages.test.jsx']
const NEW = ['INSTALL-CHILDRENS-CODE.txt', 'tools/childrens-code-files/src_data_children.js.staged', 'tools/childrens-code-files/src_components_ClubhouseNote.jsx.staged', 'tools/childrens-code-files/src_components_clubhousenote.css.staged', 'tools/childrens-code-files/test_children-code.test.jsx.staged']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'childrentest-'))
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

describe('the Children\'s Code changes', () => {
  it('changes all ten files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-childrens-code', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-childrens-code`)).toBe(before(rel))
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
    const odd = before('src/components/Footer.jsx').replace("import { Link } from 'react-router-dom'", "import { Link, SomethingElse } from 'react-router-dom'")
    expect(odd).not.toBe(before('src/components/Footer.jsx'))
    const dir = project({ change: { 'src/components/Footer.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/components/Footer.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-childrens-code`))).toBe(false)
    expect(read(dir, 'src/components/Footer.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/components/Footer.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/components/Footer.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/components/Footer.jsx'))
    const dir = project({ change: { 'src/components/Footer.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/components/Footer.jsx')
    expect(read(dir, 'src/components/Footer.jsx')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-childrens-code-22oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the four new files in place, only after every edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    for (const target of ['src/data/children.js', 'src/components/ClubhouseNote.jsx', 'src/components/clubhousenote.css', 'test/children-code.test.jsx']) {
      expect(r.out.match(new RegExp('^replaced {6}' + target.replace(/[.]/g, '\\.'), 'gm')), target).toHaveLength(1)
      expect(read(dir, target), target).toBe('// new file\n')
    }
  })
  it('is safe to run twice with the new files too: the second time each says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0)
    for (const target of ['src/data/children.js', 'src/components/ClubhouseNote.jsx', 'src/components/clubhousenote.css', 'test/children-code.test.jsx']) expect(second.out, target).toMatch(new RegExp('^already done {2}' + target.replace(/[.]/g, '\\.'), 'm'))
    expect(second.out).not.toContain('replaced ')
  })
  it('puts NOTHING in place when a file is not as expected (the children\'s rules must never arrive half-installed)', () => {
    const dir = project({ change: { 'src/rooms/RoomHome.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    for (const target of ['src/data/children.js', 'src/components/ClubhouseNote.jsx', 'src/components/clubhousenote.css', 'test/children-code.test.jsx']) expect(fs.existsSync(path.join(dir, target)), target).toBe(false)
  })
})
