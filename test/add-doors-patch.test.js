// @vitest-environment node
// The script that adds the Open a door page to the app's routes.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-doors.py')
const FIX = path.resolve('test/fixtures/doors/App.before.jsx')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ withDoorFiles = true, app } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doorstest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  put('src/App.jsx', app ?? fs.readFileSync(FIX, 'utf8'))
  if (withDoorFiles) for (const f of ['src/admin/OpenDoors.jsx', 'src/doors/doorsData.js', 'src/doors/DoorGate.jsx', 'src/doors/useDoors.js']) put(f, '// stand-in\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')

describe('adding the Open a door page to the app', () => {
  it('adds one import and one route, behind the sign-in, straight after the admin page', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    const app = read(dir, 'src/App.jsx')
    expect(app).toContain("import OpenDoors from './admin/OpenDoors'")
    expect(app).toMatch(/<Route path="\/admin" element=\{[^\n]*\/>\n<Route path="\/admin\/doors" element=\{ <ProtectedRoute session=\{session\}> <OpenDoors session=\{session\} \/> <\/ProtectedRoute> \} \/>\n/)
  })
  it('changes nothing else: undoing the two added lines gives back exactly what was there', () => {
    const dir = project()
    run(dir)
    const back = read(dir, 'src/App.jsx').replace("import OpenDoors from './admin/OpenDoors'\n", '').replace(/<Route path="\/admin\/doors"[^\n]*\n/, '')
    expect(back).toBe(fs.readFileSync(FIX, 'utf8'))
  })
  it('keeps a copy of the file, ending .before-doors', () => {
    const dir = project()
    run(dir)
    expect(read(dir, 'src/App.jsx.before-doors')).toBe(fs.readFileSync(FIX, 'utf8'))
  })
  it('is safe to run twice: the second time changes nothing', () => {
    const dir = project()
    run(dir)
    const once = read(dir, 'src/App.jsx')
    const again = run(dir)
    expect(again.code).toBe(0)
    expect(again.out).toContain('already done')
    expect(read(dir, 'src/App.jsx')).toBe(once)
  })
})

describe('when something is not as expected, it changes nothing', () => {
  it('refuses, and says to install the admin update, if the admin page is not in the app yet', () => {
    const app = fs.readFileSync(FIX, 'utf8').replace(/<Route path="\/admin"[^\n]*\n/, '')
    const dir = project({ app })
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/NOT CHANGED/)
    expect(r.out).toMatch(/admin update/)
    expect(read(dir, 'src/App.jsx')).toBe(app)
    expect(fs.existsSync(path.join(dir, 'src/App.jsx.before-doors'))).toBe(false)
  })
  it('refuses if the admin import has been changed', () => {
    const app = fs.readFileSync(FIX, 'utf8').replace("import AdminConsole from './admin/AdminConsole'", "import AdminConsole from './admin/AdminConsole.jsx'")
    const dir = project({ app })
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/NOT CHANGED/)
    expect(read(dir, 'src/App.jsx')).toBe(app)
  })
  it('tells you to unzip the doors files first if they are missing', () => {
    const dir = project({ withDoorFiles: false })
    const before = read(dir, 'src/App.jsx')
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/Unzip the doors zip first/)
    expect(read(dir, 'src/App.jsx')).toBe(before)
  })
  it('says what is wrong if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doorstest-empty-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/project folder/)
  })
})
