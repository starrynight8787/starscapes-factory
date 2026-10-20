// @vitest-environment node
// The rules of the Book Club tracker, and that they agree with the database file.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { GENRES, STATUSES, LIMITS, cleanBook, cleanGoal, postIdFrom, shelfFor, yearsOf, progress, spineClass, starsText, safeCover, tidyText, aboutParagraphs } from '../src/bookclub/bookRules'

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')
const good = { title: '  The Culture Map ', author: 'Erin Meyer', genre: 'leadership', status: 'read', started: '2026-09-01', finished: '2026-10-03', rating: '4', cover: 'https://img.example.com/c.jpg', review: 'https://starscapesfactory.com/post/abc-123', note: 'Changed how I run meetings.' }

describe('a book', () => {
  it('is accepted when it is good, tidied up, and ready for the database', () => {
    expect(cleanBook(good)).toEqual({ ok: true, value: { title: 'The Culture Map', author: 'Erin Meyer', genre: 'leadership', status: 'read', started: '2026-09-01', finished: '2026-10-03', rating: 4, cover_url: 'https://img.example.com/c.jpg', review_post_id: 'abc-123', note: 'Changed how I run meetings.', about: null } })
  })
  it('keeps everything optional really optional, as nothing (null)', () => {
    expect(cleanBook({ title: 'Dune', status: 'upnext' }).value).toEqual({ title: 'Dune', author: null, genre: null, status: 'upnext', started: null, finished: null, rating: null, cover_url: null, review_post_id: null, note: null, about: null })
    // with no status given it counts as "read", which needs a finishing date, so a bare title is asked for the date
    const bare = cleanBook({ title: 'Dune' })
    expect(bare.ok).toBe(false)
    expect(bare.errors.finished).toMatch(/needs the date you finished/)
  })
  it('needs a title, and a finishing date for a book you have read, in plain words', () => {
    expect(cleanBook({ ...good, title: '  ' }).errors.title).toMatch(/title/)
    expect(cleanBook({ ...good, finished: '' }).errors.finished).toMatch(/needs the date you finished/)
    expect(cleanBook({ ...good, status: 'reading', finished: '' }).ok).toBe(true)
  })
  it('checks the dates are real dates, in order', () => {
    expect(cleanBook({ ...good, finished: '2026-02-30' }).errors.finished).toMatch(/year-month-day/)
    expect(cleanBook({ ...good, started: '3 Oct' }).errors.started).toMatch(/year-month-day/)
    expect(cleanBook({ ...good, started: '2026-10-05', finished: '2026-10-03' }).errors.finished).toMatch(/before the starting date/)
  })
  it('only takes the genres and statuses that exist, and a rating of 1 to 5', () => {
    expect(cleanBook({ ...good, genre: 'horror' }).errors.genre).toBeTruthy()
    expect(cleanBook({ ...good, status: 'abandoned' }).errors.status).toBeTruthy()
    for (const r of ['0', '6', '4.5', 'five']) expect(cleanBook({ ...good, rating: r }).errors.rating, r).toBeTruthy()
    expect(cleanBook({ ...good, rating: '' }).value.rating).toBeNull()
  })
  it('only takes a cover that is an https picture, and a review that is a post address or code', () => {
    for (const bad of ['http://x.example/c.jpg', 'https://x.example/c.svg', 'javascript:alert(1)', 'c.jpg', 'https://x.example/c.jpg"onload=1']) expect(cleanBook({ ...good, cover: bad }).errors.cover, bad).toBeTruthy()
    expect(cleanBook({ ...good, review: 'my review of it' }).errors.review).toBeTruthy()
    expect(cleanBook({ ...good, review: '../../x' }).errors.review).toBeTruthy()
    expect(safeCover('https://a.example/x.webp?v=1')).toBe('https://a.example/x.webp?v=1')
  })
  it('keeps text within the limits the database has, and strips hidden characters', () => {
    expect(cleanBook({ ...good, title: 'x'.repeat(LIMITS.title + 1) }).errors.title).toBeTruthy()
    expect(cleanBook({ ...good, author: 'x'.repeat(LIMITS.author + 1) }).errors.author).toBeTruthy()
    expect(cleanBook({ ...good, note: 'x'.repeat(LIMITS.note + 1) }).errors.note).toBeTruthy()
    expect(cleanBook({ ...good, title: 'A\u0000 B\u0007' }).value.title).toBe('A B')
    expect(cleanBook(null).ok).toBe(false)
  })
})

describe('finding a post from what is pasted', () => {
  it('takes the code, or the address of the post, and nothing else', () => {
    expect(postIdFrom('abc-123')).toBe('abc-123')
    expect(postIdFrom('https://starscapesfactory.com/post/abc-123')).toBe('abc-123')
    expect(postIdFrom('https://starscapesfactory.com/post/abc-123/?x=1')).toBe('abc-123')
    for (const bad of ['', 'two words', '/post/', '../x', 'a'.repeat(65), null]) expect(postIdFrom(bad), String(bad)).toBe('')
  })
})

describe('a year\u2019s goal and theme', () => {
  it('needs a year, and takes a goal and a theme if given', () => {
    expect(cleanGoal({ year: '2027', goal: '24', theme: ' Courage ' })).toEqual({ ok: true, value: { year: 2027, goal: 24, theme: 'Courage' } })
    expect(cleanGoal({ year: '2027', goal: '', theme: '' }).value).toEqual({ year: 2027, goal: null, theme: null })
    expect(cleanGoal({ year: '', goal: '24' }).errors.year).toBeTruthy()
    for (const g of ['0', '-3', '1.5', 'many', '1000']) expect(cleanGoal({ year: '2027', goal: g }).errors.goal, g).toBeTruthy()
    expect(cleanGoal({ year: '2027', theme: 'x'.repeat(121) }).errors.theme).toBeTruthy()
  })
})

describe('the shelf', () => {
  const b = (id, status, finished, extra = {}) => ({ id, status, finished, created_at: '2026-01-01', ...extra })
  const books = [b('a', 'read', '2026-10-03'), b('b', 'read', '2026-03-01'), b('c', 'reading', null), b('d', 'read', '2025-12-30'), b('e', 'upnext', null), b('f', 'read', '2026-03-01', { created_at: '2026-02-01' }),
    b('g', 'reading', '2026-05-05'), b('h', 'upnext', '2026-06-06'), b('i', 'reading', '2024-01-01')] // a book being read again, or queued, may still carry an old finishing date
  it('holds only the books read that year, in the order they were finished', () => {
    expect(shelfFor(books, 2026).map((x) => x.id)).toEqual(['b', 'f', 'a'])
    expect(shelfFor(books, 2025).map((x) => x.id)).toEqual(['d'])
    expect(shelfFor(books, 2030)).toEqual([])
    expect(shelfFor(books, 2024)).toEqual([]) // the book with a 2024 date is only being read, so it is not on any shelf
    expect(shelfFor(null, 2026)).toEqual([])
  })
  it('offers each year that has books, newest first, and always this year', () => {
    expect(yearsOf(books, 2026)).toEqual([2026, 2025])
    expect(yearsOf([], 2027)).toEqual([2027])
    expect(yearsOf(books, 2027)).toEqual([2027, 2026, 2025])
  })
  it('says how far along you are, with and without a goal', () => {
    expect(progress(7, 24)).toEqual({ count: 7, goal: 24, percent: 29, text: '7 of 24 books' })
    expect(progress(30, 24).percent).toBe(100)
    expect(progress(1, null).text).toBe('1 book read')
    expect(progress(0, 0).text).toBe('0 books read')
    expect(progress(3, undefined).percent).toBeNull()
  })
  it('gives each spine a height class that stays the same for the same book, between h0 and h6', () => {
    expect(spineClass('abc')).toBe(spineClass('abc'))
    const set = new Set(Array.from({ length: 60 }, (_, i) => spineClass(`book-${i}`)))
    for (const c of set) expect(c).toMatch(/^bc__spine--h[0-6]$/)
    expect(set.size).toBeGreaterThan(3)
  })
  it('writes a rating in stars and in words', () => {
    expect(starsText(4)).toBe('\u2605\u2605\u2605\u2605\u2606 (4 out of 5)')
    expect(starsText(null)).toBe('')
    expect(starsText(9)).toBe('')
  })
})

describe('agreement with the database file', () => {
  const sql = read('sql/books.sql')
  it('uses the same genres, statuses, ratings and limits', () => {
    expect(sql).toContain(`genre in (${GENRES.map((g) => `'${g.key}'`).join(', ')})`)
    expect(sql).toContain(`status in (${STATUSES.map((s) => `'${s.key}'`).join(', ')})`)
    expect(sql).toContain('rating between 1 and 5')
    expect(sql).toContain(`between 1 and ${LIMITS.title}`)
    expect(sql).toContain(`char_length(author) <= ${LIMITS.author}`)
    expect(sql).toContain(`char_length(note) <= ${LIMITS.note}`)
    expect(sql).toContain(`char_length(theme) <= ${LIMITS.theme}`)
    expect(sql).toContain(`between 1 and ${LIMITS.goalMax}`)
    expect(sql).toContain("check (status <> 'read' or finished is not null)")
    expect(sql).toContain("cover_url ~ '^https://'")
  })
})

describe('what the book is about (the box under "Reading now")', () => {
  const withAbout = (about) => cleanBook({ ...good, about })
  it('is optional, and is nothing (null) when left empty or blank', () => {
    expect(withAbout('').value.about).toBeNull(); expect(withAbout('   \n  \n ').value.about).toBeNull(); expect(withAbout(undefined).value.about).toBeNull(); expect(withAbout(null).value.about).toBeNull()
  })
  it('keeps the paragraphs: line breaks stay, a long run of blank lines becomes one blank line, and spaces are tidied', () => {
    expect(withAbout('  First   paragraph.\r\n\r\n\r\n\r\n  Second one. \n').value.about).toBe('First paragraph.\n\nSecond one.')
  })
  it('removes control characters, so nothing odd can be saved', () => {
    expect(withAbout('Hello\u0000 there\u0007!').value.about).toBe('Hello there !')
  })
  it('can be up to 1,000 letters, and not one more, in plain words', () => {
    expect(LIMITS.about).toBe(1000)
    expect(withAbout('a'.repeat(1000)).ok).toBe(true)
    const tooLong = withAbout('a'.repeat(1001)); expect(tooLong.ok).toBe(false); expect(tooLong.errors.about).toBe('Keep what the book is about to 1000 characters or fewer.')
  })
  it('is shown as a list of paragraphs: a blank line starts a new one, a single line break is just a space, and empty ones are dropped', () => {
    expect(aboutParagraphs('One line\nstill one.\n\nTwo.\n\n\n\nThree.')).toEqual(['One line still one.', 'Two.', 'Three.'])
    expect(aboutParagraphs('')).toEqual([]); expect(aboutParagraphs(null)).toEqual([]); expect(aboutParagraphs(undefined)).toEqual([]); expect(aboutParagraphs('  \n\n  ')).toEqual([])
  })
  it('tidyText leaves a single paragraph with its words alone', () => {
    expect(tidyText('Just one paragraph.')).toBe('Just one paragraph.')
  })
})
