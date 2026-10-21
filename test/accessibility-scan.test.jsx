// What the automatic accessibility scan (axe, on 38 kinds of page, at desktop and phone size, 21 October 2026, SFW-190) found, kept fixed:
// the logo's spoken name, a main landmark on every page, enough contrast on the grey writing, and "not open yet" items that do not fade their words.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], products: [], product: null }))
// A pretend database: empty unless a test puts posts or products in it
vi.mock('../src/supabaseClient', () => ({
  supabase: { from: (table) => { const rows = () => (table === 'posts' ? h.posts : table === 'products' ? h.products : []); const b = { select: () => b, eq: () => b, in: () => b, order: () => b, limit: () => b, contains: () => b, neq: () => b, is: () => b, single: () => Promise.resolve({ data: table === 'products' ? h.product : null, error: null }), maybeSingle: () => Promise.resolve({ data: null, error: null }), then: (res, rej) => Promise.resolve({ data: rows(), error: null }).then(res, rej) }; return b }, rpc: async () => ({ error: null }), auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
}))
vi.mock('../src/home/homeApi', () => ({ fetchNextEvent: vi.fn(async () => null), fetchFeaturedSlug: vi.fn(async () => ''), fetchLatestPost: vi.fn(async () => null), fetchLatestPosts: vi.fn(async () => []), fetchRoomPictures: vi.fn(async () => ({})), listEvents: vi.fn(async () => []) }))
vi.mock('../src/den/youtubeApi', () => ({ fetchIntroId: vi.fn(async () => ''), fetchSeries: vi.fn(async () => []) }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: false }) }))
import Logo from '../src/components/Logo'
import { itemLabel } from '../src/rooms/sceneRules'
import ChannelDirectory from '../src/pages/ChannelDirectory'
import ProductPage from '../src/pages/ProductPage'
import { channels } from '../src/data/channels'
import ChannelPage from '../src/pages/ChannelPage'
import ProductGallery from '../src/pages/ProductGallery'
import DraftingDeskHome from '../src/draftingdesk/DraftingDeskHome'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
beforeEach(() => { h.posts = []; h.products = []; h.product = null; cleanup() })
const plain = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

describe('the logo link says aloud what it shows', () => {
  it('its spoken name contains its written words, which are separate words, in the header and the footer (WCAG 2.5.3)', () => {
    for (const dark of [false, true]) {
      const { container, unmount } = render(<MemoryRouter><Logo dark={dark} /></MemoryRouter>)
      const link = container.querySelector('a.sf-logo'); expect(plain(link.textContent)).toBe('starscapes factory') // a space between the two words, not "StarscapesFactory"
      expect(plain(link.getAttribute('aria-label'))).toContain(plain(link.textContent)); expect(link.getAttribute('aria-label')).toBe('Starscapes Factory home'); unmount()
    }
  })
})

describe('every page has exactly one main landmark (it is where a screen reader jumps to)', () => {
  const home = () => render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<ChannelDirectory />} /></Routes></MemoryRouter>)
  const channel = (slug) => render(<MemoryRouter initialEntries={[`/channel/${slug}`]}><Routes><Route path="/channel/:slug" element={<ChannelPage />} /></Routes></MemoryRouter>)
  it('the home page', async () => { const { container } = home(); await screen.findAllByRole('main'); expect(container.querySelectorAll('main')).toHaveLength(1) })
  it('a channel page, and the "channel not found" version of it', async () => {
    const real = channel('drafting-desk'); expect(real.container.querySelectorAll('main')).toHaveLength(1); real.unmount()
    const missing = channel('there-is-no-such-channel'); expect(await screen.findByText('Channel not found.')).toBeInTheDocument(); expect(missing.container.querySelectorAll('main')).toHaveLength(1)
  })
  it('the old shop page', async () => {
    const { container } = render(<MemoryRouter initialEntries={['/products']}><Routes><Route path="/products" element={<ProductGallery />} /></Routes></MemoryRouter>)
    expect(container.querySelectorAll('main')).toHaveLength(1); expect(container.querySelector('main')).toHaveTextContent('Loading products') // even while it loads
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument(); expect(container.querySelectorAll('main')).toHaveLength(1); expect(container.querySelector('main h1')).toBeTruthy()
  })
  it('the page layout around them does not add a second one (so no page can have two)', () => {
    const app = read('src/App.jsx'); expect(app).not.toMatch(/<main[\s>]/); expect(app).toMatch(/id="main-content"/)
  })
})

const POSTS = [1, 2, 3].map((n) => ({ id: `p${n}`, title: `Sample post ${n}`, content: 'Some words.', image_url: null, tags: ['build-diary'], channel: 'factory-floor', created_at: `2026-10-1${n}T10:00:00Z`, author_id: 'o', pass: null }))
const levels = (container) => [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((el) => Number(el.tagName[1]))
const goesDownOneAtATime = (list) => list.every((l, i) => i === 0 || l <= list[i - 1] + 1)

describe('headings go down one level at a time, so people who move through a page by its headings are never lost', () => {
  it('every kind of channel page: the page title, then each post title one level below it (the post cards were a level too deep)', async () => {
    const layouts = new Set(channels.map((c) => c.layout)); expect([...layouts].sort()).toEqual(['featured', 'gallery', 'post-feed'])
    for (const layout of layouts) {
      const channel = channels.find((c) => c.layout === layout); h.posts = POSTS
      const { container, unmount } = render(<MemoryRouter initialEntries={[`/channel/${channel.slug}`]}><Routes><Route path="/channel/:slug" element={<ChannelPage />} /></Routes></MemoryRouter>)
      await screen.findByText('Sample post 1'); const list = levels(container)
      expect(list[0], layout).toBe(1); expect(goesDownOneAtATime(list), `${layout}: ${list}`).toBe(true); expect(list.filter((l) => l === 2).length, layout).toBeGreaterThanOrEqual(3); unmount()
    }
  })
  it('the old shop page and a single product', async () => {
    h.products = [{ id: 'a', title: 'Moon Garden print', price: 35, images: [], collection: 'Nature', description: 'Calm.' }, { id: 'b', title: 'Harbour Lights print', price: 42, images: [], collection: 'Places', description: 'Evening.' }]
    const shop = render(<MemoryRouter initialEntries={['/products']}><Routes><Route path="/products" element={<ProductGallery />} /></Routes></MemoryRouter>)
    await screen.findByText('Moon Garden print'); const list = levels(shop.container); expect(list[0]).toBe(1); expect(goesDownOneAtATime(list), String(list)).toBe(true); expect(list.filter((l) => l === 2)).toHaveLength(2); shop.unmount()
    h.product = h.products[0]
    const one = render(<MemoryRouter initialEntries={['/products/a']}><Routes><Route path="/products/:id" element={<ProductPage />} /></Routes></MemoryRouter>)
    await screen.findAllByText('Moon Garden print'); expect(goesDownOneAtATime(levels(one.container)), String(levels(one.container))).toBe(true)
  })
})

describe('a single product page: one main landmark, with its banner inside it (not a second site banner), in every state', () => {
  const show = () => render(<MemoryRouter initialEntries={['/products/a']}><Routes><Route path="/products/:id" element={<ProductPage />} /></Routes></MemoryRouter>)
  it('while loading, when the product is not found, and when it is shown', async () => {
    const loading = show(); expect(loading.container.querySelectorAll('main')).toHaveLength(1); loading.unmount()
    const missing = show(); expect(await screen.findByText('Product not found.')).toBeInTheDocument(); expect(missing.container.querySelectorAll('main')).toHaveLength(1); missing.unmount()
    h.product = { id: 'a', title: 'Moon Garden print', price: 35, images: [], collection: 'Nature', description: 'Calm.' }
    const shown = show(); await screen.findAllByText('Moon Garden print'); expect(shown.container.querySelectorAll('main')).toHaveLength(1)
    expect(shown.container.querySelectorAll('header')).toHaveLength(1); expect(shown.container.querySelector('main header')).toBeTruthy() // inside main, so it is not read as the site's banner
  })
})

describe('grey writing is dark enough to read', () => {
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
  it('the muted style (used for "No posts yet" and taglines) has at least 4.5:1 contrast on the page tint and on white', () => {
    const rule = read('src/index.css').match(/\n\.muted \{[^}]*\}/)[0]; const short = rule.match(/color:\s*(#[0-9a-fA-F]{3,6})\b/)[1]; const colour = short.length === 4 ? `#${[...short.slice(1)].map((d) => d + d).join('')}` : short
    expect(ratio(colour, '#f6f8fc'), `${colour} on the page tint`).toBeGreaterThanOrEqual(4.5); expect(ratio(colour, '#ffffff'), `${colour} on white`).toBeGreaterThanOrEqual(4.5)
  })
  it('the small blue label on Archive Entries ("Author\'s Notebook") has at least 4.5:1 contrast on its pale blue chip', () => {
    const rule = read('src/entries/entries.css').match(/\n\.en__label \{[^}]*\}/)[0]; const colour = rule.match(/color:\s*(#[0-9a-fA-F]{6})/)[1]
    expect(ratio(colour, '#dce6ff'), `${colour} on the chip`).toBeGreaterThanOrEqual(4.5)
  })
  it('items that are not open yet fade their picture and soften their box, but never their words: no opacity on the item itself, in the Art Loft list or the room lists', () => {
    for (const [file, selector] of [['src/artloft/artloft.css', '.al-list .is-soon'], ['src/rooms/roomscene.css', '.rs-list .is-locked']]) {
      const css = read(file); const own = [...css.matchAll(new RegExp(`\\n${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`, 'g'))].map((m) => m[1]).join('\n')
      expect(own.length, `${selector} has a rule`).toBeGreaterThan(0); expect(own, `${selector} must not fade the whole item`).not.toMatch(/opacity/); expect(own).toMatch(/border-style:\s*dashed/)
      expect(css, `${selector} fades only its picture`).toMatch(new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')} (\\.al-list__thumb|img) \\{[^}]*opacity: 0\\.6`))
    }
  })
})

describe('the Drafting Desk: what each paper says aloud contains the words written on it, in order (people who use voice control and a screen reader together; WCAG 2.5.3, "label in name")', () => {
  it('for every paper with writing on it, including the one with a note about access', () => {
    const { container } = render(<MemoryRouter initialEntries={['/drafting-desk']}><DraftingDeskHome /></MemoryRouter>)
    const written = [...container.querySelectorAll('.rs-stage .rs-item')].filter((el) => el.querySelector('.rs-label'))
    expect(written.length, 'there are papers with writing on them to check (so this cannot pass by checking nothing)').toBeGreaterThanOrEqual(5)
    expect(written.some((el) => el.querySelector('.rs-tip')), 'one of them carries a note about access, the case that failed').toBe(true)
    written.forEach((el) => {
      expect(plain(el.getAttribute('aria-label')), el.textContent).toContain(plain(el.textContent))
      const label = el.querySelector('.rs-label'); expect(label.textContent, 'the name and the description are separate words').toBe(`${label.querySelector('strong').textContent} ${label.querySelector('small').textContent}`)
    })
  })
})

describe('the spoken label of a room object follows its written order', () => {
  it('name, description, then the note about access, then what the writing cannot say (locked, opens in a new tab)', () => {
    expect(itemLabel({ kind: 'page', name: 'Archive Entries', blurb: 'The ongoing story, entry by entry.' })).toBe('Archive Entries. The ongoing story, entry by entry.')
    expect(itemLabel({ kind: 'page', name: "Author's Notebook", blurb: 'Behind the scenes.', lock: 'paid' })).toBe("Author's Notebook. Behind the scenes. Paid members only")
    expect(itemLabel({ kind: 'locked', name: 'Book Club', blurb: 'Reviews.', lock: 'opening soon' })).toBe('Book Club. Reviews. Opening soon (locked)')
    expect(itemLabel({ kind: 'external', name: 'YouTube', blurb: 'Watch.' })).toBe('YouTube. Watch. (opens in a new tab)')
    expect(itemLabel({ kind: 'locked', name: 'Odd', blurb: 'One.', lock: 'something-new' })).toBe('Odd. One. Not open yet (locked)')
  })
})
