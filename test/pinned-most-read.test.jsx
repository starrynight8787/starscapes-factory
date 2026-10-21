import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

const h = vi.hoisted(() => ({ reads: {} }))
vi.mock('../src/entries/readsApi', async (orig) => ({ ...(await orig()), fetchReads: () => Promise.resolve(h.reads) }))

import PinnedMostRead, { pickPinnedByTag } from '../src/entries/PinnedMostRead'

const post = (id, title, created_at, tags = []) => ({ id, title, created_at, tags, image_url: null })
const posts = [post('a', 'Alpha', '2026-10-01', ['pinned']), post('b', 'Beta', '2026-10-02'), post('c', 'Gamma', '2026-10-03', ['Pinned'])]
const show = (list) => render(<MemoryRouter><PinnedMostRead posts={list} idPrefix="t" /></MemoryRouter>)

describe('the pinned and most read boxes for the blog pages', () => {
  it('pins the newest post tagged pinned, and nothing if none is tagged', () => {
    expect(pickPinnedByTag(posts).id).toBe('c')
    expect(pickPinnedByTag([post('x', 'X', '2026-10-01')])).toBeNull()
    expect(pickPinnedByTag(null)).toBeNull()
  })
  it('shows the Pinned box, and Most read only once somebody has read something', async () => {
    h.reads = {}
    show(posts)
    expect(await screen.findByRole('heading', { name: 'Gamma' })).toBeInTheDocument()
    expect(screen.getByText('Pinned')).toBeInTheDocument()
    expect(screen.queryByText('Most read')).toBeNull()
  })
  it('shows the most read post, linking to it', async () => {
    h.reads = { b: 9, a: 2 }
    show(posts)
    expect(await screen.findByText('Most read')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Beta' }).closest('section').querySelector('a')).toHaveAttribute('href', '/post/b')
  })
  it('shows nothing for a page with no posts', () => {
    h.reads = {}
    const { container } = show([])
    expect(container.textContent).toBe('')
  })
})
