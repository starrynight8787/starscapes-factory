// The story vote as a whole: finding the right vote, who is looking, whether they have voted, the results the database is willing to give them, and casting and changing a vote.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ user: null, userLoading: false, membership: null, membershipFails: false, votes: [], options: [], ballot: null, results: [], fail: false, castFails: false, calls: [], resultsAsked: 0 }))
vi.mock('../src/data/membership', () => ({ MEMBERSHIP: { open: false, buttonWhileClosed: 'Coming soon' } }))
vi.mock('../src/suggest/useUser', () => ({ default: () => ({ loading: h.userLoading, user: h.user }) }))
vi.mock('../src/membership/membershipApi', () => ({ fetchMyMembership: vi.fn(async () => { if (h.membershipFails) throw new Error('x'); return h.membership }) }))
vi.mock('../src/stories/votesApi', () => ({
  fetchVotes: vi.fn(async () => { if (h.fail) throw new Error('x'); return { votes: h.votes, options: h.options } }),
  fetchMyBallot: vi.fn(async () => h.ballot),
  fetchResults: vi.fn(async () => { h.resultsAsked += 1; return h.results }),
  castVote: vi.fn(async (args) => { if (h.castFails) throw new Error('Voting is for members, and only while the vote is open.'); h.calls.push(args); h.ballot = args.optionId; h.results = [{ option_id: 'a', votes: args.optionId === 'a' ? 5 : 4 }, { option_id: 'b', votes: args.optionId === 'b' ? 6 : 2 }, { option_id: 'c', votes: 1 }] }),
}))
import StoryVote from '../src/stories/StoryVote'

const NOW = '2026-10-20T12:00:00Z'
const STORY = { id: 's1', title: 'The Lantern' }
const vote = (over = {}) => ({ id: 'v1', story_id: 's1', after_chapter: 10, question: 'What happens next?', closes_at: '2026-10-31T23:59:00Z', chosen_option_id: null, ...over })
const opts = (voteId = 'v1') => [{ id: 'a', vote_id: voteId, position: 1, label: 'The door opens' }, { id: 'b', vote_id: voteId, position: 2, label: 'She runs' }, { id: 'c', vote_id: voteId, position: 3, label: 'She waits' }]
const MEMBER = { status: 'active', passes: ['come-write-with-me'] }
const show = () => render(<MemoryRouter><StoryVote story={STORY} now={NOW} /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { user: null, userLoading: false, membership: null, membershipFails: false, votes: [vote()], options: opts(), ballot: null, results: [], fail: false, castFails: false, calls: [], resultsAsked: 0 }) })

describe('when there is no vote', () => {
  it('shows the "soon" box: the label, a Soon chip and the words, with nothing to press', async () => {
    h.votes = []; h.options = []; show()
    const box = await screen.findByRole('region', { name: 'What happens next?' }); expect(within(box).getByText('Soon')).toBeInTheDocument(); expect(within(box).getByText(/Members will choose where the story goes next/)).toBeInTheDocument(); expect(within(box).queryByRole('button')).toBeNull()
  })
  it('shows the same if the votes cannot be found (never a broken box), and if a vote has no choices', async () => {
    h.fail = true; const a = show(); expect(await screen.findByText('Soon')).toBeInTheDocument(); a.unmount()
    h.fail = false; h.options = []; show(); expect(await screen.findByText('Soon')).toBeInTheDocument()
  })
  it('shows nothing at all for a page with no story', async () => {
    const { container } = render(<MemoryRouter><StoryVote story={null} now={NOW} /></MemoryRouter>); await Promise.resolve(); await Promise.resolve(); expect(container.textContent).toBe('')
  })
})

describe('a visitor', () => {
  it('signed out sees the choices and "Members only", is offered Log in, and is given no numbers (the database is not even asked)', async () => {
    show(); expect(await screen.findByText('Members only')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument(); expect(screen.queryByRole('radio')).toBeNull(); expect(h.resultsAsked).toBe(0)
  })
  it('signed in without the pass sees the same, without the Log in link', async () => {
    h.user = { id: 'u1' }; h.membership = { status: 'active', passes: ['blueprints'] }; show()
    expect(await screen.findByText('Members only')).toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull(); expect(h.resultsAsked).toBe(0)
  })
  it('signed in with a membership that has no passes, or none at all, or one that cannot be read, is a visitor too', async () => {
    for (const m of [null, { status: 'canceled', passes: ['come-write-with-me'] }]) { h.user = { id: 'u1' }; h.membership = m; const a = show(); expect(await screen.findByText('Members only')).toBeInTheDocument(); a.unmount() }
    h.membership = null; h.membershipFails = true; show(); expect(await screen.findByText('Members only')).toBeInTheDocument()
  })
})

describe('a member', () => {
  beforeEach(() => { h.user = { id: 'u1' }; h.membership = MEMBER })
  it('who has not voted sees the choices to pick from and no numbers, and does not ask the database for any', async () => {
    show(); expect(await screen.findByRole('button', { name: 'Cast my vote' })).toBeDisabled(); expect(screen.getAllByRole('radio')).toHaveLength(3); expect(h.resultsAsked).toBe(0)
  })
  it('casts a vote: it is saved for them, in that vote, and the box turns into the results with their own choice marked', async () => {
    show(); fireEvent.click((await screen.findAllByRole('radio'))[1]); fireEvent.click(screen.getByRole('button', { name: 'Cast my vote' }))
    expect(await screen.findByText(/Thank you, your vote is counted/)).toBeInTheDocument()
    expect(h.calls).toEqual([{ voteId: 'v1', userId: 'u1', optionId: 'b' }]); const mine = screen.getAllByRole('listitem').find((li) => within(li).queryByText('Your vote')); expect(within(mine).getByText(/She runs/)).toBeInTheDocument(); expect(within(mine).getByText('6 votes')).toBeInTheDocument()
  })
  it('who has already voted sees the results at once, asks for them, and their choice is marked', async () => {
    h.ballot = 'a'; h.results = [{ option_id: 'a', votes: 3 }, { option_id: 'b', votes: 8 }, { option_id: 'c', votes: 2 }]; show()
    expect(await screen.findByText(/Thank you, your vote is counted/)).toBeInTheDocument(); await screen.findByText('8 votes'); expect(h.resultsAsked).toBeGreaterThan(0); expect(within(screen.getAllByRole('listitem')[0]).getByText('Your vote')).toBeInTheDocument()
  })
  it('can change their vote: their choice is picked first, saving replaces it, and Keep my vote goes back without saving', async () => {
    h.ballot = 'a'; h.results = [{ option_id: 'a', votes: 3 }, { option_id: 'b', votes: 8 }, { option_id: 'c', votes: 2 }]; show()
    fireEvent.click(await screen.findByRole('button', { name: 'Change my vote' })); expect(screen.getAllByRole('radio').filter((r) => r.checked).map((r) => r.value)).toEqual(['a'])
    fireEvent.click(screen.getByRole('button', { name: 'Keep my vote' })); expect(await screen.findByRole('button', { name: 'Change my vote' })).toBeInTheDocument(); expect(h.calls).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Change my vote' })); fireEvent.click(screen.getAllByRole('radio')[2]); fireEvent.click(screen.getByRole('button', { name: 'Save my new vote' }))
    await waitFor(() => expect(h.calls).toEqual([{ voteId: 'v1', userId: 'u1', optionId: 'c' }])); expect(await screen.findByRole('button', { name: 'Change my vote' })).toBeInTheDocument()
  })
  it('is told in plain words, and stays in the form, if the vote is refused', async () => {
    h.castFails = true; show(); fireEvent.click((await screen.findAllByRole('radio'))[0]); fireEvent.click(screen.getByRole('button', { name: 'Cast my vote' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Voting is for members, and only while the vote is open.'); expect(screen.getAllByRole('radio')).toHaveLength(3); expect(screen.queryByText(/Thank you/)).toBeNull(); expect(h.calls).toHaveLength(0)
  })
  it('shows nothing, not the wrong state, until it knows who they are and whether they have voted', async () => {
    h.userLoading = true; const { container } = show(); await Promise.resolve(); await Promise.resolve(); expect(container.textContent).toBe('')
  })
})

describe('which vote it shows', () => {
  it('the open one rather than an old closed one, and the latest chapter\u2019s if two are open', async () => {
    h.votes = [vote({ id: 'old', after_chapter: 3, closes_at: '2026-09-01T00:00:00Z' }), vote({ id: 'v3', after_chapter: 6, question: 'Chapter six question' }), vote({ id: 'v9', after_chapter: 9, question: 'Chapter nine question' })]; h.options = [...opts('old'), ...opts('v3'), ...opts('v9')]
    show(); expect(await screen.findByRole('heading', { level: 2, name: 'Chapter nine question' })).toBeInTheDocument()
  })
  it('a vote for another story is not shown for this one', async () => {
    h.votes = [vote({ story_id: 'other' })]; show(); expect(await screen.findByText('Soon')).toBeInTheDocument()
  })
})

describe('after the vote has closed', () => {
  beforeEach(() => { h.votes = [vote({ closes_at: '2026-10-15T00:00:00Z' })] })
  it('shows where the story went to anyone, with the numbers and the choice with the most votes marked, and asks for the results even of a visitor', async () => {
    h.results = [{ option_id: 'a', votes: 4 }, { option_id: 'b', votes: 12 }, { option_id: 'c', votes: 3 }]; show()
    expect(await screen.findByRole('heading', { level: 2, name: 'Where the story went' })).toBeInTheDocument(); await screen.findByText('12 votes'); expect(h.resultsAsked).toBeGreaterThan(0)
    const chosen = screen.getAllByRole('listitem').find((li) => within(li).queryByText('Chosen')); expect(within(chosen).getByText(/She runs/)).toBeInTheDocument(); expect(screen.queryByRole('radio')).toBeNull(); expect(screen.queryByRole('button')).toBeNull()
  })
  it('marks the choice the owner picked, even if another had more votes, and nobody if it is a tie', async () => {
    h.votes = [vote({ closes_at: '2026-10-15T00:00:00Z', chosen_option_id: 'c' })]; h.results = [{ option_id: 'a', votes: 4 }, { option_id: 'b', votes: 12 }, { option_id: 'c', votes: 3 }]; const a = show()
    await screen.findByText('12 votes'); expect(within(screen.getAllByRole('listitem').find((li) => within(li).queryByText('Chosen'))).getByText(/She waits/)).toBeInTheDocument(); a.unmount()
    h.votes = [vote({ closes_at: '2026-10-15T00:00:00Z' })]; h.results = [{ option_id: 'a', votes: 5 }, { option_id: 'b', votes: 5 }, { option_id: 'c', votes: 1 }]; show(); await screen.findAllByText('5 votes'); expect(screen.queryByText('Chosen')).toBeNull()
  })
  it('still shows the choices, without numbers, if the results could not be had', async () => {
    h.results = []; show(); expect(await screen.findByRole('heading', { level: 2, name: 'Where the story went' })).toBeInTheDocument(); expect(screen.getAllByRole('listitem')).toHaveLength(3); expect(screen.queryByText(/\d+ votes?/)).toBeNull()
  })
})
