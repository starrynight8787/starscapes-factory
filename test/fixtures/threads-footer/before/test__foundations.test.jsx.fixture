import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Footer from '../src/components/Footer'
import SkipLink from '../src/components/SkipLink'
import { social } from '../src/data/social'
import { pageIsReady } from '../src/data/staticPages'
import { SOCIAL_LINKS } from '../src/data/contact'

const css = readFileSync(join(process.cwd(), 'src/styles/site.css'), 'utf8')
const app = readFileSync(join(process.cwd(), 'src/App.jsx'), 'utf8')
const renderFooter = (props) => render(<MemoryRouter><Footer {...props} /></MemoryRouter>)

describe('footer', () => {
  it('links every room, the shop and help pages, and each legal page only once it is ready', () => {
    renderFooter({ social: [] })
    const rooms = screen.getByRole('navigation', { name: 'Rooms' })
    expect(within(rooms).getAllByRole('link').map((l) => l.textContent)).toEqual(['The Drafting Desk', "Sarah Junior's Clubhouse", 'The Art Loft', "Explorer's Bay", 'The Factory Floor', 'Leadership Lounge', 'The Idea Hatchery', 'Knowledge Nook'])
    const help = screen.getByRole('navigation', { name: 'Shop and help' })
    expect(within(help).getByRole('link', { name: 'Art Loft prints' })).toHaveAttribute('href', '/art-loft')
    expect(within(help).getByRole('link', { name: 'Cart' })).toHaveAttribute('href', '/cart')
    expect(within(help).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/page/contact')
    for (const [name, slug] of [['Delivery and returns', 'delivery']]) {
      if (pageIsReady(slug)) expect(within(help).getByRole('link', { name })).toBeInTheDocument()
      else expect(within(help).queryByRole('link', { name })).toBeNull()
    }
    const legal = ['terms', 'privacy', 'returns', 'ai-policy', 'accessibility'].filter(pageIsReady)
    if (legal.length === 0) expect(screen.queryByRole('navigation', { name: 'Legal' })).toBeNull()
    else expect(within(screen.getByRole('navigation', { name: 'Legal' })).getAllByRole('link')).toHaveLength(legal.length)
  })
  it('shows no Follow links until an address is filled in', () => {
    renderFooter({ social: [{ name: 'YouTube', url: '' }, { name: 'TikTok', url: '   ' }] })
    expect(screen.queryByRole('navigation', { name: 'Follow us' })).toBeNull()
  })
  it('the shipped list names the four accounts, and takes their addresses from contact.js (Threads is blank until found)', () => {
    expect(social.map((s) => s.name)).toEqual(['YouTube', 'Instagram', 'TikTok', 'Threads'])
    const byName = Object.fromEntries(social.map((s) => [s.name, s.url]))
    expect(byName.YouTube).toBe(SOCIAL_LINKS.youtube)
    expect(byName.Instagram).toBe(SOCIAL_LINKS.instagram)
    expect(byName.TikTok).toBe(SOCIAL_LINKS.tiktok)
    expect(byName.Threads).toBe(SOCIAL_LINKS.threads)
    for (const name of ['YouTube', 'Instagram', 'TikTok']) expect(byName[name], name).toMatch(/^https:\/\//)
  })
  it('the real footer shows the accounts that have an address, and hides the blank one', () => {
    renderFooter()
    const nav = screen.getByRole('navigation', { name: 'Follow us' })
    expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('aria-label'))).toEqual(['YouTube (opens in a new tab)', 'Instagram (opens in a new tab)', 'TikTok (opens in a new tab)'])
  })
  it('shows only the accounts that have an address, each opening safely in a new tab', () => {
    renderFooter({ social: [{ name: 'YouTube', url: 'https://youtube.com/@x' }, { name: 'Instagram', url: '' }, { name: 'TikTok', url: 'https://tiktok.com/@x' }] })
    const nav = screen.getByRole('navigation', { name: 'Follow us' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual(['YouTube (opens in a new tab)', 'TikTok (opens in a new tab)'])
    for (const l of links) { expect(l).toHaveAttribute('target', '_blank'); expect(l.getAttribute('rel')).toMatch(/noopener/); expect(l.getAttribute('rel')).toMatch(/noreferrer/) }
  })
})

describe('skip link', () => {
  it('is a link to the main content', () => {
    render(<SkipLink />)
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
  })
  it('the app puts the skip link first and the target on the page container', () => {
    expect(app.indexOf('<SkipLink />')).toBeGreaterThan(-1)
    expect(app.indexOf('<SkipLink />')).toBeLessThan(app.indexOf('<Navbar'))
    expect(app).toMatch(/className="container"\s+id="main-content"\s+tabIndex=\{-1\}/)
  })
})

describe('stylesheet', () => {
  it('has no text smaller than 14px', () => {
    const px = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
    expect(px.length).toBeGreaterThan(10)
    expect(Math.min(...px)).toBeGreaterThanOrEqual(14)
    const rem = [...css.matchAll(/font-size:\s*(\d*\.?\d+)rem/g)].map((m) => Number(m[1]))
    for (const r of rem) expect(r).toBeGreaterThanOrEqual(0.875)
  })
  it('ends both blue gradients on the deeper blue', () => {
    expect(css).not.toMatch(/#2e8fd0\s+100%/i)
    expect((css.match(/var\(--sf-blue-deep\)\s+100%/g) || []).length).toBe(2)
    expect(css).toMatch(/--sf-blue-deep:\s*#2478b6/i)
  })
  it('gives white text on the gradients', () => {
    const block = (sel) => css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)))
    for (const sel of ['.sf-eyebrow {', '.sf-sub {', '.sf-menu__item--plain {']) expect(block(sel)).toMatch(/color:\s*#fff/)
  })
  it('has one focus ring for everything, white on dark backgrounds', () => {
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*3px solid var\(--sf-focus\)/)
    expect(css).toMatch(/\.sf-hero,\s*\.sf-menu,\s*\.sf-footer\s*\{\s*--sf-focus:\s*#fff/)
    expect(css).toMatch(/\.sf-room:focus-visible\s*\{\s*outline:\s*3px/)
  })
  it('buttons are 40px with a mouse and 44px on touch screens', () => {
    expect(css).toMatch(/--sf-btn-h:\s*40px/)
    expect(css).toMatch(/@media \(pointer: coarse\)\s*\{\s*:root\s*\{\s*--sf-btn-h:\s*44px/)
    expect(css).toMatch(/\.sf-cta \{[^}]*min-height:\s*var\(--sf-btn-h\)/)
    expect(css).toMatch(/@media \(pointer: coarse\)\s*\{\s*button,[^}]*min-height:\s*44px/)
  })
  it('calms animation for people who ask for less motion', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\*,/)
  })
})
