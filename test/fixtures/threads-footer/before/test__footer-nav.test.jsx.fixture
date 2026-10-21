// The footer's links are drawn on the dark footer, not inside white boxes (the old starter rule for every nav put them there and hid the text).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Footer from '../src/components/Footer'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
let style
beforeAll(() => {
  // the two stylesheets in the order the site loads them: the old starter rules first (main.jsx), the site's own after
  style = document.createElement('style')
  style.textContent = `${read('src/index.css')}\n${read('src/styles/site.css')}`
  document.head.appendChild(style)
})
afterAll(() => style.remove())

const navs = () => {
  render(<MemoryRouter><Footer /></MemoryRouter>)
  return [screen.getByRole('navigation', { name: 'Rooms' }), screen.getByRole('navigation', { name: 'Shop and help' }), screen.getByRole('navigation', { name: 'Follow us' })]
}
const clear = (v) => v === 'transparent' || v === 'rgba(0, 0, 0, 0)' || v === ''

describe('the footer links on the dark footer', () => {
  it('have no white box: both lists are transparent, with no padding and no border', () => {
    for (const nav of navs()) {
      const s = getComputedStyle(nav)
      expect(clear(s.backgroundColor), `${nav.getAttribute('aria-label')} background was ${s.backgroundColor}`).toBe(true)
      expect(parseFloat(s.paddingTop || '0'), `${nav.getAttribute('aria-label')} padding`).toBe(0)
      expect(parseFloat(s.paddingLeft || '0')).toBe(0)
      expect(s.borderBottomWidth === '' || parseFloat(s.borderBottomWidth) === 0, `${nav.getAttribute('aria-label')} border`).toBe(true)
    }
  })
  it('keep their links in the footer, so the rule that clears the box reaches them', () => {
    const [rooms, help, follow] = navs()
    for (const nav of [rooms, help, follow]) expect(nav.closest('.sf-footer')).not.toBeNull()
    expect(within(rooms).getAllByRole('link')).toHaveLength(8)
    expect(within(help).getAllByRole('link').length).toBeGreaterThanOrEqual(3) // only the pages that are ready are linked (staticPages.js)
    expect(within(follow).getAllByRole('link').length).toBeGreaterThanOrEqual(3)
  })
  it('say so in the stylesheet, in a rule that is after the old one and is more specific', () => {
    const site = read('src/styles/site.css')
    expect(site).toMatch(/\.sf-footer nav \{[^}]*padding:\s*0;[^}]*background:\s*transparent;[^}]*border:\s*0/s)
    expect(site).toMatch(/\.sf-footer nav a \{[^}]*margin-right:\s*0/s)
  })
  it('no longer depend on the footer override alone: the old white-box rule for every nav is gone from the shared stylesheet (retired in restyle part 2)', () => {
    expect(read('src/index.css')).not.toMatch(/nav \{[^}]*background:\s*#fff/s)
  })
})

describe('the footer\u2019s Follow column', () => {
  it('has the heading from the design, and the accounts that have an address', () => {
    const [, , follow] = navs()
    expect(within(follow).getByRole('heading', { level: 2, name: 'Follow' })).toBeInTheDocument()
    expect(within(follow).getAllByRole('link')).toHaveLength(3)
  })
  it('still names the list for screen reader users', () => {
    const [, , follow] = navs()
    expect(follow).toHaveAttribute('aria-label', 'Follow us')
  })
  it('leaves no unused label style behind', () => {
    expect(read('src/styles/site.css')).not.toContain('sf-footer__follow-label')
  })
})
