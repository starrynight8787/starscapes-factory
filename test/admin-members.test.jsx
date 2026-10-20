// The owner's "Passes and members" page (/admin/members): who may see it, what it shows, the filters, the Stripe links, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ owner: true, fail: null, asked: 0, result: null, hold: false }))
vi.mock('../src/admin/membersAdminApi', () => ({
  fetchMembers: vi.fn(async () => {
    h.asked += 1
    if (h.hold) await new Promise(() => {})
    if (h.fail) throw new Error(h.fail)
    return h.result
  }),
}))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import AdminMembers from '../src/admin/AdminMembers'
import { ADMIN_TOOLS } from '../src/admin/adminTools'
import { PAGES } from '../src/data/pageMeta'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const mem = (ref, over = {}) => ({ ref, email: `${ref}@example.com`, status: 'active', view: 'active', passes: ['blueprints'], interval: 'month', periodEnd: '2026-11-20T20:16:55Z', cancelling: false, offerEndsAt: '2027-10-20T20:16:55Z', offerNote: null, since: '2026-10-20T20:16:55Z', updated: null, customer: `cus_${ref}`, ...over })
const SIX = [
  mem('gill', { email: 'gillian@gillianbennet.com', passes: ['come-write-with-me'] }),
  mem('alexandra', { email: 'alexandra@example.com', passes: ['authors-notebook', 'early-drafts', 'blueprints', 'book-club'], interval: 'year', offerEndsAt: '2027-08-02T09:00:00Z', periodEnd: '2027-08-02T09:00:00Z' }),
  mem('sam', { view: 'cancelling', cancelling: true, passes: ['blueprints', 'book-club'] }),
  mem('priya', { status: 'past_due', view: 'trouble', passes: ['authors-notebook'], offerEndsAt: null, offerNote: 'Promo code FRIEND20: 20% off' }),
  mem('dee', { email: '', status: 'canceled', view: 'ended', passes: ['early-drafts', 'blueprints', 'book-club'], customer: '' }),
  mem('maybe', { status: 'incomplete', view: 'free', passes: ['blueprints'], periodEnd: null }),
]
const page = () => render(<MemoryRouter><AdminMembers session={{ user: { id: 'gill' } }} /></MemoryRouter>)
const rowOf = (text) => screen.getByText(text).closest('li')
beforeEach(() => { Object.assign(h, { owner: true, fail: null, asked: 0, hold: false, result: { members: SIX, mode: 'test', emailsOk: true } }) })

describe('who may see it', () => {
  it('is for the owner only, and asks for nothing otherwise', () => {
    h.owner = false; page()
    expect(screen.getByRole('heading', { level: 1, name: 'Passes and members' })).toBeInTheDocument(); expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument()
    expect(h.asked).toBe(0); expect(screen.queryByText(/@example.com/)).toBeNull()
  })
  it('says Loading while it waits, and shows no members yet', () => {
    h.hold = true; page(); expect(screen.getByText('Loading…')).toBeInTheDocument(); expect(screen.queryByRole('status')).toBeNull()
  })
  it('says plainly when the members cannot load, and shows no counts or list', async () => {
    h.fail = 'The members could not load just now. Please try again in a moment.'; page()
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load just now'); expect(screen.queryByRole('status')).toBeNull(); expect(screen.queryByText('Showing', { exact: false })).toBeNull()
  })
})

describe('what the passes cost', () => {
  it('shows the price for 1, 2, 3 and everything, a month and a year, with and without the launch offer, before anything has loaded', () => {
    h.hold = true; page()
    const table = screen.getByRole('table', { name: 'Price for each number of passes' })
    const rows = within(table).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell', { hidden: true }).length ? [within(r).getByRole('rowheader').textContent, ...within(r).getAllByRole('cell').map((c) => c.textContent)] : [])
    expect(rows).toEqual([['1 pass', '£5', '£50', '£2.50', '£25'], ['2 passes', '£7', '£70', '£3.50', '£35'], ['3 passes', '£10', '£100', '£5', '£50'], ['Everything', '£12', '£120', '£6', '£60']])
  })
  it('names all five passes, and the launch offer', () => {
    h.hold = true; page()
    const text = screen.getByRole('heading', { name: 'What the passes cost' }).closest('section').textContent
    for (const name of ["The Author's Notebook", 'Early drafts and book background', 'Come Write With Me', 'Blueprints', 'Book Club', 'Launch offer: half price for your first year']) expect(text, name).toContain(name)
  })
})

describe('who holds each pass', () => {
  it('counts the people, by what they are', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    const stats = screen.getByRole('heading', { name: 'Who holds each pass' }).closest('section')
    const pair = (label) => within(stats).getByText(label).nextElementSibling.textContent
    expect([pair('People holding passes now'), pair('Active'), pair('Cancelling'), pair('Payment trouble'), pair('Ended'), pair('Never started')]).toEqual(['4', '2', '1', '1', '1', '1'])
  })
  it('counts each pass: only people holding it now, and how many of them are cancelling', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    const table = screen.getByRole('table', { name: 'People holding each pass now' })
    const rows = within(table).getAllByRole('row').slice(1).map((r) => [within(r).getByRole('rowheader').textContent, ...within(r).getAllByRole('cell').map((c) => c.textContent)])
    expect(rows).toEqual([["The Author's Notebook", '2', '0'], ['Early drafts and book background', '1', '0'], ['Come Write With Me', '1', '0'], ['Blueprints', '2', '1'], ['Book Club', '2', '1']])
  })
  it('counts nobody when nobody has joined, and says so', async () => {
    h.result = { members: [], mode: 'test', emailsOk: true }; page()
    expect(await screen.findByText('Nobody has bought passes yet.')).toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 0 members')
  })
})

describe('the list of members', () => {
  it('shows each one: email, status in words, passes, what they pay, and what happens next', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    const gill = rowOf('gillian@gillianbennet.com')
    for (const t of ['Active', 'Member since 20 October 2026', '1 pass: Come Write With Me', '£2.50 a month (launch offer until 20 October 2027, then £5 a month)', 'Next payment on 20 November 2026']) expect(within(gill).getByText(t), t).toBeInTheDocument()
    const sam = rowOf('sam@example.com')
    expect(within(sam).getByText('Cancelling')).toBeInTheDocument(); expect(within(sam).getByText('Passes open until 20 November 2026, then they stop (not renewing)')).toBeInTheDocument()
    const priya = rowOf('priya@example.com')
    expect(within(priya).getByText('Payment trouble, passes still open')).toBeInTheDocument(); expect(within(priya).getByText('£5 a month (Promo code FRIEND20: 20% off)')).toBeInTheDocument()
    expect(within(rowOf('alexandra@example.com')).getByText('£60 a year (launch offer until 2 August 2027, then £120 a year)')).toBeInTheDocument()
  })
  it('shows a price for nobody who never paid, and says why', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    const maybe = rowOf('maybe@example.com')
    expect(within(maybe).getByText('Never started')).toBeInTheDocument(); expect(within(maybe).getByText('The payment never finished, so no passes were opened')).toBeInTheDocument(); expect(within(maybe).queryByText(/£/)).toBeNull()
  })
  it('says so, with a short reference, when there is no email address, and never shows more of an account id', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    expect(screen.getByText('No email found (account dee)')).toBeInTheDocument()
  })
  it('says the addresses are missing, in an alert, when the sign-in system could not be asked', async () => {
    h.result = { members: SIX, mode: 'test', emailsOk: false }; page()
    expect(await screen.findByRole('alert')).toHaveTextContent('email addresses could not be read just now')
  })
  it('says only the owner can see it, and that the addresses are not stored anywhere new', async () => {
    page(); await screen.findByText('Showing 6 of 6 members'); expect(screen.getByText(/Only you can see this page/)).toHaveTextContent('not stored anywhere new')
  })
})

describe('the filters', () => {
  it('narrows by pass, and says how many it is showing out of all', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    await userEvent.selectOptions(screen.getByLabelText('Pass'), 'blueprints')
    expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 6 members'); expect(screen.queryByText('gillian@gillianbennet.com')).toBeNull()
  })
  it('narrows by status, and lists every status, starting with everyone', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    const status = screen.getByLabelText('Status')
    expect([...status.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Everyone', 'Holding passes now', 'Active', 'Cancelling (open until the period ends)', 'Payment trouble', 'Ended', 'Never started'])
    await userEvent.selectOptions(status, 'cancelling'); expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 6 members'); expect(screen.getByText('sam@example.com')).toBeInTheDocument()
    await userEvent.selectOptions(status, 'holding'); expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 6 members')
  })
  it('searches the emails, ignoring capitals, and says so when nobody matches', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    await userEvent.type(screen.getByLabelText('Search the emails'), 'ALEX'); expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 6 members')
    await userEvent.clear(screen.getByLabelText('Search the emails')); await userEvent.type(screen.getByLabelText('Search the emails'), 'nobody-here')
    expect(screen.getByText('No members match.')).toBeInTheDocument()
  })
  it('gives each choice a visible label', () => {
    h.hold = true; page(); for (const l of ['Pass', 'Status', 'Search the emails']) expect(screen.getByLabelText(l)).toBeInTheDocument()
  })
})

describe('the Stripe links', () => {
  it('opens each member in Stripe in a new tab, safely, in test mode while the site is in test mode', async () => {
    page(); await screen.findByText('Showing 6 of 6 members')
    const link = screen.getByRole('link', { name: 'Open gillian@gillianbennet.com in Stripe (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://dashboard.stripe.com/test/customers/cus_gill'); expect(link).toHaveAttribute('target', '_blank'); expect(link.getAttribute('rel')).toMatch(/noopener/); expect(link.getAttribute('rel')).toMatch(/noreferrer/)
  })
  it('opens real customers in live mode', async () => {
    h.result = { members: SIX, mode: 'live', emailsOk: true }; page(); await screen.findByText('Showing 6 of 6 members')
    expect(screen.getByRole('link', { name: /Open sam@example.com in Stripe/ })).toHaveAttribute('href', 'https://dashboard.stripe.com/customers/cus_sam')
  })
  it('has no link for a member with no Stripe customer', async () => {
    page(); await screen.findByText('Showing 6 of 6 members'); expect(within(rowOf('No email found (account dee)')).queryByRole('link')).toBeNull()
  })
  it('says which mode Stripe is in, in a note, and says nothing if it does not know', async () => {
    page(); expect(await screen.findByRole('note')).toHaveTextContent('Stripe is in test mode.')
  })
  it('says live mode in live mode', async () => {
    h.result = { members: SIX, mode: 'live', emailsOk: true }; page(); expect(await screen.findByRole('note')).toHaveTextContent('Stripe is in live mode.')
  })
  it('shows no mode note when the mode is not known', async () => {
    h.result = { members: SIX, mode: 'unknown', emailsOk: true }; page(); await screen.findByText('Showing 6 of 6 members'); expect(screen.queryByRole('note')).toBeNull()
  })
})

describe('how it is wired in', () => {
  it('has a route in the app for the owner only, a tile in the Admin tools that links to it, and a page title kept out of search', () => {
    const app = read('src/App.jsx'); expect(app).toMatch(/path="\/admin\/members" element=\{ <ProtectedRoute session=\{session\}> <AdminMembers session=\{session\} \/> <\/ProtectedRoute> \}/)
    const tile = ADMIN_TOOLS.find((t) => t.name === 'Passes and members'); expect(tile).toMatchObject({ to: '/admin/members', group: 'Members' }); expect(tile.blurb).toMatch(/five passes/)
    expect(PAGES['/admin/members']).toMatchObject({ title: 'Passes and members', index: false })
  })
  it('uses the admin banner, with the Factory Floor sky (where the passes live)', () => {
    expect(read('src/admin/AdminMembers.jsx')).toMatch(/<AdminBanner [^>]*chip="Passes and members"[^>]*room="factory-floor"/)
  })
})

describe('the look: accessible and standing on its own', () => {
  const css = read('src/admin/adminmembers.css'); const jsx = read('src/admin/AdminMembers.jsx')
  const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  it('uses no inline styles and sets no text under 14px', () => {
    expect(jsx).not.toMatch(/style=\{/)
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('shows a ring when a field is tabbed to, and gives every field a class of its own', () => {
    expect(css).toMatch(/\.am__control:focus-visible\s*\{[^}]*outline:\s*3px/); expect((jsx.match(/<select/g) || []).length + (jsx.match(/<input/g) || []).length).toBe((jsx.match(/className="am__control"/g) || []).length)
  })
  it('keeps each status tag readable (4.5 to 1)', () => {
    const pairs = { chip: ['#14306a', '#ffffff'], cancelling: ['#ffe27a', '#0e1530'], trouble: ['#8f1d1d', '#ffffff'], ended: ['#4a5170', '#ffffff'] }
    for (const [name, [bg, fg]] of Object.entries(pairs)) expect(ratio(bg, fg), name).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(/\.am__chip \{[^}]*background: var\(--sf-navy-700, #14306a\); color: #fff/); expect(css).toMatch(/\.am__chip--cancelling \{ background: #ffe27a; color: #0e1530/); expect(css).toMatch(/\.am__chip--trouble \{ background: #8f1d1d; color: #fff/); expect(css).toMatch(/\.am__chip--ended, \.am__chip--free \{ background: #4a5170; color: #fff/)
  })
  it('lets a wide table scroll inside its own box, so the page never scrolls sideways, and lets the filters shrink on a phone', () => {
    expect(css).toMatch(/\.am__scroll \{ overflow-x: auto/); expect(css).toMatch(/\.am__control \{[^}]*min-width: 0/); expect(css).toMatch(/\.am__field \{[^}]*min-width: 0/)
  })
  it('gives each table a caption and column and row headings, so a screen reader can read it', () => {
    expect((jsx.match(/<table/g) || []).length).toBe(2); expect((jsx.match(/<caption>/g) || []).length).toBe(2); expect(jsx).toMatch(/scope="col"/); expect(jsx).toMatch(/scope="row"/)
  })
})
