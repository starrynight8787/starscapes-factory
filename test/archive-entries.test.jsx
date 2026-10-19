// Archive Entries (the Drafting Desk) on the entry template, with the Author's Notebook box, and how it is wired in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], fail: false }))
vi.mock('../src/supabaseClient', () => ({ supabase: {} }))
vi.mock('../src/draftingdesk/draftingApi', () => ({ fetchDeskPosts: vi.fn(async () => { if (h.fail) throw new Error('x'); return h.posts }) }))
import ArchiveEntriesPage from '../src/entries/ArchiveEntriesPage'
import NotebookTeaser from '../src/entries/NotebookTeaser'
import DraftingDeskRoutes from '../src/draftingdesk/DraftingDeskRoutes'
import { AREAS } from '../src/draftingdesk/draftingData'
import { MEMBERSHIP } from '../src/data/membership'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
let n = 0
const entry = (title, day, tags = ['archive-entries']) => ({ id: `a${++n}`, title, created_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, tags, channel: 'drafting-desk', published: true, image_url: null })
const page = () => render(<MemoryRouter initialEntries={['/drafting-desk/archive-entries']}><ArchiveEntriesPage /></MemoryRouter>)
beforeEach(() => { n = 0; Object.assign(h, { posts: [], fail: false }) })

describe('Archive Entries on the template', () => {
  it('has the Drafting Desk\u2019s own title and line, and a way back to the desk', async () => {
    h.posts = [entry('One', 1), entry('Two', 2)]; page()
    expect(screen.getByRole('heading', { level: 1, name: AREAS['archive-entries'].name })).toBeInTheDocument(); expect(screen.getByText('The ongoing story, entry by entry.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to the Drafting Desk/ })).toHaveAttribute('href', '/drafting-desk')
    await screen.findByRole('heading', { level: 2, name: 'Two' })
  })
  it('shows the latest entry, the pinned (oldest) entry as the beginning, and the rest in a grid, as on the template', async () => {
    h.posts = [entry('One', 1), entry('Two', 2), entry('Three', 3), entry('Four', 4)]; page()
    const latest = (await screen.findByRole('heading', { level: 2, name: 'Four' })).closest('section')
    expect(within(latest).getByText('Latest entry')).toBeInTheDocument()
    const pinned = screen.getByRole('heading', { level: 2, name: 'One' }).closest('section')
    expect(within(pinned).getByRole('link', { name: 'Start from the beginning' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'More entries' })).getAllByRole('link')).toHaveLength(2)
  })
  it('uses only the Drafting Desk\u2019s Archive Entries: not Notebook posts, and not posts with no area', async () => {
    h.posts = [entry('Mine', 4), entry('Notebook note', 9, ['authors-notebook']), entry('Untagged', 8, [])]; page()
    await screen.findByRole('heading', { level: 2, name: 'Mine' })
    expect(screen.queryByText('Notebook note')).toBeNull(); expect(screen.queryByText('Untagged')).toBeNull()
  })
  it('accepts the archive-entry tag too, as the Drafting Desk always has', async () => {
    h.posts = [entry('Old tag', 3, ['archive-entry'])]; page()
    expect(await screen.findByRole('heading', { level: 2, name: 'Old tag' })).toBeInTheDocument()
  })
  it('says so when there are no entries yet, and when they cannot load', async () => {
    h.posts = []; const first = page()
    expect(await screen.findByText('The first entry is on its way.')).toBeInTheDocument(); first.unmount()
    h.fail = true; page()
    expect(await screen.findByRole('alert')).toHaveTextContent('The entries could not load just now. Please try again in a moment.')
  })
})

describe('the Author\u2019s Notebook box', () => {
  it('sits under the pinned entry, in the right-hand column', async () => {
    h.posts = [entry('One', 1), entry('Two', 2), entry('Three', 3)]; const { container } = page()
    await screen.findByRole('heading', { level: 2, name: 'Three' })
    expect(container.querySelector('.en__right .en__pinned')).toBeTruthy()
    expect(container.querySelector('.en__right .en__o4 .en__notebook')).toBeTruthy()
  })
  it('says what the Notebook is, for members only, and that it is part of the membership', () => {
    render(<MemoryRouter><NotebookTeaser /></MemoryRouter>)
    const box = screen.getByRole('region', { name: 'Behind the scenes' })
    expect(within(box).getByText('Members only')).toBeInTheDocument(); expect(within(box).getByRole('heading', { level: 2, name: 'Behind the scenes' })).toBeInTheDocument()
    expect(within(box).getByText(/Early drafts, notes and the thinking behind the stories/)).toBeInTheDocument()
    expect(within(box).getByText(`Part of ${MEMBERSHIP.name}.`)).toBeInTheDocument()
  })
  it('has a button that cannot be pressed while memberships are not open, and shows no notebook entries or placeholder words', () => {
    const { container } = render(<MemoryRouter><NotebookTeaser /></MemoryRouter>)
    expect(MEMBERSHIP.open).toBe(false)
    expect(screen.getByRole('button', { name: 'Coming soon' })).toBeDisabled()
    expect(screen.queryByRole('link')).toBeNull(); expect(container.textContent).not.toMatch(/\[|Notebook title|Log in/)
  })
  it('becomes a link to the Notebook page once memberships are open', async () => {
    vi.resetModules()
    vi.doMock('../src/data/membership', () => ({ MEMBERSHIP: { open: true, name: 'Into the Nebula', buttonWhileClosed: 'Coming soon' } }))
    const { default: Open } = await import('../src/entries/NotebookTeaser')
    render(<MemoryRouter><Open /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Find out more' })).toHaveAttribute('href', '/drafting-desk/authors-notebook'); expect(screen.queryByRole('button')).toBeNull()
    vi.doUnmock('../src/data/membership'); vi.resetModules()
  })
})

describe('how it is wired in', () => {
  it('is the page at /drafting-desk/archive-entries, and the Notebook page is still its own page', async () => {
    h.posts = [entry('One', 1), entry('Two', 2)]
    const at = (path) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/drafting-desk/*" element={<DraftingDeskRoutes />} /></Routes></MemoryRouter>)
    const first = at('/drafting-desk/archive-entries')
    expect(await screen.findByRole('heading', { level: 2, name: 'Two' })).toBeInTheDocument(); expect(first.container.querySelector('.en__notebook')).toBeTruthy(); first.unmount()
    at('/drafting-desk/authors-notebook')
    expect(screen.getByRole('heading', { level: 2, name: 'Paid members only' })).toBeInTheDocument()
  })
  it('takes its title, line and tag rule from the Drafting Desk\u2019s own data, not from copies', () => {
    const src = read('src/entries/ArchiveEntriesPage.jsx')
    expect(src).toMatch(/AREAS\['archive-entries'\]/); expect(src).toMatch(/areaOf\(post\) === 'archive-entries'/); expect(src).not.toMatch(/ongoing story/)
  })
  it('keeps no text under 14px in the new styles, and no inline styles', () => {
    for (const m of read('src/entries/entries.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    for (const f of ['src/entries/NotebookTeaser.jsx', 'src/entries/ArchiveEntriesPage.jsx']) expect(read(f), f).not.toMatch(/style=\{\{/)
  })
})
