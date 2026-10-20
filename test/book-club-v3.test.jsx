// The new parts of the Book Club page (Figma: "Book Club v3"): the welcome card, the membership card, the Come Read card, The Shelf's year tiles, and the genres as books on a bookshelf.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ books: [], goals: {}, posts: [], open: false, videoId: '' }))
vi.mock('../src/bookclub/bookApi', () => ({ fetchBooks: vi.fn(async () => h.books), fetchGoals: vi.fn(async () => h.goals), saveBook: vi.fn(), removeBook: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../src/rooms/roomsApi', () => ({ fetchRoomPosts: vi.fn(async () => h.posts) }))
vi.mock('../src/suggest/SuggestPanel', () => ({ default: ({ space }) => <div data-testid="suggest-panel">{space}</div> }))
vi.mock('../src/data/membership', () => ({ MEMBERSHIP: { get open() { return h.open }, name: 'Into the Nebula', buttonWhileClosed: 'Coming soon' } }))
vi.mock('../src/bookclub/bookClubData', async (original) => {
  const m = await original()
  return { ...m, WELCOME: { get videoId() { return h.videoId }, label: m.WELCOME.label, title: m.WELCOME.title, text: m.WELCOME.text, noVideo: m.WELCOME.noVideo } }
})
import BookClubPage from '../src/bookclub/BookClubPage'
import { GENRES } from '../src/bookclub/bookRules'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const NOW = new Date('2026-10-17T12:00:00Z')
const book = (id, title, status, finished, extra = {}) => ({ id, title, status, finished, started: null, author: `${title} author`, genre: 'leadership', rating: null, cover_url: null, review_post_id: null, note: null, ...extra })
const post = (n, tags) => ({ id: `p${n}`, title: `Note ${n}`, created_at: '2026-10-14T10:00:00Z', tags })
const page = () => render(<MemoryRouter><BookClubPage now={NOW} /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { books: [], goals: {}, posts: [], open: false, videoId: '' }) })

describe('the welcome card', () => {
  it('has a label, a heading and a few words, and says plainly that the video is coming soon while there is none', () => {
    const { container } = page()
    const card = screen.getByRole('region', { name: 'A message from me' })
    expect(within(card).getByText('Welcome')).toBeInTheDocument()
    expect(within(card).getByText(/Welcome to the Book Club/)).toBeInTheDocument()
    expect(within(card).getByText('Welcome video coming soon')).toBeInTheDocument()
    expect(container.querySelector('iframe')).toBeNull(); expect(within(card).queryByRole('button')).toBeNull()
  })
  it('becomes a video that only loads from YouTube when it is pressed, once there is a video id', () => {
    h.videoId = 'abc123DEF45'
    const { container } = page()
    expect(container.querySelector('iframe')).toBeNull() // nothing from YouTube until it is pressed
    const play = screen.getByRole('button', { name: 'Play: A message from me' })
    expect(play.querySelector('img')).toHaveAttribute('src', '/api/youtube-thumb?id=abc123DEF45')
    fireEvent.click(play)
    const frame = container.querySelector('iframe')
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123DEF45?autoplay=1&rel=0')
    expect(frame).toHaveAttribute('title', 'A message from me')
  })
  it('ignores a video id that is not exactly 11 letters, numbers, dashes or underscores', () => {
    for (const bad of ['short', 'javascript:alert(1)', 'abc123DEF45x', 'abc 123 DEF']) {
      h.videoId = bad
      const { container, unmount } = page()
      expect(container.querySelector('iframe'), bad).toBeNull(); expect(screen.queryByRole('button', { name: /^Play:/ }), bad).toBeNull(); expect(screen.getByText('Welcome video coming soon')).toBeInTheDocument(); unmount()
    }
  })
})

describe('the membership card', () => {
  it('shows the name, three things members get, and a Coming soon chip and button that does nothing, while memberships are closed', () => {
    page()
    const card = screen.getByRole('region', { name: 'Into the Nebula' })
    expect(within(card).getByText('Coming soon', { selector: '.bc__soonchip' })).toBeInTheDocument()
    expect(within(card).getAllByRole('listitem').map((li) => li.textContent.replace('✓', '').trim())).toEqual(['All my reviews and notes, after the first three free', 'Suggest the next book, and vote for it', 'A place in the conversation'])
    const button = within(card).getByRole('button', { name: 'Coming soon' }); expect(button).toBeDisabled()
    expect(within(card).queryByRole('link')).toBeNull()
  })
  it('offers the passes, with no Coming soon chip, once memberships are open', () => {
    h.open = true; page()
    const card = screen.getByRole('region', { name: 'Into the Nebula' })
    expect(within(card).getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership')
    expect(within(card).queryByText('Coming soon')).toBeNull(); expect(within(card).queryByRole('button')).toBeNull()
  })
})

describe('the Come Read card', () => {
  it('has a heading, a line, and the button to the live reading sessions', () => {
    page()
    const card = screen.getByRole('region', { name: 'Read along with me' })
    expect(within(card).getByText('Come read')).toBeInTheDocument(); expect(within(card).getByText('Live reading sessions on YouTube, together.')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Come read with me/ })).toHaveAttribute('href', 'https://www.youtube.com/@thedraftingdesk')
  })
})

describe('The Shelf: a tile for each year', () => {
  beforeEach(() => {
    h.books = [book('a', 'Alpha', 'read', '2026-10-03'), book('b', 'Bravo', 'read', '2026-03-01'), book('c', 'Charlie', 'read', '2025-12-30'), book('d', 'Delta', 'read', '2025-05-01'), book('e', 'Echo', 'read', '2024-02-02')]
    h.goals = { 2026: { goal: 24, theme: null } }
  })
  it('has the years oldest first, with how many books each, and the year to come as a dashed empty tile', async () => {
    page()
    const group = await screen.findByRole('group', { name: 'Choose a year' })
    expect(within(group).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['2024, 1 book', '2025, 2 books', '2026, 2 of 24 so far'])
    const next = group.querySelector('.bc__tile--empty'); expect(next).toHaveTextContent('2027'); expect(next).toHaveTextContent('To come'); expect(next.tagName).not.toBe('BUTTON')
  })
  it('puts two tiles on each shelf, with a plank under each shelf', async () => {
    const { container } = page(); await screen.findByRole('group', { name: 'Choose a year' })
    const shelves = container.querySelectorAll('.bc__ledge'); expect(shelves).toHaveLength(2)
    expect([...shelves].map((s) => s.querySelectorAll('.bc__tile').length)).toEqual([2, 2]); shelves.forEach((s) => expect(s.querySelector('.bc__ledge-plank')).not.toBeNull())
  })
  it('shows this year as the chosen tile, and opens another year\u2019s shelf below when its tile is pressed', async () => {
    page()
    const group = await screen.findByRole('group', { name: 'Choose a year' })
    expect(within(group).getByRole('button', { name: /^2026/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(group).getByRole('button', { name: /^2024/ }))
    expect(within(group).getByRole('button', { name: /^2024/ })).toHaveAttribute('aria-pressed', 'true'); expect(within(group).getByRole('button', { name: /^2026/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { level: 2, name: 'The 2024 shelf' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: /Echo/ })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Alpha/ })).toBeNull()
  })
  it('has a tile for this year, and the next, even before any book is on the shelf', async () => {
    h.books = []; h.goals = {}
    page()
    const group = await screen.findByRole('group', { name: 'Choose a year' })
    expect(within(group).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['2026, 0 books']); expect(group.querySelector('.bc__tile--empty')).toHaveTextContent('2027')
  })
})

describe('the genres, as books on a bookshelf', () => {
  it('has a book for each genre it shows, in the order of the genre list, each a link to its own shelf on the bookshelf page', async () => {
    h.posts = [post(1, ['book-club', 'leadership']), post(2, ['book-club', 'leadership']), post(3, ['book-club', 'fiction'])]
    page()
    const shelf = screen.getByRole('region', { name: 'Choose a genre' })
    const links = await within(shelf).findAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs[0]).toBe('/knowledge-nook/book-club/shelf') // the link to every book comes first
    const shown = hrefs.slice(1) // however many genres the page shows (the first five, or all of them), they are the first ones of the list, in order
    expect(shown.length).toBeGreaterThanOrEqual(5); expect(shown.length).toBeLessThanOrEqual(GENRES.length)
    expect(shown).toEqual(GENRES.slice(0, shown.length).map((g) => `/knowledge-nook/book-club/shelf?genre=${g.key}`))
    expect(links[1]).toHaveTextContent('Leadership'); expect(links[3]).toHaveTextContent('Memoir')
    expect(within(shelf).getByText('Every book on this shelf is a genre. Pick one to see my notes.')).toBeInTheDocument()
  })
  it('gives the books five looks between them, repeating in order along the shelf', () => {
    const { container } = page()
    expect([...container.querySelectorAll('.bc__spines > li')].map((li) => [...li.classList].find((c) => /bc__bookitem--\d/.test(c)))).toEqual(Array.from({ length: container.querySelectorAll('.bc__spines > li').length }, (_, n) => `bc__bookitem--${n % 5}`))
  })
})

describe('the theme card and the reviews', () => {
  it('has a Join the conversation link that goes to the reviews on the same page', () => {
    const { container } = page()
    expect(screen.getByRole('link', { name: 'Join the conversation' })).toHaveAttribute('href', '#bc-reviews'); expect(container.querySelector('#bc-reviews')).not.toBeNull()
  })
})

describe('the look of it', () => {
  const css = read('src/bookclub/bookclub.css')
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const TOKENS = { '--sf-navy-700': '#14306a', '--sf-blue': '#1f6fa8', '--sf-star': '#dce6ff' }
  const hexOf = (v) => { const m = String(v).match(/var\((--[\w-]+),\s*(#[0-9a-f]{6})\)/i); if (m) return TOKENS[m[1]] || m[2]; const x = String(v).trim(); return x === '#fff' ? '#ffffff' : x }
  const pair = (selector) => { const rule = css.match(new RegExp(`${selector.replace(/[.\[\]()]/g, '\\$&')}\\s*\\{([^}]*)\\}`)); expect(rule, selector).not.toBeNull(); const bg = rule[1].match(/background:\s*([^;]+);/); const fg = rule[1].match(/(?:^|[\s;])color:\s*([^;]+);/); expect(bg && fg, selector).toBeTruthy(); return [hexOf(bg[1]), hexOf(fg[1])] }
  it('keeps every book on the bookshelf, and every tile, readable: text and background pass 4.5 to 1', () => {
    for (const s of ['.bc__bookitem--0 .bc__book', '.bc__bookitem--1 .bc__book', '.bc__bookitem--2 .bc__book', '.bc__bookitem--3 .bc__book', '.bc__bookitem--4 .bc__book', '.bc__tile', ".bc__tile[aria-pressed='true']", '.bc__soonchip', '.bc__soon']) {
      const [bg, fg] = pair(s); expect(ratio(bg, fg), s).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('arranges the cards in a grid on a wide screen (theme and Come Read on top; Reading now beside The Shelf; Up next across the whole width below) and in one column on a phone', () => {
    expect(css).toMatch(/grid-template-areas:\s*'theme theme come' 'read read shelf' 'next next next'/)
    for (const a of ['theme', 'come', 'read', 'next', 'shelf']) expect(css).toMatch(new RegExp(`grid-area: ${a};`))
    expect(css).toMatch(/\.bc__grid \{[^}]*grid-template-columns: 1fr;/); expect(css).toMatch(/@media \(max-width: 700px\)/)
  })
  it('makes Reading now and Up next wide horizontal bands, not narrow tall boxes, with Reading now as tall as the Shelf beside it (nothing may stop it stretching)', () => {
    const wideBlock = () => { const start = css.indexOf('@media (min-width: 980px) {'); let depth = 0; for (let i = css.indexOf('{', start); i < css.length; i += 1) { if (css[i] === '{') depth += 1; else if (css[i] === '}') { depth -= 1; if (depth === 0) return css.slice(start, i + 1) } } return '' }
    const wide = wideBlock()
    // Reading now and the Shelf share a row, so each is as tall as the other: neither may have an align-self (that is what would stop it stretching)
    expect(wide).toMatch(/\.bc__reading \{ grid-area: read; \}/); expect(wide).toMatch(/\.bc__shelfcard \{ grid-area: shelf; \}/); expect(wide).toMatch(/\.bc__next \{ grid-area: next; align-self: start; \}/)
    expect(wide).not.toMatch(/\.bc__reading[^}]*align-self/); expect(wide).not.toMatch(/\.bc__shelfcard[^}]*align-self/)
    expect(wide).toMatch(/'theme theme come' 'read read shelf' 'next next next'/) // Reading now and the Shelf are the only two in their row
    expect(css).not.toMatch(/'read next shelf'/); expect(css).not.toMatch(/'next next shelf'/)
  })
  it('lays the suggest box out in two columns inside the Up next band on a wide screen (the form on the left, Most wanted on the right) and only there', () => {
    const wideBlock = () => { const start = css.indexOf('@media (min-width: 980px) {'); let depth = 0; for (let i = css.indexOf('{', start); i < css.length; i += 1) { if (css[i] === '{') depth += 1; else if (css[i] === '}') { depth -= 1; if (depth === 0) return css.slice(start, i + 1) } } return '' }
    const wide = wideBlock()
    expect(wide).toMatch(/\.bc__next \.sg \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/); expect(wide).toMatch(/\.bc__next \.sg > \* \{ grid-column: 1; \}/)
    expect(wide).toMatch(/\.bc__next \.sg > \.sg__list \{ grid-column: 2; grid-row: 1 \/ span 3;/); expect(wide).toMatch(/\.bc__next \.sg > \.sg__note \{ grid-column: 2; grid-row: 4;/)
    expect(css.replace(wide, '')).not.toMatch(/\.bc__next \.sg/) // on a phone and a small tablet it stays one column
  })
  it('lays the books flat in a pile on a phone, and has a visible focus on every book and tile', () => {
    expect(css).toMatch(/@media \(max-width: 700px\) \{[^@]*\.bc__spines \{ grid-template-columns: 1fr;/)
    expect(css).toMatch(/\.bc__book:focus-visible \{[^}]*outline:\s*3px solid/); expect(css).toMatch(/\.bc__tile:focus-visible \{[^}]*outline:\s*3px solid/)
  })
  it('puts the cards in the order the phone design has, since a phone shows them in the order they are written', () => {
    const src = read('src/bookclub/BookClubPage.jsx')
    const order = ['bc-welcome', 'bc-member', 'bc-theme', 'bc-come', 'bc-now', 'bc-next', 'bc-years', 'bc-genres', 'bc-shelf', 'bc-reviews-title'].map((id) => src.indexOf(`id="${id}"`))
    expect(order.every((n) => n > 0)).toBe(true); expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})
