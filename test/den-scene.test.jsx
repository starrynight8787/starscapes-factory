import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import RoomScene from '../src/rooms/RoomScene'
import { ROOMS, buildRoomScene, SCENE_SIZE } from '../src/rooms/roomsData'
import { GEOMETRY, OBJECT_PAD } from '../src/rooms/roomsGeometry'

const dir = 'public/scenes/sarah-jrs-den/'
const read = (f) => readFileSync(join(process.cwd(), dir + f), 'utf8')
const KEYS = ['blog', 'daryls-adventures', 'books', 'youtube-series']
const den = ROOMS['sarah-jrs-den']
// the tape across each door, as the design has it: [length, tilt]
const TAPE = { blog: [250, -12], 'daryls-adventures': [530, -6], books: [200, -14], 'youtube-series': [140, -10] }

describe('Sarah Jr.\u2019s Den: what it says', () => {
  it('is in the words of the design: a curious little bear and her pet dinosaur, Daryl', () => {
    expect(den.name).toBe("Sarah Junior's Clubhouse")
    expect(den.tagline).toBe("Kids' travel adventures, told through a curious little bear and her pet dinosaur, Daryl.")
    expect(den.blurb).toBe('Pick a door.')
  })
  it('has four doors: the Blog (the wardrobe), Daryl\u2019s Adventures (the sofa), Books (the bookcase) and the YouTube Series (the TV)', () => {
    expect(den.items.map((i) => i.id)).toEqual(KEYS)
    expect(den.items.map((i) => i.name)).toEqual(['Blog', "Daryl's Adventures", 'Books', 'YouTube Series'])
  })
  it('keeps every door closed for now: taped off, and not a link to anywhere', () => {
    for (const i of den.items) {
      expect(i.kind, i.id).toBe('locked')
      expect(i.to, i.id).toBeUndefined()
    }
    expect(Object.keys(den.areas)).toEqual([])
  })
  it('uses the design\u2019s own line for Daryl\u2019s world', () => {
    expect(den.items.find((i) => i.id === 'daryls-adventures').blurb).toBe("Daryl's world: being developed.")
  })
})

describe('the Den page', () => {
  const show = () => render(<MemoryRouter><RoomScene scene={buildRoomScene('sarah-jrs-den')} /></MemoryRouter>)
  it('has the Home link, its heading on the picture\u2019s empty corner, the picture, then the list (the ordinary layout)', () => {
    const { container } = show()
    const main = container.querySelector('main.rs')
    expect(main.getAttribute('data-room')).toBe('sarah-jrs-den')
    expect([...main.children].map((c) => c.className.split(' ')[0])).toEqual(['rs-home', 'rs-head', 'rs-stage', 'rs-list'])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Sarah Junior's Clubhouse")
  })
  it('shows all four doors as closed, each read out as locked, and none of them as a link', () => {
    const { container } = show()
    const doors = [...container.querySelectorAll('.rs-stage .rs-item')]
    expect(doors).toHaveLength(4)
    for (const d of doors) {
      expect(d.tagName).toBe('DIV')
      expect(d.getAttribute('aria-label')).toMatch(/locked/)
    }
    expect(container.querySelectorAll('.rs-stage a')).toHaveLength(0)
    expect(within(container.querySelector('.rs-list')).getAllByRole('listitem')).toHaveLength(4)
  })
})

describe('the Den pictures', () => {
  it('are only drawings, with no real text and nothing that runs, loads or links', () => {
    for (const f of ['base.svg', ...KEYS.map((k) => `item-${k}.svg`)]) {
      const svg = read(f)
      expect(svg.startsWith('<svg'), f).toBe(true)
      expect(svg, f).toContain('aria-hidden="true"')
      expect(svg, f).not.toMatch(/<text|<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|<style|<title|<desc|font-family/i)
    }
  })
  it('are light enough to load quickly', () => {
    for (const f of ['base.svg', ...KEYS.map((k) => `item-${k}.svg`)]) expect(statSync(join(process.cwd(), dir + f)).size, f).toBeLessThan(30 * 1024)
  })
  it('hold the room: the framed picture with the drawn bear and dinosaur, the stars, the moon and three cones', () => {
    const base = read('base.svg')
    expect(base).toContain('fill="#B8E0E6"')                                  // the bear
    expect(base).toContain('fill="#C9F29B"')                                  // Daryl
    expect((base.match(/data-cone="1"/g) || []).length).toBe(3)
    expect((base.match(/fill="#E5484D"/g) || []).length).toBe(3)
    expect(base).toContain('M48 0C35.3 0 23.1 5.1')                           // the moon
    expect(base.match(/fill="#14306A" stroke-width="3"/g)).toHaveLength(3)    // the three little stars
  })
  it('keep the doors out of the room, so they are not drawn twice', () => {
    const base = read('base.svg')
    expect(base).not.toContain('fill="#3B5BA9"')   // the wardrobe is the Blog's
    expect(base).not.toContain('fill="#A9C2EC"')   // the sofa is Daryl\u2019s
    expect(base).not.toContain('fill="#E5484D" stroke-width="3.5"')
  })
  it('draw the wardrobe, the sofa on its nine-striped rug, the bookcase with 28 books, and the TV with its red play button', () => {
    expect(read('item-blog.svg')).toContain('fill="#3B5BA9"')
    const daryl = read('item-daryls-adventures.svg')
    expect(daryl).toContain('fill="#A9C2EC"')
    for (const c of ['#C9F29B', '#FFE27A', '#CDE4FF', '#DCCDFF', '#FFC78F']) expect(daryl, c).toContain(c)
    expect((read('item-books.svg').match(/stroke-width="3" \/>/g) || []).length).toBe(28)
    const tv = read('item-youtube-series.svg')
    expect(tv).toContain('fill="#E5484D"')
    expect(tv).toContain('M0 0L19.2 10.8L0 21.6L0 0Z')                        // the play triangle
  })
  it.each(KEYS)('%s: its picture is exactly the frame its measurements say', (k) => {
    const g = GEOMETRY['sarah-jrs-den'][k]
    const box = [g.cx - g.w / 2 - OBJECT_PAD, g.cy - g.h / 2 - OBJECT_PAD, g.w + 2 * OBJECT_PAD, g.h + 2 * OBJECT_PAD]
    expect(read(`item-${k}.svg`)).toContain(`viewBox="${box.join(' ')}"`)
    expect(read(`item-${k}.svg`)).toContain(`width="${box[2]}" height="${box[3]}"`)
    expect(box[0]).toBeGreaterThanOrEqual(0)
    expect(box[0] + box[2]).toBeLessThanOrEqual(SCENE_SIZE.width)
    expect(box[1] + box[3]).toBeLessThanOrEqual(SCENE_SIZE.height)
  })
  it('have measurements in both places that agree', () => {
    expect(JSON.parse(read('geometry.json'))).toEqual(GEOMETRY['sarah-jrs-den'])
  })
})

describe('the tape across every door', () => {
  const view = (k) => read(`item-${k}.svg`).match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)
  const strips = (k) => [...read(`item-${k}.svg`).matchAll(/<g data-tape-group="1" transform="translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)">[\s\S]*?<rect data-tape="1" x="[-\d.]+" y="-13" width="([\d.]+)"/g)].map((m) => ({ cx: +m[1], cy: +m[2], angle: +m[3], length: +m[4] }))
  it.each(KEYS)('%s: has one strip of yellow tape, the length and tilt in the design', (k) => {
    expect(strips(k)).toHaveLength(1)
    expect(read(`item-${k}.svg`)).toContain('fill="#FFD60A"')
    expect([strips(k)[0].length, strips(k)[0].angle]).toEqual(TAPE[k])
  })
  it.each(KEYS)('%s: the strip lies inside the door\u2019s own picture, so none of it is cut off', (k) => {
    const [vx, vy, vw, vh] = view(k)
    const t = strips(k)[0]
    const a = (t.angle * Math.PI) / 180
    const halfW = (t.length / 2) * Math.abs(Math.cos(a)) + 13 * Math.abs(Math.sin(a)) + 2
    const halfH = (t.length / 2) * Math.abs(Math.sin(a)) + 13 * Math.abs(Math.cos(a)) + 2
    expect(t.cx - halfW, k).toBeGreaterThanOrEqual(vx)
    expect(t.cx + halfW, k).toBeLessThanOrEqual(vx + vw)
    expect(t.cy - halfH, k).toBeGreaterThanOrEqual(vy)
    expect(t.cy + halfH, k).toBeLessThanOrEqual(vy + vh)
  })
})

describe('the plaques', () => {
  it('sit where they can be read without covering another door', () => {
    expect(den.items.map((i) => [i.id, i.labelAt])).toEqual([['blog', [155, 726]], ['daryls-adventures', [564, 716]], ['books', [935, 672]], ['youtube-series', [1085, 750]]])
  })
})
