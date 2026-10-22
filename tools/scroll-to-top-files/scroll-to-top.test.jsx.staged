// Moving around the site: a page you click through to opens at the top, not wherever the last page was scrolled to (a tester found the footer links opened scrolled down, 22 October 2026).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import ScrollToTop from '../src/components/ScrollToTop'

let scrolledInto
function Back() { const go = useNavigate(); return <button type="button" onClick={() => go(-1)}>Back</button> }
function Forward() { const go = useNavigate(); return <button type="button" onClick={() => go(1)}>Forward</button> }
function Shell({ start = '/' }) {
  return (
    <MemoryRouter initialEntries={[start]}>
      <ScrollToTop />
      <nav>
        <Link to="/">Home</Link>
        <Link to="/page/privacy">Privacy</Link>
        <Link to="/page/terms">Terms</Link>
        <Link to="/page/privacy?filter=1">Privacy, filtered</Link>
        <Link to="/?filter=1">Home, filtered</Link>
        <Link to="/page/privacy#section-two">Privacy, section two</Link>
        <Link to="#section-two">This page, section two</Link>
        <Link to="/page/privacy#nope">Privacy, a section that is not there</Link>
        <Link to="/page/privacy#%E0%A4%A">Privacy, a badly written link</Link>
        <Back /><Forward />
      </nav>
      <Routes>
        <Route path="/" element={<main><h1>Home</h1></main>} />
        <Route path="/page/privacy" element={<main><h1>Privacy</h1><div id="section-two">Section two</div></main>} />
        <Route path="/page/terms" element={<main><h1>Terms</h1></main>} />
      </Routes>
    </MemoryRouter>
  )
}
const click = (name) => userEvent.click(screen.getByRole('link', { name }))
const heading = () => screen.getByRole('heading', { level: 1 }).textContent

beforeEach(() => {
  window.scrollTo = vi.fn()
  scrolledInto = []
  Element.prototype.scrollIntoView = vi.fn(function () { scrolledInto.push(this.id) })
})

describe('a page you click through to opens at the top', () => {
  it('does nothing when the site first opens (a reload keeps the browser\u2019s own place)', () => {
    render(<Shell start="/page/privacy" />)
    expect(window.scrollTo).not.toHaveBeenCalled(); expect(scrolledInto).toEqual([])
  })
  it('scrolls to the very top when a link opens another page', async () => {
    render(<Shell />)
    await click('Privacy')
    expect(heading()).toBe('Privacy')
    expect(window.scrollTo).toHaveBeenCalledTimes(1); expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })
  it('does it for every page you move to, not just the first', async () => {
    render(<Shell />)
    await click('Privacy'); await click('Terms'); await click('Home')
    expect(heading()).toBe('Home'); expect(window.scrollTo).toHaveBeenCalledTimes(3)
  })
})

describe('what it leaves alone', () => {
  it('Back and Forward: the browser puts you back where you were, so nothing moves', async () => {
    render(<Shell />)
    await click('Privacy')
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(heading()).toBe('Home'); expect(window.scrollTo).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Forward' }))
    expect(heading()).toBe('Privacy'); expect(window.scrollTo).toHaveBeenCalledTimes(1)
  })
  it('a change that only alters the ?query (a filter or a search on the same page) does not jump to the top', async () => {
    render(<Shell start="/page/privacy" />)
    await click('Privacy, filtered')
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
  it('a ?query change straight after going Back still does not jump (the case that is easy to get wrong)', async () => {
    render(<Shell />)
    await click('Privacy')
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    await click('Home, filtered')
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
  })
})

describe('links to a #section', () => {
  it('a link from another page brings that section into view, not the top', async () => {
    render(<Shell />)
    await click('Privacy, section two')
    expect(scrolledInto).toEqual(['section-two']); expect(window.scrollTo).not.toHaveBeenCalled()
  })
  it('a link to a section on the page you are already on brings that section into view', async () => {
    render(<Shell start="/page/privacy" />)
    await click('This page, section two')
    expect(scrolledInto).toEqual(['section-two']); expect(window.scrollTo).not.toHaveBeenCalled()
  })
  it('a link to a section that is not on the page goes to the top instead', async () => {
    render(<Shell />)
    await click('Privacy, a section that is not there')
    expect(scrolledInto).toEqual([]); expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })
  it('a badly written link (bad % in it) cannot break the page: it goes to the top', async () => {
    render(<Shell />)
    await click('Privacy, a badly written link')
    expect(heading()).toBe('Privacy'); expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })
})

describe('it is actually switched on in the site', () => {
  const app = fs.readFileSync('src/App.jsx', 'utf8')
  it('App imports it and mounts it exactly once, in the shell, before the pages', () => {
    expect(app).toContain("import ScrollToTop from './components/ScrollToTop'")
    expect(app.match(/<ScrollToTop \/>/g)).toHaveLength(1)
    expect(app.indexOf('<ScrollToTop />')).toBeLessThan(app.indexOf('<Routes>'))
    expect(app.indexOf('<ScrollToTop />')).toBeGreaterThan(app.indexOf('<RouteTitle />'))
  })
  it('the site is still wrapped in a router that gives it the page you are on (it needs one to work)', () => {
    const main = fs.readFileSync('src/main.jsx', 'utf8')
    expect(main).toMatch(/<BrowserRouter>[\s\S]*<App \/>[\s\S]*<\/BrowserRouter>/)
  })
})
