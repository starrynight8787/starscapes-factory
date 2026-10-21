// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-accessibility-scan.py')
const FIX = path.resolve('test/fixtures/accessibility-scan')
const FILES = ['src/artloft/artloft.css', 'src/components/Logo.jsx', 'src/components/PostCard.jsx', 'src/entries/entries.css', 'src/index.css', 'src/pages/ChannelDirectory.jsx', 'src/pages/ChannelPage.jsx', 'src/pages/ProductGallery.jsx', 'src/pages/ProductPage.jsx', 'src/rooms/RoomScene.jsx', 'src/rooms/roomscene.css', 'src/rooms/sceneRules.js', 'test/nook-scene.test.jsx', 'test/rooms-data.test.jsx', 'test/rooms.test.jsx']
const NEW = ['tools/accessibility-scan-fixes-files/accessibility-scan.test.jsx.staged', 'INSTALL-ACCESSIBILITY-SCAN.txt', 'tools/accessibility-scan/scan.py', 'tools/accessibility-scan/README.md']
const flat = (rel) => rel.replace(/\//g, '__') + (/\.test\.jsx?$/.test(rel) ? '.fixture' : '') // reference copies of test files are stored under a name the test runner does not pick up
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11ytest-'))
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

describe('the accessibility fixes', () => {
  it('changes all fifteen files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-accessibility-scan', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-accessibility-scan`)).toBe(before(rel))
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
    const odd = before('src/pages/ChannelPage.jsx').replace('&larr; Back home', '&larr; Back house')
    expect(odd).not.toBe(before('src/pages/ChannelPage.jsx'))
    const dir = project({ change: { 'src/pages/ChannelPage.jsx': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/pages/ChannelPage.jsx')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-accessibility-scan`))).toBe(false)
    expect(read(dir, 'src/pages/ChannelPage.jsx')).toBe(odd)
  })
  it('refuses a half-done file (only some of its edits made) rather than guessing', () => {
    const pairs = JSON.parse(fs.readFileSync(SCRIPT, 'utf8').match(/PATCH = json\.loads\(r'''([\s\S]*?)'''\)/)[1])['src/pages/ChannelPage.jsx']
    expect(pairs.length).toBeGreaterThan(1)
    const half = before('src/pages/ChannelPage.jsx').replace(pairs[0][0], pairs[0][1])
    expect(half).not.toBe(before('src/pages/ChannelPage.jsx'))
    const dir = project({ change: { 'src/pages/ChannelPage.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/pages/ChannelPage.jsx')
    expect(read(dir, 'src/pages/ChannelPage.jsx')).toBe(half)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-accessibility-scan-21oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })

  it('puts the new accessibility test in place, only after every edit has been made, keeping nothing else back', () => {
    const dir = project(); const r = run(dir); expect(r.code).toBe(0); expect(r.out.match(/^replaced {6}test\/accessibility-scan\.test\.jsx/gm)).toHaveLength(1)
    expect(read(dir, 'test/accessibility-scan.test.jsx')).toBe('// new file\n')
  })
  it('is safe to run twice with the test too: the second time it says already done', () => {
    const dir = project(); run(dir); const second = run(dir); expect(second.code).toBe(0); expect(second.out).toMatch(/^already done {2}test\/accessibility-scan\.test\.jsx/m); expect(second.out).not.toContain('replaced ')
  })
  it('puts NO test in place when a file is not as expected (tests must never move without the code)', () => {
    const dir = project({ change: { 'src/pages/ChannelPage.jsx': '// somebody changed this file\n' } }); const r = run(dir); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED')
    expect(fs.existsSync(path.join(dir, 'test/accessibility-scan.test.jsx'))).toBe(false)
  })
})
