import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoomScene from '../src/rooms/RoomScene'
import DraftingDeskHome from '../src/draftingdesk/DraftingDeskHome'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildRoomScene } from '../src/rooms/roomsData'

const show = (slug) => render(<MemoryRouter><RoomScene scene={buildRoomScene(slug)} /></MemoryRouter>).container.querySelector('main.rs')

describe('each illustrated room says which room it is', () => {
  it.each(['idea-hatchery', 'leadership-lounge', 'explorers-bay'])('%s', (slug) => {
    expect(show(slug).getAttribute('data-room')).toBe(slug)
  })
  it('has the Home link first, then its heading, then the picture, then the list', () => {
    const main = show('idea-hatchery')
    const kids = [...main.children].map((c) => c.className.split(' ')[0])
    expect(kids).toEqual(['rs-home', 'rs-head', 'rs-stage', 'rs-list'])
    expect(main.querySelector('.rs-head h1').textContent).toBe('The Idea Hatchery')
  })
})

describe('the Drafting Desk\u2019s front page is tagged too, so its own layout rule can find it', () => {
  const desk = () => render(<MemoryRouter><DraftingDeskHome /></MemoryRouter>).container.querySelector('main.rs')
  it('says it is the drafting desk', () => {
    expect(desk().getAttribute('data-room')).toBe('drafting-desk')
  })
  it('has its Home link, its heading, then its picture, in the order its layout rule expects', () => {
    const kids = [...desk().children].map((c) => c.className.split(' ')[0])
    expect(kids.slice(0, 3)).toEqual(['rs-home', 'rs-head', 'rs-stage'])
  })
  it('and the stylesheet has the rule that keeps that heading above the desk (its desk runs edge to edge)', () => {
    const css = readFileSync(join(process.cwd(), 'src/rooms/roomscene.css'), 'utf8')
    expect(css).toMatch(/\.rs\[data-room='drafting-desk'\] \.rs-stage,\s*\.rs\[data-room='knowledge-nook'\] \.rs-stage \{\s*grid-area:\s*3 \/ 1/)
    expect(css).toMatch(/\.rs\[data-room='drafting-desk'\] \.rs-head,\s*\.rs\[data-room='knowledge-nook'\] \.rs-head \{[^}]*text-align:\s*center/)
  })
})

