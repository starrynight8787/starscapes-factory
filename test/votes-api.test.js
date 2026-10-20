// @vitest-environment node
// The database calls for the story vote (src/stories/votesApi.js).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sb = vi.hoisted(() => ({ results: {}, seen: [], rpcResult: { data: [], error: null }, throwRpc: false }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    rpc: async (name, args) => { sb.seen.push(['rpc', name, args]); if (sb.throwRpc) throw new Error('offline'); return sb.rpcResult },
    from: (table) => {
      const log = (...a) => { sb.seen.push([table, ...a]); return chain }
      const next = () => { const list = sb.results[table]; return (list && list.shift()) || { data: [], error: null } }
      const chain = { select: (c) => log('select', c), order: (c, o) => log('order', c, o && o.ascending), eq: (c, v) => log('eq', c, v), insert: (v) => log('insert', v), update: (v) => log('update', v), delete: () => log('delete'), upsert: (v, o) => log('upsert', v, o && o.onConflict), single: () => Promise.resolve(next()), maybeSingle: () => Promise.resolve(next()), then: (res, rej) => Promise.resolve(next()).then(res, rej) }
      return chain
    },
  },
}))
import { fetchVotes, fetchResults, fetchMyBallot, castVote, saveVote, closeVoteNow, chooseWinner, removeVote } from '../src/stories/votesApi'
beforeEach(() => { sb.results = {}; sb.seen = []; sb.rpcResult = { data: [], error: null }; sb.throwRpc = false })

describe('reading', () => {
  it('asks for every vote (latest chapter first) and every choice (in order), public columns only', async () => {
    sb.results = { story_votes: [{ data: [{ id: 'v' }], error: null }], story_vote_options: [{ data: [{ id: 'o' }], error: null }] }
    await expect(fetchVotes()).resolves.toEqual({ votes: [{ id: 'v' }], options: [{ id: 'o' }] })
    expect(sb.seen).toContainEqual(['story_votes', 'select', 'id, story_id, after_chapter, question, closes_at, chosen_option_id, created_at']); expect(sb.seen).toContainEqual(['story_votes', 'order', 'after_chapter', false]); expect(sb.seen).toContainEqual(['story_vote_options', 'select', 'id, vote_id, position, label'])
    expect(JSON.stringify(sb.seen)).not.toMatch(/story_ballots/)
  })
  it('says plainly when it cannot, and treats a non-list as an empty one', async () => {
    sb.results = { story_votes: [{ data: null, error: { message: 'boom' } }] }; await expect(fetchVotes()).rejects.toThrow('That did not go through just now. Please try again in a moment.')
    sb.results = { story_votes: [{ data: 'odd', error: null }], story_vote_options: [{ data: null, error: null }] }; await expect(fetchVotes()).resolves.toEqual({ votes: [], options: [] })
  })
  it('asks for the numbers only through the database\u2019s own function, and gives none, never an error, if it says no or cannot be reached', async () => {
    sb.rpcResult = { data: [{ option_id: 'a', votes: 2 }], error: null }; await expect(fetchResults('v1')).resolves.toEqual([{ option_id: 'a', votes: 2 }]); expect(sb.seen[0]).toEqual(['rpc', 'vote_results', { p_vote_id: 'v1' }])
    sb.rpcResult = { data: null, error: { message: 'no' } }; await expect(fetchResults('v1')).resolves.toEqual([]); sb.rpcResult = { data: 'odd', error: null }; await expect(fetchResults('v1')).resolves.toEqual([]); sb.throwRpc = true; await expect(fetchResults('v1')).resolves.toEqual([])
    expect(sb.seen.filter((s) => s[0] === 'story_ballots')).toHaveLength(0) // it never reads the ballots table for numbers
  })
  it('finds this person\u2019s own choice, by vote and person, or null', async () => {
    sb.results = { story_ballots: [{ data: { option_id: 'b' }, error: null }] }; await expect(fetchMyBallot('v1', 'u1')).resolves.toBe('b')
    expect(sb.seen).toEqual([['story_ballots', 'select', 'option_id'], ['story_ballots', 'eq', 'vote_id', 'v1'], ['story_ballots', 'eq', 'user_id', 'u1']])
    sb.results = { story_ballots: [{ data: null, error: null }, { data: null, error: { message: 'x' } }] }; await expect(fetchMyBallot('v1', 'u1')).resolves.toBeNull(); await expect(fetchMyBallot('v1', 'u1')).resolves.toBeNull()
  })
})

describe('casting a vote', () => {
  it('saves one vote for the person in the vote, replacing an earlier one (saving again changes it)', async () => {
    await castVote({ voteId: 'v1', userId: 'u1', optionId: 'o2' })
    expect(sb.seen[0].slice(0, 3)).toEqual(['story_ballots', 'upsert', expect.objectContaining({ vote_id: 'v1', user_id: 'u1', option_id: 'o2' })]); expect(sb.seen[0][3]).toBe('vote_id,user_id'); expect(sb.seen[0][2].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
  it('says in plain words when the database refuses (not a member, or the vote has closed), and when something else goes wrong', async () => {
    sb.results = { story_ballots: [{ error: { message: 'new row violates row-level security policy' } }, { error: { code: '42501' } }, { error: { message: 'boom' } }] }
    await expect(castVote({ voteId: 'v', userId: 'u', optionId: 'o' })).rejects.toThrow('Voting is for members, and only while the vote is open.'); await expect(castVote({ voteId: 'v', userId: 'u', optionId: 'o' })).rejects.toThrow('Voting is for members')
    await expect(castVote({ voteId: 'v', userId: 'u', optionId: 'o' })).rejects.toThrow('That did not go through just now. Please try again in a moment.')
  })
})

describe('the owner\u2019s side', () => {
  it('makes a vote, then its choices numbered from 1, and leaves no half-made vote behind if the choices fail', async () => {
    sb.results = { story_votes: [{ data: { id: 'new1' }, error: null }], story_vote_options: [{ data: null, error: null }] }
    await saveVote({ story_id: 's', after_chapter: 3, question: 'Q', closes_at: 'x' }, ['A text', 'B text'])
    expect(sb.seen).toContainEqual(['story_votes', 'insert', { story_id: 's', after_chapter: 3, question: 'Q', closes_at: 'x' }]); expect(sb.seen).toContainEqual(['story_vote_options', 'insert', [{ vote_id: 'new1', position: 1, label: 'A text' }, { vote_id: 'new1', position: 2, label: 'B text' }]])
    sb.seen = []; sb.results = { story_votes: [{ data: { id: 'new2' }, error: null }], story_vote_options: [{ error: { message: 'boom' } }] }
    await expect(saveVote({ story_id: 's' }, ['a', 'b'])).rejects.toThrow('That did not go through just now'); expect(sb.seen).toContainEqual(['story_votes', 'delete']); expect(sb.seen).toContainEqual(['story_votes', 'eq', 'id', 'new2'])
  })
  it('says plainly when there is already a vote after that chapter, and when only the owner may', async () => {
    sb.results = { story_votes: [{ data: null, error: { code: '23505', message: 'duplicate key' } }, { data: null, error: { message: 'row-level security' } }] }
    await expect(saveVote({}, ['a', 'b'])).rejects.toThrow('There is already a vote after that chapter of that story.'); await expect(saveVote({}, ['a', 'b'])).rejects.toThrow('Only the site owner can change the votes.')
  })
  it('closes a vote now, picks (or clears) a winner, and deletes a vote, each by its id', async () => {
    await closeVoteNow('v1'); expect(sb.seen[0][1]).toBe('update'); expect(typeof sb.seen[0][2].closes_at).toBe('string'); expect(sb.seen[1]).toEqual(['story_votes', 'eq', 'id', 'v1'])
    sb.seen = []; await chooseWinner('v1', 'o2'); expect(sb.seen[0]).toEqual(['story_votes', 'update', { chosen_option_id: 'o2' }]); sb.seen = []; await chooseWinner('v1', ''); expect(sb.seen[0]).toEqual(['story_votes', 'update', { chosen_option_id: null }])
    sb.seen = []; await removeVote('v1'); expect(sb.seen).toEqual([['story_votes', 'delete'], ['story_votes', 'eq', 'id', 'v1']])
    sb.results = { story_votes: [{ error: { message: 'boom' } }] }; await expect(closeVoteNow('v1')).rejects.toThrow('That did not go through just now')
  })
})
