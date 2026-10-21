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
  it('keeps what a promo code gave a member (so My passes can name the discount), and adds that column to a table made earlier too', () => {
    expect(code).toMatch(/offer_note text,/); expect(code).toMatch(/alter table public\.memberships add column if not exists offer_note text;/)
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
    expect(code).not.toMatch(/grant [a-z, ]*(insert|update|delete|all)[a-z, ]* on public\.memberships to [^;]*\b(anon|authenticated)\b/i) // only the server's own key may write (service_role, below)
    expect(code).toMatch(/^grant select, insert, update, delete on public\.memberships to service_role;$/m)
    expect(code).not.toMatch(/on public\.memberships for (insert|update|delete)/)
    expect(code).not.toMatch(/grant [^;]* on public\.memberships to [^;]*anon/i)
  })
})

describe('the file as a whole', () => {
  it('is safe to run twice (every policy is dropped first, every table is "if not exists")', () => {
    for (const name of ['see your own membership']) expect(code, name).toMatch(new RegExp(`drop policy if exists "${name}" on public\\.`))
    expect((code.match(/create table if not exists/g) || []).length).toBe(1)
  })
  it('explains why the permission lines are there, and how to undo it', () => {
    expect(sql).toMatch(/PERMISSIONS: a table made in the SQL editor cannot be read by the website/)
    expect(sql).toMatch(/drop table if exists public\.memberships/)
  })
})
