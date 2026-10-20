// @vitest-environment node
// The two newer genre SQL files (sql/book-genres.sql: the 22 genres; sql/book-genres-multi.sql: a book in up to three genres) agree with the Book Club's own list and limit.
// If the site offered a genre the database's rule did not allow, saving that book in Admin would be refused: this fails first.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GENRES, MAX_GENRES } from '../src/bookclub/bookRules'

const read = (rel) => readFileSync(join(process.cwd(), rel), 'utf8')
const list = GENRES.map((g) => `'${g.key}'`).join(', ')
const multi = read('sql/book-genres-multi.sql')

describe('the genres in the SQL files are the genres the Book Club offers', () => {
  it('sql/book-genres.sql: the rule on the main genre lists exactly the site\u2019s genres, in the same order', () => {
    expect(read('sql/book-genres.sql')).toContain(`check (genre is null or genre in (${list}))`)
  })
  it('sql/book-genres-multi.sql: the same rule on the main genre, and the same list as the allowed genres of the new list', () => {
    expect(multi).toContain(`check (genre is null or genre in (${list}))`)
    expect(multi).toContain(`genres <@ array[${GENRES.map((g) => `'${g.key}'`).join(', ')}]`)
  })
  it('the site offers twenty-two genres, and each key is a plain lowercase word the rule can hold (no spaces or capitals that would not match)', () => {
    expect(GENRES).toHaveLength(22); for (const g of GENRES) expect(g.key, g.label).toMatch(/^[a-z]+(-[a-z]+)*$/)
    expect(new Set(GENRES.map((g) => g.key)).size).toBe(GENRES.length)
  })
})

describe('a book in up to three genres', () => {
  it('the database allows exactly the number of genres the site allows', () => {
    expect(MAX_GENRES).toBe(3); expect(multi).toContain(`cardinality(genres) <= ${MAX_GENRES}`)
  })
  it('adds a list column that is never empty of meaning: text list, never missing, empty by default', () => {
    expect(multi).toContain("add column if not exists genres text[] not null default '{}'")
  })
  it('keeps every book\u2019s old genre by copying it into its list, only where the list is still empty (so running it twice never overwrites a choice)', () => {
    expect(multi).toContain('update public.books set genres = array[genre] where genre is not null and cardinality(genres) = 0')
  })
  it('can be run more than once: it drops each rule before adding it, and adds the column only if it is missing', () => {
    expect(multi).toContain('drop constraint if exists books_genre_check'); expect(multi).toContain('drop constraint if exists books_genres_check'); expect(multi).toMatch(/add column if not exists genres/)
  })
  it('does not open the table to visitors by accident: it grants nothing (the table\u2019s permissions are unchanged)', () => {
    expect(multi).not.toMatch(/^\s*grant\s/im)
  })
})
