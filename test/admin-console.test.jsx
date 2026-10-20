import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// the owner question, answered by each test
const ownerCheck = vi.hoisted(() => ({ value: { checking: false, owner: true } }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ownerCheck.value, default: () => ownerCheck.value.owner }))

import AdminConsole from '../src/admin/AdminConsole'
import { ADMIN_GROUPS, ADMIN_TOOLS } from '../src/admin/adminTools'

const show = () => render(<MemoryRouter><AdminConsole session={{ access_token: 'x' }} /></MemoryRouter>)
beforeEach(() => { ownerCheck.value = { checking: false, owner: true } })

describe('the admin console, for the owner', () => {
  it('is called Admin, says only the owner can see it, and sets the tab title', () => {
    show()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Admin')
    expect(screen.getByText(/Only you can see this page/)).toBeTruthy()
    expect(document.title).toBe('Admin | Starscapes Factory')
  })
  it('groups the tools under headings: Write, Shop, Members and Rooms', () => {
    show()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Write', 'Shop', 'Members', 'Rooms'])
  })
  it('holds New post and New product, the tools that used to sit in the menu', () => {
    show()
    expect(screen.getByRole('link', { name: /New post/ }).getAttribute('href')).toBe('/new')
    expect(screen.getByRole('link', { name: /New product/ }).getAttribute('href')).toBe('/new-product')
  })
  it('holds the Open a door tool, now that it is built', () => {
    show()
    expect(screen.getByRole('link', { name: /Open a door/ }).getAttribute('href')).toBe('/admin/doors')
  })
  it('holds the shop tools: prints, orders and Creative Hub, and the originals', () => {
    show()
    expect(screen.getByRole('link', { name: /Prints, orders and Creative Hub/ }).getAttribute('href')).toBe('/art-loft/admin')
    expect(screen.getByRole('link', { name: /Originals/ }).getAttribute('href')).toBe('/art-loft/admin/originals')
  })
  it('gives every tool a name and a line saying what it is for, and every link a clear name', () => {
    show()
    for (const tool of ADMIN_TOOLS) {
      expect(tool.name.length, tool.name).toBeGreaterThan(2)
      expect(tool.blurb.length, tool.name).toBeGreaterThan(20)
      expect(screen.getByText(tool.name), tool.name).toBeTruthy()
    }
    expect(ADMIN_TOOLS.every((t) => ADMIN_GROUPS.includes(t.group))).toBe(true)
  })
  it('shows tools that are planned as coming soon, and does not make them links to nowhere', () => {
    show()
    const soon = ADMIN_TOOLS.filter((t) => !t.to) // whichever tools are still planned: the list shrinks as each is built, so no names are listed here
    expect(soon.every((t) => ['Promotions', 'Manage comments', 'Newsletter'].includes(t.name))).toBe(true)
    for (const tool of soon) {
      expect(screen.queryByRole('link', { name: new RegExp(tool.name) }), tool.name).toBeNull()
      const item = screen.getByText(tool.name).closest('li')
      expect(within(item).getByText('Coming soon')).toBeTruthy()
    }
    expect(screen.queryAllByText('Coming soon')).toHaveLength(soon.length) // none at all, once every tool has been built
  })
  it('lists each tool as a list item, so a screen reader can count them', () => {
    const { container } = show()
    expect(container.querySelectorAll('ul.ad-tools > li')).toHaveLength(ADMIN_TOOLS.length)
  })
})

describe('the admin console, for anyone else', () => {
  it('says it is for the site owner and shows none of the tools', () => {
    ownerCheck.value = { checking: false, owner: false }
    show()
    expect(screen.getByText('This area is for the site owner.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /New post|New product|Prints|Originals/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to the homepage' }).getAttribute('href')).toBe('/')
  })
  it('shows the loading page while the server is still being asked, and no tools yet', () => {
    ownerCheck.value = { checking: true, owner: false }
    show()
    expect(screen.getByRole('status').textContent).toMatch(/Checking who you are/)
    expect(screen.queryByRole('link', { name: /New post/ })).toBeNull()
  })
})
