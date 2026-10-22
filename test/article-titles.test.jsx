import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], post: null }))
// A pretend database: the list queries end by being awaited, the single-post query ends in single()
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: () => {
      const b = {
        select: () => b,
        eq: () => b,
        order: () => b,
        contains: () => b,
        single: () => Promise.resolve({ data: h.post, error: null }),
        maybeSingle: () => Promise.resolve({ data: h.post, error: null }), // the Back link asks which room the post belongs to
        then: (res, rej) => Promise.resolve({ data: h.posts, error: null }).then(res, rej),
      }
      return b
    },
  },
}))
vi.mock('../src/data/channels', () => ({
  channels: [
    { slug: 'feed-room', name: 'A Feed Room', emoji: '*', tagline: 'tagline', blurb: 'blurb', layout: 'post-feed' },
    { slug: 'gallery-room', name: 'A Gallery Room', emoji: '*', tagline: 'tagline', blurb: 'blurb', layout: 'gallery' },
    { slug: 'featured-room', name: 'A Featured Room', emoji: '*', tagline: 'tagline', blurb: 'blurb', layout: 'featured' },
  ],
}))
import PostCard from '../src/components/PostCard'
import Home from '../src/pages/Home'
import PostPage from '../src/pages/PostPage'
import ChannelPage from '../src/pages/ChannelPage'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const post = (n, extra = {}) => ({ id: `p${n}`, title: `A post called number ${n}`, content: 'Some words '.repeat(30), image_url: null, tags: ['art', 'travel'], created_at: '2026-10-1' + n + 'T09:00:00Z', author_id: 'gill', ...extra })
const sizes = (root) => [...root.querySelectorAll('[style]')].map((el) => parseFloat(el.style.fontSize)).filter((n) => !Number.isNaN(n))
const inRouter = (ui, at = '/') => render(<MemoryRouter initialEntries={[at]}>{ui}</MemoryRouter>)

beforeEach(() => {
  h.posts = []
  h.post = null
})

describe('article titles are in Schoolbell', () => {
  it.each(['feed', 'gallery', 'featured'])('the %s post card', (variant) => {
    const { container } = inRouter(<PostCard post={post(1)} variant={variant} />)
    const title = screen.getByText('A post called number 1')
    expect(title.className).toMatch(/sf-article-title/)
    expect(title.tagName).toMatch(/H[23]/)
    expect(Math.min(...sizes(container))).toBeGreaterThanOrEqual(14)
  })
  it('the Home list of posts', async () => {
    h.posts = [post(1), post(2)]
    const { container } = inRouter(<Home />)
    const titles = await screen.findAllByRole('heading', { level: 2 })
    expect(titles).toHaveLength(2)
    for (const t of titles) expect(t.className).toMatch(/sf-article-title/)
    expect(Math.min(...sizes(container))).toBeGreaterThanOrEqual(14)
    expect(screen.getByRole('heading', { level: 1 }).className).not.toMatch(/sf-article-title/) // the page heading stays as it is
  })
  it('a single post page', async () => {
    h.post = post(1)
    const { container } = render(
      <MemoryRouter initialEntries={['/post/p1']}>
        <Routes>
          <Route path="/post/:id" element={<PostPage session={null} />} />
        </Routes>
      </MemoryRouter>
    )
    const title = await screen.findByRole('heading', { level: 1, name: 'A post called number 1' })
    expect(title.className).toMatch(/sf-article-title/)
    expect(Math.min(...sizes(container))).toBeGreaterThanOrEqual(14)
  })
  it.each([['feed-room', 'post-feed'], ['gallery-room', 'gallery'], ['featured-room', 'featured']])('a room page that lists posts (%s)', async (slug) => {
    h.posts = [post(1), post(2)]
    const { container } = render(
      <MemoryRouter initialEntries={[`/channel/${slug}`]}>
        <Routes>
          <Route path="/channel/:slug" element={<ChannelPage />} />
        </Routes>
      </MemoryRouter>
    )
    await screen.findByText('A post called number 1')
    const cards = [...container.querySelectorAll('.sf-article-title')]
    expect(cards.length).toBe(2)
    expect(Math.min(...sizes(container))).toBeGreaterThanOrEqual(14)
    // the room's own name is a heading of the page, not an article title
    expect(screen.getByRole('heading', { level: 1 }).className).not.toMatch(/sf-article-title/)
  })
})

describe('the article pages keep working', () => {
  it('Home still links each title to its post and still filters by a tag button', async () => {
    h.posts = [post(1)]
    inRouter(<Home />)
    expect(await screen.findByRole('link', { name: 'A post called number 1' })).toHaveAttribute('href', '/post/p1')
    expect(screen.getByRole('button', { name: 'Art' })).toBeInTheDocument()
  })
  it('the post page shows Edit and Delete only to the author', async () => {
    h.post = post(1)
    const go = (session) =>
      render(
        <MemoryRouter initialEntries={['/post/p1']}>
          <Routes>
            <Route path="/post/:id" element={<PostPage session={session} />} />
          </Routes>
        </MemoryRouter>
      )
    const { unmount } = go({ user: { id: 'someone-else' } })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    unmount()
    go({ user: { id: 'gill' } })
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
  it('the post page still shows tags as links', async () => {
    h.post = post(1)
    render(
      <MemoryRouter initialEntries={['/post/p1']}>
        <Routes>
          <Route path="/post/:id" element={<PostPage session={null} />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await screen.findByRole('link', { name: 'art' })).toHaveAttribute('href', '/blog?tag=art')
  })
})

describe('the stylesheet and the source files', () => {
  it('sets Schoolbell with one weight and room for its width', () => {
    const css = read('src/styles/articles.css')
    expect(css).toMatch(/\.sf-article-title \{[^}]*Schoolbell/)
    expect(css).toMatch(/\.sf-article-title \{[^}]*font-weight: 400/)
    expect(css).toMatch(/\.sf-article-title \{[^}]*line-height: 1\.2/)
  })
  it('no text under 14px is left in the four pages', () => {
    for (const f of ['src/pages/Home.jsx', 'src/pages/PostPage.jsx', 'src/pages/ChannelPage.jsx', 'src/components/PostCard.jsx']) {
      const px = [...read(f).matchAll(/fontSize:\s*(\d+)/g)].map((m) => Number(m[1]))
      for (const n of px) expect(n, f).toBeGreaterThanOrEqual(14)
    }
  })
})
