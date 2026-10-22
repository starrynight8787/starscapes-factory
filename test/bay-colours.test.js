import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'public/scenes/explorers-bay/'
const read = (f) => readFileSync(join(process.cwd(), dir + f), 'utf8')
const parse = (text) => new DOMParser().parseFromString(text, 'image/svg+xml')

const PHOTOS = ['#FFC78F', '#7FC4F0', '#8FD694', '#B79CF2'] // orange (the star), blue (the camera), green (the mountains), lilac (the moon)
const CASE = '#DDBB92'
const CLASP = '#C9A070'
const TAG = '#CFA678'

describe('Explorer\u2019s Bay: the four photographs', () => {
  const doc = parse(read('item-photography.svg'))
  const photos = [...doc.querySelectorAll('rect[data-photo]')]
  it('is a well-formed picture with four photographs', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(photos).toHaveLength(4)
  })
  it('has each in its own colour, in order: orange, blue, green, lilac', () => {
    expect(photos.map((p) => p.getAttribute('fill'))).toEqual(PHOTOS)
    expect(photos.map((p) => p.getAttribute('data-photo'))).toEqual(['1', '2', '3', '4'])
  })
  it('colours only the picture inside each frame: the white frames and the little pegs stay white', () => {
    const frames = [...doc.querySelectorAll('rect[width="66"]')]
    expect(frames).toHaveLength(4)
    for (const f of frames) expect(f.getAttribute('fill')).toBe('#fff')
    const pegs = [...doc.querySelectorAll('rect[width="10"][height="16"]')]
    expect(pegs).toHaveLength(4)
    for (const p of pegs) expect(p.getAttribute('fill')).toBe('#fff')
  })
  it('keeps the little navy pictures on them (the star and the moon) and the lens, mountains and string', () => {
    const body = read('item-photography.svg')
    expect((body.match(/fill="#14306A"/g) || []).length).toBe(2)
    expect(body).toContain('<circle cx="0" cy="42" r="9"')
    expect(body).toContain('M-24 62 L-8 36 L4 52 L12 42 L24 62')
    expect(body).toContain('M562 364 Q700 470 858 330')
  })
  it('stays exactly where it was measured', () => {
    expect(read('item-photography.svg')).toContain('viewBox="536 304 348 225"')
  })
})

describe('Explorer\u2019s Bay: the scene art follows the Figma drawing', () => {
  const colours = (f) => new Set((read(f).match(/#[0-9A-Fa-f]{6}/g) || []).map((c) => c.toUpperCase()))
  it('has a tan suitcase for Writing in Transit', () => {
    expect(colours('item-writing-in-transit.svg').has('#E8B977')).toBe(true)
  })
  it('has a glass bottle for the Road journal, with tape only on the closed picture', () => {
    expect(colours('item-road-journal-open.svg').has('#A6E3DC')).toBe(true)
    expect(read('item-road-journal.svg')).toContain('data-tape-group')
    expect(read('item-road-journal-open.svg')).not.toContain('data-tape')
  })
  it('has the moon marked so the health check can find it', () => {
    expect(read('base.svg')).toContain('data-moon')
  })
  it('draws every item as pictures only, in the 1200 by 840 scene', () => {
    expect(read('base.svg')).toContain('viewBox="0 0 1200 840"')
    for (const f of ['base.svg', 'item-writing-in-transit.svg', 'item-lessons-from-the-road.svg', 'item-travel-map.svg', 'item-road-journal.svg']) {
      expect(read(f), f).not.toMatch(/<text|<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|<style|font-family/i)
    }
  })
})
