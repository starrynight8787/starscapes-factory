// The suggest and vote box, in every state of the Figma design.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ on: true, user: null, owner: false, rows: [], tally: {}, mine: new Set(), calls: [], failAdd: false, failList: false }))
vi.mock('../src/suggest/suggestApi', () => ({
  fetchSpaceOn: vi.fn(async () => h.on),
  fetchSuggestions: vi.fn(async () => { if (h.failList) throw new Error('The list could not load just now. Please try again in a moment.'); return { rows: h.rows, tally: h.tally, mine: h.mine } }),
  addSuggestion: vi.fn(async (_u, value) => { if (h.failAdd) throw new Error('That did not go through. You can suggest up to 3 a day, and only while the box is open.'); h.calls.push(['add', value]) }),
  setVote: vi.fn(async (_u, id, on) => { h.calls.push(['vote', id, on]) }),
}))
vi.mock('../src/suggest/useUser', () => ({ default: () => ({ loading: false, user: h.user }) }))
vi.mock('../src/doors/useCurrentOwner', () => ({ default: () => ({ checking: false, owner: h.owner }) }))
import SuggestPanel from '../src/suggest/SuggestPanel'

const show = (space = 'story-ledger') => render(<MemoryRouter><SuggestPanel space={space} /></MemoryRouter>)
const row = (id, title, status = 'approved', extra = {}) => ({ id, title, status, kind: 'show', why: null, created_at: `2026-10-0${id.length}`, ...extra })
beforeEach(() => { Object.assign(h, { on: true, user: null, owner: false, rows: [], tally: {}, mine: new Set(), calls: [], failAdd: false, failList: false }) })

describe('when the box is switched off', () => {
  it('shows visitors nothing at all', async () => {
    h.on = false
    const { container } = show()
    await waitFor(() => expect(container.innerHTML).toBe(''))
  })
  it('tells the owner it is off, and where to switch it on', async () => {
    h.on = false; h.owner = true
    show()
    expect(await screen.findByRole('note')).toHaveTextContent(/switched off/)
    expect(screen.getByRole('link', { name: /Switch it on in Admin/ })).toHaveAttribute('href', '/admin/suggestions')
  })
})

describe('signed out', () => {
  it('can read the list but not vote or suggest: a log in prompt replaces the form, and the vote buttons are off', async () => {
    h.rows = [row('a', 'Knight Rider')]; h.tally = { a: 41 }
    show()
    expect(await screen.findByText('Knight Rider')).toBeInTheDocument()
    expect(screen.getByText('Log in to suggest or vote.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
    expect(screen.queryByRole('button', { name: 'Suggest it' })).toBeNull()
    expect(screen.getByRole('button', { name: /Vote for Knight Rider/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /41 votes/ })).toBeInTheDocument()
  })
})

describe('signed in', () => {
  beforeEach(() => { h.user = { id: 'u1' } })
  it('shows the form with the choice of a show or a stat, and the same words as the design', async () => {
    show()
    expect(await screen.findByRole('heading', { name: 'What should I audit next?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'A show to audit' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'A stat to track' })).not.toBeChecked()
    expect(screen.getByLabelText('What should I audit?')).toBeInTheDocument()
    expect(screen.getByLabelText('Why? (optional)')).toBeInTheDocument()
    expect(screen.getByText('No suggestions yet. Be the first.')).toBeInTheDocument()
  })
  it('changes the question when the kind changes', async () => {
    show()
    await screen.findByLabelText('What should I audit?')
    fireEvent.click(screen.getByRole('radio', { name: 'A stat to track' }))
    expect(screen.getByLabelText('What should I count?')).toBeInTheDocument()
  })
  it('asks the book box for a book, with no choice of kind', async () => {
    show('book-club')
    expect(await screen.findByRole('heading', { name: 'What should we read next?' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByLabelText('Which book?')).toBeInTheDocument()
  })
  it('sends a good suggestion, says thanks, and clears the form', async () => {
    show()
    fireEvent.change(await screen.findByLabelText('What should I audit?'), { target: { value: '  Knight Rider ' } })
    fireEvent.change(screen.getByLabelText('Why? (optional)'), { target: { value: 'A talking car' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suggest it' }))
    expect(await screen.findByText('Thanks! I will read it before it shows.')).toBeInTheDocument()
    expect(h.calls).toEqual([['add', { space: 'story-ledger', kind: 'show', title: 'Knight Rider', why: 'A talking car' }]])
    expect(screen.getByLabelText('What should I audit?')).toHaveValue('')
  })
  it('explains a mistake in words, with a link to the field, and sends nothing', async () => {
    show()
    await screen.findByLabelText('What should I audit?')
    fireEvent.click(screen.getByRole('button', { name: 'Suggest it' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please write what you are suggesting.')
    expect(screen.getByLabelText('What should I audit?')).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(screen.getByLabelText('What should I audit?'), { target: { value: 'see https://spam.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suggest it' }))
    expect((await screen.findAllByText(/leave web addresses out/))[0]).toBeInTheDocument()
    expect(h.calls).toEqual([])
  })
  it('says plainly when the database refuses (the daily limit), and keeps what was typed', async () => {
    h.failAdd = true
    show()
    fireEvent.change(await screen.findByLabelText('What should I audit?'), { target: { value: 'Knight Rider' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suggest it' }))
    expect(await screen.findByText(/up to 3 a day/)).toBeInTheDocument()
    expect(screen.queryByText('Thanks! I will read it before it shows.')).toBeNull()
    expect(screen.getByLabelText('What should I audit?')).toHaveValue('Knight Rider')
  })
  it('lists the most wanted first, with the chosen one marked and its button off', async () => {
    h.rows = [row('a', 'Knight Rider'), row('bb', 'Xena', 'approved'), row('ccc', 'Beverly Hills, 90210', 'chosen')]
    h.tally = { a: 41, bb: 18, ccc: 64 }
    show()
    const items = await screen.findAllByRole('listitem')
    expect(items.map((li) => within(li).getByText(/Knight Rider|Xena|Beverly/).textContent)).toEqual(['Beverly Hills, 90210', 'Knight Rider', 'Xena'])
    expect(within(items[0]).getByText('Chosen: next audit')).toBeInTheDocument()
    expect(within(items[0]).getByRole('button')).toBeDisabled()
  })
  it('votes: the count and the button change at once, and the vote is saved; clicking again takes it back', async () => {
    h.rows = [row('a', 'Knight Rider')]; h.tally = { a: 41 }
    show()
    const vote = await screen.findByRole('button', { name: /Vote for Knight Rider/ })
    fireEvent.click(vote)
    const voted = await screen.findByRole('button', { name: /Take back your vote for Knight Rider. 42 votes/ })
    expect(voted).toHaveAttribute('aria-pressed', 'true')
    expect(voted).toHaveTextContent('▲ 42 · Voted')
    fireEvent.click(voted)
    await screen.findByRole('button', { name: /Vote for Knight Rider. 41 votes/ })
    expect(h.calls).toEqual([['vote', 'a', true], ['vote', 'a', false]])
  })
  it('shows a vote already cast', async () => {
    h.rows = [row('a', 'Knight Rider')]; h.tally = { a: 41 }; h.mine = new Set(['a'])
    show()
    expect(await screen.findByRole('button', { name: /Take back your vote/ })).toHaveAttribute('aria-pressed', 'true')
  })
  it('says plainly when the list cannot load', async () => {
    h.failList = true
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load just now/)
  })
})

describe('the styles', () => {
  const css = readFileSync(join(process.cwd(), 'src/suggest/suggest.css'), 'utf8')
  it('are the design\u2019s, with no text under 14px and no inline styles in the box', () => {
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    expect(readFileSync(join(process.cwd(), 'src/suggest/SuggestPanel.jsx'), 'utf8')).not.toMatch(/style=\{\{/)
  })
  it('keep a visible focus on the choice of kind', () => {
    expect(css).toMatch(/\.sg__kind:focus-within \{[^}]*outline:\s*3px solid/)
  })
})

describe('the suggest form fields never squeeze into slivers', () => {
  const css = readFileSync(join(process.cwd(), 'src/suggest/suggest.css'), 'utf8')
  it('sit side by side when their box is wide enough and wrap onto their own lines when it is not, by the width of the box and not of the screen', () => {
    expect(css).toMatch(/\.sg__fields \{\s*display: flex;\s*flex-wrap: wrap;/); expect(css).toMatch(/\.sg__fields > \* \{\s*flex: 1 1 240px;\s*min-width: 0;/); expect(css).toMatch(/\.sg__fields > \.sg__submit \{\s*flex: 0 0 auto;/)
    expect(css).not.toMatch(/\.sg__fields \{[^}]*grid-template-columns/); expect(css).not.toMatch(/@media \(max-width: 760px\) \{\s*\.sg__fields/)
  })
})
