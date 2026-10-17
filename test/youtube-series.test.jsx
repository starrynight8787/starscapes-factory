// The YouTube Series page: the feed reader, the two server functions, and the page.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseFeed, decode, fetchVideos, fetchThumbnail, CHANNEL_ID, FEED_URL } from '../lib/youtubeFeed.js'
import seriesHandler from '../api/youtube-series.js'
import thumbHandler from '../api/youtube-thumb.js'
import YouTubeSeriesPage from '../src/den/YouTubeSeriesPage'
import { SOCIAL_LINKS } from '../src/data/contact'
import { findDoor } from '../src/doors/doorsData'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const entry = (id, title, { published = '2026-10-01T10:00:00+00:00', short = false } = {}) => `<entry><id>yt:video:${id}</id><yt:videoId>${id}</yt:videoId><title>${title}</title><link rel="alternate" href="https://www.youtube.com/${short ? 'shorts' : 'watch?v='}${short ? '/' : ''}${id}"/><published>${published}</published></entry>`
const feed = (...entries) => `<?xml version="1.0"?><feed xmlns:yt="x"><title>Sarah Jr Adventures</title>${entries.join('')}</feed>`
const res = () => { const r = { headers: {}, code: 0, body: undefined, setHeader(k, v) { r.headers[k] = v }, status(c) { r.code = c; return r }, json(b) { r.body = b; return r }, send(b) { r.body = b; return r }, end() { return r } }; return r }
afterEach(() => vi.unstubAllGlobals())

describe('the channel', () => {
  it('is Sarah Jr.\u2019s, by its id, read from the public feed', () => {
    expect(CHANNEL_ID).toBe('UCuUUdvPlzi7m8QpD5MAdFTw')
    expect(FEED_URL).toBe('https://www.youtube.com/feeds/videos.xml?channel_id=UCuUUdvPlzi7m8QpD5MAdFTw')
  })
})

describe('reading the feed', () => {
  it('lists the videos in order, with their titles and dates', () => {
    const out = parseFeed(feed(entry('AAAAAAAAAAA', 'First one'), entry('BBBBBBBBBBB', 'Second one', { published: '2026-09-30T10:00:00+00:00' })))
    expect(out.map((v) => [v.id, v.title])).toEqual([['AAAAAAAAAAA', 'First one'], ['BBBBBBBBBBB', 'Second one']])
    expect(out[0].published).toBe('2026-10-01T10:00:00.000Z')
  })
  it('leaves Shorts out, and puts them back if asked', () => {
    const xml = feed(entry('AAAAAAAAAAA', 'Episode'), entry('BBBBBBBBBBB', 'A short', { short: true }))
    expect(parseFeed(xml).map((v) => v.id)).toEqual(['AAAAAAAAAAA'])
    expect(parseFeed(xml, { shorts: true }).map((v) => v.id)).toEqual(['AAAAAAAAAAA', 'BBBBBBBBBBB'])
  })
  it('refuses any video id that is not exactly 11 safe characters, so nothing odd reaches an address', () => {
    const xml = feed(entry('short', 'Too short'), entry('"><script>x</script>', 'Odd'), entry('../../etc/pass', 'Path'), entry('AAAAAAAAAAA', 'Good'))
    expect(parseFeed(xml).map((v) => v.id)).toEqual(['AAAAAAAAAAA'])
  })
  it('turns the feed\u2019s escapes back into words, and keeps a very long title short', () => {
    expect(decode('Tom &amp; Jerry&#39;s &quot;big&quot; day &lt;3 &#x1F43B;')).toBe('Tom & Jerry\'s "big" day <3 \u{1F43B}')
    expect(parseFeed(feed(entry('AAAAAAAAAAA', 'x'.repeat(400))))[0].title.length).toBe(140)
  })
  it('stops at twelve, and copes with an empty or broken feed', () => {
    const many = feed(...Array.from({ length: 20 }, (_, i) => entry(`V${String(i).padStart(10, '0')}`, `Video ${i}`)))
    expect(parseFeed(many)).toHaveLength(12)
    expect(parseFeed('')).toEqual([])
    expect(parseFeed(null)).toEqual([])
    expect(parseFeed('<feed><entry><title>No id</title></entry></feed>')).toEqual([])
  })
})

describe('asking YouTube', () => {
  it('returns the videos, or says plainly why not, and never throws', async () => {
    const ok = await fetchVideos({ fetchImpl: async () => ({ ok: true, text: async () => feed(entry('AAAAAAAAAAA', 'One')) }) })
    expect(ok).toMatchObject({ ok: true })
    expect(ok.videos).toHaveLength(1)
    expect((await fetchVideos({ fetchImpl: async () => ({ ok: false, status: 404 }) })).reason).toMatch(/404/)
    expect((await fetchVideos({ fetchImpl: async () => { throw new Error('offline') } })).reason).toMatch(/could not be reached/)
  })
  it('passes a thumbnail along only for a proper id, only if it really is a picture, and not if it is huge', async () => {
    const picture = (type = 'image/jpeg', size = 100) => async () => ({ ok: true, headers: { get: () => type }, arrayBuffer: async () => new ArrayBuffer(size) })
    expect(await fetchThumbnail('AAAAAAAAAAA', { fetchImpl: picture() })).toMatchObject({ ok: true, type: 'image/jpeg' })
    expect((await fetchThumbnail('bad id', { fetchImpl: picture() })).ok).toBe(false)
    expect((await fetchThumbnail('AAAAAAAAAAA', { fetchImpl: picture('text/html') })).ok).toBe(false)
    expect((await fetchThumbnail('AAAAAAAAAAA', { fetchImpl: picture('image/jpeg', 700000) })).ok).toBe(false)
    expect((await fetchThumbnail('AAAAAAAAAAA', { fetchImpl: picture('image/jpeg', 0) })).ok).toBe(false)
  })
})

describe('the two server functions', () => {
  it('give the videos, cached for fifteen minutes so YouTube is asked rarely', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, text: async () => feed(entry('AAAAAAAAAAA', 'One')) }))
    const r = res(); await seriesHandler({ method: 'GET' }, r)
    expect(r.code).toBe(200); expect(r.body).toMatchObject({ ok: true }); expect(r.body.videos).toHaveLength(1)
    expect(r.headers['Cache-Control']).toMatch(/s-maxage=900/)
  })
  it('say "not ok" with no videos, and are not cached, when YouTube cannot be reached; and refuse anything but GET', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('offline') })
    const r = res(); await seriesHandler({ method: 'GET' }, r)
    expect(r.body).toEqual({ ok: false, videos: [] }); expect(r.headers['Cache-Control']).toBe('no-store')
    const post = res(); await seriesHandler({ method: 'POST' }, post); expect(post.code).toBe(405)
  })
  it('pass a thumbnail along as a picture, cached for a day, and answer 404 to a bad id', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }))
    const r = res(); await thumbHandler({ method: 'GET', query: { id: 'AAAAAAAAAAA' } }, r)
    expect(r.code).toBe(200); expect(r.headers['Content-Type']).toBe('image/jpeg'); expect(r.headers['Cache-Control']).toMatch(/s-maxage=86400/)
    const bad = res(); await thumbHandler({ method: 'GET', query: { id: '../../x' } }, bad); expect(bad.code).toBe(404)
  })
})

describe('the page', () => {
  const videos = [{ id: 'AAAAAAAAAAA', title: 'Episode one', published: '2026-10-01T10:00:00.000Z' }, { id: 'BBBBBBBBBBB', title: 'Episode two', published: null }]
  const show = () => render(<MemoryRouter><YouTubeSeriesPage /></MemoryRouter>)
  const feedReturns = (body) => vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => body })))
  beforeEach(() => feedReturns({ ok: true, videos }))

  it('has the design\u2019s words, a way back, and a subscribe link that opens safely in a new tab', async () => {
    show()
    expect(screen.getByRole('heading', { level: 1, name: 'YouTube Series' })).toBeInTheDocument()
    expect(screen.getByText('Watch the adventures come to life.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Sarah Jr.'s Den/ })).toHaveAttribute('href', '/sarah-jrs-den')
    const sub = screen.getByRole('link', { name: /Subscribe on YouTube/ })
    expect(sub).toHaveAttribute('href', SOCIAL_LINKS.youtube); expect(sub).toHaveAttribute('target', '_blank'); expect(sub.getAttribute('rel')).toMatch(/noopener/)
    await screen.findByText('Episode one')
  })
  it('lists each video with its date, and a play button named for it', async () => {
    show()
    expect(await screen.findByText('Episode one')).toBeInTheDocument()
    expect(screen.getByText('1 Oct 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play: Episode one' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play: Episode two' })).toBeInTheDocument()
  })
  it('loads NOTHING from YouTube before a play button is pressed: the pictures come from this site, and there is no frame', async () => {
    const { container } = show()
    await screen.findByText('Episode one')
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('src')).toMatch(/^\/api\/youtube-thumb\?id=[A-Za-z0-9_-]{11}$/)
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.innerHTML).not.toMatch(/ytimg|youtube\.com\/embed|youtube-nocookie/)
  })
  it('plays only the video that was pressed, in the privacy-friendly player, with a title for screen readers', async () => {
    const { container } = show()
    fireEvent.click(await screen.findByRole('button', { name: 'Play: Episode one' }))
    const frame = container.querySelector('iframe')
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/AAAAAAAAAAA?autoplay=1&rel=0')
    expect(frame).toHaveAttribute('title', 'Episode one')
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Play: Episode two' }))
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
    expect(container.querySelector('iframe').getAttribute('src')).toContain('BBBBBBBBBBB')
  })
  it('says so when there are no videos yet, and plainly when they cannot load', async () => {
    feedReturns({ ok: true, videos: [] })
    const first = show()
    expect(await screen.findByText('The first adventure is on its way.')).toBeInTheDocument()
    first.unmount()
    feedReturns({ ok: false, videos: [] })
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('The videos could not load just now. Please try again in a moment.')
  })
  it('ignores a video whose id is not a proper id', async () => {
    feedReturns({ ok: true, videos: [{ id: '"><img src=x>', title: 'Bad' }, videos[0]] })
    const { container } = show()
    await screen.findByText('Episode one')
    expect(screen.queryByText('Bad')).toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(1)
  })
})

describe('how it is wired in', () => {
  it('is the Den\u2019s designed page behind its door, and uses no inline styles', () => {
    expect(findDoor('sarah-jrs-den', 'youtube-series').page).toEqual({ layout: 'custom' })
    expect(read('src/rooms/RoomRoutes.jsx')).toMatch(/'sarah-jrs-den\/youtube-series': YouTubeSeriesPage/)
    expect(read('src/den/YouTubeSeriesPage.jsx')).not.toMatch(/style=\{\{/)
  })
  it('sets no text under 14px', () => {
    for (const m of read('src/den/youtube.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
