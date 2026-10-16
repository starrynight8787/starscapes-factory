import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import HomeLink from '../src/components/HomeLink'
import RoomScene from '../src/rooms/RoomScene'
import DraftingDeskHome from '../src/draftingdesk/DraftingDeskHome'
import { buildRoomScene } from '../src/rooms/roomsData'

const css = readFileSync(join(process.cwd(), 'src/components/homelink.css'), 'utf8')

describe('the Home link', () => {
  it('is a link to the home page, and a screen reader just hears "Home" (the arrow is only decoration)', () => {
    render(<MemoryRouter><HomeLink /></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.getAttribute('href')).toBe('/')
    expect(link.textContent).toBe('\u2190 Home')
    expect(link.querySelector('span[aria-hidden="true"]').textContent).toBe('\u2190')
  })
  it('can be given a class by the room it is in', () => {
    render(<MemoryRouter><HomeLink className="al-home" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Home' }).className).toBe('sf-home-link al-home')
  })
  it('is small and navy, as in the design, with a bigger target for a finger', () => {
    expect(css).toMatch(/\.sf-home-link \{[^}]*font-size:\s*14px/)
    expect(css).toMatch(/\.sf-home-link \{[^}]*color:\s*var\(--sf-navy-700, #14306a\)/)
    expect(css).toMatch(/\.sf-home-link \{[^}]*min-height:\s*32px/)
    expect(css).toMatch(/@media \(pointer: coarse\)\s*\{\s*\.sf-home-link \{\s*min-height:\s*44px/)
  })
})

describe('every illustrated room has it, first, above its heading', () => {
  const rooms = [
    ['idea-hatchery', () => <RoomScene scene={buildRoomScene('idea-hatchery')} />],
    ['leadership-lounge', () => <RoomScene scene={buildRoomScene('leadership-lounge')} />],
    ['explorers-bay', () => <RoomScene scene={buildRoomScene('explorers-bay')} />],
    ['drafting-desk', () => <DraftingDeskHome />],
  ]
  it.each(rooms)('%s', (slug, page) => {
    const { container } = render(<MemoryRouter>{page()}</MemoryRouter>)
    const links = screen.getAllByRole('link', { name: 'Home' })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/')
    const main = container.querySelector('main.rs')
    expect(main.firstElementChild.className).toBe('rs-home')
    expect(main.firstElementChild.contains(links[0])).toBe(true)
    // it comes before the heading in the page, so a keyboard user meets it first
    const h1 = container.querySelector('h1')
    expect(links[0].compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
