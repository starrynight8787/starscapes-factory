// The newsletter's public screens: the sign-up box in the footer, and the confirm and unsubscribe pages. Opening a link must change NOTHING: only pressing the button does.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ open: true, subscribed: [], subscribeFails: null, confirmed: [], confirmResult: { ok: true, state: 'confirmed' }, confirmFails: null, left: [], leaveFails: null, slow: false }))
vi.mock('../src/newsletter/newsletterApi', () => ({
  fetchOpen: vi.fn(async () => h.open),
  subscribe: vi.fn(async (b) => { h.subscribed.push(b); if (h.slow) await new Promise((r) => setTimeout(r, 30)); if (h.subscribeFails) { const e = new Error(h.subscribeFails.message); if (h.subscribeFails.field) e.field = h.subscribeFails.field; throw e } return { ok: true } }),
  confirmSubscription: vi.fn(async (t) => { h.confirmed.push(t); if (h.confirmFails) throw new Error(h.confirmFails); return h.confirmResult }),
  unsubscribe: vi.fn(async (t) => { h.left.push(t); if (h.leaveFails) throw new Error(h.leaveFails); return { ok: true, state: 'unsubscribed' } }),
}))
import NewsletterSignup from '../src/newsletter/NewsletterSignup'
import { NewsletterConfirmPage, NewsletterUnsubscribePage } from '../src/newsletter/NewsletterLinkPage'
import { CONSENT_TEXT } from '../src/newsletter/newsletterRules'
import { PAGES } from '../src/data/pageMeta'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const TOKEN = 'ab'.repeat(24)
beforeEach(() => { Object.assign(h, { open: true, subscribed: [], subscribeFails: null, confirmed: [], confirmResult: { ok: true, state: 'confirmed' }, confirmFails: null, left: [], leaveFails: null, slow: false }) })
afterEach(() => vi.restoreAllMocks())

describe('the sign-up box', () => {
  it('shows nothing at all while the newsletter is closed', async () => {
    h.open = false; const { container } = render(<NewsletterSignup />); await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
  it('shows, when open: a heading, a labelled email box, the exact words they agree to, and a button', async () => {
    render(<NewsletterSignup />)
    expect(await screen.findByRole('heading', { level: 2, name: 'Newsletter' })).toBeInTheDocument(); expect(screen.getByLabelText('Your email address')).toBeInTheDocument()
    expect(screen.getByLabelText(CONSENT_TEXT)).toBeInTheDocument(); expect(screen.getByLabelText(CONSENT_TEXT)).not.toBeChecked(); expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })
  it('has a hidden trap box for robots that is out of sight and out of the way of keyboards and screen readers (but not display:none, which robots skip)', async () => {
    const { container } = render(<NewsletterSignup />); await screen.findByText('Newsletter')
    const trap = container.querySelector('.nl-signup__trap'); expect(trap).toHaveAttribute('aria-hidden', 'true'); expect(trap.querySelector('input')).toHaveAttribute('tabindex', '-1')
    const css = read('src/newsletter/newsletter.css'); expect(css).toMatch(/\.nl-signup__trap \{[^}]*position: absolute; left: -10000px/); expect(css).not.toMatch(/\.nl-signup__trap \{[^}]*display: none/)
  })
  it('signs up: sends the address (in lower case) and the yes, then tells them to check their email and that they are not on the list until they press the button', async () => {
    render(<NewsletterSignup />); await screen.findByText('Newsletter')
    await userEvent.type(screen.getByLabelText('Your email address'), '  Ann@Example.COM '); await userEvent.click(screen.getByLabelText(CONSENT_TEXT)); await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(h.subscribed).toEqual([{ email: 'ann@example.com', consent: true, website: '' }])
    const done = await screen.findByRole('status'); expect(done).toHaveTextContent('check your email'); expect(done).toHaveTextContent('You will not get the newsletter until you do'); expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull()
  })
  it('refuses a missing or odd address, and an unticked box, next to the box, in words, and sends nothing', async () => {
    render(<NewsletterSignup />); await screen.findByText('Newsletter')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' })); expect(screen.getByRole('alert')).toHaveTextContent('Please enter your email address'); expect(screen.getByLabelText('Your email address')).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(screen.getByLabelText('Your email address'), 'ann@example.com'); await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(document.getElementById('nl-consent-error')).toHaveTextContent('Please tick the box'); expect(screen.getByLabelText(CONSENT_TEXT)).toHaveAttribute('aria-describedby', 'nl-consent-error'); expect(h.subscribed).toEqual([])
    await userEvent.clear(screen.getByLabelText('Your email address')); await userEvent.type(screen.getByLabelText('Your email address'), 'nope'); await userEvent.click(screen.getByLabelText(CONSENT_TEXT)); await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(document.getElementById('nl-email-error')).toHaveTextContent('does not look like an email address'); expect(h.subscribed).toEqual([])
  })
  it('takes the message away as soon as they change something', async () => {
    render(<NewsletterSignup />); await screen.findByText('Newsletter'); await userEvent.click(screen.getByRole('button', { name: 'Sign up' })); expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Your email address'), 'a'); expect(screen.queryByRole('alert')).toBeNull()
  })
  it('passes the trap box on, so the server can quietly ignore a robot (the page itself never fills it)', async () => {
    render(<NewsletterSignup />); await screen.findByText('Newsletter')
    await userEvent.type(document.getElementById('nl-website'), 'http://spam.example'); await userEvent.type(screen.getByLabelText('Your email address'), 'bot@example.com'); await userEvent.click(screen.getByLabelText(CONSENT_TEXT)); await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(h.subscribed[0].website).toBe('http://spam.example')
  })
  it('puts the server\u2019s answer where it belongs, keeps what they typed, and lets them try again', async () => {
    h.subscribeFails = { message: 'We could not send the confirmation email just now. Please try again in a moment.' }; render(<NewsletterSignup />); await screen.findByText('Newsletter')
    await userEvent.type(screen.getByLabelText('Your email address'), 'ann@example.com'); await userEvent.click(screen.getByLabelText(CONSENT_TEXT)); await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not send the confirmation email'); expect(screen.getByLabelText('Your email address')).toHaveValue('ann@example.com'); expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
  })
  it('shows it is working, and cannot be pressed twice', async () => {
    h.slow = true; render(<NewsletterSignup />); await screen.findByText('Newsletter')
    await userEvent.type(screen.getByLabelText('Your email address'), 'ann@example.com'); await userEvent.click(screen.getByLabelText(CONSENT_TEXT)); await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    const busy = screen.getByRole('button', { name: 'Signing you up…' }); expect(busy).toBeDisabled(); expect(busy).toHaveAttribute('aria-busy', 'true'); await waitFor(() => expect(h.subscribed).toHaveLength(1))
  })
})

const at = (ui, url) => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>)

describe('the confirm page', () => {
  it('does NOTHING just by being opened: it asks first, and only the button confirms', async () => {
    at(<NewsletterConfirmPage />, `/newsletter/confirm?t=${TOKEN}`)
    expect(screen.getByRole('heading', { level: 1, name: 'Confirm your subscription' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Yes, send me the newsletter' })).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50)); expect(h.confirmed).toEqual([])
  })
  it('confirms when the button is pressed, sending only the code, and says they are subscribed', async () => {
    at(<NewsletterConfirmPage />, `/newsletter/confirm?t=${TOKEN}`); await userEvent.click(screen.getByRole('button', { name: 'Yes, send me the newsletter' }))
    expect(h.confirmed).toEqual([TOKEN]); expect(await screen.findByRole('status')).toHaveTextContent('You are subscribed'); expect(screen.queryByRole('button')).toBeNull()
  })
  it('says so, kindly, if they were already subscribed', async () => {
    h.confirmResult = { ok: true, state: 'already' }; at(<NewsletterConfirmPage />, `/newsletter/confirm?t=${TOKEN}`); await userEvent.click(screen.getByRole('button'))
    expect(await screen.findByRole('status')).toHaveTextContent('You are already subscribed')
  })
  it('says plainly, in an alert, if it did not work, and lets them press the button again', async () => {
    h.confirmFails = 'You have unsubscribed from the newsletter. To join again, please sign up again.'; at(<NewsletterConfirmPage />, `/newsletter/confirm?t=${TOKEN}`); await userEvent.click(screen.getByRole('button'))
    expect(await screen.findByRole('alert')).toHaveTextContent('please sign up again'); expect(screen.getByRole('button', { name: 'Yes, send me the newsletter' })).toBeEnabled()
  })
  it('shows no button, and calls nothing, when the link has no code or a wrong one', async () => {
    for (const url of ['/newsletter/confirm', '/newsletter/confirm?t=', '/newsletter/confirm?t=abc', `/newsletter/confirm?t=${TOKEN}x`, `/newsletter/confirm?t=${TOKEN.toUpperCase()}`, "/newsletter/confirm?t=a'b"]) {
      const { unmount } = at(<NewsletterConfirmPage />, url); expect(screen.queryByRole('button'), url).toBeNull(); expect(screen.getByText(/does not look right/), url).toBeInTheDocument(); unmount()
    }
    expect(h.confirmed).toEqual([])
  })
  it('has a way back to the homepage', () => { at(<NewsletterConfirmPage />, `/newsletter/confirm?t=${TOKEN}`); expect(screen.getByRole('link', { name: 'Back to the homepage' })).toHaveAttribute('href', '/') })
})

describe('the unsubscribe page', () => {
  it('does NOTHING just by being opened (mail programs open links before people do), and only the button unsubscribes', async () => {
    at(<NewsletterUnsubscribePage />, `/newsletter/unsubscribe?t=${TOKEN}`); expect(screen.getByRole('heading', { level: 1, name: 'Unsubscribe' })).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50)); expect(h.left).toEqual([]); await userEvent.click(screen.getByRole('button', { name: 'Unsubscribe me' }))
    expect(h.left).toEqual([TOKEN]); expect(await screen.findByRole('status')).toHaveTextContent('You are unsubscribed. You will not get any more newsletters')
  })
  it('says plainly if it did not work, and lets them try again', async () => {
    h.leaveFails = 'We could not do that just now. Please try again in a moment.'; at(<NewsletterUnsubscribePage />, `/newsletter/unsubscribe?t=${TOKEN}`); await userEvent.click(screen.getByRole('button', { name: 'Unsubscribe me' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not do that just now'); expect(screen.getByRole('button', { name: 'Unsubscribe me' })).toBeEnabled()
  })
  it('explains, and shows no button, when the link has no code (the link in a test email does nothing, and cannot unsubscribe anyone)', async () => {
    at(<NewsletterUnsubscribePage />, '/newsletter/unsubscribe'); expect(screen.queryByRole('button')).toBeNull(); expect(screen.getByText(/came from a test email, nothing needs doing/)).toBeInTheDocument(); expect(h.left).toEqual([])
  })
})

describe('how it is wired in, and how it looks', () => {
  it('is in the footer, has routes for both link pages, and page titles kept out of search', () => {
    expect(read('src/components/Footer.jsx')).toMatch(/<NewsletterSignup \/>\s*<hr \/>/)
    const app = read('src/App.jsx'); expect(app).toContain('<Route path="/newsletter/confirm" element={<NewsletterConfirmPage />} />'); expect(app).toContain('<Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribePage />} />')
    expect(PAGES['/newsletter/confirm']).toMatchObject({ index: false, client: true }); expect(PAGES['/newsletter/unsubscribe']).toMatchObject({ index: false, client: true })
  })
  const css = read('src/newsletter/newsletter.css'); const jsx = read('src/newsletter/NewsletterSignup.jsx')
  const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  it('keeps every colour in the dark footer box readable (4.5 to 1)', () => {
    for (const [fg, bg, what] of [['#ffffff', '#0b1230', 'title'], ['#e6ebff', '#0b1230', 'text'], ['#0e1530', '#ffffff', 'typing in the box'], ['#14306a', '#ffffff', 'button'], ['#ffb4b4', '#0b1230', 'mistake'], ['#ffffff', '#2b0f14', 'summary']]) expect(ratio(fg, bg), what).toBeGreaterThanOrEqual(4.5)
    for (const c of ['#0b1230', '#e6ebff', '#ffb4b4', '#2b0f14']) expect(css).toContain(c)
  })
  it('shows a ring when anything is tabbed to, and marks a mistake with more than colour', () => {
    expect(css).toMatch(/\.nl-signup__input:focus-visible, \.nl-signup__box:focus-visible, \.nl-signup__button:focus-visible \{ outline: 3px/); expect(css).toMatch(/\.nl-signup__error::before \{ content: "! "/); expect(css).toMatch(/\.nl-signup__input\[aria-invalid="true"\]/)
  })
  it('uses no inline styles and sets no text under 14px, and gives every box a label and a class', () => {
    expect(jsx).not.toMatch(/style=\{/); for (const m of css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])).toBeGreaterThanOrEqual(14)
    expect((jsx.match(/<input /g) || []).length).toBe((jsx.match(/<input [^>]*className="nl-signup__(input|box)"/g) || []).length); expect((jsx.match(/<label /g) || []).length).toBe(3)
  })
})
