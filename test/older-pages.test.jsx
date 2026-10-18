// The post list, the single post and the plain text pages, in the new look: what they show, what they filter, and what they refuse to show.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], post: null, failList: false }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: () => {
      const b = {
        select: () => b,
        eq: () => b,
        order: () => b,
        single: () => Promise.resolve({ data: h.post, error: null }),
        maybeSingle: () => Promise.resolve({ data: h.post, error: null }),
        then: (res, rej) => Promise.resolve(h.failList ? { data: null, error: { message: 'secret database words: relation "posts" does not exist' } } : { data: h.posts, error: null }).then(res, rej),
      }
      return b
    },
  },
}))
import Home from '../src/pages/Home'
import PostPage from '../src/pages/PostPage'
import StaticPage from '../src/pages/StaticPage'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const post = (n, extra = {}) => ({ id: `p${n}`, title: `Post number ${n}`, content: 'First line\nSecond line', image_url: null, tags: ['art'], created_at: '2026-10-15T10:00:00Z', author_id: 'gill', channel: 'factory-floor', ...extra })
const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p> }
const list = (at = '/blog') => render(<MemoryRouter initialEntries={[at]}><Home /><Where /></MemoryRouter>)
const single = (session = null) => render(<MemoryRouter initialEntries={['/post/p1']}><Routes><Route path="/post/:id" element={<PostPage session={session} />} /></Routes></MemoryRouter>)
const noInlineStyles = (root) => expect([...root.querySelectorAll('[style]')].map((el) => el.getAttribute('style'))).toEqual([])

beforeEach(() => { h.posts = []; h.post = null; h.failList = false })

describe('the post list at /blog', () => {
  it('has one page heading and a row for each post, each title a link to its post, newest as given', async () => {
    h.posts = [post(1), post(2)]
    const { container } = list()
    const rows = await screen.findAllByRole('heading', { level: 2 })
    expect(rows.map((r) => r.textContent)).toEqual(['Post number 1', 'Post number 2'])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('All posts')
    expect(screen.getByRole('link', { name: 'Post number 2' })).toHaveAttribute('href', '/post/p2')
    expect(screen.getAllByText('15 Oct 2026')).toHaveLength(2)
    noInlineStyles(container)
  })
  it('offers each tag once, sorted, with All first and pressed', async () => {
    h.posts = [post(1, { tags: ['zeta', 'art'] }), post(2, { tags: ['art', 'build diary'] })]
    list()
    await screen.findAllByRole('heading', { level: 2 })
    const bar = screen.getByRole('group', { name: 'Filter by tag' })
    const buttons = within(bar).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['All', 'art', 'build diary', 'zeta'])
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  })
  it('filters to a tag when it is chosen, and All brings everything back', async () => {
    h.posts = [post(1, { tags: ['art'] }), post(2, { tags: ['travel'] })]
    list()
    await screen.findAllByRole('heading', { level: 2 })
    fireEvent.click(screen.getByRole('button', { name: 'travel' }))
    expect(screen.getAllByRole('heading', { level: 2 }).map((r) => r.textContent)).toEqual(['Post number 2'])
    expect(screen.getByRole('button', { name: 'travel' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('where').textContent).toBe('/blog?tag=travel')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
    expect(screen.getByTestId('where').textContent).toBe('/blog')
  })
  it('opens already filtered when the address has a tag (as the tags on a post link to it)', async () => {
    h.posts = [post(1, { tags: ['art'] }), post(2, { tags: ['travel'] })]
    list('/blog?tag=art')
    expect((await screen.findAllByRole('heading', { level: 2 })).map((r) => r.textContent)).toEqual(['Post number 1'])
  })
  it('says so when no post has the tag, and when there are no posts at all', async () => {
    h.posts = [post(1)]
    const { unmount } = list('/blog?tag=nothing')
    expect(await screen.findByText('No posts have that tag.')).toBeInTheDocument()
    unmount()
    h.posts = []
    list()
    expect(await screen.findByText('No posts yet. Check back soon!')).toBeInTheDocument()
  })
  it('says plainly when the posts cannot load, and never shows the database\u2019s own words', async () => {
    h.failList = true
    const { container } = list()
    expect(await screen.findByRole('alert')).toHaveTextContent('The posts could not load just now. Please try again in a moment.')
    expect(container.textContent).not.toMatch(/secret|relation/)
  })
})

describe('a single post', () => {
  it('shows the room, the date in full, the title, the words with their line breaks, and the tags', async () => {
    h.post = post(1, { tags: ['art', 'stop motion'] })
    const { container } = single()
    expect(await screen.findByRole('heading', { level: 1, name: 'Post number 1' })).toBeInTheDocument()
    expect(screen.getByText('The Factory Floor')).toHaveClass('pg-chip')
    const time = container.querySelector('time')
    expect(time.textContent).toBe('15 October 2026')
    expect(time).toHaveAttribute('datetime', '2026-10-15T10:00:00.000Z')
    expect(container.querySelector('.pg-post__body').textContent).toBe('First line\nSecond line')
    expect(screen.getByRole('link', { name: 'art' })).toHaveAttribute('href', '/blog?tag=art')
    expect(screen.getByRole('link', { name: 'stop motion' })).toHaveAttribute('href', '/blog?tag=stop%20motion')
    noInlineStyles(container)
  })
  it('shows no room chip for a post with no room, or one that is not a room on the site', async () => {
    h.post = post(1, { channel: 'nowhere' })
    const { container, unmount } = single()
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelectorAll('.pg-post__meta .pg-chip')).toHaveLength(0)
    unmount()
    h.post = post(1, { channel: null })
    const second = single()
    await screen.findByRole('heading', { level: 1 })
    expect(second.container.querySelectorAll('.pg-post__meta .pg-chip')).toHaveLength(0)
  })
  it('shows the header picture only when its address is safe, as a decoration (the title is already beside it)', async () => {
    h.post = post(1, { image_url: 'https://pics.example.com/a.png' })
    const { container, unmount } = single()
    await screen.findByRole('heading', { level: 1 })
    const img = container.querySelector('img.pg-post__image')
    expect(img).toHaveAttribute('src', 'https://pics.example.com/a.png')
    expect(img).toHaveAttribute('alt', '')
    unmount()
    for (const bad of ['http://insecure.example.com/a.png', 'javascript:alert(1)', '//evil.example.com/a.png', '']) {
      h.post = post(1, { image_url: bad })
      const again = single()
      await screen.findByRole('heading', { level: 1 })
      expect(again.container.querySelector('img'), bad).toBeNull()
      again.unmount()
    }
  })
  it('shows Edit and Delete only to the author, as buttons', async () => {
    h.post = post(1)
    const { unmount } = single({ user: { id: 'someone-else' } })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    unmount()
    single({ user: { id: 'gill' } })
    expect(await screen.findByRole('button', { name: 'Edit' })).toHaveClass('pg-btn')
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('pg-btn--danger')
  })
  it('says plainly when the post is not found', async () => {
    h.post = null
    single()
    await waitFor(() => expect(screen.getByText('Post not found.')).toBeInTheDocument())
  })
})

describe('a plain text page', () => {
  const at = (slug) => render(<MemoryRouter initialEntries={[`/page/${slug}`]}><Routes><Route path="/page/:slug" element={<StaticPage />} /></Routes></MemoryRouter>)
  it('shows its title and its words with their line breaks, with a way back', () => {
    const { container } = at('contact')
    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument()
    expect(container.querySelector('.pg-text__body').textContent).toMatch(/Want to get in touch\?/)
    expect(screen.getByRole('link', { name: 'imagine@starscapesfactory.com' })).toHaveAttribute('href', 'mailto:imagine@starscapesfactory.com') // the address comes from contact.js, not from the page's text
    expect(screen.getByRole('link', { name: /Back home/ })).toHaveAttribute('href', '/')
    noInlineStyles(container)
  })
  it('says so when there is no such page', () => {
    at('nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('the new stylesheet', () => {
  const css = read('src/styles/pages.css')
  it('styles each part of these pages', () => {
    for (const sel of ['.pg {', '.pg--list', '.pg-chip', '.pg-row', '.pg-post__image', '.pg-post__body', '.pg-tags', '.pg-actions', '.pg-btn', '.pg-btn--danger', '.pg-text__body']) expect(css, sel).toContain(sel)
  })
  it('sets no text smaller than 14px, and keeps a visible keyboard focus', () => {
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    expect(css).toMatch(/\.pg-btn:focus-visible \{[^}]*outline:\s*3px solid/)
    expect(css).toMatch(/\.pg-chip:focus-visible,?[^{]*\{[^}]*outline:\s*3px solid/s)
    expect(css).toMatch(/\.pg-row:focus-within \{[^}]*outline:\s*3px solid/)
  })
  it('makes the whole row clickable, not just the title', () => {
    expect(css).toMatch(/\.pg-row a::after \{[^}]*position:\s*absolute;[^}]*inset:\s*0/)
    expect(css).toMatch(/\.pg-row \{[^}]*position:\s*relative/)
  })
  it('stands on its own: the three pages import it, rather than lean on the old index.css rules', () => {
    for (const f of ['src/pages/Home.jsx', 'src/pages/PostPage.jsx', 'src/pages/StaticPage.jsx']) expect(read(f), f).toContain("../styles/pages.css")
  })
  it('keeps the page and the old class names out of the three pages', () => {
    for (const f of ['src/pages/Home.jsx', 'src/pages/PostPage.jsx', 'src/pages/StaticPage.jsx']) expect(read(f), f).not.toMatch(/post-card|post-detail|className="muted"|style=\{\{/)
  })
})
