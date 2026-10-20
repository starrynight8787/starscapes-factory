import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const world = vi.hoisted(() => ({ open: {}, loadFails: false, owner: false, posts: [] }))
vi.mock('../src/doors/doorsApi', () => ({
  fetchDoors: async () => { if (world.loadFails) throw new Error('no table'); return { ...world.open } },
  saveDoor: async () => {},
}))
vi.mock('../src/supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: world.owner ? { access_token: 't' } : null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
}))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: (session) => ({ checking: false, owner: Boolean(session) && world.owner }), default: () => world.owner }))
vi.mock('../src/rooms/roomsApi', () => ({ fetchRoomPosts: async () => world.posts }))

import RoomRoutes from '../src/rooms/RoomRoutes'
import { forgetDoors } from '../src/doors/useDoors'

const post = (id, title, tags) => ({ id, title, content: 'Words.', image_url: '', channel: 'sarah-jrs-den', tags, created_at: '2026-10-10T10:00:00Z', published: true })
const visit = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/sarah-jrs-den/*" element={<RoomRoutes room="sarah-jrs-den" />} />
      <Route path="/idea-hatchery/*" element={<RoomRoutes room="idea-hatchery" />} />
      <Route path="/explorers-bay/*" element={<RoomRoutes room="explorers-bay" />} />
    </Routes>
  </MemoryRouter>,
)
beforeEach(() => { forgetDoors(); Object.assign(world, { open: {}, loadFails: false, owner: false, posts: [post(1, 'Daryl visits the sea', ['blog']), post(2, 'A story for bedtime', ['books']), post(3, 'No door tag', [])] }) })

describe('the Den\u2019s front page', () => {
  it('shows every door taped off when nothing is open: none of them a link', async () => {
    const { container } = visit('/sarah-jrs-den')
    await screen.findByRole('heading', { level: 1, name: "Sarah Junior's Clubhouse" })
    await vi.waitFor(() => expect(container.querySelectorAll('.rs-stage .rs-item.is-locked')).toHaveLength(4))
    expect(container.querySelectorAll('.rs-stage a')).toHaveLength(0)
  })
  it('shows an opened door as a link to its page, with its untaped picture, and leaves the other doors taped off', async () => {
    world.open = { 'sarah-jrs-den/blog': true }
    const { container } = visit('/sarah-jrs-den')
    await vi.waitFor(() => expect(container.querySelectorAll('.rs-stage a')).toHaveLength(1))
    const link = container.querySelector('.rs-stage a')
    expect(link.getAttribute('href')).toBe('/sarah-jrs-den/blog')
    expect(link.querySelector('img').getAttribute('src')).toBe('/scenes/sarah-jrs-den/item-blog-open.svg')
    expect(container.querySelectorAll('.rs-stage .rs-item.is-locked')).toHaveLength(3)
  })
  it('keeps a door with no page taped off even if the database says it is open', async () => {
    world.open = { 'sarah-jrs-den/youtube-series': true }
    const { container } = visit('/sarah-jrs-den')
    await vi.waitFor(() => expect(container.querySelectorAll('.rs-stage .rs-item.is-locked')).toHaveLength(4))
    expect(container.querySelectorAll('.rs-stage a')).toHaveLength(0)
  })
  it('keeps every door taped off when the doors cannot be read', async () => {
    world.open = { 'sarah-jrs-den/blog': true }
    world.loadFails = true
    const { container } = visit('/sarah-jrs-den')
    await vi.waitFor(() => expect(container.querySelectorAll('.rs-stage .rs-item.is-locked')).toHaveLength(4))
    expect(container.querySelectorAll('.rs-stage a')).toHaveLength(0)
  })
})

describe('the page behind a door', () => {
  it('tells a visitor the door is not open yet while it is closed, and shows none of the posts', async () => {
    visit('/sarah-jrs-den/blog')
    expect(await screen.findByRole('heading', { level: 1, name: "This door isn't open yet" })).toBeTruthy()
    expect(screen.queryByText('Daryl visits the sea')).toBeNull()
    expect(screen.getByRole('link', { name: /Back to Sarah Junior's Clubhouse/ }).getAttribute('href')).toBe('/sarah-jrs-den')
  })
  it('shows the page, with only the posts tagged for that door, once it is open', async () => {
    world.open = { 'sarah-jrs-den/blog': true }
    visit('/sarah-jrs-den/blog')
    expect(await screen.findByRole('heading', { level: 1, name: 'Blog' })).toBeTruthy()
    expect(await screen.findByText('Daryl visits the sea')).toBeTruthy()
    expect(screen.queryByText('A story for bedtime')).toBeNull()
    expect(screen.queryByText('No door tag')).toBeNull()
    expect(screen.queryByRole('note')).toBeNull()
  })
  it('shows the Books door as a bookshelf, with each published book on it', async () => {
    world.open = { 'sarah-jrs-den/books': true }
    const { container } = visit('/sarah-jrs-den/books')
    await screen.findByText('A story for bedtime')
    expect(container.querySelector('.rp-shelf .rp-book')).not.toBeNull()
  })
  it('shows the owner the page while it is closed, under a banner', async () => {
    world.owner = true
    visit('/sarah-jrs-den/blog')
    expect(await screen.findByText('Daryl visits the sea')).toBeTruthy()
    expect(screen.getByRole('note').textContent).toMatch(/This door is closed/)
  })
  it('says page not found for a door whose page has not been built, whoever asks', async () => {
    world.owner = true
    world.open = { 'explorers-bay/coming-soon': true } // the paid bottle is the one door with no page yet
    visit('/explorers-bay/coming-soon')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy()
  })
  it('says page not found for an address that is not a page at all', async () => {
    visit('/sarah-jrs-den/nonsense')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy()
  })
})

describe('the rooms that already had their pages', () => {
  it('open exactly as before, with no gate in the way', async () => {
    world.posts = [{ ...post(9, 'A tiny world', ['stop-motion']), channel: 'idea-hatchery' }]
    visit('/idea-hatchery/stop-motion')
    expect(await screen.findByRole('heading', { level: 1, name: 'Stop Motion' })).toBeTruthy()
    expect(await screen.findByText('A tiny world')).toBeTruthy()
    expect(screen.queryByText(/isn't open yet/)).toBeNull()
  })
  it('still has Come Study With Me behind its gate', async () => {
    visit('/idea-hatchery/come-study-with-me')
    expect(await screen.findByRole('heading', { level: 1, name: "This door isn't open yet" })).toBeTruthy()
  })
})
