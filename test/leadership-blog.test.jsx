// The Leadership Blog: which post goes where, the page and its states, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], fail: false, ebookOpen: false }))
vi.mock('../src/supabaseClient', () => ({ supabase: {} }))
vi.mock('../src/rooms/roomsApi', () => ({ fetchRoomPosts: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.posts }) }))
vi.mock('../src/doors/useDoors', () => ({ default: () => ({ ready: true, failed: false, isOpen: (room, door) => h.ebookOpen && door === 'free-ebook' }) }))
import LeadershipBlogPage from '../src/leadership/LeadershipBlogPage'
import RoomRoutes from '../src/rooms/RoomRoutes'
import { ROOMS, AUDIOBOOK_URL, UDEMY_URL } from '../src/rooms/roomsData'
import { hasTag, pickFeatured, blocksFrom, latestPosts, morePosts } from '../src/leadership/leadershipRules'
import { blockTag, FEATURED_TAG, BLOCK_COUNT } from '../src/leadership/leadershipData'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
let n = 0
const post = (title, day, tags = [], extra = {}) => ({ id: `p${++n}`, title, created_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, tags, channel: 'leadership-lounge', published: true, image_url: null, ...extra })
const page = () => render(<MemoryRouter initialEntries={['/leadership-lounge/blog']}><LeadershipBlogPage /></MemoryRouter>)
beforeEach(() => { n = 0; Object.assign(h, { posts: [], fail: false, ebookOpen: false }) })

describe('which post goes where', () => {
  it('matches a tag whatever its capitals, spaces or apostrophes', () => {
    expect(hasTag({ tags: ['Building Block 1'] }, blockTag(1))).toBe(true)
    expect(hasTag({ tags: ['FEATURED'] }, FEATURED_TAG)).toBe(true)
    expect(hasTag({ tags: ['building-block-2'] }, blockTag(1))).toBe(false)
    for (const bad of [null, undefined, {}, { tags: null }, { tags: 'featured' }]) expect(hasTag(bad, FEATURED_TAG)).toBe(false)
  })
  it('features the newest post tagged featured, otherwise the newest post, otherwise nothing', () => {
    const a = post('Old', 1), b = post('Chosen old', 2, ['featured']), c = post('Chosen new', 5, ['featured']), d = post('Newest', 9)
    expect(pickFeatured([a, b, c, d]).title).toBe('Chosen new')
    expect(pickFeatured([a, d]).title).toBe('Newest')
    expect(pickFeatured([])).toBeNull(); expect(pickFeatured(null)).toBeNull()
    expect(pickFeatured([null, { title: 'no id' }, a]).title).toBe('Old')
  })
  it('gives six Building Blocks in order, each the newest post tagged for it, or nothing for "Coming soon"', () => {
    const one = post('One, old', 1, ['building-block-1']), oneNew = post('One, new', 4, ['Building Block 1']), three = post('Three', 3, ['building-block-3'])
    const blocks = blocksFrom([one, oneNew, three, post('No block', 6)])
    expect(blocks).toHaveLength(BLOCK_COUNT)
    expect(blocks.map((b) => b.number)).toEqual([1, 2, 3, 4, 5, 6])
    expect(blocks[0].post.title).toBe('One, new'); expect(blocks[1].post).toBeNull(); expect(blocks[2].post.title).toBe('Three')
    expect(blocksFrom([]).every((b) => b.post === null)).toBe(true)
  })
  it('lists the five newest as Latest posts', () => {
    const posts = Array.from({ length: 8 }, (_, i) => post(`Post ${i + 1}`, i + 1))
    expect(latestPosts(posts).map((p) => p.title)).toEqual(['Post 8', 'Post 7', 'Post 6', 'Post 5', 'Post 4'])
    expect(latestPosts(posts.slice(0, 2))).toHaveLength(2)
  })
  it('lists older posts under More from the blog that are NOT already on the page, at most three', () => {
    const posts = Array.from({ length: 12 }, (_, i) => post(`Post ${i + 1}`, i + 1, i === 0 ? ['featured'] : i === 1 ? ['building-block-2'] : []))
    const featured = pickFeatured(posts), blocks = blocksFrom(posts), latest = latestPosts(posts)
    const more = morePosts(posts, { featured, latest, blocks })
    expect(more.map((p) => p.title)).toEqual(['Post 7', 'Post 6', 'Post 5'])
    const shown = new Set([featured.id, ...latest.map((p) => p.id), ...blocks.map((b) => b.post && b.post.id)])
    for (const p of more) expect(shown.has(p.id)).toBe(false)
    expect(morePosts(posts.slice(2, 5), { featured: null, latest: latestPosts(posts.slice(2, 5)), blocks: [] })).toEqual([])
  })
})

describe('the page', () => {
  const full = () => [post('First block', 2, ['building-block-1']), post('Chosen one', 5, ['featured']), ...Array.from({ length: 8 }, (_, i) => post(`Note ${i + 1}`, 10 + i))]

  it('has its heading, the line under it, and a way back to the Lounge', async () => {
    h.posts = full(); page()
    expect(screen.getByRole('heading', { level: 1, name: 'Leadership Blog' })).toBeInTheDocument()
    expect(screen.getByText('Notes on leading from where you are.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Leadership Lounge/ })).toHaveAttribute('href', '/leadership-lounge')
    await screen.findByRole('heading', { level: 2, name: 'Chosen one' })
  })
  it('shows the featured post with its chip, date and a way to read it', async () => {
    h.posts = full(); page()
    const feat = (await screen.findByRole('heading', { level: 2, name: 'Chosen one' })).closest('section')
    expect(within(feat).getByText('Featured')).toBeInTheDocument(); expect(within(feat).getByText('5 Oct 2026')).toBeInTheDocument()
    expect(within(feat).getByRole('link', { name: 'Read the post' }).getAttribute('href')).toMatch(/^\/post\/p\d+$/)
  })
  it('uses the featured post\u2019s picture if it has a safe one, as decoration, and a star if not', async () => {
    h.posts = [post('With picture', 5, ['featured'], { image_url: 'https://img.example.com/a.jpg' })]; const first = page()
    await screen.findByRole('heading', { level: 2, name: 'With picture' })
    expect(first.container.querySelector('.lb__featured img')).toHaveAttribute('alt', ''); first.unmount()
    h.posts = [post('No picture', 5, ['featured'])]; const second = page()
    await screen.findByRole('heading', { level: 2, name: 'No picture' })
    expect(second.container.querySelector('.lb__featured img')).toBeNull()
  })
  it('shows the six Building Blocks as a numbered list: a written one links to its post, the rest say "Coming soon" and are not links', async () => {
    h.posts = full(); const { container } = page()
    const list = (await screen.findByRole('heading', { level: 2, name: 'Building Blocks' })).closest('section').querySelector('ol')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(6)
    expect(within(items[0]).getByRole('link', { name: /First block/ })).toBeInTheDocument()
    for (const i of [1, 2, 3, 4, 5]) { expect(within(items[i]).queryByRole('link')).toBeNull(); expect(within(items[i]).getByText('Coming soon')).toBeInTheDocument(); expect(within(items[i]).getByText(`Building Block ${i + 1}`)).toBeInTheDocument() }
    expect(container.querySelectorAll('.lb__num[aria-hidden="true"]')).toHaveLength(6)
  })
  it('lists the five newest as Latest posts, with a link to see them all', async () => {
    h.posts = full(); page()
    const latest = (await screen.findByRole('heading', { level: 2, name: 'Latest posts' })).closest('section')
    expect(within(latest).getAllByRole('link').filter((a) => a.getAttribute('href').startsWith('/post/'))).toHaveLength(5)
    expect(within(latest).getByRole('link', { name: 'See all posts' })).toHaveAttribute('href', '/blog')
    expect(within(latest).getByText('Note 8', { exact: false })).toBeInTheDocument()
  })
  it('lists older posts under More from the blog without repeating anything above it', async () => {
    h.posts = full(); const { container } = page()
    const more = (await screen.findByRole('heading', { level: 2, name: 'More from the blog' })).closest('section')
    const titles = within(more).getAllByRole('link').map((a) => a.textContent)
    expect(titles).toHaveLength(3)
    const above = ['Chosen one', 'First block', 'Note 8', 'Note 7', 'Note 6', 'Note 5', 'Note 4']
    for (const t of titles) for (const a of above) expect(t, `${t} repeats ${a}`).not.toContain(a)
  })
  it('leaves out More from the blog when there is nothing older to show', async () => {
    h.posts = [post('Only post', 3)]; page()
    await screen.findByRole('heading', { level: 2, name: 'Only post' })
    expect(screen.queryByRole('heading', { name: 'More from the blog' })).toBeNull()
  })
  it('says the ebook is "Opening soon", with a button that cannot be pressed, until its door is open', async () => {
    h.posts = full(); page()
    const box = (await screen.findByRole('heading', { level: 3, name: 'The free ebook' })).closest('div')
    expect(within(box).getByText('Opening soon')).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'Get the free ebook' })).toBeDisabled()
  })
  it('gives the ebook a real link, and drops the "Opening soon", once its door is open', async () => {
    h.ebookOpen = true; h.posts = full(); page()
    const box = (await screen.findByRole('heading', { level: 3, name: 'The free ebook' })).closest('div')
    expect(within(box).getByRole('link', { name: 'Get the free ebook' })).toHaveAttribute('href', '/leadership-lounge/free-ebook')
    expect(within(box).queryByText('Opening soon')).toBeNull()
  })
  it('opens the audiobook and the course safely in a new tab, from the addresses already in the rooms data', async () => {
    h.posts = full(); page()
    for (const [name, href] of [[/Listen on Everand/, AUDIOBOOK_URL], [/See the course/, UDEMY_URL]]) {
      const link = await screen.findByRole('link', { name })
      expect(link).toHaveAttribute('href', href); expect(link).toHaveAttribute('target', '_blank'); expect(link.getAttribute('rel')).toMatch(/noopener/)
      expect(link.getAttribute('aria-label')).toMatch(/opens in a new tab/)
    }
  })
  it('never shows the notes written for Gill in the design', async () => {
    h.posts = full(); const { container } = page()
    await screen.findByRole('heading', { level: 2, name: 'Chosen one' })
    expect(container.textContent).not.toMatch(/pinning|not written yet|Draft layout|\[/)
  })
  it('with no posts at all, says so, and every block waits as "Coming soon"', async () => {
    h.posts = []; page()
    expect(await screen.findByText('The first post is on its way.')).toBeInTheDocument()
    expect(screen.getAllByText('Coming soon')).toHaveLength(6)
    expect(screen.queryByRole('heading', { name: 'Latest posts' })).toBeNull(); expect(screen.queryByText('Featured')).toBeNull()
  })
  it('says plainly when the posts cannot load, and still shows the ways in', async () => {
    h.fail = true; page()
    expect(await screen.findByRole('alert')).toHaveTextContent('The posts could not load just now. Please try again in a moment.')
    expect(screen.getByRole('heading', { level: 2, name: 'More ways in' })).toBeInTheDocument()
  })
})

describe('the banner on this page', () => {
  it('has the chip, the one heading, the line under it, and the starry mountain picture', async () => {
    h.posts = [post('A post', 4)]; const { container } = page()
    await screen.findByRole('heading', { level: 2, name: 'A post' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const banner = container.querySelector('.pb')
    expect(within(banner).getByText('Leading from the Middle')).toBeInTheDocument(); expect(within(banner).getByRole('heading', { level: 1, name: 'Leadership Blog' })).toBeInTheDocument()
    expect(within(banner).getByText('Notes on leading from where you are.')).toBeInTheDocument()
    expect(banner).toHaveClass('pb--starry') // the starry banner draws its own mountain, so it has no picture file
    expect(banner).toHaveClass('pb--room-leadership-lounge'); expect(banner.querySelector('svg.pb__art')).toBeNull()
  })
  it('has a "Start with Building Block 1" button that goes to that post, once the first block exists', async () => {
    h.posts = [post('Block one title', 2, ['building-block-1']), post('Other', 5)]; const { container } = page()
    const start = await screen.findByRole('link', { name: 'Start with Building Block 1' })
    expect(within(container.querySelector('.pb')).getByRole('link', { name: 'Start with Building Block 1' })).toBe(start)
    expect(start.getAttribute('href')).toMatch(/^\/post\/p\d+$/)
  })
  it('leaves that button out until there is a first block, instead of showing a button that goes nowhere', async () => {
    h.posts = [post('Just a post', 5)]; page()
    await screen.findByRole('heading', { level: 2, name: 'Just a post' })
    expect(screen.queryByRole('link', { name: /Start with Building Block 1/ })).toBeNull()
  })
  it('comes straight after the way back, before the boxes', () => {
    const jsx = read('src/leadership/LeadershipBlogPage.jsx')
    expect(jsx.indexOf('<PageBanner')).toBeGreaterThan(jsx.indexOf('rp-back')); expect(jsx.indexOf('<PageBanner')).toBeLessThan(jsx.indexOf('lb__cols'))
  })
})

describe('how it is wired in', () => {
  it('is the page at /leadership-lounge/blog, replacing the plain list', async () => {
    h.posts = [post('A post', 4)]
    render(<MemoryRouter initialEntries={['/leadership-lounge/blog']}><Routes><Route path="/leadership-lounge/*" element={<RoomRoutes room="leadership-lounge" />} /></Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { level: 2, name: 'Building Blocks' })).toBeInTheDocument()
    expect(read('src/rooms/RoomRoutes.jsx')).toMatch(/'leadership-lounge\/blog': LeadershipBlogPage/)
    expect(ROOMS['leadership-lounge'].areas.blog.name).toBe('Leadership Blog')
  })
  it('puts the boxes in the order Featured, Building Blocks, ways in, Latest posts, More from the blog on a phone, and turns the two columns into one', () => {
    const jsx = read('src/leadership/LeadershipBlogPage.jsx'), css = read('src/leadership/leadership.css')
    const order = (cls) => Number(jsx.match(new RegExp(`${cls}[^"]*lb__o(\\d)`))[1])
    expect([order('lb__featured'), order('lb__blocks'), order('lb__ways'), order('lb__latest'), order('lb__more')]).toEqual([1, 2, 3, 4, 5])
    for (let i = 1; i <= 5; i++) expect(css).toContain(`.lb__o${i} { order: ${i}; }`)
    expect(css).toMatch(/@media \(max-width: 960px\)[\s\S]*\.lb__left,\s*\.lb__right \{\s*display: contents/)
  })
  it('shrinks its two columns together on a narrower screen instead of running off the side (no fixed widths that add up to more than the page)', () => {
    const css = read('src/leadership/leadership.css')
    expect(css).toMatch(/\.lb__cols \{[^}]*grid-template-columns: minmax\(0, 784fr\) minmax\(0, 384fr\)/)
    expect(css).not.toMatch(/grid-template-columns: 784px/)
  })
  it('has no inline styles apart from hiding a picture that will not load, and no text under 14px', () => {
    expect(read('src/leadership/LeadershipBlogPage.jsx').replace("e.currentTarget.style.visibility = 'hidden'", '')).not.toMatch(/style=\{\{/)
    for (const m of read('src/leadership/leadership.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
