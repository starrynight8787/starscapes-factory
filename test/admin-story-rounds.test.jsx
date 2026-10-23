// The owner's console for the hidden story rounds (Figma: "Story form designs", SFW-269).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ owner: true, list: null, results: null, act: null }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }), default: () => h.owner }))
vi.mock('../src/admin/storyRoundsAdminApi', () => ({ listRounds: (...a) => h.list(...a), roundResults: (...a) => h.results(...a), act: (...a) => h.act(...a) }))
import AdminStoryRounds from '../src/admin/AdminStoryRounds'

const T = 'c'.repeat(64)
const rounds = [
  { id: 'r1', title: 'Chapter 2: choose the ingredients', kind: 'full_form', status: 'open', state: 'open', link_token: T, opens_at: '2027-03-01T09:00:00Z', closes_at: '2027-03-31T17:00:00Z', members: 23, names: 14, reports: 1 },
  { id: 'r2', title: 'Names chapter', kind: 'names_only', status: 'draft', state: 'hidden', link_token: 'd'.repeat(64), opens_at: null, closes_at: null, members: 0, names: 0, reports: 0 },
  { id: 'r3', title: 'Old chapter', kind: 'full_form', status: 'archived', state: 'hidden', link_token: 'e'.repeat(64), opens_at: null, closes_at: null, members: 5, names: 2, reports: 0 },
]
const results = { ok: true, round: { id: 'r1', title: 'Chapter 2: choose the ingredients', kind: 'full_form', status: 'open', state: 'open' }, members: 23,
  questions: [{ id: 'q4', label: 'Should the hero have side kicks?', type: 'choose_one', decides: true, tally: { total: 23, leader: '2 side kicks', rows: [{ label: 'No, a lone wolf', letter: 'A', votes: 4, percent: 17 }, { label: '1 side kick', letter: 'B', votes: 5, percent: 22 }, { label: '2 side kicks', letter: 'C', votes: 9, percent: 39, popular: true }, { label: '3 side kicks', letter: 'D', votes: 5, percent: 22 }] } }],
  names: [{ question_id: 'v', label: 'Villain', name: 'Marrow', times: 2, reports: 0, hidden: false, ids: ['a1', 'a2'] }, { question_id: 'v', label: 'Villain', name: 'Fitch', times: 1, reports: 0, hidden: false, ids: ['b1'] }, { question_id: 'v', label: 'Villain', name: 'Wren', times: 1, reports: 1, hidden: false, ids: ['c1'] }, { question_id: 'v', label: 'Villain', name: 'Pale', times: 1, reports: 0, hidden: true, ids: ['d1'] }] }
const show = () => render(<MemoryRouter><AdminStoryRounds session={{ access_token: 't' }} /></MemoryRouter>)
beforeEach(() => { h.owner = true; h.list = vi.fn(async () => ({ ok: true, rounds })); h.results = vi.fn(async () => results); h.act = vi.fn(async () => ({ ok: true })); Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } }) })

describe('the rounds list', () => {
  it('is for the owner only, and asks the server for nothing otherwise', () => {
    h.owner = false; show(); expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(h.list).not.toHaveBeenCalled()
  })
  it('lists each round with its state, kind and counts, and shows no member details', async () => {
    show(); const open = await screen.findByRole('article', { name: 'Chapter 2: choose the ingredients' })
    expect(within(open).getByText('Open')).toBeInTheDocument(); expect(within(open).getByText('Chapter: full form')).toBeInTheDocument(); expect(within(open).getByText(/23 answered · 14 name suggestions · 1 reported/)).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Names chapter' })).getByText('Draft')).toBeInTheDocument(); expect(within(screen.getByRole('article', { name: 'Old chapter' })).getByText('Archived')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/@|member_id/)
  })
  it('offers only the buttons that make sense for each state', async () => {
    show(); const open = await screen.findByRole('article', { name: 'Chapter 2: choose the ingredients' })
    expect(['Close chapter', 'Reset', 'Archive'].every((n) => within(open).queryByRole('button', { name: n }))).toBe(true); expect(within(open).queryByRole('button', { name: 'Open' })).toBeNull(); expect(within(open).queryByRole('button', { name: 'Delete' })).toBeNull()
    const draft = screen.getByRole('article', { name: 'Names chapter' }); expect(within(draft).getByRole('button', { name: 'Open' })).toBeInTheDocument(); expect(within(draft).getByRole('button', { name: 'Delete' })).toBeInTheDocument(); expect(within(draft).queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(within(screen.getByRole('article', { name: 'Old chapter' })).queryByRole('button', { name: 'Archive' })).toBeNull()
  })
  it('copies the private member link', async () => {
    show(); const open = await screen.findByRole('article', { name: 'Chapter 2: choose the ingredients' }); fireEvent.click(within(open).getByRole('button', { name: 'Copy member link' }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/story-round/${T}`))
  })
})

describe('the confirm steps', () => {
  it('asks before closing, and does nothing until confirmed', async () => {
    show(); const open = await screen.findByRole('article', { name: 'Chapter 2: choose the ingredients' }); fireEvent.click(within(open).getByRole('button', { name: 'Close chapter' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Close this chapter?'); expect(h.act).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' })); expect(screen.queryByRole('alertdialog')).toBeNull(); expect(h.act).not.toHaveBeenCalled()
  })
  it('needs a tick as well for a reset, says it keeps the monthly count, and sends the confirmation', async () => {
    show(); const open = await screen.findByRole('article', { name: 'Chapter 2: choose the ingredients' }); fireEvent.click(within(open).getByRole('button', { name: 'Reset' }))
    const box = screen.getByRole('alertdialog'); expect(box).toHaveTextContent('does not give anyone extra'); const go = within(box).getByRole('button', { name: 'Reset the chapter' }); expect(go).toBeDisabled()
    fireEvent.click(within(box).getByLabelText('I understand this clears every answer.')); fireEvent.click(go)
    await waitFor(() => expect(h.act).toHaveBeenCalledWith({ op: 'reset', id: 'r1', confirm: true }))
  })
  it('shows the server\'s plain refusal when a round with answers is deleted', async () => {
    h.act = vi.fn(async () => { throw new Error('This round has answers, so it cannot be deleted. Archive it instead. Its answers are kept.') })
    show(); const draft = await screen.findByRole('article', { name: 'Names chapter' }); fireEvent.click(within(draft).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByLabelText('I understand this cannot be undone.')); fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete the chapter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Archive it instead')
  })
})

describe('making a round', () => {
  it('saves a draft with the default questions, then lets Gill add as many of her own as she likes', async () => {
    show(); fireEvent.click(await screen.findByRole('button', { name: 'Create a chapter' }))
    fireEvent.change(screen.getByLabelText('Title (members see this)'), { target: { value: 'Chapter 3' } })
    for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Add another question' }))
    expect(screen.getAllByLabelText('Question')).toHaveLength(3)
    fireEvent.change(screen.getAllByLabelText('Question')[0], { target: { value: 'What mood should the story have?' } }); fireEvent.change(screen.getAllByLabelText(/Options \(one on each line/)[0], { target: { value: 'Cosy\nTense' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    await waitFor(() => expect(h.act).toHaveBeenCalledTimes(1)); const p = h.act.mock.calls[0][0]
    expect(p).toMatchObject({ op: 'create', title: 'Chapter 3', kind: 'full_form' }); expect(p.questions).toHaveLength(11); expect(p.questions.at(-1)).toMatchObject({ label: 'What mood should the story have?', options: ['Cosy', 'Tense'] })
    expect(p.questions.find((q) => q.label === 'Side kicks')).toMatchObject({ show_if_answers: ['1 side kick', '2 side kicks', '3 side kicks'] })
  })
  it('lets the side kicks question and the count question be switched on or off like any other', async () => {
    show(); fireEvent.click(await screen.findByRole('button', { name: 'Create a chapter' }))
    expect(screen.getByLabelText(/Should the hero have side kicks\?/)).toBeChecked(); expect(screen.getByText('Decides side kicks')).toBeInTheDocument(); expect(screen.getByText('Only if they chose Yes')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/Should the hero have side kicks\?/)); fireEvent.click(screen.getByLabelText(/^Side kicks/))
    fireEvent.change(screen.getByLabelText('Title (members see this)'), { target: { value: 'No side kicks' } }); fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    await waitFor(() => expect(h.act).toHaveBeenCalled()); expect(h.act.mock.calls[0][0].questions.map((q) => q.label)).not.toEqual(expect.arrayContaining(['Side kicks', 'Should the hero have side kicks?']))
  })
  it('says what is missing in plain words', async () => {
    show(); fireEvent.click(await screen.findByRole('button', { name: 'Create a chapter' })); fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please give the chapter a title.'); expect(h.act).not.toHaveBeenCalled()
  })
})

describe('the results and the shortlist', () => {
  const open = async () => { show(); const card = await screen.findByRole('article', { name: 'Chapter 2: choose the ingredients' }); fireEvent.click(within(card).getByRole('button', { name: 'Results' })) }
  it('shows lone wolf, 1, 2 and 3 with the most popular marked, and says what it decides', async () => {
    await open(); const q = await screen.findByLabelText('Should the hero have side kicks?')
    expect(within(q).getByText('A No, a lone wolf')).toBeInTheDocument(); expect(within(q).getByText('Most popular')).toBeInTheDocument(); expect(within(q).getByText(/The story will have 2 side kicks/)).toBeInTheDocument()
  })
  it('shows names with how often each was suggested and any report, and never who sent them', async () => {
    await open(); const names = await screen.findByLabelText('Name suggestions')
    expect(within(names).getByText('Suggested 2 times')).toBeInTheDocument(); expect(within(names).getByText(/^Reported/)).toBeInTheDocument(); expect(names.textContent).not.toMatch(/@/)
  })
  it('hides a name when asked', async () => {
    await open(); const names = await screen.findByLabelText('Name suggestions'); fireEvent.click(within(names).getAllByRole('button', { name: 'Hide' })[0])
    await waitFor(() => expect(h.act).toHaveBeenCalledWith({ op: 'hide', ids: ['a1', 'a2'] }))
  })
  it('keeps the shortlist button off until exactly three names are ticked, and a hidden name cannot be ticked', async () => {
    await open(); const names = await screen.findByLabelText('Name suggestions'); const go = within(names).getByRole('button', { name: 'Make a vote from my three' })
    expect(go).toBeDisabled(); expect(within(names).getByLabelText('Pale')).toBeDisabled()
    for (const n of ['Marrow', 'Fitch']) fireEvent.click(within(names).getByLabelText(n)); expect(go).toBeDisabled(); expect(within(names).getByText(/Shortlisted: 2 of 3 ticked/)).toBeInTheDocument()
    fireEvent.click(within(names).getByLabelText('Wren')); expect(go).toBeEnabled(); fireEvent.click(go)
    await waitFor(() => expect(h.act).toHaveBeenCalledWith({ op: 'shortlist', round_id: 'r1', suggestion_ids: ['a1', 'b1', 'c1'], title: undefined, question: 'Which name should we use?' }))
  })
})
