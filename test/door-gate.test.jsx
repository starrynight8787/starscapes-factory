import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const state = vi.hoisted(() => ({ doors: { ready: true, failed: false, open: {} }, owner: { checking: false, owner: false } }))
vi.mock('../src/doors/useDoors', () => ({
  default: () => ({ ready: state.doors.ready, failed: state.doors.failed, isOpen: (room, door) => Boolean(state.doors.open[`${room}/${door}`]) }),
  loadDoors: () => {},
  forgetDoors: () => {},
}))
vi.mock('../src/doors/useCurrentOwner', () => ({ default: () => state.owner }))

import DoorGate from '../src/doors/DoorGate'

const show = () => render(<MemoryRouter><DoorGate room="sarah-jrs-den" door="blog"><p>THE BLOG PAGE</p></DoorGate></MemoryRouter>)
beforeEach(() => { state.doors = { ready: true, failed: false, open: {} }; state.owner = { checking: false, owner: false } })

describe('the gate on a page behind a door', () => {
  it('shows the page to everyone once the door is open, with no banner', () => {
    state.doors.open = { 'sarah-jrs-den/blog': true }
    show()
    expect(screen.getByText('THE BLOG PAGE')).toBeTruthy()
    expect(screen.queryByRole('note')).toBeNull()
  })
  it('tells a visitor the door is not open yet, and shows nothing of the page', () => {
    show()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("This door isn't open yet")
    expect(screen.getByText('Come back soon.')).toBeTruthy()
    expect(screen.queryByText('THE BLOG PAGE')).toBeNull()
  })
  it('gives the visitor a way back to the room', () => {
    show()
    expect(screen.getByRole('link', { name: /Back to Sarah Junior's Clubhouse/ }).getAttribute('href')).toBe('/sarah-jrs-den')
  })
  it('shows the owner the page under a banner that says the door is closed, with a way to open it', () => {
    state.owner = { checking: false, owner: true }
    show()
    expect(screen.getByText('THE BLOG PAGE')).toBeTruthy()
    const banner = screen.getByRole('note')
    expect(banner.textContent).toMatch(/This door is closed/)
    expect(banner.textContent).toMatch(/Only you can see this page/)
    expect(screen.getByRole('link', { name: 'Open it in Admin' }).getAttribute('href')).toBe('/admin/doors')
  })
  it('keeps the door closed when the doors could not be read', () => {
    state.doors = { ready: true, failed: true, open: {} }
    show()
    expect(screen.queryByText('THE BLOG PAGE')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("This door isn't open yet")
  })
  it('shows the loading page, and nothing of the page, while it is still finding out', () => {
    state.doors = { ready: false, failed: false, open: {} }
    show()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByText('THE BLOG PAGE')).toBeNull()
    expect(screen.queryByText(/isn't open yet/)).toBeNull()
  })
  it('does not flash "not open yet" at the owner while it is still checking who they are', () => {
    state.owner = { checking: true, owner: false }
    show()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByText(/isn't open yet/)).toBeNull()
  })
  it('does not show the banner to the owner when the door is open', () => {
    state.owner = { checking: false, owner: true }
    state.doors.open = { 'sarah-jrs-den/blog': true }
    show()
    expect(screen.queryByRole('note')).toBeNull()
  })
})
