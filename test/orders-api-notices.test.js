// @vitest-environment node
// The owner's list of orders asks for what the new Orders panel needs (the Stripe payment reference for the refund link, and the notice and refund columns), falls back safely if
// the new columns are not there yet, and the SQL file makes exactly the columns the code reads.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

const h = vi.hoisted(() => ({ asked: [], failFirst: 0 }))
vi.mock('../lib/ownerGuard.js', () => ({ requireOwner: async () => ({ ok: true }), sendDenied: (res) => res.status(403).json({ ok: false }) }))
vi.mock('../lib/invoiceData.js', () => ({ buildInvoice: () => ({}), isSessionId: () => false }))
vi.mock('../lib/serviceKey.js', () => ({
  databaseUrl: () => 'https://db.test', serviceKeys: () => ['k'], saidWhat: async () => '',
  serviceFetch: async (path) => { h.asked.push(path); const n = h.asked.length; return n <= h.failFirst ? { ok: false, status: 400, json: async () => ({}) } : { ok: true, status: 200, json: async () => [{ id: 'o1' }] } },
}))
import handler from '../api/orders.js'

const get = async () => { const out = { status: null, body: null }; const res = { setHeader() {}, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }; await handler({ method: 'GET', headers: {}, query: {} }, res); return out }
const columnsOf = (path) => decodeURIComponent(path).match(/select=([^&]*)/)[1].split(',')
const NEW = ['notice_kind', 'notice_status', 'notice_note', 'notice_sent_at', 'refunded_at', 'owner_alert_status', 'owner_alert_sent_at']
beforeEach(() => { h.asked = []; h.failFirst = 0 })

describe('the orders list', () => {
  it('asks for the Stripe payment reference and the new notice and refund columns, first of all', async () => {
    const out = await get()
    expect(out.status).toBe(200); expect(out.body.ok).toBe(true)
    const cols = columnsOf(h.asked[0])
    expect(cols).toContain('stripe_payment_intent')
    for (const c of NEW) expect(cols, c).toContain(c)
  })
  it('still lists the orders when the new columns have not been added yet (it asks again without them), and keeps the payment reference, which was always there', async () => {
    h.failFirst = 1
    const out = await get()
    expect(out.body.ok).toBe(true); expect(h.asked).toHaveLength(2)
    const cols = columnsOf(h.asked[1])
    for (const c of NEW) expect(cols, c).not.toContain(c)
    expect(cols).toContain('stripe_payment_intent'); expect(cols).toContain('confirmation_status'); expect(cols).toContain('dispatch_status')
  })
  it('keeps falling back, one set of extra columns at a time, down to the original columns, and still finds the payment reference', async () => {
    h.failFirst = 4
    const out = await get()
    expect(out.body.ok).toBe(true); expect(h.asked).toHaveLength(5)
    const last = columnsOf(h.asked[4])
    expect(last).toContain('stripe_payment_intent'); expect(last).toContain('status'); expect(last).not.toContain('confirmation_status')
  })
})

describe('sql/orders-notices.sql', () => {
  const sql = readFileSync('sql/orders-notices.sql', 'utf8')
  it('adds exactly the columns the list reads, safely (it can be run twice)', () => {
    const added = [...sql.matchAll(/add column if not exists (\w+) (\w+)/g)].map((m) => m[1])
    expect(added.sort()).toEqual([...NEW].sort())
    expect(sql.match(/alter table public\.orders/g)).toHaveLength(NEW.length)
    expect(sql).not.toMatch(/drop |delete |truncate /i)
  })
  it('puts the dates in timestamp columns and the rest in text', () => {
    for (const c of ['notice_sent_at', 'refunded_at', 'owner_alert_sent_at']) expect(sql).toMatch(new RegExp(`add column if not exists ${c} timestamptz`))
    for (const c of ['notice_kind', 'notice_status', 'notice_note', 'owner_alert_status']) expect(sql).toMatch(new RegExp(`add column if not exists ${c} text`))
  })
  it('needs no new permission or status rule (the orders table has no status restriction), and the orders file lists the statuses in use', () => {
    const statements = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n') // the SQL itself, not its comments
    expect(statements).not.toMatch(/grant|policy|constraint|check \(/i)
    const orders = readFileSync('sql/orders.sql', 'utf8')
    for (const s of ['held', 'sending', 'needs_attention', 'check_creativehub', 'sent', 'refunded', 'test_not_sent']) expect(orders, s).toContain(s)
    expect(orders).not.toMatch(/check \(status/i)
  })
})
