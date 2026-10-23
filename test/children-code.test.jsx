// Sarah Junior's Clubhouse is for children (Gill, 22 October 2026, SFW-264), so the ICO's Children's Code applies. The rule: a child is never asked for anything on its pages.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../src/newsletter/newsletterApi', () => ({ fetchOpen: vi.fn(async () => true), subscribe: vi.fn(async () => ({ ok: true })) }))
vi.mock('../src/supabaseClient', () => ({ supabase: { auth: { async signUp() { return { error: null } }, async getSession() { return { data: { session: null } } }, onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } } } } }))
import Footer from '../src/components/Footer'
import NewsletterSignup from '../src/newsletter/NewsletterSignup'
import ClubhouseNote from '../src/components/ClubhouseNote'
import Signup from '../src/pages/Signup'
import { onClubhouse, CLUBHOUSE_PATH, CLUBHOUSE_ROOM, GROWN_UPS_NOTE, ACCOUNT_AGE_NOTE, CLUBHOUSE_PROMISE } from '../src/data/children'
import { LEGAL_PAGES, STAR_ATLAS_LIVE } from '../src/data/legalPages'

const read = (p) => fs.readFileSync(p, 'utf8')
const footerAt = (where) => render(<MemoryRouter initialEntries={[where]}><Footer /></MemoryRouter>)
// the newsletter box draws itself a moment after the page (it first asks whether sign-ups are open), so "it is not there" is only proved once that moment has passed
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)) })
const page = (slug) => LEGAL_PAGES.find((p) => p.slug === slug)
const CLUBHOUSE_PAGES = ['/sarah-jrs-den', '/sarah-jrs-den/', '/sarah-jrs-den/youtube-series', '/sarah-jrs-den/blog', '/sarah-jrs-den/books/anything']

describe('which pages count as the Clubhouse', () => {
  it('the room and everything under it, and nothing else (not a similar-looking address)', () => {
    expect(CLUBHOUSE_ROOM).toBe('sarah-jrs-den'); expect(CLUBHOUSE_PATH).toBe('/sarah-jrs-den')
    for (const p of CLUBHOUSE_PAGES) expect(onClubhouse(p), p).toBe(true)
    for (const p of ['/', '/idea-hatchery', '/leadership-lounge/free-ebook', '/sarah-jrs-denial', '/art-loft/sarah-jrs-den', '/page/privacy', '', undefined, null, 5]) expect(onClubhouse(p), String(p)).toBe(false)
  })
})

describe('no email box on any Clubhouse page (the footer shows on every page)', () => {
  it.each(CLUBHOUSE_PAGES)('the footer on %s has no newsletter box and no email field, but is still the footer', async (where) => {
    footerAt(where); await settle()
    expect(screen.queryByRole('heading', { name: 'Newsletter' })).toBeNull(); expect(screen.queryByLabelText('Your email address')).toBeNull()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); expect(screen.getByRole('navigation', { name: 'Rooms' })).toBeInTheDocument()
  })
  it.each(['/', '/idea-hatchery', '/leadership-lounge', '/cart', '/page/privacy'])('everywhere else (%s) the newsletter box is still there', async (where) => {
    footerAt(where)
    expect(await screen.findByRole('heading', { name: 'Newsletter' })).toBeInTheDocument(); expect(screen.getByLabelText('Your email address')).toBeInTheDocument()
  })
  it('no page component of the Clubhouse can show an email form: none of them imports or draws one', () => {
    const files = [...fs.readdirSync('src/den').filter((f) => /\.jsx?$/.test(f)).map((f) => path.join('src/den', f)), 'src/rooms/RoomHome.jsx', 'src/components/ClubhouseNote.jsx']
    for (const f of files) { const s = read(f); expect(s, f).not.toMatch(/type=["']email["']|NewsletterSignup|RequestForm|FreeEbook|ebook-signup|<form/i) }
  })
})

describe('"for grown-ups" wherever an email address or an account is asked for', () => {
  it('the newsletter box says it', async () => {
    render(<MemoryRouter><NewsletterSignup /></MemoryRouter>)
    expect(await screen.findByText(GROWN_UPS_NOTE)).toBeInTheDocument()
  })
  it('the sign-up page says accounts are for people aged 18 or over', () => {
    render(<MemoryRouter><Signup /></MemoryRouter>)
    expect(screen.getByText(ACCOUNT_AGE_NOTE)).toBeInTheDocument()
  })
  it('the free ebook form and the "tell me when it opens" form say it too (each draws the same sentence)', () => {
    for (const f of ['src/ebook/FreeEbookPage.jsx', 'src/explorers/RequestForm.jsx', 'src/newsletter/NewsletterSignup.jsx']) { const s = read(f); expect(s, f).toMatch(/\{GROWN_UPS_NOTE\}/); expect(s, f).toMatch(/from '\.\.\/data\/children'/) }
    expect(read('src/pages/Signup.jsx')).toMatch(/\{ACCOUNT_AGE_NOTE\}/)
  })
  it('the sentences are plain and say what the rule is: 18 or over, or ask a grown-up', () => {
    expect(GROWN_UPS_NOTE).toMatch(/18 or over/); expect(GROWN_UPS_NOTE).toMatch(/ask a grown-up/); expect(ACCOUNT_AGE_NOTE).toMatch(/18 or over/); expect(ACCOUNT_AGE_NOTE).toMatch(/ask a grown-up/)
  })
})

describe('the promise to the child', () => {
  it('is shown with a heading, three plain lines, and a line for the grown-up that links to the Privacy policy', () => {
    render(<MemoryRouter><ClubhouseNote /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Our promise to you' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(CLUBHOUSE_PROMISE)
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/page/privacy'); expect(screen.getByText(/Grown-ups:/)).toBeInTheDocument()
  })
  it('says nothing the site does not do: no name or email asked for, no following around the internet, videos only on press play', () => {
    const all = CLUBHOUSE_PROMISE.join(' ')
    expect(all).toMatch(/name or your email/); expect(all).toMatch(/follow you around the internet/); expect(all).toMatch(/press play/)
  })
  it('is on the Clubhouse room page (and only for that room) and on its YouTube page', () => {
    const home = read('src/rooms/RoomHome.jsx'); expect(home).toMatch(/room === CLUBHOUSE_ROOM && <ClubhouseNote \/>/); expect(home).toMatch(/from '\.\.\/data\/children'/)
    expect(read('src/den/YouTubeSeriesPage.jsx')).toMatch(/<ClubhouseNote \/>/)
  })
})

describe('the promise is TRUE: what the Clubhouse really does', () => {
  it('a video only starts on press play: until then the page shows a picture from this site, and the player is the privacy-enhanced one with no "related videos"', () => {
    const y = read('src/den/YouTubeSeriesPage.jsx')
    expect(y).toMatch(/if \(playing\) return <iframe/); expect(y).toMatch(/youtube-nocookie\.com\/embed\//); expect(y).toMatch(/rel=0/); expect(y).toMatch(/\/api\/youtube-thumb\?id=/)
  })
  it('no page of the site fetches a picture or anything else directly from YouTube or Google when it loads', () => {
    const bad = []
    for (const dir of ['src']) for (const f of fs.readdirSync(dir, { recursive: true })) { const full = path.join(dir, String(f)); if (/\.(jsx?|css)$/.test(full) && /ytimg\.com|i\.ytimg|googlevideo|gstatic\.com|fonts\.googleapis/.test(read(full))) bad.push(full) }
    expect(bad).toEqual([])
  })
})

describe('Privacy policy, section 12 (Children)', () => {
  const children = () => page('privacy').sections.find((s) => s.title === 'Children').paragraphs.join('\n')
  it('no longer says only "This shop is for adults": the shop is for adults (18 or over), and the Clubhouse is for children', () => {
    const t = children(); expect(t).not.toMatch(/^This shop is for adults\./m); expect(t).toMatch(/The shop, accounts and passes are for adults/); expect(t).toMatch(/18 or over/); expect(t).toMatch(/Sarah Junior's Clubhouse is for children/)
  })
  it('says the things that are true of the Clubhouse, and gives a way to ask for a child\'s information to be deleted', () => {
    const t = children(); for (const x of ['no advertising, no analytics and no tracking', 'newsletter sign-up box is not shown there', 'only loads from YouTube when it is pressed', "privacy-enhanced player", 'mailto:', 'Children\'s Code']) expect(t).toContain(x)
  })
  it('stays consistent with the Cookie policy (which also says no advertising, analytics or visitor tracking)', () => {
    expect(page('cookies').sections.map((s) => s.paragraphs.join(' ')).join(' ')).toMatch(/advertising cookies, analytics or visitor tracking/)
  })
  it('keeps its title and its place (the policy still has the same sections)', () => {
    expect(page('privacy').sections.map((s) => s.title)).toContain('Children'); expect(page('privacy').sections).toHaveLength(STAR_ATLAS_LIVE ? 15 : 14) // the Star Atlas section is only shown once the atlas is live
  })
})
