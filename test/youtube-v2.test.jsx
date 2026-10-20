// The YouTube Series page, new version: reading a video address, which video is pinned and which show below, the page, the owner's pinned-video choice,
// the database file, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ videos: [], intro: '', failSeries: false, owner: true, calls: [], failSave: false }))
vi.mock('../src/den/youtubeApi', () => ({
  fetchSeries: vi.fn(async () => { if (h.failSeries) throw new Error('x'); return h.videos }),
  fetchIntroId: vi.fn(async () => h.intro),
  saveIntroId: vi.fn(async (id) => { if (h.failSave) throw new Error('Only the site owner can change this.'); h.calls.push(['save', id]) }),
  clearIntroId: vi.fn(async () => { h.calls.push(['clear']) }),
}))
vi.mock('../src/home/homeApi', () => ({ fetchFeaturedSlug: vi.fn(async () => ''), listEvents: vi.fn(async () => []), saveEvent: vi.fn(), removeEvent: vi.fn(), saveFeaturedSlug: vi.fn(), fetchNextEvent: vi.fn(), fetchLatestPost: vi.fn() }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import YouTubeSeriesPage from '../src/den/YouTubeSeriesPage'
import AdminHome from '../src/admin/AdminHome'
import { videoIdFrom, pickIntro, pickGrid } from '../src/den/youtubeRules'
import { SOCIAL_LINKS } from '../src/data/contact'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const id = (n) => `V${String(n).padStart(10, '0')}` // an 11-character video id
const vid = (n, extra = {}) => ({ id: id(n), title: `Video ${n}`, published: `2026-10-${String(n).padStart(2, '0')}T10:00:00.000Z`, ...extra })
const many = (count) => Array.from({ length: count }, (_, i) => vid(count - i)) // newest first: Video count ... Video 1
const page = () => render(<MemoryRouter><YouTubeSeriesPage /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { videos: [], intro: '', failSeries: false, owner: true, calls: [], failSave: false }); vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('reading a video address', () => {
  it('finds the 11-character id in every kind of YouTube address, or from the id on its own', () => {
    const want = 'dQw4w9WgXcQ'
    for (const t of [want, ` ${want} `, `https://www.youtube.com/watch?v=${want}`, `https://youtube.com/watch?v=${want}&t=30s`, `https://m.youtube.com/watch?v=${want}`, `https://youtu.be/${want}`, `https://youtu.be/${want}?si=abc`, `https://www.youtube.com/shorts/${want}`, `https://www.youtube.com/embed/${want}`, `https://www.youtube-nocookie.com/embed/${want}`, `https://www.youtube.com/live/${want}`]) expect(videoIdFrom(t), t).toBe(want)
  })
  it('gives nothing for anything else, including another site, an insecure address, or a code that is the wrong length', () => {
    for (const bad of ['', null, undefined, 'hello', 'https://example.com/watch?v=dQw4w9WgXcQ', 'http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/@thedraftingdesk', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXc', 'javascript:alert(1)']) expect(videoIdFrom(bad), String(bad)).toBe('')
  })
})

describe('which video is pinned and which show below', () => {
  it('pins the one chosen, with its real title if it is among the latest, a plain welcome if it is older', () => {
    expect(pickIntro(many(3), id(1)).title).toBe('Video 1')
    expect(pickIntro(many(3), 'dQw4w9WgXcQ')).toEqual({ id: 'dQw4w9WgXcQ', title: 'Welcome to the channel', published: null })
  })
  it('pins the newest video when none is chosen, and nothing when there are none', () => {
    expect(pickIntro(many(3), '').title).toBe('Video 3'); expect(pickIntro([], '')).toBeNull(); expect(pickIntro(null, null)).toBeNull()
    expect(pickIntro([{ id: 'bad', title: 'x' }, vid(2)], '').title).toBe('Video 2')
  })
  it('shows the next seven under it, newest first, never the pinned one again', () => {
    const grid = pickGrid(many(12), id(12))
    expect(grid).toHaveLength(7); expect(grid.map((v) => v.title)).toEqual(['Video 11', 'Video 10', 'Video 9', 'Video 8', 'Video 7', 'Video 6', 'Video 5'])
    expect(pickGrid(many(5), id(2)).some((v) => v.id === id(2))).toBe(false)
    expect(pickGrid([], '')).toEqual([]); expect(pickGrid(null, '')).toEqual([])
  })
})

describe('the page', () => {
  it('has the banner (the page\u2019s one heading, the line, a safe Subscribe link and the Den\u2019s picture) and a way back', async () => {
    h.videos = many(3); const { container } = page()
    await screen.findByRole('heading', { level: 2, name: 'Video 3' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const banner = container.querySelector('.pb')
    expect(within(banner).getByRole('heading', { level: 1, name: 'YouTube Series' })).toBeInTheDocument(); expect(within(banner).getByText('come write with me, come read with me, come study with me')).toBeInTheDocument()
    const sub = within(banner).getByRole('link', { name: /Subscribe on YouTube/ })
    expect(sub).toHaveAttribute('href', SOCIAL_LINKS.youtube); expect(sub).toHaveAttribute('target', '_blank'); expect(sub.getAttribute('rel')).toMatch(/noopener/)
    expect(banner).toHaveClass('pb--starry') // the starry banner has stars and no picture of its own
    expect(banner.querySelector('img')).toBeNull()
    expect(screen.getByRole('link', { name: /Back to Sarah Jr.'s Den/ })).toHaveAttribute('href', '/sarah-jrs-den')
  })
  it('pins the newest video at the top, with "Start here", its date, and a link to watch it on YouTube', async () => {
    h.videos = many(3); page()
    const intro = (await screen.findByRole('heading', { level: 2, name: 'Video 3' })).closest('section')
    expect(within(intro).getByText('Start here')).toBeInTheDocument(); expect(within(intro).getByText('3 Oct 2026')).toBeInTheDocument()
    const watch = within(intro).getByRole('link', { name: /Watch on YouTube/ })
    expect(watch).toHaveAttribute('href', `https://www.youtube.com/watch?v=${id(3)}`); expect(watch).toHaveAttribute('target', '_blank')
  })
  it('pins the video Gill chose instead, even one that is not among the latest', async () => {
    h.videos = many(3); h.intro = 'dQw4w9WgXcQ'; page()
    const intro = (await screen.findByRole('heading', { level: 2, name: 'Welcome to the channel' })).closest('section')
    expect(within(intro).getByRole('link', { name: /Watch on YouTube/ })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(screen.getByRole('button', { name: 'Play: Welcome to the channel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play: Video 3' })).toBeInTheDocument() // the newest is now in the grid
  })
  it('shows the next seven under "Latest videos", with a link to see them all, and no video twice', async () => {
    h.videos = many(12); page()
    const latest = (await screen.findByRole('heading', { level: 2, name: 'Latest videos' })).closest('section')
    const buttons = within(latest).getAllByRole('button', { name: /^Play:/ })
    expect(buttons).toHaveLength(7); expect(buttons[0]).toHaveAccessibleName('Play: Video 11')
    expect(within(latest).queryByRole('button', { name: 'Play: Video 12' })).toBeNull()
    expect(within(latest).getByRole('link', { name: /See all videos on YouTube/ })).toHaveAttribute('href', SOCIAL_LINKS.youtube)
  })
  it('offers "Show more videos" (which a computer hides) when there are more than four, and it opens the rest', async () => {
    h.videos = many(12); const { container } = page()
    const more = await screen.findByRole('button', { name: 'Show more videos' })
    expect(container.querySelector('.yt__grid')).not.toHaveClass('is-expanded')
    fireEvent.click(more)
    expect(container.querySelector('.yt__grid')).toHaveClass('is-expanded'); expect(screen.queryByRole('button', { name: 'Show more videos' })).toBeNull()
  })
  it('does not offer "Show more videos" when there are four or fewer', async () => {
    h.videos = many(4); page()
    await screen.findByRole('heading', { level: 2, name: 'Latest videos' })
    expect(screen.queryByRole('button', { name: 'Show more videos' })).toBeNull()
  })
  it('plays only the video pressed, in the privacy-friendly player, with its title for screen readers', async () => {
    h.videos = many(3); const { container } = page()
    fireEvent.click(await screen.findByRole('button', { name: 'Play: Video 3' }))
    const frame = container.querySelector('iframe')
    expect(frame.getAttribute('src')).toBe(`https://www.youtube-nocookie.com/embed/${id(3)}?autoplay=1&rel=0`); expect(frame).toHaveAttribute('title', 'Video 3')
    fireEvent.click(screen.getByRole('button', { name: 'Play: Video 2' }))
    expect(container.querySelectorAll('iframe')).toHaveLength(1); expect(container.querySelector('iframe').getAttribute('src')).toContain(id(2))
  })
  it('says plainly when the videos cannot load, and when there are none yet', async () => {
    h.failSeries = true; const first = page()
    expect(await screen.findByRole('alert')).toHaveTextContent('The videos could not load just now. Please try again in a moment.'); first.unmount()
    h.failSeries = false; h.videos = []; page()
    expect(await screen.findByText('The first adventure is on its way.')).toBeInTheDocument()
  })
  it('still shows the pinned video Gill chose when the channel\u2019s feed cannot be reached', async () => {
    h.failSeries = true; h.intro = 'dQw4w9WgXcQ'; page()
    expect(await screen.findByRole('heading', { level: 2, name: 'Welcome to the channel' })).toBeInTheDocument()
  })
  it('has no newsletter box, because there is no mailing tool or Privacy policy behind one yet', async () => {
    h.videos = many(3); const { container } = page()
    await screen.findByRole('heading', { level: 2, name: 'Video 3' })
    expect(container.textContent).not.toMatch(/newsletter|Sign me up|Never miss/i); expect(container.querySelector('input')).toBeNull()
  })
})

describe('the owner\u2019s pinned-video choice', () => {
  const tool = () => render(<MemoryRouter><AdminHome session={{ access_token: 't' }} /></MemoryRouter>)
  it('says which video is pinned now, or that none is', async () => {
    h.intro = ''; const first = tool()
    expect(await screen.findByText(/None chosen, so the YouTube Series page pins its newest video/)).toBeInTheDocument(); first.unmount()
    h.intro = 'dQw4w9WgXcQ'; tool()
    expect(await screen.findByRole('link', { name: /this video/ })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
  it('pins a video from whatever address is pasted, and says so', async () => {
    tool()
    fireEvent.change(await screen.findByLabelText('Address of the video to pin'), { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pin this video' }))
    expect(await screen.findByText('That video is now pinned at the top of the YouTube Series page.')).toBeInTheDocument()
    expect(h.calls).toEqual([['save', 'dQw4w9WgXcQ']])
  })
  it('does not save an address that is not a YouTube video, and says why in words', async () => {
    tool()
    fireEvent.change(await screen.findByLabelText('Address of the video to pin'), { target: { value: 'https://example.com/video' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pin this video' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Paste the address of a YouTube video, or its 11-character code.')
    expect(h.calls).toEqual([])
  })
  it('lets her unpin it again', async () => {
    h.intro = 'dQw4w9WgXcQ'; tool()
    fireEvent.click(await screen.findByRole('button', { name: 'Unpin it' }))
    await waitFor(() => expect(h.calls).toEqual([['clear']]))
    expect(await screen.findByText(/Nothing is pinned now/)).toBeInTheDocument()
  })
  it('says plainly when the database refuses, and does not say it worked', async () => {
    h.failSave = true; tool()
    fireEvent.change(await screen.findByLabelText('Address of the video to pin'), { target: { value: 'dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pin this video' }))
    expect(await screen.findByText('Only the site owner can change this.')).toBeInTheDocument(); expect(screen.queryByText(/is now pinned/)).toBeNull()
  })
})

describe('the database change and how it is wired in', () => {
  it('lets the settings table hold the pinned video as well as the featured room, and nothing else', () => {
    const sql = read('sql/youtube-intro.sql').split('-- To confirm')[0]
    expect(sql).toContain("check (key in ('featured_room', 'youtube_intro'))"); expect(sql).toContain('drop constraint if exists site_settings_key_check')
    expect(sql).not.toMatch(/create policy|grant |drop table/)
  })
  it('keeps the home page\u2019s own database file as it was, and says how to undo the change', () => {
    expect(read('sql/home.sql')).toContain("key in ('featured_room')")
    expect(read('sql/youtube-intro.sql')).toMatch(/TO UNDO[\s\S]*delete from public\.site_settings where key = 'youtube_intro'/)
  })
  it('hides every video after the fourth on a phone until "Show more videos" is pressed, and never shows that button on a computer', () => {
    const css = read('src/den/youtube.css')
    expect(css).toMatch(/\.yt__more \{\s*display: none !important;/)
    expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*\.yt__grid:not\(\.is-expanded\) \.yt__card:nth-child\(n \+ 5\) \{\s*display: none;/)
    expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*\.yt__more \{\s*display: inline-flex !important;/)
  })
  it('has no inline styles apart from hiding a picture that will not load, and no text under 14px', () => {
    expect(read('src/den/YouTubeSeriesPage.jsx').replace("e.currentTarget.style.visibility = 'hidden'", '')).not.toMatch(/style=\{\{/)
    for (const m of read('src/den/youtube.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
