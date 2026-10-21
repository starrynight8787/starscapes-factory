// @vitest-environment node
// The SERVER reads and writes some tables with its own key (service_role). A table made in the Supabase SQL editor gives that key no permission until it is granted, and without it the
// site fails quietly: on 19 October 2026 "We couldn't check your account" and a membership that was paid for but never recorded were exactly this. This checks that every table the server
// touches (found by looking at api/ and lib/) has its grant line in the file that makes it, so a new table cannot be forgotten.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const sqlFiles = fs.readdirSync('sql').filter((f) => f.endsWith('.sql')).map((f) => ({ file: f, code: fs.readFileSync(path.join('sql', f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n') }))
const made = new Map() // table -> the sql file that makes it
for (const { file, code } of sqlFiles) for (const m of code.matchAll(/create table if not exists public\.([a-z_]+)/gi)) made.set(m[1], file)
const touchedByServer = new Set()
for (const f of [...walk('api'), ...walk('lib')].filter((p) => /\.(js|mjs)$/.test(p))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\/rest\/v1\/([a-z_]+)/g)) touchedByServer.add(m[1])

describe('every table the server touches lets the server\u2019s key in', () => {
  const tables = [...touchedByServer].filter((t) => made.has(t)) // a table made some other way (the starter\u2019s products) is not in these files
  it('finds the tables this checks (so the check cannot quietly check nothing)', () => {
    expect(tables).toEqual(expect.arrayContaining(['orders', 'memberships']))
  })
  for (const table of tables) {
    it(`${table} (made in sql/${made.get(table)}) grants the server's key select, insert, update and delete`, () => {
      const { code } = sqlFiles.find((s) => s.file === made.get(table))
      expect(code, `${table}: grant select, insert, update, delete ... to service_role`).toMatch(new RegExp(`^grant\\s+select,\\s*insert,\\s*update,\\s*delete\\s+on\\s+public\\.${table}\\s+to\\s+service_role;`, 'im'))
    })
  }
  it('gives the newsletter list (which the free ebook now joins, so there is no separate ebook table) and its issues and sends the same: the server\u2019s key only, never visitors or signed-in people', () => {
    const { code } = sqlFiles.find((s) => s.file === 'newsletter.sql')
    for (const table of ['newsletter_subscribers', 'newsletter_issues', 'newsletter_sends']) {
      expect(code, table).toMatch(new RegExp(`^grant\\s+select,\\s*insert,\\s*update,\\s*delete\\s+on\\s+public\\.${table}\\s+to\\s+service_role;`, 'im'))
      expect(code, table).not.toMatch(new RegExp(`grant[^;]*public\\.${table}[^;]*to[^;]*(anon|authenticated)`, 'i'))
    }
  })
  it('never gives the server-only tables to visitors or signed-in people (the grant is for the server\u2019s key alone)', () => {
    for (const table of ['orders']) {
      const { code } = sqlFiles.find((s) => s.file === made.get(table))
      expect(code, table).not.toMatch(new RegExp(`grant[^;]*public\\.${table}[^;]*to[^;]*(anon|authenticated)`, 'i'))
    }
  })
})
