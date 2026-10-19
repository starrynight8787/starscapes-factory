// @vitest-environment node
// The memberships database file (sql/memberships.sql): who may read what, and that nobody can write from a browser.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(path.resolve('sql/memberships.sql'), 'utf8')
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')

describe('the memberships table', () => {
  it('has one row per member, tied to their account and removed if the account is', () => {
    expect(code).toMatch(/create table if not exists public\.memberships \(\s*user_id uuid primary key references auth\.users \(id\) on delete cascade/)
  })
  it('keeps the Stripe references, which passes, how they pay, when it renews and whether it is cancelled', () => {
    for (const col of ['stripe_customer_id text unique', 'stripe_subscription_id text unique', "passes text[] not null default '{}'", "billing_interval text check (billing_interval in ('month', 'year'))", 'current_period_end timestamptz', 'cancel_at_period_end boolean not null default false', 'offer_ends_at timestamptz']) expect(code, col).toContain(col)
  })
  it('keeps the record of what the customer agreed to at checkout (the tick box wording, and when), and adds those columns to a table made earlier too', () => {
    expect(code).toMatch(/consent_at timestamptz,\s*consent_text text,/)
    expect(code).toMatch(/alter table public\.memberships add column if not exists consent_at timestamptz;/); expect(code).toMatch(/alter table public\.memberships add column if not exists consent_text text;/)
  })
  it('only allows the payment states Stripe uses', () => {
    expect(code).toMatch(/check \(status in \('incomplete', 'active', 'trialing', 'past_due', 'unpaid', 'canceled'\)\)/)
  })
  it('turns on row level security and lets a member read only their own row', () => {
    expect(code).toMatch(/alter table public\.memberships enable row level security/)
    expect(code).toMatch(/create policy "see your own membership" on public\.memberships for select to authenticated using \(user_id = auth\.uid\(\)\)/)
  })
  it('can be READ by a signed-in member, and cannot be written from a browser at all', () => {
    expect(code).toMatch(/^grant select on public\.memberships to authenticated;$/m)
    expect(code).not.toMatch(/grant [a-z, ]*(insert|update|delete|all)[a-z, ]* on public\.memberships/i)
    expect(code).not.toMatch(/on public\.memberships for (insert|update|delete)/)
    expect(code).not.toMatch(/grant [^;]* on public\.memberships to [^;]*anon/i)
  })
})

describe('the founding members table', () => {
  it('has one row per founder, tied to their account, with a name only when they say it may show', () => {
    expect(code).toMatch(/create table if not exists public\.founding_members \(\s*user_id uuid primary key references auth\.users \(id\) on delete cascade/)
    expect(code).toMatch(/show_name boolean not null default false/)
    expect(code).toMatch(/check \(not show_name or \(display_name is not null and length\(btrim\(display_name\)\) > 0\)\)/)
  })
  it('lets anyone read the NAME of a founder who opted in, one column at a time, and never who they are (no user_id)', () => {
    expect(code).toMatch(/create policy "anyone can see the names on the wall" on public\.founding_members for select to anon, authenticated using \(show_name = true\)/)
    const grants = [...code.matchAll(/^grant select \(([^)]*)\) on public\.founding_members to ([^;]+);$/gm)]
    expect(grants.length).toBeGreaterThan(0)
    for (const g of grants) expect(g[1], 'columns anyone can read').not.toMatch(/user_id/)
    expect(code).not.toMatch(/^grant select on public\.founding_members/m) // never the whole table
  })
  it('lets a founder choose whether their name shows and what it is, on their own row only', () => {
    expect(code).toMatch(/create policy "choose whether your name shows" on public\.founding_members for update to authenticated\s+using \(user_id = auth\.uid\(\)\)\s+with check \(user_id = auth\.uid\(\)\)/)
    expect(code).toMatch(/^grant update \(display_name, show_name\) on public\.founding_members to authenticated;$/m)
  })
  it('gives nobody the right to add or delete founders from a browser', () => {
    expect(code).not.toMatch(/on public\.founding_members for (insert|delete)/)
    expect(code).not.toMatch(/grant [a-z, ]*(insert|delete|all)[a-z, ]* on public\.founding_members/i)
  })
})

describe('the file as a whole', () => {
  it('is safe to run twice (every policy is dropped first, every table is "if not exists")', () => {
    for (const name of ['see your own membership', 'see your own founding status', 'anyone can see the names on the wall', 'choose whether your name shows']) expect(code, name).toMatch(new RegExp(`drop policy if exists "${name}" on public\\.`))
    expect((code.match(/create table if not exists/g) || []).length).toBe(2)
  })
  it('explains why the permission lines are there, and how to undo it', () => {
    expect(sql).toMatch(/PERMISSIONS: a table made in the SQL editor cannot be read by the website/)
    expect(sql).toMatch(/drop table if exists public\.founding_members/); expect(sql).toMatch(/drop table if exists public\.memberships/)
  })
})
