import { serviceFetch, saidWhat } from './serviceKey.js'
import { BACKUP_TABLES, LEFT_OUT } from './backupTables.js'

// Reading the shop's data for the owner's backup (22 October 2026). The owner's browser asks one small page at a time, because a server function may not answer with more than about
// 4.5 MB, and puts the pages together into one file on the owner's own computer. Nothing is stored anywhere else.
// ONLY tables in BACKUP_TABLES can be read: the table name the browser sends is checked against that list and nothing else, so a secret (the Instagram token, for one) cannot be asked for.
export const MAX_ROWS = 1000
export const MAX_BYTES = 3000000

export const tableByName = (name) => BACKUP_TABLES.find((t) => t.name === name) || null

export function backupPlan() {
  return { tables: BACKUP_TABLES.map((t) => ({ name: t.name, label: t.label })), left_out: LEFT_OUT.map((t) => ({ name: t.name, why: t.why })) }
}

const total = (range) => {
  const m = /\/(\d+)\s*$/.exec(String(range || ''))
  return m ? Number(m[1]) : null
}

// One page of one table, in a fixed order. "next" is where the next page starts, or null when there is no more. A page is cut short if it would be too big to send.
export async function readTablePage(name, offset) {
  const table = tableByName(name)
  if (!table) return { ok: false, status: 400, message: 'That is not a table the backup covers.' }
  const start = Number.isInteger(offset) && offset >= 0 ? offset : 0
  const order = table.order.map((c) => `${c}.asc`).join(',')
  const response = await serviceFetch(`/rest/v1/${table.name}?select=*&order=${order}&limit=${MAX_ROWS}&offset=${start}`, { headers: { Accept: 'application/json', Prefer: 'count=exact' } })
  if (!response.ok) return { ok: false, status: 502, message: `The database would not give up "${table.label}" just now (${(await saidWhat(response)) || 'no reason given'}).` }
  const rows = await response.json()
  if (!Array.isArray(rows)) return { ok: false, status: 502, message: `The database gave an answer for "${table.label}" that I could not read.` }
  const kept = []
  let used = 0
  for (const row of rows) {
    const size = JSON.stringify(row).length + 1
    if (kept.length > 0 && used + size > MAX_BYTES) break
    kept.push(row)
    used += size
  }
  const finished = kept.length === rows.length && rows.length < MAX_ROWS
  return { ok: true, table: table.name, rows: kept, total: total(response.headers.get('content-range')), next: finished ? null : start + kept.length }
}

const PER_PAGE = 200

// The list of accounts (the sign-in system keeps it apart from the tables). Passwords are never in it: the sign-in system does not give them to anyone, even the owner.
export async function readUsersPage(page) {
  const p = Number.isInteger(page) && page >= 1 ? page : 1
  const response = await serviceFetch(`/auth/v1/admin/users?page=${p}&per_page=${PER_PAGE}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) return { ok: false, status: 502, message: 'The list of accounts could not be read just now.' }
  const body = await response.json()
  const users = Array.isArray(body && body.users) ? body.users : []
  const rows = users.map((u) => ({
    id: u.id,
    email: u.email || null,
    created_at: u.created_at || null,
    email_confirmed_at: u.email_confirmed_at || u.confirmed_at || null,
    last_sign_in_at: u.last_sign_in_at || null,
    banned_until: u.banned_until || null,
    app_metadata: u.app_metadata || {},
    user_metadata: u.user_metadata || {},
  }))
  return { ok: true, rows, next: users.length >= PER_PAGE ? p + 1 : null }
}
