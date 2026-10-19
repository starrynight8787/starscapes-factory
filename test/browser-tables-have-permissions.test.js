// @vitest-environment node
// A table made in the Supabase SQL editor cannot be read by the website until it is granted permission, however good its rules are. (The doors table was missing
// this, and the Open a door page said "I could not read the doors".) This checks every table the BROWSER code reads has its permission line in its database file.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const sqlFiles = fs.readdirSync('sql').filter((f) => f.endsWith('.sql')).map((f) => ({ file: f, code: fs.readFileSync(path.join('sql', f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n') }))
const created = new Map() // table -> the sql file that makes it
for (const { file, code } of sqlFiles) for (const m of code.matchAll(/create table if not exists public\.([a-z_]+)/gi)) created.set(m[1], file)
const browser = new Set()
for (const f of walk('src').filter((p) => /\.(js|jsx)$/.test(p) && !p.includes('before-'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\.from\('([a-z_]+)'\)/g)) browser.add(m[1])

describe('every table the website reads from the browser has its permission line', () => {
  const readByBrowser = [...created.keys()].filter((t) => browser.has(t))
  it('finds the tables this checks (so the check cannot quietly check nothing)', () => {
    expect(readByBrowser).toEqual(expect.arrayContaining(['doors', 'events', 'site_settings', 'books']))
  })
  for (const table of readByBrowser) {
    it(`${table} (made in sql/${created.get(table)}) is readable by the website`, () => {
      const { code } = sqlFiles.find((s) => s.file === created.get(table))
      expect(code, `${table}: grant select ... to anon or authenticated`).toMatch(new RegExp(`^grant\\s+[a-z, ]*\\bselect\\b[a-z, ]*\\s+on\\s+[^;]*public\\.${table}\\b[^;]*to\\s+[^;]*(anon|authenticated)`, 'im'))
    })
  }
  it('leaves the tables only the server touches without any permission for visitors', () => {
    for (const table of ['orders', 'ebook_signups']) {
      expect(browser.has(table), `${table} is not read from the browser`).toBe(false)
      const { code } = sqlFiles.find((s) => s.file === created.get(table))
      expect(code, table).not.toMatch(new RegExp(`grant[^;]*public\\.${table}[^;]*to[^;]*(anon|authenticated)`, 'i'))
    }
  })
})
