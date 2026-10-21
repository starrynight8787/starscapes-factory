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
    expect(live.match(/drop policy if exists/g).length).toBe(live.match(/create policy/g).length)
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
    const insert = live.slice(live.indexOf('create policy "signed-in people suggest'), live.indexOf('create policy "only the owner changes suggestions"'))
    expect(insert).toContain('user_id = auth.uid()')
    expect(insert).toContain("status = 'pending'")
    expect(insert).toContain('s.enabled')
    expect(insert).toContain("interval '1 day'")
    expect(insert).toContain(') < 3')
  })
  it('shows visitors only approved or chosen suggestions (and their own), never pending or hidden ones from others', () => {
    const select = live.slice(live.indexOf('create policy "see approved suggestions'), live.indexOf('create policy "signed-in people suggest'))
    expect(select).toContain("status in ('approved', 'chosen')")
    expect(select).toContain('user_id = auth.uid()')
    expect(select).not.toContain("'pending'")
  })
  it('lets a visitor vote only as themselves, only for an approved suggestion in a space that is on, and take the vote back', () => {
    const vote = live.slice(live.indexOf('create policy "vote for an approved'), live.indexOf('create policy "take your own vote back"'))
    expect(vote).toContain('user_id = auth.uid()')
    expect(vote).toContain("g.status in ('approved', 'chosen')")
    expect(vote).toContain('s.enabled')
    expect(live).toMatch(/create policy "take your own vote back" on public.suggestion_votes for delete to authenticated using \(user_id = auth.uid\(\)\)/)
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
