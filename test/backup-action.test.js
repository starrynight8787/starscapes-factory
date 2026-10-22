// @vitest-environment node
// The backup actions on the owner-only server function (22 October 2026): only the owner, only approved tables, safe answers, and the site stays at its function limit.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'

const h = vi.hoisted(() => ({ owner: { ok: true }, fetches: [], reply: null, dbSet: true }))
vi.mock('../lib/ownerGuard.js', () => ({ requireOwner: async () => h.owner, sendDenied: (res) => res.status(403).json({ ok: false, message: 'This is for the shop owner.' }) }))
vi.mock('../lib/orderFlow.js', () => ({ patchOrder: vi.fn(), claimOrder: vi.fn(), placeAndNotify: vi.fn() }))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: vi.fn(), sendNotice: vi.fn(), confirmationProblems: () => [] }))
vi.mock('../lib/creativehubOrders.js', async (importOriginal) => ({ ...(await importOriginal()), creativehubSettings: () => ({ token: 't', base: 'https://ch.test' }), settingsUsable: () => true }))
vi.mock('../lib/serviceKey.js', () => ({
  databaseUrl: () => (h.dbSet ? 'https://db.test' : ''),
  serviceKeys: () => (h.dbSet ? ['k'] : []),
  saidWhat: async () => '',
  serviceFetch: vi.fn(async (path, init) => { h.fetches.push(path); return h.reply(path, init) }),
}))
import handler from '../api/order-actions.js'

const call = async (body, { method = 'POST' } = {}) => {
  const out = { status: null, body: null, headers: {} }
  const res = { setHeader(k, v) { out.headers[k.toLowerCase()] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method, headers: {}, body }, res)
  return out
}
const page = (rows, range = null) => ({ ok: true, status: 200, headers: { get: () => range }, json: async () => rows })
beforeEach(() => { h.owner = { ok: true }; h.fetches = []; h.dbSet = true; h.reply = () => page([{ id: 'a' }], '0-0/1') })

describe('only the owner', () => {
  it.each([['backup_plan', {}], ['backup_page', { table: 'orders', offset: 0 }], ['backup_users', { page: 1 }]])('%s is refused for anyone else, and asks the database nothing', async (action, extra) => {
    h.owner = { ok: false }
    const out = await call({ action, ...extra })
    expect(out.status).toBe(403); expect(h.fetches).toEqual([])
  })
  it('only a POST from the Admin page is accepted (a plain visit is not)', async () => {
    expect((await call({ action: 'backup_plan' }, { method: 'GET' })).status).toBe(405)
    expect(h.fetches).toEqual([])
  })
  it('never lets an answer be kept by the browser or a shared cache (it holds personal details)', async () => {
    const out = await call({ action: 'backup_page', table: 'orders', offset: 0 })
    expect(out.headers['cache-control']).toBe('no-store')
  })
})

describe('the plan', () => {
  it('lists the tables to save and the ones left out, without asking the database anything', async () => {
    const out = await call({ action: 'backup_plan' })
    expect(out.status).toBe(200); expect(out.body.ok).toBe(true)
    expect(out.body.tables.map((t) => t.name)).toContain('orders'); expect(out.body.tables.map((t) => t.name)).not.toContain('instagram_token')
    expect(out.body.left_out.map((t) => t.name)).toContain('instagram_token'); expect(h.fetches).toEqual([])
  })
})

describe('reading a table', () => {
  it('gives a page of an approved table', async () => {
    const out = await call({ action: 'backup_page', table: 'orders', offset: 0 })
    expect(out.status).toBe(200); expect(out.body).toMatchObject({ ok: true, table: 'orders', rows: [{ id: 'a' }], total: 1, next: null })
    expect(h.fetches).toEqual(['/rest/v1/orders?select=*&order=id.asc&limit=1000&offset=0'])
  })
  it.each(['instagram_token', 'email_requests', 'auth.users', 'orders; delete from orders', undefined, 7])('refuses %j with a plain message and asks the database nothing', async (table) => {
    const out = await call({ action: 'backup_page', table, offset: 0 })
    expect(out.status).toBe(400); expect(out.body.message).toMatch(/not a table the backup covers/); expect(h.fetches).toEqual([])
  })
  it('a database that says no gives a plain 502, with nothing that looks like a key and no talk of the Orders panel', async () => {
    h.reply = () => ({ ok: false, status: 500, headers: { get: () => null }, json: async () => ({ message: 'boom' }) })
    const out = await call({ action: 'backup_page', table: 'posts', offset: 0 })
    expect(out.status).toBe(502); expect(out.body.message).toContain('"Posts"'); expect(out.body.message).not.toMatch(/Orders panel/i)
  })
  it('a database that cannot be reached at all is also a plain, kind message (and says nothing was changed)', async () => {
    h.reply = () => { throw new Error('socket hang up: secret-looking-detail') }
    const out = await call({ action: 'backup_page', table: 'posts', offset: 0 })
    expect(out.status).toBe(502); expect(out.body.message).toMatch(/Nothing was changed/); expect(JSON.stringify(out.body)).not.toMatch(/socket|secret-looking/)
  })
  it('with no server database key set, says so (the same rule as every action here)', async () => {
    h.dbSet = false
    expect((await call({ action: 'backup_plan' })).status).toBe(503)
  })
})

describe('the accounts', () => {
  it('gives a page of the list of accounts, and nothing but what a restore needs', async () => {
    h.reply = () => page({ users: [{ id: 'u1', email: 'a@example.com', created_at: 'x', encrypted_password: 'NOPE' }] })
    const out = await call({ action: 'backup_users', page: 1 })
    expect(out.status).toBe(200); expect(out.body.rows[0].id).toBe('u1'); expect(JSON.stringify(out.body)).not.toContain('NOPE')
  })
})

describe('the site stays within its limit of server functions', () => {
  it('the backup added no new function: it lives on the existing owner-only one', () => {
    const files = fs.readdirSync('api').filter((f) => f.endsWith('.js'))
    expect(files.length).toBeLessThanOrEqual(12); expect(files).toContain('order-actions.js')
    expect(files.filter((f) => /backup/i.test(f))).toEqual([])
  })
})
