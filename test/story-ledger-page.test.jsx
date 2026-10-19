// The Story Ledger page, and the wiring that puts it behind its door.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], fail: false, doorOpen: false, owner: false }))
vi.mock('../src/rooms/roomsApi', () => ({ fetchRoomPosts: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.posts }) }))
vi.mock('../src/suggest/SuggestPanel', () => ({ default: ({ space }) => <div data-testid="suggest-panel">{space}</div> }))
vi.mock('../src/bookclub/bookApi', () => ({ fetchBooks: async () => [], fetchGoals: async () => ({}) })) // the room routes also load the Book Club page
vi.mock('../src/den/youtubeApi', () => ({ fetchSeries: async () => [], fetchIntroId: async () => '' })) // and the YouTube page
vi.mock('../src/doors/useDoors', () => ({ default: () => ({ ready: true, isOpen: () => h.doorOpen }) }))
vi.mock('../src/doors/useCurrentOwner', () => ({ default: () => ({ checking: false, owner: h.owner }) }))
import StoryLedgerPage from '../src/ledger/StoryLedgerPage'
import RoomRoutes from '../src/rooms/RoomRoutes'
import { MOSAIC, TRACKED, VIDEOS, WHAT_IT_IS, HEAVY, CURRENTLY, SUBSCRIBE } from '../src/ledger/ledgerData'
import { findDoor, doorAreas } from '../src/doors/doorsData'
import { PROJECT_SOCIALS } from '../src/data/contact'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const post = (n, tags) => ({ id: `p${n}`, title: `Baywatch, S1 E${n}: Episode Audit`, created_at: '2026-10-14T10:00:00Z', tags, image_url: null })
const page = () => render(<MemoryRouter><StoryLedgerPage /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { posts: [], fail: false, doorOpen: false, owner: false }) })

describe('the page, as designed', () => {
  it('has the design\u2019s boxes, in order, with its words', async () => {
    page()
    const heads = screen.getAllByRole('heading', { level: 2 }).map((x) => x.textContent)
    expect(heads).toEqual(['What it is', 'Baywatch', 'Never miss an audit', 'The videos', 'Previous audits', 'The Mosaic', 'Latest video', 'Where to watch'])
    expect(screen.getByRole('heading', { level: 3, name: 'How the heavy storylines are handled' })).toBeInTheDocument()
    expect(screen.getByText('A deadpan audit of old TV')).toBeInTheDocument()
    expect(screen.getByText('Now watching: Baywatch, Season 1')).toBeInTheDocument()
    await screen.findByText('The first audit is on its way.')
  })
  it('announces each box to a screen reader by its own heading, in the design\u2019s order', () => {
    page()
    const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby')).map((id) => document.getElementById(id).textContent)
    expect(names).toEqual(['What it is', 'Baywatch', 'Never miss an audit', 'The videos', 'Previous audits', 'The Mosaic', 'Latest video', 'Where to watch'])
  })
  it('no longer shows the list of what gets tracked (its new home is still to be decided)', () => {
    const { container } = page()
    expect(TRACKED).toHaveLength(8)
    expect(screen.queryByRole('heading', { name: 'What gets tracked' })).toBeNull()
    expect(container.textContent).not.toMatch(/Rescues|Celebrity cameos/)
  })
  it('explains the four kinds of video, and says new ones appear latest first', () => {
    page()
    expect(VIDEOS).toHaveLength(4)
    for (const [name, text] of VIDEOS) { expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument(); expect(screen.getByText(text)).toBeInTheDocument() }
    expect(screen.getByText('New videos appear latest first.')).toBeInTheDocument()
  })
  it('says what it is, with the note about the heavy storylines inside the same box', () => {
    page()
    const box = screen.getByRole('heading', { level: 2, name: 'What it is' }).closest('section')
    for (const para of WHAT_IT_IS) expect(within(box).getByText(para)).toBeInTheDocument()
    expect(within(box).getByRole('heading', { level: 3, name: HEAVY.title })).toBeInTheDocument(); expect(within(box).getByText(HEAVY.text)).toBeInTheDocument()
  })
  it('has "Currently watching" in the other half of that box: the show, its season, a blurb, four facts, the years, and how far through', () => {
    const { container } = page()
    const now = screen.getByRole('heading', { level: 2, name: 'Baywatch' }).closest('section')
    expect(within(now).getByText(/Currently watching/)).toBeInTheDocument(); expect(within(now).getByText('Season 1')).toBeInTheDocument()
    expect(within(now).getByText(CURRENTLY.blurb)).toBeInTheDocument()
    for (const [number, label] of CURRENTLY.facts) { const fact = within(now).getByText(label).closest('li'); expect(within(fact).getByText(number)).toBeInTheDocument() }
    expect(CURRENTLY.facts.map(([n]) => n)).toEqual(['11', '242', '44', '2'])
    expect(within(now).getByText('On air from 1989 to 2001. 5 of 288 watched so far.')).toBeInTheDocument()
    expect(container.querySelector('.sl__about')).toContainElement(now)
    expect(container.textContent).not.toMatch(/\[|Design note/)
  })
  it('has a Subscribe box with YouTube and TikTok buttons from the one place the addresses live, opening safely in a new tab', () => {
    page()
    const box = screen.getByRole('heading', { level: 2, name: 'Never miss an audit' }).closest('section')
    const yt = within(box).getByRole('link', { name: /Subscribe on YouTube/ }), tt = within(box).getByRole('link', { name: /Follow on TikTok/ })
    expect(yt).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].youtube); expect(tt).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].tiktok)
    for (const a of [yt, tt]) { expect(a).toHaveAttribute('target', '_blank'); expect(a.getAttribute('rel')).toMatch(/noopener/) }
    expect(within(box).getByText(SUBSCRIBE.text)).toBeInTheDocument()
  })
  it('draws the Mosaic: 288 squares, five coloured, and says so in words (the squares are decoration)', () => {
    const { container } = page()
    expect(MOSAIC).toMatchObject({ total: 288, done: 5 })
    expect(container.querySelectorAll('.sl__mosaic span')).toHaveLength(288)
    expect(container.querySelectorAll('.sl__mosaic span.is-done')).toHaveLength(5)
    expect(container.querySelector('.sl__mosaic')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText(/5 of 288 so far\. \(242 Baywatch, 44 Baywatch Nights and 2 films\.\)/)).toBeInTheDocument()
  })
  it('has Where to watch, with TikTok and YouTube opening safely in a new tab', () => {
    page()
    const box = screen.getByRole('heading', { level: 2, name: 'Where to watch' }).closest('section')
    const tt = within(box).getByRole('link', { name: /Watch on TikTok/ }), yt = within(box).getByRole('link', { name: /Watch on YouTube/ })
    expect(tt).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].tiktok); expect(yt).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].youtube)
    for (const a of [tt, yt]) { expect(a).toHaveAttribute('target', '_blank'); expect(a.getAttribute('rel')).toMatch(/noopener/) }
  })
  it('has the shared suggest and vote box, for this page\u2019s space', () => {
    page()
    expect(screen.getByTestId('suggest-panel')).toHaveTextContent('story-ledger')
  })
})

describe('the logo', () => {
  it('shows the picture in the banner and in the Subscribe box when the file is there, with the page heading kept for screen readers', () => {
    const { container } = page()
    const imgs = container.querySelectorAll('img.sl__logo')
    expect(imgs).toHaveLength(2)
    for (const img of imgs) { expect(img).toHaveAttribute('src', '/story-ledger/logo.png'); expect(img).toHaveAttribute('alt', '') }
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sl__sr')
  })
  it('shows the name as a plain heading, and no broken pictures, when the file is not there yet', () => {
    const { container } = page()
    fireEvent.error(container.querySelector('img.sl__logo'))
    expect(container.querySelectorAll('img.sl__logo')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sl__title')
  })
})

describe('the latest video and the previous audits', () => {
  const audits = () => [post(5, ['story-ledger']), post(4, ['Story Ledger']), post(3, ['story-ledger']), post(2, ['story-ledger']), post(1, ['story-ledger'])]
  it('shows the newest audit as the Latest video, with its title, date, a way to read it and a way to watch on YouTube', async () => {
    h.posts = audits(); page()
    const box = (await screen.findByRole('heading', { level: 3, name: /S1 E5/ })).closest('section')
    expect(within(box).getByRole('heading', { level: 2, name: 'Latest video' })).toBeInTheDocument(); expect(within(box).getByText('14 Oct 2026')).toBeInTheDocument()
    expect(within(box).getByRole('link', { name: 'Read the audit' })).toHaveAttribute('href', '/post/p5')
    const yt = within(box).getByRole('link', { name: /Watch on YouTube/ })
    expect(yt).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].youtube); expect(yt.getAttribute('rel')).toMatch(/noopener/)
  })
  it('lists the next three audits under Previous audits, never repeating the latest one, with a link to see them all on YouTube', async () => {
    h.posts = audits(); page()
    const box = (await screen.findByRole('heading', { level: 2, name: 'Previous audits' })).closest('section')
    const links = within(box).getAllByRole('link').filter((a) => a.getAttribute('href').startsWith('/post/'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/post/p4', '/post/p3', '/post/p2'])
    expect(within(box).queryByRole('link', { name: /S1 E5/ })).toBeNull(); expect(within(box).queryByRole('link', { name: /S1 E1/ })).toBeNull()
    expect(within(box).getByRole('link', { name: /See all audits on YouTube/ })).toHaveAttribute('href', PROJECT_SOCIALS['story-ledger'].youtube)
  })
  it('uses only the Nook\u2019s posts tagged story-ledger, and no others', async () => {
    h.posts = [post(5, ['story-ledger']), post(4, ['book-club']), post(3, []), post(2, ['story-ledger'])]; page()
    expect(await screen.findByRole('link', { name: /S1 E2/ })).toHaveAttribute('href', '/post/p2')
    expect(screen.queryByRole('link', { name: /S1 E4/ })).toBeNull(); expect(screen.queryByRole('link', { name: /S1 E3/ })).toBeNull()
  })
  it('uses an audit\u2019s picture if it has a safe one, as decoration, and a star if not', async () => {
    h.posts = [{ ...post(5, ['story-ledger']), image_url: 'https://img.example.com/a.jpg' }]; const first = page()
    await screen.findByRole('heading', { level: 3, name: /S1 E5/ })
    expect(first.container.querySelector('.sl__video')).toHaveAttribute('alt', ''); first.unmount()
    h.posts = [post(5, ['story-ledger'])]; const second = page()
    await screen.findByRole('heading', { level: 3, name: /S1 E5/ })
    expect(second.container.querySelector('img.sl__video')).toBeNull(); expect(second.container.querySelector('.sl__video.sl__img--empty')).toBeTruthy()
  })
  it('says so when there are no audits yet, or only one, and when they cannot load', async () => {
    h.posts = []; const none = page()
    expect(await screen.findByText('The first audit is on its way.')).toBeInTheDocument(); expect(screen.getByText('More audits are on their way.')).toBeInTheDocument(); none.unmount()
    h.posts = [post(5, ['story-ledger'])]; const one = page()
    await screen.findByRole('heading', { level: 3, name: /S1 E5/ }); expect(screen.getByText('More audits are on their way.')).toBeInTheDocument(); one.unmount()
    h.fail = true; page()
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

describe('the layout', () => {
  const css = () => read('src/ledger/ledger.css')
  it('is as wide as the Figma design, and puts the boxes side by side in the design\u2019s proportions, shrinking together instead of overflowing', () => {
    expect(css()).toMatch(/\.rp\.sl \{\s*max-width: 1232px/)
    expect(css()).toMatch(/\.sl__row--wide \{\s*grid-template-columns: minmax\(0, 736fr\) minmax\(0, 448fr\)/)
    expect(css()).toMatch(/\.sl__row--even \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
    expect(css()).not.toMatch(/grid-template-columns: \d+px/)
  })
  it('gives the two boxes in a row the same height, and the banner the full width and a black background', () => {
    expect(css()).toMatch(/\.sl__row \{[^}]*align-items: stretch/)
    expect(css()).toMatch(/\.sl__hero \{[^}]*width: 100%/); expect(css()).toMatch(/\.sl__hero \{[^}]*background: #000/)
  })
  it('lets Where to watch take the whole row when the suggest box is switched off', () => {
    expect(css()).toMatch(/\.sl__row--last:has\(> \.sl__where:only-child\) \{\s*grid-template-columns: minmax\(0, 1fr\)/)
  })
  it('stacks into one column on a phone, and draws the Mosaic 16 squares wide instead of 24', () => {
    expect(css()).toMatch(/\.sl__mosaic \{[^}]*repeat\(24, minmax\(0, 1fr\)\)/)
    expect(css()).toMatch(/@media \(max-width: 960px\)[\s\S]*\.sl__row--wide,\s*\.sl__row--even \{\s*grid-template-columns: minmax\(0, 1fr\)/)
    expect(css()).toMatch(/@media \(max-width: 960px\)[\s\S]*\.sl__mosaic \{\s*grid-template-columns: repeat\(16, minmax\(0, 1fr\)\)/)
    expect(MOSAIC.total).toBe(24 * 12); expect(MOSAIC.total).toBe(16 * 18)
  })
})
