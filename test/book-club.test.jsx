// The Book Club page, the books tool in Admin, the database calls, and how they are wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ books: [], goals: {}, posts: [], failBooks: false, failPosts: false, owner: true, calls: [], failSave: false }))
vi.mock('../src/bookclub/bookApi', () => ({
  fetchBooks: vi.fn(async () => { if (h.failBooks) throw new Error('x'); return h.books }),
  fetchGoals: vi.fn(async () => h.goals),
  saveBook: vi.fn(async (id, value) => { if (h.failSave) throw new Error('Only the site owner can change the books.'); h.calls.push(['saveBook', id, value]) }),
  removeBook: vi.fn(async (id) => { h.calls.push(['removeBook', id]) }),
  saveGoal: vi.fn(async (value) => { h.calls.push(['saveGoal', value]) }),
}))
vi.mock('../src/rooms/roomsApi', () => ({ fetchRoomPosts: vi.fn(async () => { if (h.failPosts) throw new Error('x'); return h.posts }) }))
vi.mock('../src/suggest/SuggestPanel', () => ({ default: ({ space }) => <div data-testid="suggest-panel">{space}</div> }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import BookClubPage from '../src/bookclub/BookClubPage'
import AdminBooks from '../src/admin/AdminBooks'
import { PROJECT_SOCIALS } from '../src/data/contact'
import { findDoor, doorAreas } from '../src/doors/doorsData'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const NOW = new Date('2026-10-17T12:00:00Z')
const book = (id, title, status, finished, extra = {}) => ({ id, title, status, finished, started: null, author: `${title} author`, genre: 'leadership', rating: null, cover_url: null, review_post_id: null, note: null, created_at: '2026-01-01', ...extra })
const post = (n, tags) => ({ id: `p${n}`, title: `Note ${n}`, created_at: '2026-10-14T10:00:00Z', tags })
const page = () => render(<MemoryRouter><BookClubPage now={NOW} /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { books: [], goals: {}, posts: [], failBooks: false, failPosts: false, owner: true, calls: [], failSave: false }); vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('the page, as designed', () => {
  it('has the design\u2019s sections, in order', async () => {
    page()
    expect(screen.getByRole('heading', { level: 1, name: 'Book Club' })).toBeInTheDocument()
    expect(screen.getByText('come write with me, come read with me, come study with me')).toBeInTheDocument()
    const heads = screen.getAllByRole('heading', { level: 2 }).map((x) => x.textContent)
    expect(heads).toEqual(['A message from me', 'Into the Nebula', 'Theme for 2026: to be chosen', 'Read along with me', 'Reading now', 'Up next', 'The Shelf', 'Choose a genre', 'The 2026 shelf', 'Reviews and conversations'])
    expect(screen.getByRole('link', { name: /Back to Knowledge Nook/ })).toHaveAttribute('href', '/knowledge-nook')
    await screen.findByText('Nothing on the go at the moment.')
  })
  it('has the Come read with me button, to the live YouTube channel, opening safely in a new tab', () => {
    page()
    const button = screen.getByRole('link', { name: /Come read with me/ })
    expect(button).toHaveAttribute('href', PROJECT_SOCIALS['drafting-desk'].youtube)
    expect(button.getAttribute('href')).toBe('https://www.youtube.com/@thedraftingdesk')
    expect(button).toHaveAttribute('target', '_blank'); expect(button.getAttribute('rel')).toMatch(/noopener/)
    expect(button.getAttribute('aria-label')).toMatch(/opens YouTube in a new tab/)
    expect(button).toHaveTextContent('Come read with me')
    expect(screen.getByText('Live reading sessions on YouTube, together.')).toBeInTheDocument()
  })
  it('has the shared next-book box, for this page\u2019s space', () => {
    page()
    expect(screen.getByTestId('suggest-panel')).toHaveTextContent('book-club')
  })
})

describe('the genres', () => {
  it('shows the featured genres first, each a link to its own shelf on the bookshelf page, and the rest after "More genres"', async () => {
    h.posts = [post(1, ['book-club', 'leadership']), post(2, ['book-club', 'Leadership']), post(3, ['book-club', 'fiction']), post(4, ['leadership'])]
    page()
    await screen.findByRole('link', { name: /Mystery/ })
    expect(screen.queryByRole('link', { name: /Leadership/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'More genres' }))
    const lead = await screen.findByRole('link', { name: /Leadership/ })
    expect(lead).toHaveAttribute('href', '/knowledge-nook/book-club/shelf?genre=leadership')
    expect(screen.getByRole('link', { name: /Self-growth/ })).toHaveAttribute('href', '/knowledge-nook/book-club/shelf?genre=self-growth')
    expect(screen.getByRole('link', { name: /Children's/ })).toHaveAttribute('href', '/knowledge-nook/book-club/shelf?genre=childrens')
  })
})

describe('this year\u2019s theme', () => {
  it('says "to be chosen" until you set one, then shows it', async () => {
    const first = page()
    expect(screen.getByRole('heading', { name: 'Theme for 2026: to be chosen' })).toBeInTheDocument()
    first.unmount()
    h.goals = { 2026: { goal: 24, theme: 'Courage' } }
    page()
    expect(await screen.findByRole('heading', { name: 'Theme for 2026: Courage' })).toBeInTheDocument()
    expect(screen.getByText(/Each year the Book Club follows one theme/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join the conversation' })).toHaveAttribute('href', '#bc-reviews')
  })
})

describe('reading now and up next', () => {
  it('shows what you are reading, with its note and a link to your notes', async () => {
    h.books = [book('r1', 'Dare to Lead', 'reading', null, { note: 'On why vulnerability is not weakness', review_post_id: 'abc-1' }), book('n1', 'Dune', 'upnext', null)]
    page()
    expect(await screen.findByRole('heading', { level: 3, name: 'Dare to Lead' })).toBeInTheDocument()
    expect(screen.getByText('Dare to Lead author. On why vulnerability is not weakness')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read my notes' })).toHaveAttribute('href', '/post/abc-1')
    expect(screen.getByText('Dune, Dune author')).toBeInTheDocument()
  })
  it('says plainly when the books cannot load', async () => {
    h.failBooks = true
    page()
    expect(await screen.findByRole('alert')).toHaveTextContent('The books could not load just now. Please try again in a moment.')
  })
})

describe('the shelf', () => {
  beforeEach(() => {
    h.books = [
      book('a', 'Alpha', 'read', '2026-10-03', { rating: 4, genre: 'memoir', review_post_id: 'rev-a', note: 'A short note.' }),
      book('b', 'Bravo', 'read', '2026-03-01'),
      book('c', 'Charlie', 'read', '2025-12-30'),
      book('d', 'Delta', 'reading', null),
    ]
    h.goals = { 2026: { goal: 24, theme: null }, 2025: { goal: null, theme: null } }
  })
  it('shows this year\u2019s finished books as spines, in the order they were finished, and not the others', async () => {
    page()
    const spines = await screen.findAllByRole('button', { name: /by (Alpha|Bravo) author/ })
    expect(spines.map((b) => b.textContent)).toEqual(['Bravo', 'Alpha'])
    expect(screen.queryByRole('button', { name: /Charlie/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Delta/ })).toBeNull()
  })
  it('colours each spine by its genre, with a height class of its own', async () => {
    const { container } = page()
    await screen.findAllByRole('button', { name: /Alpha/ })
    const alpha = screen.getByRole('button', { name: /Alpha/ })
    expect(alpha.className).toMatch(/bc__spine--memoir/); expect(alpha.className).toMatch(/bc__spine--h[0-6]/)
    expect(screen.getByRole('button', { name: /Bravo/ }).className).toMatch(/bc__spine--leadership/)
    expect([...container.querySelectorAll('.bc__spine')].every((el) => !el.hasAttribute('style'))).toBe(true)
  })
  it('shows how far you are towards the goal, as words and as a bar', async () => {
    page()
    await screen.findAllByRole('button', { name: /Alpha/ })
    expect(screen.getByText('2 of 24 books read in 2026')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: '2 of 24 books in 2026' })
    expect(bar).toHaveAttribute('aria-valuenow', '2'); expect(bar).toHaveAttribute('aria-valuemax', '24')
  })
  it('just counts when there is no goal for the year, with no bar', async () => {
    h.goals = {}
    page()
    await screen.findAllByRole('button', { name: /Alpha/ })
    expect(screen.getByText('2 books read in 2026')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
  it('opens a book\u2019s card when its spine is pressed: rating, finishing date, note and a link to the review; and closes it again', async () => {
    page()
    const spine = await screen.findByRole('button', { name: /Alpha/ })
    fireEvent.click(spine)
    expect(spine).toHaveAttribute('aria-pressed', 'true')
    const card = screen.getByRole('heading', { level: 3, name: 'Alpha' }).closest('article')
    expect(within(card).getByText(/\u2605\u2605\u2605\u2605\u2606 \(4 out of 5\)/)).toBeInTheDocument()
    expect(within(card).getByText('Finished 3 Oct 2026')).toBeInTheDocument()
    expect(within(card).getByText('A short note.')).toBeInTheDocument()
    expect(within(card).getByText('Memoir')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Read my review' })).toHaveAttribute('href', '/post/rev-a')
    fireEvent.click(spine)
    expect(screen.queryByRole('heading', { level: 3, name: 'Alpha' })).toBeNull()
  })
  it('switches to another year\u2019s shelf, with its own goal, and closes any open card', async () => {
    page()
    fireEvent.click(await screen.findByRole('button', { name: /Alpha/ }))
    const years = screen.getByRole('group', { name: 'Choose a year' })
    expect(within(years).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['2025, 1 book', '2026, 2 of 24 so far'])
    expect(within(years).getByRole('button', { name: /^2026/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(years).getByRole('button', { name: /^2025/ }))
    expect(within(years).getByRole('button', { name: /^2025/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'The 2025 shelf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Charlie/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Alpha/ })).toBeNull()
    expect(screen.queryByRole('heading', { level: 3, name: 'Alpha' })).toBeNull()
    expect(screen.getByText('1 book read in 2025')).toBeInTheDocument()
  })
  it('says so when a year\u2019s shelf is empty', async () => {
    h.books = []
    page()
    expect(await screen.findByText('No books on the 2026 shelf yet.')).toBeInTheDocument()
  })
  it('shows a cover only when its address is a safe https picture, else a plain cover with the title', async () => {
    h.books = [book('a', 'Alpha', 'reading', null, { cover_url: 'https://img.example.com/a.jpg' }), book('b', 'Bravo', 'reading', null, { cover_url: 'javascript:alert(1)' })]
    const { container } = page()
    await screen.findByText('Alpha', { selector: 'h3' })
    expect(container.querySelector('img.bc__cover')).toHaveAttribute('src', 'https://img.example.com/a.jpg')
    expect(container.querySelectorAll('img.bc__cover').length).toBe(1) // (the banner picture is not a book cover)
  })
})

describe('reviews and conversations', () => {
  it('lists the Nook\u2019s posts tagged book-club, and no others', async () => {
    h.posts = [post(1, ['book-club']), post(2, ['Book Club']), post(3, ['story-ledger']), post(4, [])]
    page()
    expect(await screen.findByRole('link', { name: /^Note 1/ })).toHaveAttribute('href', '/post/p1')
    expect(screen.getByRole('link', { name: /^Note 2/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Note 3/ })).toBeNull()
  })
  it('says the first review is on its way, and plainly when they cannot load', async () => {
    const first = page()
    expect(await screen.findByText('The first review is on its way.')).toBeInTheDocument()
    first.unmount()
    h.failPosts = true
    page()
    expect(await screen.findByText(/reviews could not load just now/)).toBeInTheDocument()
  })
})

describe('the books tool in Admin', () => {
  const tool = () => render(<MemoryRouter><AdminBooks session={{ access_token: 't' }} /></MemoryRouter>)
  it('is for the owner only', () => {
    h.owner = false; h.books = [book('a', 'Secret title', 'read', '2026-01-01')]
    const { container } = tool()
    expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Secret title/)
  })
  it('adds a book: it checks it first, then saves it and says so', async () => {
    tool()
    fireEvent.click(await screen.findByRole('button', { name: 'Add the book' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Write the book\u2019s title.')
    expect(h.calls).toEqual([])
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'The Culture Map' } })
    fireEvent.change(screen.getByLabelText('Author'), { target: { value: 'Erin Meyer' } })
    fireEvent.click(screen.getByLabelText('Leadership'))
    fireEvent.change(screen.getByLabelText(/^Finished/), { target: { value: '2026-10-03' } })
    fireEvent.change(screen.getByLabelText(/Your rating/), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the book' }))
    expect(await screen.findByText('Added \u201cThe Culture Map\u201d.')).toBeInTheDocument()
    expect(h.calls).toEqual([['saveBook', null, expect.objectContaining({ title: 'The Culture Map', author: 'Erin Meyer', genre: 'leadership', genres: ['leadership'], status: 'read', finished: '2026-10-03', rating: 4 })]])
  })
  it('asks for the finishing date of a book you have read, and not for one you are reading', async () => {
    tool()
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Dune' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the book' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/needs the date you finished/)
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'reading' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the book' }))
    await waitFor(() => expect(h.calls[0][2]).toMatchObject({ title: 'Dune', status: 'reading', finished: null }))
  })
  it('changes an existing book: its details come into the form, and saving updates that book', async () => {
    h.books = [book('a', 'Alpha', 'read', '2026-10-03', { rating: 3 })]
    tool()
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    expect(screen.getByLabelText('Title')).toHaveValue('Alpha')
    expect(screen.getByRole('heading', { name: 'Change this book' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Alpha, 2nd edition' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(h.calls[0].slice(0, 2)).toEqual(['saveBook', 'a']))
    expect(h.calls[0][2].title).toBe('Alpha, 2nd edition')
  })
  it('deletes a book only after asking', async () => {
    h.books = [book('a', 'Alpha', 'read', '2026-10-03')]
    window.confirm.mockReturnValueOnce(false)
    tool()
    const del = await screen.findByRole('button', { name: 'Delete' })
    fireEvent.click(del)
    expect(h.calls).toEqual([])
    fireEvent.click(del)
    await waitFor(() => expect(h.calls).toEqual([['removeBook', 'a']]))
  })
  it('saves a year\u2019s goal and theme, and fills them in when you pick a year that has them', async () => {
    h.goals = { 2027: { goal: 30, theme: 'Courage' } }
    tool()
    fireEvent.change(await screen.findByLabelText('Year'), { target: { value: '2027' } })
    expect(screen.getByLabelText(/Books you want to read/)).toHaveValue(30)
    expect(screen.getByLabelText(/The year's theme/)).toHaveValue('Courage')
    fireEvent.change(screen.getByLabelText(/Books you want to read/), { target: { value: '36' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save goal and theme' }))
    await waitFor(() => expect(h.calls).toEqual([['saveGoal', { year: 2027, goal: 36, theme: 'Courage' }]]))
  })
  it('says plainly when the database refuses, and does not say it worked', async () => {
    h.failSave = true
    tool()
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Dune' } })
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'upnext' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the book' }))
    expect(await screen.findByText('Only the site owner can change the books.')).toBeInTheDocument()
    expect(screen.queryByText(/Added/)).toBeNull()
  })
})

describe('how it is wired in', () => {
  it('is a designed page of its own behind the Nook\u2019s Book Club door, not a list of posts', () => {
    expect(findDoor('knowledge-nook', 'book-club').page).toEqual({ layout: 'custom' })
    expect(Object.keys(doorAreas('knowledge-nook'))).not.toContain('book-club')
    expect(read('src/rooms/RoomRoutes.jsx')).toMatch(/'knowledge-nook\/book-club': BookClubPage/)
  })
  it('has an owner-only route, a tool in the console, and is kept out of search results', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/books" element=\{ <ProtectedRoute/)
    expect(read('src/admin/adminTools.js')).toMatch(/name: 'Books', to: '\/admin\/books'/)
    expect(read('src/data/pageMeta.js')).toMatch(/'\/admin\/books': \{[^}]*index: false/)
  })
  it('has no inline styles and no text under 14px, and a visible focus on the spines', () => {
    expect(read('src/bookclub/BookClubPage.jsx').replace("e.currentTarget.style.visibility = 'hidden'", '')).not.toMatch(/style=\{\{/)
    const css = read('src/bookclub/bookclub.css')
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    expect(css).toMatch(/\.bc__spine:focus-visible \{[^}]*outline:\s*3px solid/)
  })
  it('keeps the spine colours readable: every genre has a background and a text colour that pass 4.5 to 1', () => {
    const css = read('src/bookclub/bookclub.css')
    const full = (hex) => (hex.length === 4 ? `#${[1, 2, 3].map((i) => hex[i] + hex[i]).join('')}` : hex)
    const lum = (h) => { const hex = full(h); const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const rules = [...css.matchAll(/\.bc__spine--(none|leadership|fiction|memoir|self-growth|childrens) \{ background: (#[0-9a-f]{3,6}); color: (#[0-9a-f]{3,6}); \}/gi)]
    expect(rules).toHaveLength(6)
    for (const [, name, bg, fg] of rules) expect(ratio(bg, fg), name).toBeGreaterThanOrEqual(4.5)
  })
})

describe('what the book you are reading is about (Gill, 20 October 2026)', () => {
  it('shows it under the author line on the Reading now card, one paragraph for each paragraph written', async () => {
    h.books = [book('r1', 'M is for Malice', 'reading', null, { about: 'Kinsey is hired to find a missing heir.\n\nBut the family has its own secrets.' })]
    page()
    const card = (await screen.findByRole('heading', { level: 3, name: 'M is for Malice' })).closest('article')
    expect(within(card).getByText('Kinsey is hired to find a missing heir.')).toBeInTheDocument(); expect(within(card).getByText('But the family has its own secrets.')).toBeInTheDocument()
    expect(card.querySelectorAll('.bc__about p')).toHaveLength(2)
    // it sits after the author and before the "Read my notes" button
    const order = [...card.querySelectorAll('.bc__muted, .bc__about, a')].map((el) => el.className || el.tagName); expect(order.indexOf('bc__muted')).toBeLessThan(order.indexOf('bc__about'))
  })
  it('shows nothing extra when there is no description (no empty box)', async () => {
    h.books = [book('r1', 'M is for Malice', 'reading', null, { about: null })]
    const { container } = page(); await screen.findByRole('heading', { level: 3, name: 'M is for Malice' })
    expect(container.querySelector('.bc__about')).toBeNull()
  })
  it('shows nothing extra for a description that is only blank lines', async () => {
    h.books = [book('r2', 'Dare to Lead', 'reading', null, { about: '   \n\n  ' })]
    const { container } = page(); await screen.findByRole('heading', { level: 3, name: 'Dare to Lead' })
    expect(container.querySelector('.bc__about')).toBeNull()
  })
  it('puts it in text, never as code: a description with angle brackets is shown as written', async () => {
    h.books = [book('r1', 'Odd one', 'reading', null, { about: '<b>bold</b> <script>x()</script>' })]
    const { container } = page(); await screen.findByRole('heading', { level: 3, name: 'Odd one' })
    expect(container.querySelector('.bc__about b')).toBeNull(); expect(container.querySelector('.bc__about script')).toBeNull(); expect(container.querySelector('.bc__about p').textContent).toBe('<b>bold</b> <script>x()</script>')
  })
  it('does not show the description for a book that is not the one being read now', async () => {
    h.books = [book('n1', 'Dune', 'upnext', null, { about: 'A desert planet.' }), book('d1', 'Old one', 'read', '2026-03-01', { about: 'Finished long ago.' })]
    const { container } = page(); await screen.findByText('Dune, Dune author')
    expect(container.querySelector('.bc__about')).toBeNull(); expect(screen.queryByText('A desert planet.')).toBeNull()
  })
})

describe('the "What the book is about" box in Admin', () => {
  const tool = () => render(<MemoryRouter><AdminBooks session={{ access_token: 't' }} /></MemoryRouter>)
  it('is a proper box with a label, a help line saying where it shows, and room for several lines', async () => {
    tool(); const box = await screen.findByLabelText('What the book is about (optional)')
    expect(box.tagName).toBe('TEXTAREA'); expect(box).toHaveAttribute('rows', '6'); expect(box).toHaveClass('sf-input')
    expect(screen.getByText(/They show on the Book Club page under the book you are reading now\. A blank line starts a new paragraph\. Up to 1,000 letters\./)).toBeInTheDocument()
  })
  it('is saved with the book, tidied, and a book without one saves it as nothing', async () => {
    tool()
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'M is for Malice' } })
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'reading' } })
    fireEvent.change(screen.getByLabelText('What the book is about (optional)'), { target: { value: '  Kinsey is hired.  \n\n\n\nShe digs.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the book' }))
    await waitFor(() => expect(h.calls).toHaveLength(1)); expect(h.calls[0][2]).toMatchObject({ title: 'M is for Malice', status: 'reading', about: 'Kinsey is hired.\n\nShe digs.' })
    h.calls.length = 0
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Dune' } }); fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'upnext' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the book' })); await waitFor(() => expect(h.calls).toHaveLength(1)); expect(h.calls[0][2].about).toBeNull()
  })
  it('refuses more than 1,000 letters, in plain words, and saves nothing', async () => {
    tool()
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Dune' } }); fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'upnext' } })
    fireEvent.change(screen.getByLabelText('What the book is about (optional)'), { target: { value: 'a'.repeat(1001) } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the book' }))
    expect((await screen.findAllByText('Keep what the book is about to 1000 characters or fewer.')).length).toBeGreaterThan(0); expect(h.calls).toEqual([])
  })
  it('comes into the form when you change a book that already has one, and saving updates it', async () => {
    h.books = [book('r1', 'M is for Malice', 'reading', null, { about: 'Kinsey is hired.' })]
    tool(); fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    expect(screen.getByLabelText('What the book is about (optional)')).toHaveValue('Kinsey is hired.')
    fireEvent.change(screen.getByLabelText('What the book is about (optional)'), { target: { value: 'New words.' } }); fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(h.calls).toHaveLength(1)); expect(h.calls[0].slice(0, 2)).toEqual(['saveBook', 'r1']); expect(h.calls[0][2].about).toBe('New words.')
  })
})
