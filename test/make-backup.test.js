// @vitest-environment node
// Putting the owner's backup together in her browser (22 October 2026). A fake server stands in for the real one; no real data is ever used.
import { describe, it, expect, vi } from 'vitest'
import { makeBackup, backupFileName, BackupError, BACKUP_KIND } from '../src/admin/makeBackup'
import { backupPlan } from '../lib/backupData.js'
import { BACKUP_TABLE_NAMES } from '../lib/backupTables.js'

const PLAN = backupPlan()
// A fake server: every table has `sizes[name]` rows (default 2), handed out `pageSize` at a time; the accounts come 2 per page.
function server({ sizes = {}, pageSize = 1000, accounts = 3, failOn = null, breakAccounts = false, stall = null, forever = null, wrongTotal = null } = {}) {
  const log = []
  const call = vi.fn(async (action, extra = {}) => {
    log.push([action, extra])
    if (action === 'backup_plan') return { ok: true, ...PLAN }
    if (action === 'backup_page') {
      if (failOn === extra.table) throw new Error('the database would not give it up')
      const n = sizes[extra.table] ?? 2
      const start = extra.offset
      const end = Math.min(n, start + pageSize)
      const rows = Array.from({ length: end - start }, (_, i) => ({ id: `${extra.table}-${start + i}` }))
      if (stall === extra.table) return { ok: true, rows, total: n, next: extra.offset } // never moves on
      if (forever === extra.table) return { ok: true, rows, total: n, next: extra.offset + 1 } // never ends
      return { ok: true, rows, total: wrongTotal && wrongTotal.table === extra.table ? wrongTotal.total : n, next: end >= n ? null : end }
    }
    if (action === 'backup_users') {
      if (breakAccounts) throw new Error('no')
      const per = 2, start = (extra.page - 1) * per, end = Math.min(accounts, start + per)
      return { ok: true, rows: Array.from({ length: Math.max(0, end - start) }, (_, i) => ({ id: `user-${start + i}` })), next: end >= accounts ? null : extra.page + 1 }
    }
    throw new Error('unexpected ' + action)
  })
  return { call, log }
}
const NOW = () => new Date(2026, 9, 22, 18, 30, 5) // 22 October 2026, 18:30 local time

describe('a good backup', () => {
  it('has every table the server listed, with every row, and says what it is, when it was made, and that it holds personal details', async () => {
    const s = server(); const { file, summary } = await makeBackup({ call: s.call, now: NOW })
    expect(file.kind).toBe(BACKUP_KIND); expect(file.version).toBe(1); expect(file.made_at).toBe(NOW().toISOString())
    expect(Object.keys(file.tables)).toEqual(BACKUP_TABLE_NAMES)
    for (const name of BACKUP_TABLE_NAMES) { expect(file.tables[name], name).toHaveLength(2); expect(file.counts[name]).toBe(2) }
    expect(file.about).toMatch(/personal details/); expect(file.about).toMatch(/passwords/); expect(file.about).toMatch(/keep it private/i)
    expect(summary).toMatchObject({ tables: BACKUP_TABLE_NAMES.length, rows: BACKUP_TABLE_NAMES.length * 2 + 3, accountsIncluded: true, warnings: [] })
  })
  it('keeps the accounts apart from the tables, with their count, and says what was left out on purpose', async () => {
    const { file } = await makeBackup({ call: server().call, now: NOW })
    expect(file.accounts).toMatchObject({ included: true }); expect(file.accounts.rows).toHaveLength(3); expect(file.counts.accounts).toBe(3)
    expect(file.left_out.map((t) => t.name)).toEqual(['instagram_token', 'email_requests'])
    expect(Object.keys(file.tables)).not.toContain('instagram_token')
  })
  it('joins a table that comes in several pages, in order, with no row repeated or missing', async () => {
    const s = server({ sizes: { posts: 7, orders: 5 }, pageSize: 3, accounts: 5 })
    const { file } = await makeBackup({ call: s.call, now: NOW })
    expect(file.tables.posts.map((r) => r.id)).toEqual(Array.from({ length: 7 }, (_, i) => `posts-${i}`))
    expect(file.tables.orders).toHaveLength(5); expect(file.accounts.rows.map((r) => r.id)).toEqual(['user-0', 'user-1', 'user-2', 'user-3', 'user-4'])
    expect(s.log.filter(([a, e]) => a === 'backup_page' && e.table === 'posts').map(([, e]) => e.offset)).toEqual([0, 3, 6])
  })
  it('an empty table is fine: it is saved as nothing, not skipped', async () => {
    const { file } = await makeBackup({ call: server({ sizes: { orders: 0 } }).call, now: NOW })
    expect(file.tables.orders).toEqual([]); expect(file.counts.orders).toBe(0)
  })
  it('is plain JSON that survives being saved and read back exactly', async () => {
    const { file } = await makeBackup({ call: server().call, now: NOW })
    expect(JSON.parse(JSON.stringify(file))).toEqual(file)
  })
  it('names the file with the date and time, so one backup never overwrites another', () => {
    expect(backupFileName(new Date(2026, 9, 22, 18, 30))).toBe('starscapes-factory-backup-2026-10-22-1830.json')
    expect(backupFileName(new Date(2026, 0, 5, 7, 4))).toBe('starscapes-factory-backup-2026-01-05-0704.json')
  })
})

describe('telling the screen what is happening', () => {
  it('reports each table as it is read and as it is saved, then the accounts last, counting up to the end', async () => {
    const seen = []; const s = server()
    await makeBackup({ call: s.call, now: NOW, onProgress: (p) => seen.push(p) })
    const n = BACKUP_TABLE_NAMES.length
    expect(seen[0]).toMatchObject({ state: 'working', table: BACKUP_TABLE_NAMES[0], finished: 0, of: n + 1 })
    expect(seen[1]).toMatchObject({ state: 'done', table: BACKUP_TABLE_NAMES[0], rows: 2, finished: 1 })
    expect(seen.at(-1)).toMatchObject({ state: 'done', table: 'accounts', finished: n + 1, of: n + 1, rows: 3 })
    const done = seen.filter((p) => p.state === 'done').map((p) => p.finished); expect(done).toEqual([...done].sort((a, b) => a - b))
  })
})

describe('a backup that did not work is NOT saved as if it had', () => {
  it('stops at the first table that cannot be read, names it, says nothing was saved, and gives no file at all', async () => {
    const s = server({ failOn: 'posts' })
    const run = makeBackup({ call: s.call, now: NOW })
    await expect(run).rejects.toBeInstanceOf(BackupError)
    await expect(run).rejects.toThrow(/"Posts"/); await expect(run).rejects.toThrow(/Nothing was saved/)
    expect(s.log.some(([a, e]) => a === 'backup_page' && e.table === 'products')).toBe(false) // it did not carry on regardless
  })
  it('a server that never moves on is stopped at once (not after hundreds of pages), with nothing saved', async () => {
    const s = server({ stall: 'orders' })
    await expect(makeBackup({ call: s.call, now: NOW })).rejects.toThrow(/did not move on/)
    await expect(makeBackup({ call: server({ stall: 'orders' }).call, now: NOW })).rejects.toThrow(/Nothing was saved/)
    expect(s.log.filter(([a]) => a === 'backup_page').length).toBeLessThanOrEqual(2)
  })
  it('a server that never says "that is all" is stopped after a very large number of pages, not left running', async () => {
    const s = server({ forever: 'orders' })
    await expect(makeBackup({ call: s.call, now: NOW })).rejects.toThrow(/did not come to an end/)
    expect(s.log.filter(([a]) => a === 'backup_page').length).toBeLessThanOrEqual(501)
  })
  it('a plan with no tables in it is refused, not saved as an empty backup', async () => {
    const call = vi.fn(async () => ({ ok: true, tables: [], left_out: [] }))
    await expect(makeBackup({ call, now: NOW })).rejects.toThrow(/Nothing was saved/)
  })
  it('an answer that is not rows is refused', async () => {
    const call = vi.fn(async (a) => (a === 'backup_plan' ? { ok: true, ...PLAN } : { ok: true }))
    await expect(makeBackup({ call, now: NOW })).rejects.toThrow(/Nothing was saved/)
  })
})

describe('things that are worth saying but do not spoil the backup', () => {
  it('if the list of accounts cannot be read, the rest is still saved, the file says so, and the screen is told', async () => {
    const { file, summary } = await makeBackup({ call: server({ breakAccounts: true }).call, now: NOW })
    expect(file.accounts).toMatchObject({ included: false, rows: [] }); expect(file.counts.accounts).toBe(0)
    expect(summary.accountsIncluded).toBe(false); expect(summary.warnings.join(' ')).toMatch(/list of accounts could not be included/)
    expect(Object.keys(file.tables)).toEqual(BACKUP_TABLE_NAMES)
  })
  it('if a table changed while it was being read (the total at the start is not what arrived), it says so, and still saves it', async () => {
    const { file, summary } = await makeBackup({ call: server({ wrongTotal: { table: 'orders', total: 9 } }).call, now: NOW })
    expect(file.tables.orders).toHaveLength(2); expect(summary.warnings).toHaveLength(1); expect(summary.warnings[0]).toMatch(/"Orders" changed while the backup was running/)
  })
  it('a table whose total matches adds no warning', async () => {
    expect((await makeBackup({ call: server().call, now: NOW })).summary.warnings).toEqual([])
  })
})
