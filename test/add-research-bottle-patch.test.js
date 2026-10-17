// @vitest-environment node
// The script that renames Research and gives the bottle its padlock: it edits four existing files and retires two old pictures, exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-research-bottle.py')
const FIX = path.resolve('test/fixtures/research-bottle')
const FILES = ['src/rooms/roomsGeometry.js', 'src/rooms/roomsData.js', 'src/doors/doorsData.js', 'public/scenes/knowledge-nook/geometry.json']
const NEW = ['public/scenes/knowledge-nook/item-research.svg', 'public/scenes/knowledge-nook/item-research-open.svg', 'public/scenes/explorers-bay/item-coming-soon-open.svg']
const OLD = ['public/scenes/knowledge-nook/item-more-shelves.svg', 'public/scenes/knowledge-nook/item-more-shelves-open.svg']
const FIRST = ['src/styles/pages.css']
const flat = (rel) => rel.replace(/\//g, '__')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, old = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'researchtest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8'))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) for (const rel of FIRST) put(rel, '/* from the restyled pages update */\n')
  if (old) for (const rel of OLD) put(rel, '<svg>old</svg>')
  put('package.json', '{}\n')
  put('src/unrelated.js', 'export const x = 1\n')
  return dir
}
const run = (cwd) => {
  try { return { code: 0, out: execFileSync('python3', [SCRIPT], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') } }
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const after = (rel) => fs.readFileSync(path.join(FIX, 'after', flat(rel)), 'utf8')
const before = (rel) => fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8')

describe('adding Research and the bottle padlock', () => {
  it('changes the four files into exactly the finished versions, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of each file as it was, ending .before-research-bottle, and touches nothing else', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-research-bottle`)).toBe(before(rel))
    expect(read(dir, 'src/unrelated.js')).toBe('export const x = 1\n')
  })
  it('is safe to run twice', () => {
    const dir = project()
    run(dir)
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`already done  ${rel}`) }
  })
  it('changes NOTHING if even one file is not the way it expects, and says which', () => {
    const odd = before('public/scenes/knowledge-nook/geometry.json').replace('"more-shelves"', '"more-shelves-changed"')
    expect(odd).not.toBe(before('public/scenes/knowledge-nook/geometry.json'))
    const dir = project({ change: { 'public/scenes/knowledge-nook/geometry.json': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('geometry.json')
    for (const rel of FILES) expect(fs.existsSync(path.join(dir, `${rel}.before-research-bottle`))).toBe(false)
    for (const rel of OLD) expect(fs.existsSync(path.join(dir, rel)), rel).toBe(true) // the old pictures are untouched too
    expect(read(dir, 'src/doors/doorsData.js')).toBe(before('src/doors/doorsData.js'))
  })
  it('leaves a file that is already changed alone, and still changes the rest', () => {
    const done = after('src/rooms/roomsGeometry.js')
    expect(done).not.toBe(before('src/rooms/roomsGeometry.js'))
    const dir = project({ change: { 'src/rooms/roomsGeometry.js': done } })
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    expect(r.out).toContain('already done  src/rooms/roomsGeometry.js')
    expect(r.out).toContain('changed       src/rooms/roomsData.js')
    expect(read(dir, 'src/rooms/roomsGeometry.js')).toBe(done)
    expect(read(dir, 'src/rooms/roomsData.js')).toBe(after('src/rooms/roomsData.js'))
  })
  it('retires the two old pictures by renaming them (keeping a copy), and only after everything else is in place', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of OLD) {
      expect(fs.existsSync(path.join(dir, rel)), rel).toBe(false)
      expect(fs.existsSync(path.join(dir, `${rel}.before-research-bottle`)), rel).toBe(true)
      expect(r.out).toContain(`retired       ${rel}`)
    }
  })
  it('refuses unless the restyled pages update is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the restyled pages update first/)
    expect(read(dir, 'src/doors/doorsData.js')).toBe(before('src/doors/doorsData.js'))
    for (const rel of OLD) expect(fs.existsSync(path.join(dir, rel)), rel).toBe(true)
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-research-bottle-17oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('says so if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'researchtest-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOT FOUND/)
  })
})
