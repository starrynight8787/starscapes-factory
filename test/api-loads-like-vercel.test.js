// @vitest-environment node
// WHY THIS TEST EXISTS (23 October 2026): /api/ebook-signup returned 500 in production for days while the whole suite passed. The tests run through Vite, which is happy with an import that has no file extension
// (from '../data/company'). Vercel runs the functions in plain Node ESM, which is NOT: it said "Cannot find module '/var/task/src/data/company'" and the function crashed on loading.
// So this test loads every API function the way Vercel does: in a fresh plain Node process, with no Vite, and fails if any of them cannot even be loaded. It also calls the "is it open?" answer the way Vercel does.
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, normalize, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const API = readdirSync(join(ROOT, 'api')).filter((f) => f.endsWith('.js')).sort()
const EXT = /\.(js|mjs|cjs|json|node)$/
const SPEC = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]+)['"]/g

function reachable() { // every file the API functions can reach, following their relative imports
  const seen = new Set(); const bad = []; const queue = API.map((f) => join('api', f))
  while (queue.length) {
    const f = queue.pop(); if (seen.has(f) || !existsSync(join(ROOT, f))) continue; seen.add(f)
    const src = readFileSync(join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
    for (const m of src.matchAll(SPEC)) {
      const spec = m[1]; const target = normalize(join(dirname(f), spec))
      if (!EXT.test(spec)) bad.push(`${f} imports '${spec}' (needs a file extension, for example '${spec}.js')`)
      const next = EXT.test(spec) ? [target] : [target + '.js', target + '.jsx', join(target, 'index.js')]
      const found = next.find((c) => existsSync(join(ROOT, c)) && statSync(join(ROOT, c)).isFile()); if (found) queue.push(found)
    }
  }
  return { seen, bad }
}

const plainNode = (code, env = {}) => spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: ROOT, encoding: 'utf8', timeout: 30000, env: { PATH: process.env.PATH, ...env } })
// A Vercel function is either one default function, or named handlers for the methods (the two webhooks use POST and GET). Either way something must be exported that can answer a request.
const load = (file) => `const m = await import(${JSON.stringify(pathToFileURL(join(ROOT, 'api', file)).href)}); const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']; if (typeof m.default !== 'function' && !methods.some((k) => typeof m[k] === 'function')) throw new Error('${file} exports nothing that can answer a request')`

describe('the API functions, loaded the way Vercel loads them (plain Node, no Vite)', () => {
  it('there are API functions to check (and the free plan allows 12)', () => { expect(API.length).toBeGreaterThan(0); expect(API.length).toBeLessThanOrEqual(12) })

  it('none of the files an API function can reach has an import without a file extension', () => {
    const { seen, bad } = reachable(); expect(seen.size, 'the scan reached the files').toBeGreaterThan(API.length)
    expect(bad, 'Vercel needs the file extension on every relative import:\n' + bad.join('\n')).toEqual([])
  })

  for (const file of API) {
    it(`api/${file} loads in plain Node and exports a handler`, () => {
      const r = plainNode(load(file)); const why = (r.stderr || '').split('\n').filter((l) => /^\w*Error|Cannot find module|ERR_[A-Z_]+/.test(l.trim()) && !l.includes('await import')).slice(0, 2).join(' | ')
      expect(r.status, `api/${file} crashed on loading, so Vercel would return 500 for every request: ${why}`).toBe(0)
    })
  }

  it('the "is it open?" answer works the way Vercel calls it, and follows NEWSLETTER_OPEN being exactly yes', () => {
    const ask = (env) => { const r = plainNode(`${load('ebook-signup.js')}\nconst out = {}; const res = { setHeader() {}, status(c) { out.status = c; return this }, json(b) { out.body = b; return this } }\nawait m.default({ method: 'GET', query: { newsletter: 'status' }, headers: {} }, res); console.log('RESULT ' + JSON.stringify(out))`, env); expect(r.status, r.stderr).toBe(0); return JSON.parse(r.stdout.split('RESULT ')[1]) }
    expect(ask({})).toEqual({ status: 200, body: { ok: true, open: false } })
    expect(ask({ NEWSLETTER_OPEN: 'yes' })).toEqual({ status: 200, body: { ok: true, open: true } })
    expect(ask({ NEWSLETTER_OPEN: 'Yes' }).body.open, 'only exactly "yes" opens it').toBe(false)
    expect(ask({ NEWSLETTER_OPEN: 'true' }).body.open).toBe(false)
  })

  it('the scheduled jobs in vercel.json point at functions that exist', () => {
    const crons = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).crons || []
    for (const c of crons) expect(API, c.path).toContain(c.path.replace(/^\/api\//, '').split('?')[0] + '.js')
  })
})
