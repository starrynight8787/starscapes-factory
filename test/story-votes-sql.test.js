// @vitest-environment node
// The database file for the story vote (sql/story-votes.sql): who may read, who may vote, that nobody can read anyone else's vote, and when the numbers are handed over.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(path.resolve('sql/story-votes.sql'), 'utf8')
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
const OWNER = "lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'"
const fnBody = (name) => { const start = code.indexOf(`create or replace function public.${name}`); const end = code.indexOf('$$;', code.indexOf('as $$', start)); return code.slice(start, end) }

describe('the tables', () => {
  it('a vote belongs to a story and a chapter, has a question and a closing time it must have, and a story can have only one vote after each chapter', () => {
    expect(code).toMatch(/create table if not exists public\.story_votes \(/); expect(code).toMatch(/story_id uuid not null references public\.stories \(id\) on delete cascade/); expect(code).toMatch(/after_chapter integer not null check \(after_chapter between 1 and 200\)/)
    expect(code).toMatch(/question text not null default 'What happens next\?' check \(char_length\(btrim\(question\)\) between 1 and 120\)/); expect(code).toMatch(/closes_at timestamptz not null/); expect(code).toMatch(/unique \(story_id, after_chapter\)/)
  })
  it('a vote has two to six choices at most (positions 1 to 6, each used once), each with some words, and they go when the vote goes', () => {
    expect(code).toMatch(/vote_id uuid not null references public\.story_votes \(id\) on delete cascade/); expect(code).toMatch(/position integer not null check \(position between 1 and 6\)/); expect(code).toMatch(/label text not null check \(char_length\(btrim\(label\)\) between 1 and 160\)/)
    expect(code).toMatch(/unique \(vote_id, position\)/); expect(code).toMatch(/unique \(vote_id, id\)/)
  })
  it('the winner the owner picks must be one of the choices, and is simply forgotten if that choice is deleted', () => {
    expect(code).toMatch(/foreign key \(chosen_option_id\) references public\.story_vote_options \(id\) on delete set null/); expect(code).toMatch(/if not exists \(select 1 from pg_constraint where conname = 'story_votes_chosen_fk'\)/)
  })
  it('a ballot is one per person per vote, can only name a choice that belongs to THAT vote, and goes if the vote or the person goes', () => {
    expect(code).toMatch(/primary key \(vote_id, user_id\)/); expect(code).toMatch(/foreign key \(vote_id, option_id\) references public\.story_vote_options \(vote_id, id\) on delete cascade/)
    expect(code).toMatch(/user_id uuid not null references auth\.users \(id\) on delete cascade/)
  })
})

describe('the three functions', () => {
  for (const name of ['holds_story_pass', 'can_cast_vote', 'vote_results']) {
    it(`${name} runs with its own rights and a fixed search path, and can be asked only by the three roles`, () => {
      expect(fnBody(name)).toMatch(/security definer\s+set search_path = public/); expect(fnBody(name)).toMatch(/\bstable\b/)
      expect(code).toMatch(new RegExp(`revoke all on function public\\.${name}\\(`)); expect(code).toMatch(new RegExp(`grant execute on function public\\.${name}\\([a-z]*\\) to anon, authenticated, service_role;`))
    })
  }
  it('holding the pass means the person\u2019s own membership, active, trialing or past due, with Come Write With Me in its passes (and not unpaid, ended or unfinished)', () => {
    const f = fnBody('holds_story_pass'); expect(f).toMatch(/m\.user_id = auth\.uid\(\)/); expect(f).toMatch(/m\.status in \('active', 'trialing', 'past_due'\)/); expect(f).toMatch(/'come-write-with-me' = any \(m\.passes\)/); expect(f).not.toMatch(/'unpaid'|'canceled'|'incomplete'/)
  })
  it('a vote may be cast only by someone signed in, who holds the pass, while the vote is still open', () => {
    const f = fnBody('can_cast_vote'); expect(f).toMatch(/auth\.uid\(\) is not null/); expect(f).toMatch(/public\.holds_story_pass\(\)/); expect(f).toMatch(/v\.id = p_vote_id and v\.closes_at > now\(\)/)
  })
  it('the numbers are handed over only when the vote has closed, or the person asking has voted in it, or it is the owner: otherwise no rows at all', () => {
    const f = fnBody('vote_results')
    expect(f).toMatch(/where o\.vote_id = p_vote_id\s+and \(\s*v\.closes_at <= now\(\)\s+or exists \(select 1 from public\.story_ballots mine where mine\.vote_id = p_vote_id and mine\.user_id = auth\.uid\(\)\)\s+or lower\(coalesce\(auth\.jwt\(\) ->> 'email', ''\)\) = 'gillian@gillianbennet\.com'/)
    expect((f.match(/^\s+or /gm) || []).length).toBe(2); // exactly two ways in besides the vote having closed expect(f).toMatch(/count\(\*\)::integer/); expect(f).toMatch(/order by o\.position/)
  })
})

describe('who may read and who may change', () => {
  it('has row level security on all three tables', () => {
    for (const t of ['story_votes', 'story_vote_options', 'story_ballots']) expect(code, t).toMatch(new RegExp(`alter table public\\.${t} enable row level security;`))
  })
  it('lets anyone read the votes and their choices', () => {
    expect(code).toMatch(/create policy "anyone can read votes" on public\.story_votes for select to anon, authenticated using \(true\);/); expect(code).toMatch(/create policy "anyone can read vote choices" on public\.story_vote_options for select to anon, authenticated using \(true\);/)
  })
  it('lets only the owner add, change or remove a vote or its choices', () => {
    for (const [name, table, cmd] of [['the owner adds votes', 'story_votes', 'insert'], ['the owner changes votes', 'story_votes', 'update'], ['the owner removes votes', 'story_votes', 'delete'], ['the owner adds vote choices', 'story_vote_options', 'insert'], ['the owner changes vote choices', 'story_vote_options', 'update'], ['the owner removes vote choices', 'story_vote_options', 'delete']]) expect(code, name).toMatch(new RegExp(`create policy "${name}" on public\\.${table} for ${cmd} to authenticated`))
    expect(code.split(OWNER).length - 1).toBe(9) // 4 for votes, 4 for choices, and 1 inside vote_results
  })
  it('lets a person read ONLY their own ballot: nobody can read anyone else\u2019s, so the only numbers anyone sees are the ones vote_results hands over', () => {
    expect(code).toMatch(/create policy "read your own ballot" on public\.story_ballots for select to authenticated using \(user_id = auth\.uid\(\)\);/); expect([...code.matchAll(/on public\.story_ballots for select/g)]).toHaveLength(1)
  })
  it('lets a person cast a ballot only as themselves and only if they may vote now, and change it only on the same terms', () => {
    expect(code).toMatch(/create policy "cast your own ballot" on public\.story_ballots for insert to authenticated with check \(user_id = auth\.uid\(\) and public\.can_cast_vote\(vote_id\)\);/)
    expect(code).toMatch(/create policy "change your own ballot" on public\.story_ballots for update to authenticated\s+using \(user_id = auth\.uid\(\) and public\.can_cast_vote\(vote_id\)\)\s+with check \(user_id = auth\.uid\(\) and public\.can_cast_vote\(vote_id\)\);/)
  })
  it('has no way for anyone but the server to delete a ballot, and no grant of any write to visitors', () => {
    expect(code).not.toMatch(/on public\.story_ballots for delete/); expect(code).toMatch(/^grant select, insert, update on public\.story_ballots to authenticated;$/m); expect(code).not.toMatch(/grant [a-z, ]*(insert|update|delete)[a-z, ]* on [^;]*to [^;]*\banon\b/i)
    expect(code).toMatch(/^grant select on public\.story_votes, public\.story_vote_options to anon, authenticated;$/m); expect(code).toMatch(/^grant insert, update, delete on public\.story_votes, public\.story_vote_options to authenticated;$/m)
    expect(code).toMatch(/^grant select, insert, update, delete on public\.story_votes, public\.story_vote_options, public\.story_ballots to service_role;$/m)
  })
  it('is safe to run twice: every policy is dropped first (11 in all), and tables are "if not exists", functions "create or replace"', () => {
    expect([...code.matchAll(/drop policy if exists "[^"]+" on public\./g)]).toHaveLength(11); expect([...code.matchAll(/create policy "/g)]).toHaveLength(11)
  })
})

describe('the file as a whole', () => {
  it('says it must be run after stories.sql, explains the permission lines, how to undo, and how to check', () => {
    expect(sql).toMatch(/AFTER sql\/stories\.sql/); expect(sql).toMatch(/cannot be read by the website until it is granted permission/); expect(sql).toMatch(/drop table if exists public\.story_ballots;/); expect(sql).toMatch(/select tablename, policyname from pg_policies/)
  })
})
