// @vitest-environment node
// The health check: it tells you which of your key files are the current ones, and it never changes anything.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/health-check.mjs')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function run(cwd) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }
  }
}
// a copy of the project's key files, to break on purpose
function copy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'healthtest-'))
  dirs.push(dir)
  for (const part of ['src', 'public/scenes', 'public/icons']) fs.cpSync(path.resolve(part), path.join(dir, part), { recursive: true })
  return dir
}
const hashAll = (dir) => {
  const h = crypto.createHash('sha256')
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : h.update(fs.readFileSync(path.join(d, e.name)))))
  walk(dir)
  return h.digest('hex')
}

describe('the health check', () => {
  it('passes on the current project, and says so', () => {
    const r = run(path.resolve('.'))
    expect(r.code, r.out).toBe(0)
    expect(r.out).toMatch(/All \d+ checks passed/)
    expect(r.out).not.toMatch(/PROBLEM/)
  })
  it('flags an old stylesheet, by name, and says which update it came from', () => {
    const dir = copy()
    fs.writeFileSync(path.join(dir, 'src/rooms/roomscene.css'), ".rs-head { }\n.rs[data-room='explorers-bay'] .rs-head { padding-left: 33%; }\n")
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Room pages: Home link row: src\/rooms\/roomscene\.css is an older copy\. It comes from the Home link update/)
    expect(r.out).toMatch(/Drafting Desk and Nook layout/)
    expect(r.out).toMatch(/Paste this whole list to me/)
  })
  it('flags a file that is missing, such as one of the room icons', () => {
    const dir = copy()
    fs.rmSync(path.join(dir, 'public/icons/rooms/art-loft.png'))
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Room icon: Art Loft: public\/icons\/rooms\/art-loft\.png is missing/)
  })
  it('tells apart a Nook that has not been wired in yet: the page and the address are what is missing', () => {
    const dir = copy()
    fs.writeFileSync(path.join(dir, 'src/App.jsx'), fs.readFileSync(path.join(dir, 'src/App.jsx'), 'utf8').replace('<Route path="/knowledge-nook/*" element={<RoomRoutes room="knowledge-nook" />} />', ''))
    fs.writeFileSync(path.join(dir, 'src/data/roomImages.js'), fs.readFileSync(path.join(dir, 'src/data/roomImages.js'), 'utf8').replace("'knowledge-nook': '/knowledge-nook'", ''))
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/App: the Knowledge Nook page/)
    expect(r.out).toMatch(/Room addresses: the Nook opens its own page/)
    expect(r.out).not.toMatch(/PROBLEM\s+Room pages/)   // the stylesheet is fine, so it is not blamed
  })
  it('also checks the Den: its page, its address and its room', () => {
    const dir = copy()
    fs.writeFileSync(path.join(dir, 'src/App.jsx'), fs.readFileSync(path.join(dir, 'src/App.jsx'), 'utf8').replace('<Route path="/sarah-jrs-den/*" element={<RoomRoutes room="sarah-jrs-den" />} />', ''))
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/App: Sarah Jr\.'s Den page/)
    expect(r.out).not.toMatch(/PROBLEM\s+Room pages/)
  })
  it('only reads: it changes nothing, whether it passes or fails', () => {
    const dir = copy()
    const before = hashAll(dir)
    run(dir)
    expect(hashAll(dir)).toBe(before)
    fs.writeFileSync(path.join(dir, 'src/rooms/roomscene.css'), 'old')
    const broken = hashAll(dir)
    run(dir)
    expect(hashAll(dir)).toBe(broken)
  })
})
