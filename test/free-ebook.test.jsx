// The Free Ebook: the rules, the server sign-up, the database file, and the two pages.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanSignup, isEmail } from '../src/ebook/ebookRules'
import { EBOOK, SITE_URL } from '../src/ebook/ebookConfig'
import { handleSignup, saveSignup, ebookEmail } from '../lib/ebookSignup.js'
import signupHandler from '../api/ebook-signup.js'
import FreeEbookPage from '../src/ebook/FreeEbookPage'
import { findDoor } from '../src/doors/doorsData'
import { CONTACT_EMAIL } from '../src/data/contact'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const res = () => { const r = { headers: {}, code: 0, body: undefined, setHeader(k, v) { r.headers[k] = v }, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }; return r }
const originalFile = EBOOK.file
afterEach(() => { EBOOK.file = originalFile; vi.unstubAllGlobals(); vi.unstubAllEnvs() })

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
  it('use the words in the design', () => {
    expect(EBOOK.consent).toBe('Yes, send me the free ebook and your free blog posts by email. I can unsubscribe at any time.')
    expect(EBOOK.title).toBe('Leading from the Middle: the free ebook')
    expect(EBOOK.inside).toHaveLength(3)
  })
})

describe('the server sign-up', () => {
  const deps = () => ({ save: vi.fn(async () => {}), send: vi.fn(async () => ({ ok: true })), now: () => new Date('2026-10-17T12:00:00Z') })
  it('keeps a good sign-up (lower-cased) and says ok, with no download while there is no PDF, and sends no email', async () => {
    const d = deps()
    const out = await handleSignup({ email: 'Name@Example.com', consent: true, website: '' }, d)
    expect(d.save).toHaveBeenCalledWith('name@example.com')
    expect(out).toEqual({ status: 200, body: { ok: true, file: '', emailed: false } })
    expect(d.send).not.toHaveBeenCalled()
  })
  it('once there is a PDF, gives its address and emails the link from imagine@, once a day at most', async () => {
    EBOOK.file = '/downloads/leading-from-the-middle.pdf'
    const d = deps()
    const out = await handleSignup({ email: 'name@example.com', consent: true }, d)
    expect(out.body).toEqual({ ok: true, file: '/downloads/leading-from-the-middle.pdf', emailed: true })
    const sent = d.send.mock.calls[0][0]
    expect(sent.to).toBe('name@example.com')
    expect(sent.text).toContain(`${SITE_URL}/downloads/leading-from-the-middle.pdf`)
    expect(sent.html).toContain(`href="${SITE_URL}/downloads/leading-from-the-middle.pdf"`)
    expect(sent.idempotencyKey).toBe('ebook-name@example.com-2026-10-17')
    expect(sent.text).toContain(CONTACT_EMAIL)
  })
  it('still gives the download when the email fails, and says it was not emailed', async () => {
    EBOOK.file = '/downloads/x.pdf'
    const d = deps(); d.send = vi.fn(async () => ({ ok: false, reason: 'unreachable' }))
    const out = await handleSignup({ email: 'a@b.co', consent: true }, d)
    expect(out.body).toMatchObject({ ok: true, file: '/downloads/x.pdf', emailed: false })
  })
  it('refuses a sign-up with no tick or a bad address, and keeps nothing', async () => {
    const d = deps()
    const out = await handleSignup({ email: 'a@b.co', consent: false }, d)
    expect(out.status).toBe(400); expect(out.body.errors.consent).toBeTruthy()
    expect((await handleSignup({ email: 'nope', consent: true }, d)).status).toBe(400)
    expect(d.save).not.toHaveBeenCalled()
  })
  it('gives a robot (it filled the hidden box) a quiet thank-you and keeps nothing and sends nothing', async () => {
    EBOOK.file = '/downloads/x.pdf'
    const d = deps()
    const out = await handleSignup({ email: 'bot@example.com', consent: true, website: 'http://spam.example' }, d)
    expect(out).toEqual({ status: 200, body: { ok: true, file: '', emailed: false } })
    expect(d.save).not.toHaveBeenCalled(); expect(d.send).not.toHaveBeenCalled()
  })
  it('says plainly it did not work (and sends no email) when the email could not be kept', async () => {
    EBOOK.file = '/downloads/x.pdf'
    const d = deps(); d.save = vi.fn(async () => { throw new Error('db down') })
    const out = await handleSignup({ email: 'a@b.co', consent: true }, d)
    expect(out).toEqual({ status: 502, body: { ok: false } })
    expect(d.send).not.toHaveBeenCalled()
  })
  it('asks the database to ignore a repeat of the same address, and keeps the words they agreed to', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://db.example.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
    const calls = []
    vi.stubGlobal('fetch', vi.fn(async (url, init) => { calls.push([url, init]); return { ok: true, status: 201 } }))
    await saveSignup('a@b.co')
    expect(calls[0][0]).toBe('https://db.example.co/rest/v1/ebook_signups?on_conflict=email')
    expect(calls[0][1].headers.Prefer).toBe('resolution=ignore-duplicates,return=minimal')
    expect(JSON.parse(calls[0][1].body)).toEqual({ email: 'a@b.co', consent_text: EBOOK.consent })
  })
  it('puts the email\u2019s link in as an address, not as markup', () => {
    EBOOK.file = '/d.pdf?a=1&b="2"'
    expect(ebookEmail(EBOOK.file).html).not.toMatch(/b="2"/)
    expect(ebookEmail(EBOOK.file).html).toContain('&amp;')
  })
})

describe('the server function', () => {
  it('only takes POST, and says plainly if the body is not usable', async () => {
    const get = res(); await signupHandler({ method: 'GET' }, get); expect(get.code).toBe(405)
    const bad = res(); await signupHandler({ method: 'POST', body: null }, bad); expect(bad.code).toBe(400)
    const text = res(); await signupHandler({ method: 'POST', body: 'not json' }, text); expect(text.code).toBe(400)
    expect(get.headers['Cache-Control']).toBe('no-store')
  })
})

describe('the database file', () => {
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
  it('says how to confirm it and how to undo it', () => {
    expect(sql).toMatch(/select count\(\*\) from pg_policies where tablename = 'ebook_signups'/)
    expect(sql).toContain('drop table if exists public.ebook_signups')
  })
})

describe('the page', () => {
  const show = () => render(<MemoryRouter><FreeEbookPage /></MemoryRouter>)
  const answer = (body, ok = true) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })))
  const fill = (email = 'Name@Example.com', tick = true) => {
    fireEvent.change(screen.getByLabelText('Your email address'), { target: { value: email } })
    if (tick) fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Get the free ebook' }))
  }
  beforeEach(() => answer({ ok: true, file: '', emailed: false }))

  it('has the design\u2019s words, a way back, and the promise about the email and the privacy policy', () => {
    show()
    expect(screen.getByRole('heading', { level: 1, name: 'Leading from the Middle: the free ebook' })).toBeInTheDocument()
    expect(screen.getByText('A short guide for people who lead without the big title. Read it in an afternoon.')).toBeInTheDocument()
    for (const line of EBOOK.inside) expect(screen.getByText(line)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Leadership Lounge/ })).toHaveAttribute('href', '/leadership-lounge')
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/page/privacy')
    expect(screen.getByText(/never shared/)).toBeInTheDocument()
    expect(screen.getByLabelText(EBOOK.consent)).not.toBeChecked()
  })
  it('does not send anything without a proper email and the tick, and says why in words with links to the fields', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Get the free ebook' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Enter your email address.')
    expect(alert).toHaveTextContent('Tick the box')
    expect(screen.getByLabelText('Your email address')).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('sends the lower-cased email, the tick, and the hidden box (empty), to the server', async () => {
    show(); fill()
    await screen.findByText('You are in')
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/ebook-signup')
    expect(JSON.parse(init.body)).toEqual({ email: 'name@example.com', consent: true, website: '' })
  })
  it('has a hidden box for robots that real visitors cannot reach by keyboard or screen reader', () => {
    const { container } = show()
    const trap = container.querySelector('input[name="website"]')
    expect(trap).toHaveAttribute('tabindex', '-1')
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull()
  })
  it('thanks them, and while there is no PDF says the ebook is being finished and does not claim an email was sent', async () => {
    show(); fill()
    expect(await screen.findByRole('heading', { level: 1, name: 'Thank you. Your ebook is being finished.' })).toBeInTheDocument()
    expect(screen.getByText(/I will email you the link as soon as it is/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Download the ebook/ })).toBeNull()
    expect(screen.queryByText(/We have also emailed you/)).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('You are in. The first post is on its way.')
  })
  it('once there is a PDF, offers the download and, only if it was sent, says the link was emailed', async () => {
    answer({ ok: true, file: '/downloads/leading-from-the-middle.pdf', emailed: true })
    show(); fill()
    expect(await screen.findByRole('heading', { level: 1, name: 'Thank you. Your ebook is ready.' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Download the ebook (PDF)' })
    expect(link).toHaveAttribute('href', '/downloads/leading-from-the-middle.pdf'); expect(link).toHaveAttribute('download')
    expect(screen.getByText('PDF, about 40 pages.')).toBeInTheDocument()
    expect(screen.getByText(/We have also emailed you the link/)).toBeInTheDocument()
  })
  it('does not claim an email when the download is there but the email failed', async () => {
    answer({ ok: true, file: '/downloads/x.pdf', emailed: false })
    show(); fill()
    await screen.findByRole('link', { name: 'Download the ebook (PDF)' })
    expect(screen.queryByText(/We have also emailed you/)).toBeNull()
  })
  it('says plainly when it did not work, keeps what was typed, and does not say "you are in"', async () => {
    answer({ ok: false }, false)
    show(); fill('a@b.co')
    expect(await screen.findByText(/did not go through just now/)).toBeInTheDocument()
    expect(screen.queryByText('You are in')).toBeNull()
    expect(screen.getByLabelText('Your email address')).toHaveValue('a@b.co')
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
