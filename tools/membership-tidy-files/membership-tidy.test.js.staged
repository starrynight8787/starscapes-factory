// @vitest-environment node
// Two membership clean-ups (21 October 2026):
//  1. There is NO Founding members tier (Gill: it was hard to separate from the other tiers). The table, its policies and the Founders' wall are gone.
//  2. Book Club comments follow the same rule as every other pass: a member whose payment is being retried keeps their pass. Stripe retries for 2 weeks, then cancels
//     the subscription (SFW-241), and the pass closes then, which is what the Terms promise.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const walk = (dir) => readdirSync(join(root, dir)).flatMap((n) => { const rel = `${dir}/${n}`; return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel] })
const TEXT = /\.(js|jsx|mjs|json|html|css|svg|md|txt|sql)$/

describe('Founding members: gone', () => {
  const sql = read('sql/memberships.sql')
  const lines = sql.split('\n')
  it('the memberships file makes only the memberships table: nothing creates, protects or grants anything on founding_members', () => {
    expect((sql.match(/create table if not exists/g) || []).length).toBe(1); expect(sql).toMatch(/create table if not exists public\.memberships \(/)
    for (const word of ['create table', 'alter table', 'create policy', 'drop policy', 'grant']) expect(sql, word).not.toMatch(new RegExp(`${word}[^;\\n]*founding_members`, 'i'))
  })
  it('every line that still mentions it is a comment, or the single line that removes the table if the database still has it', () => {
    const mentions = lines.filter((l) => /founding/i.test(l)); const live = mentions.filter((l) => !l.trim().startsWith('--'))
    expect(live).toEqual(['drop table if exists public.founding_members;']); expect(mentions.length).toBeGreaterThan(1) // and the comment says why
  })
  it('keeps the memberships table exactly as protected as before: a member reads only their own row, only the server\u2019s key writes', () => {
    expect(sql).toMatch(/create policy "see your own membership" on public\.memberships for select to authenticated using \(user_id = auth\.uid\(\)\)/)
    expect(sql).toMatch(/^grant select on public\.memberships to authenticated;$/m); expect(sql).toMatch(/^grant select, insert, update, delete on public\.memberships to service_role;$/m)
  })
  it('is not on the site anywhere a visitor, or the code, could meet it: no page, box, word or table name in the site, the server, the public folder or the other database files', () => {
    const files = ['src', 'api', 'lib', 'public', 'sql'].flatMap(walk).filter((f) => TEXT.test(f) && f !== 'sql/memberships.sql')
    expect(files.length).toBeGreaterThan(300); expect(files.filter((f) => /founding member|founders.{0,2} wall|founder|founding_members/i.test(read(f)))).toEqual([])
  })
  it('the health check no longer looks for it in the memberships file', () => {
    const check = read('tools/health-check.mjs'); expect(check).not.toMatch(/founding_members/); expect(check).toMatch(/'sql\/memberships\.sql', \/create table if not exists public\\\.memberships\//)
  })
})

describe('Book Club comments stay open while a failed payment is being retried', () => {
  const fnOf = (file, name) => { const s = read(file); const i = s.indexOf(`create or replace function public.${name}`); expect(i, `${name} in ${file}`).toBeGreaterThan(-1); return s.slice(i, s.indexOf('$$;', i) + 3) }
  const statuses = (fn) => (fn.match(/m\.status in \(([^)]*)\)/) || [])[1]
  const book = () => fnOf('sql/book-details.sql', 'is_book_club_member')
  it('counts a Book Club pass that is active, in a trial, or past due (the weeks Stripe retries), and the owner', () => {
    expect(statuses(book())).toBe("'active', 'trialing', 'past_due'"); expect(book()).toMatch(/'book-club' = any \(m\.passes\)/); expect(book()).toMatch(/lower\(coalesce\(auth\.jwt\(\) ->> 'email', ''\)\) = 'gillian@gillianbennet\.com'/)
  })
  it('does not count a pass that Stripe has marked unpaid or cancelled: it closes when Stripe gives up (2 weeks, SFW-241), as the Terms say', () => {
    expect(statuses(book())).not.toMatch(/unpaid|canceled|incomplete/)
  })
  it('is the SAME rule as the other passes use for locked posts and story votes, so no pass behaves differently from another', () => {
    expect(statuses(book())).toBe(statuses(fnOf('sql/locked-posts.sql', 'can_read_post_body'))); expect(statuses(book())).toBe(statuses(fnOf('sql/story-votes.sql', 'holds_story_pass')))
  })
  it('still lets only members read and write comments, and only the author or the owner remove one', () => {
    const s = read('sql/book-details.sql')
    expect(s).toContain('create policy "members read book comments" on public.book_comments for select to authenticated using (public.is_book_club_member())')
    expect(s).toContain('create policy "members add book comments" on public.book_comments for insert to authenticated with check (user_id = auth.uid() and public.is_book_club_member())')
    expect(s).toMatch(/create policy "remove your own book comment" on public\.book_comments for delete to authenticated\s+using \(user_id = auth\.uid\(\) or lower\(auth\.jwt\(\) ->> 'email'\) = 'gillian@gillianbennet\.com'\)/)
  })
})
