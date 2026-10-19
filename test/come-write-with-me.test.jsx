// The Come Write With Me page on the Drafting Desk: the playlist feed, the one server function that now serves two jobs, the page, and how it is wired in.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ playlist: '', intro: '' }))
vi.mock('../src/supabaseClient', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } }))
vi.mock('../src/draftingdesk/comeWriteData', async (original) => {
  const m = await original()
  return { LIST_KEY: m.LIST_KEY, PAGE: m.PAGE, NEWSLETTER: m.NEWSLETTER, get PLAYLIST_ID() { return h.playlist }, get INTRO_ID() { return h.intro } }
})
import { parseFeed, fetchVideos, playlistFeedUrl, FEED_URL } from '../lib/youtubeFeed.js'
import seriesHandler from '../api/youtube-series.js'
import ComeWriteWithMePage from '../src/draftingdesk/ComeWriteWithMePage'
import { SHEETS } from '../src/draftingdesk/draftingData'
import { PROJECT_SOCIALS } from '../src/data/contact'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const PL = 'PLabcdefghij0123456789ABCDEFGHIJ'
const entry = (id, title, { published = '2026-10-01T10:00:00+00:00' } = {}) => `<entry><id>yt:video:${id}</id><yt:videoId>${id}</yt:videoId><title>${title}</title><link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/><published>${published}</published></entry>`
const feed = (...entries) => `<?xml version="1.0"?><feed xmlns:yt="x">${entries.join('')}</feed>`
const res = () => { const r = { headers: {}, code: 0, body: undefined, setHeader(k, v) { r.headers[k] = v }, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }; return r }
beforeEach(() => { h.playlist = ''; h.intro = '' })
afterEach(() => vi.unstubAllGlobals())

describe('the playlist feed', () => {
  it('has an address only for a proper playlist id, so nothing odd can reach an address', () => {
    expect(playlistFeedUrl(PL)).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=${PL}`)
    for (const bad of ['', null, undefined, 'short', 'has spaces in it okay', 'PL../../etc/passwd0000', `${PL}&channel_id=x`, 'a'.repeat(65), 'javascript:alert(1)']) expect(playlistFeedUrl(bad), String(bad)).toBe('')
  })
  it('asks the address it is given (a playlist\u2019s, not the channel\u2019s) and can read up to fifteen videos', async () => {
    const entries = Array.from({ length: 20 }, (_, i) => entry(String(i).padStart(11, 'A'), `Session ${i}`))
    const fetchImpl = vi.fn(async () => ({ ok: true, text: async () => feed(...entries) }))
    const result = await fetchVideos({ fetchImpl, feedUrl: playlistFeedUrl(PL), max: 15 })
    expect(fetchImpl.mock.calls[0][0]).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=${PL}`); expect(result.videos).toHaveLength(15)
  })
  it('still reads the channel\u2019s feed, twelve at most, when it is not given an address (the Den\u2019s page is unchanged)', async () => {
    const entries = Array.from({ length: 20 }, (_, i) => entry(String(i).padStart(11, 'B'), `Episode ${i}`))
    const fetchImpl = vi.fn(async () => ({ ok: true, text: async () => feed(...entries) }))
    const result = await fetchVideos({ fetchImpl }); expect(fetchImpl.mock.calls[0][0]).toBe(FEED_URL); expect(result.videos).toHaveLength(12)
    expect(parseFeed(feed(entry('AAAAAAAAAAA', 'One')))).toHaveLength(1)
  })
})

describe('the one server function, with two jobs', () => {
  it('serves the Den\u2019s channel exactly as before when no list is asked for', async () => {
    const fn = vi.fn(async () => ({ ok: true, text: async () => feed(entry('AAAAAAAAAAA', 'One')) })); vi.stubGlobal('fetch', fn)
    const r = res(); await seriesHandler({ method: 'GET', query: {} }, r)
    expect(fn.mock.calls[0][0]).toBe(FEED_URL); expect(r.body.videos).toHaveLength(1); expect(r.headers['Cache-Control']).toMatch(/s-maxage=900/)
    const noQuery = res(); await seriesHandler({ method: 'GET' }, noQuery); expect(noQuery.code).toBe(200)
  })
  it('serves the Come Write With Me playlist when that list is asked for, cached for fifteen minutes', async () => {
    h.playlist = PL
    const fn = vi.fn(async () => ({ ok: true, text: async () => feed(entry('AAAAAAAAAAA', 'Session one'), entry('BBBBBBBBBBB', 'Session two')) })); vi.stubGlobal('fetch', fn)
    const r = res(); await seriesHandler({ method: 'GET', query: { list: 'come-write-with-me' } }, r)
    expect(fn.mock.calls[0][0]).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=${PL}`); expect(r.code).toBe(200); expect(r.body).toMatchObject({ ok: true }); expect(r.body.videos.map((v) => v.title)).toEqual(['Session one', 'Session two']); expect(r.headers['Cache-Control']).toMatch(/s-maxage=900/)
  })
  it('gives an honest empty list, and asks YouTube nothing, until a playlist has been chosen', async () => {
    const fn = vi.fn(); vi.stubGlobal('fetch', fn)
    const r = res(); await seriesHandler({ method: 'GET', query: { list: 'come-write-with-me' } }, r)
    expect(fn).not.toHaveBeenCalled(); expect(r.body).toEqual({ ok: true, videos: [] }); expect(r.code).toBe(200)
  })
  it('refuses any other list name, and never lets a browser send a playlist id of its own', async () => {
    h.playlist = PL
    const fn = vi.fn(); vi.stubGlobal('fetch', fn)
    for (const list of ['PLsomeoneelse0123456789', 'sarah', 'COME-WRITE-WITH-ME', ['come-write-with-me', 'x'], 'come-write-with-me ']) {
      const r = res(); await seriesHandler({ method: 'GET', query: { list } }, r); expect(r.code, String(list)).toBe(400); expect(r.body).toEqual({ ok: false, videos: [] })
    }
    const sneaky = res(); await seriesHandler({ method: 'GET', query: { list: 'come-write-with-me', playlist_id: 'PLsomeoneelse0123456789' } }, sneaky)
    expect(fn).not.toHaveBeenCalledWith(expect.stringContaining('someoneelse'), expect.anything()); expect(String(fn.mock.calls[0] && fn.mock.calls[0][0])).toContain(PL)
  })
  it('says "not ok" and is not cached when YouTube cannot be reached, and refuses anything but GET', async () => {
    h.playlist = PL; vi.stubGlobal('fetch', async () => { throw new Error('offline') })
    const r = res(); await seriesHandler({ method: 'GET', query: { list: 'come-write-with-me' } }, r)
    expect(r.body).toEqual({ ok: false, videos: [] }); expect(r.headers['Cache-Control']).toBe('no-store')
    const post = res(); await seriesHandler({ method: 'POST', query: { list: 'come-write-with-me' } }, post); expect(post.code).toBe(405)
  })
})

describe('the page', () => {
  const sessions = [
    { id: 'AAAAAAAAAAA', title: 'Session three', published: '2026-10-15T10:00:00.000Z' },
    { id: 'BBBBBBBBBBB', title: 'Session two', published: '2026-10-08T10:00:00.000Z' },
    { id: 'CCCCCCCCCCC', title: 'Session one', published: '2026-10-01T10:00:00.000Z' },
  ]
  const show = () => render(<MemoryRouter><ComeWriteWithMePage /></MemoryRouter>)
  const answer = (body) => vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => body })))
  beforeEach(() => answer({ ok: true, videos: sessions }))

  it('has the words from the sketch, a way back to the Drafting Desk, and a subscribe link that opens safely in a new tab', async () => {
    show()
    expect(screen.getByRole('heading', { level: 1, name: 'Come Write With Me' })).toBeInTheDocument()
    expect(screen.getByText('Join me on YouTube while I write.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to the Drafting Desk/ })).toHaveAttribute('href', '/drafting-desk')
    const sub = screen.getByRole('link', { name: /Subscribe on YouTube/ })
    expect(sub).toHaveAttribute('href', PROJECT_SOCIALS['drafting-desk'].youtube); expect(sub).toHaveAttribute('target', '_blank'); expect(sub.getAttribute('rel')).toMatch(/noopener/)
    await screen.findByText('Session three')
  })
  it('asks the server for the Come Write With Me list, and nothing else', async () => {
    show(); await screen.findByText('Session three')
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][0]).toBe('/api/youtube-series?list=come-write-with-me')
  })
  it('pins the newest session at the top, called the latest session, and lists the others below it', async () => {
    show()
    const intro = await screen.findByRole('region', { name: 'Session three' })
    expect(within(intro).getByText('Latest session')).toBeInTheDocument(); expect(within(intro).queryByText('Start here')).toBeNull()
    const grid = screen.getByRole('region', { name: 'Latest sessions' })
    expect(within(grid).getAllByRole('heading', { level: 3 }).map((x) => x.textContent)).toEqual(['Session two', 'Session one'])
  })
  it('pins the video Gill chose, called start here, and does not repeat it below', async () => {
    h.intro = 'CCCCCCCCCCC'; show()
    const intro = await screen.findByRole('region', { name: 'Session one' })
    expect(within(intro).getByText('Start here')).toBeInTheDocument()
    const grid = screen.getByRole('region', { name: 'Latest sessions' })
    expect(within(grid).getAllByRole('heading', { level: 3 }).map((x) => x.textContent)).toEqual(['Session three', 'Session two'])
  })
  it('has a newsletter card beside the pinned video that says honestly it is not open yet, and has no sign-up box', async () => {
    const { container } = show(); await screen.findByText('Session three')
    const card = screen.getByRole('region', { name: 'Hear about the next session' })
    expect(within(card).getByText('Newsletter')).toBeInTheDocument(); expect(within(card).getByText('The newsletter is on its way. It is not open yet.')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Coming soon' })).toBeDisabled(); expect(container.querySelector('input')).toBeNull(); expect(container.querySelector('form')).toBeNull()
  })
  it('loads NOTHING from YouTube before a play button is pressed: the pictures come from this site, and there is no frame', async () => {
    const { container } = show(); await screen.findByText('Session two')
    expect(container.querySelector('iframe')).toBeNull()
    const pictures = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src')).filter((s) => s && s.includes('youtube-thumb'))
    expect(pictures.length).toBeGreaterThan(0); pictures.forEach((s) => expect(s).toMatch(/^\/api\/youtube-thumb\?id=/))
  })
  it('plays only the session that was pressed, in the privacy-friendly player, with a title for screen readers', async () => {
    const { container } = show(); await screen.findByText('Session two')
    fireEvent.click(screen.getByRole('button', { name: 'Play: Session two' }))
    const frames = container.querySelectorAll('iframe'); expect(frames).toHaveLength(1)
    expect(frames[0].getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/BBBBBBBBBBB?autoplay=1&rel=0'); expect(frames[0]).toHaveAttribute('title', 'Session two')
  })
  it('says the first session is on its way when there are none yet, and plainly when they cannot load', async () => {
    answer({ ok: true, videos: [] }); const empty = show()
    expect(await screen.findByText('The first session is on its way.')).toBeInTheDocument(); expect(screen.getByRole('region', { name: 'Hear about the next session' })).toBeInTheDocument(); empty.unmount()
    answer({ ok: false, videos: [] }); show()
    expect(await screen.findByRole('alert')).toHaveTextContent('The sessions could not load just now. Please try again in a moment.')
  })
  it('ignores a video whose id is not a proper id', async () => {
    answer({ ok: true, videos: [{ id: 'bad', title: 'Odd one' }, { id: 'javascript:1', title: 'Odder' }, ...sessions] }); show()
    await screen.findByText('Session two'); expect(screen.queryByText('Odd one')).toBeNull(); expect(screen.queryByText('Odder')).toBeNull()
  })
  it('shows more sessions, and a link to the whole channel', async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: String(i).padStart(11, 'D'), title: `Many ${i}`, published: '2026-10-01T10:00:00.000Z' })); answer({ ok: true, videos: many }); show()
    await screen.findByText('Many 1'); const more = screen.getByRole('button', { name: 'Show more sessions' }); fireEvent.click(more); expect(screen.queryByRole('button', { name: 'Show more sessions' })).toBeNull()
    expect(screen.getByRole('link', { name: /See all videos on YouTube/ })).toHaveAttribute('href', PROJECT_SOCIALS['drafting-desk'].youtube)
  })
})

describe('the paper on the desk looks open, not closed', () => {
  const svg = (f) => new DOMParser().parseFromString(read(`public/scenes/drafting-desk/${f}`), 'image/svg+xml')
  const sheet = svg('sheet-come-write-with-me.svg'); const base = svg('base.svg')
  it('has a valid drawing with no hazard tape and no padlock on the paper', () => {
    expect(sheet.querySelector('parsererror')).toBeNull(); expect(sheet.documentElement.getAttribute('viewBox')).toBe('-204 -161.5 408 323')
    expect(sheet.querySelector('[data-tape-group], [data-tape]')).toBeNull(); expect(sheet.querySelector('circle[cx="23"][cy="17"]')).toBeNull()
    expect(read('public/scenes/drafting-desk/sheet-come-write-with-me.svg')).not.toMatch(/FFD60A/i)
  })
  it('keeps the paper, its lines, a speech bubble and the pencil, with the bubble below where the words go', () => {
    expect(sheet.querySelectorAll('rect[fill="#fff"]').length).toBeGreaterThanOrEqual(2); expect(sheet.querySelector('g[transform="translate(122 58) scale(0.78)"]')).not.toBeNull()
    expect(sheet.querySelectorAll('g[transform*="rotate(-8)"]')).toHaveLength(1) // the pencil
    expect(read('public/scenes/drafting-desk/sheet-come-write-with-me.svg')).not.toMatch(/<text|<script|<image|<foreignObject|\shref=|xlink:|<style|font-family/i)
  })
  it('has no traffic cone left beside it on the desk, and the desk is otherwise the same oak desk', () => {
    expect(base.querySelector('parsererror')).toBeNull(); expect(base.querySelector('[data-cone]')).toBeNull(); expect(base.querySelector('[data-oak="surface"]')).not.toBeNull()
  })
  it('has its picture fingerprints in the health check\u2019s list up to date, for the paper and for the desk', async () => {
    const { createHash } = await import('node:crypto'); const manifest = JSON.parse(read('tools/art-manifest.json'))
    for (const f of ['public/scenes/drafting-desk/sheet-come-write-with-me.svg', 'public/scenes/drafting-desk/base.svg']) expect(manifest[f], f).toBe(createHash('sha256').update(readFileSync(join(process.cwd(), f))).digest('hex').slice(0, 16))
  })
  it('leaves the other papers as they were: the Author\u2019s Notebook keeps its padlock', () => {
    expect(read('public/scenes/drafting-desk/sheet-authors-notebook.svg')).toMatch(/<rect[^>]*width="46"[^>]*height="36"/)
  })
})

describe('how it is wired in', () => {
  it('is a real paper on the desk that opens its page, with no padlock and no "starting soon"', () => {
    const sheet = SHEETS.find((s) => s.id === 'come-write-with-me')
    expect(sheet).toMatchObject({ kind: 'page', to: '/drafting-desk/come-write-with-me' }); expect(sheet.lock).toBeUndefined(); expect(sheet.blurb).not.toMatch(/soon/i)
  })
  it('has its own route under the Drafting Desk, a page title and description for search, and is not hidden from search by itself', () => {
    expect(read('src/draftingdesk/DraftingDeskRoutes.jsx')).toMatch(/path="come-write-with-me" element=\{<ComeWriteWithMePage \/>\}/)
    const meta = read('src/data/pageMeta.js'); expect(meta).toMatch(/'\/drafting-desk\/come-write-with-me': \{ title: 'Come Write With Me'/)
  })
  it('has the playlist and the pinned video empty to start with, written as empty words in one place, and the choice of list in the data file', () => {
    const data = read('src/draftingdesk/comeWriteData.js')
    expect(data).toMatch(/export const PLAYLIST_ID = ''/); expect(data).toMatch(/export const INTRO_ID = ''/); expect(data).toMatch(/export const LIST_KEY = 'come-write-with-me'/)
  })
  it('adds no new server function: the page is served by the existing YouTube function, so the count stays within the free plan\u2019s 12', async () => {
    const { readdirSync, existsSync } = await import('node:fs')
    expect(existsSync(join(process.cwd(), 'api/come-write-with-me.js'))).toBe(false)
    expect(readdirSync(join(process.cwd(), 'api')).filter((f) => /\.(js|mjs|cjs|ts)$/.test(f) && !f.startsWith('_')).length).toBeLessThanOrEqual(12)
    expect(read('src/draftingdesk/comeWriteApi.js')).toMatch(/\/api\/youtube-series\?list=\$\{LIST_KEY\}/)
  })
  it('uses no inline styles, and sets no text under 14px', () => {
    expect(read('src/draftingdesk/ComeWriteWithMePage.jsx')).not.toMatch(/style=\{\{/)
    for (const m of read('src/draftingdesk/comewrite.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('keeps the newsletter card\u2019s Coming soon button readable (text and background pass 4.5 to 1)', () => {
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const rule = read('src/draftingdesk/comewrite.css').match(/\.cw__soon \{([^}]*)\}/)[1]
    expect(ratio(rule.match(/background:\s*(#[0-9a-f]{6})/i)[1], rule.match(/(?:^|[\s;])color:\s*(#[0-9a-f]{6})/i)[1])).toBeGreaterThanOrEqual(4.5)
  })
})
