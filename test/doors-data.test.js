// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DOORS, doorsOf, findDoor, doorPath, doorArt, doorAreas, doorKey } from '../src/doors/doorsData'
import { ROOMS } from '../src/rooms/roomsData'

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8')

describe('the list of doors', () => {
  it('has the twelve doors that start closed, in the five illustrated rooms', () => {
    expect(DOORS).toHaveLength(12)
    expect([...new Set(DOORS.map((d) => d.room))]).toEqual(['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'knowledge-nook', 'sarah-jrs-den'])
    expect(new Set(DOORS.map((d) => doorKey(d.room, d.id))).size).toBe(12)
  })
  it('names only doors that really are taped off in the rooms\u2019 own data, with the same names', () => {
    for (const d of DOORS) {
      const item = ROOMS[d.room].items.find((i) => i.id === d.id)
      expect(item, doorKey(d.room, d.id)).toBeTruthy()
      expect(item.kind, doorKey(d.room, d.id)).toBe('locked')
      expect(item.name, doorKey(d.room, d.id)).toBe(d.name)
    }
  })
  it('covers every locked door in those rooms, so none is left out', () => {
    for (const room of ['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'knowledge-nook', 'sarah-jrs-den']) {
      const locked = ROOMS[room].items.filter((i) => i.kind === 'locked').map((i) => i.id).sort()
      expect(doorsOf(room).map((d) => d.id).sort(), room).toEqual(locked)
    }
  })
  it('says which doors have a page now (a plain list or gallery of tagged posts) and which are waiting for their own design', () => {
    const withPage = DOORS.filter((d) => d.page).map((d) => doorKey(d.room, d.id))
    expect(withPage).toEqual(['idea-hatchery/come-study-with-me', 'leadership-lounge/free-ebook', 'knowledge-nook/book-club', 'knowledge-nook/come-read-with-me', 'knowledge-nook/research', 'knowledge-nook/book-to-screen', 'knowledge-nook/story-ledger', 'sarah-jrs-den/blog', 'sarah-jrs-den/daryls-adventures', 'sarah-jrs-den/books', 'sarah-jrs-den/youtube-series'])
    const without = DOORS.filter((d) => !d.page).map((d) => doorKey(d.room, d.id))
    expect(without).toEqual(['explorers-bay/coming-soon']) // only the paid bottle is still waiting for its page
    for (const d of DOORS.filter((x) => x.page)) expect(['list', 'gallery', 'custom']).toContain(d.page.layout) // custom = its own designed page, not a list of posts
  })
  it('uses the layouts the designs ask for: the Den\u2019s Books as a gallery, its Blog as a list', () => {
    expect(findDoor('sarah-jrs-den', 'books').page.layout).toBe('gallery')
    expect(findDoor('sarah-jrs-den', 'blog').page.layout).toBe('list')
  })
  it('flags the two doors whose picture is a dotted outline', () => {
    expect(DOORS.filter((d) => d.ghost).map((d) => d.id)).toEqual(['come-study-with-me']) // the bottle is now a solid bottle with its own padlock, not a dotted outline
  })
  it('gives every door a line that does not say it is still opening soon', () => {
    for (const d of DOORS) {
      expect(d.blurb.length, d.id).toBeGreaterThan(5)
      expect(d.blurb, d.id).not.toMatch(/soon|being developed|starting/i)
    }
  })
  it('puts a door\u2019s page at /room/door, and gives a door with no page no address', () => {
    expect(doorPath(findDoor('sarah-jrs-den', 'blog'))).toBe('/sarah-jrs-den/blog')
    expect(doorPath(findDoor('knowledge-nook', 'book-club'))).toBe('/knowledge-nook/book-club')
    expect(doorPath(findDoor('explorers-bay', 'coming-soon'))).toBeNull()
    expect(doorPath(null)).toBeNull()
    expect(findDoor('sarah-jrs-den', 'nonsense')).toBeNull()
    expect(findDoor('nonsense', 'blog')).toBeNull()
  })
  it('makes a room page for each door that has a page, tagged with the door\u2019s own name, and none for a door without one', () => {
    expect(doorAreas('sarah-jrs-den')).toEqual({
      blog: { name: 'Blog', blurb: 'Little notes from the Den.', layout: 'list', tags: ['blog'] },
      'daryls-adventures': { name: "Daryl's Adventures", blurb: "Daryl's world, one adventure at a time.", layout: 'gallery', tags: ['daryls-adventures'] },
      books: { name: 'Books', blurb: 'Stories to read together.', layout: 'gallery', tags: ['books'] },
    })
    expect(Object.keys(doorAreas('knowledge-nook'))).toEqual(['come-read-with-me', 'research', 'book-to-screen'])
    expect(doorAreas('leadership-lounge')).toEqual({})
    expect(doorAreas('the-moon')).toEqual({})
  })
  it('never lets a door\u2019s page clash with a page the room already has', () => {
    for (const room of Object.keys(ROOMS)) for (const key of Object.keys(doorAreas(room))) expect(Object.keys(ROOMS[room].areas), `${room}/${key}`).not.toContain(key)
  })
})

// The bottle's open picture is a new drawing (a solid bottle with its own padlock), not the dotted one with the tape taken off, so it is not
// held to "shorter than the taped one". Its own test is in research-and-bottle.test.js.
const REDRAWN = ['explorers-bay/coming-soon']
describe('the untaped pictures', () => {
  it.each(DOORS.map((d) => [doorKey(d.room, d.id), d]))('%s has an untaped picture, the same size as the taped one but with no tape', (_, d) => {
    const taped = read(`public/scenes/${d.room}/item-${d.id}.svg`)
    const open = read(`public${doorArt(d)}`)
    expect(taped).toContain('data-tape-group')
    expect(open).not.toMatch(/data-tape|#FFD60A/)
    expect(open.match(/viewBox="[^"]+"/)[0]).toBe(taped.match(/viewBox="[^"]+"/)[0])
    expect(open.startsWith('<svg') && open.endsWith('</svg>')).toBe(true)
    expect(open).toContain('aria-hidden="true"')
    if (!REDRAWN.includes(_)) expect(open.length).toBeLessThan(taped.length)
  })
  it('are only drawings, with nothing that runs, loads or links', () => {
    for (const d of DOORS) expect(read(`public${doorArt(d)}`), d.id).not.toMatch(/<text|<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|<style|font-family/i)
  })
})
