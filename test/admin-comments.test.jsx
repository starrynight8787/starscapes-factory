// The owner's "Manage comments" page (/admin/comments): who may see it, what it shows, the filters, deleting, and how it is wired in.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ owner: true, fail: null, asked: 0, comments: [], hold: false, deleted: [], deleteFails: null }))
vi.mock('../src/admin/commentsAdminApi', () => ({
  fetchComments: vi.fn(async () => { h.asked += 1; if (h.hold) await new Promise(() => {}); if (h.fail) throw new Error(h.fail); return h.comments }),
  deleteComment: vi.fn(async (id) => { if (h.deleteFails) throw new Error(h.deleteFails); h.deleted.push(id) }),
}))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import AdminComments from '../src/admin/AdminComments'
import { ADMIN_TOOLS } from '../src/admin/adminTools'
import { PAGES } from '../src/data/pageMeta'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const ago = (hrs) => new Date(Date.now() - hrs * 3600000).toISOString()
const cm = (id, over = {}) => ({ id, bookId: 'b1', bookTitle: 'Atomic Habits', author: 'Priya', body: 'A good one.', createdAt: ago(3), ...over })
const FOUR = [
  cm('c1', { author: 'Priya', body: 'First thought.\n\nSecond thought.' }),
  cm('c2', { author: 'Alexandra', body: 'Does the second half repeat the first?', createdAt: ago(30) }),
  cm('c3', { author: 'Sam', bookId: 'b2', bookTitle: 'Radical Candor', body: 'Care personally, challenge directly.', createdAt: ago(24 * 12) }),
  cm('c4', { author: '', bookId: 'b3', bookTitle: '', body: 'A gift of a book.', createdAt: ago(24 * 40) }),
]
const page = () => render(<MemoryRouter><AdminComments session={{ user: { id: 'gill' } }} /></MemoryRouter>)
const rowOf = (text) => screen.getByText(text).closest('li')
beforeEach(() => { Object.assign(h, { owner: true, fail: null, asked: 0, hold: false, deleted: [], deleteFails: null, comments: FOUR }); vi.spyOn(window, 'confirm').mockReturnValue(true) })
afterEach(() => { vi.restoreAllMocks() })

describe('who may see it', () => {
  it('is for the owner only, and asks for nothing otherwise', () => {
    h.owner = false; page()
    expect(screen.getByRole('heading', { level: 1, name: 'Manage comments' })).toBeInTheDocument(); expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(h.asked).toBe(0)
    expect(screen.queryByText('A gift of a book.')).toBeNull()
  })
  it('says Loading while it waits', () => { h.hold = true; page(); expect(screen.getByText('Loading…')).toBeInTheDocument(); expect(screen.queryByRole('status')).toBeNull() })
  it('says plainly when the comments cannot load, and shows no counts or list', async () => {
    h.fail = 'The comments could not load just now. Please try again in a moment.'; page()
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load just now'); expect(screen.queryByRole('status')).toBeNull(); expect(screen.queryByRole('list')).toBeNull()
  })
})

describe('what it shows', () => {
  it('counts the comments, the new ones, the books and the people', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    const pair = (label) => screen.getByText(label).nextElementSibling.textContent
    expect([pair('Comments'), pair('New in the last 7 days'), pair('Books with comments'), pair('People who have commented')]).toEqual(['4', '2', '3', '4'])
  })
  it('lists each comment, newest first as it came: the book as a link to its page, who wrote it, when, and the words in paragraphs', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    const first = rowOf('First thought.')
    expect(within(first).getByRole('link', { name: 'Atomic Habits' })).toHaveAttribute('href', '/knowledge-nook/book-club/book/b1')
    expect(within(first).getByText('Priya')).toBeInTheDocument(); expect(within(first).getByText('New')).toBeInTheDocument()
    expect(within(first).getByText('Second thought.').tagName).toBe('P')
    expect(within(rowOf('Care personally, challenge directly.')).queryByText('New')).toBeNull()
    expect(screen.getAllByRole('listitem').map((li) => li.querySelector('.ac__body')?.textContent).filter(Boolean)[0]).toContain('First thought.')
  })
  it('names a comment with no name or no book title, rather than leaving a gap', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    const row = rowOf('A gift of a book.'); expect(within(row).getByText('No name')).toBeInTheDocument(); expect(within(row).getByRole('link', { name: 'A book with no title' })).toBeInTheDocument()
  })
  it('says nobody has commented, and counts nothing, when there are no comments', async () => {
    h.comments = []; page()
    expect(await screen.findByText('Nobody has commented on a book yet.')).toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 0 comments')
  })
  it('shows a comment\u2019s words as plain text, never as markup', async () => {
    h.comments = [cm('x', { body: '<img src=x onerror=alert(1)> and <b>bold</b>' })]; const { container } = page(); await screen.findByText('Showing 1 of 1 comment')
    expect(container.querySelector('.ac__body img')).toBeNull(); expect(container.querySelector('.ac__body b')).toBeNull(); expect(container.querySelector('.ac__body').textContent).toContain('<b>bold</b>')
  })
})

describe('the filters', () => {
  it('narrows to one book, and lists each book with how many comments it has', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    const book = screen.getByLabelText('Book')
    expect([...book.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['All books (4)', 'A book with no title (1)', 'Atomic Habits (2)', 'Radical Candor (1)'])
    await userEvent.selectOptions(book, 'b1'); expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 4 comments'); expect(screen.queryByText('A gift of a book.')).toBeNull()
  })
  it('searches the words, names and book titles, and says so when nothing matches', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    await userEvent.type(screen.getByLabelText('Search the comments'), 'CHALLENGE'); expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 4 comments')
    await userEvent.clear(screen.getByLabelText('Search the comments')); await userEvent.type(screen.getByLabelText('Search the comments'), 'nothing-like-this')
    expect(screen.getByText('No comments match.')).toBeInTheDocument()
  })
})

describe('deleting a comment', () => {
  it('asks first, in words that say it is for good and that nobody is told, and deletes nothing if you say no', async () => {
    window.confirm.mockReturnValue(false); page(); await screen.findByText('Showing 4 of 4 comments')
    await userEvent.click(screen.getByRole('button', { name: 'Delete the comment by Sam on Radical Candor' }))
    expect(window.confirm).toHaveBeenCalledWith('Delete this comment for good? The person who wrote it will not be told.'); expect(h.deleted).toEqual([]); expect(screen.getByText('Care personally, challenge directly.')).toBeInTheDocument()
  })
  it('deletes the one comment you chose, takes it off the page, updates the counts, and says it is done', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    await userEvent.click(screen.getByRole('button', { name: 'Delete the comment by Sam on Radical Candor' }))
    expect(h.deleted).toEqual(['c3']); expect(screen.queryByText('Care personally, challenge directly.')).toBeNull(); expect(screen.getByText('Deleted the comment by Sam.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 3 of 3 comments'); expect(screen.getByText('Books with comments').nextElementSibling.textContent).toBe('2')
  })
  it('removes only the comment you chose, even when the same person wrote others', async () => {
    h.comments = [cm('p1', { author: 'Priya', body: 'First by Priya.' }), cm('p2', { author: 'Priya', body: 'Second by Priya.' })]
    page(); await screen.findByText('Showing 2 of 2 comments')
    await userEvent.click(within(rowOf('First by Priya.')).getByRole('button', { name: /Delete/ }))
    expect(h.deleted).toEqual(['p1']); expect(screen.getByText('Second by Priya.')).toBeInTheDocument(); expect(screen.queryByText('First by Priya.')).toBeNull(); expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 1 comment')
  })
  it('goes back to all books if you delete the last comment on the book you were looking at', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    await userEvent.selectOptions(screen.getByLabelText('Book'), 'b2')
    await userEvent.click(screen.getByRole('button', { name: 'Delete the comment by Sam on Radical Candor' }))
    expect(screen.getByLabelText('Book')).toHaveValue('all'); expect(screen.getByRole('status')).toHaveTextContent('Showing 3 of 3 comments')
  })
  it('says plainly, in an alert, if it could not delete, and keeps the comment on the page', async () => {
    h.deleteFails = 'That comment was not deleted. It may already be gone: reload the page to check.'; page(); await screen.findByText('Showing 4 of 4 comments')
    await userEvent.click(screen.getByRole('button', { name: 'Delete the comment by Sam on Radical Candor' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('was not deleted'); expect(screen.getByText('Care personally, challenge directly.')).toBeInTheDocument()
  })
  it('gives every delete button a name that says whose comment, and on which book', async () => {
    page(); await screen.findByText('Showing 4 of 4 comments')
    expect(screen.getAllByRole('button', { name: /^Delete the comment by / })).toHaveLength(4); expect(screen.getByRole('button', { name: 'Delete the comment by someone on a book' })).toBeInTheDocument()
  })
})

describe('how it is wired in', () => {
  it('has a route in the app for the owner only, a tile in the Admin tools that links to it, and a page title kept out of search', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/comments" element=\{ <ProtectedRoute session=\{session\}> <AdminComments session=\{session\} \/> <\/ProtectedRoute> \}/)
    expect(ADMIN_TOOLS.find((t) => t.name === 'Manage comments')).toMatchObject({ to: '/admin/comments', group: 'Rooms', icon: 'comments' })
    expect(PAGES['/admin/comments']).toMatchObject({ title: 'Manage comments', index: false })
  })
  it('has an icon for its tile, and uses the Knowledge Nook sky (where the Book Club lives) in its banner', () => {
    expect(read('src/admin/AdminConsole.jsx')).toMatch(/^  comments: <>/m); expect(read('src/admin/AdminComments.jsx')).toContain('room="knowledge-nook"')
  })
  it('relies on the database letting the owner (and only the owner or the writer) delete a comment: the policy is still there', () => {
    const sql = read('sql/book-details.sql')
    expect(sql).toContain('create policy "remove your own book comment" on public.book_comments for delete to authenticated')
    expect(sql).toContain("using (user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')")
    expect(sql).toContain('create policy "members read book comments" on public.book_comments for select to authenticated using (public.is_book_club_member())')
  })
})

describe('the look: accessible and standing on its own', () => {
  const css = read('src/admin/admincomments.css'); const jsx = read('src/admin/AdminComments.jsx')
  const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  it('uses no inline styles and sets no text under 14px', () => {
    expect(jsx).not.toMatch(/style=\{/)
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('shows a ring when a field is tabbed to, gives every field a class of its own, and lets the filters shrink on a phone', () => {
    expect(css).toMatch(/\.ac__control:focus-visible\s*\{[^}]*outline:\s*3px/); expect((jsx.match(/<select/g) || []).length + (jsx.match(/<input/g) || []).length).toBe((jsx.match(/className="ac__control"/g) || []).length)
    expect(css).toMatch(/\.ac__control \{[^}]*min-width: 0/); expect(css).toMatch(/\.ac__field \{[^}]*min-width: 0/)
  })
  it('keeps the name and "New" tags readable (4.5 to 1)', () => {
    expect(ratio('#14306a', '#ffffff')).toBeGreaterThanOrEqual(4.5); expect(ratio('#ffe27a', '#0e1530')).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(/\.ac__chip \{[^}]*background: var\(--sf-navy-700, #14306a\); color: #fff/); expect(css).toMatch(/\.ac__chip--new \{ background: #ffe27a; color: #0e1530/)
  })
  it('announces a finished delete politely, and an error as an alert', () => {
    expect(jsx).toMatch(/role=\{note\.kind === 'error' \? 'alert' : undefined\}/); expect(jsx).toMatch(/aria-live=\{note\.kind === 'error' \? undefined : 'polite'\}/)
  })
})
