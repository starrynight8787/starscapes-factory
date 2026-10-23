// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-legal-publish-prep.py')
const FIX = path.resolve('test/fixtures/legal-publish-prep')
const FILES = ['src/data/legalPages.js', 'test/ai-policy-scenes-note.test.js', 'test/children-code.test.jsx', 'test/cookie-policy.test.js', 'test/footer-company.test.jsx', 'test/foundations.test.jsx', 'test/legal-check-wording.test.js', 'test/legal-pages.test.jsx', 'test/legal-update.test.js', 'test/newsletter-privacy.test.js', 'test/privacy-star-atlas.test.js', 'test/returns-wording.test.js', 'test/tester-kit.test.jsx']
const NEW = ['INSTALL-LEGAL-PUBLISH-PREP.txt', 'tools/legal-publish-prep-files/tools_publish-legal-pages.py.staged', 'tools/legal-publish-prep-files/test_legalState.js.staged', 'tools/legal-publish-prep-files/test_legal-states.test.jsx.staged', 'tools/legal-publish-prep-files/test_star-atlas-switch.test.js.staged', 'tools/legal-publish-prep-files/test_publish-legal-pages.test.js.staged']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publishprep-'))
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

describe('the legal publish preparation', () => {
  it('changes all thirteen files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-legal-publish-prep', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-legal-publish-prep`)).toBe(before(rel))
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
    const odd = before('src/data/legalPages.js').replace('export const STAR_ATLAS_LIVE = false', 'export const STAR_ATLAS_LIVE = true')
    expect(odd).not.toBe(before('src/data/legalPages.js'))
    const dir = project({ change: { 'src/data/legalPages.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/data/legalPages.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-legal-publish-prep`))).toBe(false)
    expect(read(dir, 'src/data/legalPages.js')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/data/legalPages.js']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/data/legalPages.js').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/data/legalPages.js'))
    const dir = project({ change: { 'src/data/legalPages.js': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/data/legalPages.js')
    expect(read(dir, 'src/data/legalPages.js')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-legal-publish-prep-23oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the five new files in place, only after every edit has been made', () => {
    const dir = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    for (const target of ['tools/publish-legal-pages.py', 'test/legalState.js', 'test/legal-states.test.jsx', 'test/star-atlas-switch.test.js', 'test/publish-legal-pages.test.js']) {
      expect(r.out.match(new RegExp('^replaced {6}' + target.replace(/[.]/g, '\\.'), 'gm')), target).toHaveLength(1)
      expect(read(dir, target), target).toBe('// new file\n')
    }
  })
  it('is safe to run twice with the new files too: the second time each says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0)
    for (const target of ['tools/publish-legal-pages.py', 'test/legalState.js', 'test/legal-states.test.jsx', 'test/star-atlas-switch.test.js', 'test/publish-legal-pages.test.js']) expect(second.out, target).toMatch(new RegExp('^already done {2}' + target.replace(/[.]/g, '\\.'), 'm'))
    expect(second.out).not.toContain('replaced ')
  })
  it('puts NOTHING in place when a file is not as expected (the publishing preparation must never arrive half-installed)', () => {
    const dir = project({ change: { 'test/tester-kit.test.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    for (const target of ['tools/publish-legal-pages.py', 'test/legalState.js', 'test/legal-states.test.jsx', 'test/star-atlas-switch.test.js', 'test/publish-legal-pages.test.js']) expect(fs.existsSync(path.join(dir, target)), target).toBe(false)
  })
})
