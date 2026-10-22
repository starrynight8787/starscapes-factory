// The newsletter is free for anyone: the box says so, and nothing about signing up needs an account, a pass or a payment (SFW-250).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ subscribed: [] }))
vi.mock('../src/newsletter/newsletterApi', () => ({ fetchOpen: vi.fn(async () => true), subscribe: vi.fn(async (b) => { h.subscribed.push(b) }) }))
import NewsletterSignup from '../src/newsletter/NewsletterSignup'
import { CONSENT_TEXT } from '../src/newsletter/newsletterRules'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
beforeEach(() => { h.subscribed = [] })
afterEach(() => vi.restoreAllMocks())

describe('the box says it is free', () => {
  it('says so in plain words, before anything else it says: free, and no account or pass needed', async () => {
    const { container } = render(<NewsletterSignup />); await screen.findByRole('heading', { level: 2, name: 'Newsletter' })
    const line = container.querySelector('.nl-signup__text').textContent; expect(line).toMatch(/^Free, with no account or pass needed\./); expect(line).toContain('New posts and news from Starscapes Factory, by email')
  })
  it('does not ask for anything but an email address and a tick: no name, no password, no card, no pass to choose', async () => {
    const { container } = render(<NewsletterSignup />); await screen.findByLabelText('Your email address')
    const visible = [...container.querySelectorAll('input')].filter((i) => !i.closest('[aria-hidden="true"]')); expect(visible.map((i) => i.type).sort()).toEqual(['checkbox', 'email'])
    expect(container.querySelector('select, textarea')).toBeNull(); expect(container.textContent).not.toMatch(/password|card number|payment|pay |subscribe now|price|£/i)
  })
  it('works for someone who is signed out and holds no pass: it needs nothing from them but those two things', async () => {
    render(<NewsletterSignup />); await userEvent.type(await screen.findByLabelText('Your email address'), 'visitor@example.com'); await userEvent.click(screen.getByLabelText(CONSENT_TEXT)); await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByRole('status')).toHaveTextContent('check your email'); expect(h.subscribed).toEqual([{ email: 'visitor@example.com', consent: true, website: '' }])
  })
})

describe('nothing behind it needs an account, a pass or a payment', () => {
  it('the box and the page that talks to the server hold no sign-in, no session, no membership and no token', () => {
    for (const f of ['src/newsletter/NewsletterSignup.jsx', 'src/newsletter/newsletterApi.js']) expect(read(f), f).not.toMatch(/supabase|session|Authorization|Bearer|membership|passIndex|useIsOwner|stripe/i)
  })
  it('the public side of the server (sign up, confirm, leave) never asks who someone is or what they hold, and never touches Stripe', () => {
    const file = read('lib/newsletter.js'); const pub = file.slice(file.indexOf('async function'), file.indexOf('// The daily tidy-up')) // the public code: not the daily tidy-up, which needs its own secret
    expect(pub.length).toBeGreaterThan(1000); expect(pub).toMatch(/async function unsubscribe/); expect(pub).not.toMatch(/requireOwner|ownerGuard|memberships|stripe|Bearer|auth\.getUser/i)
  })
  it('the box sits in the footer with no condition about being signed in or holding a pass: its ONE condition is that the page is not the children\'s Clubhouse (SFW-264)', () => {
    const footer = read('src/components/Footer.jsx')
    expect(footer).toMatch(/\{!onClubhouse\(pathname\) && <NewsletterSignup \/>\}/)
    expect(footer).not.toMatch(/\b(session|signedIn|isMember|hasPass|holdsPass|useIsOwner|useSession|supabase)\b/)
  })
  it('the words people agree to say nothing about a price or a pass, and promise only the newsletter and the way out', () => {
    expect(CONSENT_TEXT).toMatch(/newsletter by email/); expect(CONSENT_TEXT).toMatch(/unsubscribe at any time/); expect(CONSENT_TEXT).not.toMatch(/pass|pay|£|price|member/i)
  })
})
