// @vitest-environment node
// Working out which posts belong to a pass, and which are the free three (src/membership/passIndex.js). It must give exactly the same free three as the database rule (sql/locked-posts.sql).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sb = vi.hoisted(() => ({ result: { data: [], error: null }, queries: 0, throws: false }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: (cols) => ({
        not: (col, op, val) => {
          sb.queries += 1
          sb.asked = [cols, col, op, val]
          if (sb.throws) throw new Error('not a chain')
          return Promise.resolve(sb.result)
        },
      }),
    }),
  },
}))

import { loadPassIndex, resetPassIndex, FREE_SAMPLE } from '../src/membership/passIndex'

const row = (id, pass, created, published = true) => ({ id, pass, created_at: created, published })
beforeEach(() => { resetPassIndex(); sb.queries = 0; sb.throws = false; sb.result = { data: [], error: null } })

describe('what it asks the database', () => {
  it('asks once, for only the posts that have a pass, and only the public facts about them', async () => {
    await loadPassIndex()
    expect(sb.asked).toEqual(['id, pass, created_at, published', 'pass', 'is', null])
  })
  it('asks only once however many lists want to know, and again after it is told to forget', async () => {
    await Promise.all([loadPassIndex(), loadPassIndex(), loadPassIndex()]); expect(sb.queries).toBe(1)
    resetPassIndex(); await loadPassIndex(); expect(sb.queries).toBe(2)
  })
})

describe('the free three', () => {
  it('are the three OLDEST published posts of each pass, and the rest are not free', async () => {
    sb.result = { data: [row('d', 'blueprints', '2026-10-04'), row('b', 'blueprints', '2026-10-02'), row('a', 'blueprints', '2026-10-01'), row('c', 'blueprints', '2026-10-03'), row('e', 'blueprints', '2026-10-05')], error: null }
    const index = await loadPassIndex()
    expect(FREE_SAMPLE).toBe(3)
    expect(['a', 'b', 'c', 'd', 'e'].map((id) => index.get(id).free)).toEqual([true, true, true, false, false])
  })
  it('are counted separately for each pass', async () => {
    sb.result = { data: [row('b1', 'blueprints', '2026-10-01'), row('c1', 'book-club', '2026-10-09'), row('b2', 'blueprints', '2026-10-02'), row('c2', 'book-club', '2026-10-10')], error: null }
    const index = await loadPassIndex()
    for (const id of ['b1', 'b2', 'c1', 'c2']) expect(index.get(id).free, id).toBe(true); expect(index.get('c1').pass).toBe('book-club')
  })
  it('do not count unpublished posts, which the database does not count either (a draft cannot use up a free place)', async () => {
    sb.result = { data: [row('draft', 'blueprints', '2026-09-30', false), row('a', 'blueprints', '2026-10-01'), row('b', 'blueprints', '2026-10-02'), row('c', 'blueprints', '2026-10-03'), row('d', 'blueprints', '2026-10-04')], error: null }
    const index = await loadPassIndex()
    expect(['a', 'b', 'c', 'd'].map((id) => index.get(id).free)).toEqual([true, true, true, false]); expect(index.get('draft').free).toBe(false)
  })
  it('break a tie on the same time by the post\u2019s id, the way the database does', async () => {
    sb.result = { data: [row('d', 'blueprints', '2026-10-01T10:00:00Z'), row('c', 'blueprints', '2026-10-01T10:00:00Z'), row('b', 'blueprints', '2026-10-01T10:00:00Z'), row('a', 'blueprints', '2026-10-01T10:00:00Z')], error: null }
    const index = await loadPassIndex(); expect(['a', 'b', 'c', 'd'].map((id) => index.get(id).free)).toEqual([true, true, true, false])
  })
})

describe('anything odd', () => {
  it('ignores a post whose pass is not a real pass', async () => {
    sb.result = { data: [row('x', 'made-up-pass', '2026-10-01'), row('y', '', '2026-10-01'), row('z', null, '2026-10-01')], error: null }
    const index = await loadPassIndex(); expect(index.size).toBe(0)
  })
  it('gives no chips at all, and never throws, if the database refuses or the question cannot be asked', async () => {
    sb.result = { data: null, error: { message: 'column posts.pass does not exist' } }; expect((await loadPassIndex()).size).toBe(0)
    resetPassIndex(); sb.throws = true; expect((await loadPassIndex()).size).toBe(0)
    resetPassIndex(); sb.throws = false; sb.result = { data: 'nonsense', error: null }; expect((await loadPassIndex()).size).toBe(0)
  })
})
