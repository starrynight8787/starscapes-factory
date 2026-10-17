// @vitest-environment node
// The script that adds the suggest and vote box and the Story Ledger page: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-suggest-ledger.py')
const FIX = path.resolve('test/fixtures/suggest-ledger')
const FILES = ['src/App.jsx', 'src/admin/adminTools.js', 'src/data/pageMeta.js', 'src/doors/doorsData.js', 'src/rooms/RoomRoutes.jsx']
const NEW = ['sql/suggestions.sql', 'src/suggest/suggestRules.js', 'src/suggest/suggestApi.js', 'src/suggest/useUser.js', 'src/suggest/SuggestPanel.jsx', 'src/suggest/suggest.css', 'src/admin/AdminSuggestions.jsx', 'src/ledger/StoryLedgerPage.jsx', 'src/ledger/ledgerData.js', 'src/ledger/ledger.css']
const flat = (rel) => rel.replace(/\//g, '__')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suggestledgertest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? before(rel))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) put('src/styles/pages.css', '/* from the restyled pages update */\n')
  put('package.json', '{}\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('adding the suggest and vote box and the Story Ledger page', () => {
  it('changes the five files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-suggest-ledger', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-suggest-ledger`)).toBe(before(rel))
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
    const odd = before('src/admin/adminTools.js').replace("'Open a door'", "'Open a door (changed)'")
    expect(odd).not.toBe(before('src/admin/adminTools.js'))
    const dir = project({ change: { 'src/admin/adminTools.js': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('src/admin/adminTools.js')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-suggest-ledger`))).toBe(false)
    expect(read(dir, 'src/App.jsx')).toBe(before('src/App.jsx'))
  })
  it('refuses a half-done file rather than guessing', () => {
    const half = before('src/rooms/RoomRoutes.jsx').replace("import { doorAreas, findDoor } from '../doors/doorsData'\n", "import { doorAreas, findDoor } from '../doors/doorsData'\nimport StoryLedgerPage from '../ledger/StoryLedgerPage'\n")
    expect(half).not.toBe(before('src/rooms/RoomRoutes.jsx'))
    const dir = project({ change: { 'src/rooms/RoomRoutes.jsx': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/rooms/RoomRoutes.jsx')
    expect(read(dir, 'src/rooms/RoomRoutes.jsx')).toBe(half)
    expect(read(dir, 'src/App.jsx')).toBe(before('src/App.jsx'))
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-suggest-ledger-17oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('refuses unless the restyled pages update is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the restyled pages update first/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
})
