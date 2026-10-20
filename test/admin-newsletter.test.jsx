// The owner's "Newsletter" page (/admin/newsletter): who may see it, who is signed up, writing, previewing, testing, sending (with progress, and every way it can stop), and how it is wired in.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ owner: true, fail: null, hold: false, asked: 0, data: null, saved: [], saveFails: null, tested: [], testFails: null, steps: [], stepsGiven: [], stepFails: null, deleted: [], removed: [], retried: [], issueCounter: 0 }))
vi.mock('../src/admin/newsletterAdminApi', () => ({
  fetchNewsletter: vi.fn(async () => { h.asked += 1; if (h.hold) await new Promise(() => {}); if (h.fail) throw new Error(h.fail); return JSON.parse(JSON.stringify(h.data)) }),
  saveDraft: vi.fn(async (f) => { h.saved.push(f); if (h.saveFails) { const e = new Error(h.saveFails.message); if (h.saveFails.field) e.field = h.saveFails.field; throw e } const id = f.id || `new-${++h.issueCounter}`; const issue = { id, subject: f.subject, body: f.body, status: 'draft', createdAt: '2026-10-21T10:00:00Z', updatedAt: '2026-10-21T10:00:00Z', sentAt: null, total: 0, sent: 0, failed: 0 }; const i = h.data.issues.findIndex((x) => x.id === id); if (i >= 0) h.data.issues[i] = issue; else h.data.issues.unshift(issue); return issue }),
  deleteDraft: vi.fn(async (id) => { h.deleted.push(id); h.data.issues = h.data.issues.filter((x) => x.id !== id); return { ok: true } }),
  sendTest: vi.fn(async (f) => { h.tested.push(f); if (h.testFails) throw new Error(h.testFails); return { ok: true, to: 'gill@example.com' } }),
  sendStep: vi.fn(async (id) => { h.stepsGiven.push(id); if (h.stepFails) throw new Error(h.stepFails); return h.steps.shift() || { ok: true, done: true, total: 0, sent: 0, failed: 0, remaining: 0 } }),
  retryFailed: vi.fn(async (id) => { h.retried.push(id); return { ok: true } }),
  removeSubscriber: vi.fn(async (id) => { h.removed.push(id); return { ok: true } }),
}))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import AdminNewsletter from '../src/admin/AdminNewsletter'
import { ADMIN_TOOLS } from '../src/admin/adminTools'
import { PAGES } from '../src/data/pageMeta'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const person = (id, email, status, over = {}) => ({ id, email, status, source: 'site', createdAt: '2026-10-01T10:00:00Z', confirmedAt: status === 'confirmed' ? '2026-10-02T10:00:00Z' : null, unsubscribedAt: status === 'unsubscribed' ? '2026-10-09T10:00:00Z' : null, ...over })
const issue = (id, subject, status, over = {}) => ({ id, subject, body: `Words of ${subject}`, status, createdAt: '2026-10-10T10:00:00Z', updatedAt: '2026-10-11T10:00:00Z', sentAt: status === 'sent' ? '2026-10-12T10:00:00Z' : null, total: 0, sent: 0, failed: 0, ...over })
const data = () => ({ open: true, subscribers: [person('p1', 'ann@example.com', 'confirmed'), person('p2', 'bob@example.org', 'pending'), person('p3', 'cat@example.com', 'unsubscribed'), person('p4', 'dan@example.com', 'confirmed', { source: 'ebook' })], issues: [issue('i1', 'Autumn draft', 'draft'), issue('i2', 'Half sent', 'sending', { total: 120, sent: 50 }), issue('i3', 'September news', 'sent', { total: 120, sent: 118, failed: 2 })] })
const page = () => render(<MemoryRouter><AdminNewsletter session={{ user: { id: 'gill' } }} /></MemoryRouter>)
const ready = async () => { page(); await screen.findByText('Showing 4 of 4 people') }
const rowOf = (text) => screen.getByText(text).closest('li')
const writeIt = async (subject = 'My subject', body = 'My words') => { await userEvent.clear(screen.getByLabelText('Subject')); await userEvent.type(screen.getByLabelText('Subject'), subject); await userEvent.clear(screen.getByLabelText('The newsletter')); await userEvent.type(screen.getByLabelText('The newsletter'), body) }
beforeEach(() => { Object.assign(h, { owner: true, fail: null, hold: false, asked: 0, saved: [], saveFails: null, tested: [], testFails: null, steps: [], stepsGiven: [], stepFails: null, deleted: [], removed: [], retried: [], issueCounter: 0, data: data() }); vi.spyOn(window, 'confirm').mockReturnValue(true) })
afterEach(() => vi.restoreAllMocks())

describe('who may see it', () => {
  it('is for the owner only, and asks for nothing otherwise', () => {
    h.owner = false; page(); expect(screen.getByRole('heading', { level: 1, name: 'Newsletter' })).toBeInTheDocument(); expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(h.asked).toBe(0); expect(screen.queryByLabelText('Subject')).toBeNull()
  })
  it('says Loading while it waits, and plainly when it cannot load, leaving no empty list behind', async () => {
    h.hold = true; page(); expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
  it('says plainly when it cannot load', async () => {
    h.fail = 'The newsletter could not be read just now. Please try again in a moment.'; page(); expect(await screen.findByText(/could not be read just now/)).toBeInTheDocument(); expect(document.querySelector('.nlw__list')).toBeNull(); expect(screen.queryByRole('status')).toBeNull() // no empty list left behind
  })
})

describe('whether the sign-up box is open', () => {
  it('says it is showing to visitors, or that it is not and how it opens, without stopping you writing', async () => {
    await ready(); expect(screen.getByRole('note')).toHaveTextContent('The sign-up box is showing to visitors.')
  })
  it('says how it opens when it is closed', async () => {
    h.data.open = false; await ready(); expect(screen.getByRole('note')).toHaveTextContent(/not showing to visitors yet.*NEWSLETTER_OPEN.*yes.*Privacy policy is live.*still write and test/)
  })
})

describe('who is signed up', () => {
  it('counts the people by where they are', async () => {
    await ready(); const sec = screen.getByRole('heading', { name: 'Who is signed up' }).closest('section'); const v = (l) => within(sec).getByText(l, { selector: 'dt' }).nextElementSibling.textContent
    expect([v('Confirmed'), v('Waiting to confirm'), v('Unsubscribed')]).toEqual(['2', '1', '1'])
  })
  it('lists each person with their status in words, when, and where from', async () => {
    await ready(); const ann = rowOf('ann@example.com'); expect(within(ann).getByText('Confirmed')).toBeInTheDocument(); expect(within(ann).getByText('Confirmed 2 October 2026')).toBeInTheDocument()
    expect(within(rowOf('bob@example.org')).getByText('Waiting to confirm')).toBeInTheDocument(); expect(within(rowOf('cat@example.com')).getByText('Unsubscribed 9 October 2026')).toBeInTheDocument(); expect(within(rowOf('dan@example.com')).getByText(/from the ebook page/)).toBeInTheDocument()
  })
  it('narrows by status and by search, and says so when nobody matches', async () => {
    await ready(); await userEvent.selectOptions(screen.getByLabelText('Show'), 'confirmed'); expect(screen.getByText('Showing 2 of 4 people')).toBeInTheDocument(); expect(screen.queryByText('bob@example.org')).toBeNull()
    await userEvent.type(screen.getByLabelText('Search the emails'), 'DAN'); expect(screen.getByText('Showing 1 of 4 people')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Search the emails')); await userEvent.type(screen.getByLabelText('Search the emails'), 'zzz'); expect(screen.getByText('Nobody matches.')).toBeInTheDocument()
  })
  it('says nobody has signed up yet, when nobody has', async () => { h.data.subscribers = []; page(); expect(await screen.findByText('Nobody has signed up yet.')).toBeInTheDocument(); expect(screen.getByText('Showing 0 of 0 people')).toBeInTheDocument() })
  it('removes a person for good, only after asking, with words that say what that means', async () => {
    await ready(); window.confirm.mockReturnValue(false); await userEvent.click(screen.getByRole('button', { name: 'Remove bob@example.org for good' })); expect(h.removed).toEqual([]); expect(screen.getByText('bob@example.org')).toBeInTheDocument()
    window.confirm.mockReturnValue(true); await userEvent.click(screen.getByRole('button', { name: 'Remove bob@example.org for good' }))
    expect(window.confirm).toHaveBeenLastCalledWith('Remove bob@example.org and everything kept about them, for good? If they sign up again they start from the beginning.'); expect(h.removed).toEqual(['p2']); await waitFor(() => expect(screen.queryByText('bob@example.org')).toBeNull()); expect(screen.getByText('Removed bob@example.org.')).toBeInTheDocument(); expect(screen.getByText('Showing 3 of 3 people')).toBeInTheDocument()
  })
  it('explains that someone who unsubscribes stays on the list, marked, so they are never emailed again', async () => { await ready(); expect(screen.getByText(/stays on this list, marked Unsubscribed, so they are never emailed again/)).toBeInTheDocument() })
})

describe('your newsletters', () => {
  it('lists each with where it has got to, and the right buttons for each', async () => {
    await ready(); const d = rowOf('Autumn draft'); expect(within(d).getByText('Draft', { selector: 'span' })).toBeInTheDocument(); expect(within(d).getByText('Draft, last changed 11 October 2026')).toBeInTheDocument(); expect(within(d).getByRole('button', { name: 'Edit the draft Autumn draft' })).toBeInTheDocument(); expect(within(d).getByRole('button', { name: 'Delete the draft Autumn draft' })).toBeInTheDocument()
    const s = rowOf('Half sent'); expect(within(s).getByText('Going out: 50 of 120 sent so far')).toBeInTheDocument(); expect(within(s).getByRole('button', { name: 'Carry on sending Half sent' })).toBeInTheDocument(); expect(within(s).queryByRole('button', { name: /Edit|Delete/ })).toBeNull()
    const o = rowOf('September news'); expect(within(o).getByText('Sent 12 October 2026 to 118 of 120 people')).toBeInTheDocument(); expect(within(o).getByText('2 people could not be sent.')).toBeInTheDocument(); expect(within(o).getByRole('button', { name: 'Try again to send September news to the 2 it missed' })).toBeInTheDocument(); expect(within(o).queryByRole('button', { name: /Edit|Delete/ })).toBeNull()
  })
  it('says nothing is written yet when there is nothing', async () => { h.data.issues = []; await ready(); expect(screen.getByText('Nothing written yet.')).toBeInTheDocument() })
  it('opens a draft in the form to edit', async () => {
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Edit the draft Autumn draft' })); expect(screen.getByLabelText('Subject')).toHaveValue('Autumn draft'); expect(screen.getByLabelText('The newsletter')).toHaveValue('Words of Autumn draft'); expect(screen.getByRole('button', { name: 'Start a new one' })).toBeInTheDocument()
  })
  it('deletes a draft only after asking, and clears the form if it was open there', async () => {
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Edit the draft Autumn draft' })); window.confirm.mockReturnValue(false); await userEvent.click(screen.getByRole('button', { name: 'Delete the draft Autumn draft' })); expect(h.deleted).toEqual([])
    window.confirm.mockReturnValue(true); await userEvent.click(screen.getByRole('button', { name: 'Delete the draft Autumn draft' })); expect(h.deleted).toEqual(['i1']); await waitFor(() => expect(screen.queryByText('Autumn draft')).toBeNull()); expect(screen.getByLabelText('Subject')).toHaveValue('')
  })
})

describe('writing, previewing and saving', () => {
  it('has a labelled box for the subject and the words, and a plain guide to laying it out', async () => {
    await ready(); expect(screen.getByLabelText('Subject')).toBeInTheDocument(); expect(screen.getByLabelText('The newsletter')).toBeInTheDocument(); expect(screen.getByText('How to lay it out')).toBeInTheDocument(); expect(screen.getByText(/Every newsletter ends with a link to unsubscribe and the company details automatically/)).toBeInTheDocument()
  })
  it('refuses an empty subject or empty words, next to the box, with the cursor put there, and does nothing else', async () => {
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Save draft' })); expect(screen.getByLabelText('Subject')).toHaveFocus(); expect(screen.getByLabelText('Subject')).toHaveAttribute('aria-invalid', 'true'); expect(document.getElementById('nl-subject-error')).toHaveTextContent('Please write a subject'); expect(screen.getByRole('alert')).toHaveTextContent('Please write a subject')
    await userEvent.type(screen.getByLabelText('Subject'), 'Hello'); expect(screen.queryByRole('alert')).toBeNull(); await userEvent.click(screen.getByRole('button', { name: 'Save draft' })); expect(screen.getByLabelText('The newsletter')).toHaveFocus(); expect(document.getElementById('nl-body-error')).toHaveTextContent('Please write the newsletter itself')
    expect(h.saved).toEqual([]); expect(h.tested).toEqual([]); expect(h.stepsGiven).toEqual([])
  })
  it('saves a new draft, tidied, shows it in the list, and saves over the same one next time', async () => {
    await ready(); await writeIt('  A   subject ', 'First.\n\nSecond.'); await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(screen.getByText('Draft saved.')).toBeInTheDocument()); expect(h.saved[0]).toEqual({ id: '', subject: 'A subject', body: 'First.\n\nSecond.' }); expect(screen.getByText('A subject')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('The newsletter'), ' More.'); await userEvent.click(screen.getByRole('button', { name: 'Save draft' })); await waitFor(() => expect(h.saved).toHaveLength(2)); expect(h.saved[1].id).toBe('new-1'); expect(h.data.issues.filter((i) => i.subject === 'A subject')).toHaveLength(1)
  })
  it('puts a server answer about a box next to that box, and a general one in an alert', async () => {
    h.saveFails = { message: 'The subject is too long. Keep it to 150 letters or fewer.', field: 'subject' }; await ready(); await writeIt(); await userEvent.click(screen.getByRole('button', { name: 'Save draft' })); expect(await screen.findByRole('alert')).toHaveTextContent('too long'); expect(screen.getByLabelText('Subject')).toHaveFocus()
    h.saveFails = { message: 'The draft could not be saved just now. Please try again in a moment.' }; await userEvent.click(screen.getByRole('button', { name: 'Save draft' })); await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be saved just now')); expect(screen.getAllByRole('alert')).toHaveLength(1) // the old highlight on the subject is gone
  })
  it('previews the email in a locked frame (nothing in it can run), titled for screen readers, and says the real link is different for each person', async () => {
    await ready(); await writeIt('Preview me', 'Hello **you**'); await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    const frame = screen.getByTitle('Preview of the email'); expect(frame.getAttribute('sandbox')).toBe(''); expect(frame.getAttribute('srcdoc')).toContain('<title>Preview me</title>'); expect(frame.getAttribute('srcdoc')).toContain('<strong>you</strong>'); expect(frame.getAttribute('srcdoc')).toContain('Unsubscribe</a>')
    expect(screen.getByRole('button', { name: 'Hide the preview' })).toHaveAttribute('aria-expanded', 'true'); expect(screen.getByText(/different for each person/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hide the preview' })); expect(screen.queryByTitle('Preview of the email')).toBeNull()
  })
  it('shows the problem instead of a preview when the draft is not right', async () => {
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Preview' })); expect(screen.queryByTitle('Preview of the email')).toBeNull(); expect(screen.getByText('Please write a subject: it is the first thing people see.')).toBeInTheDocument()
  })
  it('starts a new one when asked, emptying the form', async () => {
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Edit the draft Autumn draft' })); await userEvent.click(screen.getByRole('button', { name: 'Start a new one' })); expect(screen.getByLabelText('Subject')).toHaveValue(''); expect(screen.queryByRole('button', { name: 'Start a new one' })).toBeNull()
  })
})

describe('sending a test', () => {
  it('sends the words as they are on the screen to the owner, and says where it went', async () => {
    await ready(); await writeIt('Test me', 'Hello'); await userEvent.click(screen.getByRole('button', { name: 'Send a test to me' }))
    expect(h.tested).toEqual([{ subject: 'Test me', body: 'Hello' }]); expect(await screen.findByText('A test was sent to gill@example.com. It can take a minute to arrive.')).toBeInTheDocument(); expect(h.stepsGiven).toEqual([])
  })
  it('refuses a draft that is not right without sending, and says plainly if the test failed', async () => {
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Send a test to me' })); expect(h.tested).toEqual([])
    h.testFails = 'The test could not be sent. RESEND_API_KEY is not set in Vercel.'; await writeIt(); await userEvent.click(screen.getByRole('button', { name: 'Send a test to me' })); expect(await screen.findByRole('alert')).toHaveTextContent('RESEND_API_KEY is not set')
  })
})

describe('sending for real', () => {
  const press = () => userEvent.click(screen.getByRole('button', { name: /^Send to / }))
  it('says on the button how many people it will go to', async () => { await ready(); expect(screen.getByRole('button', { name: 'Send to 2 people' })).toBeInTheDocument() })
  it('asks first, naming the newsletter and the number of people, and does nothing at all if you say no', async () => {
    window.confirm.mockReturnValue(false); await ready(); await writeIt('Big news'); await press()
    expect(window.confirm).toHaveBeenCalledWith('Send “Big news” to 2 people now? You cannot take it back.'); expect(h.saved).toEqual([]); expect(h.stepsGiven).toEqual([])
  })
  it('saves the draft, then keeps sending the next batch until it is done, showing the progress, and says it has finished', async () => {
    h.steps = [{ ok: true, done: false, total: 120, sent: 50, failed: 0, remaining: 70 }, { ok: true, done: false, total: 120, sent: 100, failed: 0, remaining: 20 }, { ok: true, done: true, total: 120, sent: 120, failed: 0, remaining: 0 }]
    await ready(); await writeIt('Big news', 'Words'); await press()
    await waitFor(() => expect(screen.getByText('Finished: 120 of 120 sent.')).toBeInTheDocument()); expect(h.saved).toHaveLength(1); expect(h.stepsGiven).toEqual(['new-1', 'new-1', 'new-1']); expect(screen.getByText('120 of 120 sent')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Send to / })).toBeEnabled()
  })
  it('stops, and says so in an alert with what to do, when Resend\u2019s limit is reached, and loses nothing', async () => {
    h.steps = [{ ok: true, done: false, total: 120, sent: 100, failed: 0, remaining: 20, stopped: 'quota', message: 'Resend says the sending limit for today has been reached. Nothing was lost: press Send again later.' }]
    await ready(); await writeIt(); await press(); expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was lost: press Send again later'); expect(h.stepsGiven).toHaveLength(1); expect(screen.getByText('100 of 120 sent')).toBeInTheDocument()
  })
  it('says plainly if a step fails, and stops', async () => {
    h.stepFails = 'The newsletter could not carry on just now. Nothing was lost: press Send again in a moment.'; await ready(); await writeIt(); await press(); expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was lost'); expect(h.stepsGiven).toHaveLength(1)
  })
  it('does not send, and says why, when nobody has confirmed', async () => {
    h.data.subscribers = [person('p2', 'bob@example.org', 'pending')]; page(); await screen.findByText('Showing 1 of 1 person'); await writeIt(); await press()
    expect(screen.getByRole('alert')).toHaveTextContent('Nobody has confirmed yet'); expect(h.saved).toEqual([]); expect(h.stepsGiven).toEqual([])
  })
  it('does not send a draft that is not right', async () => {
    await ready(); await press(); expect(screen.getByLabelText('Subject')).toHaveFocus(); expect(window.confirm).not.toHaveBeenCalled(); expect(h.stepsGiven).toEqual([])
  })
  it('does not send if saving the draft failed', async () => {
    h.saveFails = { message: 'The draft could not be saved just now. Please try again in a moment.' }; await ready(); await writeIt(); await press(); await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument()); expect(h.stepsGiven).toEqual([])
  })
  it('carries on sending one that was interrupted, only after asking', async () => {
    h.steps = [{ ok: true, done: true, total: 120, sent: 120, failed: 0, remaining: 0 }]; await ready(); window.confirm.mockReturnValue(false); await userEvent.click(screen.getByRole('button', { name: 'Carry on sending Half sent' })); expect(h.stepsGiven).toEqual([])
    window.confirm.mockReturnValue(true); await userEvent.click(screen.getByRole('button', { name: 'Carry on sending Half sent' })); await waitFor(() => expect(screen.getByText('Finished: 120 of 120 sent.')).toBeInTheDocument()); expect(h.stepsGiven).toEqual(['i2'])
  })
  it('puts the ones that failed back in the queue and sends them again', async () => {
    h.steps = [{ ok: true, done: true, total: 120, sent: 120, failed: 0, remaining: 0 }]; await ready(); await userEvent.click(screen.getByRole('button', { name: 'Try again to send September news to the 2 it missed' }))
    await waitFor(() => expect(screen.getByText('Finished: 120 of 120 sent.')).toBeInTheDocument()); expect(h.retried).toEqual(['i3']); expect(h.stepsGiven).toEqual(['i3'])
  })
  it('cannot be pressed twice while it is working: every button is switched off', async () => {
    let release; h.steps = []; const api = await import('../src/admin/newsletterAdminApi'); api.sendStep.mockImplementationOnce(() => new Promise((r) => { release = () => r({ ok: true, done: true, total: 2, sent: 2, failed: 0, remaining: 0 }) }))
    await ready(); await writeIt(); await press(); const sending = await screen.findByRole('button', { name: 'Sending…' }); expect(sending).toBeDisabled(); expect(sending).toHaveAttribute('aria-busy', 'true')
    for (const name of ['Save draft', 'Send a test to me']) expect(screen.getByRole('button', { name })).toBeDisabled(); release(); await waitFor(() => expect(screen.getByRole('button', { name: /^Send to / })).toBeEnabled())
  })
})

describe('how it is wired in', () => {
  it('has a route in the app for the owner only, a tile in the Admin tools, and a page title kept out of search', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/admin\/newsletter" element=\{ <ProtectedRoute session=\{session\}> <AdminNewsletter session=\{session\} \/> <\/ProtectedRoute> \}/)
    expect(ADMIN_TOOLS.find((t) => t.name === 'Newsletter')).toMatchObject({ to: '/admin/newsletter', group: 'Write', icon: 'newsletter' }); expect(PAGES['/admin/newsletter']).toMatchObject({ title: 'Newsletter', index: false })
    expect(read('src/admin/AdminConsole.jsx')).toMatch(/^  newsletter: <>/m); expect(read('src/admin/AdminNewsletter.jsx')).toContain('room="drafting-desk"')
  })
})

describe('the look: accessible and standing on its own', () => {
  const css = read('src/admin/adminnewsletter.css'); const jsx = read('src/admin/AdminNewsletter.jsx')
  const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  it('uses no inline styles and sets no text under 14px', () => {
    expect(jsx).not.toMatch(/style=\{/); for (const m of css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('shows a ring when anything is tabbed to, makes buttons big enough to press, and lets fields shrink on a phone', () => {
    expect(css).toMatch(/\.nlw__control:focus-visible \{ outline: 3px/); expect(css).toMatch(/\.nlw__button:focus-visible \{ outline: 3px/); expect(css).toMatch(/\.nlw__button \{[^}]*min-height: 44px/); expect(css).toMatch(/\.nlw__control \{[^}]*min-width: 0/); expect(css).toMatch(/\.nlw__field \{[^}]*min-width: 0/)
  })
  it('does not rely on colour alone for a mistake, and locks the preview frame', () => {
    expect(css).toMatch(/\.nlw__error::before \{ content: "! "/); expect(css).toMatch(/\.nlw__control\[aria-invalid="true"\]/); expect(jsx).toMatch(/sandbox=""/); expect(jsx).toMatch(/title="Preview of the email"/)
  })
  it('gives every box a label tied to it, the textarea included, and every control a class', () => {
    expect((jsx.match(/<label htmlFor="nl-/g) || []).length).toBe(4); expect(jsx).toMatch(/<textarea id="nl-body" className="nlw__control/)
    expect((jsx.match(/<(input|select|textarea|button|form)\b(?![^>]*className=)/g) || [])).toEqual([])
  })
  it('keeps each status tag readable (4.5 to 1)', () => {
    for (const [bg, fg] of [['#14306a', '#ffffff'], ['#ffe27a', '#0e1530'], ['#4a5170', '#ffffff']]) expect(ratio(bg, fg)).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(/\.nlw__chip \{[^}]*background: var\(--sf-navy-700, #14306a\); color: #fff/); expect(css).toMatch(/\.nlw__chip--pending, \.nlw__chip--sending \{ background: #ffe27a; color: #0e1530/); expect(css).toMatch(/\.nlw__chip--unsubscribed, \.nlw__chip--draft \{ background: #4a5170; color: #fff/)
  })
})
