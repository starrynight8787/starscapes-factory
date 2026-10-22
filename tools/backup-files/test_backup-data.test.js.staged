// @vitest-environment node
// Reading the shop's data for the owner's backup, a page at a time (22 October 2026). All with a pretend database: no real data is ever used here.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ calls: [], reply: null }))
vi.mock('../lib/serviceKey.js', () => ({
  serviceFetch: vi.fn(async (path, init) => { h.calls.push({ path, init }); return h.reply(path, init) }),
  saidWhat: async (response) => { try { const b = await response.json(); return [b.code, b.message].filter(Boolean).join(': ').replace(/[A-Za-z0-9._-]{30,}/g, '\u2026') } catch (e) { return '' } },
}))
import { readTablePage, readUsersPage, backupPlan, tableByName, MAX_ROWS, MAX_BYTES } from '../lib/backupData.js'
import { BACKUP_TABLES, LEFT_OUT } from '../lib/backupTables.js'

const answer = (rows, range = null, status = 200) => ({ ok: status < 400, status, headers: { get: (k) => (k.toLowerCase() === 'content-range' ? range : null) }, json: async () => rows })
const rows = (n, start = 0, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: start + i, note: 'x', ...extra }))
beforeEach(() => { h.calls = []; h.reply = () => answer([]) })

describe('only the approved tables can be read', () => {
  it.each(['instagram_token', 'email_requests', 'auth.users', 'users', 'orders; drop table orders', '../orders', 'ORDERS', '', undefined, null, 5, 'pg_catalog.pg_user'])('refuses %j, and never asks the database', async (name) => {
    const r = await readTablePage(name, 0)
    expect(r).toMatchObject({ ok: false, status: 400 }); expect(h.calls).toEqual([])
  })
  it('knows every approved table by its name, and nothing else', () => {
    for (const t of BACKUP_TABLES) expect(tableByName(t.name)).toBe(t)
    for (const t of LEFT_OUT) expect(tableByName(t.name)).toBeNull()
  })
})

describe('asking for one page', () => {
  it('asks for the table in a fixed order, a page at a time, and wants the total too', async () => {
    h.reply = () => answer(rows(2), '0-1/2')
    await readTablePage('orders', 0)
    expect(h.calls[0].path).toBe(`/rest/v1/orders?select=*&order=id.asc&limit=${MAX_ROWS}&offset=0`)
    expect(h.calls[0].init.headers).toMatchObject({ Prefer: 'count=exact' })
  })
  it('reads a table with a two-part key in both parts, so no row is repeated or missed', async () => {
    await readTablePage('doors', 0)
    expect(h.calls[0].path).toContain('order=room.asc,door.asc')
    await readTablePage('story_chapters', 0)
    expect(h.calls[1].path).toContain('order=story_id.asc,number.asc')
  })
  it('turns a strange start into the beginning (never a negative, fractional or text offset)', async () => {
    for (const bad of [-5, 1.5, 'abc', null, undefined, NaN, '10']) { h.calls = []; await readTablePage('posts', bad); expect(h.calls[0].path, String(bad)).toMatch(/offset=0$/) }
    await readTablePage('posts', 2000); expect(h.calls.at(-1).path).toMatch(/offset=2000$/)
  })
  it('returns the rows, the table\u2019s total, and says there is no more when the page is not full', async () => {
    h.reply = () => answer(rows(3), '0-2/3')
    const r = await readTablePage('orders', 0)
    expect(r).toMatchObject({ ok: true, table: 'orders', total: 3, next: null }); expect(r.rows).toHaveLength(3)
  })
  it('reads the total from the range the database gives, and says null when it does not give one (an empty table says */0)', async () => {
    h.reply = () => answer([], '*/0'); expect((await readTablePage('orders', 0)).total).toBe(0)
    h.reply = () => answer(rows(1), null); expect((await readTablePage('orders', 0)).total).toBeNull()
    h.reply = () => answer(rows(1), 'garbage'); expect((await readTablePage('orders', 0)).total).toBeNull()
  })
  it('a full page means there may be more: the next page starts where this one ended', async () => {
    h.reply = () => answer(rows(MAX_ROWS), `0-${MAX_ROWS - 1}/1500`)
    expect(await readTablePage('posts', 0)).toMatchObject({ next: MAX_ROWS })
    expect(await readTablePage('posts', 1000)).toMatchObject({ next: 2 * MAX_ROWS })
  })
})

describe('a page is never too big to send', () => {
  it('cuts a page short when it would pass the size limit, and says where to carry on', async () => {
    const big = 'y'.repeat(900000)
    h.reply = () => answer([{ id: 1, body: big }, { id: 2, body: big }, { id: 3, body: big }, { id: 4, body: big }, { id: 5, body: big }], '0-4/5')
    const r = await readTablePage('posts', 10)
    expect(r.rows.length).toBeLessThan(5); expect(r.rows.length).toBeGreaterThan(0)
    expect(JSON.stringify(r.rows).length).toBeLessThanOrEqual(MAX_BYTES + 10)
    expect(r.next).toBe(10 + r.rows.length)
  })
  it('a single huge row is still returned, so the backup always moves forward', async () => {
    h.reply = () => answer([{ id: 1, body: 'z'.repeat(MAX_BYTES + 5000) }, { id: 2 }], '0-1/2')
    const r = await readTablePage('posts', 0)
    expect(r.rows).toHaveLength(1); expect(r.next).toBe(1)
  })
})

describe('when the database says no', () => {
  it('says so in plain words naming the table, with no key or stack in it', async () => {
    h.reply = () => answer({ code: 'PGRST301', message: 'JWT expired eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdefghijklmnopqrstuv' }, null, 503)
    const r = await readTablePage('orders', 0)
    expect(r).toMatchObject({ ok: false, status: 502 }); expect(r.message).toContain('"Orders"'); expect(r.message).not.toMatch(/eyJ|[A-Za-z0-9._-]{30,}/)
  })
  it('an answer that is not a list is refused, not passed on', async () => {
    h.reply = () => answer({ message: 'surprise' })
    expect(await readTablePage('orders', 0)).toMatchObject({ ok: false, status: 502 })
  })
})

describe('the list of accounts', () => {
  const user = (n) => ({ id: `u${n}`, email: `person${n}@example.com`, created_at: '2026-10-01T00:00:00Z', email_confirmed_at: '2026-10-02T00:00:00Z', last_sign_in_at: null, banned_until: null, app_metadata: { provider: 'email' }, user_metadata: { name: 'x' }, encrypted_password: 'SHOULD-NEVER-APPEAR', confirmation_token: 'SHOULD-NEVER-APPEAR', recovery_token: 'SHOULD-NEVER-APPEAR', identities: [{ identity_data: { secret: 'SHOULD-NEVER-APPEAR' } }] })
  it('keeps only what a restore needs (who they are, when they joined and signed in), and drops everything else, so no hash or token can leak', async () => {
    h.reply = () => answer({ users: [user(1), user(2)] })
    const r = await readUsersPage(1)
    expect(r.ok).toBe(true); expect(r.rows).toHaveLength(2)
    expect(Object.keys(r.rows[0]).sort()).toEqual(['app_metadata', 'banned_until', 'created_at', 'email', 'email_confirmed_at', 'id', 'last_sign_in_at', 'user_metadata'])
    expect(JSON.stringify(r)).not.toContain('SHOULD-NEVER-APPEAR')
  })
  it('asks a page at a time, and carries on while a page is full', async () => {
    h.reply = () => answer({ users: Array.from({ length: 200 }, (_, i) => user(i)) })
    expect(await readUsersPage(1)).toMatchObject({ next: 2 }); expect(h.calls[0].path).toBe('/auth/v1/admin/users?page=1&per_page=200')
    h.reply = () => answer({ users: [user(1)] })
    expect(await readUsersPage(2)).toMatchObject({ next: null })
  })
  it('turns a strange page number into page 1, and says so plainly if the list cannot be read', async () => {
    for (const bad of [0, -1, 1.5, 'x', null, undefined]) { h.calls = []; await readUsersPage(bad); expect(h.calls[0].path, String(bad)).toContain('page=1&') }
    h.reply = () => answer({}, null, 500)
    expect(await readUsersPage(1)).toMatchObject({ ok: false, status: 502 })
  })
  it('an answer with no users in it is an empty list, not an error', async () => {
    h.reply = () => answer({ nothing: true })
    expect(await readUsersPage(1)).toMatchObject({ ok: true, rows: [], next: null })
  })
})

describe('the plan', () => {
  it('says which tables will be saved (with their plain-English names) and which are left out and why, and nothing else', () => {
    const p = backupPlan()
    expect(Object.keys(p).sort()).toEqual(['left_out', 'tables'])
    expect(p.tables.map((t) => t.name)).toEqual(BACKUP_TABLES.map((t) => t.name)); expect(p.tables.every((t) => Object.keys(t).sort().join() === 'label,name')).toBe(true)
    expect(p.left_out.map((t) => t.name)).toEqual(['instagram_token', 'email_requests'])
  })
})
