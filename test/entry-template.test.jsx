// The entry template (Writing in Transit now; Archive Entries and the Author's Notebook later): which entry goes where, the page and its states, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], fail: false }))
vi.mock('../src/supabaseClient', () => ({ supabase: {} }))
vi.mock('../src/rooms/roomsApi', () => ({ fetchRoomPosts: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.posts }) }))
vi.mock('../src/doors/useDoors', () => ({ default: () => ({ ready: true, failed: false, isOpen: () => false }) }))
vi.mock('../src/den/youtubeApi', () => ({ fetchSeries: async () => [], fetchIntroId: async () => '' }))
vi.mock('../src/bookclub/bookApi', () => ({ fetchBooks: async () => [], fetchGoals: async () => ({}) }))
import EntryPage from '../src/entries/EntryPage'
import WritingInTransitPage from '../src/entries/WritingInTransitPage'
import RoomRoutes from '../src/rooms/RoomRoutes'
import { hasTag, pickLatest, pickPinned, pickGrid, pinnedIsBeginning, GRID_COUNT } from '../src/entries/entryRules'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
let n = 0
const entry = (title, day, tags = [], extra = {}) => ({ id: `e${++n}`, title, created_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, tags: ['writing-in-transit', ...tags], channel: 'explorers-bay', published: true, image_url: null, ...extra })
const many = (count) => Array.from({ length: count }, (_, i) => entry(`Entry ${i + 1}`, i + 1)) // Entry 1 is the oldest
const load = async () => h.posts
const belongs = (p) => Array.isArray(p.tags) && p.tags.includes('writing-in-transit')
const page = (ui = <WritingInTransitPage />) => render(<MemoryRouter initialEntries={['/explorers-bay/writing-in-transit']}>{ui}</MemoryRouter>)
beforeEach(() => { n = 0; Object.assign(h, { posts: [], fail: false }) })

describe('which entry goes where', () => {
  it('matches a tag whatever its capitals, spaces or apostrophes, and copes with junk', () => {
    expect(hasTag({ tags: ['PINNED'] }, 'pinned')).toBe(true); expect(hasTag({ tags: ['Pinned '] }, 'pinned')).toBe(true)
    for (const bad of [null, undefined, {}, { tags: null }, { tags: 'pinned' }, { tags: ['other'] }]) expect(hasTag(bad, 'pinned')).toBe(false)
  })
  it('makes the newest entry the latest one', () => {
    expect(pickLatest(many(5)).title).toBe('Entry 5'); expect(pickLatest([])).toBeNull(); expect(pickLatest(null)).toBeNull()
    expect(pickLatest([null, { title: 'no id' }, entry('Real', 3)]).title).toBe('Real')
  })
  it('pins the oldest entry (the beginning) when none is tagged', () => {
    const posts = many(5); expect(pickPinned(posts, pickLatest(posts)).title).toBe('Entry 1')
  })
  it('pins the newest tagged "pinned" instead, but never the latest entry again', () => {
    const posts = [entry('Old', 1), entry('Chosen old', 2, ['pinned']), entry('Chosen new', 4, ['pinned']), entry('Newest', 9)]
    expect(pickPinned(posts, pickLatest(posts)).title).toBe('Chosen new')
    const tagLatest = [entry('Old', 1), entry('Newest, tagged', 9, ['pinned'])]
    expect(pickPinned(tagLatest, pickLatest(tagLatest)).title).toBe('Old')
  })
  it('pins nothing when there is only one entry, or none', () => {
    const one = [entry('Only', 3)]; expect(pickPinned(one, pickLatest(one))).toBeNull(); expect(pickPinned([], null)).toBeNull()
  })
  it('says an entry is "the beginning" only when it is the oldest', () => {
    const posts = many(4); expect(pinnedIsBeginning(posts, posts[0])).toBe(true); expect(pinnedIsBeginning(posts, posts[2])).toBe(false); expect(pinnedIsBeginning([], null)).toBe(false)
  })
  it('fills the grid with the rest, newest first, without the latest or the pinned one', () => {
    const posts = many(6); const latest = pickLatest(posts), pinned = pickPinned(posts, latest)
    expect(pickGrid(posts, latest, pinned).map((p) => p.title)).toEqual(['Entry 5', 'Entry 4', 'Entry 3', 'Entry 2'])
    expect(pickGrid([], null, null)).toEqual([])
  })
})

describe('the page', () => {
  it('has its heading, the line under it, and a way back to the room', async () => {
    h.posts = many(3); page()
    expect(screen.getByRole('heading', { level: 1, name: 'Writing in Transit' })).toBeInTheDocument(); expect(screen.getByText('Words written on the move.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Explorer's Bay/ })).toHaveAttribute('href', '/explorers-bay')
    await screen.findByRole('heading', { level: 2, name: 'Entry 3' })
  })
  it('shows the latest entry big, with its chip, date and a way to read it', async () => {
    h.posts = many(3); page()
    const latest = (await screen.findByRole('heading', { level: 2, name: 'Entry 3' })).closest('section')
    expect(within(latest).getByText('Latest entry')).toBeInTheDocument(); expect(within(latest).getByText('3 Oct 2026')).toBeInTheDocument()
    expect(within(latest).getByRole('link', { name: 'Read the entry' }).getAttribute('href')).toMatch(/^\/post\/e\d+$/)
  })
  it('shows the oldest entry as the pinned one, "Entry 1", with "Start from the beginning"', async () => {
    h.posts = many(4); page()
    const pinned = (await screen.findByRole('heading', { level: 2, name: 'Entry 1' })).closest('section')
    expect(within(pinned).getByText('Pinned')).toBeInTheDocument(); expect(within(pinned).getByText('Entry 1', { selector: 'span' })).toBeInTheDocument()
    expect(within(pinned).getByRole('link', { name: 'Start from the beginning' })).toBeInTheDocument()
  })
  it('shows an entry Gill tagged "pinned" instead, as "Read this entry", without calling it Entry 1', async () => {
    h.posts = [entry('First', 1), entry('Chosen', 3, ['pinned']), entry('Newest', 8)]; page()
    const pinned = (await screen.findByRole('heading', { level: 2, name: 'Chosen' })).closest('section')
    expect(within(pinned).getByRole('link', { name: 'Read this entry' })).toBeInTheDocument(); expect(within(pinned).queryByText('Entry 1', { selector: 'span' })).toBeNull()
    expect(within(pinned).queryByRole('link', { name: 'Start from the beginning' })).toBeNull()
  })
  it('puts the rest in a grid with their dates, never repeating the latest or the pinned entry', async () => {
    h.posts = many(7); page()
    const grid = (await screen.findByRole('region', { name: 'More entries' })).querySelector('ul')
    const titles = within(grid).getAllByRole('link').map((a) => a.textContent)
    expect(titles).toHaveLength(5)
    for (const t of titles) { expect(t).not.toContain('Entry 7'); expect(t).not.toMatch(/Entry 1(?!\d)/) }
    expect(within(grid).getAllByRole('link')[0]).toHaveTextContent('6 Oct 2026')
  })
  it('ignores posts that are not tagged for this page', async () => {
    h.posts = [entry('Mine', 4), { ...entry('Not mine', 9), tags: ['photography'] }]; page()
    await screen.findByRole('heading', { level: 2, name: 'Mine' })
    expect(screen.queryByText('Not mine')).toBeNull()
  })
  it('shows eight entries in the grid and offers "Show more entries" (on a computer too) when there are more, which opens the rest', async () => {
    h.posts = many(14); const { container } = page()
    await screen.findByRole('region', { name: 'More entries' })
    expect(GRID_COUNT).toBe(8) // eight, as in the design
    expect(container.querySelectorAll('.en__item')).toHaveLength(8)
    const more = screen.getByRole('button', { name: 'Show more entries' })
    expect(more).toHaveClass('en__morebtn--always')
    fireEvent.click(more)
    expect(container.querySelectorAll('.en__item')).toHaveLength(12); expect(screen.queryByRole('button', { name: 'Show more entries' })).toBeNull()
  })
  it('offers "Show more entries" for a phone only (a computer already shows them all) when there are five to eight', async () => {
    h.posts = many(8); page()
    const more = await screen.findByRole('button', { name: 'Show more entries' })
    expect(more).not.toHaveClass('en__morebtn--always')
  })
  it('does not offer "Show more entries" when there are four or fewer in the grid', async () => {
    h.posts = many(6); page()
    await screen.findByRole('region', { name: 'More entries' })
    expect(screen.queryByRole('button', { name: 'Show more entries' })).toBeNull()
  })
  it('with one entry shows it as the latest, and no pinned box or grid', async () => {
    h.posts = [entry('Just one', 5)]; const { container } = page()
    await screen.findByRole('heading', { level: 2, name: 'Just one' })
    expect(container.querySelector('.en__pinned')).toBeNull(); expect(screen.queryByRole('region', { name: 'More entries' })).toBeNull()
  })
  it('says so when there are no entries yet, and when they cannot load', async () => {
    h.posts = []; const first = page()
    expect(await screen.findByText('The first entry is on its way.')).toBeInTheDocument(); first.unmount()
    h.fail = true; page()
    expect(await screen.findByRole('alert')).toHaveTextContent('The entries could not load just now. Please try again in a moment.')
  })
  it('uses an entry\u2019s picture if it has a safe one, as decoration, and a star if not', async () => {
    h.posts = [entry('With picture', 5, [], { image_url: 'https://img.example.com/a.jpg' })]; const first = page()
    await screen.findByRole('heading', { level: 2, name: 'With picture' })
    expect(first.container.querySelector('.en__latest img')).toHaveAttribute('alt', ''); first.unmount()
    h.posts = [entry('No picture', 5)]; const second = page()
    await screen.findByRole('heading', { level: 2, name: 'No picture' })
    expect(second.container.querySelector('.en__latest img')).toBeNull()
  })
  it('puts an extra box in the right-hand column when one is given (Writing in Transit gives the Into the Nebula box)', async () => {
    h.posts = many(4); const plain = page()
    await screen.findByRole('heading', { level: 2, name: 'Entry 4' })
    expect(plain.container.querySelector('.en__o4 .en__nebula')).toBeTruthy(); plain.unmount() // Writing in Transit has the Into the Nebula box
    const extra = page(<EntryPage title="T" blurb="B" backTo="/explorers-bay" backLabel="Back" load={load} belongs={belongs} aside={<p>An extra box</p>} />)
    expect(await extra.findByText('An extra box')).toBeInTheDocument(); expect(extra.container.querySelector('.en__right .en__o4')).toBeTruthy()
  })
  it('works for any room: it is told its title, line, back link, how to fetch the posts and which belong', async () => {
    const mine = [{ id: 'm1', title: 'Mine', created_at: '2026-10-04T10:00:00Z', tags: ['x'], image_url: null }, { id: 'm2', title: 'Not mine', created_at: '2026-10-05T10:00:00Z', tags: [], image_url: null }]
    const own = page(<EntryPage title="Another page" blurb="Another line." backTo="/somewhere" backLabel="Back to Somewhere" load={async () => mine} belongs={(p) => p.tags.includes('x')} />)
    expect(await own.findByRole('heading', { level: 1, name: 'Another page' })).toBeInTheDocument(); expect(own.getByText('Another line.')).toBeInTheDocument()
    expect(own.getByRole('link', { name: /Back to Somewhere/ })).toHaveAttribute('href', '/somewhere')
    expect(await own.findByRole('heading', { level: 2, name: 'Mine' })).toBeInTheDocument(); expect(own.queryByText('Not mine')).toBeNull()
  })
})

describe('how it is wired in', () => {
  it('is the page at /explorers-bay/writing-in-transit, replacing the plain list', async () => {
    h.posts = many(3)
    render(<MemoryRouter initialEntries={['/explorers-bay/writing-in-transit']}><Routes><Route path="/explorers-bay/*" element={<RoomRoutes room="explorers-bay" />} /></Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { level: 2, name: 'Entry 3' })).toBeInTheDocument()
    expect(read('src/rooms/RoomRoutes.jsx')).toMatch(/'explorers-bay\/writing-in-transit': WritingInTransitPage/)
  })
  it('takes Writing in Transit\u2019s title, line, back link and tag from the room\u2019s own data, not from copies', () => {
    const src = read('src/entries/WritingInTransitPage.jsx')
    expect(src).toMatch(/ROOMS\[ROOM\]\.areas\['writing-in-transit'\]/); expect(src).toMatch(/inArea\(PAGE, post\)/); expect(src).not.toMatch(/Words written on the move/)
  })
  it('orders the boxes latest, pinned, grid, extra box on a phone, and turns the two columns into one', () => {
    const jsx = read('src/entries/EntryPage.jsx'), css = read('src/entries/entries.css')
    expect(jsx).toMatch(/className="en__card en__latest en__o1"/); expect(jsx).toMatch(/className="en__card en__pinned en__o2"/)
    expect(jsx).toMatch(/className="en__more en__o3"/); expect(jsx).toMatch(/<div className="en__o4">\{aside\}<\/div>/)
    for (let i = 1; i <= 4; i++) expect(css).toContain(`.en__o${i} { order: ${i}; }`)
    expect(css).toMatch(/@media \(max-width: 960px\)[\s\S]*\.en__left,\s*\.en__right \{\s*display: contents/)
  })
  it('is as wide as the Figma design, shrinks its columns together instead of overflowing, and shows only four grid entries at first on a phone', () => {
    const css = read('src/entries/entries.css')
    expect(css).toMatch(/\.rp\.en \{\s*max-width: 1232px/)
    expect(css).toMatch(/grid-template-columns: minmax\(0, 836fr\) minmax\(0, 332fr\)/); expect(css).not.toMatch(/grid-template-columns: \d+px/)
    expect(css).toMatch(/@media \(max-width: 960px\)[\s\S]*\.en__grid:not\(\.is-expanded\) \.en__item:nth-child\(n \+ 5\) \{\s*display: none/)
    expect(css).toMatch(/\.en__morebtn \{\s*display: none !important/)
  })
  it('has no inline styles apart from hiding a picture that will not load, and no text under 14px', () => {
    expect(read('src/entries/EntryPage.jsx').replace("e.currentTarget.style.visibility = 'hidden'", '')).not.toMatch(/style=\{\{/)
    for (const m of read('src/entries/entries.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
