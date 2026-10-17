// @vitest-environment node
// The Book Club database file: who can read and who can change.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(path.resolve('sql/books.sql'), 'utf8')
const live = sql.split('-- TO UNDO')[0]
const OWNER = "lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com'"

describe('sql/books.sql', () => {
  it('makes both tables safely, so it can be run twice, with row level security on', () => {
    for (const t of ['books', 'reading_goals']) { expect(live).toContain(`create table if not exists public.${t}`); expect(live).toContain(`alter table public.${t} enable row level security`) }
    expect(live.match(/drop policy if exists/g).length).toBe(live.match(/create policy/g).length)
  })
  it('lets everyone read the books and the goals (the page shows them)', () => {
    expect(live).toMatch(/create policy "anyone can see the books" on public\.books for select to anon, authenticated using \(true\)/)
    expect(live).toMatch(/create policy "anyone can see the reading goals" on public\.reading_goals for select to anon, authenticated using \(true\)/)
  })
  it('lets ONLY the owner add, change or delete (both the using and the with check sides)', () => {
    for (const name of ['only the owner changes the books', 'only the owner changes the reading goals']) {
      const block = live.slice(live.indexOf(`create policy "${name}"`)).split(';')[0]
      expect(block).toContain('for all to authenticated')
      expect(block.split(OWNER).length - 1, name).toBe(2)
    }
    expect(live).not.toMatch(/grant (insert|update|delete)[^;]*to anon/)
  })
  it('says how to confirm it worked and how to undo it', () => {
    expect(sql).toMatch(/select tablename, policyname, cmd from pg_policies where tablename in \('books', 'reading_goals'\)/)
    expect(sql).toContain('drop table if exists public.books')
    expect(sql).toContain('drop table if exists public.reading_goals')
  })
})
