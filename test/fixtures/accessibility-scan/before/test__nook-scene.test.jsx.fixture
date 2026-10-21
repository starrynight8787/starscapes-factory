import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import RoomScene from '../src/rooms/RoomScene'
import { ROOMS, buildRoomScene, SCENE_SIZE } from '../src/rooms/roomsData'
import { GEOMETRY, OBJECT_PAD } from '../src/rooms/roomsGeometry'
import { withoutLogo } from './allowedLogo'

const dir = 'public/scenes/knowledge-nook/'
const read = (f) => readFileSync(join(process.cwd(), dir + f), 'utf8')
const KEYS = ['book-club', 'come-read-with-me', 'research', 'book-to-screen', 'story-ledger']
const nook = ROOMS['knowledge-nook']

describe('the Knowledge Nook: what it says', () => {
  it('is in the words of the design: reading, learning and personal growth, pick a book', () => {
    expect([nook.name, nook.tagline, nook.blurb]).toEqual(['Knowledge Nook', 'Reading, learning and personal growth.', 'Pick a book.'])
  })
  it('has five doors, in reading order: Book Club, Come Read With Me, Research, Book to Screen, Story Ledger', () => {
    expect(nook.items.map((i) => i.id)).toEqual(KEYS)
    expect(nook.items.map((i) => i.name)).toEqual(['Book Club', 'Come Read With Me', 'Research', 'Book to Screen', 'Story Ledger'])
  })
  it('keeps every door closed for now: taped off, and not a link to anywhere', () => {
    for (const i of nook.items) {
      expect(i.kind, i.id).toBe('locked')
      expect(i.to, i.id).toBeUndefined()
      expect(i.href, i.id).toBeUndefined()
    }
    expect(nook.items.find((i) => i.id === 'come-read-with-me').lock).toBe('not started yet')
    expect(Object.keys(nook.areas)).toEqual([])
  })
  it('uses the design\u2019s own words where it has them', () => {
    const by = (id) => nook.items.find((i) => i.id === id)
    expect(by('book-club').blurb).toBe('Reading notes and reviews.')
    expect(by('story-ledger').blurb).toBe('Audits of old TV.')
  })
})

describe('the Knowledge Nook page', () => {
  const show = () => render(<MemoryRouter><RoomScene scene={buildRoomScene('knowledge-nook')} /></MemoryRouter>)
  it('has the Home link first, then its heading, then the picture, then the list, and says which room it is', () => {
    const { container } = show()
    const main = container.querySelector('main.rs')
    expect(main.getAttribute('data-room')).toBe('knowledge-nook')
    expect([...main.children].map((c) => c.className.split(' ')[0])).toEqual(['rs-home', 'rs-head', 'rs-stage', 'rs-list'])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Knowledge Nook')
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
  })
  it('shows all five doors as closed, each read out as locked, and none of them as a link', () => {
    const { container } = show()
    const doors = [...container.querySelectorAll('.rs-stage .rs-item')]
    expect(doors).toHaveLength(5)
    for (const d of doors) {
      expect(d.tagName).toBe('DIV')
      expect(d.getAttribute('aria-label')).toMatch(/locked/)
    }
    expect(container.querySelectorAll('.rs-stage a')).toHaveLength(0)
    expect(doors[1].getAttribute('aria-label')).toBe('Come Read With Me, locked, starting soon. Read alongside me. Starting soon.')
  })
  it('gives phones the same five doors as a plain list', () => {
    const { container } = show()
    const list = within(container.querySelector('.rs-list'))
    expect(list.getAllByRole('listitem')).toHaveLength(5)
    expect(container.querySelector('.rs-list').getAttribute('aria-label')).toBe('Ways into Knowledge Nook')
  })
})

describe('the Knowledge Nook pictures', () => {
  it('are only drawings, with no real text in them (the lettering is outlines, because a picture cannot borrow the page\u2019s fonts)', () => {
    for (const f of ['base.svg', ...KEYS.map((k) => `item-${k}.svg`)]) {
      const svg = read(f)
      expect(svg.startsWith('<svg'), f).toBe(true)
      expect(svg, f).toContain('aria-hidden="true"')
      expect(withoutLogo(f, svg), f).not.toMatch(/<text|<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|<style|<title|<desc|font-family/i)
    }
  })
  it('are light enough to load quickly', () => {
    expect(statSync(join(process.cwd(), dir + 'base.svg')).size).toBeLessThan(150 * 1024)
    for (const k of KEYS) expect(statSync(join(process.cwd(), dir + `item-${k}.svg`)).size, k).toBeLessThan(30 * 1024)
  })
  it('hold the bookcase: 29 books on two shelves, the plant, three cones, and the spine words', () => {
    const base = read('base.svg')
    expect((base.match(/<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" rx="4"/g) || []).length).toBe(29)
    expect((base.match(/matrix\(0 -1 1 0 /g) || []).length).toBe(11)                    // eleven genre words, written up the spines
    expect((base.match(/fill="#E5484D"/g) || []).length).toBe(3)                        // three red cones
    expect(base).toContain('fill="#FFD4A9" stroke-width="4.2" />') // the plant pot
  })
  it('keep the doors out of the bookcase, so they are not drawn twice', () => {
    expect(read('base.svg')).not.toMatch(/id="object-/)
    expect(read('base.svg')).not.toContain('fill="#2E8FD0"') // the Book Club book is its own door
    expect(read('base.svg')).not.toContain('#070B26')       // and so is the TV screen
  })
  it.each(KEYS)('%s: its picture is exactly the frame its measurements say', (k) => {
    const g = GEOMETRY['knowledge-nook'][k]
    const box = [g.cx - g.w / 2 - OBJECT_PAD, g.cy - g.h / 2 - OBJECT_PAD, g.w + 2 * OBJECT_PAD, g.h + 2 * OBJECT_PAD]
    expect(read(`item-${k}.svg`)).toContain(`viewBox="${box.join(' ')}"`)
    expect(read(`item-${k}.svg`)).toContain(`width="${box[2]}" height="${box[3]}"`)
    expect(box[0]).toBeGreaterThanOrEqual(0)
    expect(box[0] + box[2]).toBeLessThanOrEqual(SCENE_SIZE.width)
    expect(box[1] + box[3]).toBeLessThanOrEqual(SCENE_SIZE.height)
  })
  it('have measurements in both places that agree', () => {
    const file = JSON.parse(read('geometry.json'))
    expect(file).toEqual(GEOMETRY['knowledge-nook'])
  })
})

describe('the tape across every door', () => {
  const view = (k) => read(`item-${k}.svg`).match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)
  const strips = (k) => [...read(`item-${k}.svg`).matchAll(/<g data-tape-group="1" transform="translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)">[\s\S]*?<rect data-tape="1" x="[-\d.]+" y="-13" width="([\d.]+)"/g)].map((m) => ({ cx: +m[1], cy: +m[2], angle: +m[3], length: +m[4] }))
  it.each(KEYS)('%s: has a strip of yellow tape across it', (k) => {
    const svg = read(`item-${k}.svg`)
    expect(strips(k)).toHaveLength(1)
    expect(svg).toContain('fill="#FFD60A"')
    expect((svg.match(/fill="#14306A" stroke="none"/g) || []).length).toBeGreaterThanOrEqual(7) // its navy stripes
  })
  it.each(KEYS)('%s: the strip lies inside the door\u2019s own picture, so none of it is cut off', (k) => {
    const [vx, vy, vw, vh] = view(k)
    const t = strips(k)[0]
    const a = (t.angle * Math.PI) / 180
    const halfW = (t.length / 2) * Math.abs(Math.cos(a)) + 13 * Math.abs(Math.sin(a)) + 2
    const halfH = (t.length / 2) * Math.abs(Math.sin(a)) + 13 * Math.abs(Math.cos(a)) + 2
    // the two slot pictures share one strip and each shows only its own side of the line x = 198
    let left = t.cx - halfW
    let right = t.cx + halfW
    if (k === 'come-read-with-me') right = Math.min(right, 198)
    if (k === 'research') left = Math.max(left, 198)
    expect(left, k).toBeGreaterThanOrEqual(vx)
    expect(right, k).toBeLessThanOrEqual(vx + vw)
    expect(t.cy - halfH, k).toBeGreaterThanOrEqual(vy)
    expect(t.cy + halfH, k).toBeLessThanOrEqual(vy + vh)
  })
  it('runs as one long strip across both empty slots: each picture holds its own half, cut at the same line', () => {
    const left = strips('come-read-with-me')[0]
    const right = strips('research')[0]
    expect(right).toEqual(left)                                         // the very same strip
    expect(read('item-come-read-with-me.svg')).toMatch(/<rect x="0" y="0" width="198" height="840"/)   // the left picture keeps what is left of the line
    expect(read('item-research.svg')).toMatch(/<rect x="198" y="0" width="1002" height="840"/)     // the right picture keeps the rest
  })
})

describe('the plaques', () => {
  it('sit where the design has them (Book Club above its book, the others under their doors), clear of every other door', () => {
    expect(nook.items.map((i) => [i.id, i.labelAt])).toEqual([['book-club', [286, 56]], ['come-read-with-me', [400, 540]], ['research', [233, 734]], ['book-to-screen', [570, 734]], ['story-ledger', [901, 734]]])
  })
})
