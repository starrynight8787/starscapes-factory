import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import PostNote from '../src/factoryfloor/PostNote'
import { filterPosts, isPinned } from '../src/factoryfloor/factoryData'

// A pretend database for the fetching tests: each call to select() is answered from a list
const answers = []
const asked = []
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: (columns) => {
        asked.push(columns)
        const result = answers.shift()
        const chain = { eq: () => chain, order: () => chain, limit: () => Promise.resolve(result) }
        return chain
      },
    }),
  },
}))
import { fetchFactoryPosts } from '../src/factoryfloor/factoryApi'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const post = (n, extra = {}) => ({ id: `p${n}`, title: `Day ${n}: a story post`, created_at: `2026-10-${String(10 + n).padStart(2, '0')}T09:00:00Z`, tags: [], channel: 'factory-floor', published: true, pinned_in: null, ...extra })
const bp = (n, extra = {}) => post(n, { title: `Blueprints #${n}: a blueprint`, ...extra })
const ids = (list) => list.map((p) => p.id)
const renderNote = (p, props = {}) => render(<MemoryRouter><PostNote post={p} {...props} /></MemoryRouter>)

describe('pinned posts: the rule', () => {
  it('a post is pinned only in its own section', () => {
    expect(isPinned(post(1, { pinned_in: 'story' }))).toBe(true)
    expect(isPinned(bp(1, { pinned_in: 'blueprint' }))).toBe(true)
    expect(isPinned(bp(1, { pinned_in: 'story' }))).toBe(false)
    expect(isPinned(post(1, { pinned_in: 'blueprint' }))).toBe(false)
    expect(isPinned(post(1))).toBe(false)
    expect(isPinned(null)).toBe(false)
  })
})

describe('pinned posts: the order in a list', () => {
  const posts = [post(6), post(5), post(4), post(1, { pinned_in: 'story' }), post(2)]
  it('the pinned post leads, then the rest newest first', () => {
    expect(ids(filterPosts(posts))).toEqual(['p1', 'p6', 'p5', 'p4', 'p2'])
  })
  it('the pinned post still leads when the list is oldest first', () => {
    expect(ids(filterPosts(posts, { sort: 'oldest' }))).toEqual(['p1', 'p2', 'p4', 'p5', 'p6'])
    const old = [post(1), post(2, { pinned_in: 'story' }), post(3)]
    expect(ids(filterPosts(old, { sort: 'oldest' }))).toEqual(['p2', 'p1', 'p3'])
  })
  it('never appears twice', () => {
    const out = ids(filterPosts(posts))
    expect(new Set(out).size).toBe(out.length)
  })
  it('a search hides it like any other post if it does not match', () => {
    expect(ids(filterPosts(posts, { q: 'Day 5' }))).toEqual(['p5'])
    expect(ids(filterPosts(posts, { q: 'Day 1' }))[0]).toBe('p1')
  })
  it('a list with nothing pinned is unchanged', () => {
    expect(ids(filterPosts([post(2), post(3), post(1)]))).toEqual(['p3', 'p2', 'p1'])
  })
  it('works for Blueprints in the same way', () => {
    const list = [bp(11), bp(10), bp(3), bp(1, { pinned_in: 'blueprint' })]
    expect(ids(filterPosts(list))).toEqual(['p1', 'p11', 'p10', 'p3'])
  })
})

describe('pinned posts: the note', () => {
  it('says Start here, has the pin, and is announced as pinned', () => {
    const { container } = renderNote(post(1, { pinned_in: 'story' }), { index: 0 })
    const note = container.querySelector('.ff-note')
    expect(note.className).toMatch(/ff-note--pinned/)
    expect(note.textContent).toMatch(/Start here/)
    expect(note.textContent).not.toMatch(/Factory Floor/)
    expect(screen.getByRole('link').textContent).toMatch(/^Start herePinned post: Day 1: a story post/)
  })
  it('an ordinary note keeps its section label and has no pin', () => {
    const { container } = renderNote(post(2), { index: 1 })
    expect(container.querySelector('.ff-note').className).not.toMatch(/pinned/)
    expect(container.textContent).toMatch(/Factory Floor/)
    expect(container.textContent).not.toMatch(/Pinned post|Start here/)
  })
  it('a Blueprint keeps the Blueprints label until it is pinned', () => {
    const { container } = renderNote(bp(1))
    expect(container.textContent).toMatch(/Blueprints/)
  })
  it('can still carry the New badge as well', () => {
    const { container } = renderNote(post(1, { pinned_in: 'story' }), { isNew: true })
    expect(container.querySelector('.ff-new')).not.toBeNull()
  })
})

describe('pinned posts: the stylesheet, the data and the database file', () => {
  const css = read('src/factoryfloor/factoryfloor.css')
  it('draws a pin where the tape would be, and hides the spoken text visually', () => {
    expect(css).toMatch(/\.ff-note--pinned::before \{[^}]*border-radius: 50%/)
    expect(css).toMatch(/\.ff-note--pinned::before \{[^}]*#ef8f8f/) // a soft coral, not a strong red
    expect(css).toMatch(/\.ff-vh \{[^}]*clip: rect\(0 0 0 0\)/)
  })
  it('asks the database for the pinned column', () => {
    expect(read('src/factoryfloor/factoryApi.js')).toMatch(/'id, title, created_at, tags, channel, published, pinned_in'/)
  })
  it('the Factory Floor home page is left newest-first (it does not use the pinned order)', () => {
    expect(read('src/factoryfloor/FactoryFloorHome.jsx')).not.toMatch(/filterPosts|isPinned/)
  })
  it('the database allows only one pinned post in each section, and only two kinds', () => {
    const sql = read('sql/pinned-posts.sql')
    expect(sql).toMatch(/add column if not exists pinned_in text/)
    expect(sql).toMatch(/check \(pinned_in is null or pinned_in in \('story', 'blueprint'\)\)/)
    expect(sql).toMatch(/create unique index if not exists posts_one_pinned_per_section on posts \(pinned_in\) where pinned_in is not null/)
  })
  it('pins Day One and Blueprints #1, and only when nothing is pinned yet', () => {
    const sql = read('sql/pinned-posts.sql')
    expect(sql).toMatch(/title like 'Day One:%'/)
    expect(sql).toMatch(/title like 'Blueprints #1:%'/)
    expect(sql.match(/and not exists \(select 1 from posts where pinned_in = /g).length).toBe(2)
  })
})

describe('pinned posts: the page keeps working before the database has the new column', () => {
  it('asks for the pinned column first', async () => {
    asked.length = 0
    answers.length = 0
    answers.push({ data: [{ id: 'a', pinned_in: 'story' }], error: null })
    const posts = await fetchFactoryPosts()
    expect(asked).toHaveLength(1)
    expect(asked[0]).toMatch(/pinned_in/)
    expect(posts).toEqual([{ id: 'a', pinned_in: 'story' }])
  })
  it('asks again without it if the column is missing, so nothing breaks', async () => {
    asked.length = 0
    answers.length = 0
    answers.push({ data: null, error: { message: 'column posts.pinned_in does not exist' } })
    answers.push({ data: [{ id: 'b' }], error: null })
    const posts = await fetchFactoryPosts()
    expect(asked).toHaveLength(2)
    expect(asked[1]).not.toMatch(/pinned_in/)
    expect(posts).toEqual([{ id: 'b' }])
  })
  it('still reports a different kind of error', async () => {
    answers.length = 0
    answers.push({ data: null, error: { message: 'permission denied' } })
    await expect(fetchFactoryPosts()).rejects.toMatchObject({ message: 'permission denied' })
  })
})
