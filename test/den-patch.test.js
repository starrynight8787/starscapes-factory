// @vitest-environment node
// The script that adds Sarah Jr.'s Den to the site: its page, its address, the post's Back link, and its parts of the room data.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import { ROOM_SLUGS } from '../src/rooms/roomsData'

const FIX = path.resolve('test/fixtures/desk')
const DESK_SCRIPT = path.resolve('scripts/add-drafting-desk.mjs')
const ROOMS_SCRIPT = path.resolve('scripts/add-rooms.mjs')
const SCRIPT = path.resolve('scripts/add-sarahs-den.mjs')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function run(file, cwd) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [file], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }
  }
}
const FILES = { app: 'src/App.jsx', rooms: 'src/data/roomImages.js', back: 'src/components/backTarget.js', data: 'src/rooms/roomsData.js', geo: 'src/rooms/roomsGeometry.js' }
const ALL = Object.values(FILES)
const NAMES = "export const channels = [{ slug: 'drafting-desk', name: 'The Drafting Desk' }, { slug: 'sarah-jrs-den', name: \"Sarah Jr.'s Den\" }]\n"
const real = (rel) => fs.readFileSync(path.resolve(rel), 'utf8')

// the room files as they were before the Den: the real ones with the Den's parts taken out (the Nook, added earlier, stays in)
const withoutDen = {
  data: (t) => t.replace(/ {2}'sarah-jrs-den': \{\n(?:.*\n)*? {4}areas: \{\},\n {2}\},\n/, ''),
  geo: (t) => t.replace(/ {2}'sarah-jrs-den': \{\n(?: {4}.*\n)*? {2}\},\n/, ''),
}

// a project as yours is now: the Drafting Desk and the first three rooms already added by their own scripts, and the Den's pictures unzipped
function project({ withNotFound = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dentest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  put(FILES.app, fs.readFileSync(path.join(FIX, 'App.jsx'), 'utf8'))
  put(FILES.rooms, fs.readFileSync(path.join(FIX, 'roomImages.js'), 'utf8'))
  put(FILES.back, fs.readFileSync(path.join(FIX, 'backTarget.js'), 'utf8'))
  put('src/factoryfloor/factoryData.js', fs.readFileSync(path.join(FIX, 'factoryData.js'), 'utf8'))
  put('src/data/channels.js', NAMES)
  put('src/draftingdesk/DraftingDeskRoutes.jsx', 'export default function X() { return null }\n')
  put('src/rooms/RoomScene.jsx', 'export default function X() { return null }\n')
  put('src/rooms/RoomRoutes.jsx', 'export default function X() { return null }\n')
  put('public/scenes/sarah-jrs-den/base.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  put(FILES.data, withoutDen.data(real(FILES.data)))
  put(FILES.geo, withoutDen.geo(real(FILES.geo)))
  for (const [script, name] of [[DESK_SCRIPT, 'desk'], [ROOMS_SCRIPT, 'rooms']]) {
    const r = run(script, dir)
    if (r.code !== 0) throw new Error(`the ${name} script failed in the test set-up: ${r.out}`)
  }
  if (withNotFound) write(dir, FILES.app, read(dir, FILES.app).replace('</Routes>', '  <Route path="*" element={<NotFound />} />\n        </Routes>'))
  return dir
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const write = (dir, rel, text) => fs.writeFileSync(path.join(dir, rel), text)
const snapshot = (dir) => Object.fromEntries(ALL.map((f) => [f, read(dir, f)]))
const routes = (app) => [...app.matchAll(/<Route\b[^\n]*?\bpath=["']([^"']+)["']/g)].map((m) => m[1])
async function load(dir, rel) {
  const out = buildSync({ entryPoints: [path.join(dir, rel)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

describe('the set-up for these tests', () => {
  it('really is a site without the Den, and the real files put it back exactly', () => {
    expect(withoutDen.data(real(FILES.data))).not.toContain("'sarah-jrs-den'")
    expect(withoutDen.geo(real(FILES.geo))).not.toContain("'sarah-jrs-den'")
    expect(withoutDen.data(real(FILES.data))).toContain("'knowledge-nook'")
  })
})

describe('the script and the rooms agree', () => {
  it('adds exactly Sarah Jr.\u2019s Den, which is a room the site has drawn', () => {
    const slugs = fs.readFileSync(SCRIPT, 'utf8').match(/const ROOM_SLUGS = \[([^\]]*)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1))
    expect(slugs).toEqual(['sarah-jrs-den'])
    expect(ROOM_SLUGS).toContain('sarah-jrs-den')
  })
  it('does not touch the stylesheet (the Den uses the ordinary layout, with its heading on the picture)', () => {
    expect(fs.readFileSync(SCRIPT, 'utf8')).not.toMatch(/roomscene/)
  })
})

describe('adding the Den to a site that already has the other rooms', () => {
  it('adds one route for the Den, keeps every page it already had, and does not add a second import', () => {
    const dir = project()
    const before = read(dir, FILES.app)
    const r = run(SCRIPT, dir)
    expect(r.code, r.out).toBe(0)
    expect(r.out).toContain('/sarah-jrs-den/*')
    const after = read(dir, FILES.app)
    expect(routes(after)).toEqual([...routes(before), '/sarah-jrs-den/*'])
    expect((after.match(/import RoomRoutes from/g) || []).length).toBe(1)
    expect(after).toContain('<Route path="/sarah-jrs-den/*" element={<RoomRoutes room="sarah-jrs-den" />} />')
  })
  it('makes the Den open its own page, and leaves every other room exactly as it was', async () => {
    const dir = project()
    const { roomPath: before } = await load(dir, FILES.rooms)
    expect(before('sarah-jrs-den')).toBe('/channel/sarah-jrs-den')
    expect(run(SCRIPT, dir).code).toBe(0)
    const { roomPath } = await load(dir, FILES.rooms)
    expect(roomPath('sarah-jrs-den')).toBe('/sarah-jrs-den')
    for (const slug of ['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'drafting-desk', 'art-loft', 'factory-floor', 'knowledge-nook']) expect(roomPath(slug), slug).toBe(before(slug))
  })
  it('teaches the Back link about the Den', () => {
    const dir = project()
    expect(run(SCRIPT, dir).code).toBe(0)
    expect(read(dir, FILES.back)).toMatch(/const ownRoom = pathname\.match\(\/\^\\\/\([a-z0-9|-]*sarah-jrs-den[a-z0-9|-]*\)/)
  })
  it('puts the Den\u2019s room and measurements into the room files, exactly as the real ones have them', () => {
    const dir = project()
    expect(run(SCRIPT, dir).code).toBe(0)
    expect(read(dir, FILES.data)).toBe(real(FILES.data))
    expect(read(dir, FILES.geo)).toBe(real(FILES.geo))
  })
  it('keeps everything else in those files exactly as you have it, including wording you have changed', () => {
    const dir = project()
    const mine = read(dir, FILES.data).replace('Pick a beaker to see what I am working on.', 'MY OWN WORDS FOR THE HATCHERY.')
    expect(mine).not.toBe(read(dir, FILES.data))
    write(dir, FILES.data, mine)
    expect(run(SCRIPT, dir).code).toBe(0)
    expect(read(dir, FILES.data)).toContain('MY OWN WORDS FOR THE HATCHERY.')
    expect(read(dir, FILES.data)).toContain("name: \"Sarah Jr.'s Den\"")
    expect(read(dir, FILES.data).replace('MY OWN WORDS FOR THE HATCHERY.', 'Pick a beaker to see what I am working on.')).toBe(real(FILES.data))
  })
  it('keeps a copy of each file it changed, ending .before-den', () => {
    const dir = project()
    const snap = snapshot(dir)
    expect(run(SCRIPT, dir).code).toBe(0)
    for (const f of ALL) expect(read(dir, f + '.before-den'), f).toBe(snap[f])
  })
  it('is safe to run twice: the second time changes nothing', () => {
    const dir = project()
    expect(run(SCRIPT, dir).code).toBe(0)
    const once = snapshot(dir)
    const again = run(SCRIPT, dir)
    expect(again.code).toBe(0)
    expect(again.out).toContain('already added')
    expect(snapshot(dir)).toEqual(once)
  })
  it('works on a site that already has the 404 page, and leaves the 404 route where it is', () => {
    const dir = project({ withNotFound: true })
    const before = routes(read(dir, FILES.app))
    expect(before).toContain('*')
    expect(run(SCRIPT, dir).code).toBe(0)
    const after = routes(read(dir, FILES.app))
    expect(after.filter((p) => p === '/sarah-jrs-den/*')).toHaveLength(1)
    expect(after.filter((p) => p === '*')).toHaveLength(1)
    expect(after.length).toBe(before.length + 1)
  })
})

describe('when something is not as expected, it changes nothing at all', () => {
  const breaks = {
    'the list of rooms with their own page is missing': (dir) => write(dir, FILES.rooms, 'export const roomPath = (s) => `/channel/${s}`\n'),
    'App.jsx has no place for the pages': (dir) => write(dir, FILES.app, read(dir, FILES.app).replaceAll('</Routes>', '')),
    'the end of the list of rooms cannot be found': (dir) => write(dir, FILES.data, read(dir, FILES.data).replace('export const ROOM_SLUGS', 'export const SLUGS')),
    'the list of measurements cannot be found': (dir) => write(dir, FILES.geo, read(dir, FILES.geo).replace('export const GEOMETRY', 'export const MEASURES')),
  }
  it.each(Object.keys(breaks))('%s', (what) => {
    const dir = project()
    breaks[what](dir)
    const snap = snapshot(dir)
    const r = run(SCRIPT, dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/Nothing was changed/)
    expect(snapshot(dir)).toEqual(snap)
    for (const f of ALL) expect(fs.existsSync(path.join(dir, f + '.before-den')), f).toBe(false)
  })
  it('says what is wrong if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dentest-empty-'))
    dirs.push(dir)
    const r = run(SCRIPT, dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/project folder/)
  })
})
