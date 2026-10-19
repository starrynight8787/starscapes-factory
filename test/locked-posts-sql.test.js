// @vitest-environment node
// The database file for locked posts (sql/locked-posts.sql): who may read the protected words, and that nobody but the owner may write them.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(path.resolve('sql/locked-posts.sql'), 'utf8')
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
const fn = code.slice(code.indexOf('create or replace function public.can_read_post_body'), code.indexOf('revoke all on function'))

describe('the pass column', () => {
  it('is added to posts, empty (free for everyone) unless set', () => {
    expect(code).toMatch(/alter table public\.posts add column if not exists pass text;/)
  })
})

describe('the rule that decides who may read a locked post\u2019s words', () => {
  it('only ever applies to a post that belongs to a pass', () => {
    expect(fn).toMatch(/p\.id = p_post_id\s+and p\.pass is not null/)
  })
  it('lets the owner read everything, and nobody else by email', () => {
    expect(fn).toMatch(/lower\(coalesce\(auth\.jwt\(\) ->> 'email', ''\)\) = 'gillian@gillianbennet\.com'/)
    expect((fn.match(/@/g) || []).length).toBe(1)
  })
  it('lets anyone read the first three published posts of the pass, the three OLDEST (not the newest), and only published ones', () => {
    expect(fn).toMatch(/select f\.id from public\.posts f\s+where f\.pass = p\.pass and f\.published\s+order by f\.created_at asc, f\.id asc\s+limit 3/)
  })
  it('lets someone who holds THAT pass read it: their own membership, passes that are open, and the pass is in their list', () => {
    expect(fn).toMatch(/from public\.memberships m\s+where m\.user_id = auth\.uid\(\)/)
    expect(fn).toMatch(/m\.status in \('active', 'trialing', 'past_due'\)/)
    expect(fn).toMatch(/p\.pass = any \(m\.passes\)/)
  })
  it('does not count unpaid, ended or unfinished memberships', () => {
    expect(fn).not.toMatch(/'unpaid'|'canceled'|'incomplete'/)
  })
  it('runs with its own rights and a fixed search path (it has to see every post and everyone\u2019s membership to decide), so it cannot be tricked into looking elsewhere', () => {
    expect(fn).toMatch(/security definer\s+set search_path = public/); expect(fn).toMatch(/\bstable\b/)
  })
  it('can be asked by visitors and signed-in people, but is not open to everything by default', () => {
    expect(code).toMatch(/revoke all on function public\.can_read_post_body\(uuid\) from public;/); expect(code).toMatch(/grant execute on function public\.can_read_post_body\(uuid\) to anon, authenticated, service_role;/)
  })
})

describe('the table that keeps the protected words', () => {
  it('is one row per post, gone if the post is', () => {
    expect(code).toMatch(/create table if not exists public\.post_bodies \(\s*post_id uuid primary key references public\.posts \(id\) on delete cascade/)
  })
  it('has row level security on, and a select rule that is exactly the function (no other way in)', () => {
    expect(code).toMatch(/alter table public\.post_bodies enable row level security;/)
    expect(code).toMatch(/create policy "read the words of a post if you may" on public\.post_bodies for select to anon, authenticated using \(public\.can_read_post_body\(post_id\)\);/)
    expect([...code.matchAll(/on public\.post_bodies for select/g)]).toHaveLength(1)
  })
  it('can be written (added, changed, removed) only by the owner', () => {
    for (const [name, cmd] of [['the owner adds words', 'insert'], ['the owner changes words', 'update'], ['the owner removes words', 'delete']]) expect(code, name).toMatch(new RegExp(`create policy "${name}" on public\\.post_bodies for ${cmd} to authenticated`))
    const owner = "lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'"
    expect(code.split(owner).length - 1).toBe(5) // insert once, update twice (using and with check), delete once, and the function itself
  })
  it('gives visitors and signed-in people permission to ASK (select) and nothing else; only signed-in people may try to write, and the rules then stop everyone but the owner', () => {
    expect(code).toMatch(/^grant select on public\.post_bodies to anon, authenticated;$/m)
    expect(code).toMatch(/^grant insert, update, delete on public\.post_bodies to authenticated;$/m)
    expect(code).not.toMatch(/grant [a-z, ]*(insert|update|delete)[a-z, ]* on public\.post_bodies to [^;]*\banon\b/i)
  })
  it('gives the server\u2019s key full access, like the other server-side tables', () => {
    expect(code).toMatch(/^grant select, insert, update, delete on public\.post_bodies to service_role;$/m)
  })
})

describe('the file as a whole', () => {
  it('is safe to run twice: every policy is dropped first, tables and columns are "if not exists", the function is "create or replace"', () => {
    for (const name of ['read the words of a post if you may', 'the owner adds words', 'the owner changes words', 'the owner removes words']) expect(code, name).toMatch(new RegExp(`drop policy if exists "${name}" on public\\.post_bodies;`))
  })
  it('explains how to undo it, and what to do first', () => {
    expect(sql).toMatch(/drop table if exists public\.post_bodies;/); expect(sql).toMatch(/drop function if exists public\.can_read_post_body\(uuid\);/); expect(sql).toMatch(/choosing "Free for everyone"/)
  })
  it('says NOTHING changes until a pass is chosen on a post, and explains the permission lines', () => {
    expect(sql).toMatch(/NOTHING on the site changes until you choose a pass on a post/); expect(sql).toMatch(/PERMISSIONS: a table made in the SQL editor cannot be read by the website/)
  })
})
