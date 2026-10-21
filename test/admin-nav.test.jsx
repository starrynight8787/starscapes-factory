import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('../src/data/channels', () => ({ channels: [{ slug: 'art-loft', name: 'The Art Loft', tagline: 'Prints and originals.' }] }))
vi.mock('../src/supabaseClient', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
const owner = vi.hoisted(() => ({ value: true }))
vi.mock('../src/admin/useIsOwner', () => ({ default: () => owner.value, useOwnerCheck: () => ({ checking: false, owner: owner.value }) }))

import Navbar from '../src/components/Navbar'

const show = (session) => render(<MemoryRouter><Navbar session={session} /></MemoryRouter>)
const SIGNED_IN = { access_token: 'x', user: { id: 'u' } }
beforeEach(() => { owner.value = true })

describe('the Admin button in the menu', () => {
  it('shows to the owner on the computer menu, going to the admin console', () => {
    const { container } = show(SIGNED_IN)
    const actions = within(container.querySelector('.sf-nav__actions'))
    expect(actions.getByRole('link', { name: 'Admin' }).getAttribute('href')).toBe('/admin')
    expect(actions.getByRole('button', { name: 'Log out' })).toBeTruthy()
  })
  it('is drawn as a button on the computer menu, a pale pill that stands out from the ordinary links, and has the button look defined', () => {
    const { container } = show(SIGNED_IN)
    const admin = within(container.querySelector('.sf-nav__actions')).getByRole('link', { name: 'Admin' })
    expect(admin.className).toContain('sf-admin-btn')
    const css = readFileSync(join(process.cwd(), 'src/admin/admin.css'), 'utf8')
    expect(css).toMatch(/\.sf-link\.sf-admin-btn \{[^}]*border-radius: 999px/)
    expect(css).toMatch(/\.sf-link\.sf-admin-btn \{[^}]*min-height: 40px/)
  })
  it('shows to the owner on the phone menu too, and replaces New post and New product there as well', async () => {
    const { container } = show(SIGNED_IN)
    await userEvent.click(container.querySelector('.sf-burger'))
    const items = [...container.querySelectorAll('.sf-menu__item')]
    const admin = items.filter((a) => a.textContent.trim() === 'Admin')
    expect(admin).toHaveLength(1)
    expect(admin[0].getAttribute('href')).toBe('/admin')
    expect(items.some((a) => /New post|New product/.test(a.textContent))).toBe(false)
  })
  it('does not show on the phone menu to someone who is not the owner', async () => {
    owner.value = false
    const { container } = show(SIGNED_IN)
    await userEvent.click(container.querySelector('.sf-burger'))
    expect([...container.querySelectorAll('.sf-menu__item')].some((a) => a.textContent.trim() === 'Admin')).toBe(false)
  })
  it('does not show to someone signed in who is not the owner', () => {
    owner.value = false
    const { container } = show(SIGNED_IN)
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
    expect(container.textContent).not.toMatch(/\bAdmin\b/)
    expect(within(container.querySelector('.sf-nav__actions')).getByRole('button', { name: 'Log out' })).toBeTruthy()
  })
  it('does not show to someone signed out, who sees Log in instead', () => {
    owner.value = false
    const { container } = show(null)
    expect(container.textContent).not.toMatch(/\bAdmin\b/)
    expect(within(container.querySelector('.sf-nav__actions')).getByRole('link', { name: 'Log in' })).toBeTruthy()
  })
  it('replaces New post and New product in the menu: they now live in the console', () => {
    const { container } = show(SIGNED_IN)
    expect(container.textContent).not.toMatch(/New post|New product/)
    expect(container.querySelector('a[href="/new"], a[href="/new-product"]')).toBeNull()
  })
})

describe('the /admin page in the app', () => {
  const app = readFileSync(join(process.cwd(), 'src/App.jsx'), 'utf8')
  it('is behind the sign-in, like the New post page', () => {
    expect(app).toContain("import AdminConsole from './admin/AdminConsole'")
    expect(app).toMatch(/<Route path="\/admin" element=\{\s*<ProtectedRoute session=\{session\}>\s*<AdminConsole session=\{session\} \/>\s*<\/ProtectedRoute>\s*\}\s*\/>/)
  })
  it('leaves the New post and New product pages where they are, so the console can open them', () => {
    expect(app).toContain('path="/new-product"')
    expect(app).toMatch(/path="\/new"/)
  })
})

describe('the My account button in the menu (My passes once memberships open)', () => {
  it('shows to a signed-in member (not the owner) on the computer menu and the phone menu, going to their passes', async () => {
    owner.value = false
    const { container } = show(SIGNED_IN)
    expect(within(container.querySelector('.sf-nav__actions')).getByRole('link', { name: 'My account' }).getAttribute('href')).toBe('/membership/passes')
    await userEvent.click(container.querySelector('.sf-burger'))
    expect(within(container.querySelector('.sf-menu__actions')).getByRole('link', { name: 'My account' }).getAttribute('href')).toBe('/membership/passes')
  })
  it('does not show to the owner or to someone signed out', () => {
    owner.value = true
    expect(show(SIGNED_IN).container.textContent).not.toMatch(/My (passes|account)/)
  })
  it('does not show to someone signed out', () => {
    owner.value = false
    expect(show(null).container.textContent).not.toMatch(/My (passes|account)/)
  })
})
