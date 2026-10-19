// The "Let's write a story" page: the pinned first chapter, the chapter cards and their tags, the vote box in its coming state, the finished stories, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ stories: [], rows: [], posts: [], fail: false, asked: [] }))
vi.mock('../src/stories/storiesApi', () => ({
  fetchStories: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.stories }),
  fetchChapterRows: vi.fn(async () => h.rows),
  fetchChapterPosts: vi.fn(async (ids) => { h.asked.push(ids); return h.posts.filter((p) => ids.includes(p.id)) }),
}))
import LetsWriteStoryPage from '../src/stories/LetsWriteStoryPage'
import { ROOMS } from '../src/rooms/roomsData'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const STORY = { id: 's1', slug: 'the-lantern', title: 'The Lantern', teaser: 'It began with a light in the window.', picture_url: null, status: 'running', finished_on: null, created_at: '2026-09-01T10:00:00Z' }
const post = (n, extra = {}) => ({ id: `p${n}`, title: `Chapter title ${n}`, image_url: null, created_at: `2026-10-${String(n).padStart(2, '0')}T10:00:00Z`, ...extra })
const rows = (n, story = 's1', offset = 0) => Array.from({ length: n }, (_, i) => ({ story_id: story, number: i + 1, post_id: `${story === 's1' ? 'p' : story + 'p'}${i + 1 + offset}` }))
const page = () => render(<MemoryRouter><LetsWriteStoryPage /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { stories: [STORY], rows: rows(6), posts: [1, 2, 3, 4, 5, 6].map((n) => post(n)), fail: false, asked: [] }) })

describe('the page\u2019s words', () => {
  it('has the heading and the line from the design, and a way back to the Idea Hatchery', async () => {
    page()
    expect(screen.getByRole('heading', { level: 1, name: 'Stories' })).toBeInTheDocument(); expect(screen.getByText('Let\u2019s write a story.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to The Idea Hatchery/ })).toHaveAttribute('href', '/idea-hatchery')
    await screen.findByRole('heading', { level: 2, name: 'The Lantern' })
  })
})

describe('the pinned first chapter', () => {
  it('shows the story\u2019s title and first lines, says it is pinned and free to read, and has a Start reading button to chapter 1', async () => {
    page()
    const card = await screen.findByRole('region', { name: 'The Lantern' })
    expect(within(card).getByText('Pinned')).toBeInTheDocument(); expect(within(card).getByText('Free to read')).toBeInTheDocument(); expect(within(card).getByText('First chapter')).toBeInTheDocument()
    expect(within(card).getByText('It began with a light in the window.')).toBeInTheDocument(); expect(within(card).getByRole('link', { name: 'Start reading' })).toHaveAttribute('href', '/post/p1')
  })
  it('uses the story\u2019s own picture, else the first chapter\u2019s, and a star when there is none; and never a picture that is not a safe https one', async () => {
    h.stories = [{ ...STORY, picture_url: 'https://img.example.com/story.jpg' }]; const a = page(); const card = await screen.findByRole('region', { name: 'The Lantern' })
    expect(card.querySelector('img')).toHaveAttribute('src', 'https://img.example.com/story.jpg'); a.unmount()
    h.stories = [STORY]; h.posts = [post(1, { image_url: 'https://img.example.com/ch1.png' }), ...[2, 3, 4, 5, 6].map((n) => post(n))]; const b = page(); const card2 = await screen.findByRole('region', { name: 'The Lantern' })
    expect(card2.querySelector('img')).toHaveAttribute('src', 'https://img.example.com/ch1.png'); b.unmount()
    h.posts = [post(1, { image_url: 'javascript:alert(1)' }), ...[2, 3, 4, 5, 6].map((n) => post(n))]; const c = page(); const card3 = await screen.findByRole('region', { name: 'The Lantern' })
    expect(card3.querySelector('img')).toBeNull(); expect(card3.querySelector('.ls__pic--empty')).not.toBeNull(); c.unmount()
  })
  it('says the first chapter is on its way, with no button, when the story has no chapter yet', async () => {
    h.rows = []; h.posts = []; page()
    const card = await screen.findByRole('region', { name: 'The Lantern' })
    expect(within(card).getByText('The first chapter is on its way.')).toBeInTheDocument(); expect(within(card).queryByRole('link')).toBeNull(); expect(within(card).queryByText('Free to read')).toBeNull()
  })
})

describe('the chapter cards', () => {
  it('are the other chapters in order, not chapter 1 again, each a link to its post with its number and date', async () => {
    page()
    const grid = (await screen.findByRole('region', { name: 'The chapters' })).querySelector('ul')
    const cards = within(grid).getAllByRole('listitem')
    expect(cards.map((c) => within(c).getByText(/^Chapter \d/).textContent)).toEqual(['Chapter 2 · 2 Oct 2026', 'Chapter 3 · 3 Oct 2026', 'Chapter 4 · 4 Oct 2026', 'Chapter 5 · 5 Oct 2026', 'Chapter 6 · 6 Oct 2026'])
    expect(cards.map((c) => within(c).getByRole('link').getAttribute('href'))).toEqual(['/post/p2', '/post/p3', '/post/p4', '/post/p5', '/post/p6']); expect(within(grid).getByText('Chapter title 2')).toBeInTheDocument()
  })
  it('say Free to read for chapters 2 and 3 and Members only from chapter 4 on', async () => {
    page()
    const grid = (await screen.findByRole('region', { name: 'The chapters' })).querySelector('ul')
    const tags = within(grid).getAllByRole('listitem').map((c) => (within(c).queryByText('Free to read') ? 'free' : within(c).queryByText('Members only') ? 'members' : 'none'))
    expect(tags).toEqual(['free', 'free', 'members', 'members', 'members'])
  })
  it('mark only the newest chapter as the latest', async () => {
    page()
    const grid = (await screen.findByRole('region', { name: 'The chapters' })).querySelector('ul')
    const latest = within(grid).getAllByRole('listitem').filter((c) => within(c).queryByText('Latest')); expect(latest).toHaveLength(1); expect(within(latest[0]).getByText(/^Chapter 6/)).toBeInTheDocument()
  })
  it('leave out a chapter whose post cannot be seen, rather than showing a broken card', async () => {
    h.posts = h.posts.filter((p) => p.id !== 'p3'); page()
    const grid = (await screen.findByRole('region', { name: 'The chapters' })).querySelector('ul')
    expect(within(grid).queryByText(/^Chapter 3/)).toBeNull(); expect(within(grid).getAllByRole('listitem')).toHaveLength(4)
  })
  it('hide all but four on a phone until Show more chapters is pressed, and the button goes once it has been', async () => {
    page()
    const grid = (await screen.findByRole('region', { name: 'The chapters' })).querySelector('ul')
    expect(grid.className).not.toMatch(/is-expanded/); fireEvent.click(screen.getByRole('button', { name: 'Show more chapters' }))
    expect(grid.className).toMatch(/is-expanded/); expect(screen.queryByRole('button', { name: 'Show more chapters' })).toBeNull()
  })
  it('offer no Show more button when there are four chapters or fewer to show', async () => {
    h.rows = rows(4); page(); await screen.findByRole('region', { name: 'The chapters' }); expect(screen.queryByRole('button', { name: 'Show more chapters' })).toBeNull()
  })
  it('have no chapter cards at all when there is only the first chapter', async () => {
    h.rows = rows(1); page(); await screen.findByRole('region', { name: 'The Lantern' }); expect(screen.queryByRole('region', { name: 'The chapters' })).toBeNull()
  })
})

describe('the vote box (the voting itself comes in step two)', () => {
  it('says the vote is coming: the label, a Soon chip and the question, with nothing to press', async () => {
    page()
    const box = await screen.findByRole('region', { name: 'What happens next?' })
    expect(within(box).getByText('The vote')).toBeInTheDocument(); expect(within(box).getByText('Soon')).toBeInTheDocument(); expect(within(box).getByText(/Members will choose where the story goes next/)).toBeInTheDocument()
    expect(within(box).queryByRole('button')).toBeNull(); expect(within(box).queryByRole('radio')).toBeNull(); expect(within(box).queryByRole('link')).toBeNull()
  })
})

describe('the finished stories', () => {
  const finished = (n) => ({ id: `d${n}`, slug: `done-${n}`, title: `Finished story ${n}`, teaser: null, picture_url: null, status: 'completed', finished_on: `2026-0${n}-15`, created_at: `2026-0${n}-01T10:00:00Z` })
  beforeEach(() => {
    h.stories = [STORY, finished(1), finished(2), finished(3), finished(4), finished(5)]
    h.rows = [...rows(6), { story_id: 'd5', number: 1, post_id: 'd5p1' }, { story_id: 'd5', number: 2, post_id: 'd5p2' }, { story_id: 'd4', number: 1, post_id: 'd4p1' }]
    h.posts = [...[1, 2, 3, 4, 5, 6].map((n) => post(n)), post(7, { id: 'd5p1', title: 'D5 one' }), post(8, { id: 'd5p2', title: 'D5 two' }), post(9, { id: 'd4p1', title: 'D4 one' })]
  })
  it('lists four, the most recently finished first, with the date, and a button for all of them', async () => {
    page()
    const box = await screen.findByRole('region', { name: 'Completed stories' })
    expect(within(box).getAllByRole('listitem').map((li) => li.querySelector('.ls__cardtitle').textContent)).toEqual(['Finished story 5', 'Finished story 4', 'Finished story 3', 'Finished story 2'])
    expect(within(box).getByText('Finished 15 May 2026')).toBeInTheDocument()
    fireEvent.click(within(box).getByRole('button', { name: 'See all completed stories' }))
    expect(within(box).getAllByRole('listitem')).toHaveLength(5); expect(within(box).queryByRole('button')).toBeNull()
  })
  it('link a finished story to its first chapter when it has one, and are plain when it has none', async () => {
    page()
    const box = await screen.findByRole('region', { name: 'Completed stories' })
    const items = within(box).getAllByRole('listitem')
    expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/post/d5p1'); expect(within(items[1]).getByRole('link')).toHaveAttribute('href', '/post/d4p1'); expect(within(items[2]).queryByRole('link')).toBeNull()
  })
  it('asks only for the running story\u2019s chapters and the first chapter of each finished story, nothing more', async () => {
    page(); await screen.findByRole('region', { name: 'Completed stories' })
    expect([...h.asked[0]].sort()).toEqual(['d4p1', 'd5p1', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'])
    expect(h.asked[0]).not.toContain('d5p2')
  })
  it('says so when no story is finished yet', async () => {
    h.stories = [STORY]; page(); const box = await screen.findByRole('region', { name: 'Completed stories' }); expect(within(box).getByText('No story is finished yet.')).toBeInTheDocument()
  })
})

describe('when there is nothing, or something is wrong', () => {
  it('says the first story is on its way when there is no story at all', async () => {
    h.stories = []; h.rows = []; h.posts = []; page()
    expect(await screen.findByText('The first story is on its way.')).toBeInTheDocument(); expect(screen.queryByRole('region')).toBeNull()
  })
  it('says the next story is on its way, with no vote box and no pinned chapter, when only finished stories exist', async () => {
    h.stories = [{ id: 'd1', slug: 'x', title: 'Done one', teaser: null, picture_url: null, status: 'completed', finished_on: '2026-05-15', created_at: '2026-05-01T10:00:00Z' }]; h.rows = []; h.posts = []; page()
    expect(await screen.findByText('The next story is on its way.')).toBeInTheDocument(); expect(screen.queryByRole('region', { name: 'What happens next?' })).toBeNull(); expect(screen.getByRole('region', { name: 'Completed stories' })).toBeInTheDocument()
  })
  it('says plainly when the stories cannot load, and shows nothing misleading', async () => {
    h.fail = true; page()
    expect(await screen.findByRole('alert')).toHaveTextContent('The stories could not load just now. Please try again in a moment.'); expect(screen.queryByText('The first story is on its way.')).toBeNull()
  })
})

describe('how it is wired in', () => {
  it('is the Idea Hatchery\u2019s beaker, renamed, leading to the new page; its picture, place and internal name are unchanged', () => {
    const beaker = ROOMS['idea-hatchery'].items.find((i) => i.id === 'short-stories')
    expect(beaker).toMatchObject({ name: 'Let\u2019s write a story', to: '/idea-hatchery/lets-write-a-story', kind: 'page' }); expect(beaker.name).not.toMatch(/short/i)
  })
  it('has its own always-open route under the Idea Hatchery, page titles for search, and the owner\u2019s tool in Admin', () => {
    expect(read('src/rooms/RoomRoutes.jsx')).toMatch(/'idea-hatchery\/lets-write-a-story': LetsWriteStoryPage/)
    const meta = read('src/data/pageMeta.js'); expect(meta).toMatch(/'\/idea-hatchery\/lets-write-a-story': \{ title: 'Stories: let/); expect(meta).toMatch(/'\/admin\/stories': \{ title: 'Stories'[^}]*index: false/)
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/stories" element=\{ <ProtectedRoute session=\{session\}> <AdminStories session=\{session\} \/> <\/ProtectedRoute> \}/)
    expect(read('src/admin/adminTools.js')).toMatch(/name: 'Stories', to: '\/admin\/stories'/)
  })
  it('lifts the 720 pixel page limit for itself, as the other wide pages do (1272 is 1232 plus the 20 pixels of padding each side)', () => {
    const css = read('src/stories/stories.css')
    expect(css).toMatch(/\.container:has\(> \.rp\.ls\) \{\s*max-width: 1272px/); expect(css).toMatch(/\.rp\.ls \{\s*max-width: 1232px/)
    expect(read('src/index.css')).toMatch(/\.container \{\s*max-width: 720px/)
  })
  it('uses no inline styles and sets no text under 14px', () => {
    expect(read('src/stories/LetsWriteStoryPage.jsx')).not.toMatch(/style=\{\{/)
    for (const m of read('src/stories/stories.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('keeps every tag readable: text and background pass 4.5 to 1', () => {
    const css = read('src/stories/stories.css')
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const tok = { 'var(--sf-blue, #1f6fa8)': '#1f6fa8', 'var(--sf-navy-700, #14306a)': '#14306a' }
    for (const tone of ['green', 'blue', 'navy']) {
      const rule = css.match(new RegExp(`\\.ls__chip--${tone} \\{([^}]*)\\}`))[1]
      const bg = rule.match(/background:\s*([^;]+);/)[1].trim(); const fg = rule.match(/color:\s*([^;]+);/)[1].trim()
      expect(ratio(tok[bg] || bg, tok[fg] || (fg === '#fff' ? '#ffffff' : fg)), tone).toBeGreaterThanOrEqual(4.5)
    }
  })
})
