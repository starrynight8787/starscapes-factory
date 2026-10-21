// @vitest-environment node
// The database file: the locks it puts on who can do what.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(path.resolve('sql/suggestions.sql'), 'utf8')
const live = sql.split('-- TO UNDO')[0] // everything that runs, not the undo lines
const OWNER = "lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com'"

describe('sql/suggestions.sql', () => {
  it('makes the three tables and the totals view, safely (it can be run twice)', () => {
    for (const t of ['suggestion_spaces', 'suggestions', 'suggestion_votes']) expect(live).toContain(`create table if not exists public.${t}`)
    expect(live).toContain('create or replace view public.suggestion_tally')
    expect(live).toMatch(/on conflict \(space\) do nothing/)
    const created = [...live.matchAll(/create policy "([^"]+)"/g)].map((m) => m[1])
    const dropped = [...live.matchAll(/drop policy if exists "([^"]+)"/g)].map((m) => m[1])
    for (const name of created) expect(dropped, name).toContain(name) // every rule is dropped before it is made, so a second run changes nothing
    expect(dropped.filter((n) => !created.includes(n)).sort()).toEqual(['signed-in people suggest, three a day, while the space is on', 'vote for an approved suggestion in a space that is on']) // only the two retired names
  })
  it('turns row level security on for every table', () => {
    for (const t of ['suggestion_spaces', 'suggestions', 'suggestion_votes']) expect(live).toContain(`alter table public.${t} enable row level security`)
  })
  it('starts both spaces switched OFF, so nothing appears until the owner turns it on', () => {
    expect(live).toMatch(/enabled boolean not null default false/)
    expect(live).toMatch(/values \('story-ledger', false\), \('book-club', false\)/)
  })
  it('lets only the owner change the switches, approve, hide, choose or delete', () => {
    const owner = live.match(new RegExp(OWNER.replace(/[()|.]/g, '\\$&'), 'g')) || []
    expect(owner.length).toBe(7) // the switches (2), reading every suggestion (1), changing one (2), deleting one (1), reading every vote (1)
    for (const name of ['only the owner changes the switches', 'only the owner changes suggestions', 'only the owner deletes suggestions']) expect(live).toContain(`"${name}"`)
  })
  it('lets a visitor suggest only as themselves, only as pending, only while the space is on, and only 3 a day', () => {
    const insert = live.slice(live.indexOf('create policy "Book Club members suggest'), live.indexOf('create policy "only the owner changes suggestions"'))
    expect(insert).toContain('user_id = auth.uid()')
    expect(insert).toContain("status = 'pending'")
    expect(insert).toContain('s.enabled')
    expect(insert).toContain("interval '1 day'")
    expect(insert).toContain(') < 3')
  })
  it('shows visitors only approved or chosen suggestions (and their own), never pending or hidden ones from others', () => {
    const select = live.slice(live.indexOf('create policy "see approved suggestions'), live.indexOf('create policy "Book Club members suggest'))
    expect(select).toContain("status in ('approved', 'chosen')")
    expect(select).toContain('user_id = auth.uid()')
    expect(select).not.toContain("'pending'")
  })
  it('lets a visitor vote only as themselves, only for an approved suggestion in a space that is on, and take the vote back', () => {
    const vote = live.slice(live.indexOf('create policy "Book Club members vote for an approved'), live.indexOf('create policy "take your own vote back"'))
    expect(vote).toContain('user_id = auth.uid()')
    expect(vote).toContain("g.status in ('approved', 'chosen')")
    expect(vote).toContain('s.enabled')
    expect(live).toMatch(/create policy "take your own vote back" on public.suggestion_votes for delete to authenticated using \(user_id = auth.uid\(\)\)/)
  })
  it('lets ONLY Book Club members (and the owner) suggest and vote, on both spaces: both rules call is_book_club_member()', () => {
    const insert = live.slice(live.indexOf('create policy "Book Club members suggest'), live.indexOf('create policy "only the owner changes suggestions"'))
    const vote = live.slice(live.indexOf('create policy "Book Club members vote for an approved'), live.indexOf('create policy "take your own vote back"'))
    expect(insert).toContain('public.is_book_club_member()'); expect(vote).toContain('public.is_book_club_member()')
    expect(insert).not.toMatch(/space\s*=\s*'/); expect(vote).not.toMatch(/space\s*=\s*'/) // no space is let off: the rule is the same for story-ledger and book-club
  })
  it('replaces the old rules that let any signed-in visitor in: the old policy names are dropped, never created again', () => {
    expect(live).toContain('drop policy if exists "signed-in people suggest, three a day, while the space is on" on public.suggestions;')
    expect(live).toContain('drop policy if exists "vote for an approved suggestion in a space that is on" on public.suggestion_votes;')
    expect(live).not.toMatch(/create policy "signed-in people suggest/); expect(live).not.toMatch(/create policy "vote for an approved suggestion in a space that is on"/)
    for (const name of ['Book Club members suggest, three a day, while the space is on', 'Book Club members vote for an approved suggestion in a space that is on']) { expect(live).toContain(`drop policy if exists "${name}"`); expect(live).toContain(`create policy "${name}"`) }
  })
  it('still lets everyone SEE the approved suggestions and the totals (the Story Ledger is free to watch), and anyone take their own vote back', () => {
    expect(live).toMatch(/create policy "see approved suggestions, your own, and \(as owner\) all" on public\.suggestions for select to anon, authenticated/)
    expect(live).toMatch(/grant select on public\.suggestion_spaces, public\.suggestions, public\.suggestion_tally to anon, authenticated;/)
    expect(live).toContain('create policy "take your own vote back" on public.suggestion_votes for delete to authenticated using (user_id = auth.uid())')
  })
  it('says it needs sql/book-details.sql first, and that file really makes the function: it counts the Book Club pass and the owner', () => {
    expect(sql).toContain('sql/book-details.sql to have been run first'); expect(sql).toContain('is_book_club_member()')
    const details = fs.readFileSync(path.resolve('sql/book-details.sql'), 'utf8'); const i = details.indexOf('create or replace function public.is_book_club_member'); expect(i).toBeGreaterThan(-1)
    const fn = details.slice(i, details.indexOf('$$;', i) + 3); expect(fn).toContain("'book-club' = any (m.passes)"); expect(fn).toContain("'gillian@gillianbennet.com'")
  })
  it('keeps who voted for what private: visitors can only read their own votes, and the totals view has no names in it', () => {
    expect(live).toMatch(/create policy "see your own votes"[\s\S]*?using \(user_id = auth.uid\(\) or /)
    const view = live.slice(live.indexOf('create or replace view'), live.indexOf('alter table public.suggestion_spaces'))
    expect(view).toContain('suggestion_id, count(*)::int as votes')
    expect(view).not.toMatch(/user_id/)
    expect(live).not.toMatch(/grant select on public\.suggestion_votes to anon/)
  })
  it('says how to confirm it worked and how to undo it', () => {
    expect(sql).toMatch(/select tablename, policyname, cmd from pg_policies where tablename like 'suggestion%'/)
    for (const t of ['suggestion_votes', 'suggestions', 'suggestion_spaces']) expect(sql).toContain(`drop table if exists public.${t}`)
    expect(sql).toContain('drop view if exists public.suggestion_tally')
  })
})
