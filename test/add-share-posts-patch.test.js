// @vitest-environment node
// The script that adds the share pages to the one existing file: exact, all-or-nothing, backed up, safe to run twice.
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = path.resolve('tools/add-share-posts.py')
const FIX = path.resolve('test/fixtures/share-posts')
const FILES = ['scripts/make-share-pages.mjs']
const NEW = ['scripts/dynamicPages.mjs']
const FIRST = ['scripts/shareHead.mjs', 'src/data/pageMeta.js']
const flat = (rel) => rel.replace(/\//g, '__')
const dirs = []
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })

function project({ newFiles = true, first = true, change = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharepoststest-'))
  dirs.push(dir)
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  for (const rel of FILES) put(rel, change[rel] ?? fs.readFileSync(path.join(FIX, 'before', flat(rel)), 'utf8'))
  if (newFiles) for (const rel of NEW) put(rel, '// new file\n')
  if (first) for (const rel of FIRST) put(rel, '// from the share pages update\n')
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

describe('adding the share previews for posts and prints', () => {
  it('changes the file into exactly the finished version, and says so', () => {
    const dir = project()
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`changed       ${rel}`) }
  })
  it('keeps a copy of the file as it was, ending .before-share-posts, and touches nothing else', () => {
    const dir = project()
    run(dir)
    for (const rel of FILES) expect(read(dir, `${rel}.before-share-posts`)).toBe(before(rel))
    expect(read(dir, 'src/unrelated.js')).toBe('export const x = 1\n')
  })
  it('is safe to run twice', () => {
    const dir = project()
    run(dir)
    const r = run(dir)
    expect(r.code, r.out).toBe(0)
    for (const rel of FILES) { expect(read(dir, rel)).toBe(after(rel)); expect(r.out).toContain(`already done  ${rel}`) }
  })
  it('changes NOTHING if the file is not the way it expects, and says which', () => {
    const odd = before('scripts/make-share-pages.mjs').replace("import { renderHead, fileFor, sitemapXml } from './shareHead.mjs'", "import { renderHead, fileFor, sitemapXml, extra } from './shareHead.mjs'")
    expect(odd).not.toBe(before('scripts/make-share-pages.mjs'))
    const dir = project({ change: { 'scripts/make-share-pages.mjs': odd } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOTHING WAS CHANGED/)
    expect(r.out).toContain('scripts/make-share-pages.mjs')
    expect(fs.existsSync(path.join(dir, 'scripts/make-share-pages.mjs.before-share-posts'))).toBe(false)
    expect(read(dir, 'scripts/make-share-pages.mjs')).toBe(odd)
  })
  it('refuses a half-done file rather than guessing', () => {
    const half = before('scripts/make-share-pages.mjs').replace("import { createServer } from 'vite'\n", "import { createServer, loadEnv } from 'vite'\n")
    expect(half).not.toBe(before('scripts/make-share-pages.mjs'))
    const dir = project({ change: { 'scripts/make-share-pages.mjs': half } })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toContain('scripts/make-share-pages.mjs')
    expect(read(dir, 'scripts/make-share-pages.mjs')).toBe(half)
  })
  it('refuses unless the share pages update is installed first, and changes nothing', () => {
    const dir = project({ first: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Install the share pages update first/)
    expect(read(dir, 'scripts/make-share-pages.mjs')).toBe(before('scripts/make-share-pages.mjs'))
  })
  it('asks you to unzip first if the new files are not there, and changes nothing', () => {
    const dir = project({ newFiles: false })
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/Unzip starscapes-share-posts-17oct\.zip/)
    for (const rel of FILES) expect(read(dir, rel)).toBe(before(rel))
  })
  it('says so if it is run from the wrong folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharepoststest-'))
    dirs.push(dir)
    const r = run(dir)
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/NOT FOUND/)
  })
})
