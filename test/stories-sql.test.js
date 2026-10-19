// @vitest-environment node
// The database file for stories and chapters (sql/stories.sql): who may read and change them, and the rule that gives every story its own free chapters 1 to 3.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(path.resolve('sql/stories.sql'), 'utf8')
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
const fn = code.slice(code.indexOf('create or replace function public.can_read_post_body'), code.indexOf('revoke all on function'))
const OWNER = "lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'"

describe('the two tables', () => {
  it('keep a story\u2019s title, address name, first lines, picture and whether it is finished, with sensible limits', () => {
    expect(code).toMatch(/create table if not exists public\.stories \(/)
    expect(code).toMatch(/slug text not null unique check \(slug ~ '\^\[a-z0-9-\]\{1,60\}\$'\)/); expect(code).toMatch(/char_length\(btrim\(title\)\) between 1 and 120/); expect(code).toMatch(/char_length\(teaser\) <= 300/)
    expect(code).toMatch(/picture_url text check \(picture_url is null or picture_url ~ '\^https:\/\/'\)/); expect(code).toMatch(/status in \('running', 'completed'\)/); expect(code).toMatch(/check \(status <> 'completed' or finished_on is not null\)/)
  })
  it('link a post to a story as one chapter number, each post only once and each number only once in a story, and go if the story or the post goes', () => {
    expect(code).toMatch(/create table if not exists public\.story_chapters \(/)
    expect(code).toMatch(/story_id uuid not null references public\.stories \(id\) on delete cascade/); expect(code).toMatch(/number integer not null check \(number between 1 and 200\)/)
    expect(code).toMatch(/post_id uuid not null unique references public\.posts \(id\) on delete cascade/); expect(code).toMatch(/primary key \(story_id, number\)/)
  })
})

describe('who may read and who may change', () => {
  it('has row level security on both tables', () => {
    expect(code).toMatch(/alter table public\.stories enable row level security;/); expect(code).toMatch(/alter table public\.story_chapters enable row level security;/)
  })
  it('lets anyone read both tables (titles and dates are public anyway)', () => {
    expect(code).toMatch(/create policy "anyone can read stories" on public\.stories for select to anon, authenticated using \(true\);/)
    expect(code).toMatch(/create policy "anyone can read chapters" on public\.story_chapters for select to anon, authenticated using \(true\);/)
  })
  it('lets only the owner add, change or remove anything, in both tables', () => {
    for (const [name, table, cmd] of [['the owner adds stories', 'stories', 'insert'], ['the owner changes stories', 'stories', 'update'], ['the owner removes stories', 'stories', 'delete'], ['the owner adds chapters', 'story_chapters', 'insert'], ['the owner changes chapters', 'story_chapters', 'update'], ['the owner removes chapters', 'story_chapters', 'delete']]) {
      expect(code, name).toMatch(new RegExp(`create policy "${name}" on public\\.${table} for ${cmd} to authenticated`))
    }
    // insert once and delete once for each table, update twice (using and with check) for each table, plus the owner line inside the function: 2 + 4 + 2 = 8 policies' checks, plus the function's one
    expect(code.split(OWNER).length - 1).toBe(9)
  })
  it('gives visitors and signed-in people the right to ASK (select) and nothing more; signed-in people may try to write (the rules then stop all but the owner); the server\u2019s key has full access', () => {
    expect(code).toMatch(/^grant select on public\.stories, public\.story_chapters to anon, authenticated;$/m)
    expect(code).toMatch(/^grant insert, update, delete on public\.stories, public\.story_chapters to authenticated;$/m)
    expect(code).toMatch(/^grant select, insert, update, delete on public\.stories, public\.story_chapters to service_role;$/m)
    expect(code).not.toMatch(/grant [a-z, ]*(insert|update|delete)[a-z, ]* on [^;]*to [^;]*\banon\b/i)
  })
  it('is safe to run twice: every policy is dropped first, tables are "if not exists", the function is "create or replace"', () => {
    for (const name of ['anyone can read stories', 'the owner adds stories', 'the owner changes stories', 'the owner removes stories', 'anyone can read chapters', 'the owner adds chapters', 'the owner changes chapters', 'the owner removes chapters']) {
      expect(code, name).toMatch(new RegExp(`drop policy if exists "${name}" on public\\.`))
    }
  })
})

describe('the rule for who may read a locked post\u2019s words, now with story chapters', () => {
  it('still only applies to a post that belongs to a pass, and still lets the owner read everything', () => {
    expect(fn).toMatch(/p\.id = p_post_id\s+and p\.pass is not null/); expect(fn).toContain(OWNER)
  })
  it('makes chapters 1 to 3 of EVERY story free, and chapter 4 and on not free', () => {
    expect(fn).toMatch(/exists \(select 1 from public\.story_chapters c where c\.post_id = p\.id and c\.number <= 3\)/)
    expect(fn).not.toMatch(/c\.number <= [4-9]|c\.number < 3|c\.number <= 2/)
  })
  it('gives a post that is NOT a chapter the old rule (the first three published posts of the pass, oldest first), and does not count chapters among them', () => {
    expect(fn).toMatch(/not exists \(select 1 from public\.story_chapters c where c\.post_id = p\.id\)\s+and p\.id in \(/)
    expect(fn).toMatch(/where f\.pass = p\.pass and f\.published\s+and not exists \(select 1 from public\.story_chapters c2 where c2\.post_id = f\.id\)\s+order by f\.created_at asc, f\.id asc\s+limit 3/)
  })
  it('still lets someone who holds that pass in, only while the membership is active, trialing or past due', () => {
    expect(fn).toMatch(/m\.user_id = auth\.uid\(\)/); expect(fn).toMatch(/m\.status in \('active', 'trialing', 'past_due'\)/); expect(fn).toMatch(/p\.pass = any \(m\.passes\)/); expect(fn).not.toMatch(/'unpaid'|'canceled'|'incomplete'/)
  })
  it('keeps running with its own rights and a fixed search path, and is still only asked by the three roles', () => {
    expect(fn).toMatch(/security definer\s+set search_path = public/)
    expect(code).toMatch(/revoke all on function public\.can_read_post_body\(uuid\) from public;/); expect(code).toMatch(/grant execute on function public\.can_read_post_body\(uuid\) to anon, authenticated, service_role;/)
  })
})

describe('the file as a whole', () => {
  it('says it must be run after locked-posts.sql and that locked-posts.sql must not be run again afterwards', () => {
    expect(sql).toMatch(/AFTER sql\/locked-posts\.sql/); expect(sql).toMatch(/Do NOT run locked-posts\.sql again afterwards/)
  })
  it('explains the permission lines, how to undo, and how to check', () => {
    expect(sql).toMatch(/cannot be read by the website until it is granted permission/); expect(sql).toMatch(/drop table if exists public\.story_chapters;/); expect(sql).toMatch(/select tablename, policyname from pg_policies/)
  })
})
