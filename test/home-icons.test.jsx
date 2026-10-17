import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('../src/data/channels', () => ({
  channels: [
    { slug: 'factory-floor', name: 'The Factory Floor', tagline: 'Posts and blueprints.' },
    { slug: 'leadership-lounge', name: 'Leadership Lounge', tagline: 'Leading from the middle.' },
    { slug: 'idea-hatchery', name: 'The Idea Hatchery', tagline: 'Where ideas get tested.' },
    { slug: 'knowledge-nook', name: 'Knowledge Nook', tagline: 'Reading, learning and personal growth.' },
    { slug: 'sarah-jrs-den', name: "Sarah Jr.'s Den", tagline: 'Kids travel adventures.' },
    { slug: 'art-loft', name: 'The Art Loft', tagline: 'Prints and originals.' },
    { slug: 'drafting-desk', name: 'The Drafting Desk', tagline: 'Where the writing happens.' },
    { slug: 'explorers-bay', name: "Explorer's Bay", tagline: 'Stories and pictures from the road.' },
  ],
}))
vi.mock('../src/supabaseClient', () => {
  const api = { select() { return api }, eq() { return api }, order() { return api }, limit() { return api }, then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject) } }
  return { supabase: { from: () => api } }
})

import ChannelDirectory from '../src/pages/ChannelDirectory'
import { roomPath } from '../src/data/roomImages'

const SIZES = { 'factory-floor': 64, 'leadership-lounge': 64, 'idea-hatchery': 44, 'knowledge-nook': 68, 'sarah-jrs-den': 64, 'art-loft': 112, 'drafting-desk': 96, 'explorers-bay': 88 }
const show = () => render(<MemoryRouter><ChannelDirectory /></MemoryRouter>)

describe('the home page floor plan', () => {
  it('draws each room\u2019s new icon in its place on the plan, at the size the plan gives it', () => {
    const { container } = show()
    for (const [slug, size] of Object.entries(SIZES)) {
      const room = [...container.querySelectorAll('a.sf-room')].find((a) => a.querySelector('image').getAttribute('href') === `/icons/rooms/${slug}.png`)
      expect(room, slug).toBeTruthy()
      const image = room.querySelector('image')
      expect([image.getAttribute('width'), image.getAttribute('height')], slug).toEqual([String(size), String(size)])
    }
  })
  it('no longer draws the old room pictures on the plan', () => {
    const { container } = show()
    const hrefs = [...container.querySelectorAll('.sf-plan image')].map((i) => i.getAttribute('href'))
    expect(hrefs).toHaveLength(8)
    for (const h of hrefs) expect(h).toMatch(/^\/icons\/rooms\/[a-z-]+\.png$/)
  })
  it('keeps every room\u2019s link and its spoken name exactly as they were', () => {
    const { container } = show()
    const rooms = [...container.querySelectorAll('a.sf-room')]
    expect(rooms).toHaveLength(8)
    for (const a of rooms) {
      const slug = a.querySelector('image').getAttribute('href').match(/rooms\/([a-z-]+)\.png/)[1]
      expect(a.getAttribute('href'), slug).toBe(roomPath(slug))
    }
    expect(screen.getByRole('link', { name: 'The Art Loft. Prints and originals.' })).toBeTruthy()
    expect(screen.getByRole('link', { name: "Sarah Jr.'s Den. Kids travel adventures." })).toBeTruthy()
  })
  it('keeps its headline and hint', () => {
    show()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Step inside. Pick a room.')
    expect(screen.getByText('Click a room to walk in.')).toBeTruthy()
  })
})

describe('the room cards that phones and small screens see', () => {
  it('show each room\u2019s new icon at 64 pixels, as decoration (the name is written beside it)', () => {
    const { container } = show()
    const cards = [...container.querySelectorAll('a.sf-roomcard')]
    expect(cards).toHaveLength(8)
    for (const card of cards) {
      const img = card.querySelector('img.sf-room-icon')
      expect(img, card.textContent).not.toBeNull()
      expect(img.getAttribute('src')).toMatch(/^\/icons\/rooms\/[a-z-]+\.png$/)
      expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['64', '64'])
      expect(img.getAttribute('alt')).toBe('')
    }
  })
  it('keep each card\u2019s name, line and link', () => {
    const { container } = show()
    const list = within(container.querySelector('.sf-roomlist'))
    expect(list.getByRole('link', { name: 'The Art Loft Prints and originals.' }).getAttribute('href')).toBe(roomPath('art-loft'))
    expect(list.getByRole('link', { name: 'Knowledge Nook Reading, learning and personal growth.' }).getAttribute('href')).toBe(roomPath('knowledge-nook'))
  })
})

describe('the file itself', () => {
  const text = readFileSync(join(process.cwd(), 'src/pages/ChannelDirectory.jsx'), 'utf8')
  it('uses the new icons, and keeps the old picture only as a backup for a room that has no icon', () => {
    expect(text).toContain("import RoomIcon from '../components/RoomIcon'")
    expect(text).toContain('href={ROOM_ICONS[c.slug] || roomImages[c.slug]}')
    expect(text).not.toMatch(/RoomTile/)
  })
})
