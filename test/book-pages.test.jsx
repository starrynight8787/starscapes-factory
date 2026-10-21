import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { genreShelves, matchesSearch, parseCharacters, seriesTiles } from '../src/bookclub/bookRules'

const BOOKS = [
  { id: 'a1', title: 'A is for Alibi', author: 'Sue Grafton', genre: 'fiction', status: 'read', finished: '2026-01-21', series_name: 'Kinsey Millhone', series_number: 1, series_total: 25 },
  { id: 'a2', title: 'B is for Burglar', author: 'Sue Grafton', genre: 'fiction', status: 'reading', series_name: 'Kinsey Millhone', series_number: 2 },
  { id: 'l1', title: 'The Culture Map', author: 'Erin Meyer', genre: 'leadership', status: 'read', finished: '2026-03-01' },
  { id: 'u1', title: 'Up next book', author: 'Someone', genre: 'memoir', status: 'upnext' },
]
vi.mock('../src/bookclub/bookApi', () => ({ fetchBooks: () => Promise.resolve(BOOKS), fetchGoals: () => Promise.resolve({}), fetchComments: () => Promise.resolve([]), canComment: () => Promise.resolve(false), addComment: vi.fn(), removeComment: vi.fn() }))
vi.mock('../src/suggest/useUser', () => ({ default: () => ({ loading: false, user: null }) }))
import BookShelfPage from '../src/bookclub/BookShelfPage'
import BookPage from '../src/bookclub/BookPage'

describe('the bookshelf rules', () => {
  it('puts read and reading books on their genre shelf, and leaves up-next books off', () => {
    const shelves = genreShelves(BOOKS)
    expect(shelves.find((s) => s.key === 'fiction').books.map((b) => b.id)).toEqual(['a1', 'a2'])
    expect(shelves.find((s) => s.key === 'memoir').books).toEqual([])
  })
  it('searches by author or title, ignoring capitals', () => {
    expect(matchesSearch(BOOKS[0], 'GRAFTON')).toBe(true)
    expect(matchesSearch(BOOKS[0], 'sue alibi')).toBe(true)
    expect(matchesSearch(BOOKS[0], 'meyer')).toBe(false)
    expect(genreShelves(BOOKS, 'meyer').flatMap((s) => s.books).map((b) => b.id)).toEqual(['l1'])
  })
  it('reads key characters one to a line', () => {
    expect(parseCharacters('Kinsey: PI\nBob')).toEqual([{ name: 'Kinsey', line: 'PI' }, { name: 'Bob', line: '' }])
  })
  it('works out the series tracker, and shows none for a book with no series', () => {
    const t = seriesTiles(BOOKS, BOOKS[0])
    expect(t.total).toBe(25); expect(t.readCount).toBe(1); expect(t.tiles).toHaveLength(12); expect(t.more).toBe(13)
    expect(t.tiles[0].state).toBe('read'); expect(t.tiles[1].state).toBe('reading'); expect(t.tiles[2].state).toBe('todo')
    expect(seriesTiles(BOOKS, BOOKS[2])).toBeNull()
  })
})

const shelf = (url) => render(<MemoryRouter initialEntries={[url]}><Routes><Route path="*" element={<BookShelfPage />} /></Routes></MemoryRouter>)

describe('the bookshelf page', () => {
  it('shows a shelf for each genre that has books, with the books as links to their own pages, and hides the empty shelves', async () => {
    shelf('/shelf')
    const fiction = await screen.findByRole('region', { name: 'Fiction' })
    expect(within(fiction).getByRole('link', { name: 'A is for Alibi by Sue Grafton' })).toHaveAttribute('href', '/knowledge-nook/book-club/book/a1')
    expect(within(fiction).getByRole('link', { name: /B is for Burglar.*reading now/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Memoir' })).toBeNull() // no memoirs yet, so no memoir shelf
    expect(screen.queryByRole('button', { name: /Memoir/ })).toBeNull() // and it is not in the jump list either
  })
  it('highlights the chosen genre', async () => {
    shelf('/shelf?genre=leadership')
    const lead = await screen.findByRole('region', { name: 'Leadership' })
    expect(within(lead).getByText('You picked this shelf')).toBeInTheDocument()
  })
  it('says so, and still shows the shelves that have books, when a link points at a genre with no books yet', async () => {
    shelf('/shelf?genre=memoir')
    expect(await screen.findByText(/There are no books on the Memoir shelf yet/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Fiction' })).toBeInTheDocument()
  })
  it('keeps only matching books when searching by author, and says so when nothing matches', async () => {
    shelf('/shelf')
    await screen.findByRole('region', { name: 'Fiction' })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search by author or title' }), { target: { value: 'meyer' } })
    expect(screen.queryByRole('region', { name: 'Fiction' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /The Culture Map/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByRole('status')).toHaveTextContent('No books match')
  })
})

describe('a book’s own page', () => {
  it('shows the facts, the series tracker, and asks you to log in for the comments', async () => {
    render(<MemoryRouter initialEntries={['/book/a1']}><Routes><Route path="/book/:id" element={<BookPage />} /></Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { level: 1, name: 'A is for Alibi' })).toBeInTheDocument()
    expect(screen.getByText('Kinsey Millhone · Book 1 of 25')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Series tracker/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.queryByPlaceholderText('Add a comment…')).not.toBeInTheDocument()
  })
  it('says plainly when the book cannot be found', async () => {
    render(<MemoryRouter initialEntries={['/book/nope']}><Routes><Route path="/book/:id" element={<BookPage />} /></Routes></MemoryRouter>)
    expect(await screen.findByText(/couldn.t find that book/)).toBeInTheDocument()
  })
})
