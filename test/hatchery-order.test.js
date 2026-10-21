import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOMS } from '../src/rooms/roomsData'
import { GEOMETRY } from '../src/rooms/roomsGeometry'

const items = ROOMS['idea-hatchery'].items
const geo = GEOMETRY['idea-hatchery']
const file = (name) => readFileSync(join(process.cwd(), `public/scenes/idea-hatchery/${name}`), 'utf8')
const svg = (id) => file(`item-${id}.svg`)
// The plain beaker where Writing Prompts used to be: Writing Prompts moved to the Drafting Desk, but the beaker stayed in the picture as decoration (it is not an item: nothing to click)
const RESTORED = { cx: 340, half: 70 }
const ORDER = ['short-stories', 'come-study-with-me', 'stop-motion'] // Writing Prompts moved to the Drafting Desk on 20 October, so the bench has three beakers

describe('Idea Hatchery: the order along the bench', () => {
  it('is Short Stories, Come Study With Me, then the orange Stop Motion flask: second from the end of the whole bench', () => {
    expect([...items].sort((a, b) => a.cx - b.cx).map((i) => i.id)).toEqual(ORDER)
  })
  it('is also the order of the list (so keyboard tabbing and the phone list follow what you see)', () => {
    expect(items.map((i) => i.id)).toEqual(ORDER)
  })
  it('puts each beaker at its place, with a picture and a frame to match', () => {
    expect(ORDER.map((id) => geo[id].cx)).toEqual([462, 580.5, 847])
    // each drawing was shifted by exactly how far its beaker moved from where it was first drawn
    const moved = { 'short-stories': 462 - 444, 'come-study-with-me': 580.5 - 716.5, 'stop-motion': 847 - 322 }
    for (const [id, dx] of Object.entries(moved)) expect(svg(id), id).toContain(`transform="translate(${dx} 0)"`)
  })
  it('keeps the names on two rows so neighbours never sit on each other', () => {
    expect(items.map((i) => i.labelAt)).toEqual([[462, 700], [600, 754], [847, 700]])
  })
})

describe('Idea Hatchery: the rest of the bench moved with them', () => {
  const base = file('base.svg')
  it('keeps the old Writing Prompts beaker only as a drawing: it is in the picture, but it is not an item, so there is nothing to click and nothing for the page to list', () => {
    expect(base).toContain('<g id="beaker-writing-prompts">'); expect(items.map((i) => i.id)).not.toContain('writing-prompts'); expect(Object.keys(geo)).not.toContain('writing-prompts')
  })
  it('the plain beaker moved left to make room, and the little zz went with the dotted beaker', () => {
    expect(base).toMatch(/<g id="beaker-empty-1" data-bench="1" transform="translate\(-135 0\)">/)
    expect(base).toMatch(/<g data-bench="1" transform="translate\(-136 0\)" stroke-width="4\.5"/)
  })
  it('the test-tube rack and the glass dome did not move', () => {
    expect(base).toMatch(/<g id="beaker-empty-2">/)
    expect(base).toMatch(/<g id="dome-egg">/)
    expect(base).not.toMatch(/id="beaker-empty-2"[^>]*transform/)
  })
  it('every cloud rises from above its flask: the lowest bubble stays clear of the top of the glass', () => {
    const body = file('base.svg')
    const bubbles = [...body.slice(body.indexOf('<g id="bubbles"')).matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].slice(0, 15).map((m) => ({ x: Number(m[1]), y: Number(m[2]), r: Number(m[3]) }))
    const tops = { 'the plain beaker where Writing Prompts used to be': 399, 'short-stories': 380, 'stop-motion': 460 }   // where the glass of each begins
    const clouds = { 'the plain beaker where Writing Prompts used to be': bubbles.slice(0, 5), 'short-stories': bubbles.slice(5, 10), 'stop-motion': bubbles.slice(10, 15) }
    for (const [id, cloud] of Object.entries(clouds)) expect(Math.max(...cloud.map((b) => b.y + b.r)), id).toBeLessThanOrEqual(tops[id] - 4)
  })
  it('each cloud of bubbles sits over its own flask: the plain beaker where Writing Prompts used to be, the tall flask and the orange one', () => {
    const circles = [...base.slice(base.indexOf('<g id="bubbles"')).matchAll(/<circle cx="([\d.]+)"/g)].slice(0, 15).map((m) => Number(m[1]))
    expect(circles).toHaveLength(15)
    const centre = (list) => (Math.min(...list) + Math.max(...list)) / 2
    expect(Math.abs(centre(circles.slice(0, 5)) - RESTORED.cx)).toBeLessThanOrEqual(10)
    expect(Math.abs(centre(circles.slice(5, 10)) - geo['short-stories'].cx)).toBeLessThanOrEqual(10)
    expect(Math.abs(centre(circles.slice(10, 15)) - geo['stop-motion'].cx)).toBeLessThanOrEqual(10)
  })
})

describe('Idea Hatchery: everything fits on the bench without piling up', () => {
  // [left, right] of what each thing takes up along the bench: the glass dome and the rack stay put; the plain beaker includes its spout
  const dome = [114, 266]
  const rack = [917, 1087]
  const plain = [788 - 135, 910 - 135]
  const half = { 'short-stories': 46, 'come-study-with-me': 66.5, 'stop-motion': 66 }
  const row = [
    ['dome', ...dome],
    ['the plain beaker where Writing Prompts used to be', RESTORED.cx - RESTORED.half, RESTORED.cx + RESTORED.half],
    ...ORDER.slice(0, 2).map((id) => [id, geo[id].cx - half[id], geo[id].cx + half[id]]),
    ['the plain beaker', ...plain],
    ['stop-motion', geo['stop-motion'].cx - half['stop-motion'], geo['stop-motion'].cx + half['stop-motion']],
    ['the test-tube rack', ...rack],
  ]
  it('in this order, left to right: dome, the beaker kept from Writing Prompts, two beakers, the plain beaker, the orange flask, the rack', () => {
    const lefts = row.map((r) => r[1])
    expect([...lefts].sort((a, b) => a - b)).toEqual(lefts)
  })
  it('no two neighbours overlap by more than a few pixels', () => {
    for (let k = 1; k < row.length; k++) expect(row[k][1] - row[k - 1][2], `${row[k - 1][0]} and ${row[k][0]}`).toBeGreaterThanOrEqual(-4)
  })
  it('everything is on the bench, which runs from 80 to 1120', () => {
    for (const r of row) {
      expect(r[1], r[0]).toBeGreaterThanOrEqual(80)
      expect(r[2], r[0]).toBeLessThanOrEqual(1120)
    }
  })
})
