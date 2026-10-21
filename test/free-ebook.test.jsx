// The Free Ebook: its rules, its page, and how it is wired in. The ebook and the newsletter are ONE list (21 October 2026): asking for the ebook signs someone up to the newsletter, with the same
// confirm-by-email step. The server side is tested in test/ebook-one-list.test.js and the confirm page in test/ebook-one-list-pages.test.jsx.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanSignup, isEmail } from '../src/ebook/ebookRules'
import { EBOOK } from '../src/ebook/ebookConfig'
import { findDoor } from '../src/doors/doorsData'

const h = vi.hoisted(() => ({ open: true, subscribed: [], fail: null }))
vi.mock('../src/newsletter/newsletterApi', () => ({
  fetchOpen: vi.fn(async () => h.open),
  subscribe: vi.fn(async (b) => { h.subscribed.push(b); if (h.fail) { const e = new Error(h.fail.message); if (h.fail.field) e.field = h.fail.field; throw e } return { ok: true } }),
}))
import FreeEbookPage from '../src/ebook/FreeEbookPage'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const originalFile = EBOOK.file
beforeEach(() => { Object.assign(h, { open: true, subscribed: [], fail: null }) })
afterEach(() => { EBOOK.file = originalFile; vi.restoreAllMocks() })

describe('the rules', () => {
  it('want a proper email and a ticked box, in plain words', () => {
    expect(cleanSignup({ email: ' Name@Example.COM ', consent: true })).toEqual({ ok: true, email: 'name@example.com' })
    expect(cleanSignup({ email: '', consent: true }).errors.email).toMatch(/Enter your email/)
    expect(cleanSignup({ email: 'not an email', consent: true }).errors.email).toMatch(/name@example\.com/)
    expect(cleanSignup({ email: 'a@b.co', consent: false }).errors.consent).toMatch(/Tick the box/)
    expect(cleanSignup({ email: 'a@b.co' }).ok).toBe(false)
    expect(cleanSignup(null).ok).toBe(false)
  })
  it('refuse an address that could break an email header, or is far too long', () => {
    for (const bad of ['a@b.co\nBcc: x@y.co', 'a b@c.co', '<a@b.co>', `${'x'.repeat(250)}@b.co`]) expect(isEmail(bad), bad).toBe(false)
  })
  it('use the words in the design, and the tick box says yes to BOTH the ebook and the newsletter, with the way out', () => {
    expect(EBOOK.consent).toBe('Yes, send me the free ebook and the Starscapes Factory newsletter by email: new posts and news. I can unsubscribe at any time, with the link in every email.')
    expect(EBOOK.title).toBe('Leading from the Middle: the free ebook')
    expect(EBOOK.inside).toHaveLength(3)
  })
})

describe('the retired database file (the free ebook now joins the newsletter list, so nothing writes here any more)', () => {
  const sql = read('sql/ebook-signups.sql')
  const live = sql.split('-- TO UNDO')[0]
  it('is closed to every visitor: row level security on, no policies, and no rights for the public roles', () => {
    expect(live).toContain('alter table public.ebook_signups enable row level security')
    expect(live).not.toMatch(/create policy/)
    expect(live).toMatch(/revoke all on public\.ebook_signups from anon, authenticated/)
    expect(live).not.toMatch(/grant [^;]*to (anon|authenticated)/)
  })
  it('keeps each address once, in lower case, with the words they agreed to', () => {
    expect(live).toMatch(/email text not null unique check \(char_length\(email\) between 3 and 254 and email = lower\(email\)\)/)
    expect(live).toMatch(/consent_text text not null/)
    expect(live).toContain('create table if not exists')
  })
  it('says it is retired, and how to remove it', () => {
    expect(sql.split('\n')[0]).toMatch(/^-- RETIRED on 21 October 2026: the free ebook now joins the NEWSLETTER list/); expect(sql).toMatch(/drop table public\.ebook_signups/)
  })
  it('says how to confirm it and how to undo it', () => {
    expect(sql).toMatch(/select count\(\*\) from pg_policies where tablename = 'ebook_signups'/)
    expect(sql).toContain('drop table if exists public.ebook_signups')
  })
})

describe('the page', () => {
  const show = () => render(<MemoryRouter><FreeEbookPage /></MemoryRouter>)
  const fill = (email = 'Name@Example.com', tick = true) => {
    fireEvent.change(screen.getByLabelText('Your email address'), { target: { value: email } })
    if (tick) fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Get the free ebook' }))
  }

  it('has the design\u2019s words, a way back, and says plainly what happens next: an email to confirm, then the ebook and the newsletter, never shared, with the privacy policy', () => {
    show()
    expect(screen.getByRole('heading', { level: 1, name: 'Leading from the Middle: the free ebook' })).toBeInTheDocument()
    expect(screen.getByText('A short guide for people who lead without the big title. Read it in an afternoon.')).toBeInTheDocument()
    for (const line of EBOOK.inside) expect(screen.getByText(line)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Leadership Lounge/ })).toHaveAttribute('href', '/leadership-lounge')
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/page/privacy')
    const small = screen.getByText(/You will get an email asking you to confirm/); expect(small).toHaveTextContent('you will also get the newsletter'); expect(small).toHaveTextContent('never shared'); expect(small).toHaveTextContent('unsubscribe at any time')
    expect(screen.getByLabelText(EBOOK.consent)).not.toBeChecked()
  })
  it('does not promise a download straight away: that comes after confirming', () => {
    show(); expect(document.body.textContent).not.toMatch(/straight away/i)
  })
  it('does not send anything without a proper email and the tick, and says why in words with links to the fields', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Get the free ebook' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Enter your email address.')
    expect(alert).toHaveTextContent('Tick the box')
    expect(screen.getByLabelText('Your email address')).toHaveAttribute('aria-invalid', 'true')
    expect(h.subscribed).toHaveLength(0)
  })
  it('signs them up to the newsletter list as an ebook sign-up: the lower-cased email, the tick, the hidden box (empty), and where it came from', async () => {
    show(); fill()
    await screen.findByRole('heading', { level: 1, name: 'Check your email' })
    expect(h.subscribed).toEqual([{ email: 'name@example.com', consent: true, website: '', source: 'ebook' }])
  })
  it('has a hidden box for robots that real visitors cannot reach by keyboard or screen reader', () => {
    const { container } = show()
    const trap = container.querySelector('input[name="website"]')
    expect(trap).toHaveAttribute('tabindex', '-1')
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull()
  })
  it('after signing up, says to check the email and press the button, that nothing comes until they do, and shows no download and no "you are in"', async () => {
    show(); fill()
    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
    const status = screen.getByRole('status'); expect(status).toHaveTextContent('Thank you. I have sent you an email.'); expect(status).toHaveTextContent('Press the button in it to confirm'); expect(status).toHaveTextContent('You will not get the ebook, or the newsletter, until you do'); expect(status).toHaveTextContent('spam')
    expect(screen.queryByRole('link', { name: /Download the/ })).toBeNull(); expect(document.body.textContent).not.toMatch(/You are in/)
  })
  it('while there is no PDF, says the ebook is not quite ready and the link will be emailed; once there is one, says the download waits on the page the button opens', async () => {
    show(); fill(); expect(await screen.findByText(/not quite ready to download. As soon as it is, I will email you the link/)).toBeInTheDocument()
    EBOOK.file = '/downloads/leading-from-the-middle.pdf'; const again = show(); again.unmount(); show(); fill()
    expect(await screen.findByText(/The download will be waiting for you on the page the button opens/)).toBeInTheDocument(); expect(screen.queryByRole('link', { name: /Download the/ })).toBeNull()
  })
  it('says whatever the answer, the same thing: it never tells anyone whether an address was already signed up', async () => {
    show(); fill('known@example.com'); await screen.findByRole('heading', { level: 1, name: 'Check your email' }); const first = document.body.textContent; document.body.innerHTML = ''
    show(); fill('new@example.com'); await screen.findByRole('heading', { level: 1, name: 'Check your email' }); expect(document.body.textContent).toBe(first)
  })
  it('puts a problem with the email or the tick under its box (the server\u2019s words), and any other problem in plain words, keeping what was typed and never saying it worked', async () => {
    h.fail = { message: 'That does not look like an email address. Please check it.', field: 'email' }; show(); fill('a@b.co')
    expect((await screen.findAllByText('That does not look like an email address. Please check it.')).length).toBeGreaterThanOrEqual(1) // in the summary at the top and under the box
    expect(screen.getByLabelText('Your email address')).toHaveAttribute('aria-invalid', 'true'); expect(screen.queryByRole('heading', { level: 1, name: 'Check your email' })).toBeNull(); expect(screen.getByLabelText('Your email address')).toHaveValue('a@b.co')
  })
  it('says plainly when it did not work, keeps what was typed, and does not say it is done', async () => {
    h.fail = { message: 'That did not go through just now. Please try again in a moment.' }; show(); fill('a@b.co')
    expect(await screen.findByText(/did not go through just now/)).toBeInTheDocument(); expect(screen.queryByRole('heading', { level: 1, name: 'Check your email' })).toBeNull(); expect(screen.getByLabelText('Your email address')).toHaveValue('a@b.co')
  })
  it('shows no form, and says it is not open just yet, while the newsletter is closed (the same switch as the sign-up box in the footer)', async () => {
    h.open = false; const { container } = show()
    expect(await screen.findByText(/The free ebook is not open just yet/)).toBeInTheDocument(); expect(container.querySelector('form')).toBeNull(); expect(h.subscribed).toHaveLength(0)
  })
  it('shows the form while it is still asking (so a slow answer never hides the page), and once open', async () => {
    show(); expect(screen.getByRole('button', { name: 'Get the free ebook' })).toBeInTheDocument(); await waitFor(() => expect(screen.getByRole('button', { name: 'Get the free ebook' })).toBeInTheDocument())
  })
})

describe('how it is wired in', () => {
  it('is the Lounge\u2019s designed page behind its door, and uses no inline styles', () => {
    expect(findDoor('leadership-lounge', 'free-ebook').page).toEqual({ layout: 'custom' })
    expect(read('src/rooms/RoomRoutes.jsx')).toMatch(/'leadership-lounge\/free-ebook': FreeEbookPage/)
    expect(read('src/ebook/FreeEbookPage.jsx')).not.toMatch(/style=\{\{/)
  })
  it('says in its own file how to add the PDF, and starts with no file so nothing is offered that is not there', () => {
    expect(read('src/ebook/ebookConfig.js')).toMatch(/public\/downloads\//)
    expect(originalFile).toBe('')
  })
  it('sets no text under 14px', () => {
    for (const m of read('src/ebook/ebook.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
