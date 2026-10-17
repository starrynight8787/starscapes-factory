// @vitest-environment node
// The script that adds the three illustrated rooms to the site: their pages, their addresses, and the post's Back link.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { buildSync, transformSync } from 'esbuild'
import { ROOM_SLUGS as EVERY_ROOM } from '../src/rooms/roomsData'

// the rooms this script adds: the Knowledge Nook and Sarah Jr.'s Den were added later, by their own scripts (see nook-patch.test.js and den-patch.test.js)
const ROOM_SLUGS = EVERY_ROOM.filter((s) => !['knowledge-nook', 'sarah-jrs-den'].includes(s))

const FIX = path.resolve('test/fixtures/desk')
const DESK_SCRIPT = path.resolve('scripts/add-drafting-desk.mjs')
const SCRIPT = path.resolve('scripts/add-rooms.mjs')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function run(file, cwd) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [file], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }
  }
}
const FILES = { app: 'src/App.jsx', rooms: 'src/data/roomImages.js', back: 'src/components/backTarget.js' }
const NAMES = "export const channels = [{ slug: 'drafting-desk', name: 'The Drafting Desk' }, { slug: 'factory-floor', name: 'The Factory Floor' }, { slug: 'explorers-bay', name: \"Explorer's Bay\" }, { slug: 'idea-hatchery', name: 'The Idea Hatchery' }, { slug: 'leadership-lounge', name: 'Leadership Lounge' }]\n"

// a project as yours is now: everything from earlier updates, the Drafting Desk already added by its own script, and the new files unzipped
function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roomstest-'))
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
  for (const f of ['roomsData.js', 'roomsGeometry.js']) put(`src/rooms/${f}`, fs.readFileSync(path.resolve('src/rooms', f), 'utf8'))   // the real ones: the Back link uses them
  const desk = run(DESK_SCRIPT, dir)
  if (desk.code !== 0) throw new Error('the desk script failed in the test set-up: ' + desk.out)
  return dir
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const write = (dir, rel, text) => fs.writeFileSync(path.join(dir, rel), text)
const snapshot = (dir) => Object.fromEntries(Object.values(FILES).map((f) => [f, read(dir, f)]))
const patch = (dir) => run(SCRIPT, dir)
const noBackups = (dir) => Object.values(FILES).forEach((f) => expect(fs.existsSync(path.join(dir, f + '.before-rooms')), f).toBe(false))
async function load(dir, rel) {
  const out = buildSync({ entryPoints: [path.join(dir, rel)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
}
const routes = (text) => Array.from(text.matchAll(/<Route\b[^\n]*?\bpath=["']([^"']+)["']/g)).map((m) => m[1])

describe('the script and the rooms agree', () => {
  it('knows exactly the rooms the site has drawn', () => {
    const slugs = fs.readFileSync(SCRIPT, 'utf8').match(/const ROOM_SLUGS = \[([^\]]*)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1))
    expect(slugs).toEqual(ROOM_SLUGS)
  })
})

describe('adding the three rooms to a site that already has the Drafting Desk', () => {
  it('starts with rooms that open the generic room list and a Back link that does not know them, as on your site now', async () => {
    const dir = project()
    const { roomPath } = await load(dir, FILES.rooms)
    ROOM_SLUGS.forEach((s) => expect(roomPath(s), s).toBe(`/channel/${s}`))
    const { targetFromPath } = await load(dir, FILES.back)
    expect(targetFromPath('/idea-hatchery')).toBe(null)
  })
  it('does all three changes and says what it did', () => {
    const dir = project()
    const r = patch(dir)
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/Done\./)
    expect(r.out).toMatch(/App\.jsx: added the pages for idea-hatchery, leadership-lounge, explorers-bay/)
    expect(r.out).toMatch(/roomImages\.js: idea-hatchery, leadership-lounge, explorers-bay now open their own pages/)
    expect(r.out).toMatch(/backTarget\.js: the Back link on a post now returns to the room page it came from/)
    ROOM_SLUGS.forEach((s) => expect(r.out).toContain(`/${s}/*`))
  })
  it('adds exactly one import and one route for each room to App.jsx, and keeps every page it already had, the Drafting Desk included', () => {
    const dir = project()
    const before = read(dir, FILES.app)
    patch(dir)
    const after = read(dir, FILES.app)
    expect(after.match(/import RoomRoutes from/g)).toHaveLength(1)
    ROOM_SLUGS.forEach((s) => expect(routes(after).filter((p) => p === `/${s}/*`), s).toHaveLength(1))
    expect(routes(after)).toEqual([...routes(before), ...ROOM_SLUGS.map((s) => `/${s}/*`)])
    expect(routes(after)).toContain('/drafting-desk/*')
    expect(after.split('\n').filter((l) => !l.includes('RoomRoutes')).join('\n')).toBe(before)
    expect(() => transformSync(after, { loader: 'jsx' })).not.toThrow()
  })
  it('makes each new room open its own page, and leaves every other room exactly as it was', async () => {
    const dir = project()
    patch(dir)
    const { roomPath } = await load(dir, FILES.rooms)
    ROOM_SLUGS.forEach((s) => expect(roomPath(s), s).toBe(`/${s}`))
    expect(roomPath('drafting-desk')).toBe('/drafting-desk')
    expect(roomPath('art-loft')).toBe('/art-loft')
    expect(roomPath('factory-floor')).toBe('/factory-floor')
    for (const slug of ['sarah-jrs-den', 'knowledge-nook']) expect(roomPath(slug), slug).toBe(`/channel/${slug}`)
  })
  it('changes one thing in the rooms file: three more entries in the list', () => {
    const dir = project()
    const before = read(dir, FILES.rooms)
    patch(dir)
    const after = read(dir, FILES.rooms)
    expect(after.replace(ROOM_SLUGS.map((s) => `, '${s}': '/${s}'`).join(''), '')).toBe(before)
  })
  it('makes the Back link on a post return to the exact page the reader came from, named by that page', async () => {
    const dir = project()
    patch(dir)
    const { targetFromPath, targetFromPost } = await load(dir, FILES.back)
    expect(targetFromPath('/idea-hatchery')).toEqual({ to: '/idea-hatchery', label: 'The Idea Hatchery' })
    expect(targetFromPath('/idea-hatchery/stop-motion')).toEqual({ to: '/idea-hatchery/stop-motion', label: 'Stop Motion' })
    expect(targetFromPath('/idea-hatchery/stop-motion/')).toEqual({ to: '/idea-hatchery/stop-motion/', label: 'Stop Motion' })
    expect(targetFromPath('/leadership-lounge/leading-from-the-middle')).toEqual({ to: '/leadership-lounge/leading-from-the-middle', label: 'Leading from the Middle' })
    expect(targetFromPath('/explorers-bay/photography?page=2')).toEqual({ to: '/explorers-bay/photography?page=2', label: 'Photography' })
    expect(targetFromPath('/explorers-bay')).toEqual({ to: '/explorers-bay', label: "Explorer's Bay" })
    // a name that is not an area of the room, or one that could confuse a lookup, falls back to the room's name
    expect(targetFromPath('/idea-hatchery/zzz')).toEqual({ to: '/idea-hatchery/zzz', label: 'The Idea Hatchery' })
    expect(targetFromPath('/idea-hatchery/__proto__').label).toBe('The Idea Hatchery')
    expect(targetFromPath('/idea-hatchery/constructor').label).toBe('The Idea Hatchery')
    // and a post written in one of these rooms, with no memory of where the reader came from, goes back to the room
    expect(targetFromPost({ channel: 'idea-hatchery', tags: [] })).toEqual({ to: '/idea-hatchery', label: 'The Idea Hatchery' })
    expect(targetFromPost({ channel: 'explorers-bay' })).toEqual({ to: '/explorers-bay', label: "Explorer's Bay" })
  })
  it('does not disturb what the Back link already did for other places', async () => {
    const dir = project()
    patch(dir)
    const { targetFromPath, targetFromPost } = await load(dir, FILES.back)
    expect(targetFromPath('/')).toEqual({ to: '/', label: 'the homepage' })
    expect(targetFromPath('/blog')).toEqual({ to: '/blog', label: 'all posts' })
    expect(targetFromPath('/factory-floor/blueprints')).toEqual({ to: '/factory-floor/blueprints', label: 'Factory Blueprints' })
    expect(targetFromPath('/art-loft/prints?collection=x')).toEqual({ to: '/art-loft/prints?collection=x', label: 'The Art Loft' })
    expect(targetFromPath('/drafting-desk/archive-entries')).toEqual({ to: '/drafting-desk/archive-entries', label: 'Archive Entries' })
    expect(targetFromPath('/channel/explorers-bay')).toEqual({ to: '/channel/explorers-bay', label: "Explorer's Bay" })
    expect(targetFromPath('/post/abc')).toBe(null)
    expect(targetFromPost({ channel: 'factory-floor', tags: ['blueprints'] }).to).toBe('/factory-floor/blueprints')
    expect(targetFromPost({}).to).toBe('/blog')
  })
  it('never sends a reader somewhere that is not a page of its own site', async () => {
    const dir = project()
    patch(dir)
    const { targetFromPath } = await load(dir, FILES.back)
    for (const bad of ['//evil.example/idea-hatchery', 'https://evil.example/idea-hatchery', '/idea-hatchery-x', '/idea-hatcheryx/a', '/idea-hatchery/a/b', '/x/idea-hatchery', 'idea-hatchery', '', null, undefined, 42]) {
      expect(targetFromPath(bad), String(bad)).toBe(null)
    }
  })
  it('adds only an import and two lines to the Back-link file, and nothing else', () => {
    const dir = project()
    const before = read(dir, FILES.back)
    patch(dir)
    const after = read(dir, FILES.back)
    const mine = (l) => l.includes('backLabel') || l.includes('const ownRoom')
    expect(after.split('\n').filter(mine)).toHaveLength(3)
    expect(after.split('\n').filter((l) => !mine(l)).join('\n')).toBe(before)
    expect(() => transformSync(after, { loader: 'js' })).not.toThrow()
  })
  it('makes a backup of each file it changed, holding exactly what was there (the desk\'s changes included), and nothing else', () => {
    const dir = project()
    const before = snapshot(dir)
    patch(dir)
    Object.values(FILES).forEach((f) => expect(read(dir, f + '.before-rooms'), f).toBe(before[f]))
    const made = fs.readdirSync(path.join(dir, 'src'), { recursive: true }).filter((f) => String(f).endsWith('.before-rooms')).sort()
    expect(made).toEqual(['App.jsx.before-rooms', 'components/backTarget.js.before-rooms', 'data/roomImages.js.before-rooms'].sort())
  })
  it('leaves the files it only needs to find alone', () => {
    const dir = project()
    const stubs = ['src/rooms/RoomRoutes.jsx', 'src/rooms/RoomScene.jsx', 'src/rooms/roomsData.js', 'src/rooms/roomsGeometry.js', 'src/data/channels.js', 'src/factoryfloor/factoryData.js', 'src/draftingdesk/DraftingDeskRoutes.jsx'].map((f) => [f, read(dir, f)])
    patch(dir)
    stubs.forEach(([f, text]) => expect(read(dir, f), f).toBe(text))
  })
  it('is safe to run again: the second time it changes nothing and says so', () => {
    const dir = project()
    patch(dir)
    const once = snapshot(dir)
    const backups = Object.values(FILES).map((f) => read(dir, f + '.before-rooms'))
    const r = patch(dir)
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/already added\. Nothing to do/)
    expect(snapshot(dir)).toEqual(once)
    expect(Object.values(FILES).map((f) => read(dir, f + '.before-rooms'))).toEqual(backups)     // your original files are never overwritten by a later backup
  })
  it('finishes the job if only some of it was done before', async () => {
    const dir = project()
    patch(dir)
    fs.copyFileSync(path.join(dir, FILES.rooms + '.before-rooms'), path.join(dir, FILES.rooms))
    fs.copyFileSync(path.join(dir, FILES.back + '.before-rooms'), path.join(dir, FILES.back))
    const appNow = read(dir, FILES.app)
    const r = patch(dir)
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/App\.jsx: the room pages were already there/)
    expect(r.out).toMatch(/roomImages\.js: idea-hatchery, leadership-lounge, explorers-bay now open/)
    expect(read(dir, FILES.app)).toBe(appNow)                                                    // not added a second time
    expect((await load(dir, FILES.rooms)).roomPath('explorers-bay')).toBe('/explorers-bay')
    expect((await load(dir, FILES.back)).targetFromPath('/explorers-bay/photography').label).toBe('Photography')
  })
  it('adds a room that was left out earlier, to pages and Back link that already know the others', async () => {
    const dir = project()
    patch(dir)
    // pretend an earlier version of the script only knew two rooms: take the third out of all three files
    write(dir, FILES.app, read(dir, FILES.app).split('\n').filter((l) => !l.includes('"/explorers-bay/*"')).join('\n'))
    write(dir, FILES.rooms, read(dir, FILES.rooms).replace(", 'explorers-bay': '/explorers-bay'", ''))
    write(dir, FILES.back, read(dir, FILES.back).replace('|explorers-bay', ''))
    const r = patch(dir)
    expect(r.code).toBe(0)
    expect(routes(read(dir, FILES.app)).filter((p) => p === '/explorers-bay/*')).toHaveLength(1)
    expect(routes(read(dir, FILES.app)).filter((p) => p === '/idea-hatchery/*')).toHaveLength(1)   // and not the others a second time
    expect((await load(dir, FILES.rooms)).roomPath('explorers-bay')).toBe('/explorers-bay')
    expect((await load(dir, FILES.back)).targetFromPath('/explorers-bay').label).toBe("Explorer's Bay")
    expect(read(dir, FILES.back).match(/import \{ backLabel \}/g)).toHaveLength(1)
  })
})

describe('when a file is not what the script expects, it changes none of them', () => {
  const unchanged = (dir, before) => { expect(snapshot(dir)).toEqual(before); noBackups(dir) }
  it('says so if the new room files have not been unzipped yet', () => {
    const dir = project()
    fs.rmSync(path.join(dir, 'src/rooms/RoomRoutes.jsx'))
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/Nothing was changed/)
    expect(r.out).toMatch(/RoomRoutes\.jsx/)
    expect(r.out).toMatch(/unzipped the update first/)
    unchanged(dir, before)
  })
  it('says so if run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roomstest-empty-'))
    dirs.push(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/cd ~\/Website\/supabase-blog-starter/)
  })
  it('stops, and changes not even the files it could have done, if App.jsx has nowhere to put the pages', () => {
    const dir = project()
    write(dir, FILES.app, read(dir, FILES.app).replace('</Routes>', ''))
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/cat src\/App\.jsx/)
    unchanged(dir, before)
  })
  it('stops, and changes nothing, if the rooms file does not have the list I add to', () => {
    const dir = project()
    write(dir, FILES.rooms, 'export const roomPath = (s) => `/channel/${s}`\n')
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/OWN_PAGE/)
    expect(r.out).toMatch(/cat src\/data\/roomImages\.js/)
    unchanged(dir, before)
  })
  it('stops if the rooms list is not written as a plain list', () => {
    const dir = project()
    write(dir, FILES.rooms, read(dir, FILES.rooms).replace(/const OWN_PAGE\s*=\s*\{[^}]*\}/, 'const OWN_PAGE = { ...other }'))
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/cat src\/data\/roomImages\.js/)
    unchanged(dir, before)
  })
  it('stops if one of the rooms is already sent somewhere else, rather than overriding it', () => {
    const dir = project()
    write(dir, FILES.rooms, read(dir, FILES.rooms).replace(/(const OWN_PAGE\s*=\s*\{)/, "$1 'explorers-bay': '/somewhere-else',"))
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/explorers-bay already sends|already sends explorers-bay/)
    unchanged(dir, before)
  })
  it('stops, and changes nothing, if the Back-link file has no place to put the lines', () => {
    const dir = project()
    write(dir, FILES.back, read(dir, FILES.back).split('\n').filter((l) => !/startsWith\('\/art-loft\/'\)/.test(l)).join('\n'))
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/cat src\/components\/backTarget\.js/)
    unchanged(dir, before)
  })
  it('stops if that line is there more than once, rather than guessing which', () => {
    const dir = project()
    const text = read(dir, FILES.back)
    const line = text.split('\n').find((l) => /startsWith\('\/art-loft\/'\)/.test(l))
    write(dir, FILES.back, text.replace(line, line + '\n' + line))
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/found it 2 times/)
    unchanged(dir, before)
  })
  it('stops if the Back-link file has no import lines to put its own beside', () => {
    const dir = project()
    write(dir, FILES.back, read(dir, FILES.back).split('\n').filter((l) => !/^import /.test(l)).join('\n'))
    const before = snapshot(dir)
    const r = patch(dir)
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/import lines/)
    unchanged(dir, before)
  })
  it('always tells you what to send me when it stops', () => {
    const dir = project()
    write(dir, FILES.app, read(dir, FILES.app).replace('</Routes>', ''))
    expect(patch(dir).out).toMatch(/Send me the output of: cat /)
  })
})

describe('on files written slightly differently from yours', () => {
  it('copes with a rooms list written over several lines', async () => {
    const dir = project()
    write(dir, FILES.rooms, read(dir, FILES.rooms).replace(/const OWN_PAGE\s*=\s*\{([^}]*)\}/, (m, body) => `const OWN_PAGE = {\n${body.split(',').map((e) => '  ' + e.trim()).filter((e) => e.trim()).join(',\n')},\n}`))
    const r = patch(dir)
    expect(r.code).toBe(0)
    const { roomPath } = await load(dir, FILES.rooms)
    ROOM_SLUGS.forEach((s) => expect(roomPath(s), s).toBe(`/${s}`))
    expect(roomPath('art-loft')).toBe('/art-loft')
    expect(roomPath('drafting-desk')).toBe('/drafting-desk')
  })
  it('copes with a multi-line list that has no comma after its last entry', async () => {
    const dir = project()
    write(dir, FILES.rooms, read(dir, FILES.rooms).replace(/const OWN_PAGE\s*=\s*\{([^}]*)\}/, (m, body) => `const OWN_PAGE = {\n${body.split(',').map((e) => '  ' + e.trim()).filter((e) => e.trim()).join(',\n')}\n}`))
    expect(patch(dir).code).toBe(0)
    const { roomPath } = await load(dir, FILES.rooms)
    ROOM_SLUGS.forEach((s) => expect(roomPath(s), s).toBe(`/${s}`))
    expect(roomPath('drafting-desk')).toBe('/drafting-desk')
  })
  it('keeps Windows line endings in every file, if that is what they use', async () => {
    const dir = project()
    for (const f of Object.values(FILES)) write(dir, f, read(dir, f).replace(/\r?\n/g, '\r\n'))
    expect(patch(dir).code).toBe(0)
    for (const f of Object.values(FILES)) {
      const text = read(dir, f)
      expect(text.includes('\r\n'), f).toBe(true)
      expect(/[^\r]\n/.test(text), `${f} has a bare line ending`).toBe(false)
    }
    expect((await load(dir, FILES.rooms)).roomPath('idea-hatchery')).toBe('/idea-hatchery')
    expect((await load(dir, FILES.back)).targetFromPath('/idea-hatchery/stop-motion').label).toBe('Stop Motion')
  })
  it('copes with imports spread over several lines at the top of App.jsx and of the Back-link file', async () => {
    const dir = project()
    write(dir, FILES.app, read(dir, FILES.app).replace(/^import \{ Routes, Route \} from 'react-router-dom'/m, "import {\n  Routes,\n  Route,\n} from 'react-router-dom'"))
    write(dir, FILES.back, read(dir, FILES.back).replace("import { channels } from '../data/channels'", "import {\n  channels,\n} from '../data/channels'"))
    const r = patch(dir)
    expect(r.code).toBe(0)
    expect(() => transformSync(read(dir, FILES.app), { loader: 'jsx' })).not.toThrow()
    expect((await load(dir, FILES.back)).targetFromPath('/leadership-lounge/blog').label).toBe('Blog')
  })
  it('copes with tabs for indentation', async () => {
    const dir = project()
    for (const f of [FILES.app, FILES.back]) write(dir, f, read(dir, f).replace(/^( {2})+/gm, (m) => '\t'.repeat(m.length / 2)))
    expect(patch(dir).code).toBe(0)
    expect(read(dir, FILES.app)).toMatch(/\t\t?<Route path="\/idea-hatchery\/\*"/)
    expect((await load(dir, FILES.back)).targetFromPath('/explorers-bay/photography').label).toBe('Photography')
  })
})
