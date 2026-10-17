// @vitest-environment node
// Research (the Nook's old "More shelves") and the message in a bottle (Explorer's Bay), which is now for paying visitors and has its own padlock.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ROOMS } from '../src/rooms/roomsData'
import { GEOMETRY } from '../src/rooms/roomsGeometry'
import { DOORS, findDoor, doorPath, doorAreas, doorArt } from '../src/doors/doorsData'

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8')
const exists = (rel) => fs.existsSync(path.resolve(rel))
const nook = ROOMS['knowledge-nook']
const bay = ROOMS['explorers-bay']

describe('Research', () => {
  const item = nook.items.find((i) => i.id === 'research')
  it('is the Nook\u2019s third door, called Research, with its own words', () => {
    expect(nook.items.map((i) => i.id)).toEqual(['book-club', 'come-read-with-me', 'research', 'book-to-screen', 'story-ledger'])
    expect(item.name).toBe('Research')
    expect(item.blurb).toBe('A space to test things out.')
  })
  it('is still closed (taped off) until the door is opened by hand', () => {
    expect(item.kind).toBe('locked')
    expect(item.to).toBeUndefined()
  })
  it('has a page ready, a list of the Nook\u2019s posts tagged research, at an address that says research', () => {
    const door = findDoor('knowledge-nook', 'research')
    expect(door.page).toEqual({ layout: 'list' })
    expect(doorPath(door)).toBe('/knowledge-nook/research')
    expect(doorAreas('knowledge-nook').research).toEqual({ name: 'Research', blurb: 'A space to test things out.', layout: 'list', tags: ['research'] })
  })
  it('has its two pictures under the new name, and none left under the old one', () => {
    for (const f of ['item-research.svg', 'item-research-open.svg']) expect(exists(`public/scenes/knowledge-nook/${f}`), f).toBe(true)
    for (const f of ['item-more-shelves.svg', 'item-more-shelves-open.svg']) expect(exists(`public/scenes/knowledge-nook/${f}`), f).toBe(false)
    expect(doorArt(findDoor('knowledge-nook', 'research'))).toBe('/scenes/knowledge-nook/item-research-open.svg')
  })
  it('sits in the same place as before, in the code and in the drawing\u2019s own list', () => {
    expect(GEOMETRY['knowledge-nook'].research).toEqual({ cx: 233, cy: 649, w: 66, h: 146 })
    const json = JSON.parse(read('public/scenes/knowledge-nook/geometry.json'))
    expect(json.research).toEqual({ cx: 233, cy: 649, w: 66, h: 146 })
    expect(json['more-shelves']).toBeUndefined()
  })
  it('leaves no trace of the old name in the site\u2019s own code', () => {
    for (const f of ['src/rooms/roomsData.js', 'src/rooms/roomsGeometry.js', 'src/doors/doorsData.js', 'public/scenes/knowledge-nook/geometry.json']) expect(read(f), f).not.toMatch(/more-shelves|More shelves/i)
  })
})

describe('the message in a bottle', () => {
  const door = findDoor('explorers-bay', 'coming-soon')
  const open = read('public/scenes/explorers-bay/item-coming-soon-open.svg')
  const taped = read('public/scenes/explorers-bay/item-coming-soon.svg')
  const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)
  it('is marked as for paying visitors, and is no longer a dotted outline', () => {
    expect(door.paid).toBe(true)
    expect(door.ghost).toBeUndefined()
    expect(door.name).toBe('Something New') // the name is still to be decided
  })
  it('cannot be opened yet: its page waits for the passes to exist', () => {
    expect(door.page).toBeNull()
    expect(bay.items.find((i) => i.id === 'coming-soon').kind).toBe('locked')
  })
  it('keeps its closed picture as it was: the dotted bottle with the tape', () => {
    expect(taped).toContain('data-tape-group')
    expect(taped).toContain('stroke-dasharray')
  })
  it('is drawn as a solid corked bottle with a message in it, not dots', () => {
    expect(open).toContain('fill="#DCE6FF"') // the glass
    expect(open).toContain('fill="#C9A070"') // the cork, in the room\u2019s own tan
    expect(open).not.toContain('stroke-dasharray')
    expect(open).not.toMatch(/data-tape|#FFD60A/)
  })
  it('has its own padlock, hung from the bottle\u2019s neck on rope and stamped with an anchor, so it is Explorer\u2019s Bay\u2019s and no other room\u2019s', () => {
    const lock = open.match(/<g data-lock="explorers-bay">([\s\S]*?)<\/g><\/g><\/svg>/)
    expect(lock, 'the lock group').toBeTruthy()
    expect(lock[1]).toContain('stroke="#C9A070"') // the rope
    expect(lock[1]).toMatch(/<rect[^>]*rx="6"[^>]*fill="#FFE27A"/) // the gold padlock body
    expect(lock[1]).toMatch(/<circle[^>]*r="2\.6"/) // the ring at the top of the anchor
    // and it is not the Notebook\u2019s padlock or the blueprint\u2019s
    for (const other of ['public/scenes/drafting-desk/sheet-authors-notebook.svg', 'public/scenes/factory-floor/blueprint-roll.svg']) expect(read(other)).not.toContain('data-lock="explorers-bay"')
  })
  it('keeps everything inside its picture, which is the same size and place as the closed one', () => {
    expect(box(open)).toEqual(box(taped))
    const [vx, vy, vw, vh] = box(open)
    const rect = open.match(/<g data-lock[\s\S]*?<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/)
    const [x, y, w, h] = rect.slice(1).map(Number)
    expect(x - 3).toBeGreaterThanOrEqual(vx)
    expect(x + w + 3).toBeLessThanOrEqual(vx + vw)
    expect(y - 3).toBeGreaterThanOrEqual(vy)
    expect(y + h + 3).toBeLessThanOrEqual(vy + vh)
    expect(open.match(/translate\(1080,770\) rotate\(-24\)/)).toBeTruthy() // the bottle sits where the old one did
  })
  it('is only a drawing, with nothing that runs, loads or links', () => {
    expect(open).not.toMatch(/<text|<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|<style|font-family/i)
    expect(open).toContain('aria-hidden="true"')
  })
})
