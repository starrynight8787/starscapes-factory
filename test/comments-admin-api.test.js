// @vitest-environment node
// The Manage comments page talking to the database: what it asks for, how it names what comes back, and that a delete which removed nothing is said, not hidden.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ calls: [], listResult: { data: [], error: null }, deleteResult: { data: [{ id: 'c1' }], error: null } }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => ({
      select: (cols) => ({ order: (col, opts) => ({ limit: async (n) => { h.calls.push({ op: 'list', table, cols, col, opts, n }); return h.listResult } }) }),
      delete: () => ({ eq: (col, val) => ({ select: async (cols) => { h.calls.push({ op: 'delete', table, col, val, cols }); return h.deleteResult } }) }),
    }),
  },
}))
import { deleteComment, fetchComments } from '../src/admin/commentsAdminApi'

beforeEach(() => { h.calls = []; h.listResult = { data: [], error: null }; h.deleteResult = { data: [{ id: 'c1' }], error: null } })

describe('reading the comments', () => {
  it('asks for every comment with its book\u2019s title, newest first, up to a thousand', async () => {
    await fetchComments()
    expect(h.calls).toEqual([{ op: 'list', table: 'book_comments', cols: 'id, book_id, author_name, body, created_at, books(title)', col: 'created_at', opts: { ascending: false }, n: 1000 }])
  })
  it('names each comment for the page, and copes with a missing book, name or text', async () => {
    h.listResult = { data: [
      { id: 'a', book_id: 'b1', author_name: 'Priya', body: 'Lovely.', created_at: '2026-10-20T18:39:00Z', books: { title: 'Atomic Habits' } },
      { id: 'b', book_id: 'b2', author_name: null, body: null, created_at: null, books: null },
    ], error: null }
    expect(await fetchComments()).toEqual([
      { id: 'a', bookId: 'b1', bookTitle: 'Atomic Habits', author: 'Priya', body: 'Lovely.', createdAt: '2026-10-20T18:39:00Z' },
      { id: 'b', bookId: 'b2', bookTitle: '', author: '', body: '', createdAt: null },
    ])
  })
  it('gives an empty list, not an error, when there is nothing or the answer is odd', async () => {
    expect(await fetchComments()).toEqual([]); h.listResult = { data: null, error: null }; expect(await fetchComments()).toEqual([])
  })
  it('says plainly that the comments could not load, and shows nothing of the database\u2019s own message', async () => {
    h.listResult = { data: null, error: { message: 'permission denied for table book_comments (secret detail)' } }
    await expect(fetchComments()).rejects.toThrow('The comments could not load just now. Please try again in a moment.')
    await expect(fetchComments()).rejects.not.toThrow(/secret|permission/)
  })
})

describe('deleting a comment', () => {
  it('deletes the one comment, and asks for its row back so it can tell it really went', async () => {
    await expect(deleteComment('c1')).resolves.toBeUndefined()
    expect(h.calls).toEqual([{ op: 'delete', table: 'book_comments', col: 'id', val: 'c1', cols: 'id' }])
  })
  it('says so, in plain words, when nothing was deleted (the database does not complain when it is not allowed)', async () => {
    h.deleteResult = { data: [], error: null }
    await expect(deleteComment('c1')).rejects.toThrow('That comment was not deleted. It may already be gone: reload the page to check.')
    h.deleteResult = { data: null, error: null }
    await expect(deleteComment('c1')).rejects.toThrow(/was not deleted/)
  })
  it('says so when the database refuses, without its own words', async () => {
    h.deleteResult = { data: null, error: { message: 'row-level security (secret detail)' } }
    await expect(deleteComment('c1')).rejects.toThrow('That comment could not be deleted just now. Please try again in a moment.')
    await expect(deleteComment('c1')).rejects.not.toThrow(/secret|security/)
  })
})
