import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { roomPath } from '../src/data/roomImages'

// the eight rooms, written out here so this test does not depend on the live list
vi.mock('../src/data/channels', () => ({
  channels: [
    { slug: 'factory-floor', name: 'The Factory Floor', tagline: 'Posts and blueprints.' },
    { slug: 'leadership-lounge', name: 'Leadership Lounge', tagline: 'Leading from the middle.' },
    { slug: 'idea-hatchery', name: 'The Idea Hatchery', tagline: 'Where ideas get tested.' },
    { slug: 'knowledge-nook', name: 'Knowledge Nook', tagline: 'Books and stories.' },
    { slug: 'sarah-jrs-den', name: "Sarah Jr.'s Den", tagline: 'A little world.' },
    { slug: 'art-loft', name: 'The Art Loft', tagline: 'Prints and originals.' },
    { slug: 'drafting-desk', name: 'The Drafting Desk', tagline: 'Where the writing happens.' },
    { slug: 'explorers-bay', name: "Explorer's Bay", tagline: 'Stories and pictures from the road.' },
  ],
}))
vi.mock('../src/supabaseClient', () => ({ supabase: { auth: { signOut: vi.fn() } } }))

import Navbar from '../src/components/Navbar'

const SLUGS = ['factory-floor', 'leadership-lounge', 'idea-hatchery', 'knowledge-nook', 'sarah-jrs-den', 'art-loft', 'drafting-desk', 'explorers-bay']
const show = () => render(<MemoryRouter><Navbar session={null} /></MemoryRouter>)

describe('the Rooms dropdown', () => {
  it('shows each room\u2019s new icon, 44 pixels, beside its name', async () => {
    const { container } = show()
    await userEvent.click(screen.getByRole('button', { name: /rooms/i }))
    const rows = [...container.querySelectorAll('.sf-rooms__item')]
    expect(rows).toHaveLength(8)
    rows.forEach((row, i) => {
      const img = row.querySelector('img.sf-room-icon')
      expect(img, SLUGS[i]).not.toBeNull()
      expect(img.getAttribute('src')).toBe(`/icons/rooms/${SLUGS[i]}.png`)
      expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['44', '44'])
      expect(img.getAttribute('alt')).toBe('')
    })
  })
  it('still reads as just the room\u2019s name and line (the picture adds nothing for a screen reader)', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: /rooms/i }))
    expect(screen.getByRole('link', { name: 'The Art Loft Prints and originals.' })).toBeTruthy()
    expect(screen.getByRole('link', { name: "Sarah Jr.'s Den A little world." })).toBeTruthy()
  })
  it('goes to each room\u2019s own page (the rooms each have one now), the same address the rest of the site uses for it', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: /rooms/i }))
    expect(screen.getByRole('link', { name: /^The Art Loft/ }).getAttribute('href')).toBe('/art-loft')
    expect(screen.getByRole('link', { name: /^The Factory Floor/ }).getAttribute('href')).toBe('/factory-floor')
    expect(screen.getByRole('link', { name: /^The Idea Hatchery/ }).getAttribute('href')).toBe('/idea-hatchery')
    expect(screen.getByRole('link', { name: /^Leadership Lounge/ }).getAttribute('href')).toBe('/leadership-lounge')
    expect(screen.getByRole('link', { name: /^Knowledge Nook/ }).getAttribute('href')).toBe('/knowledge-nook')
    for (const slug of ['art-loft', 'factory-floor', 'idea-hatchery', 'leadership-lounge', 'knowledge-nook', 'sarah-jrs-den', 'drafting-desk', 'explorers-bay']) {
      expect(roomPath(slug), slug).toBe(`/${slug}`)
    }
  })
})

describe('the phone menu', () => {
  it('shows each room\u2019s new icon, 40 pixels, beside its name', async () => {
    const { container } = show()
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))
    const dialog = screen.getByRole('dialog', { name: 'Menu' })
    const rows = [...dialog.querySelectorAll('a.sf-menu__item:not(.sf-menu__item--plain)')].filter((a) => a.querySelector('img'))
    expect(rows).toHaveLength(8)
    rows.forEach((row, i) => {
      const img = row.querySelector('img.sf-room-icon')
      expect(img.getAttribute('src')).toBe(`/icons/rooms/${SLUGS[i]}.png`)
      expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['40', '40'])
    })
    expect(within(dialog).getByRole('link', { name: 'The Drafting Desk' })).toBeTruthy()
  })
})
