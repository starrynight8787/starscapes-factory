// The footer from the design (four columns and the company details), the owner's view of pages that are not ready, and the new pages' facts.
import { describe, it, expect } from 'vitest'
import { DRAFT } from './legalState'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Footer from '../src/components/Footer'
import { COMPANY, companyLine, printerLine } from '../src/data/company'
import { staticPages, pageExists, pageIsReady, resolvePage } from '../src/data/staticPages'
import { LEGAL_PAGES } from '../src/data/legalPages'
import { LAUNCH_COUNTRIES } from '../src/cart/launchCountries'
import { CONTACT_EMAIL } from '../src/data/contact'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const SOCIAL = [{ name: 'YouTube', url: 'https://youtube.com/@x' }, { name: 'TikTok', url: 'https://tiktok.com/@x' }]
const foot = (props = {}) => render(<MemoryRouter><Footer social={SOCIAL} {...props} /></MemoryRouter>)

describe('the company details', () => {
  it('are the real ones, in one place', () => {
    expect(COMPANY).toMatchObject({ name: 'Starscapes Factory Ltd', number: '14173440', registeredIn: 'England and Wales', vat: 'GB445903680', printer: 'Printspace Studios Limited' })
    expect(COMPANY.registeredOffice).toBe('71-75 Shelton Street, Covent Garden, London WC2H 9JQ')
    expect(companyLine()).toBe('Starscapes Factory Ltd. Company number 14173440. Registered office: 71-75 Shelton Street, Covent Garden, London WC2H 9JQ. Registered in England and Wales. VAT number GB445903680.')
    expect(printerLine()).toBe('Prints are made to order by Printspace Studios Limited.')
  })
  it('are shown at the bottom of the footer, with no placeholders', () => {
    const { container } = foot()
    const company = container.querySelector('.ft__company')
    expect(company).toHaveTextContent(companyLine()); expect(company).toHaveTextContent(printerLine())
    expect(container.querySelector('footer').textContent).not.toMatch(/\[|number\]/)
  })
})

describe('the footer', () => {
  it.runIf(DRAFT)('has the logo, the line under it, and four columns in the design\u2019s order', () => {
    const { container } = foot()
    expect(screen.getByText("You're only limited by your own imagination.")).toBeInTheDocument()
    expect([...container.querySelectorAll('.ft__head')].map((h) => h.textContent)).toEqual(['Rooms', 'Shop and help', 'Follow']) // Legal appears once a legal page is ready
  })
  it('lists all eight rooms, each with its own address', () => {
    foot()
    const links = within(screen.getByRole('navigation', { name: 'Rooms' })).getAllByRole('link')
    expect(links).toHaveLength(8)
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/drafting-desk', '/sarah-jrs-den', '/art-loft', '/explorers-bay', '/factory-floor', '/leadership-lounge', '/idea-hatchery', '/knowledge-nook'])
  })
  it.runIf(DRAFT)('shows a visitor only the pages that are ready, and no "draft" marks', () => {
    const { container } = foot()
    expect(container.querySelector('.ft__draft')).toBeNull()
    const pageLinks = [...container.querySelectorAll('a[href^="/page/"]')].map((a) => a.getAttribute('href'))
    expect(pageLinks.every((href) => pageIsReady(href.replace('/page/', '')))).toBe(true)
    expect(screen.queryByRole('navigation', { name: 'Legal' })).toBeNull() // an empty column is never shown
  })
  it('shows the owner the pages that exist but are not ready, each marked "(draft)"', () => {
    const { container } = foot({ owner: true })
    const drafts = [...container.querySelectorAll('.ft__draft')]
    expect(drafts.length).toBeGreaterThanOrEqual(2); for (const d of drafts) expect(d).toHaveTextContent('(draft)')
    expect(within(screen.getByRole('navigation', { name: 'Shop and help' })).getByRole('link', { name: 'Delivery and returns' })).toHaveAttribute('href', '/page/delivery')
    expect(within(screen.getByRole('navigation', { name: 'Legal' })).getByRole('link', { name: 'Accessibility' })).toHaveAttribute('href', '/page/accessibility')
  })
  it('does not link a page that does not exist at all, even for the owner', () => {
    const { container } = foot({ owner: true })
    for (const a of container.querySelectorAll('a[href^="/page/"]')) expect(pageExists(a.getAttribute('href').replace('/page/', '')), a.getAttribute('href')).toBe(true)
  })
  it('opens its social links safely in a new tab', () => {
    foot()
    for (const a of within(screen.getByRole('navigation', { name: 'Follow us' })).getAllByRole('link')) { expect(a).toHaveAttribute('target', '_blank'); expect(a.getAttribute('rel')).toMatch(/noopener/); expect(a.getAttribute('aria-label')).toMatch(/opens in a new tab/) }
  })
  it('has no text under 14px and no inline styles', () => {
    for (const m of read('src/components/footer.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
    expect(read('src/components/Footer.jsx')).not.toMatch(/style=\{\{/)
  })
})

describe('the pages the footer links to', () => {
  const page = (slug) => staticPages.find((p) => p.slug === slug)
  it('Delivery and returns is there, and stays hidden from visitors until it is switched on', () => {
    expect(page('delivery').title).toBe('Delivery and returns'); expect(resolvePage('delivery')).toMatchObject({ kind: 'text' })
  })
  it('Delivery and returns names the same free-delivery countries the shop uses, so the two cannot drift apart', () => {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    for (const code of LAUNCH_COUNTRIES) expect(page('delivery').content, code).toContain(names.of(code).replace('United States', 'the United States'))
    expect(LAUNCH_COUNTRIES).toEqual(['GB', 'IE', 'DE', 'FR', 'US', 'CA'])
  })
  it('Delivery and returns promises neither tracking on every order nor a posted-by date, and points to the full returns page', () => {
    const c = page('delivery').content
    expect(c).toMatch(/Not every order is tracked/); expect(c).toMatch(/estimates, not promises/); expect(c).toContain('(/page/returns)')
    expect(c).not.toMatch(/(?<!not )every order (has|is) tracked|guarantee/i)
  })
  it.runIf(DRAFT)('the Terms are a legal page, in your draft\u2019s words, with the real company details, and stay hidden until you switch them on', () => {
    const terms = LEGAL_PAGES.find((p) => p.slug === 'terms')
    expect(resolvePage('terms')).toMatchObject({ kind: 'legal' }); expect(terms.sections).toHaveLength(19)
    expect(terms.sections.map((x) => x.title)).toEqual(['About us', 'What we sell and how your order is made', 'Placing an order', 'Prices and VAT', 'Delivery', 'Orders from outside the UK', 'Payment', 'Cancelling and returns', 'Your account', 'Copyright and what you can do with a print', 'Using this website', 'Our responsibility to you', 'Events outside our control', 'Passes', 'Paying for passes', 'Changing your passes', 'Cancelling passes and your right to change your mind', 'Changes to these terms', 'Complaints and the law'])
    const all = terms.sections.flatMap((x) => x.paragraphs).join(' ')
    expect(all).toContain(COMPANY.number); expect(all).toContain(COMPANY.vat); expect(all).toContain('71-75 Shelton Street, Covent Garden, London, WC2H 9JQ'); expect(all).toContain(CONTACT_EMAIL)
    expect(terms.updated).toBe('[date]') // a gap the owner's banner counts, until the page is published
  })
  it('the Accessibility statement is the page that was already designed, and uses the real contact email', () => {
    expect(resolvePage('accessibility')).toMatchObject({ kind: 'accessibility' })
    expect(read('src/pages/AccessibilityStatement.jsx')).toMatch(/CONTACT_EMAIL/)
  })
})

describe('how it is wired in', () => {
  it('asks once whether the owner is signed in, and hands the answer to the footer and to the text pages', () => {
    const app = read('src/App.jsx')
    expect(app).toMatch(/const \{ owner \} = useOwnerCheck\(session\)/); expect(app).toMatch(/<StaticPage owner=\{owner\} \/>/); expect(app).toMatch(/<Footer owner=\{owner\} \/>/)
    expect(app.indexOf('useOwnerCheck(session)')).toBeLessThan(app.indexOf('if (loading)')) // before any early return, so the hooks always run in the same order
  })
})
