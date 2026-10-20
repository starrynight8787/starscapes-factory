// @vitest-environment node
// The database call behind the list of every post (src/admin/postsAdminApi.js).
import { describe, it, expect, vi, beforeEach } from 'vitest'
const sb = vi.hoisted(() => ({ results: [], seen: [] }))
vi.mock('../src/supabaseClient', () => ({
  supabase: { from: (table) => { const chain = { select: (c) => { sb.seen.push([table, 'select', c]); return chain }, order: (c, o) => { sb.seen.push([table, 'order', c, o && o.ascending]); return chain }, limit: (n) => { sb.seen.push([table, 'limit', n]); return chain }, then: (res, rej) => Promise.resolve(sb.results.shift() || { data: [], error: null }).then(res, rej) }; return chain } },
}))
import { fetchAllPosts } from '../src/admin/postsAdminApi'
beforeEach(() => { sb.results = []; sb.seen = [] })

describe('asking for every post', () => {
  it('asks for the public details only (never a post\u2019s words), newest first, up to a thousand', async () => {
    sb.results = [{ data: [{ id: 'a' }], error: null }]; await expect(fetchAllPosts()).resolves.toEqual([{ id: 'a' }])
    expect(sb.seen[0]).toEqual(['posts', 'select', 'id, title, channel, tags, published, created_at, pass']); expect(sb.seen[0][2]).not.toMatch(/content/); expect(sb.seen[1]).toEqual(['posts', 'order', 'created_at', false]); expect(sb.seen[2]).toEqual(['posts', 'limit', 1000])
  })
  it('asks again without the pass column if the database does not have it yet, so the list still works', async () => {
    sb.results = [{ data: null, error: { message: 'column posts.pass does not exist' } }, { data: [{ id: 'b' }], error: null }]
    await expect(fetchAllPosts()).resolves.toEqual([{ id: 'b' }]); expect(sb.seen.filter((s) => s[1] === 'select').map((s) => s[2])).toEqual(['id, title, channel, tags, published, created_at, pass', 'id, title, channel, tags, published, created_at'])
  })
  it('says plainly when it cannot, and gives an empty list for something that is not a list', async () => {
    sb.results = [{ data: null, error: { message: 'boom' } }]; await expect(fetchAllPosts()).rejects.toThrow('The posts could not load just now. Please try again in a moment.')
    sb.results = [{ data: 'odd', error: null }]; await expect(fetchAllPosts()).resolves.toEqual([])
  })
})
