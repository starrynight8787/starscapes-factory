// @vitest-environment node
// The "about" column of the books table: the database calls cope if the column is not there yet, and the SQL files add it with the same limit the rules use.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sb = vi.hoisted(() => ({ results: [], seen: [] }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      const chain = {
        select: (c) => { sb.seen.push([table, 'select', c]); return chain },
        order: () => chain,
        update: (v) => { sb.seen.push([table, 'update', v]); return chain },
        insert: (v) => { sb.seen.push([table, 'insert', v]); return chain },
        eq: () => chain,
        then: (res, rej) => Promise.resolve(sb.results.shift() || { data: [], error: null }).then(res, rej),
      }
      return chain
    },
  },
}))
import { fetchBooks, saveBook } from '../src/bookclub/bookApi'
import { LIMITS } from '../src/bookclub/bookRules'
const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')
const DETAILS = 'year_published, theme_book, characters, review, quote, quote_page, series_name, series_number, series_total'
const COLUMNS = 'id, title, author, genre, status, started, finished, rating, cover_url, review_post_id, note, created_at'
beforeEach(() => { sb.results = []; sb.seen = [] })

describe('reading the books', () => {
  it('asks for the about text along with the rest', async () => {
    sb.results = [{ data: [{ id: 'a', about: 'Words.' }], error: null }]
    await expect(fetchBooks()).resolves.toEqual([{ id: 'a', about: 'Words.' }])
    expect(sb.seen[0]).toEqual(['books', 'select', `${COLUMNS}, genres, about, ${DETAILS}`])
  })
  it('asks again without it if the database has no about column yet, so the Book Club page never breaks before the SQL has been run', async () => {
    sb.results = [{ data: null, error: { message: 'column books.about does not exist' } }, { data: [{ id: 'a' }], error: null }]
    await expect(fetchBooks()).resolves.toEqual([{ id: 'a' }])
    expect(sb.seen.filter((s) => s[1] === 'select').map((s) => s[2])).toEqual([`${COLUMNS}, genres, about, ${DETAILS}`, `${COLUMNS}, about, ${DETAILS}`])
  })
  it('asks for fewer columns again if the book page columns are not there yet (sql/book-details.sql), down to the plain list', async () => {
    sb.results = [{ data: null, error: { message: 'column books.genres does not exist' } }, { data: null, error: { message: 'column books.year_published does not exist' } }, { data: null, error: { message: 'column books.about does not exist' } }, { data: [{ id: 'a' }], error: null }]
    await expect(fetchBooks()).resolves.toEqual([{ id: 'a' }])
    expect(sb.seen.filter((s) => s[1] === 'select').map((s) => s[2])).toEqual([`${COLUMNS}, genres, about, ${DETAILS}`, `${COLUMNS}, about, ${DETAILS}`, `${COLUMNS}, about`, COLUMNS])
  })
  it('does not ask again for any other trouble, and says it plainly', async () => {
    sb.results = [{ data: null, error: { message: 'boom' } }]
    await expect(fetchBooks()).rejects.toThrow('That did not go through just now. Please try again in a moment.'); expect(sb.seen.filter((s) => s[1] === 'select')).toHaveLength(1)
  })
})

describe('saving a book', () => {
  it('says plainly, and nothing is saved, if a description is sent before the about column exists', async () => {
    sb.results = [{ error: { message: 'Could not find the \'about\' column of \'books\' in the schema cache' } }]
    await expect(saveBook(null, { title: 'X', about: 'Words' })).rejects.toThrow('The "about" box needs one small step in Supabase first (run sql/books-about.sql). Nothing was saved.')
  })
  it('keeps the ordinary messages for other trouble (only the owner may save)', async () => {
    sb.results = [{ error: { message: 'new row violates row-level security policy' } }]
    await expect(saveBook(null, { title: 'X', about: null })).rejects.toThrow('Only the site owner can change the books.')
  })
})

describe('the SQL', () => {
  const limit = (sql) => Number((sql.match(/char_length\(about\) <= (\d+)/) || [])[1])
  it('books-about.sql adds the column to an existing table, safely, with the same limit as the rules, and says how to undo it', () => {
    const sql = read('sql/books-about.sql'); const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    expect(code).toMatch(/alter table public\.books add column if not exists about text check \(about is null or char_length\(about\) <= \d+\);/); expect(limit(code)).toBe(LIMITS.about)
    expect(code).not.toMatch(/\bdrop\b|\bdelete\b|\btruncate\b/i); expect(sql).toMatch(/alter table public\.books drop column if exists about/); expect(sql).toMatch(/safe to run more than once/)
  })
  it('books.sql has the same column with the same limit, for anyone starting from scratch', () => {
    const sql = read('sql/books.sql'); expect(sql).toMatch(/about text check \(about is null or char_length\(about\) <= \d+\),/); expect(limit(sql)).toBe(LIMITS.about)
  })
  it('needs no new permissions: the existing books rules already cover every column', () => {
    expect(read('sql/books-about.sql')).not.toMatch(/\bgrant\b|create policy|drop policy/i)
  })
})
