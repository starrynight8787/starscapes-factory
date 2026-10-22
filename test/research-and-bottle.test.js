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

describe('the message in a bottle (the Road journal door)', () => {
  const door = findDoor('explorers-bay', 'road-journal')
  const open = read('public/scenes/explorers-bay/item-road-journal-open.svg')
  const taped = read('public/scenes/explorers-bay/item-road-journal.svg')
  const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)
  it('is the Road journal door: free (no padlock, no pass), a solid bottle, and it has its own page', () => {
    expect(door.paid).toBeUndefined()
    expect(door.ghost).toBeUndefined()
    expect(door.name).toBe('Road journal')
    expect(door.page).toEqual({ layout: 'custom' })
    expect(bay.items.find((i) => i.id === 'road-journal').kind).toBe('locked')
  })
  it('is a simple glass bottle with a cork, in both pictures, and the closed one has tape across the glass', () => {
    for (const svg of [open, taped]) { expect(svg).toContain('fill="#DCE6FF"'); expect(svg).toContain('fill="#C9A070"'); expect(svg).not.toContain('stroke-dasharray'); expect(svg).not.toContain('data-lock') }
    expect(taped).toContain('data-tape-group'); expect(open).not.toMatch(/data-tape|#FFD60A/)
  })
  it('keeps the closed and open pictures the same size and place, where the old bottle was', () => {
    expect(box(open)).toEqual(box(taped)); expect(box(open)).toEqual([1001, 652, 128, 165])
  })
  it('is only a drawing, with nothing that runs, loads or links', () => {
    for (const svg of [open, taped]) { expect(svg).not.toMatch(/<text|<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|<style|font-family/i); expect(svg).toContain('aria-hidden="true"') }
  })
})
