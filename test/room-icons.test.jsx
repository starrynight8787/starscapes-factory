import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import RoomIcon from '../src/components/RoomIcon'
import { ROOM_ICONS } from '../src/components/roomIcons'

const ROOMS = ['factory-floor', 'leadership-lounge', 'idea-hatchery', 'knowledge-nook', 'sarah-jrs-den', 'art-loft', 'drafting-desk', 'explorers-bay']
const file = (room) => join(process.cwd(), 'public', ROOM_ICONS[room])

describe('the eight room icons', () => {
  it('there is one for each room in the design, and no others', () => {
    expect(Object.keys(ROOM_ICONS).sort()).toEqual([...ROOMS].sort())
  })
  it.each(ROOMS)('%s: the picture is there, is a PNG with a see-through background, and is 192 by 192', (room) => {
    expect(ROOM_ICONS[room]).toBe(`/icons/rooms/${room}.png`)
    expect(existsSync(file(room))).toBe(true)
    const b = readFileSync(file(room))
    expect([...b.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])       // the first eight bytes of every PNG
    expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([192, 192])        // width and height
    expect(b[25]).toBe(6)                                                       // colour type 6: with a see-through (alpha) channel
  })
  it('are light enough to load quickly: each under 26 KB, all eight under 150 KB', () => {
    let total = 0
    for (const r of ROOMS) { const s = statSync(file(r)).size; expect(s, r).toBeLessThan(26 * 1024); total += s }
    expect(total).toBeLessThan(150 * 1024)
  })
})

describe('the RoomIcon piece', () => {
  it('shows the room\u2019s picture at the size asked for, and says nothing to a screen reader (the name is written beside it)', () => {
    const { container } = render(<RoomIcon room="art-loft" size={64} />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe('/icons/rooms/art-loft.png')
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['64', '64'])
    expect(img.getAttribute('alt')).toBe('')
  })
  it('is 44 by 44 unless told otherwise, and loads only when it is about to be seen', () => {
    const img = render(<RoomIcon room="idea-hatchery" />).container.querySelector('img')
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['44', '44'])
    expect(img.getAttribute('loading')).toBe('lazy')
  })
  it('can be given a class by the list it is in', () => {
    expect(render(<RoomIcon room="explorers-bay" className="nav-room" />).container.querySelector('img').className).toBe('sf-room-icon nav-room')
  })
  it('draws nothing for a room it has no picture for', () => {
    expect(render(<RoomIcon room="somewhere-else" />).container.innerHTML).toBe('')
  })
})
