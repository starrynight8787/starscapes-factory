// The room pictures in the dark mobile menu (a tester could not see them, 22 October 2026): navy line art on the dark menu was invisible, because the rule that was meant to help
// pointed at a class (sf-tile) that the pictures no longer have. They are now drawn in the menu's own white, and ONLY there.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import RoomIcon from '../src/components/RoomIcon'
import { ROOM_ICONS } from '../src/components/roomIcons'

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.css') ? [path.join(dir, e.name)] : []))
const CSS_FILES = walk('src')
const rulesOf = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2].trim().replace(/\s+/g, ' ') }))
const ALL = CSS_FILES.flatMap((f) => rulesOf(fs.readFileSync(f, 'utf8')).map((r) => ({ ...r, file: f })))
const site = rulesOf(fs.readFileSync('src/styles/site.css', 'utf8'))
const ruleFor = (selector) => site.find((r) => r.selector.split(',').map((x) => x.trim()).includes(selector))
const WHITE = 'filter: brightness(0) invert(1)'

describe('the pictures in the dark mobile menu are white', () => {
  it('has a rule that draws a room picture inside the mobile menu in white (the pictures keep their shape and see-through background)', () => {
    const r = ruleFor('.sf-menu .sf-room-icon')
    expect(r, 'no rule for .sf-menu .sf-room-icon').toBeTruthy()
    expect(r.body).toContain(WHITE)
  })
  it('the white is the menu\u2019s own white: the room names beside the pictures are #fff', () => {
    expect(ruleFor('.sf-menu__item').body).toMatch(/(^|; )color: #fff;/)
    expect(ruleFor('.sf-menu').body).toMatch(/color: #fff;/)
  })
  it('aims at the class the picture really has (the bug was a rule aimed at sf-tile while the picture is drawn with sf-room-icon)', () => {
    const { container } = render(<RoomIcon room="art-loft" size={40} />)
    const img = container.querySelector('img')
    expect(img.classList.contains('sf-room-icon')).toBe(true)
    expect(img.getAttribute('alt')).toBe('') // still decoration only
    expect(ruleFor('.sf-menu .sf-room-icon')).toBeTruthy()
  })
  it('the mobile menu draws every room with that picture, inside its menu items', () => {
    const nav = fs.readFileSync('src/components/Navbar.jsx', 'utf8')
    const menu = nav.slice(nav.indexOf('className="sf-menu__list"'))
    expect(menu).toMatch(/className="sf-menu__item"[\s\S]{0,120}<RoomIcon room=\{c\.slug\}/)
  })
  it('every room has a picture file to show', () => {
    for (const [room, src] of Object.entries(ROOM_ICONS)) expect(fs.existsSync(path.join('public', src)), room).toBe(true)
    expect(Object.keys(ROOM_ICONS)).toHaveLength(8)
  })
})

describe('and only there: the light places keep the navy pictures', () => {
  it('no rule anywhere whitens a room picture outside the dark mobile menu', () => {
    const whitening = ALL.filter((r) => /sf-room-icon/.test(r.selector) && /filter:/.test(r.body))
    expect(whitening.length).toBeGreaterThan(0)
    for (const r of whitening) for (const sel of r.selector.split(',').map((x) => x.trim()).filter((x) => /sf-room-icon/.test(x))) expect(sel.startsWith('.sf-menu '), `${sel} in ${r.file}`).toBe(true)
  })
  it('the rooms dropdown on a computer is a white panel, so its navy pictures are right and are left alone', () => {
    expect(ruleFor('.sf-rooms__panel').body).toMatch(/background: #fff;/)
    expect(ALL.filter((r) => /sf-rooms/.test(r.selector) && /sf-room-icon/.test(r.selector) && /filter:/.test(r.body))).toEqual([])
  })
  it('the picture\u2019s own style (in roomicon.css) does not whiten it for everyone', () => {
    const own = rulesOf(fs.readFileSync('src/components/roomicon.css', 'utf8')).find((r) => r.selector === '.sf-room-icon')
    expect(own.body).not.toMatch(/filter:/)
  })
})
