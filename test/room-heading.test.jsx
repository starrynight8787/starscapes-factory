import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoomScene from '../src/rooms/RoomScene'
import { buildRoomScene } from '../src/rooms/roomsData'

const show = (slug) => render(<MemoryRouter><RoomScene scene={buildRoomScene(slug)} /></MemoryRouter>).container.querySelector('main.rs')

describe('each illustrated room says which room it is', () => {
  it.each(['idea-hatchery', 'leadership-lounge', 'explorers-bay'])('%s', (slug) => {
    expect(show(slug).getAttribute('data-room')).toBe(slug)
  })
  it('still has its heading first, then the picture, then the list', () => {
    const main = show('idea-hatchery')
    const kids = [...main.children].map((c) => c.className.split(' ')[0])
    expect(kids).toEqual(['rs-head', 'rs-stage', 'rs-list'])
    expect(main.querySelector('.rs-head h1').textContent).toBe('The Idea Hatchery')
  })
})
