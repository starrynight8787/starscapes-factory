// The vote box in its four states (Figma: "The vote box in each state").
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ open: false }))
vi.mock('../src/data/membership', () => ({ MEMBERSHIP: { get open() { return h.open }, buttonWhileClosed: 'Coming soon' } }))
import VoteBox from '../src/stories/VoteBox'
import { tally } from '../src/stories/votesRules'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const vote = { id: 'v1', story_id: 's1', after_chapter: 10, question: 'What happens next?', closes_at: '2026-10-31T23:59:00Z', chosen_option_id: null }
const options = [{ id: 'a', vote_id: 'v1', position: 1, label: 'The door opens' }, { id: 'b', vote_id: 'v1', position: 2, label: 'She runs' }, { id: 'c', vote_id: 'v1', position: 3, label: 'She waits' }]
const tallied = tally(options, [{ option_id: 'a', votes: 13 }, { option_id: 'b', votes: 21 }, { option_id: 'c', votes: 7 }])
const noop = () => {}
const box = (props) => render(<MemoryRouter><VoteBox vote={vote} options={options} tally={null} chosen={null} myOption={null} selected="" onSelect={noop} onCast={noop} onChange={noop} onCancel={noop} busy={false} problem="" changing={false} signedIn state="member" {...props} /></MemoryRouter>)
beforeEach(() => { h.open = false })

describe('a member who has not voted yet', () => {
  it('says the vote is open, asks the question, and offers each choice with its letter as a radio button, with the date it closes', () => {
    box({ state: 'member' })
    expect(screen.getByText('Open')).toBeInTheDocument(); expect(screen.getByRole('heading', { level: 2, name: 'What happens next?' })).toBeInTheDocument(); expect(screen.getByText(/After Chapter 10: members choose where the story goes next\./)).toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'What happens next?' }); expect(within(group).getAllByRole('radio').map((r) => r.closest('label').textContent)).toEqual(['A The door opens', 'B She runs', 'C She waits'])
    expect(screen.getByText('You can change your vote until it closes on 31 Oct 2026.')).toBeInTheDocument()
  })
  it('has the Cast my vote button switched off until a choice is made, and shows which is picked', () => {
    box({ state: 'member' }); expect(screen.getByRole('button', { name: 'Cast my vote' })).toBeDisabled()
    box({ state: 'member', selected: 'b' }); const radios = screen.getAllByRole('radio'); expect(radios.filter((r) => r.checked).map((r) => r.value)).toEqual(['b']); expect(screen.getAllByRole('button', { name: 'Cast my vote' })[1]).toBeEnabled()
  })
  it('tells the page which choice was pressed, and casts the vote on the button, once, and not while it is busy', () => {
    const onSelect = vi.fn(); const onCast = vi.fn(); box({ state: 'member', selected: 'b', onSelect, onCast })
    fireEvent.click(screen.getAllByRole('radio')[2]); expect(onSelect).toHaveBeenCalledWith('c'); fireEvent.click(screen.getByRole('button', { name: 'Cast my vote' })); expect(onCast).toHaveBeenCalledTimes(1)
  })
  it('does not cast with nothing picked, nor while a vote is already being saved, and says it is saving', () => {
    const onCast = vi.fn(); const a = box({ state: 'member', selected: '', onCast }); fireEvent.submit(a.container.querySelector('form')); expect(onCast).not.toHaveBeenCalled(); a.unmount()
    const b = box({ state: 'member', selected: 'a', busy: true, onCast }); fireEvent.submit(b.container.querySelector('form')); expect(onCast).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })
  it('shows a problem in plain words, in an alert, and keeps the choices', () => {
    box({ state: 'member', problem: 'Voting is for members, and only while the vote is open.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Voting is for members, and only while the vote is open.'); expect(screen.getAllByRole('radio')).toHaveLength(3)
  })
  it('shows NO numbers before the member has voted', () => {
    const { container } = box({ state: 'member', tally: tallied }); expect(container.textContent).not.toMatch(/\d+ votes?/); expect(container.querySelector('.ls__bar')).toBeNull()
  })
})

describe('a member who has voted', () => {
  it('thanks them, shows every choice with its votes, bar and share, and marks their own choice', () => {
    box({ state: 'voted', tally: tallied, myOption: 'b' })
    expect(screen.getByText('Thank you, your vote is counted. It closes on 31 Oct 2026.')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem'); expect(items.map((li) => li.querySelector('.ls__resulttext').textContent)).toEqual(['A The door opens', 'B She runs', 'C She waits'])
    expect(within(items[1]).getByText('21 votes')).toBeInTheDocument(); expect(within(items[1]).getByText('Your vote')).toBeInTheDocument(); expect(within(items[0]).queryByText('Your vote')).toBeNull(); expect(within(items[2]).getByText('7 votes')).toBeInTheDocument()
    expect(within(items[1]).getByRole('img')).toHaveAttribute('aria-label', '21 votes, 51 per cent'); expect(items[1].querySelector('.ls__bar-fill').className).toMatch(/ls__bar-fill--p50/)
  })
  it('says "1 vote" for one and has no Chosen mark while the vote is open', () => {
    box({ state: 'voted', tally: tally(options, [{ option_id: 'a', votes: 1 }]), myOption: 'a' }); expect(screen.getByText('1 vote')).toBeInTheDocument(); expect(screen.queryByText('Chosen')).toBeNull()
  })
  it('offers Change my vote, and says plainly if the numbers could not load', () => {
    const onChange = vi.fn(); box({ state: 'voted', tally: null, myOption: 'a', onChange }); expect(screen.getByText('The numbers could not load just now.')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Change my vote' })); expect(onChange).toHaveBeenCalled()
  })
  it('shows the choices again, with their own picked, when they are changing their vote, with Save my new vote and Keep my vote', () => {
    const onCancel = vi.fn(); box({ state: 'voted', changing: true, myOption: 'a', selected: 'a', tally: tallied, onCancel })
    expect(screen.getAllByRole('radio').filter((r) => r.checked).map((r) => r.value)).toEqual(['a']); expect(screen.getByRole('button', { name: 'Save my new vote' })).toBeEnabled(); expect(screen.queryByRole('button', { name: 'Change my vote' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Keep my vote' })); expect(onCancel).toHaveBeenCalled(); expect(document.body.textContent).not.toMatch(/\d+ votes/)
  })
})

describe('a visitor (signed out, or without the pass)', () => {
  it('says it is for members, shows the choices but nothing to press, and says when it closes', () => {
    box({ state: 'visitor', signedIn: false })
    expect(screen.getByText('Members only')).toBeInTheDocument(); expect(screen.queryByRole('radio')).toBeNull(); expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A The door opens', 'B She runs', 'C She waits'])
    expect(screen.getByText(/The choices show here, but only members can vote\. The voting closes on 31 Oct 2026\./)).toBeInTheDocument()
  })
  it('shows a Coming soon button that does nothing while memberships are not open, and the passes when they are', () => {
    const a = box({ state: 'visitor' }); expect(screen.getByRole('button', { name: 'Coming soon' })).toBeDisabled(); expect(screen.queryByRole('link', { name: 'Choose your passes' })).toBeNull(); a.unmount()
    h.open = true; box({ state: 'visitor' }); expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership'); expect(screen.queryByRole('button')).toBeNull()
  })
  it('offers Log in to someone signed out ("Already a member?"), and not to someone already signed in', () => {
    const a = box({ state: 'visitor', signedIn: false }); expect(screen.getByText(/Already a member\?/)).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login'); a.unmount()
    box({ state: 'visitor', signedIn: true }); expect(screen.queryByText(/Already a member/)).toBeNull(); expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
  })
  it('shows NO numbers to a visitor, even if some were handed in', () => {
    const { container } = box({ state: 'visitor', tally: tallied }); expect(container.textContent).not.toMatch(/\d+ votes?/); expect(container.querySelector('.ls__bar')).toBeNull()
  })
})

describe('after the vote closes', () => {
  it('says where the story went: closed, the results, the chosen choice marked, and that the next chapter is being written', () => {
    box({ state: 'closed', tally: tallied, chosen: 'b' })
    expect(screen.getByText('Closed')).toBeInTheDocument(); expect(screen.getByRole('heading', { level: 2, name: 'Where the story went' })).toBeInTheDocument(); expect(screen.getByText('After Chapter 10, members chose:')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem'); expect(within(items[1]).getByText('Chosen')).toBeInTheDocument(); expect(items[1].className).toMatch(/is-chosen/); expect(within(items[0]).queryByText('Chosen')).toBeNull()
    expect(screen.getByText('Chapter 11 is being written. The next vote opens when it is published.')).toBeInTheDocument(); expect(screen.queryByRole('radio')).toBeNull(); expect(screen.queryByRole('button')).toBeNull()
  })
  it('shows the choices without numbers, plainly, if the results could not be had', () => {
    box({ state: 'closed', tally: null }); expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A The door opens', 'B She runs', 'C She waits'])
  })
  it('marks no winner when nobody is chosen (a tie)', () => {
    box({ state: 'closed', tally: tallied, chosen: null }); expect(screen.queryByText('Chosen')).toBeNull()
  })
})

describe('the look of it', () => {
  const css = read('src/stories/stories.css')
  it('has a bar width for every step of 5 per cent from 0 to 100, with no inline styles in the box', () => {
    for (let n = 0; n <= 100; n += 5) expect(css, String(n)).toContain(`.ls__bar-fill--p${n} { width: ${n}%; }`)
    expect(read('src/stories/VoteBox.jsx')).not.toMatch(/style=\{\{/); expect(read('src/stories/StoryVote.jsx')).not.toMatch(/style=\{\{/)
  })
  it('sets no text under 14px, and keeps the Coming soon button, the tags and the chosen result readable (4.5 to 1)', () => {
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const soon = css.match(/\.ls__soon \{([^}]*)\}/)[1]; expect(ratio(soon.match(/background:\s*(#[0-9a-f]{6})/i)[1], soon.match(/(?:^|[\s;])color:\s*(#[0-9a-f]{6})/i)[1])).toBeGreaterThanOrEqual(4.5)
    expect(ratio('#dff5e1', '#0e3d1c')).toBeGreaterThanOrEqual(4.5); expect(css).toMatch(/\.ls__result\.is-chosen \{ background: #dff5e1;/); expect(css).toMatch(/\.ls__result\.is-chosen \.ls__resultmeta \{ color: #0e3d1c;/)
  })
  it('gives the picked choice and the radio buttons a visible focus', () => {
    expect(css).toMatch(/\.ls__option--pick:focus-within \{[^}]*outline:\s*3px solid/); expect(css).toMatch(/\.ls__link:focus-visible \{[^}]*outline:\s*3px solid/)
  })
})
