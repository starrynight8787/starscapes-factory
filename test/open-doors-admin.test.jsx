import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const store = vi.hoisted(() => ({ open: {}, loadFails: false, saveError: null, saved: [], owner: { checking: false, owner: true } }))
vi.mock('../src/doors/doorsApi', () => ({
  fetchDoors: async () => { if (store.loadFails) throw new Error('no table'); return { ...store.open } },
  saveDoor: async (room, door, open) => {
    if (store.saveError) throw new Error(store.saveError)
    store.saved.push([room, door, open])
    if (open) store.open[`${room}/${door}`] = true; else delete store.open[`${room}/${door}`]
  },
}))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => store.owner, default: () => store.owner.owner }))

import OpenDoors from '../src/admin/OpenDoors'
import { forgetDoors } from '../src/doors/useDoors'
import { DOORS } from '../src/doors/doorsData'
import { ROOMS } from '../src/rooms/roomsData'

const show = async () => {
  const view = render(<MemoryRouter><OpenDoors session={{ access_token: 'x' }} /></MemoryRouter>)
  await screen.findByRole('heading', { level: 1, name: 'Open a door' })
  return view
}
beforeEach(() => { forgetDoors(); Object.assign(store, { open: {}, loadFails: false, saveError: null, saved: [], owner: { checking: false, owner: true } }) })

describe('the Open a door tool', () => {
  it('lists the five rooms, with every door under its room, all closed to start with', async () => {
    await show()
    // The page sets the rooms out in two columns (the Nook and the Hatchery on the left; the Den, the Lounge and the Bay on the right), so that is the order they read in
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    // (the names come from the rooms' own data, so renaming a room can never make this test stale again)
    const COLUMN_ORDER = ['knowledge-nook', 'idea-hatchery', 'sarah-jrs-den', 'leadership-lounge', 'explorers-bay'].map((room) => ROOMS[room].name)
    expect(headings).toEqual(COLUMN_ORDER)
    expect([...headings].sort()).toEqual(['idea-hatchery', 'knowledge-nook', 'leadership-lounge', 'explorers-bay', 'sarah-jrs-den'].map((room) => ROOMS[room].name).sort()) // every one of the five, once each
    expect(screen.getAllByRole('listitem').filter((li) => li.classList.contains('ad-door'))).toHaveLength(DOORS.length)
    expect(screen.getAllByText('Closed')).toHaveLength(DOORS.length)
    expect(screen.queryByText('Open to visitors')).toBeNull()
  })
  it('gives a door that has a page a button to open it, named for the door', async () => {
    await show()
    expect(screen.getByRole('button', { name: 'Open this door: Blog' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Open this door: Books' })).toBeEnabled()
  })
  it('keeps a door with no page switched off, and says why', async () => {
    await show()
    const row = screen.getByText('Something New').closest('li') // the paid bottle is the one door still without a page
    expect(within(row).getByRole('button', { name: 'Open this door: Something New' })).toBeDisabled()
    expect(within(row).getByText('Its page has not been built yet, so it cannot be opened.')).toBeTruthy()
    expect(within(row).queryByRole('link')).toBeNull()
  })
  it('warns that a dotted-outline picture will look unfinished once open', async () => {
    await show()
    const row = screen.getByText('Come Study With Me').closest('li')
    expect(within(row).getByText(/dotted outline for now/)).toBeTruthy()
  })
  it('opens a door: saves it, shows it as open, and says so in words', async () => {
    const user = userEvent.setup()
    await show()
    await user.click(screen.getByRole('button', { name: 'Open this door: Blog' }))
    await waitFor(() => expect(store.saved).toEqual([['sarah-jrs-den', 'blog', true]]))
    const row = screen.getByText('Blog').closest('li')
    await waitFor(() => expect(within(row).getByText('Open to visitors')).toBeTruthy())
    expect(within(row).getByRole('button', { name: 'Close this door: Blog' })).toBeEnabled()
    expect(screen.getByRole('status').textContent).toContain('Blog is now open to visitors.')
  })
  it('closes it again', async () => {
    const user = userEvent.setup()
    store.open = { 'sarah-jrs-den/blog': true }
    await show()
    await user.click(screen.getByRole('button', { name: 'Close this door: Blog' }))
    await waitFor(() => expect(store.saved).toEqual([['sarah-jrs-den', 'blog', false]]))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Blog is closed again.'))
    expect(within(screen.getByText('Blog').closest('li')).getByText('Closed')).toBeTruthy()
  })
  it('links to a door\u2019s page, and says only you can see it while it is closed', async () => {
    await show()
    const link = within(screen.getByText('Blog').closest('li')).getByRole('link')
    expect(link.getAttribute('href')).toBe('/sarah-jrs-den/blog')
    expect(link.textContent).toMatch(/only you can see it while closed/)
  })
  it('says the door was not changed, and why, when saving fails; and the door stays as it was', async () => {
    const user = userEvent.setup()
    store.saveError = 'new row violates row-level security policy'
    await show()
    await user.click(screen.getByRole('button', { name: 'Open this door: Blog' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/Blog was not changed/)
    expect(alert.textContent).toMatch(/row-level security/)
    expect(within(screen.getByText('Blog').closest('li')).getByText('Closed')).toBeTruthy()
  })
  it('keeps every door shut, and says what to check, when the doors cannot be read', async () => {
    store.loadFails = true
    await show()
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/Every door is staying closed for now/)
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })
  it('shows the database\u2019s own reason when the doors cannot be read, and the two lines to run, instead of telling you to run a file by name', async () => {
    store.loadFails = true
    await show()
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('The database said: \u201cno table\u201d.')
    expect(alert.querySelector('code').textContent).toBe('grant select on public.doors to anon, authenticated;grant insert, update, delete on public.doors to authenticated;')
    expect(alert.textContent).not.toMatch(/sql\/doors\.sql|Has .* been run/)
    expect(alert.textContent).toMatch(/the lines themselves, not a file name/)
  })
  it('is for the owner only', async () => {
    store.owner = { checking: false, owner: false }
    render(<MemoryRouter><OpenDoors session={{ access_token: 'x' }} /></MemoryRouter>)
    expect(await screen.findByText('This area is for the site owner.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('has a way back to the console', async () => {
    await show()
    expect(screen.getByRole('link', { name: /Back to Admin/ }).getAttribute('href')).toBe('/admin')
  })
})
