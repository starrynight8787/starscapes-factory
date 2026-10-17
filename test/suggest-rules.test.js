// @vitest-environment node
// The plain rules of the suggest and vote box, and that they agree with the database file.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { SPACES, LIMITS, cleanSuggestion, rankSuggestions, plainProblem } from '../src/suggest/suggestRules'

describe('what each space asks', () => {
  it('has Story Ledger (a show or a stat) and Book Club (a book), each with plain words', () => {
    expect(Object.keys(SPACES)).toEqual(['story-ledger', 'book-club'])
    expect(SPACES['story-ledger'].kinds.map((k) => k.key)).toEqual(['show', 'stat'])
    expect(SPACES['book-club'].kinds.map((k) => k.key)).toEqual(['book'])
    expect(SPACES['story-ledger'].heading).toBe('What should I audit next?')
    expect(SPACES['book-club'].heading).toBe('What should we read next?')
    for (const s of Object.values(SPACES)) expect(s.blurb).toMatch(/I read every suggestion before it shows/)
  })
  it('uses the same kinds, limits and spaces as the database file', () => {
    const sql = fs.readFileSync(path.resolve('sql/suggestions.sql'), 'utf8')
    expect(sql).toContain("check (kind in ('show', 'stat', 'book'))")
    expect(sql).toContain(`between ${LIMITS.titleMin} and ${LIMITS.titleMax}`)
    expect(sql).toContain(`char_length(why) <= ${LIMITS.whyMax}`)
    expect(sql).toContain(`< ${LIMITS.perDay}`)
    for (const space of Object.keys(SPACES)) expect(sql).toContain(`'${space}'`)
  })
})

describe('checking a suggestion before it is sent', () => {
  const ok = { kind: 'show', title: 'Knight Rider', why: 'A talking car.' }
  it('accepts a good one, tidied up', () => {
    expect(cleanSuggestion('story-ledger', { ...ok, title: '  Knight   Rider \n' })).toEqual({ ok: true, value: { space: 'story-ledger', kind: 'show', title: 'Knight Rider', why: 'A talking car.' } })
    expect(cleanSuggestion('story-ledger', { ...ok, why: '   ' }).value.why).toBeNull()
  })
  it('asks for a title, and refuses a title that is too long', () => {
    expect(cleanSuggestion('story-ledger', { ...ok, title: ' ' }).errors.title).toMatch(/write what/)
    expect(cleanSuggestion('story-ledger', { ...ok, title: 'x'.repeat(LIMITS.titleMax + 1) }).errors.title).toMatch(/120/)
    expect(cleanSuggestion('story-ledger', { ...ok, why: 'x'.repeat(LIMITS.whyMax + 1) }).errors.why).toMatch(/300/)
  })
  it('refuses web addresses, which is mostly what spam is', () => {
    for (const bad of ['see https://x.example', 'www.example.com', 'buy at cheap.com now', 'a.ru']) {
      expect(cleanSuggestion('story-ledger', { ...ok, title: bad }).ok, bad).toBe(false)
      expect(cleanSuggestion('story-ledger', { ...ok, why: bad }).ok, bad).toBe(false)
    }
  })
  it('only takes the kinds that page allows', () => {
    expect(cleanSuggestion('book-club', { kind: 'show', title: 'Dune' }).errors.kind).toBeTruthy()
    expect(cleanSuggestion('book-club', { kind: 'book', title: 'Dune' }).ok).toBe(true)
    expect(cleanSuggestion('nowhere', ok).ok).toBe(false)
  })
  it('strips hidden control characters, and treats anything odd as plain text', () => {
    expect(cleanSuggestion('story-ledger', { ...ok, title: 'Knight\u0000 Rider\u0007' }).value.title).toBe('Knight Rider')
    expect(cleanSuggestion('story-ledger', null).ok).toBe(false)
    expect(cleanSuggestion('story-ledger', { kind: 'show', title: '<b>Hi</b>' }).value.title).toBe('<b>Hi</b>') // kept as text: React shows it as text, never as markup
  })
})

describe('putting the list in order', () => {
  const rows = [
    { id: 'a', status: 'approved', created_at: '2026-10-01' },
    { id: 'b', status: 'approved', created_at: '2026-10-02' },
    { id: 'c', status: 'chosen', created_at: '2026-10-03' },
    { id: 'd', status: 'pending', created_at: '2026-10-04' },
    { id: 'e', status: 'hidden', created_at: '2026-10-05' },
    { id: 'f', status: 'approved', created_at: '2026-10-06' },
  ]
  it('puts the chosen one first, then the most votes, then the earliest', () => {
    const out = rankSuggestions(rows, { a: 3, b: 9, f: 9, c: 1 }, new Set(['b']))
    expect(out.map((r) => r.id)).toEqual(['c', 'b', 'f', 'a'])
    expect(out.find((r) => r.id === 'b')).toMatchObject({ votes: 9, voted: true })
    expect(out.find((r) => r.id === 'a')).toMatchObject({ votes: 3, voted: false })
  })
  it('never lists a pending or hidden one, and copes with nothing', () => {
    expect(rankSuggestions(rows).map((r) => r.id)).not.toEqual(expect.arrayContaining(['d']))
    expect(rankSuggestions(rows).some((r) => r.id === 'e')).toBe(false)
    expect(rankSuggestions(null)).toEqual([])
  })
})

describe('plain words for a problem', () => {
  it('explains the daily limit, a repeat, and anything else, and never repeats the database', () => {
    expect(plainProblem({ message: 'new row violates row-level security policy for table "suggestions"' })).toMatch(/up to 3 a day/)
    expect(plainProblem({ code: '23505' })).toMatch(/already done that/)
    const other = plainProblem({ message: 'connection to server at db.secret.example failed' })
    expect(other).toMatch(/try again/)
    expect(other).not.toMatch(/secret|connection/)
  })
})
