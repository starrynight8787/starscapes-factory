// @vitest-environment node
// The permanent redirects from the prints' old long addresses to their readable ones, the tool that writes them into vercel.json, and the SQL that gives prints their addresses.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { printRedirects, applyRedirects, redirectProblems } from '../scripts/printRedirects.mjs'

const run = promisify(execFile)
const ID = (n) => `0000000${n}-0000-4000-8000-000000000000`
const ROWS = [{ id: ID(2), slug: 'tango' }, { id: ID(1), slug: 'afternoon-sun' }, { id: ID(3), slug: 'oceans-breeze' }]
const CONFIG = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'))

describe('the redirect list', () => {
  it('sends each print\u2019s long address to its readable one, permanently, in a fixed order', () => {
    expect(printRedirects(ROWS)).toEqual([
      { source: `/art-loft/prints/${ID(1)}`, destination: '/art-loft/prints/afternoon-sun', permanent: true },
      { source: `/art-loft/prints/${ID(3)}`, destination: '/art-loft/prints/oceans-breeze', permanent: true },
      { source: `/art-loft/prints/${ID(2)}`, destination: '/art-loft/prints/tango', permanent: true },
    ])
    expect(printRedirects([...ROWS].reverse())).toEqual(printRedirects(ROWS))
  })
  it('leaves out anything that is not a proper long id with a proper readable address, and any repeat', () => {
    const out = printRedirects([{ id: 'not-a-uuid', slug: 'x' }, { id: ID(1), slug: null }, { id: ID(2), slug: 'Bad Slug' }, { id: ID(3), slug: '../etc' }, { id: ID(4), slug: 'a'.repeat(81) }, { id: ID(5), slug: 'ok' }, { id: ID(5), slug: 'ok-again' }, null, undefined, {}])
    expect(out).toEqual([{ source: `/art-loft/prints/${ID(5)}`, destination: '/art-loft/prints/ok', permanent: true }]); expect(printRedirects(null)).toEqual([]); expect(printRedirects('x')).toEqual([])
  })
  it('puts them into vercel.json without touching anything else, replaces its own earlier ones, and keeps any other redirect', () => {
    const mine = printRedirects(ROWS); const other = { source: '/old', destination: '/new', permanent: true }
    const first = applyRedirects({ ...CONFIG, redirects: [other] }, mine)
    expect(first.redirects).toEqual([other, ...mine]); expect(first.crons).toEqual(CONFIG.crons); expect(first.headers).toEqual(CONFIG.headers); expect(first.rewrites).toEqual(CONFIG.rewrites)
    expect(applyRedirects(first, mine)).toEqual(first) // run again: same
    expect(applyRedirects(first, printRedirects([ROWS[0]])).redirects).toEqual([other, ...printRedirects([ROWS[0]])]) // an older print redirect is replaced, not kept
    expect(applyRedirects({ a: 1 }, []).redirects).toBeUndefined(); expect(applyRedirects(null, mine).redirects).toEqual(mine)
  })
  it('knows when a list is wrong: a long address that goes to another long address, a missing "permanent", a repeat, a chain', () => {
    expect(redirectProblems(printRedirects(ROWS))).toEqual([])
    const long = `/art-loft/prints/${ID(1)}`
    expect(redirectProblems([{ source: long, destination: `/art-loft/prints/${ID(2)}`, permanent: true }]).join()).toMatch(/readable/)
    expect(redirectProblems([{ source: long, destination: '/art-loft/prints/a', permanent: false }]).join()).toMatch(/permanent/)
    expect(redirectProblems([{ source: long, destination: '/art-loft/prints/a', permanent: true }, { source: long, destination: '/art-loft/prints/b', permanent: true }]).join()).toMatch(/twice/)
    expect(redirectProblems([{ source: '/art-loft/originals/x', destination: '/art-loft/prints/a', permanent: true }]).join()).toMatch(/not a print/)
    expect(redirectProblems([{ source: long, destination: '/art-loft/prints/a', permanent: true }, { source: `/art-loft/prints/${ID(2)}`, destination: '/art-loft/prints/b', permanent: true }])).toEqual([])
  })
  it('the vercel.json in the project is valid, and any print redirects it already holds are all sound', () => {
    expect(Array.isArray(CONFIG.crons)).toBe(true); expect(CONFIG.rewrites[0].destination).toBe('/index.html'); expect(CONFIG.headers[0].source).toBe('/fonts/(.*)')
    expect(redirectProblems((CONFIG.redirects || []).filter((r) => /^\/art-loft\/prints\//.test(r.source)))).toEqual([])
  })
})

describe('the tool that writes them (tools/make-print-redirects.mjs), run for real against a pretend database', () => {
  let server, base, mode = 'ok'
  const dirs = []
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')
      if (mode === 'refuse') { res.statusCode = 400; return res.end('{"message":"column products.slug does not exist"}') }
      res.end(JSON.stringify(mode === 'empty' ? [] : ROWS))
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(() => { server.close(); while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }) })
  const project = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirtool-')); dirs.push(dir); fs.writeFileSync(path.join(dir, 'vercel.json'), JSON.stringify(CONFIG, null, 2)); return dir }
  const tool = (cwd) => run('node', [path.resolve('tools/make-print-redirects.mjs')], { cwd, encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: base, VITE_SUPABASE_ANON_KEY: 'test-anon-key' } }).then((r) => ({ code: 0, out: r.stdout }), (e) => ({ code: e.code, out: `${e.stdout}${e.stderr}` }))
  it('writes the redirects, changes nothing else, and is safe to run again', async () => {
    mode = 'ok'; const dir = project(); const first = await tool(dir); expect(first.code, first.out).toBe(0); expect(first.out).toMatch(/Wrote 3 permanent redirects/)
    const written = JSON.parse(fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8')); expect(written.redirects).toEqual(printRedirects(ROWS)); expect({ ...written, redirects: undefined }).toEqual({ ...CONFIG, redirects: undefined })
    const text = fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8'); const second = await tool(dir); expect(second.code).toBe(0); expect(fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8')).toBe(text)
  })
  it('STOPS and changes nothing when the database refuses (the address column is not there yet) or has no addresses', async () => {
    for (const m of ['refuse', 'empty']) {
      mode = m; const dir = project(); const before = fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8'); const r = await tool(dir)
      expect(r.code, m).not.toBe(0); expect(r.out).toMatch(/STOPPED/); expect(r.out).toMatch(/print-slugs\.sql/); expect(r.out).toMatch(/Nothing was changed/); expect(fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8')).toBe(before)
    }
  })
  it('STOPS when it has no database settings, and never prints the key', async () => {
    mode = 'ok'; const dir = project(); const r = await run('node', [path.resolve('tools/make-print-redirects.mjs')], { cwd: dir, encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', SUPABASE_URL: '', SUPABASE_ANON_KEY: '' } }).then(() => ({ code: 0, out: '' }), (e) => ({ code: e.code, out: `${e.stdout}${e.stderr}` }))
    expect(r.code).not.toBe(0); expect(r.out).toMatch(/STOPPED/); expect(r.out).not.toContain('test-anon-key')
  })
})

describe('sql/print-slugs.sql', () => {
  const sql = fs.readFileSync(path.resolve('sql/print-slugs.sql'), 'utf8')
  const code = sql.replace(/^--.*$/gm, '')
  it('adds the column, a format rule and a unique index, and can be run twice (everything is "if not exists", "or replace" or "drop ... if exists")', () => {
    expect(code).toMatch(/alter table public\.products add column if not exists slug text;/); expect(code).toMatch(/slug ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/); expect(code).toMatch(/create unique index if not exists products_slug_key on public\.products \(slug\) where slug is not null/)
    expect(code).toMatch(/drop constraint if exists products_slug_format/); expect((code.match(/create or replace function/g) || []).length).toBe(4); expect(code).toMatch(/drop trigger if exists products_set_slug/); expect(code).toMatch(/drop trigger if exists products_keep_slug/)
  })
  it('touches ONLY the products table: no customer, order, member, payment or auth data is mentioned anywhere', () => {
    const tables = new Set([...code.matchAll(/public\.([a-z_]+)/g)].map((m) => m[1])); const functions = new Set(['make_slug', 'next_print_slug', 'set_print_slug', 'keep_print_slug'])
    expect([...tables].filter((t) => !functions.has(t))).toEqual(['products'])
    for (const never of ['orders', 'order_', 'member', 'customer', 'profiles', 'payments', 'auth.', 'email', 'subscribers', 'delete ', 'drop table', 'truncate']) expect(code.toLowerCase(), never).not.toContain(never)
  })
  it('gives only PRINTS an address (originals are left alone), assigns oldest first, and locks an address once it is set', () => {
    expect(code).toMatch(/new\.fulfilment = 'creativehub' and new\.slug is null/); expect(code).toMatch(/where fulfilment = 'creativehub' and slug is null order by created_at, id/)
    expect(code).toMatch(/before insert on public\.products/); expect(code).toMatch(/before update of slug on public\.products/); expect(code).toMatch(/old\.slug is not null and new\.slug is distinct from old\.slug/); expect(code).toMatch(/app\.allow_slug_change/)
    expect(sql).toMatch(/correct any spelling mistake in a print's title first/); expect(sql).toMatch(/select title, slug from public\.products where fulfilment = 'creativehub' order by title/)
  })
})
