// @vitest-environment node
// What the suggest and vote box asks the database, and what it says when the database refuses.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ calls: [], results: {} }))
// A pretend database: every query is recorded, and answers with whatever the test set for that table
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      const call = { table, steps: [] }
      h.calls.push(call)
      const b = new Proxy({}, {
        get: (_t, name) => {
          if (name === 'then') return (res, rej) => Promise.resolve(h.results[table] || { data: [], error: null }).then(res, rej)
          if (name === 'maybeSingle') return () => { call.steps.push(['maybeSingle']); return Promise.resolve(h.results[table] || { data: null, error: null }) }
          return (...args) => { call.steps.push([name, ...args]); return b }
        },
      })
      return b
    },
  },
}))
import { fetchSpaceOn, fetchSuggestions, addSuggestion, setVote, fetchSpaces, setSpaceOn, fetchAllForOwner, setStatus, removeSuggestion } from '../src/suggest/suggestApi'

const last = () => h.calls[h.calls.length - 1]
const steps = (call, name) => call.steps.filter((s) => s[0] === name)
beforeEach(() => { h.calls = []; h.results = {} })

describe('is a space on', () => {
  it('is on only when the database says so', async () => {
    h.results.suggestion_spaces = { data: { enabled: true }, error: null }
    expect(await fetchSpaceOn('story-ledger')).toBe(true)
    h.results.suggestion_spaces = { data: { enabled: false }, error: null }
    expect(await fetchSpaceOn('story-ledger')).toBe(false)
  })
  it('is off when there is no row, an error, or a surprise', async () => {
    h.results.suggestion_spaces = { data: null, error: null }
    expect(await fetchSpaceOn('x')).toBe(false)
    h.results.suggestion_spaces = { data: null, error: { message: 'boom' } }
    expect(await fetchSpaceOn('x')).toBe(false)
    h.results.suggestion_spaces = { data: { enabled: 'yes' }, error: null }
    expect(await fetchSpaceOn('x')).toBe(false)
  })
})

describe('reading the suggestions', () => {
  it('asks only for approved and chosen ones in that space, and adds the totals and this person\u2019s votes', async () => {
    h.results.suggestions = { data: [{ id: 'a', title: 'A', status: 'approved' }, { id: 'b', title: 'B', status: 'chosen' }], error: null }
    h.results.suggestion_tally = { data: [{ suggestion_id: 'a', votes: 4 }], error: null }
    h.results.suggestion_votes = { data: [{ suggestion_id: 'b' }], error: null }
    const out = await fetchSuggestions('story-ledger', 'user-1')
    const first = h.calls[0]
    expect(steps(first, 'eq')[0]).toEqual(['eq', 'space', 'story-ledger'])
    expect(steps(first, 'in')[0]).toEqual(['in', 'status', ['approved', 'chosen']])
    expect(out.tally).toEqual({ a: 4 })
    expect([...out.mine]).toEqual(['b'])
    expect(steps(h.calls[2], 'eq')[0]).toEqual(['eq', 'user_id', 'user-1'])
  })
  it('does not ask who voted when nobody is signed in, or when there is nothing to vote on', async () => {
    h.results.suggestions = { data: [{ id: 'a' }], error: null }
    await fetchSuggestions('story-ledger', null)
    expect(h.calls.map((c) => c.table)).toEqual(['suggestions', 'suggestion_tally'])
    h.calls = []
    h.results.suggestions = { data: [], error: null }
    const out = await fetchSuggestions('story-ledger', 'u')
    expect(h.calls.map((c) => c.table)).toEqual(['suggestions'])
    expect(out.rows).toEqual([])
  })
  it('says plainly when it cannot read them, without the database\u2019s words', async () => {
    h.results.suggestions = { data: null, error: { message: 'relation "suggestions" does not exist' } }
    await expect(fetchSuggestions('story-ledger', null)).rejects.toThrow(/try again/)
    await expect(fetchSuggestions('story-ledger', null)).rejects.not.toThrow(/relation/)
  })
})

describe('suggesting and voting', () => {
  it('sends a suggestion as pending, as that person', async () => {
    await addSuggestion({ id: 'u1' }, { space: 'story-ledger', kind: 'show', title: 'Knight Rider', why: null })
    expect(steps(last(), 'insert')[0][1]).toEqual({ space: 'story-ledger', kind: 'show', title: 'Knight Rider', why: null, user_id: 'u1', status: 'pending' })
  })
  it('explains the daily limit when the database refuses', async () => {
    h.results.suggestions = { data: null, error: { message: 'new row violates row-level security policy' } }
    await expect(addSuggestion({ id: 'u1' }, { space: 's', kind: 'show', title: 'T' })).rejects.toThrow(/up to 3 a day/)
  })
  it('votes by adding a row, and takes a vote back by removing that person\u2019s own row only', async () => {
    await setVote({ id: 'u1' }, 's1', true)
    expect(steps(last(), 'insert')[0][1]).toEqual({ suggestion_id: 's1', user_id: 'u1' })
    await setVote({ id: 'u1' }, 's1', false)
    expect(steps(last(), 'delete').length).toBe(1)
    expect(steps(last(), 'eq')).toEqual([['eq', 'suggestion_id', 's1'], ['eq', 'user_id', 'u1']])
  })
})

describe('the owner\u2019s side', () => {
  it('reads and changes the switches', async () => {
    h.results.suggestion_spaces = { data: [{ space: 'story-ledger', enabled: true }, { space: 'book-club', enabled: false }], error: null }
    expect(await fetchSpaces()).toEqual({ 'story-ledger': true, 'book-club': false })
    await setSpaceOn('book-club', true)
    const up = steps(last(), 'upsert')[0]
    expect(up[1]).toMatchObject({ space: 'book-club', enabled: true })
    expect(up[2]).toEqual({ onConflict: 'space' })
  })
  it('reads every suggestion with its totals, and approves, hides or deletes one', async () => {
    h.results.suggestions = { data: [{ id: 'a', status: 'pending' }], error: null }
    h.results.suggestion_tally = { data: [{ suggestion_id: 'a', votes: 2 }], error: null }
    const out = await fetchAllForOwner()
    expect(out.tally).toEqual({ a: 2 })
    await setStatus('a', 'approved')
    expect(steps(last(), 'update')[0][1]).toEqual({ status: 'approved' })
    expect(steps(last(), 'eq')[0]).toEqual(['eq', 'id', 'a'])
    await removeSuggestion('a')
    expect(steps(last(), 'delete').length).toBe(1)
  })
  it('turns a refusal into plain words', async () => {
    h.results.suggestions = { data: null, error: { message: 'permission denied for table suggestions' } }
    await expect(setStatus('a', 'approved')).rejects.toThrow(/did not go through/)
  })
})
