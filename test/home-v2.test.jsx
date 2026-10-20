// The home page's new boxes, the home page itself, the owner's Home page tool, and how they are wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ event: null, featured: '', post: null, fail: false, owner: true, calls: [], events: [], failSave: false }))
vi.mock('../src/home/homeApi', () => ({
  fetchNextEvent: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.event }),
  fetchFeaturedSlug: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.featured }),
  fetchLatestPost: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.post }),
  listEvents: vi.fn(async () => h.events),
  saveEvent: vi.fn(async (id, value) => { if (h.failSave) throw new Error('Only the site owner can change this.'); h.calls.push(['saveEvent', id, value]) }),
  removeEvent: vi.fn(async (id) => { h.calls.push(['removeEvent', id]) }),
  saveFeaturedSlug: vi.fn(async (slug) => { h.calls.push(['saveFeaturedSlug', slug]) }),
}))
vi.mock('../src/den/youtubeApi', () => ({ fetchIntroId: vi.fn(async () => ''), saveIntroId: vi.fn(async () => {}), clearIntroId: vi.fn(async () => {}), fetchSeries: vi.fn(async () => []) }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import HomeSections, { NextEventBox, MembershipBox, FeaturedRoomBox, LatestPostBox } from '../src/home/HomeSections'
import ChannelDirectory from '../src/pages/ChannelDirectory'
import AdminHome from '../src/admin/AdminHome'
import { MEMBERSHIP } from '../src/data/membership'
import { PROJECT_SOCIALS } from '../src/data/contact'
import { channels } from '../src/data/channels'
import { roomPath } from '../src/data/roomImages'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)
const EVENT = { id: 'e1', title: 'Come read with me, live', starts_at: '2026-12-05T19:00:00Z', description: 'We read a chapter together.', link_url: null }
const POST = { id: 'p1', title: 'Claude and I had a fight', image_url: null, channel: 'factory-floor', created_at: '2026-10-14T10:00:00Z' }
beforeEach(() => { Object.assign(h, { event: null, featured: '', post: null, fail: false, owner: true, calls: [], events: [], failSave: false }); vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('Next event', () => {
  it('shows the event, when it is (in London time), what it is, and a calendar file that downloads', () => {
    wrap(<NextEventBox event={EVENT} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Come read with me, live' })).toBeInTheDocument()
    expect(screen.getByText('Saturday 5 December, 7pm')).toBeInTheDocument()
    expect(screen.getByText('We read a chapter together.')).toBeInTheDocument()
    const cal = screen.getByRole('link', { name: 'Add to calendar' })
    expect(cal.getAttribute('href')).toMatch(/^data:text\/calendar;charset=utf-8,/); expect(cal).toHaveAttribute('download')
    expect(decodeURIComponent(cal.getAttribute('href'))).toContain('SUMMARY:Come read with me\\, live')
  })
  it('with no link of its own, goes to the Drafting Desk YouTube channel, opening safely in a new tab', () => {
    wrap(<NextEventBox event={EVENT} />)
    const watch = screen.getByRole('link', { name: /Watch on YouTube/ })
    expect(watch).toHaveAttribute('href', PROJECT_SOCIALS['drafting-desk'].youtube); expect(watch).toHaveAttribute('target', '_blank'); expect(watch.getAttribute('rel')).toMatch(/noopener/)
  })
  it('with a link that is not YouTube, says "Find out more" instead', () => {
    wrap(<NextEventBox event={{ ...EVENT, link_url: 'https://zoom.example/room' }} />)
    expect(screen.getByRole('link', { name: /Find out more/ })).toHaveAttribute('href', 'https://zoom.example/room')
    expect(screen.queryByRole('link', { name: /Watch on YouTube/ })).toBeNull()
  })
  it('says plainly when nothing is planned', () => {
    wrap(<NextEventBox event={null} />)
    expect(screen.getByRole('heading', { level: 2, name: 'No event planned yet' })).toBeInTheDocument(); expect(screen.getByText('Check back soon.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add to calendar' })).toBeNull()
  })
})

describe('Membership', () => {
  it('uses the chosen name and line, and says honestly that it is not open yet, with a button that cannot be pressed', () => {
    wrap(<MembershipBox />)
    expect(screen.getByRole('heading', { level: 2, name: 'Into the Nebula' })).toBeInTheDocument(); expect(screen.getByText('Every star starts somewhere.')).toBeInTheDocument()
    expect(screen.getByText(MEMBERSHIP.textWhileClosed)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coming soon' })).toBeDisabled()
    expect(MEMBERSHIP.open).toBe(false)
  })
  it('shows no placeholder text and promises nothing it has not got', () => {
    const { container } = wrap(<MembershipBox />)
    expect(container.textContent).not.toMatch(/\[|Join the club/)
    expect(container.textContent).not.toMatch(/paid posts|Book Club|live events/i)
  })
})

describe('Featured room', () => {
  it('is the Art Loft until another is chosen, with its tagline, its description and a way in', () => {
    wrap(<FeaturedRoomBox slug="" />)
    const art = channels.find((c) => c.slug === 'art-loft')
    expect(screen.getByRole('heading', { level: 2, name: art.name })).toBeInTheDocument(); expect(screen.getByText(art.tagline)).toBeInTheDocument(); expect(screen.getByText(art.blurb)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: `Step inside ${art.name}` })).toHaveAttribute('href', roomPath('art-loft'))
  })
  it('shows whichever real room is chosen, and the Art Loft for a name that is not a room', () => {
    const first = wrap(<FeaturedRoomBox slug="knowledge-nook" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Knowledge Nook' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Step inside Knowledge Nook' })).toHaveAttribute('href', roomPath('knowledge-nook'))
    first.unmount()
    wrap(<FeaturedRoomBox slug="not-a-room" />)
    expect(screen.getByRole('heading', { level: 2, name: 'The Art Loft' })).toBeInTheDocument()
  })
})

describe('Latest post', () => {
  it('shows nothing when there is no post', () => {
    const { container } = wrap(<LatestPostBox post={null} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('shows the post with its room and date, a way to read it, and a way to see them all', () => {
    wrap(<LatestPostBox post={POST} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Claude and I had a fight' })).toBeInTheDocument()
    expect(screen.getByText(/The Factory Floor · 14 Oct 2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read the post' })).toHaveAttribute('href', '/post/p1'); expect(screen.getByRole('link', { name: 'See all posts' })).toHaveAttribute('href', '/blog')
  })
  it('uses the post\u2019s picture if it has one, as decoration, and a star if it has not', () => {
    const none = wrap(<LatestPostBox post={POST} />)
    expect(none.container.querySelector('img')).toBeNull(); none.unmount()
    const some = wrap(<LatestPostBox post={{ ...POST, image_url: 'https://img.example/p.jpg' }} />)
    expect(some.container.querySelector('img')).toHaveAttribute('src', 'https://img.example/p.jpg'); expect(some.container.querySelector('img')).toHaveAttribute('alt', '')
  })
})

describe('the home page', () => {
  it('keeps the floor plan and the room list, and no longer has the three-post strip', async () => {
    const { container } = wrap(<ChannelDirectory />)
    expect(screen.getByRole('heading', { level: 1, name: 'Step inside. Pick a room.' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg a.sf-room')).toHaveLength(8)
    expect(screen.getByRole('region', { name: 'All rooms' })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Fresh from the Factory/)
    await screen.findByText('No event planned yet')
  })
  it('fills the boxes from the database, in the design\u2019s order', async () => {
    h.event = EVENT; h.featured = 'sarah-jrs-den'; h.post = POST
    const { container } = wrap(<ChannelDirectory />)
    expect(await screen.findByText('Come read with me, live')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: "Sarah Junior's Clubhouse" })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Claude and I had a fight' })).toBeInTheDocument()
    const order = [...container.querySelectorAll('.hs section')].map((s) => s.getAttribute('aria-labelledby'))
    expect(order).toEqual(['hs-event-title', 'hs-membership-title', 'hs-room-title', 'hs-post-title'])
  })
  it('still works when the database is unreachable: the floor plan shows, and the boxes have their calm empty states', async () => {
    h.fail = true
    const { container } = wrap(<ChannelDirectory />)
    expect(await screen.findByText('No event planned yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'The Art Loft' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg a.sf-room')).toHaveLength(8); expect(screen.queryByRole('link', { name: 'Read the post' })).toBeNull()
  })
})

describe('the owner\u2019s Home page tool', () => {
  const tool = () => render(<MemoryRouter><AdminHome session={{ access_token: 't' }} /></MemoryRouter>)
  it('is for the owner only', () => {
    h.owner = false; h.events = [{ id: 'x', title: 'Secret event', starts_at: '2026-12-05T19:00:00Z' }]
    const { container } = tool()
    expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(container.textContent).not.toMatch(/Secret event/)
  })
  it('saves the featured room, starting from the one now chosen', async () => {
    h.featured = 'knowledge-nook'
    tool()
    const select = await screen.findByLabelText('Which room to feature')
    await waitFor(() => expect(select).toHaveValue('knowledge-nook'))
    fireEvent.change(select, { target: { value: 'explorers-bay' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save the featured room' }))
    await waitFor(() => expect(h.calls).toEqual([['saveFeaturedSlug', 'explorers-bay']]))
    expect(await screen.findByText("Explorer's Bay is now the featured room.")).toBeInTheDocument()
  })
  it('adds an event: it checks it first, works out London time, then saves it and says so', async () => {
    tool()
    fireEvent.click(await screen.findByRole('button', { name: 'Add the event' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Write a name for the event.'); expect(h.calls).toEqual([])
    fireEvent.change(screen.getByLabelText('Name of the event'), { target: { value: 'Come read with me, live' } })
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-07-04' } })
    fireEvent.change(screen.getByLabelText('Time (London time)'), { target: { value: '19:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the event' }))
    expect(await screen.findByText('Added \u201cCome read with me, live\u201d.')).toBeInTheDocument()
    expect(h.calls).toEqual([['saveEvent', null, expect.objectContaining({ title: 'Come read with me, live', starts_at: '2026-07-04T18:00:00.000Z', published: true })]])
  })
  it('changes an event: its day and time come back into the form as London time, and saving updates that event', async () => {
    h.events = [{ id: 'e1', title: 'Old name', starts_at: '2026-07-04T18:00:00Z', description: null, link_url: null }]
    tool()
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    expect(screen.getByLabelText('Day')).toHaveValue('2026-07-04'); expect(screen.getByLabelText('Time (London time)')).toHaveValue('19:00')
    fireEvent.change(screen.getByLabelText('Name of the event'), { target: { value: 'New name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(h.calls[0].slice(0, 2)).toEqual(['saveEvent', 'e1']))
    expect(h.calls[0][2]).toMatchObject({ title: 'New name', starts_at: '2026-07-04T18:00:00.000Z' })
  })
  it('marks a past event, and deletes only after asking', async () => {
    h.events = [{ id: 'old', title: 'Long ago', starts_at: '2020-01-01T19:00:00Z' }]
    window.confirm.mockReturnValueOnce(false)
    tool()
    expect(await screen.findByText(/Past/)).toBeInTheDocument()
    const del = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(del); expect(h.calls).toEqual([])
    fireEvent.click(del); await waitFor(() => expect(h.calls).toEqual([['removeEvent', 'old']]))
  })
  it('says plainly when the database refuses, and does not say it worked', async () => {
    h.failSave = true
    tool()
    fireEvent.change(await screen.findByLabelText('Name of the event'), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-12-05' } }); fireEvent.change(screen.getByLabelText('Time (London time)'), { target: { value: '19:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add the event' }))
    expect(await screen.findByText('Only the site owner can change this.')).toBeInTheDocument(); expect(screen.queryByText(/Added/)).toBeNull()
  })
})

describe('how it is wired in', () => {
  it('has an owner-only route, a tool in the console, and is kept out of search results', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/home" element=\{ <ProtectedRoute/)
    expect(read('src/admin/adminTools.js')).toMatch(/name: 'Home page', to: '\/admin\/home'/)
    expect(read('src/data/pageMeta.js')).toMatch(/'\/admin\/home': \{[^}]*index: false/)
  })
  it('has the home page ask only through the home calls, not the database directly', () => {
    const src = read('src/pages/ChannelDirectory.jsx')
    expect(src).toMatch(/from '\.\.\/home\/homeApi'/); expect(src).not.toMatch(/supabaseClient/)
  })
  it('has no inline styles and no text under 14px', () => {
    for (const f of ['src/home/HomeSections.jsx', 'src/admin/AdminHome.jsx']) expect(read(f), f).not.toMatch(/style=\{\{/)
    for (const m of read('src/home/homeSections.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
