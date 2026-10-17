// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyDoors } from '../src/doors/applyDoors'
import { buildRoomScene } from '../src/rooms/roomsData'

const none = () => false
const only = (...keys) => (room, door) => keys.includes(`${room}/${door}`)
const item = (scene, id) => scene.items.find((i) => i.id === id)

describe('opening a door in a scene', () => {
  it('leaves every door as it was when none is open', () => {
    const scene = buildRoomScene('sarah-jrs-den')
    expect(applyDoors(scene, 'sarah-jrs-den', none)).toEqual(scene)
  })
  it('turns an open door into a link to its page, with its untaped picture and its new line', () => {
    const scene = buildRoomScene('sarah-jrs-den')
    const out = applyDoors(scene, 'sarah-jrs-den', only('sarah-jrs-den/blog'))
    const blog = item(out, 'blog')
    expect(blog.kind).toBe('page')
    expect(blog.to).toBe('/sarah-jrs-den/blog')
    expect(blog.art).toBe('/scenes/sarah-jrs-den/item-blog-open.svg')
    expect(blog.blurb).toBe('Little notes from the Den.')
    expect(blog.lock).toBeUndefined()
    expect(blog.name).toBe('Blog')
    expect([blog.cx, blog.cy, blog.w, blog.h]).toEqual([item(scene, 'blog').cx, item(scene, 'blog').cy, item(scene, 'blog').w, item(scene, 'blog').h])
  })
  it('opens only the doors that are open, and leaves the others taped off', () => {
    const out = applyDoors(buildRoomScene('sarah-jrs-den'), 'sarah-jrs-den', only('sarah-jrs-den/blog', 'sarah-jrs-den/books'))
    expect(out.items.map((i) => [i.id, i.kind])).toEqual([['blog', 'page'], ['daryls-adventures', 'locked'], ['books', 'page'], ['youtube-series', 'locked']])
  })
  it('never opens a door whose page has not been built, even if the database says it is open', () => {
    const out = applyDoors(buildRoomScene('sarah-jrs-den'), 'sarah-jrs-den', only('sarah-jrs-den/youtube-series'))
    expect(item(out, 'youtube-series').kind).toBe('locked')
    expect(item(out, 'youtube-series').lock).toBeTruthy()
    expect(item(out, 'youtube-series').art).toBe('/scenes/sarah-jrs-den/item-youtube-series.svg')
  })
  it('does not touch a door that is already a page, or an outside link', () => {
    const scene = buildRoomScene('leadership-lounge')
    const out = applyDoors(scene, 'leadership-lounge', () => true)
    expect(out.items).toEqual(scene.items)
  })
  it('ignores a door from another room that happens to share a name', () => {
    const out = applyDoors(buildRoomScene('sarah-jrs-den'), 'sarah-jrs-den', only('leadership-lounge/blog'))
    expect(item(out, 'blog').kind).toBe('locked')
  })
  it('does not change the scene it is given', () => {
    const scene = buildRoomScene('knowledge-nook')
    const copy = JSON.parse(JSON.stringify(scene))
    applyDoors(scene, 'knowledge-nook', () => true)
    expect(JSON.parse(JSON.stringify(scene))).toEqual(copy)
  })
  it('opens the Nook\u2019s three plain pages (Come Read With Me, Research, Book to Screen) and leaves its two special doors taped off even when all are marked open', () => {
    const out = applyDoors(buildRoomScene('knowledge-nook'), 'knowledge-nook', () => true)
    expect(out.items.map((i) => [i.id, i.kind])).toEqual([['book-club', 'locked'], ['come-read-with-me', 'page'], ['research', 'page'], ['book-to-screen', 'page'], ['story-ledger', 'locked']])
  })
  it('leaves a room with no registered doors exactly as it is', () => {
    const scene = buildRoomScene('idea-hatchery')
    expect(applyDoors(scene, 'idea-hatchery', () => true).items.filter((i) => i.kind === 'page').length).toBeGreaterThanOrEqual(3)
    expect(applyDoors({ ...scene }, 'the-moon', () => true)).toEqual(scene)
  })
})
