import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('../src/data/channels', () => ({
  channels: [
    { slug: 'drafting-desk', name: 'The Drafting Desk' },
    { slug: 'sarah-jrs-den', name: "Sarah Jr.'s Den" },
    { slug: 'art-loft', name: 'The Art Loft' },
    { slug: 'explorers-bay', name: "Explorer's Bay" },
    { slug: 'factory-floor', name: 'The Factory Floor' },
    { slug: 'leadership-lounge', name: 'Leadership Lounge' },
    { slug: 'idea-hatchery', name: 'The Idea Hatchery' },
    { slug: 'knowledge-nook', name: 'Knowledge Nook' },
  ],
}))

import NotFound from '../src/pages/NotFound'
import ErrorPage from '../src/pages/ErrorPage'
import ErrorBoundary from '../src/components/ErrorBoundary'
import PageLoading from '../src/components/PageLoading'
import LegalPage, { CompanyCard } from '../src/pages/LegalPage'
import AccessibilityStatement, { statementIsReady } from '../src/pages/AccessibilityStatement'

const read = (f) => readFileSync(join(process.cwd(), f), 'utf8')
const inRouter = (ui, path = '/') => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

describe('the 404 page', () => {
  it('says the room is not on the plan, in the design\u2019s words', () => {
    inRouter(<NotFound />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("That room isn't on the plan.")
    expect(screen.getByText('404')).toBeTruthy()
    expect(screen.getByText("We can't find that page. It may have moved, or the address may have a typo.")).toBeTruthy()
    expect(document.title).toBe('Page not found | Starscapes Factory')
  })
  it('has a way home, and a way into each of the eight rooms, each with its icon', () => {
    const { container } = inRouter(<NotFound />)
    expect(screen.getByRole('link', { name: 'Back to the homepage' }).getAttribute('href')).toBe('/')
    const rooms = [...container.querySelectorAll('.sp-rooms a')]
    expect(rooms).toHaveLength(8)
    expect(rooms.map((a) => a.textContent)).toEqual(['The Drafting Desk', "Sarah Jr.'s Den", 'The Art Loft', "Explorer's Bay", 'The Factory Floor', 'Leadership Lounge', 'The Idea Hatchery', 'Knowledge Nook'])
    for (const a of rooms) expect(a.querySelector('img.sf-room-icon')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'The Art Loft' }).getAttribute('href')).toBe('/art-loft')
    expect(screen.getByRole('link', { name: 'The Factory Floor' }).getAttribute('href')).toBe('/factory-floor')
    expect(screen.getByRole('link', { name: 'Knowledge Nook' }).getAttribute('href')).toBe('/knowledge-nook')   // the Nook has its own page now
  })
  it('shows the sailboat, as a decoration (the words say everything)', () => {
    const { container } = inRouter(<NotFound />)
    const boat = container.querySelector('img[src="/icons/rooms/explorers-bay.png"][width="96"]')
    expect(boat.getAttribute('alt')).toBe('')
  })
})

describe('the error page', () => {
  it('says it is not the visitor\u2019s fault, in the design\u2019s words', () => {
    inRouter(<ErrorPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Something went wrong on our side.')
    expect(screen.getByText('It is not you. Please try again in a moment. If it keeps happening, tell us and we will sort it out.')).toBeTruthy()
    expect(document.title).toBe('Something went wrong | Starscapes Factory')
  })
  it('moves the keyboard focus to the heading, so a screen reader reads it at once', () => {
    inRouter(<ErrorPage />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })
  it('offers to try again, and to go home', async () => {
    const retry = vi.fn()
    inRouter(<ErrorPage onRetry={retry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Back to the homepage' }).getAttribute('href')).toBe('/')
  })
  it('leaves out the contact line when there is no address (so there is never a blank or a placeholder)', () => {
    inRouter(<ErrorPage email="" />)
    expect(screen.queryByText(/Contact:/)).toBeNull()
  })
  it('shows the contact line, with a mail link, when there is an address', () => {
    inRouter(<ErrorPage email="hello@example.com" />)
    expect(screen.getByText(/Contact:/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'hello@example.com' }).getAttribute('href')).toBe('mailto:hello@example.com')
  })
  it('uses the site\u2019s real contact address when none is given', () => {
    inRouter(<ErrorPage />)
    expect(screen.getByRole('link', { name: 'imagine@starscapesfactory.com' }).getAttribute('href')).toBe('mailto:imagine@starscapesfactory.com')
  })
})

describe('the loading page', () => {
  it('is announced politely, in the design\u2019s words', () => {
    render(<PageLoading />)
    const box = screen.getByRole('status')
    expect(box.textContent).toBe('Loading\u2026Just a moment.')
    expect(box.getAttribute('aria-live')).toBe('polite')
  })
})

describe('the error catcher', () => {
  let broken
  const Bomb = () => {
    if (broken) throw new Error('boom')
    return <p>The page is fine</p>
  }
  beforeEach(() => {
    broken = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  const site = (path = '/') =>
    inRouter(
      <>
        <Link to="/other">Go somewhere else</Link>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Bomb />} />
            <Route path="/other" element={<p>Another page</p>} />
          </Routes>
        </ErrorBoundary>
      </>,
      path
    )
  it('shows the error page instead of a blank screen when a page breaks', () => {
    site()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Something went wrong on our side.')
    expect(screen.queryByText('The page is fine')).toBeNull()
  })
  it('tries the page again when asked', async () => {
    site()
    broken = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('The page is fine')).toBeTruthy()
  })
  it('lets go as soon as the visitor goes to another page, so one broken page never spoils the rest', async () => {
    site()
    await userEvent.click(screen.getByRole('link', { name: 'Go somewhere else' }))
    expect(screen.getByText('Another page')).toBeTruthy()
  })
  it('does nothing at all when nothing breaks', () => {
    broken = false
    site()
    expect(screen.getByText('The page is fine')).toBeTruthy()
  })
})

describe('the site\u2019s App.jsx', () => {
  const app = read('src/App.jsx')
  it('shows the loading page while the site gets ready', () => {
    expect(app).toContain('<PageLoading />')
    expect(app).not.toContain('Loading...')
  })
  it('wraps all its pages in the error catcher', () => {
    expect(app.indexOf('<ErrorBoundary>')).toBeGreaterThan(-1)
    expect(app.indexOf('<ErrorBoundary>')).toBeLessThan(app.indexOf('<Routes>'))
    expect(app.indexOf('</Routes>')).toBeLessThan(app.indexOf('</ErrorBoundary>'))
  })
  it('has the 404 page as its one catch-all route (the router always tries a more specific address first, wherever the catch-all is written)', () => {
    const paths = [...app.matchAll(/<Route\b[^>]*path="([^"]+)"/g)].map((m) => m[1])
    expect(paths.filter((p) => p === '*')).toHaveLength(1)
    expect(app).toContain('<Route path="*" element={<NotFound />} />')
  })
})

describe('the legal page layout', () => {
  const sample = { title: 'A sample page', updated: '1 January 2030', sections: [{ title: 'First part', paragraphs: ['One.', 'Two.'] }, { title: 'Second part', paragraphs: ['Three.'] }] }
  it('numbers the sections, and lists them down the side as links to each', () => {
    const { container } = render(<LegalPage page={sample} company={{ name: 'A Company Ltd', number: '', registeredOffice: '', registeredIn: '' }} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('A sample page')
    expect(screen.getByText('Last updated: 1 January 2030')).toBeTruthy()
    const toc = screen.getByRole('navigation', { name: 'On this page' })
    expect([...toc.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['1. First part', '#first-part'], ['2. Second part', '#second-part']])
    expect(screen.getByRole('heading', { level: 2, name: '1. First part' })).toBeTruthy()
    expect(container.querySelector('section#second-part')).not.toBeNull()
  })
  it('shows the company details, but only the parts that are filled in', () => {
    const { rerender } = render(<CompanyCard company={{ name: 'A Company Ltd', number: '', registeredOffice: '', registeredIn: '' }} />)
    expect(screen.getByText('A Company Ltd')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Company number|Registered/)
    rerender(<CompanyCard company={{ name: 'A Company Ltd', number: '12345', registeredOffice: '1 High St', registeredIn: 'England and Wales' }} />)
    expect(screen.getByText('Company number 12345. Registered office: 1 High St. Registered in England and Wales.')).toBeTruthy()
  })
})

describe('the accessibility statement', () => {
  const filled = { lastReviewed: '1 December 2030', notYetRight: 'Nothing is known to fall short.', complaint: 'Take it to the regulator.' }
  it('is not ready while any gap is empty', () => {
    expect(statementIsReady({ lastReviewed: '', notYetRight: '', complaint: '' }, '', '')).toBe(false)
    expect(statementIsReady(filled, 'a@b.com', '')).toBe(false)
    expect(statementIsReady(filled, '', '5')).toBe(false)
    expect(statementIsReady({ ...filled, complaint: '' }, 'a@b.com', '5')).toBe(false)
  })
  it('is ready once every gap is filled in', () => {
    expect(statementIsReady(filled, 'a@b.com', '5')).toBe(true)
  })
  it('shows the filled-in words, with the email as a link', () => {
    inRouter(<AccessibilityStatement statement={filled} email="hello@example.com" replyDays="5" company={{ name: 'A Company Ltd', number: '', registeredOffice: '', registeredIn: '' }} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Accessibility statement')
    expect(screen.getByText('Last reviewed: 1 December 2030')).toBeTruthy()
    expect(screen.getByText(/We will reply within 5 working days/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'hello@example.com' }).getAttribute('href')).toBe('mailto:hello@example.com')
    expect(screen.getByText('Take it to the regulator.')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'What we aim for' })).toBeTruthy()
  })
})

describe('no page here ever shows a placeholder', () => {
  it.each([
    ['404', () => <NotFound />],
    ['error', () => <ErrorPage />],
    ['loading', () => <PageLoading />],
  ])('%s page', (_, page) => {
    const { container } = inRouter(page())
    expect(container.textContent).not.toMatch(/\[[^\]]*\]/)
  })
})

describe('the styles keep to the site\u2019s rules', () => {
  it.each(['src/pages/systempages.css', 'src/components/formmessages.css'])('%s: no text under 14 pixels', (file) => {
    const sizes = [...read(file).matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]))
    expect(sizes.length).toBeGreaterThan(0)
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(14)
  })
  it('buttons use the shared button height setting', () => {
    expect(read('src/pages/systempages.css')).toMatch(/\.sp-btn \{[^}]*min-height:\s*var\(--sf-btn-h, 40px\)/)
  })
})
