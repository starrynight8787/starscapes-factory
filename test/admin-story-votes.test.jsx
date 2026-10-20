// The owner's vote tools inside the Stories tool in Admin: making a vote, closing it early, saying which choice won, deleting it, and what it says when something goes wrong.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ votes: [], options: [], results: {}, calls: [], failSave: false }))
vi.mock('../src/stories/votesApi', () => ({
  fetchVotes: vi.fn(async () => ({ votes: h.votes, options: h.options })),
  fetchResults: vi.fn(async (id) => h.results[id] || []),
  saveVote: vi.fn(async (vote, labels) => { if (h.failSave) throw new Error('There is already a vote after that chapter of that story.'); h.calls.push(['saveVote', vote, labels]) }),
  closeVoteNow: vi.fn(async (id) => { h.calls.push(['closeVoteNow', id]) }),
  chooseWinner: vi.fn(async (id, optionId) => { h.calls.push(['chooseWinner', id, optionId]) }),
  removeVote: vi.fn(async (id) => { h.calls.push(['removeVote', id]) }),
}))
import AdminStoryVotes from '../src/admin/AdminStoryVotes'

const STORY = '11111111-2222-4333-8444-555555555555'
const stories = [{ id: STORY, title: 'The Lantern' }]
const rows = [{ story_id: STORY, number: 1, post_id: 'p1' }, { story_id: STORY, number: 4, post_id: 'p4' }]
const open = { id: 'v1', story_id: STORY, after_chapter: 4, question: 'What happens next?', closes_at: '2099-10-31T23:59:00Z', chosen_option_id: null }
const closed = { id: 'v2', story_id: STORY, after_chapter: 3, question: 'Q', closes_at: '2020-01-01T00:00:00Z', chosen_option_id: 'o2b' }
const options = [{ id: 'o1a', vote_id: 'v1', position: 1, label: 'The door opens' }, { id: 'o1b', vote_id: 'v1', position: 2, label: 'She runs' }, { id: 'o2a', vote_id: 'v2', position: 1, label: 'Left' }, { id: 'o2b', vote_id: 'v2', position: 2, label: 'Right' }]
const page = () => render(<AdminStoryVotes stories={stories} rows={rows} />)
const fillForm = async ({ after = '5', closes = '2099-12-31T23:59', choices = ['Open it', 'Run away', ''] } = {}) => {
  fireEvent.change(screen.getByLabelText('Which story is the vote for?'), { target: { value: STORY } }); fireEvent.change(screen.getByLabelText('After which chapter?'), { target: { value: after } }); fireEvent.change(screen.getByLabelText('Voting closes'), { target: { value: closes } })
  choices.forEach((c, i) => fireEvent.change(screen.getByLabelText(`Choice ${'ABCDEF'[i]}`), { target: { value: c } }))
}
beforeEach(() => { Object.assign(h, { votes: [open, closed], options, results: { v1: [{ option_id: 'o1a', votes: 4 }, { option_id: 'o1b', votes: 7 }], v2: [{ option_id: 'o2a', votes: 9 }, { option_id: 'o2b', votes: 2 }] }, calls: [], failSave: false }); vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('the form', () => {
  it('starts with three choices, a note on how the vote works, and a hint about the story\u2019s chapters once a story is chosen', async () => {
    page(); await screen.findByText('Your votes (2)'); expect(screen.getAllByLabelText(/^Choice [A-C]$/)).toHaveLength(3); expect(screen.getByText(/only members can vote, once each, and change their mind until the vote closes/)).toBeInTheDocument()
    expect(screen.getByText('The chapter the vote comes after.')).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Which story is the vote for?'), { target: { value: STORY } }); expect(screen.getByText('This story has chapters up to 4.')).toBeInTheDocument()
  })
  it('checks the vote first, in plain words, and saves nothing while it is wrong', async () => {
    page(); await screen.findByText('Your votes (2)'); fireEvent.click(screen.getByRole('button', { name: 'Save the vote' }))
    expect((await screen.findAllByText('Choose the story this vote is for.')).length).toBeGreaterThan(0); expect(screen.getAllByText(/Give at least 2 choices/).length).toBeGreaterThan(0); expect(screen.getAllByText(/Say when the voting closes/).length).toBeGreaterThan(0); expect(h.calls).toHaveLength(0)
  })
  it('refuses a closing time that has passed, and two choices that are the same', async () => {
    page(); await screen.findByText('Your votes (2)'); await fillForm({ closes: '2020-01-01T10:00', choices: ['Same', 'same', ''] }); fireEvent.click(screen.getByRole('button', { name: 'Save the vote' }))
    expect((await screen.findAllByText(/still to come/)).length).toBeGreaterThan(0); expect(screen.getAllByText(/the same/).length).toBeGreaterThan(0); expect(h.calls).toHaveLength(0)
  })
  it('saves a good vote with the default question, drops a blank choice, says so, and is ready for the next one for the same story', async () => {
    page(); await screen.findByText('Your votes (2)'); await fillForm(); fireEvent.click(screen.getByRole('button', { name: 'Save the vote' }))
    expect(await screen.findByText('The vote after chapter 5 is saved.')).toBeInTheDocument()
    const [, vote, labels] = h.calls[0]; expect(vote).toMatchObject({ story_id: STORY, after_chapter: 5, question: 'What happens next?' }); expect(vote.closes_at).toBe(new Date('2099-12-31T23:59').toISOString()); expect(labels).toEqual(['Open it', 'Run away'])
    expect(screen.getByLabelText('Which story is the vote for?')).toHaveValue(STORY); expect(screen.getByLabelText('After which chapter?')).toHaveValue(null); expect(screen.getByLabelText('Choice A')).toHaveValue('')
  })
  it('lets you add choices up to six, and take them out down to two', async () => {
    page(); await screen.findByText('Your votes (2)')
    for (let n = 0; n < 3; n += 1) fireEvent.click(screen.getByRole('button', { name: 'Add another choice' })); expect(screen.getAllByLabelText(/^Choice [A-F]$/)).toHaveLength(6); expect(screen.queryByRole('button', { name: 'Add another choice' })).toBeNull()
    for (let n = 0; n < 4; n += 1) fireEvent.click(screen.getAllByRole('button', { name: /^Take out choice/ })[0]); expect(screen.getAllByLabelText(/^Choice [A-F]$/)).toHaveLength(2); expect(screen.queryByRole('button', { name: /^Take out choice/ })).toBeNull(); expect(screen.getByRole('button', { name: 'Add another choice' })).toBeInTheDocument()
  })
  it('says plainly what went wrong, and does not say it worked, when the database refuses', async () => {
    h.failSave = true; page(); await screen.findByText('Your votes (2)'); await fillForm(); fireEvent.click(screen.getByRole('button', { name: 'Save the vote' }))
    expect(await screen.findByText('There is already a vote after that chapter of that story.')).toBeInTheDocument(); expect(screen.queryByText(/is saved/)).toBeNull()
  })
})

describe('the list of votes', () => {
  it('shows each vote with its story, chapter, whether it is open or closed, when, how many votes, and every choice with its number', async () => {
    page(); await screen.findByText('Your votes (2)')
    const openRow = screen.getByText('The Lantern: after chapter 4').closest('li'); expect(within(openRow).getByText(/Open · closes 31 Oct 2099 · 11 votes/)).toBeInTheDocument(); expect(within(openRow).getByText('A: The door opens (4)')).toBeInTheDocument(); expect(within(openRow).getByText('B: She runs (7)')).toBeInTheDocument()
    const closedRow = screen.getByText('The Lantern: after chapter 3').closest('li'); expect(within(closedRow).getByText(/Closed · closed 1 Jan 2020 · 11 votes/)).toBeInTheDocument(); expect(within(closedRow).getByText('B: Right (2) · chosen by you')).toBeInTheDocument()
  })
  it('says when there are no votes yet', async () => {
    h.votes = []; h.options = []; page(); expect(await screen.findByText('No votes yet.')).toBeInTheDocument()
  })
  it('closes an open vote early only after asking, and offers that only for an open vote', async () => {
    page(); await screen.findByText('Your votes (2)'); expect(screen.getAllByRole('button', { name: /^Close the vote after chapter/ })).toHaveLength(1)
    window.confirm.mockReturnValue(false); fireEvent.click(screen.getByRole('button', { name: 'Close the vote after chapter 4 now' })); expect(h.calls).toHaveLength(0)
    window.confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Close the vote after chapter 4 now' })); await waitFor(() => expect(h.calls).toEqual([['closeVoteNow', 'v1']]))
  })
  it('saves which choice won, or clears it so the one with the most votes wins, and shows the one already chosen', async () => {
    page(); await screen.findByText('Your votes (2)')
    const closedRow = screen.getByText('The Lantern: after chapter 3').closest('li'); expect(within(closedRow).getByLabelText('Winner')).toHaveValue('o2b')
    const openRow = screen.getByText('The Lantern: after chapter 4').closest('li'); fireEvent.change(within(openRow).getByLabelText('Winner'), { target: { value: 'o1a' } }); fireEvent.click(screen.getByRole('button', { name: 'Save the winner of the vote after chapter 4' }))
    await waitFor(() => expect(h.calls).toEqual([['chooseWinner', 'v1', 'o1a']])); h.calls.length = 0
    fireEvent.change(within(closedRow).getByLabelText('Winner'), { target: { value: '' } }); fireEvent.click(screen.getByRole('button', { name: 'Save the winner of the vote after chapter 3' })); await waitFor(() => expect(h.calls).toEqual([['chooseWinner', 'v2', '']]))
  })
  it('deletes a vote only after asking, and says that everyone\u2019s votes in it go too', async () => {
    window.confirm.mockReturnValue(false); page(); await screen.findByText('Your votes (2)'); fireEvent.click(screen.getByRole('button', { name: 'Delete the vote after chapter 3' })); expect(h.calls).toHaveLength(0); expect(window.confirm.mock.calls[0][0]).toMatch(/everyone.s votes in it/)
    window.confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Delete the vote after chapter 3' })); await waitFor(() => expect(h.calls).toEqual([['removeVote', 'v2']]))
  })
})
