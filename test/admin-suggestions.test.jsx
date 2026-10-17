// The owner's Suggestions tool.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ owner: true, checking: false, on: {}, rows: [], tally: {}, calls: [], fail: false }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: h.checking, owner: h.owner }) }))
vi.mock('../src/suggest/suggestApi', () => ({
  fetchSpaces: vi.fn(async () => h.on),
  fetchAllForOwner: vi.fn(async () => { if (h.fail) throw new Error('That did not go through just now. Please try again in a moment.'); return { rows: h.rows, tally: h.tally } }),
  setSpaceOn: vi.fn(async (space, on) => { h.calls.push(['switch', space, on]); h.on = { ...h.on, [space]: on } }),
  setStatus: vi.fn(async (id, status) => { h.calls.push(['status', id, status]); h.rows = h.rows.map((r) => (r.id === id ? { ...r, status } : r)) }),
  removeSuggestion: vi.fn(async (id) => { h.calls.push(['delete', id]); h.rows = h.rows.filter((r) => r.id !== id) }),
}))
import AdminSuggestions from '../src/admin/AdminSuggestions'

const go = () => render(<MemoryRouter><AdminSuggestions session={{ access_token: 't' }} /></MemoryRouter>)
const r = (id, space, title, status, extra = {}) => ({ id, space, kind: 'show', title, why: 'because', status, created_at: '2026-10-05T10:00:00Z', ...extra })
beforeEach(() => { Object.assign(h, { owner: true, checking: false, on: { 'story-ledger': false, 'book-club': false }, rows: [], tally: {}, calls: [], fail: false }); vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('who can see it', () => {
  it('tells anyone who is not the owner that it is for the owner, and shows nothing of the suggestions', () => {
    h.owner = false; h.rows = [r('a', 'story-ledger', 'Secret title', 'pending')]
    const { container } = go()
    expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Secret title/)
  })
})

describe('the switches', () => {
  it('shows each box as on or off, in words, and switches one when asked', async () => {
    h.on = { 'story-ledger': true, 'book-club': false }
    go()
    const sw = await screen.findAllByRole('switch')
    expect(sw[0]).toBeChecked(); expect(sw[1]).not.toBeChecked()
    expect(screen.getByText('On: visitors can see it')).toBeInTheDocument()
    expect(screen.getByText('Off: hidden from visitors')).toBeInTheDocument()
    fireEvent.click(sw[1])
    await waitFor(() => expect(h.calls).toEqual([['switch', 'book-club', true]]))
    await waitFor(() => expect(screen.getAllByRole('switch')[1]).toBeChecked())
  })
})

describe('what has been suggested', () => {
  beforeEach(() => {
    h.rows = [r('p', 'story-ledger', 'Waiting one', 'pending'), r('a', 'story-ledger', 'Shown one', 'approved'), r('c', 'story-ledger', 'Chosen one', 'chosen'), r('x', 'story-ledger', 'Hidden one', 'hidden'), r('b', 'book-club', 'A book', 'pending', { kind: 'book' })]
    h.tally = { a: 12, c: 1 }
  })
  it('sorts them into waiting, showing and hidden, for each box, with counts', async () => {
    go()
    await screen.findByText('Waiting one')
    const ledger = screen.getByRole('region', { name: /Story Ledger/ })
    expect(within(ledger).getByRole('heading', { name: /Waiting for you \(1\)/ })).toBeInTheDocument()
    expect(within(ledger).getByRole('heading', { name: /Showing on the page \(2\)/ })).toBeInTheDocument()
    expect(within(ledger).getByRole('heading', { name: /Hidden \(1\)/ })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /Book Club/ })).getByText('A book')).toBeInTheDocument()
    expect(screen.getByText(/12 votes/)).toBeInTheDocument()
    expect(screen.getByText(/1 vote\b/)).toBeInTheDocument()
  })
  it('never shows who wrote a suggestion, only that it is a signed-in reader', async () => {
    go()
    await screen.findByText('Waiting one')
    expect(screen.getAllByText(/from a signed-in reader/).length).toBe(5)
  })
  it('approves a waiting suggestion', async () => {
    go()
    const item = (await screen.findByText('Waiting one')).closest('li')
    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(h.calls).toEqual([['status', 'p', 'approved']]))
  })
  it('chooses one, and un-chooses it', async () => {
    go()
    fireEvent.click(within((await screen.findByText('Shown one')).closest('li')).getByRole('button', { name: 'Mark as chosen' }))
    await waitFor(() => expect(h.calls).toContainEqual(['status', 'a', 'chosen']))
    fireEvent.click(within((await screen.findAllByText('Chosen one'))[0].closest('li')).getByRole('button', { name: 'Not chosen' }))
    await waitFor(() => expect(h.calls).toContainEqual(['status', 'c', 'approved']))
  })
  it('hides one and shows a hidden one again', async () => {
    go()
    fireEvent.click(within((await screen.findByText('Shown one')).closest('li')).getByRole('button', { name: 'Hide' }))
    await waitFor(() => expect(h.calls).toContainEqual(['status', 'a', 'hidden']))
    fireEvent.click(within((await screen.findByText('Hidden one')).closest('li')).getByRole('button', { name: 'Show again' }))
    await waitFor(() => expect(h.calls).toContainEqual(['status', 'x', 'approved']))
  })
  it('deletes only after being asked to confirm, and not if you say no', async () => {
    window.confirm.mockReturnValueOnce(false)
    go()
    const item = (await screen.findByText('Waiting one')).closest('li')
    fireEvent.click(within(item).getByRole('button', { name: 'Delete' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(h.calls).toEqual([])
    fireEvent.click(within(item).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(h.calls).toEqual([['delete', 'p']]))
  })
  it('says plainly when it cannot load', async () => {
    h.fail = true
    go()
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not go through/)
  })
})
