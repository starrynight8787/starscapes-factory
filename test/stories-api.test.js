// @vitest-environment node
// The database calls for stories and chapters (src/stories/storiesApi.js).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sb = vi.hoisted(() => ({ result: { data: [], error: null }, seen: [] }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      const log = (...a) => { sb.seen.push([table, ...a]); return chain }
      const chain = { select: (c) => log('select', c), order: (c, o) => log('order', c, o && o.ascending), in: (c, v) => log('in', c, v), eq: (c, v) => log('eq', c, v), insert: (v) => log('insert', v), update: (v) => log('update', v), delete: () => log('delete'), upsert: (v, o) => log('upsert', v, o && o.onConflict), then: (res, rej) => Promise.resolve(sb.result).then(res, rej) }
      return chain
    },
  },
}))
import { fetchStories, fetchChapterRows, fetchChapterPosts, saveStory, removeStory, saveChapter, removeChapter } from '../src/stories/storiesApi'
beforeEach(() => { sb.seen = []; sb.result = { data: [], error: null } })

describe('reading', () => {
  it('asks for the stories, newest first, and only the public columns', async () => {
    sb.result = { data: [{ id: 'a' }], error: null }; await expect(fetchStories()).resolves.toEqual([{ id: 'a' }])
    expect(sb.seen[0]).toEqual(['stories', 'select', 'id, slug, title, teaser, picture_url, status, finished_on, created_at']); expect(sb.seen[1]).toEqual(['stories', 'order', 'created_at', false])
  })
  it('asks for which post is which chapter, in order', async () => {
    await fetchChapterRows(); expect(sb.seen[0]).toEqual(['story_chapters', 'select', 'story_id, number, post_id']); expect(sb.seen[1]).toEqual(['story_chapters', 'order', 'number', true])
  })
  it('asks for the chapter posts\u2019 title, picture and date by their ids, and NEVER for their words; and asks for nothing when there are no ids', async () => {
    await fetchChapterPosts(['p1', '', 'p2', null]); expect(sb.seen[0]).toEqual(['posts', 'select', 'id, title, image_url, created_at']); expect(sb.seen[0][2]).not.toMatch(/content/); expect(sb.seen[1]).toEqual(['posts', 'in', 'id', ['p1', 'p2']])
    sb.seen = []; await expect(fetchChapterPosts([])).resolves.toEqual([]); await expect(fetchChapterPosts(undefined)).resolves.toEqual([]); expect(sb.seen).toHaveLength(0)
  })
  it('turns a problem into plain words, and a non-list into an empty list', async () => {
    sb.result = { data: null, error: { message: 'boom' } }; await expect(fetchStories()).rejects.toThrow('That did not go through just now. Please try again in a moment.')
    sb.result = { data: 'odd', error: null }; await expect(fetchChapterRows()).resolves.toEqual([])
  })
})

describe('the owner\u2019s side', () => {
  it('adds a story, or changes one by its id', async () => {
    await saveStory(null, { title: 'T' }); expect(sb.seen[0]).toEqual(['stories', 'insert', { title: 'T' }])
    sb.seen = []; await saveStory('s1', { title: 'U' }); expect(sb.seen).toEqual([['stories', 'update', { title: 'U' }], ['stories', 'eq', 'id', 's1']])
  })
  it('saves a chapter so that a number already used is replaced, and takes a chapter out by its story and number', async () => {
    await saveChapter({ story_id: 's1', number: 2, post_id: 'p1' }); expect(sb.seen[0]).toEqual(['story_chapters', 'upsert', { story_id: 's1', number: 2, post_id: 'p1' }, 'story_id,number'])
    sb.seen = []; await removeChapter('s1', 2); expect(sb.seen).toEqual([['story_chapters', 'delete'], ['story_chapters', 'eq', 'story_id', 's1'], ['story_chapters', 'eq', 'number', 2]])
    sb.seen = []; await removeStory('s1'); expect(sb.seen).toEqual([['stories', 'delete'], ['stories', 'eq', 'id', 's1']])
  })
  it('says in plain words when the database refuses, when an address name or a post is already used, and when a post does not exist', async () => {
    sb.result = { error: { message: 'new row violates row-level security policy' } }; await expect(saveStory(null, {})).rejects.toThrow('Only the site owner can change the stories.')
    sb.result = { error: { code: '23505', message: 'duplicate key value violates unique constraint' } }; await expect(saveStory(null, {})).rejects.toThrow(/already a story with that address name/); await expect(saveChapter({})).rejects.toThrow(/already a chapter of a story/)
    sb.result = { error: { code: '23503', message: 'violates foreign key constraint' } }; await expect(saveChapter({})).rejects.toThrow('There is no post with that address.')
    sb.result = { error: { message: 'boom' } }; await expect(removeChapter('s', 1)).rejects.toThrow('That did not go through just now. Please try again in a moment.')
  })
})
