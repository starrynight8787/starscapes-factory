// The Story Ledger page, and the wiring that puts it behind its door.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], fail: false, doorOpen: false, owner: false }))
vi.mock('../src/rooms/roomsApi', () => ({ fetchRoomPosts: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.posts }) }))
vi.mock('../src/suggest/SuggestPanel', () => ({ default: ({ space }) => <div data-testid="suggest-panel">{space}</div> }))
vi.mock('../src/doors/useDoors', () => ({ default: () => ({ ready: true, isOpen: () => h.doorOpen }) }))
vi.mock('../src/doors/useCurrentOwner', () => ({ default: () => ({ checking: false, owner: h.owner }) }))
import StoryLedgerPage from '../src/ledger/StoryLedgerPage'
import RoomRoutes from '../src/rooms/RoomRoutes'
import { MOSAIC, TRACKED, VIDEOS, WHAT_IT_IS } from '../src/ledger/ledgerData'
import { findDoor, doorAreas } from '../src/doors/doorsData'
import { PROJECT_SOCIALS } from '../src/data/contact'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const post = (n, tags) => ({ id: `p${n}`, title: `Baywatch, S1 E${n}: Episode Audit`, created_at: '2026-10-14T10:00:00Z', tags })
const page = () => render(<MemoryRouter><StoryLedgerPage /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { posts: [], fail: false, doorOpen: false, owner: false }) })

describe('the page, as designed', () => {
  it('has the design\u2019s sections, in order, with its words', async () => {
    page()
    const heads = screen.getAllByRole('heading', { level: 2 }).map((x) => x.textContent)
    expect(heads).toEqual(['What it is', 'What gets tracked', 'The videos', 'The Mosaic', 'How the heavy storylines are handled', 'Where to find it', 'Latest audits'])
    expect(screen.getByRole('heading', { level: 1, name: 'Story Ledger' })).toBeInTheDocument()
    expect(screen.getByText('A deadpan audit of old TV')).toBeInTheDocument()
    expect(screen.getByText('Now watching: Baywatch, Season 1')).toBeInTheDocument()
    for (const p of WHAT_IT_IS) expect(screen.getByText(p)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Knowledge Nook/ })).toHaveAttribute('href', '/knowledge-nook')
    await waitFor(() => expect(screen.getByText('The first audit is on its way.')).toBeInTheDocument())
  })
  it('shows all eight things that get tracked and the four kinds of video', () => {
    page()
    expect(TRACKED).toHaveLength(8); expect(VIDEOS).toHaveLength(4)
    for (const [name, text] of [...TRACKED, ...VIDEOS]) { expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument(); expect(screen.getByText(text)).toBeInTheDocument() }
  })
  it('draws the Mosaic: 288 squares, five coloured, and says so in words (the squares are decoration)', () => {
    const { container } = page()
    expect(MOSAIC).toMatchObject({ total: 288, done: 5 })
    expect(container.querySelectorAll('.sl__mosaic span')).toHaveLength(288)
    expect(container.querySelectorAll('.sl__mosaic span.is-done')).toHaveLength(5)
    expect(container.querySelector('.sl__mosaic')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText(/5 of 288 so far\. \(242 Baywatch, 44 Baywatch Nights and 2 films\.\)/)).toBeInTheDocument()
    expect(MOSAIC.breakdown).toMatch(/242.*44.*2/)
  })
  it('links to TikTok and YouTube from the one place the addresses live, opening safely in a new tab', () => {
    page()
    const tt = screen.getByRole('link', { name: /Watch on TikTok/ })
    const yt = screen.getByRole('link', { name: /Watch on YouTube/ })
    expect(tt).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].tiktok)
    expect(yt).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].youtube)
    for (const a of [tt, yt]) { expect(a).toHaveAttribute('target', '_blank'); expect(a.getAttribute('rel')).toMatch(/noopener/) }
  })
  it('has the shared suggest and vote box, for this page\u2019s space', () => {
    page()
    expect(screen.getByTestId('suggest-panel')).toHaveTextContent('story-ledger')
  })
})

describe('the logo', () => {
  it('shows the picture when the file is there, with the page heading kept for screen readers', () => {
    const { container } = page()
    const img = container.querySelector('img.sl__logo')
    expect(img).toHaveAttribute('src', '/story-ledger/logo.png')
    expect(img).toHaveAttribute('alt', '')
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sl__sr')
  })
  it('shows the name as a plain heading when the file is not there yet, instead of a broken picture', () => {
    const { container } = page()
    fireEvent.error(container.querySelector('img.sl__logo'))
    expect(container.querySelector('img.sl__logo')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sl__title')
  })
})

describe('the latest audits', () => {
  it('lists the Nook\u2019s posts tagged story-ledger, and no others', async () => {
    h.posts = [post(5, ['story-ledger']), post(4, ['Story Ledger']), post(3, ['book-club']), post(2, [])]
    page()
    expect(await screen.findByRole('link', { name: /S1 E5/ })).toHaveAttribute('href', '/post/p5')
    expect(screen.getByRole('link', { name: /S1 E4/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /S1 E3/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /S1 E2/ })).toBeNull()
  })
  it('says plainly when they cannot load', async () => {
    h.fail = true
    page()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load just now/)
  })
})

describe('behind its door', () => {
  const at = () => render(<MemoryRouter initialEntries={['/knowledge-nook/story-ledger']}><Routes><Route path="/knowledge-nook/*" element={<RoomRoutes room="knowledge-nook" />} /></Routes></MemoryRouter>)
  it('is a designed page of its own, listed as a door, not a plain list of posts', () => {
    expect(findDoor('knowledge-nook', 'story-ledger').page).toEqual({ layout: 'custom' })
    expect(Object.keys(doorAreas('knowledge-nook'))).not.toContain('story-ledger')
  })
  it('shows visitors "this door isn\u2019t open yet" while the door is closed, and never the page', () => {
    at()
    expect(screen.getByRole('heading', { name: /isn.t open yet/ })).toBeInTheDocument()
    expect(screen.queryByText('A deadpan audit of old TV')).toBeNull()
  })
  it('shows the owner the page under a banner while it is closed', () => {
    h.owner = true
    at()
    expect(screen.getByText(/This door is closed/)).toBeInTheDocument()
    expect(screen.getByText('A deadpan audit of old TV')).toBeInTheDocument()
  })
  it('shows everyone the page once the door is open', () => {
    h.doorOpen = true
    at()
    expect(screen.getByText('A deadpan audit of old TV')).toBeInTheDocument()
    expect(screen.queryByText(/This door is closed/)).toBeNull()
  })
})

describe('the admin side is wired in', () => {
  it('has a route behind the sign-in, a tool in the console, and is kept out of search results', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/suggestions" element=\{ <ProtectedRoute/)
    expect(read('src/admin/adminTools.js')).toMatch(/name: 'Suggestions', to: '\/admin\/suggestions'/)
    expect(read('src/data/pageMeta.js')).toMatch(/'\/admin\/suggestions': \{[^}]*index: false/)
  })
  it('keeps the page\u2019s styles of its own, with no inline styles and nothing under 14px', () => {
    const css = read('src/ledger/ledger.css')
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    expect(read('src/ledger/StoryLedgerPage.jsx')).not.toMatch(/style=\{\{/)
  })
})
