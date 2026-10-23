// The five legal pages are in ONE state at a time (SFW-186): all drafts, or all published. Tests for each state run only in that state (test/legalState.js); the checks below that must hold in both run always.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LEGAL_PAGES } from '../src/data/legalPages'
import { LEGAL_PAGES_PUBLISHED } from '../src/cart/beforeYouPay'
import { pageIsReady } from '../src/data/staticPages'
import StaticPage from '../src/pages/StaticPage'
import Footer from '../src/components/Footer'
import { DRAFT, PUBLISHED } from './legalState'

const SLUGS = ['terms', 'privacy', 'returns', 'ai-policy', 'cookies']
const MONTHS = '(January|February|March|April|May|June|July|August|September|October|November|December)'
const open = (slug, props = {}) => render(<MemoryRouter initialEntries={[`/page/${slug}`]}><Routes><Route path="/page/:slug" element={<StaticPage {...props} />} /></Routes></MemoryRouter>) // no owner prop = a visitor
const foot = (props = {}) => render(<MemoryRouter><Footer social={[]} {...props} /></MemoryRouter>)

describe('the five pages are in ONE state: all drafts or all published, never half-way', () => {
  it('is one or the other, and the checkout rail agrees (real payments are open exactly when the pages are published)', () => {
    expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(SLUGS)
    expect(DRAFT || PUBLISHED).toBe(true); expect(DRAFT && PUBLISHED).toBe(false)
    expect(LEGAL_PAGES_PUBLISHED).toBe(PUBLISHED)
  })
})

describe.runIf(PUBLISHED)('once they are published: what a visitor sees', () => {
  it.each(SLUGS)('%s opens for a visitor in the legal layout: its title, a real date, a contents list, no draft note and no gap', (slug) => {
    const p = LEGAL_PAGES.find((x) => x.slug === slug)
    const { container } = open(slug)
    expect(screen.getByRole('heading', { level: 1, name: p.title })).toBeInTheDocument()
    expect(p.updated).toMatch(new RegExp(`^[1-9][0-9]? ${MONTHS} 20[0-9]{2}$`)); expect(container.textContent).toContain(p.updated)
    expect(within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole('link')).toHaveLength(p.sections.length)
    expect(screen.queryByRole('note')).toBeNull(); expect(container.textContent).not.toMatch(/Draft: only you can see/)
    expect(container.textContent).not.toMatch(/\[[^\]\n]+\](?!\()/)
  })
  it('the footer links a visitor to all five, with no "draft" marks', () => {
    const { container } = foot()
    const hrefs = [...container.querySelectorAll('a[href^="/page/"]')].map((a) => a.getAttribute('href'))
    for (const slug of SLUGS) expect(hrefs, slug).toContain(`/page/${slug}`)
    expect(container.querySelector('.ft__draft')).toBeNull(); expect(screen.getByRole('navigation', { name: 'Legal' })).toBeInTheDocument()
  })
  it('the pages the checkout points at (Terms and Returns, in the tick box and the "Before you pay" box) and the Privacy policy every sign-up form links to are all ready', () => {
    for (const slug of ['terms', 'returns', 'privacy']) expect(pageIsReady(slug), slug).toBe(true)
  })
})

describe.runIf(DRAFT)('while they are drafts: a visitor sees none of the words, and the footer hides them', () => {
  it.each(SLUGS)('%s shows a visitor no placeholder and no contents list', (slug) => {
    const { container } = open(slug)
    expect(container.textContent).not.toMatch(/\[date\]/); expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull()
  })
  it('the footer shows a visitor no legal links', () => { foot(); expect(screen.queryByRole('navigation', { name: 'Legal' })).toBeNull() })
})
