// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(path.resolve('sql/doors.sql'), 'utf8')
const lock = fs.readFileSync(path.resolve('sql/lock-editing-to-owner.sql'), 'utf8')
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')

describe('the doors table (sql/doors.sql)', () => {
  it('makes a doors table keyed by room and door, closed unless it says otherwise', () => {
    expect(code).toMatch(/create table if not exists public\.doors/)
    expect(code).toMatch(/primary key \(room, door\)/)
    expect(code).toMatch(/open boolean not null default false/)
  })
  it('turns on row level security, so the rules below are what decide who can do what', () => {
    expect(code).toMatch(/alter table public\.doors enable row level security/)
  })
  it('lets everyone read which doors are open, and nothing more than reading', () => {
    expect(code).toMatch(/create policy "anyone can see which doors are open" on public\.doors for select to anon, authenticated using \(true\)/)
    const reads = code.match(/for select/g) || []
    expect(reads).toHaveLength(1)
  })
  it('lets only the owner add, change or delete a door', () => {
    for (const verb of ['insert', 'update', 'delete']) expect(code, verb).toMatch(new RegExp(`for ${verb} to authenticated`))
    expect((code.match(/lower\(auth\.jwt\(\) ->> 'email'\) = '/g) || []).length).toBe(4) // insert check, update using and check, delete using
    expect(code).not.toMatch(/to anon[^;]*(insert|update|delete)/i)
  })
  it('uses the same owner email as the rule that locks your products, posts and photos', () => {
    const owner = lock.match(/lower\(auth\.jwt\(\) -> *> 'email'\) = '([^']+)'/) || lock.match(/= '([a-z0-9._@-]+)'/)
    const mine = [...code.matchAll(/= '([a-z0-9._@-]+@[a-z0-9.-]+)'/g)].map((m) => m[1])
    expect(owner).toBeTruthy()
    expect(new Set(mine).size).toBe(1)
    expect(mine[0]).toBe(owner[1])
  })
  it('is safe to run twice, and can be undone', () => {
    expect(code).not.toMatch(/create policy "[^"]+" on public\.doors[^;]*;\s*create policy "\1"/)
    for (const name of ['anyone can see which doors are open', 'only the owner opens doors', 'only the owner changes doors', 'only the owner deletes doors']) expect(code, name).toContain(`drop policy if exists "${name}" on public.doors`)
    expect(sql).toMatch(/--\s+drop table if exists public\.doors/)
  })
  it('tells you to check the email before running it', () => {
    expect(sql).toMatch(/BEFORE YOU RUN IT/)
  })
})
