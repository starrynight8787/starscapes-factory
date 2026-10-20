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
    expect(page('privacy').sections.map((s) => s.title)).toEqual(['Who we are', 'What we collect and why', 'Suggestions and votes', 'Cookies and similar technologies', 'Who we share your information with', 'Sending information abroad', 'How long we keep it', 'Your rights', 'Marketing', 'Children', 'Keeping it safe', 'Complaints', 'Changes to this policy'])
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
    const known = new Set(['[date]', '[RETURN ADDRESS]'])
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
  it('the Privacy policy\u2019s table is a real table: four columns with headings, and ten rows', () => {
    const { container } = open('privacy')
    const table = container.querySelector('table')
    expect([...table.querySelectorAll('th')].map((h) => h.textContent)).toEqual(['What', 'When', 'Why', 'Our legal reason'])
    expect(table.querySelectorAll('tbody tr')).toHaveLength(10); for (const th of table.querySelectorAll('th')) expect(th).toHaveAttribute('scope', 'col')
    expect(container.querySelector('.md-tablewrap')).toBeTruthy()
  })
  it('a table scrolls inside a box a keyboard can reach and a screen reader can name, with a short hint for people on a phone', () => {
    const { container } = open('privacy')
    const box = container.querySelector('.md-tablewrap')
    expect(box).toHaveAttribute('tabindex', '0'); expect(box).toHaveAttribute('role', 'region'); expect(box.getAttribute('aria-label')).toMatch(/scroll sideways/i)
    expect(container.querySelector('.md-hint')).toHaveTextContent('Scroll sideways to see every column'); expect(container.querySelector('.md-hint')).toHaveAttribute('aria-hidden', 'true')
  })
  it('the AI policy\u2019s table is a real table: three columns, six rows', () => {
    const { container } = open('ai-policy')
    expect([...container.querySelectorAll('table th')].map((h) => h.textContent)).toEqual(['Area', 'What the AI does', 'What I do'])
    expect(container.querySelectorAll('table tbody tr')).toHaveLength(6)
  })
  it('lists are lists: the people Privacy shares with (8), how long it keeps things (7), your rights (7)', () => {
    const { container } = open('privacy')
    expect([...container.querySelectorAll('.lg-text ul')].map((u) => u.querySelectorAll('li').length)).toEqual([8, 7, 7])
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
  it('keep room for a table\u2019s columns on a phone, and show the scroll hint only there', () => {
    expect(css).toMatch(/\.md-hint \{\s*display: none/); expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*\.md-hint \{\s*display: block/); expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*\.md-tablewrap table \{\s*min-width: 560px/)
    expect(css).toMatch(/\.md-tablewrap:focus-visible \{\s*outline: 3px solid/)
  })
  it('have no text under 14px', () => {
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
})

import { EBOOK } from '../src/ebook/ebookConfig'

describe('the Privacy policy says what the site really does (SFW-233)', () => {
  const read = (rel) => readFileSync(join(process.cwd(), rel), 'utf8')
  const privacy = () => textOf(page('privacy'))
  const section = (title) => textOf({ intro: [], sections: page('privacy').sections.filter((x) => x.title === title) })
  it('has exactly one gap left for the owner to fill: the date it is published (Resend and 2 years were decided on 20 October 2026)', () => {
    const gaps = [...privacy().replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '').matchAll(/\[[^\]\n]+\]/g)].map((m) => m[0]).sort()
    expect(page('privacy').updated).toBe('[date]'); expect(gaps).toEqual(['[date]'])
    expect(page('privacy').ready).toBe(false)
  })
  it('covers passes, suggestions and votes, story votes, the free ebook, YouTube and the choice kept on the passes page', () => {
    const t = privacy()
    for (const needle of ['Your passes:', 'What you suggest', 'Your vote in a story vote', 'sign up for the free ebook', 'privacy-enhanced player', 'the choice you make on the passes page']) expect(t, needle).toContain(needle)
  })
  it('no longer says there is no marketing, and says what the ebook tick box says: yes to the ebook AND the free blog posts, with an unsubscribe link', () => {
    expect(privacy()).not.toMatch(/We don.t send marketing emails/)
    expect(EBOOK.consent).toMatch(/free ebook and your free blog posts by email/)
    const m = section('Marketing'); expect(m).toMatch(/free ebook and our free blog posts by email/); expect(m).toMatch(/unsubscribe link/); expect(m).toMatch(/never sell your email address/)
    expect(m).toMatch(/receipts and password resets, are not marketing/)
  })
  it('promises that who voted for what is not shown or looked at, as Gill decided on 20 October 2026', () => {
    const v = section('Suggestions and votes')
    expect(v).toMatch(/never your name or email address/); expect(v).toMatch(/nobody can see who voted for what, and nobody else can see your vote/); expect(v).toMatch(/We could see who voted for what by looking directly in our database, but we don.t look\. We only ever use the totals\./)
  })
  it('only promises to delete suggestions, votes and the passes record with an account because the database really does (on delete cascade on each)', () => {
    expect(section('Suggestions and votes')).toMatch(/your suggestions, your votes and your passes record are deleted with it/)
    const sql = (f) => read(`sql/${f}`)
    const tableText = (file, name) => sql(file).split(`create table if not exists public.${name} (`)[1].split('\n);')[0]
    expect(tableText('memberships.sql', 'memberships')).toMatch(/user_id uuid primary key references auth\.users \(id\) on delete cascade/)
    expect(tableText('suggestions.sql', 'suggestions')).toMatch(/user_id uuid not null references auth\.users \(id\) on delete cascade/)
    expect(tableText('suggestions.sql', 'suggestion_votes')).toMatch(/user_id uuid not null references auth\.users \(id\) on delete cascade/)
    expect(tableText('story-votes.sql', 'story_ballots')).toMatch(/user_id uuid not null references auth\.users \(id\) on delete cascade/)
  })
  it('says orders are kept for six years even without an account, because orders are not tied to an account', () => {
    expect(tableText_orders()).not.toMatch(/user_id/); expect(section('How long we keep it')).toMatch(/Order and invoice records:\*\* six years/)
    function tableText_orders() { return read('sql/orders.sql').split('create table if not exists public.orders (')[1].split('\n);')[0] }
  })
  it('says what is kept in the browser (sign-in, cart, the passes choice) and that videos load nothing from YouTube until play, as the code does', () => {
    expect(read('src/cart/cartStore.js')).toMatch(/'sf-cart-v1'/); expect(read('src/membership/MembershipPage.jsx')).toMatch(/CHOICE_KEY = 'sf-membership-choice'/)
    for (const f of ['src/bookclub/BookClubPage.jsx', 'src/den/YouTubePlayer.jsx']) { try { expect(read(f)).not.toMatch(/https:\/\/www\.youtube\.com\/embed/) } catch (e) { if (e.code !== 'ENOENT') throw e } }
    expect(read('src/bookclub/BookClubPage.jsx')).toMatch(/youtube-nocookie\.com\/embed/)
  })
  it('lists the people it shares with, including the mailing tool and YouTube, and Stripe for passes', () => {
    const t = section('Who we share your information with'); expect(t).not.toMatch(/MAILING TOOL/); expect(t).toMatch(/\*\*Resend\*\* sends our emails/); expect(t).toMatch(/if you sign up for the free ebook, the ebook and our free blog posts/); expect(read('lib/sendEmail.js')).toMatch(/api\.resend\.com/); expect(t).toMatch(/\*\*YouTube \(Google\)\*\*, only if you press play/); expect(t).toMatch(/payments for prints and passes/)
    expect(section('Sending information abroad')).toMatch(/such as Google, which runs YouTube\)/)
  })
  it('keeps emails and messages to us for 2 years, as Gill decided on 20 October 2026', () => {
    expect(section('How long we keep it')).toMatch(/Emails and messages to us:\*\* 2 years, then deleted\./); expect(privacy()).not.toMatch(/\[2 years\]/)
  })
  it('lets people take back their consent, and says how long ebook sign-ups and passes records are kept', () => {
    expect(section('Your rights')).toMatch(/take back your consent whenever you like/); const k = section('How long we keep it'); expect(k).toMatch(/Free ebook sign-ups:\*\* until you unsubscribe/); expect(k).toMatch(/Your passes record:\*\*/); expect(k).toMatch(/Suggestions and votes:\*\*/)
  })
})
