// The tester kit: the private tester page, the real Contact page, and the four text pages that stay hidden until they are ready.
import { describe, it, expect, vi } from 'vitest'
import { DRAFT } from './legalState'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('../src/data/channels', () => ({ channels: [{ slug: 'factory-floor', name: 'The Factory Floor', tagline: 'Posts.' }, { slug: 'art-loft', name: 'The Art Loft', tagline: 'Prints.' }] }))
vi.mock('../src/supabaseClient', () => ({ supabase: { auth: { signOut: vi.fn(), getSession: vi.fn(async () => ({ data: { session: null } })), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })) } } }))
import TestersPage from '../src/testers/TestersPage'
import { TESTERS } from '../src/testers/testersData'
import StaticPage from '../src/pages/StaticPage'
import Footer from '../src/components/Footer'
import Navbar from '../src/components/Navbar'
import { staticPages, pageIsReady } from '../src/data/staticPages'
import { PAGES } from '../src/data/pageMeta'
import { CONTACT_EMAIL } from '../src/data/contact'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const atSlug = (slug) => render(<MemoryRouter initialEntries={[`/page/${slug}`]}><Routes><Route path="/page/:slug" element={<StaticPage />} /></Routes></MemoryRouter>)
const testers = () => render(<MemoryRouter><TestersPage /></MemoryRouter>)

describe('the private tester page', () => {
  it('thanks them, says the site is not open, and has the sections in order', () => {
    testers()
    expect(screen.getByRole('heading', { level: 1, name: 'Thank you for testing Starscapes Factory' })).toBeInTheDocument()
    expect(screen.getByText(/The site is not open to the public yet/)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['What is pretend', 'The test card', 'What to try', 'How to tell me what you found'])
    expect(screen.getByRole('link', { name: /Back to the home page/ })).toHaveAttribute('href', '/')
  })
  it('says what is pretend, plainly: no real money, no real card, and that an account sends a real email', () => {
    testers()
    const pretend = screen.getByRole('heading', { name: 'What is pretend' }).closest('section')
    expect(pretend).toHaveTextContent('Payments are in test mode. No real money is taken, and nothing is made or posted to anyone.')
    expect(pretend).toHaveTextContent('Please do not type a real card number anywhere.')
    expect(pretend).toHaveTextContent('a real email is sent to the address you sign up with')
  })
  it('gives Stripe\u2019s test card, with the other details, and the card that fails', () => {
    testers()
    const card = screen.getByRole('heading', { name: 'The test card' }).closest('section')
    expect(within(card).getByText('4242 4242 4242 4242').tagName).toBe('CODE')
    expect(card).toHaveTextContent('Any date in the future')
    expect(card).toHaveTextContent('Any three numbers')
    expect(within(card).getByText('4000 0000 0000 0002').tagName).toBe('CODE')
    expect(card.querySelectorAll('dt')).toHaveLength(4)
  })
  it('lists what to try, and how to tell Gill, with an email link from contact.js that has a subject', () => {
    testers()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(TESTERS.tryThese.length + TESTERS.tell.length)
    const mail = screen.getByRole('link', { name: `Email ${CONTACT_EMAIL}` })
    expect(mail).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}?subject=Starscapes%20Factory%20test%20feedback`)
    expect(screen.getByText(/A screenshot, if you can/)).toBeInTheDocument()
  })
  it('is not linked from the footer or the menu, and is private: no listing, no sitemap', () => {
    expect(PAGES['/testers']).toMatchObject({ index: false })
    expect(read('src/components/Footer.jsx')).not.toMatch(/testers/)
    expect(read('src/components/Navbar.jsx')).not.toMatch(/testers/)
    expect(read('src/App.jsx')).toMatch(/<Route path="\/testers" element=\{<TestersPage \/>\} \/>/)
  })
  it('uses no inline styles and no text under 14px, and the address is not typed into the page', () => {
    expect(read('src/testers/TestersPage.jsx')).not.toMatch(/style=\{\{/)
    expect(read('src/testers/TestersPage.jsx')).not.toMatch(/@starscapesfactory/)
    for (const m of read('src/testers/testers.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})

describe('the Contact page', () => {
  it('has real words, no placeholder, and the address as a link from contact.js', () => {
    const { container } = atSlug('contact')
    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument()
    expect(container.textContent).toMatch(/I read every message myself/)
    expect(container.textContent).toMatch(/put your order number in the message/)
    expect(container.textContent).not.toMatch(/\[|Replace/)
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`)
    expect(staticPages.find((p) => p.slug === 'contact').content).not.toContain('@') // the address is not typed into the text
  })
})

describe.runIf(DRAFT)('the four pages that are not ready', () => {
  const unready = ['about', 'terms', 'privacy', 'ai-policy']
  it('are marked not ready, and Contact is marked ready', () => {
    for (const slug of unready) expect(pageIsReady(slug), slug).toBe(false)
    expect(pageIsReady('contact')).toBe(true)
    expect(pageIsReady('nonsense')).toBe(false)
  })
  it.each(unready)('%s shows a plain "not ready yet" message at its address, and never its placeholder text', (slug) => {
    const { container } = atSlug(slug)
    expect(screen.getByText('This page is not ready yet. Please check back soon.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\[|Replace|Last updated/)
    expect(screen.getByRole('link', { name: /Back home/ })).toHaveAttribute('href', '/')
  })
  it('are not in the footer: only Contact is', () => {
    const { container } = render(<MemoryRouter><Footer social={[]} /></MemoryRouter>)
    const pageLinks = [...container.querySelectorAll('a[href^="/page/"]')].map((a) => a.textContent)
    expect(pageLinks).toEqual(['Contact'])
  })
  it('are not in the menu on a computer or a phone: no About link', async () => {
    const { container } = render(<MemoryRouter><Navbar session={null} /></MemoryRouter>)
    expect(container.querySelector('a[href="/page/about"]')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(container.querySelector('a[href="/page/about"]')).toBeNull()
  })
  it('come back by themselves when they are marked ready: both places read the same flag', () => {
    expect(read('src/components/Footer.jsx')).toMatch(/pageIsReady\(/)
    expect((read('src/components/Navbar.jsx').match(/pageIsReady\('about'\)/g) || []).length).toBe(2)
    expect(read('src/data/staticPages.js')).toMatch(/Set it to true when the page has its real words/)
  })
})
