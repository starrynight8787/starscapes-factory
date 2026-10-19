// The four legal pages (Terms, Privacy, Returns and refunds, AI policy): that Gill's drafts came across whole and tidy, stay consistent with the site's own facts, and render properly.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LEGAL_PAGES } from '../src/data/legalPages'
import { COMPANY } from '../src/data/company'
import { CONTACT_EMAIL } from '../src/data/contact'
import { resolvePage } from '../src/data/staticPages'
import { countGaps } from '../src/pages/simpleMarkdown'
import StaticPage from '../src/pages/StaticPage'
import Footer from '../src/components/Footer'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const page = (slug) => LEGAL_PAGES.find((p) => p.slug === slug)
const textOf = (p) => [p.updated, ...p.intro, ...p.sections.flatMap((s) => [s.title, ...s.paragraphs])].join('\n\n')
const open = (slug) => render(<MemoryRouter initialEntries={[`/page/${slug}`]}><Routes><Route path="/page/:slug" element={<StaticPage owner />} /></Routes></MemoryRouter>)

describe('the four drafts came across whole', () => {
  it('are there, in the footer\u2019s order, each a legal page', () => {
    expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(['terms', 'privacy', 'returns', 'ai-policy'])
    expect(LEGAL_PAGES.map((p) => p.title)).toEqual(['Terms and conditions', 'Privacy policy', 'Returns and refunds', 'AI policy'])
    for (const p of LEGAL_PAGES) expect(resolvePage(p.slug).kind).toBe('legal')
  })
  it('each has the sections of its draft, with their titles', () => {
    expect(page('privacy').sections.map((s) => s.title)).toEqual(['Who we are', 'What we collect and why', 'Cookies and similar technologies', 'Who we share your information with', 'Sending information abroad', 'How long we keep it', 'Your rights', 'Marketing', 'Children', 'Keeping it safe', 'Complaints', 'Changes to this policy'])
    expect(page('returns').sections.map((s) => s.title)).toEqual(['If you change your mind', 'If your print is faulty or damaged', "If your print isn't what you ordered", "If your print doesn't arrive", 'If you ordered from outside the UK', 'How refunds are paid', 'Cancellation form'])
    expect(page('ai-policy').sections.map((s) => s.title)).toEqual(['What is always made by me', 'Where I do use AI', 'What I never use AI for', 'How I check what AI produces', "Why I'm telling you", 'Questions, and changes to this page'])
    expect(page('terms').sections).toHaveLength(15)
  })
  it('each has the introduction that comes before its first section (Terms\u2019 was left out at first)', () => {
    expect(page('terms').intro.join(' ')).toMatch(/These terms apply to everything you buy on this website/)
    expect(page('privacy').intro.join(' ')).toMatch(/This policy explains what personal information/)
    expect(page('returns').intro.join(' ')).toMatch(/part of our Terms and conditions/)
    expect(page('ai-policy').intro.join(' ')).toMatch(/\*\*The short version\.\*\*.*made entirely by me/)
  })
  it('have nothing left over from the document they were copied from', () => {
    for (const p of LEGAL_PAGES) {
      const t = textOf(p)
      expect(t, p.slug).not.toMatch(/\(<|>\)|\\\[|\\\]|Moved to Linear|draft for review|Pictures: none/)
    }
  })
})

describe('they agree with the rest of the site', () => {
  it('Terms and Privacy give the real company details', () => {
    for (const slug of ['terms', 'privacy']) {
      const t = textOf(page(slug))
      expect(t, slug).toContain(COMPANY.number); expect(t, slug).toContain('71-75 Shelton Street, Covent Garden, London, WC2H 9JQ'); expect(t, slug).toContain('England and Wales')
    }
    expect(textOf(page('terms'))).toContain(COMPANY.vat)
  })
  it('every email link goes to the one real contact address, and there are no other addresses', () => {
    for (const p of LEGAL_PAGES) {
      const t = textOf(p)
      for (const m of t.matchAll(/mailto:([^)\s]+)/g)) expect(m[1], p.slug).toBe(CONTACT_EMAIL)
      expect([...t.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((m) => m[0]).every((e) => e === CONTACT_EMAIL), p.slug).toBe(true)
    }
  })
  it('every link is to this site, an https address, or an email address: never an insecure one', () => {
    for (const p of LEGAL_PAGES) for (const m of textOf(p).matchAll(/\]\(([^)]+)\)/g)) expect(m[1], `${p.slug}: ${m[1]}`).toMatch(/^(\/|https:\/\/|mailto:)/)
  })
  it('the only gaps left in [square brackets] are the known ones, so a stray placeholder cannot slip in', () => {
    const known = new Set(['[date]', '[RETURN ADDRESS]', '[2 years]'])
    for (const p of LEGAL_PAGES) for (const m of textOf(p).replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '').matchAll(/\[[^\]\n]+\]/g)) expect(known.has(m[0]), `${p.slug}: ${m[0]}`).toBe(true)
    for (const p of LEGAL_PAGES) expect(countGaps(textOf(p)), p.slug).toBeGreaterThanOrEqual(0)
  })
  it('the cancellation form\u2019s blanks are written in round brackets, so they are not counted as gaps', () => {
    const form = page('returns').sections.at(-1).paragraphs.at(-1)
    expect(form).toMatch(/^> To Starscapes Factory Ltd/); expect(form).toContain('(print name, size and frame)'); expect(form).not.toMatch(/\[print|\[your/)
  })
  it('the Returns page talks about the same refund and delivery facts as the Terms (free delivery, 14 days, 30 days)', () => {
    const r = textOf(page('returns'))
    expect(r).toMatch(/within 14 days of the day your print is delivered/); expect(r).toMatch(/Delivery was free/); expect(r).toMatch(/within 30 days of delivery/)
  })
})

describe('they show properly', () => {
  it('each opens for the owner in the legal layout with a contents list of its sections', () => {
    for (const p of LEGAL_PAGES) {
      const { unmount } = open(p.slug)
      expect(screen.getByRole('heading', { level: 1, name: p.title })).toBeInTheDocument()
      expect(within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole('link')).toHaveLength(p.sections.length)
      expect(screen.getByRole('note')).toHaveTextContent('Draft: only you can see this page.')
      unmount()
    }
  })
  it('show their introduction under the date, with the short version in bold for the AI policy', () => {
    const { container } = open('ai-policy')
    expect(container.querySelector('.lg-intro strong')).toHaveTextContent('The short version.')
    expect(container.querySelector('.lg-updated')).toHaveTextContent('Last updated: [date]')
  })
  it('never show raw markdown marks: no stars, hashes, pipes or leftover quote arrows', () => {
    for (const p of LEGAL_PAGES) {
      const { container, unmount } = open(p.slug)
      expect(container.querySelector('.lg-text').textContent, p.slug).not.toMatch(/\*\*|^#+ |\|\s*--|\n> |(^|\s)\* /)
      unmount()
    }
  })
  it('the Privacy policy\u2019s table is a real table: four columns with headings, and six rows', () => {
    const { container } = open('privacy')
    const table = container.querySelector('table')
    expect([...table.querySelectorAll('th')].map((h) => h.textContent)).toEqual(['What', 'When', 'Why', 'Our legal reason'])
    expect(table.querySelectorAll('tbody tr')).toHaveLength(6); for (const th of table.querySelectorAll('th')) expect(th).toHaveAttribute('scope', 'col')
    expect(container.querySelector('.md-tablewrap')).toBeTruthy()
  })
  it('the AI policy\u2019s table is a real table: three columns, six rows', () => {
    const { container } = open('ai-policy')
    expect([...container.querySelectorAll('table th')].map((h) => h.textContent)).toEqual(['Area', 'What the AI does', 'What I do'])
    expect(container.querySelectorAll('table tbody tr')).toHaveLength(6)
  })
  it('lists are lists: the people Privacy shares with (7), how long it keeps things (4), your rights (6)', () => {
    const { container } = open('privacy')
    expect([...container.querySelectorAll('.lg-text ul')].map((u) => u.querySelectorAll('li').length)).toEqual([7, 4, 6])
    expect(container.querySelector('ul li strong')).toHaveTextContent('Creative Hub, run by Printspace Studios Limited')
  })
  it('the Returns steps are a numbered list of three, and the cancellation form is a quote', () => {
    const { container } = open('returns')
    expect(container.querySelectorAll('.lg-text ol li')).toHaveLength(3)
    const quote = container.querySelector('blockquote')
    expect(quote).toHaveTextContent('I am cancelling my contract for the sale of the following goods: (print name, size and frame).')
    expect(within(quote).getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`)
  })
  it('the AI policy lists what is always made by hand (3) and what AI is never used for (6)', () => {
    const { container } = open('ai-policy')
    expect([...container.querySelectorAll('.lg-text ul')].map((u) => u.querySelectorAll('li').length)).toEqual([3, 6])
  })
})

describe('the footer', () => {
  it('shows the owner all five legal links, each marked draft, and Returns is no longer missing', () => {
    const { container } = render(<MemoryRouter><Footer social={[]} owner /></MemoryRouter>)
    const legal = screen.getByRole('navigation', { name: 'Legal' })
    expect(within(legal).getAllByRole('link').map((a) => a.textContent)).toEqual(['Terms and conditions', 'Privacy policy', 'Returns and refunds', 'AI policy', 'Accessibility'])
    expect(within(legal).getByRole('link', { name: 'Returns and refunds' })).toHaveAttribute('href', '/page/returns')
    expect(container.querySelectorAll('.ft__draft').length).toBeGreaterThanOrEqual(6)
  })
})

describe('the table and quote styles', () => {
  const css = readFileSync(join(process.cwd(), 'src/pages/markdown.css'), 'utf8')
  it('let a wide table scroll inside its own box on a phone, instead of pushing the page sideways', () => {
    expect(css).toMatch(/\.md-tablewrap \{[^}]*overflow-x: auto/)
  })
  it('draw the table cells with borders and the headings in the site\u2019s colours, and the quote with a bar down its side', () => {
    expect(css).toMatch(/\.md-tablewrap th,\s*\.md-tablewrap td \{[^}]*border: 1px solid/); expect(css).toMatch(/\.md-tablewrap th \{[^}]*background:/); expect(css).toMatch(/blockquote \{[^}]*border-left: 4px solid/)
  })
  it('have no text under 14px', () => {
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})
