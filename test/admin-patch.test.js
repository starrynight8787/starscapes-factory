// @vitest-environment node
// The script that puts the Admin button in the menu and the /admin page in the app.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-admin-button.py')
const FIX = path.resolve('test/fixtures/admin')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

const FILES = { nav: 'src/components/Navbar.jsx', app: 'src/App.jsx' }
function project({ withAdminFiles = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admintest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  put(FILES.nav, fs.readFileSync(path.join(FIX, 'Navbar.before.jsx'), 'utf8'))
  put(FILES.app, fs.readFileSync(path.join(FIX, 'App.before.jsx'), 'utf8'))
  if (withAdminFiles) for (const f of ['src/admin/AdminConsole.jsx', 'src/admin/useIsOwner.js', 'src/admin/adminTools.js', 'api/is-owner.js']) put(f, '// stand-in\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const write = (dir, rel, text) => fs.writeFileSync(path.join(dir, rel), text)

describe('adding the Admin button to a project like yours', () => {
  it('puts the button in the computer menu and the phone menu, and the page in the app', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    const nav = read(dir, FILES.nav)
    expect(nav).toContain("import useIsOwner from '../admin/useIsOwner'")
    expect(nav).toContain('const isOwner = useIsOwner(session)')
    expect((nav.match(/\{isOwner && \(/g) || []).length).toBe(2)
    expect((nav.match(/to="\/admin"/g) || []).length).toBe(2)
    const app = read(dir, FILES.app)
    expect(app).toContain("import AdminConsole from './admin/AdminConsole'")
    expect(app).toMatch(/<Route path="\/admin" element=\{ <ProtectedRoute session=\{session\}> <AdminConsole session=\{session\} \/> <\/ProtectedRoute> \} \/>/)
  })
  it('takes New post and New product out of the menu, but leaves their pages in the app', () => {
    const dir = project()
    run(dir)
    expect(read(dir, FILES.nav)).not.toMatch(/New post|New product|to="\/new/)
    expect(read(dir, FILES.app)).toContain('path="/new-product"')
    expect(read(dir, FILES.app)).toContain('path="/new"')
  })
  it('changes nothing else in either file: undoing the added lines gives back exactly what was there', () => {
    const dir = project()
    run(dir)
    const nav = read(dir, FILES.nav)
      .replace("import useIsOwner from '../admin/useIsOwner'\n", '')
      .replace('  const isOwner = useIsOwner(session)\n', '')
    // what remains differs from the original only where the New post and New product links used to be
    const original = fs.readFileSync(path.join(FIX, 'Navbar.before.jsx'), 'utf8')
    const strip = (t) => t.replace(/\s*\{isOwner && \([\s\S]*?\n\s*\)\}\n/g, '\n').replace(/\s*<Link to="\/new[\s\S]*?<\/Link>\n/g, '\n').replace(/\s*\{session && \(\s*<>\s*<\/>\s*\)\}\n/g, '\n')
    const lines = (t) => t.split('\n').map((l) => l.trim()).filter((l) => l && !/^(<>|<\/>|\)\}|\{session && \()$/.test(l))
    expect(lines(strip(nav)).filter((l) => !/New post|New product|Admin/.test(l))).toEqual(lines(strip(original)).filter((l) => !/New post|New product|Admin/.test(l)))
    const app = read(dir, FILES.app).replace("import AdminConsole from './admin/AdminConsole'\n", '').replace(/<Route path="\/admin"[^\n]*\n/, '')
    expect(app).toBe(fs.readFileSync(path.join(FIX, 'App.before.jsx'), 'utf8'))
  })
  it('keeps a copy of each file it changed, ending .before-admin', () => {
    const dir = project()
    run(dir)
    expect(read(dir, FILES.nav + '.before-admin')).toBe(fs.readFileSync(path.join(FIX, 'Navbar.before.jsx'), 'utf8'))
    expect(read(dir, FILES.app + '.before-admin')).toBe(fs.readFileSync(path.join(FIX, 'App.before.jsx'), 'utf8'))
  })
  it('is safe to run twice: the second time changes nothing', () => {
    const dir = project()
    run(dir)
    const once = [read(dir, FILES.nav), read(dir, FILES.app)]
    const again = run(dir)
    expect(again.code).toBe(0)
    expect(again.out).toContain('already done')
    expect([read(dir, FILES.nav), read(dir, FILES.app)]).toEqual(once)
  })
})

describe('when something is not as expected, it changes neither file', () => {
  const breaks = {
    'the computer menu links have been changed': (dir) => write(dir, FILES.nav, read(dir, FILES.nav).replace('<Link to="/new" className="sf-link">', '<Link to="/new" className="sf-link sf-link--mine">')),
    'the phone menu links have been changed': (dir) => write(dir, FILES.nav, read(dir, FILES.nav).replace('{session && (', '{session && session.user && (')),
    'the start of the Navbar is different': (dir) => write(dir, FILES.nav, read(dir, FILES.nav).replace('export default function Navbar({ session }) {', 'export default function Navbar(props) {\n  const { session } = props')),
    'the cart import is missing': (dir) => write(dir, FILES.nav, read(dir, FILES.nav).replace("import CartNavLink from '../cart/CartNavLink'\n", '')),
    'the New product route has been changed': (dir) => write(dir, FILES.app, read(dir, FILES.app).replace('<NewProduct session={session} />', '<NewProduct session={session} extra />')),
    'the NewProduct import has been changed': (dir) => write(dir, FILES.app, read(dir, FILES.app).replace("import NewProduct from './pages/NewProduct'", "import NewProduct from './pages/NewProduct.jsx'")),
  }
  it.each(Object.keys(breaks))('%s', (what) => {
    const dir = project()
    breaks[what](dir)
    const before = [read(dir, FILES.nav), read(dir, FILES.app)]
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/NOT CHANGED/)
    expect([read(dir, FILES.nav), read(dir, FILES.app)]).toEqual(before)
    expect(fs.existsSync(path.join(dir, FILES.nav + '.before-admin'))).toBe(false)
    expect(fs.existsSync(path.join(dir, FILES.app + '.before-admin'))).toBe(false)
  })
  it('tells you to unzip the admin files first if they are missing, and changes nothing', () => {
    const dir = project({ withAdminFiles: false })
    const before = [read(dir, FILES.nav), read(dir, FILES.app)]
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/Unzip the admin zip first/)
    expect([read(dir, FILES.nav), read(dir, FILES.app)]).toEqual(before)
  })
  it('says what is wrong if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admintest-empty-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/project folder|Unzip the admin zip first/)
  })
})
