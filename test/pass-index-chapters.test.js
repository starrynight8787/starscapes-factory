// @vitest-environment node
// The pass labels know about story chapters: chapters 1 to 3 of each story are "free to read", chapter 4 on are not, and chapters do not use up a pass's other free places
// (the same rule as the database, sql/stories.sql).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sb = vi.hoisted(() => ({ posts: { data: [], error: null }, chapters: { data: [], error: null }, chaptersThrow: false, asked: [] }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => ({
      select: (cols) => {
        sb.asked.push([table, cols])
        if (table === 'story_chapters') { if (sb.chaptersThrow) throw new Error('no such table'); return Promise.resolve(sb.chapters) }
        return { not: () => Promise.resolve(sb.posts) }
      },
    }),
  },
}))
import { loadPassIndex, resetPassIndex } from '../src/membership/passIndex'

const row = (id, created, pass = 'come-write-with-me', published = true) => ({ id, pass, created_at: created, published })
beforeEach(() => { resetPassIndex(); sb.posts = { data: [], error: null }; sb.chapters = { data: [], error: null }; sb.chaptersThrow = false; sb.asked = [] })

describe('chapters of a story', () => {
  it('asks which posts are chapters, once, for the public columns only', async () => {
    await loadPassIndex(); expect(sb.asked.filter(([t]) => t === 'story_chapters')).toEqual([['story_chapters', 'post_id, number']])
  })
  it('are free for chapters 1 to 3 and not free from chapter 4, whatever order they were written in', async () => {
    sb.posts.data = [row('c4', '2026-10-01'), row('c1', '2026-10-02'), row('c3', '2026-10-03'), row('c2', '2026-10-04'), row('c5', '2026-10-05')]
    sb.chapters.data = [{ post_id: 'c1', number: 1 }, { post_id: 'c2', number: 2 }, { post_id: 'c3', number: 3 }, { post_id: 'c4', number: 4 }, { post_id: 'c5', number: 5 }]
    const index = await loadPassIndex(); expect(['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => index.get(id).free)).toEqual([true, true, true, false, false])
  })
  it('give every story its own free three', async () => {
    sb.posts.data = [row('a1', '2026-01-01'), row('a4', '2026-01-04'), row('b1', '2026-06-01'), row('b4', '2026-06-04')]
    sb.chapters.data = [{ post_id: 'a1', number: 1 }, { post_id: 'a4', number: 4 }, { post_id: 'b1', number: 1 }, { post_id: 'b4', number: 4 }]
    const index = await loadPassIndex(); expect(['a1', 'a4', 'b1', 'b4'].map((id) => index.get(id).free)).toEqual([true, false, true, false])
  })
  it('do not use up the pass\u2019s other free places: the three oldest posts that are not chapters are still the free ones', async () => {
    sb.posts.data = [row('chap1', '2026-01-01'), row('chap2', '2026-01-02'), row('chap3', '2026-01-03'), row('chap4', '2026-01-04'), row('n1', '2026-02-01'), row('n2', '2026-02-02'), row('n3', '2026-02-03'), row('n4', '2026-02-04')]
    sb.chapters.data = [{ post_id: 'chap1', number: 1 }, { post_id: 'chap2', number: 2 }, { post_id: 'chap3', number: 3 }, { post_id: 'chap4', number: 4 }]
    const index = await loadPassIndex(); expect(['n1', 'n2', 'n3', 'n4'].map((id) => index.get(id).free)).toEqual([true, true, true, false]); expect(index.get('chap4').free).toBe(false)
  })
  it('carry on as before, with no chapters, if the chapters cannot be found (the table may not exist yet)', async () => {
    sb.posts.data = [row('n1', '2026-02-01'), row('n2', '2026-02-02'), row('n3', '2026-02-03'), row('n4', '2026-02-04')]
    sb.chaptersThrow = true; expect([...(await loadPassIndex()).values()].map((v) => v.free)).toEqual([true, true, true, false])
    resetPassIndex(); sb.chaptersThrow = false; sb.chapters = { data: null, error: { message: 'relation does not exist' } }; expect([...(await loadPassIndex()).values()].map((v) => v.free)).toEqual([true, true, true, false])
    resetPassIndex(); sb.chapters = { data: [{ post_id: 'n1', number: 'x' }, null, { number: 1 }], error: null }; expect((await loadPassIndex()).get('n1').free).toBe(true)
  })
})
