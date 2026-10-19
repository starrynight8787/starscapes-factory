// The text pages: the small safe renderer for headings, lists, bold and links; and the owner-only preview of a page that is not ready, for all three kinds of page
// (a text page, a legal page, the accessibility statement).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('../src/data/legalPages', () => ({
  LEGAL_PAGES: [
    { slug: 'finished', title: 'A finished legal page', updated: '1 November 2026', ready: true, sections: [{ title: 'First part', paragraphs: ['First words.'] }, { title: 'Second part', paragraphs: ['Second words.', '- a list item\n- another item'] }] },
    { slug: 'drafted', title: 'A draft legal page', updated: '[date]', ready: false, sections: [{ title: 'Only part', paragraphs: ['A gap [fill me in], a link [home](/), and another [gap here].'] }] },
  ],
}))
import StaticPage from '../src/pages/StaticPage'
import { renderMarkdown, countGaps, slugify, inline } from '../src/pages/simpleMarkdown'
import { staticPages, resolvePage, pageIsReady, pageExists, accessibilityGaps } from '../src/data/staticPages'
import { ACCESSIBILITY_STATEMENT } from '../src/data/accessibilityStatement'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const at = (slug, owner = false) => render(<MemoryRouter initialEntries={[`/page/${slug}`]}><Routes><Route path="/page/:slug" element={<StaticPage owner={owner} />} /></Routes></MemoryRouter>)
const md = (text) => render(<MemoryRouter><div>{renderMarkdown(text).nodes}</div></MemoryRouter>)

describe('the renderer', () => {
  it('makes headings with their own anchors', () => {
    const { container } = md('## About these terms\n\nWords.\n\n### A smaller heading\n\n## Who we are & more')
    expect(container.querySelector('h2#about-these-terms')).toHaveTextContent('About these terms'); expect(container.querySelector('h3#a-smaller-heading')).toBeInTheDocument()
    expect(container.querySelector('h2#who-we-are-and-more')).toBeInTheDocument()
  })
  it('gives two headings with the same words different anchors', () => {
    const { container } = md('## Contact\n\n## Contact')
    expect(new Set([...container.querySelectorAll('h2')].map((h) => h.id)).size).toBe(2)
  })
  it('makes paragraphs, bullet lists and numbered lists, even straight after a paragraph', () => {
    const { container } = md('First line\nsecond line\n\nIntro:\n- one\n- two\n\n1. first\n2. second')
    expect(container.querySelectorAll('p')).toHaveLength(2); expect(container.querySelector('p').textContent).toBe('First line second line')
    expect(container.querySelectorAll('ul li')).toHaveLength(2); expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(container.querySelectorAll('p')[1].textContent).toBe('Intro:')
  })
  it('makes bold words, including inside a list', () => {
    const { container } = md('This is **very** important.\n\n- a **bold** item')
    expect(container.querySelectorAll('strong')).toHaveLength(2); expect(container.querySelector('p').textContent).toBe('This is very important.')
  })
  it('makes links only for this site, https and mailto addresses, and shows anything else as plain words', () => {
    const { container } = md('[Home](/page/contact) [Safe](https://example.com/x) [Mail](mailto:imagine@starscapesfactory.com) [Bad](javascript:alert(1)) [Old](http://example.com) [Odd](ftp://x.example)')
    const links = [...container.querySelectorAll('a')]
    expect(links.map((a) => a.textContent)).toEqual(['Home', 'Safe', 'Mail'])
    expect(links[0]).toHaveAttribute('href', '/page/contact'); expect(links[1]).toHaveAttribute('target', '_blank'); expect(links[1].getAttribute('rel')).toMatch(/noopener/); expect(links[1].getAttribute('aria-label')).toMatch(/opens in a new tab/)
    expect(container.textContent).toMatch(/Bad.*Old.*Odd/)
  })
  it('never lets HTML through: it is shown as the words it is', () => {
    const { container } = md('Hello <script>alert(1)</script> <b>x</b>')
    expect(container.querySelector('script')).toBeNull(); expect(container.querySelector('b')).toBeNull(); expect(container.textContent).toContain('<script>alert(1)</script>')
  })
  it('shows a backslash-escaped bracket as the bracket, and leaves plain brackets alone', () => {
    const { container } = md('Last updated: \\[DATE\\]. And [a gap].')
    expect(container.textContent).toBe('Last updated: [DATE]. And [a gap].')
  })
  it('makes real tables, with column headings that say which column they head, inside a box that scrolls on a phone', () => {
    const { container } = md('| What | Why |\n| -- | -- |\n| A **thing** | [Link](/x) |\n| Another | Reason |')
    expect([...container.querySelectorAll('th')].map((h) => h.textContent)).toEqual(['What', 'Why']); for (const th of container.querySelectorAll('th')) expect(th).toHaveAttribute('scope', 'col')
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2); expect(container.querySelector('tbody strong').textContent).toBe('thing'); expect(container.querySelector('tbody a')).toHaveAttribute('href', '/x')
    expect(container.querySelector('.md-tablewrap > table')).toBeTruthy()
  })
  it('makes quotes from lines that start with >, joining their lines', () => {
    const { container } = md('Before\n\n> first line\n> second **line**\n\nAfter')
    expect(container.querySelector('blockquote').textContent).toBe('first line second line'); expect(container.querySelector('blockquote strong')).toBeTruthy()
    expect([...container.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['Before', 'first line second line', 'After'])
  })
  it('copes with empty text', () => { expect(renderMarkdown('').nodes).toEqual([]); expect(renderMarkdown(null).nodes).toEqual([]); expect(inline('')).toEqual([]) })
  it('counts the gaps in [square brackets], not counting links', () => {
    expect(countGaps('A [gap], \\[DATE\\] and [two words]. A [link](/x) is not one.')).toBe(3); expect(countGaps('Nothing here')).toBe(0); expect(countGaps(null)).toBe(0)
  })
  it('makes anchors from words', () => { expect(slugify('Ordering & prices')).toBe('ordering-and-prices'); expect(slugify('!!!')).toBe('section') })
})

describe('where each page lives, and whether it is ready', () => {
  it('finds a text page, a legal page and the accessibility statement, and nothing for a name that does not exist', () => {
    expect(resolvePage('contact')).toMatchObject({ kind: 'text', ready: true }); expect(resolvePage('finished')).toMatchObject({ kind: 'legal', ready: true })
    expect(resolvePage('drafted')).toMatchObject({ kind: 'legal', ready: false }); expect(resolvePage('accessibility')).toMatchObject({ kind: 'accessibility', title: 'Accessibility statement' })
    expect(resolvePage('nope')).toBeNull(); expect(pageExists('nope')).toBe(false); expect(pageExists('drafted')).toBe(true)
  })
  it('counts a legal page as ready only when its ready flag is true', () => { expect(pageIsReady('finished')).toBe(true); expect(pageIsReady('drafted')).toBe(false) })
  it('counts the accessibility statement as ready only when every gap is filled in', () => {
    expect(accessibilityGaps({ lastReviewed: '1 December 2026', notYetRight: 'x', complaint: 'y' })).toEqual([])
    expect(accessibilityGaps({ lastReviewed: '', notYetRight: 'x', complaint: '' })).toEqual(['lastReviewed', 'complaint'])
    expect(accessibilityGaps(ACCESSIBILITY_STATEMENT).length).toBe(Object.values(ACCESSIBILITY_STATEMENT).filter((v) => !v).length)
  })
})

describe('a text page that is not ready', () => {
  const draft = staticPages.find((p) => p.ready !== true)
  it('shows a visitor only "not ready yet": no words, no gaps, no banner', () => {
    const { container } = at(draft.slug)
    expect(screen.getByText('This page is not ready yet. Please check back soon.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\[|Draft: only you/)
  })
  it('shows the owner the page under a draft banner that says how many gaps are left', () => {
    at(draft.slug, true)
    const gaps = countGaps(draft.content)
    expect(screen.getByRole('note')).toHaveTextContent('Draft: only you can see this page.'); expect(screen.getByRole('note')).toHaveTextContent(`${gaps} ${gaps === 1 ? 'gap' : 'gaps'} in [square brackets] still to fill.`)
    expect(screen.getByRole('note')).toHaveTextContent('Visitors see “not ready yet”')
    expect(screen.getByRole('heading', { level: 1, name: draft.title })).toBeInTheDocument()
  })
  it('shows a ready page to everyone, with no banner', () => {
    at('contact')
    expect(screen.queryByRole('note')).toBeNull(); expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument()
  })
})

describe('a legal page', () => {
  it('shows a visitor only "not ready yet" while it is a draft, with none of its words', () => {
    const { container } = at('drafted')
    expect(screen.getByText('This page is not ready yet. Please check back soon.')).toBeInTheDocument(); expect(container.textContent).not.toMatch(/fill me in|Only part/)
  })
  it('shows the owner the draft in the legal layout, under a banner counting its gaps (the date, and the two in the words)', () => {
    const { container } = at('drafted', true)
    expect(screen.getByRole('note')).toHaveTextContent('3 gaps in [square brackets] still to fill.')
    expect(screen.getByRole('heading', { level: 1, name: 'A draft legal page' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument(); expect(container.querySelector('.sp__draftwrap ~ main.lg, main.lg')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'home' })).toHaveAttribute('href', '/')
  })
  it('shows a ready one to everyone with its numbered sections, a contents list, the company details, and no banner', () => {
    const { container } = at('finished')
    expect(screen.queryByRole('note')).toBeNull()
    const toc = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(toc).getAllByRole('link').map((a) => a.textContent)).toEqual(['1. First part', '2. Second part'])
    expect(screen.getByRole('heading', { level: 2, name: '2. Second part' })).toBeInTheDocument()
    expect(container.querySelectorAll('.lg-text ul li')).toHaveLength(2) // a paragraph of "- " lines is a list
    expect(container.querySelector('.lg-company')).toHaveTextContent('VAT number GB445903680')
  })
})

describe('the accessibility statement', () => {
  it('shows a visitor only "not ready yet" while any gap is empty', () => {
    at('accessibility')
    expect(screen.getByText('This page is not ready yet. Please check back soon.')).toBeInTheDocument(); expect(screen.queryByRole('note')).toBeNull()
  })
  it('shows the owner the statement under a banner counting the empty gaps, with a plain stand-in word in each', () => {
    const { container } = at('accessibility', true)
    expect(screen.getByRole('note')).toHaveTextContent(`${accessibilityGaps().length} gaps in [square brackets] still to fill.`)
    expect(screen.getByRole('heading', { level: 1, name: 'Accessibility statement' })).toBeInTheDocument()
    expect(container.textContent).toMatch(/Last reviewed: \[date\]/); expect(container.textContent).toMatch(/\[To be filled in after testing\.\]/)
  })
})

describe('the files', () => {
  it('have no inline styles and no text under 14px', () => {
    for (const f of ['src/pages/StaticPage.jsx', 'src/pages/simpleMarkdown.jsx', 'src/pages/LegalPage.jsx']) expect(read(f), f).not.toMatch(/style=\{\{/)
    for (const m of read('src/pages/staticpage.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
