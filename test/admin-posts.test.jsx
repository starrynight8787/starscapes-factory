// The owner's list of every post in Admin: the filters, what each row says, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], owner: true, fail: false, asked: 0 }))
vi.mock('../src/admin/postsAdminApi', () => ({ fetchAllPosts: vi.fn(async () => { h.asked += 1; if (h.fail) throw new Error('x'); return h.posts }) }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import AdminPosts from '../src/admin/AdminPosts'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const post = (id, title, channel, tags, published = true, day = 1, extra = {}) => ({ id, title, channel, tags, published, created_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, pass: null, ...extra })
const page = () => render(<MemoryRouter><AdminPosts session={{ user: { id: 'gill' } }} /></MemoryRouter>)
const rowOf = (title) => screen.getByRole('link', { name: title }).closest('li')
beforeEach(() => {
  Object.assign(h, { owner: true, fail: false, asked: 0, posts: [
    post('p1', 'A tiny world in clay', 'idea-hatchery', ['Stop Motion'], true, 5),
    post('p2', 'My test blog', 'idea-hatchery', ['test'], true, 4),
    post('p3', 'Sunrise on the road', 'explorers-bay', ['photography'], true, 3, { pass: 'blueprints' }),
    post('p4', 'Unfinished idea', 'idea-hatchery', [], false, 2),
    post('p5', 'Post with no room', null, null, true, 1),
  ] })
})

describe('who may see it', () => {
  it('is for the owner only, and asks the database for nothing otherwise', () => {
    h.owner = false; page(); expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(h.asked).toBe(0)
  })
})

describe('the list', () => {
  it('shows every post from every room, drafts included, newest first, with its room, date and tags', async () => {
    page(); await screen.findByText('A tiny world in clay')
    const titles = screen.getAllByRole('listitem').filter((li) => li.className === 'ap__row').map((li) => li.querySelector('.ap__title').textContent)
    expect(titles).toEqual(['A tiny world in clay', 'My test blog', 'Sunrise on the road', 'Unfinished idea', 'Post with no room'])
    expect(within(rowOf('Unfinished idea')).getByText('Not published')).toBeInTheDocument()
    const row = rowOf('A tiny world in clay'); expect(within(row).getByText('The Idea Hatchery')).toBeInTheDocument(); expect(within(row).getByText('5 Oct 2026')).toBeInTheDocument(); expect(within(row).getByText('Tags: Stop Motion')).toBeInTheDocument()
    expect(within(rowOf('Post with no room')).getByText('No room')).toBeInTheDocument(); expect(within(rowOf('Post with no room')).getByText('No tags')).toBeInTheDocument()
  })
  it('says how many it is showing, out of how many it has: all 5 to begin with, 4 when you choose published only', async () => {
    page(); expect(await screen.findByRole('status')).toHaveTextContent('Showing 5 of 5 posts')
    await userEvent.selectOptions(screen.getByLabelText('Show'), 'published'); expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 5 posts')
  })
  it('says where each post appears, and what to do when a post is on no page (the missing test blog)', async () => {
    page(); await screen.findByText('My test blog')
    expect(within(rowOf('A tiny world in clay')).getByText(/Appears on: Stop Motion, and the blog page/)).toBeInTheDocument()
    const lost = within(rowOf('My test blog')).getByText(/^Not on a page of The Idea Hatchery yet/); expect(lost).toHaveTextContent('Add one of these tags'); expect(lost).toHaveTextContent('stop-motion (Stop Motion)')
    expect(within(rowOf('Post with no room')).getByText(/has no room, so it appears only on the blog page/)).toBeInTheDocument()
  })
  it('shows a post\u2019s pass, and gives each post an Edit and a View link to the right places', async () => {
    page(); await screen.findByText('Sunrise on the road')
    expect(within(rowOf('Sunrise on the road')).getByText('Blueprints pass')).toBeInTheDocument(); expect(within(rowOf('A tiny world in clay')).queryByText(/ pass$/)).toBeNull()
    const row = rowOf('My test blog'); expect(within(row).getByRole('link', { name: 'Edit My test blog' })).toHaveAttribute('href', '/edit/p2'); expect(within(row).getByRole('link', { name: 'View My test blog' })).toHaveAttribute('href', '/post/p2'); expect(within(row).getByRole('link', { name: 'My test blog' })).toHaveAttribute('href', '/post/p2')
  })
})

describe('the filters', () => {
  it('lists every room with how many posts it has, and posts with no room', async () => {
    page(); await screen.findByText('My test blog')
    const options = [...screen.getByLabelText('Room').querySelectorAll('option')].map((o) => o.textContent)
    expect(options[0]).toBe('All rooms (5)'); expect(options).toContain('The Idea Hatchery (3)'); expect(options).toContain("Explorer's Bay (1)"); expect(options).toContain('The Art Loft (0)'); expect(options).toContain('No room (1)'); expect(options).toHaveLength(10)
  })
  it('narrows to one room', async () => {
    page(); await screen.findByText('My test blog'); await userEvent.selectOptions(screen.getByLabelText('Room'), 'idea-hatchery')
    expect(screen.getByRole('status')).toHaveTextContent('Showing 3 of 5 posts'); expect(screen.queryByText('Sunrise on the road')).toBeNull(); expect(screen.getByText('My test blog')).toBeInTheDocument()
  })
  it('narrows to posts with no room', async () => {
    page(); await screen.findByText('My test blog'); await userEvent.selectOptions(screen.getByLabelText('Room'), 'none'); expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 5 posts'); expect(screen.getByText('Post with no room')).toBeInTheDocument()
  })
  it('shows the drafts when asked, saying they are not published, and everything when asked', async () => {
    page(); await screen.findByText('My test blog'); await userEvent.selectOptions(screen.getByLabelText('Show'), 'unpublished')
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 5 posts'); const row = rowOf('Unfinished idea'); expect(within(row).getByText('Not published')).toBeInTheDocument(); expect(within(row).getByText('Not published, so it does not appear anywhere yet.')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Show'), 'all'); expect(screen.getByRole('status')).toHaveTextContent('Showing 5 of 5 posts')
  })
  it('updates the counts in the room list when the published choice changes', async () => {
    page(); await screen.findByText('My test blog')
    const counts = () => [...screen.getByLabelText('Room').querySelectorAll('option')].map((o) => o.textContent)
    expect(counts()).toContain('The Idea Hatchery (3)')
    await userEvent.selectOptions(screen.getByLabelText('Show'), 'published'); expect(counts()).toContain('The Idea Hatchery (2)')
    await userEvent.selectOptions(screen.getByLabelText('Show'), 'all'); expect(counts()).toContain('The Idea Hatchery (3)')
  })
  it('searches the titles, ignoring capitals, and says so when nothing matches', async () => {
    page(); await screen.findByText('My test blog'); await userEvent.type(screen.getByLabelText('Search the titles'), 'SUNRISE')
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 5 posts'); await userEvent.clear(screen.getByLabelText('Search the titles')); await userEvent.type(screen.getByLabelText('Search the titles'), 'zzz'); expect(screen.getByText('No posts match.')).toBeInTheDocument()
  })
  it('explains how posts get onto a room\u2019s pages once a room is chosen, and not before', async () => {
    page(); await screen.findByText('My test blog'); expect(screen.queryByText(/How posts get on/)).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Room'), 'idea-hatchery'); const help = screen.getByText("How posts get on The Idea Hatchery's pages").closest('details')
    expect(within(help).getByText(/Stop Motion/).closest('li')).toHaveTextContent('a post with the tag stop-motion'); expect(help).toHaveTextContent('Come Study With Me'); expect(help).not.toHaveTextContent('Writing Prompts')
    await userEvent.selectOptions(screen.getByLabelText('Room'), 'leadership-lounge'); expect(screen.getByText(/Leadership Blog/).closest('li')).toHaveTextContent('every post in this room')
  })
  it('shows a room name it does not know (a post saved with an odd room) rather than hiding the post', async () => {
    h.posts = [...h.posts, post('p6', 'Odd room post', 'old-room', [], true, 6)]; page(); await screen.findByText('Odd room post')
    expect([...screen.getByLabelText('Room').querySelectorAll('option')].map((o) => o.textContent)).toContain('old-room (1)')
  })
})

describe('when something is wrong, and how it is wired in', () => {
  it('says plainly when the posts cannot load, and shows no count', async () => {
    h.fail = true; page(); expect(await screen.findByRole('alert')).toHaveTextContent('The posts could not load just now. Please try again in a moment.'); expect(screen.queryByRole('status')).toBeNull()
  })
  it('has a route in the app for the owner, a link in the Admin tools, and a page title that is kept out of search', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/posts" element=\{ <ProtectedRoute session=\{session\}> <AdminPosts session=\{session\} \/> <\/ProtectedRoute> \}/); expect(read('src/admin/adminTools.js')).toMatch(/name: 'All posts', to: '\/admin\/posts'/); expect(read('src/data/pageMeta.js')).toMatch(/'\/admin\/posts': \{ title: 'All posts'[^}]*index: false/)
  })
  it('gives every field and select a class of its own, with a visible focus', () => {
    const src = read('src/admin/AdminPosts.jsx'); expect(src.match(/<select className="ap__control"/g)).toHaveLength(2); expect(src.match(/<input className="ap__control"/g)).toHaveLength(1)
    expect(read('src/admin/adminposts.css')).toMatch(/\.ap__control:focus-visible \{[^}]*outline:\s*3px solid/)
  })
  it('uses no inline styles, sets no text under 14px, and keeps its tags readable (4.5 to 1)', () => {
    expect(read('src/admin/AdminPosts.jsx')).not.toMatch(/style=\{\{/)
    const css = read('src/admin/adminposts.css'); for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const tok = { 'var(--sf-blue, #1f6fa8)': '#1f6fa8', 'var(--sf-navy-700, #14306a)': '#14306a' }
    for (const sel of ['\\.ap__chip', '\\.ap__chip--draft', '\\.ap__chip--pass']) { const rule = css.match(new RegExp(`${sel} \\{([^}]*)\\}`))[1]; const bg = rule.match(/background:\s*([^;]+);/)[1].trim(); const fg = rule.match(/color:\s*([^;]+);/)[1].trim(); expect(ratio(tok[bg] || bg, tok[fg] || (fg === '#fff' ? '#ffffff' : fg)), sel).toBeGreaterThanOrEqual(4.5) }
  })
})
