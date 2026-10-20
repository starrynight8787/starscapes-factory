// @vitest-environment node
// The rules behind the "Manage comments" page: the counts, the filters and the words about each comment.
import { describe, it, expect } from 'vitest'
import { NEW_DAYS, bookChoices, filterComments, isNew, paragraphsOf, stats, whenText } from '../src/admin/commentsRules'

const NOW = Date.parse('2026-10-21T12:00:00Z')
const hoursAgo = (h) => new Date(NOW - h * 3600000).toISOString()
const c = (id, over = {}) => ({ id, bookId: 'b1', bookTitle: 'Atomic Habits', author: 'Priya', body: 'A good one.', createdAt: hoursAgo(1), ...over })
const list = [
  c('1', { author: 'Priya', createdAt: hoursAgo(3) }),
  c('2', { author: 'sam', bookId: 'b2', bookTitle: 'Radical Candor', body: 'Care personally, challenge directly.', createdAt: hoursAgo(24 * 6) }),
  c('3', { author: 'SAM', bookId: 'b2', bookTitle: 'Radical Candor', createdAt: hoursAgo(24 * 8) }),
  c('4', { author: '', bookId: 'b3', bookTitle: '', body: 'A gift of a book.', createdAt: hoursAgo(24 * 40) }),
]

describe('what counts as new', () => {
  it('is a comment from the last 7 days, and not one from the future or with no date', () => {
    expect(NEW_DAYS).toBe(7)
    expect(isNew(c('x', { createdAt: hoursAgo(24 * 6.9) }), NOW)).toBe(true)
    expect(isNew(c('x', { createdAt: hoursAgo(24 * 7.1) }), NOW)).toBe(false)
    expect(isNew(c('x', { createdAt: hoursAgo(-5) }), NOW)).toBe(false)
    for (const bad of [null, '', 'not a date']) expect(isNew(c('x', { createdAt: bad }), NOW), String(bad)).toBe(false)
    expect(isNew(null, NOW)).toBe(false)
  })
})

describe('the counts', () => {
  it('counts the comments, the new ones, the books, and the people (the same name in different capitals is one person)', () => {
    expect(stats(list, NOW)).toEqual({ total: 4, recent: 2, books: 3, people: 3 })
    expect(stats([], NOW)).toEqual({ total: 0, recent: 0, books: 0, people: 0 })
    expect(stats(null, NOW).total).toBe(0)
  })
})

describe('the books that have comments', () => {
  it('lists each once, A to Z, with how many, and gives a book with no title a name', () => {
    expect(bookChoices(list)).toEqual([{ id: 'b3', title: 'A book with no title', count: 1 }, { id: 'b1', title: 'Atomic Habits', count: 1 }, { id: 'b2', title: 'Radical Candor', count: 2 }])
    expect(bookChoices([])).toEqual([]); expect(bookChoices(null)).toEqual([])
  })
})

describe('the filters', () => {
  const ids = (l) => l.map((x) => x.id)
  it('shows everything to begin with, and narrows to one book', () => {
    expect(ids(filterComments(list))).toEqual(['1', '2', '3', '4'])
    expect(ids(filterComments(list, { book: 'b2' }))).toEqual(['2', '3'])
    expect(filterComments(list, { book: 'nope' })).toEqual([])
  })
  it('searches the words, the name and the book\u2019s title, ignoring capitals and spaces at the ends', () => {
    expect(ids(filterComments(list, { search: '  CHALLENGE ' }))).toEqual(['2'])
    expect(ids(filterComments(list, { search: 'sam' }))).toEqual(['2', '3'])
    expect(ids(filterComments(list, { search: 'atomic' }))).toEqual(['1'])
    expect(ids(filterComments(list, { search: 'gift' }))).toEqual(['4'])
    expect(filterComments(list, { search: 'zzz' })).toEqual([])
  })
  it('combines them, and copes with nothing to filter', () => {
    expect(ids(filterComments(list, { book: 'b2', search: 'care' }))).toEqual(['2'])
    expect(filterComments(null)).toEqual([]); expect(filterComments(undefined, { search: 'x' })).toEqual([])
  })
})

describe('the words about a comment', () => {
  it('keeps paragraphs, where a blank line starts a new one, and drops empty ones', () => {
    expect(paragraphsOf('First thought.\n\nSecond thought,\nover two lines.\n\n\n')).toEqual(['First thought.', 'Second thought, over two lines.'])
    expect(paragraphsOf('')).toEqual([]); expect(paragraphsOf(null)).toEqual([])
  })
  it('gives the day and the hour in London time, and nothing for a bad date', () => {
    expect(whenText('2026-10-20T18:39:00Z')).toBe('20 October 2026, 19:39')
    expect(whenText('2026-06-30T23:30:00Z')).toBe('1 July 2026, 00:30')
    expect(whenText(null)).toBe(''); expect(whenText('nope')).toBe('')
  })
})
