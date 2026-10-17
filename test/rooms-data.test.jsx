import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoomScene from '../src/rooms/RoomScene'
import { ROOMS, ROOM_SLUGS, SCENE_SIZE, buildRoomScene, AUDIOBOOK_URL, UDEMY_URL } from '../src/rooms/roomsData'
import { GEOMETRY, OBJECT_PAD } from '../src/rooms/roomsGeometry'
import { LOCK_TEXT, lockText, resolveItem, hasPlaque, plaqueAnchor, placement } from '../src/rooms/sceneRules'

const publicFile = (rel) => fs.readFileSync(path.resolve('public', rel.replace(/^\//, '')), 'utf8')
const css = fs.readFileSync(path.resolve('src/rooms/roomscene.css'), 'utf8')
const rule = (selector) => {
  const at = css.indexOf(`${selector} {`)
  if (at < 0) return ''
  return css.slice(at, css.indexOf('}', at))
}
const ALL = ROOM_SLUGS.map((s) => [s])
const KINDS = ['page', 'external', 'locked']
const HTTPS = { audiobookUrl: 'https://www.everand.com/audiobook/1/Example', udemyUrl: 'https://www.udemy.com/course/example/' }
const EMPTY = { audiobookUrl: '', udemyUrl: '' }          // as if the two outside addresses were ever taken out

// ---------- what each room says and where it leads ----------
describe('the rooms', () => {
  it('are the four rooms drawn so far, in the order of the site', () => {
    expect(ROOM_SLUGS).toEqual(['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'knowledge-nook'])
  })
  it.each(ALL)('%s: has a name, a line under it and a sentence, and posts are filed under its own name', (slug) => {
    const r = ROOMS[slug]
    expect(r.slug).toBe(slug)
    ;[r.name, r.tagline, r.blurb].forEach((t) => expect(typeof t === 'string' && t.trim().length > 3).toBe(true))
    expect(r.channel).toBe(slug)
  })
  it.each(ALL)('%s: every object has a unique id, a short name and a short description, and a kind the scene understands', (slug) => {
    const items = ROOMS[slug].items
    expect(items.length).toBeGreaterThan(0)
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    expect(new Set(items.map((i) => i.name)).size).toBe(items.length)
    items.forEach((i) => {
      expect(KINDS, i.id).toContain(i.kind)
      expect(i.name.length, i.id).toBeLessThanOrEqual(26)         // so its plaque stays small
      expect(i.blurb.length, i.id).toBeLessThanOrEqual(60)        // so its description fits the plaque
      expect(i.blurb.length, i.id).toBeGreaterThan(5)
    })
  })
  it.each(ALL)('%s: every page an object opens exists, as /%s/<area>', (slug) => {
    const { items, areas } = ROOMS[slug]
    items.filter((i) => i.kind === 'page').forEach((i) => {
      const key = i.to.replace(`/${slug}/`, '')
      expect(i.to, i.id).toBe(`/${slug}/${key}`)
      expect(Object.keys(areas), i.id).toContain(key)
    })
  })
  it.each(ALL)('%s: no area page is left without a door to it', (slug) => {
    const { items, areas } = ROOMS[slug]
    const doors = items.filter((i) => i.kind === 'page').map((i) => i.to.replace(`/${slug}/`, ''))
    expect(Object.keys(areas).sort()).toEqual(doors.sort())
  })
  it.each(ALL)('%s: every area has a name, a line, a layout, and says which posts belong to it', (slug) => {
    Object.entries(ROOMS[slug].areas).forEach(([key, a]) => {
      expect(/^[a-z0-9-]+$/.test(key), key).toBe(true)
      expect(a.name.length, key).toBeGreaterThan(2)
      expect(a.blurb.length, key).toBeGreaterThan(5)
      expect(['list', 'gallery'], key).toContain(a.layout)
      expect(a.tags === null || (Array.isArray(a.tags) && a.tags.length > 0 && a.tags.every((t) => typeof t === 'string' && t.trim())), key).toBe(true)
    })
  })
  it.each(ALL)('%s: a locked object always says why, in words the scene knows', (slug) => {
    ROOMS[slug].items.filter((i) => i.kind === 'locked').forEach((i) => {
      expect(Object.keys(LOCK_TEXT), i.id).toContain(i.lock)
    })
  })
  it('an object that leads to an outside address does not carry a permanent "opening soon", so it changes the moment its address is added', () => {
    ROOM_SLUGS.forEach((slug) => ROOMS[slug].items.filter((i) => i.kind === 'external').forEach((i) => {
      expect(Object.prototype.hasOwnProperty.call(i, 'href'), i.id).toBe(true)
      expect(i.lock, i.id).toBeUndefined()
    }))
  })
  it('only the audiobook and the Udemy course lead to outside addresses, and each address is a proper https one', () => {
    const outside = ROOM_SLUGS.flatMap((s) => ROOMS[s].items.filter((i) => i.kind === 'external').map((i) => i.id)).sort()
    expect(outside).toEqual(['audiobook', 'udemy-course'])
    ;[AUDIOBOOK_URL, UDEMY_URL].forEach((u) => expect(/^https:\/\/[^\s/]+/i.test(u), u).toBe(true))
  })
  it('has the real addresses, clean: your audio course on Everand and your course on Udemy, with no tracking tags on the end', () => {
    expect(AUDIOBOOK_URL).toBe('https://www.everand.com/audiobook/653427502/Leading-from-the-Middle')
    expect(UDEMY_URL).toBe('https://www.udemy.com/course/leading-from-the-middle/')
    ;[AUDIOBOOK_URL, UDEMY_URL].forEach((u) => expect(u, u).not.toMatch(/[?#]/))
  })
  it('calls the audiobook what it is, so nobody is told to read something they listen to', () => {
    const item = ROOMS['leadership-lounge'].items.find((i) => i.id === 'audiobook')
    expect(item.name).toBe('Audiobook')
    expect(item.blurb).toMatch(/Listen/)
    expect(item.blurb).toMatch(/Everand/)
    expect(JSON.stringify(ROOMS)).not.toMatch(/Scribd/)
  })
})

// ---------- the pictures, and where each object sits ----------
describe('the pictures', () => {
  it.each(ALL)('%s: the picture is the standard size, and so is every object\'s place on it', (slug) => {
    const scene = buildRoomScene(slug)
    expect([scene.width, scene.height]).toEqual([SCENE_SIZE.width, SCENE_SIZE.height])
    expect(publicFile(scene.base)).toMatch(/viewBox="0 0 1200 840"/)
  })
  it.each(ALL)('%s: every object sits exactly where it was measured, and has its own picture of exactly that size', (slug) => {
    ROOMS[slug].items.forEach((i) => {
      const g = GEOMETRY[slug][i.id]
      expect(g, i.id).toBeTruthy()
      expect([i.cx, i.cy, i.w, i.h, i.pad, i.rot], i.id).toEqual([g.cx, g.cy, g.w, g.h, OBJECT_PAD, 0])
      expect(i.art, i.id).toBe(`/scenes/${slug}/item-${i.id}.svg`)
      const svg = publicFile(i.art)
      const box = [i.cx - i.w / 2 - i.pad, i.cy - i.h / 2 - i.pad, i.w + 2 * i.pad, i.h + 2 * i.pad]
      expect(svg, i.id).toContain(`viewBox="${box.join(' ')}"`)
      expect(svg, i.id).toContain(`width="${box[2]}"`)
      expect(svg, i.id).toContain(`height="${box[3]}"`)
    })
  })
  it.each(ALL)('%s: every measurement belongs to an object, and every object has a measurement', (slug) => {
    expect(Object.keys(GEOMETRY[slug]).sort()).toEqual(ROOMS[slug].items.map((i) => i.id).sort())
  })
  it.each(ALL)('%s: the pictures are only drawings: nothing that runs, loads or links', (slug) => {
    const files = [buildRoomScene(slug).base, ...ROOMS[slug].items.map((i) => i.art)]
    files.forEach((f) => {
      const svg = publicFile(f)
      expect(svg.startsWith('<svg'), f).toBe(true)
      expect(svg, f).not.toMatch(/<script|<image|<foreignObject|<a[\s>]|\shref=|xlink:|\son[a-z]+=|javascript:|<style|url\(["']?https?:/i)
      expect(svg, f).toContain('aria-hidden="true"')            // a picture only: the page does the talking
      expect(svg, f).not.toMatch(/<title|<desc/)
    })
  })
  it.each(ALL)('%s: the scenery picture no longer holds the objects, so they are not drawn twice', (slug) => {
    const base = publicFile(buildRoomScene(slug).base)
    ROOMS[slug].items.forEach((i) => {
      expect(base, i.id).not.toMatch(new RegExp(`id="(object|beaker)-${i.id}"`))
    })
    expect(base).not.toMatch(/id="object-/)
  })
  it.each(ALL)('%s: every object, with its room for a shadow, is inside the picture', (slug) => {
    ROOMS[slug].items.forEach((i) => {
      expect(i.cx - i.w / 2 - i.pad, i.id).toBeGreaterThanOrEqual(0)
      expect(i.cy - i.h / 2 - i.pad, i.id).toBeGreaterThanOrEqual(0)
      expect(i.cx + i.w / 2 + i.pad, i.id).toBeLessThanOrEqual(SCENE_SIZE.width)
      expect(i.cy + i.h / 2 + i.pad, i.id).toBeLessThanOrEqual(SCENE_SIZE.height)
    })
  })
  it.each(ALL)('%s: no object is mostly covered by the ones drawn in front of it, so every one can be clicked', (slug) => {
    const items = ROOMS[slug].items
    const box = (i) => [i.cx - i.w / 2, i.cy - i.h / 2, i.cx + i.w / 2, i.cy + i.h / 2]
    items.forEach((a, n) => {
      const [ax0, ay0, ax1, ay1] = box(a)
      const covered = items.slice(n + 1).reduce((sum, b) => {
        const [bx0, by0, bx1, by1] = box(b)
        const w = Math.min(ax1, bx1) - Math.max(ax0, bx0)
        const h = Math.min(ay1, by1) - Math.max(ay0, by0)
        return sum + (w > 0 && h > 0 ? w * h : 0)
      }, 0)
      expect(covered / (a.w * a.h), `${a.id} is covered`).toBeLessThan(0.5)
    })
  })
})

// ---------- the plaques ----------
// a generous estimate of a plaque's size on the 1200-pixel-wide picture, as it first appears (the name, and why it is locked)
function plaqueBox(item) {
  const why = lockText(item.lock)
  const width = Math.max(item.name.length * 13, why.length * 9) + 44   // the handwriting measures about 11 a letter; 13 leaves room for a wider font to step in
  const height = 44 + (why ? 26 : 0)
  const [x, y] = plaqueAnchor(item)
  return [x - width / 2, y, x + width / 2, y + height]
}
const hit = (a, b) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0
describe('the name plaques', () => {
  const sceneFor = (slug, withLinks) => buildRoomScene(slug, withLinks ? HTTPS : EMPTY).items.map(resolveItem)
  describe.each([['with the two outside addresses empty', false], ['with the two outside addresses in', true]])('%s', (_, withLinks) => {
    it.each(ALL)('%s: every plaque is wholly inside the picture', (slug) => {
      sceneFor(slug, withLinks).forEach((i) => {
        const [x0, y0, x1, y1] = plaqueBox(i)
        expect(x0, i.id).toBeGreaterThanOrEqual(0)
        expect(y0, i.id).toBeGreaterThanOrEqual(0)
        expect(x1, i.id).toBeLessThanOrEqual(SCENE_SIZE.width)
        expect(y1, i.id).toBeLessThanOrEqual(SCENE_SIZE.height)
      })
    })
    it.each(ALL)('%s: no two plaques overlap', (slug) => {
      const items = sceneFor(slug, withLinks)
      items.forEach((a, n) => items.slice(n + 1).forEach((b) => expect(hit(plaqueBox(a), plaqueBox(b)), `${a.id} / ${b.id}`).toBe(false)))
    })
    it.each(ALL)('%s: a plaque never sits over a different object', (slug) => {
      const items = sceneFor(slug, withLinks)
      items.forEach((a) => items.filter((b) => b.id !== a.id).forEach((b) => {
        const objectBox = [b.cx - b.w / 2, b.cy - b.h / 2, b.cx + b.w / 2, b.cy + b.h / 2]
        expect(hit(plaqueBox(a), objectBox), `${a.id}'s plaque over ${b.id}`).toBe(false)
      }))
    })
  })
  it('every object in these rooms uses a plaque, and none of them writes on the object itself', () => {
    ROOM_SLUGS.forEach((slug) => ROOMS[slug].items.forEach((i) => expect(hasPlaque(i), i.id).toBe(true)))
  })
  it('puts a plaque just under its object when it is not told where', () => {
    expect(plaqueAnchor({ cx: 300, cy: 200, h: 100 })).toEqual([300, 262])
    expect(plaqueAnchor({ cx: 300, cy: 200, h: 100, labelAt: [50, 60] })).toEqual([50, 60])
    expect(plaqueAnchor({ cx: 300, cy: 200, h: 100, labelAt: [50] })).toEqual([300, 262])
  })
  it('works out where a plaque goes inside its own object\'s box, so it moves with the object', () => {
    const scene = { width: 1200, height: 840 }
    const item = { cx: 600, cy: 420, w: 200, h: 100, pad: 20, rot: 0, labelAt: [600, 520] }
    const p = placement(item, scene)
    // the box is 240 by 140 and starts at (480, 350): the point (600, 520) is half way across and 170 down
    expect(p['--qx']).toBe('50%')
    expect(parseFloat(p['--qy'])).toBeCloseTo((170 / 140) * 100, 1)
  })
})

// ---------- what the page shows ----------
const show = (slug, links) => render(<MemoryRouter initialEntries={[`/${slug}`]}><RoomScene scene={buildRoomScene(slug, links)} /></MemoryRouter>)
describe('each room as a visitor meets it', () => {
  it.each(ALL)('%s: shows its name as the heading, and its picture and objects', (slug) => {
    const { container } = show(slug)
    expect(screen.getByRole('heading', { level: 1, name: ROOMS[slug].name })).toBeInTheDocument()
    const stage = container.querySelector('.rs-stage')
    expect(stage.querySelector('img.rs-base').getAttribute('src')).toBe(`/scenes/${slug}/base.svg`)
    expect(stage.querySelectorAll('.rs-item')).toHaveLength(ROOMS[slug].items.length)
  })
  it.each(ALL)('%s: an open object is a link (to its page, or to its outside address), and a closed one is a labelled, unlinked, reachable thing', (slug) => {
    const { container } = show(slug)
    const stage = within(container.querySelector('.rs-stage'))
    ROOMS[slug].items.forEach((i) => {
      if (i.kind !== 'locked') {
        const link = stage.getByRole('link', { name: new RegExp(`^${i.name}\\b`) })
        expect(link, i.id).toHaveAttribute('href', i.kind === 'page' ? i.to : i.href)
        expect(link, i.id).toHaveAccessibleName(`${i.name}. ${i.blurb}${i.kind === 'external' ? ' (opens in a new tab)' : ''}`)
      } else {
        const closed = stage.getByRole('group', { name: new RegExp(`^${i.name}, locked`) })
        expect(closed, i.id).toHaveAttribute('tabindex', '0')
        expect(within(container.querySelector('.rs-stage')).queryByRole('link', { name: new RegExp(`^${i.name}\\b`) }), i.id).toBeNull()
      }
    })
  })
  it.each(ALL)('%s: every object has a plaque with its name, which is not read out twice, and its description is there for when you point at it', (slug) => {
    const { container } = show(slug)
    const items = Array.from(container.querySelectorAll('.rs-stage .rs-item'))
    expect(items).toHaveLength(ROOMS[slug].items.length)
    items.forEach((el, n) => {
      const i = ROOMS[slug].items[n]
      const plaque = el.querySelector('.rs-plaque')
      expect(plaque, i.id).toBeTruthy()
      expect(plaque).toHaveAttribute('aria-hidden', 'true')
      expect(plaque.querySelector('strong')).toHaveTextContent(i.name)
      expect(plaque.querySelector('.rs-plaque__blurb')).toHaveTextContent(i.blurb)
      expect(el.querySelector('.rs-label'), i.id).toBeNull()        // no writing on the object itself
      expect(el.querySelector('.rs-tip'), i.id).toBeNull()
    })
  })
  it.each(ALL)('%s: a closed object\'s plaque is marked as closed and says why; an open one has neither', (slug) => {
    const { container } = show(slug)
    Array.from(container.querySelectorAll('.rs-stage .rs-item')).forEach((el, n) => {
      const i = ROOMS[slug].items[n]
      const plaque = el.querySelector('.rs-plaque')
      const why = plaque.querySelector('.rs-plaque__why')
      if (i.kind !== 'locked') {
        expect(plaque.className, i.id).not.toContain('is-locked')
        expect(why, i.id).toBeNull()
      } else {
        expect(plaque.className, i.id).toContain('is-locked')
        expect(why, i.id).toBeTruthy()
        expect(why.textContent, i.id).toMatch(/soon/i)
      }
    })
  })
  it.each(ALL)('%s: gives phones a plain list of the same things, with the same open and closed ones', (slug) => {
    const { container } = show(slug)
    const list = within(container.querySelector('.rs-list'))
    ROOMS[slug].items.forEach((i) => {
      if (i.kind !== 'locked') expect(list.getByRole('link', { name: new RegExp(`^${i.name}\\b`) }), i.id).toHaveAttribute('href', i.kind === 'page' ? i.to : i.href)
      else expect(list.queryByRole('link', { name: new RegExp(`^${i.name}\\b`) }), i.id).toBeNull()
    })
  })
  it('shows the audiobook and the Udemy course closed and saying "opening soon", if their addresses are ever taken out', () => {
    const { container } = show('leadership-lounge', EMPTY)
    const stage = within(container.querySelector('.rs-stage'))
    ;['Audiobook', 'Udemy Course'].forEach((name) => {
      expect(stage.getByRole('group', { name: new RegExp(`^${name}, locked, opening soon`) })).toBeInTheDocument()
      expect(stage.queryByRole('link', { name: new RegExp(`^${name}`) })).toBeNull()
    })
  })
  it('opens your real audiobook and course in a new tab, safely, with nothing saying "opening soon", as the site is now', () => {
    const { container } = show('leadership-lounge')
    const stage = within(container.querySelector('.rs-stage'))
    const audio = stage.getByRole('link', { name: /^Audiobook\b/ })
    const udemy = stage.getByRole('link', { name: /^Udemy Course\b/ })
    expect(audio).toHaveAttribute('href', 'https://www.everand.com/audiobook/653427502/Leading-from-the-Middle')
    expect(udemy).toHaveAttribute('href', 'https://www.udemy.com/course/leading-from-the-middle/')
    expect(audio).toHaveAccessibleName('Audiobook. Listen to the audio course on Everand. (opens in a new tab)')
    ;[audio, udemy].forEach((a) => {
      expect(a).toHaveAttribute('target', '_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
      expect(a.getAttribute('rel')).toContain('noreferrer')
      expect(a.querySelector('.rs-plaque').className).not.toContain('is-locked')
      expect(a.querySelector('.rs-plaque__why')).toBeNull()
    })
    // the only thing in the Leadership Lounge still closed is the Free Ebook
    expect(Array.from(container.querySelectorAll('.rs-plaque__why')).map((n) => n.textContent)).toEqual(['Opening soon'])
    expect(container.querySelector('.rs-plaque.is-locked strong')).toHaveTextContent('Free Ebook')
  })
  it('turns the audiobook and the Udemy course into links that open in a new tab, safely, whichever addresses are put in', () => {
    const { container } = show('leadership-lounge', HTTPS)
    const stage = within(container.querySelector('.rs-stage'))
    const scribd = stage.getByRole('link', { name: /^Audiobook\b/ })
    const udemy = stage.getByRole('link', { name: /^Udemy Course\b/ })
    expect(scribd).toHaveAttribute('href', HTTPS.audiobookUrl)
    expect(udemy).toHaveAttribute('href', HTTPS.udemyUrl)
    ;[scribd, udemy].forEach((a) => {
      expect(a).toHaveAttribute('target', '_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
      expect(a.getAttribute('rel')).toContain('noreferrer')
      expect(a.getAttribute('aria-label')).toContain('(opens in a new tab)')
      expect(a.querySelector('.rs-plaque').className).not.toContain('is-locked')
      expect(a.querySelector('.rs-plaque__why')).toBeNull()
      expect(a.getAttribute('aria-label')).not.toMatch(/opening soon|locked/i)
    })
  })
  it('only treats a proper https address as an address: anything else leaves the object closed', () => {
    for (const bad of ['http://www.everand.com/x', 'javascript:alert(1)', '//everand.com/x', 'everand.com/x', '   ']) {
      const { container, unmount } = show('leadership-lounge', { audiobookUrl: bad, udemyUrl: bad })
      const stage = within(container.querySelector('.rs-stage'))
      expect(stage.queryByRole('link', { name: /^Audiobook\b/ }), bad).toBeNull()
      expect(stage.getByRole('group', { name: /^Audiobook, locked/ }), bad).toBeInTheDocument()
      unmount()
    }
  })
  it('does not change what any room says when other addresses are put in: only those two objects change', () => {
    const before = buildRoomScene('leadership-lounge').items
    const after = buildRoomScene('leadership-lounge', HTTPS).items
    after.forEach((a, n) => { if (!['audiobook', 'udemy-course'].includes(a.id)) expect(a).toEqual(before[n]) })
    expect(ROOMS['leadership-lounge'].items.find((i) => i.id === 'audiobook').href).toBe(AUDIOBOOK_URL)   // and the list itself is never altered
  })
})

// ---------- how the plaque looks and behaves ----------
describe('the plaque\'s style', () => {
  it('never gets in the way of a click', () => {
    expect(rule('.rs-plaque')).toMatch(/pointer-events:\s*none/)
  })
  it('stays out of sight, until you point at the object or tab to it, only for the description; the name is always there', () => {
    expect(rule('.rs-plaque .rs-plaque__blurb')).toMatch(/display:\s*none/)
    expect(css).toMatch(/\.rs-item:hover \.rs-plaque__blurb,\s*\.rs-item:focus-visible \.rs-plaque__blurb\s*\{\s*display:\s*block/)
    expect(rule('.rs-plaque strong')).not.toMatch(/display:\s*none/)
  })
  it('rises above its neighbours while it shows the description', () => {
    expect(css).toMatch(/\.rs-item:hover \.rs-plaque,\s*\.rs-item:focus-visible \.rs-plaque\s*\{\s*z-index:\s*6/)
  })
  it('looks closed when it is: a dashed edge', () => {
    expect(rule('.rs-plaque.is-locked')).toMatch(/border-style:\s*dashed/)
  })
  it('is placed from the object\'s own box, and centred on that point', () => {
    const body = rule('.rs-plaque')
    expect(body).toMatch(/left:\s*var\(--qx\)/)
    expect(body).toMatch(/top:\s*var\(--qy\)/)
    expect(body).toMatch(/translateX\(-50%\)/)
  })
  it('is a plain stacked block, which every browser lays out the same way', () => {
    expect(rule('.rs-plaque')).toMatch(/display:\s*block/)
    expect(rule('.rs-plaque')).not.toMatch(/display:\s*flex/)
    expect(rule('.rs-plaque strong')).toMatch(/display:\s*block/)
    expect(rule('.rs-plaque small')).toMatch(/display:\s*block/)
  })
})
