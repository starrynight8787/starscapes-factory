// The hidden "Let's write a story" page (Figma: "Story form designs", SFW-269): what a member sees, in each state.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BUILT_IN } from '../src/stories/round/storyRoundRules'

const h = vi.hoisted(() => ({ load: null, send: null, report: null }))
vi.mock('../src/stories/round/storyRoundApi', () => ({ loadRound: (...a) => h.load(...a), sendAnswers: (...a) => h.send(...a), reportName: (...a) => h.report(...a) }))
import StoryRoundPage from '../src/stories/round/StoryRoundPage'

const TOKEN = 'a'.repeat(64)
const questions = BUILT_IN.map((q, i) => ({ id: `q${i + 1}`, label: q.label, help_text: q.help, type: q.type, name_box: q.nameBox, name_slots: 1, show_if_question_id: q.showIf ? 'q4' : null, show_if_answers: q.showIf ? q.showIf.answers : null, options: q.options.map((o) => (typeof o === 'string' ? { label: o } : o)) }))
const openData = { ok: true, state: 'open', round: { title: 'Chapter 2: choose the ingredients', kind: 'full_form', closes_at: '2027-03-31T17:00:00Z' }, questions, left: 3 }
const page = (session = { access_token: 't' }) => render(<MemoryRouter initialEntries={[`/story-round/${TOKEN}`]}><Routes><Route path="/story-round/:token" element={<StoryRoundPage session={session} />} /></Routes></MemoryRouter>)
const chip = (n, t) => screen.getByText((c, el) => el.classList.contains('sr-chip') && new RegExp(`^Question ${n} of ${t}`).test(el.textContent))

beforeEach(() => {
  window.scrollTo = vi.fn(); h.load = vi.fn(async () => openData); h.send = vi.fn(async () => ({ ok: true, state: 'sent', sent: { answered: 3, total: 10, names: 1, left: 2 } })); h.report = vi.fn(async () => ({ ok: true })) })

describe('the page behind the hidden link', () => {
  it('tells search engines to ignore it', async () => {
    page(); await screen.findByText('Chapter 2: choose the ingredients')
    expect(document.head.querySelector('meta[name="robots"]').content).toMatch(/noindex/)
  })
  it('asks a signed-out visitor to log in, and does not ask the server anything', () => {
    page(null); expect(screen.getByRole('heading', { name: 'Please log in' })).toBeInTheDocument(); expect(h.load).not.toHaveBeenCalled()
  })
  it('says kindly when the person is not a paid member, and when the link is not available', async () => {
    h.load = vi.fn(async () => { throw Object.assign(new Error('x'), { reason: 'not_paid_member' }) }); const a = page()
    expect(await screen.findByRole('heading', { name: 'This is for members' })).toBeInTheDocument(); a.unmount()
    h.load = vi.fn(async () => { throw Object.assign(new Error('x'), { reason: 'not_found' }) }); page()
    expect(await screen.findByRole('heading', { name: 'This page is not available' })).toBeInTheDocument()
  })
  it('shows the closed and not-open-yet messages', async () => {
    h.load = vi.fn(async () => ({ ok: true, state: 'closed', round: { title: 'x' } })); const a = page(); expect(await screen.findByRole('heading', { name: 'This chapter has closed' })).toBeInTheDocument(); a.unmount()
    h.load = vi.fn(async () => ({ ok: true, state: 'not_yet', round: { title: 'x', opens_at: '2027-02-10T09:00:00Z' } })); page(); expect(await screen.findByText(/It opens on 10 February 2027/)).toBeInTheDocument()
  })
  it('shows the thank-you screen to someone who has already answered, with their counts', async () => {
    h.load = vi.fn(async () => ({ ok: true, state: 'sent', round: { title: 'x', kind: 'full_form' }, sent: { answered: 3, total: 10, names: 1, left: 2 } })); page()
    expect(await screen.findByRole('heading', { name: 'Thank you. Your answer is final.' })).toBeInTheDocument(); expect(screen.getByText('3 of 10')).toBeInTheDocument(); expect(screen.getByText('2 of 3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send/ })).toBeNull()
  })
})

describe('the form', () => {
  it('shows the questions in order with their numbers, "of 9" until a member says Yes to side kicks', async () => {
    page(); await screen.findByText('Chapter 2: choose the ingredients')
    expect(chip(1, 9)).toBeInTheDocument(); expect(screen.getByText('Name suggestions left this month: 3 of 3.', { exact: false })).toBeInTheDocument()
    expect(screen.queryByText('Side kicks')).toBeNull() // hidden until the member says Yes
  })
  it('shows "How many?" after Yes, then the side kicks question as number 5 of 10 with its reason, and no name box on it', async () => {
    page(); await screen.findByText('Chapter 2: choose the ingredients')
    const group = screen.getByRole('group', { name: 'Should the hero have side kicks?' }); fireEvent.click(within(group).getByLabelText('Yes'))
    expect(screen.getByText('How many?')).toBeInTheDocument(); fireEvent.click(screen.getByLabelText('2'))
    const side = screen.getByRole('group', { name: 'Side kicks' }); expect(within(side).getByText(/Question 5 of 10/)).toBeInTheDocument(); expect(within(side).getByText('Because you chose Yes')).toBeInTheDocument(); expect(within(side).queryByLabelText(/Suggest a name/)).toBeNull()
  })
  it('hides side kicks for a lone wolf and counts the questions out of nine, with no gaps', async () => {
    page(); await screen.findByText('Chapter 2: choose the ingredients')
    fireEvent.click(screen.getByLabelText('No, a lone wolf'))
    expect(screen.queryByText('Side kicks')).toBeNull(); expect(chip(9, 9)).toBeInTheDocument(); expect(screen.queryByText(/of 10/)).toBeNull()
  })
  it('counts the names being sent and says how many suggestions will be left', async () => {
    page(); await screen.findByText('Chapter 2: choose the ingredients')
    const boxes = screen.getAllByLabelText('Suggest a name (optional)'); expect(boxes).toHaveLength(5)
    fireEvent.change(boxes[0], { target: { value: 'Wren' } }); fireEvent.change(boxes[1], { target: { value: 'Ione' } })
    expect(screen.getByText('You are sending 2 names. You will have 1 suggestion left this month.')).toBeInTheDocument()
  })
  it('will not send with a fourth name, and says so in plain words', async () => {
    h.load = vi.fn(async () => ({ ...openData, left: 1 })); page(); await screen.findByText('Chapter 2: choose the ingredients')
    const boxes = screen.getAllByLabelText('Suggest a name (optional)'); fireEvent.change(boxes[0], { target: { value: 'A' } }); fireEvent.change(boxes[1], { target: { value: 'B' } })
    fireEvent.click(screen.getByLabelText(/I understand my answers are final/)); fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }))
    expect(screen.getByRole('alert')).toHaveTextContent('You have 1 name suggestion left this month'); expect(h.send).not.toHaveBeenCalled()
  })
  it('needs the final-answer tick box, warns gently about skipped questions, then sends only on "Send anyway"', async () => {
    page(); await screen.findByText('Chapter 2: choose the ingredients')
    fireEvent.click(screen.getByLabelText('Fantasy'))
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' })); expect(screen.getByRole('alert')).toHaveTextContent('tick the box'); expect(h.send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText(/I understand my answers are final/)); fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }))
    expect(screen.getByText(/You have not answered 8 questions/)).toBeInTheDocument(); expect(h.send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Send anyway' }))
    await waitFor(() => expect(h.send).toHaveBeenCalledTimes(1)); expect(h.send.mock.calls[0][0]).toMatchObject({ token: TOKEN, answers: { q1: 'Fantasy' } })
    expect(await screen.findByRole('heading', { name: 'Thank you. Your answer is final.' })).toBeInTheDocument()
  })
  it('shows the server\'s refusal (for example, already sent) and does not clear what was typed', async () => {
    h.send = vi.fn(async () => { throw Object.assign(new Error('You have used your 3 name suggestions for this month. They start again on the 1st.'), { reason: 'name_limit' }) })
    page(); await screen.findByText('Chapter 2: choose the ingredients'); fireEvent.click(screen.getByLabelText('Fantasy')); fireEvent.click(screen.getByLabelText(/I understand my answers are final/))
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' })); fireEvent.click(await screen.findByRole('button', { name: 'Send anyway' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('used your 3 name suggestions'); expect(screen.getByLabelText('Fantasy')).toBeChecked()
  })
})

describe('the other kinds of round', () => {
  it('shows the names-only round as name boxes, with three boxes for three side kicks', async () => {
    h.load = vi.fn(async () => ({ ok: true, state: 'open', round: { title: 'Names', kind: 'names_only' }, left: 3, questions: [{ id: 'n1', label: 'Side kicks', help_text: null, type: 'name_suggestion', name_box: false, name_slots: 3, show_if_question_id: null, show_if_answers: null, options: [] }] }))
    page(); await screen.findByText('Names'); expect(screen.getAllByLabelText(/Side kick \d name \(optional\)/)).toHaveLength(3); expect(screen.queryByRole('radio')).toBeNull()
  })
  it('shows the small vote as one question with a Report button on each name, and a Submit button', async () => {
    h.load = vi.fn(async () => ({ ok: true, state: 'open', round: { title: 'Vote: the villain', kind: 'small_vote' }, left: 3, questions: [{ id: 'v1', label: 'Who is the villain called?', help_text: null, type: 'choose_one', name_box: false, name_slots: 1, show_if_question_id: null, show_if_answers: null, options: [{ label: 'Wren' }, { label: 'Marrow' }, { label: 'Fitch' }] }] }))
    page(); await screen.findByText('Vote: the villain'); expect(screen.getAllByRole('radio')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Report Marrow' })); await waitFor(() => expect(h.report).toHaveBeenCalledWith({ token: TOKEN, questionId: 'v1', optionIndex: 1 }))
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument(); expect(screen.queryByText(/Change my vote/)).toBeNull()
  })
})
