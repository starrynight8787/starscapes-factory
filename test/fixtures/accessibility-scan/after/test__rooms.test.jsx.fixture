import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoomScene from '../src/rooms/RoomScene'
import { resolveItem, itemLabel, lockText, placement, LOCK_TEXT } from '../src/rooms/sceneRules'

// a made-up room, to show the scene is not tied to the Drafting Desk
const scene = {
  name: 'The Test Room', tagline: 'A room for testing.', blurb: 'Click a thing.', width: 1000, height: 500, base: '/scenes/test/base.svg',
  items: [
    { id: 'a', name: 'Open page', blurb: 'Opens here.', kind: 'page', to: '/test/a', art: '/scenes/test/a.svg', cx: 200, cy: 150, w: 200, h: 120, rot: -5, pad: 20 },
    { id: 'b', name: 'Other site', blurb: 'Opens elsewhere.', kind: 'external', href: 'https://example.com/hello', art: '/scenes/test/b.svg', cx: 500, cy: 150, w: 200, h: 120, rot: 3, pad: 20 },
    { id: 'c', name: 'Not yet', blurb: 'Not open yet.', kind: 'locked', lock: 'not started yet', art: '/scenes/test/c.svg', cx: 800, cy: 150, w: 200, h: 120, rot: 0, pad: 20 },
    { id: 'd', name: 'Members page', blurb: 'For members.', kind: 'page', to: '/test/d', lock: 'paid', art: '/scenes/test/d.svg', cx: 350, cy: 350, w: 200, h: 120, rot: 8, pad: 20, labelTop: 48 },
  ],
}
const show = (s = scene) => render(<MemoryRouter><RoomScene scene={s} /></MemoryRouter>)
const stage = (c) => c.querySelector('.rs-stage')

describe('a room scene', () => {
  it('shows the room\'s name, its tagline and a line about it', () => {
    show()
    expect(screen.getByRole('heading', { level: 1, name: 'The Test Room' })).toBeInTheDocument()
    expect(screen.getByText('A room for testing.')).toBeInTheDocument()
    expect(screen.getByText('Click a thing.')).toBeInTheDocument()
  })
  it('draws the base picture, and gives every item its own picture, all hidden from screen readers (the writing says it all)', () => {
    const { container } = show()
    const base = stage(container).querySelector('img.rs-base')
    expect(base).toHaveAttribute('src', '/scenes/test/base.svg')
    expect(base).toHaveAttribute('alt', '')
    const arts = Array.from(stage(container).querySelectorAll('img.rs-art'))
    expect(arts.map((i) => i.getAttribute('src'))).toEqual(['/scenes/test/a.svg', '/scenes/test/b.svg', '/scenes/test/c.svg', '/scenes/test/d.svg'])
    arts.forEach((i) => expect(i).toHaveAttribute('alt', ''))
  })
  it('keeps the shape of the picture, whatever width it is shown at', () => {
    const { container } = show()
    expect(stage(container).style.aspectRatio.replace(/\s/g, '')).toBe('1000/500')
  })
  it('writes each item\'s name and its line of description on it, in the order given', () => {
    const { container } = show()
    const labels = Array.from(stage(container).querySelectorAll('.rs-label')).map((l) => l.textContent)
    expect(labels).toEqual(['Open page Opens here.', 'Other site Opens elsewhere.', 'Not yet Not open yet.', 'Members page For members.']) // a space between the name and the description, so the written words read as words
  })

  describe('a page that opens here', () => {
    it('is a link to that page', () => {
      const { container } = show()
      const link = within(stage(container)).getByRole('link', { name: /Open page/ })
      expect(link).toHaveAttribute('href', '/test/a')
      expect(link).not.toHaveAttribute('target')
      expect(link).toHaveAccessibleName('Open page. Opens here.')
    })
  })
  describe('a page on another site', () => {
    it('opens in a new tab, safely, and says so to a screen reader', () => {
      const { container } = show()
      const link = within(stage(container)).getByRole('link', { name: /Other site/ })
      expect(link).toHaveAttribute('href', 'https://example.com/hello')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
      expect(link.getAttribute('rel')).toContain('noreferrer')
      expect(link).toHaveAccessibleName('Other site. Opens elsewhere. (opens in a new tab)')
    })
  })
  describe('something that is locked', () => {
    it('is not a link and goes nowhere, but can still be reached with the keyboard', () => {
      const { container } = show()
      const item = within(stage(container)).getByRole('group', { name: /Not yet/ })
      expect(item.tagName).not.toBe('A')
      expect(item).toHaveAttribute('tabindex', '0')
      expect(item.querySelector('a')).toBeNull()
      expect(within(stage(container)).queryByRole('link', { name: /Not yet/ })).toBeNull()
    })
    it('says why it is locked, in words, both to the eye and to a screen reader', () => {
      const { container } = show()
      const item = within(stage(container)).getByRole('group', { name: /Not yet/ })
      expect(item).toHaveAccessibleName('Not yet. Not open yet. Starting soon (locked)')
      expect(within(item).getByRole('note')).toHaveTextContent('Starting soon')
    })
  })
  describe('a paid page that can still be opened', () => {
    it('stays a link, and says it is for paid members, to the eye and to a screen reader', () => {
      const { container } = show()
      const link = within(stage(container)).getByRole('link', { name: /Members page/ })
      expect(link).toHaveAttribute('href', '/test/d')
      expect(link).toHaveAccessibleName('Members page. For members. Paid members only')
      expect(within(link).getByRole('note')).toHaveTextContent('Paid members only')
    })
  })
  it('shows no note on items that are simply open', () => {
    const { container } = show()
    expect(within(within(stage(container)).getByRole('link', { name: /Open page/ })).queryByRole('note')).toBeNull()
    expect(within(within(stage(container)).getByRole('link', { name: /Other site/ })).queryByRole('note')).toBeNull()
  })

  describe('the same doors as a plain list, for phones', () => {
    it('is a navigation area with the room\'s name, holding one entry for each item', () => {
      const { container } = show()
      const list = screen.getByRole('navigation', { name: 'Ways into The Test Room' })
      expect(list).toBe(container.querySelector('.rs-list'))
      expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    })
    it('links the ones that can be opened, and leaves the locked one as plain words saying why', () => {
      show()
      const list = screen.getByRole('navigation', { name: 'Ways into The Test Room' })
      expect(within(list).getByRole('link', { name: /Open page/ })).toHaveAttribute('href', '/test/a')
      const other = within(list).getByRole('link', { name: /Other site/ })
      expect(other).toHaveAttribute('target', '_blank')
      expect(other).toHaveTextContent('Opens in a new tab')
      expect(within(list).queryByRole('link', { name: /Not yet/ })).toBeNull()
      expect(within(list).getByText('Starting soon')).toBeInTheDocument()
      expect(within(list).getByRole('link', { name: /Members page/ })).toHaveTextContent('Paid members only')
    })
    it('is not made with a nav element, because the old site-wide style would give it a white box', () => {
      const { container } = show()
      expect(container.querySelector('nav')).toBeNull()
    })
  })
})

describe('what counts as a link, and what does not', () => {
  const page = { id: 'x', name: 'X', blurb: 'x', kind: 'page', to: '/somewhere' }
  const ext = { id: 'x', name: 'X', blurb: 'x', kind: 'external', href: 'https://example.com' }
  it('keeps a page with a proper address on this site', () => {
    expect(resolveItem(page)).toMatchObject({ kind: 'page', to: '/somewhere' })
  })
  it('turns a page with no address, or an address that leaves the site, into something locked', () => {
    for (const to of [undefined, '', 'somewhere', '//evil.example/x', 'https://evil.example/x', 'javascript:alert(1)']) {
      expect(resolveItem({ ...page, to }).kind, String(to)).toBe('locked')
    }
  })
  it('keeps an external address that starts with https://, and tidies stray spaces round it', () => {
    expect(resolveItem(ext)).toMatchObject({ kind: 'external', href: 'https://example.com' })
    expect(resolveItem({ ...ext, href: '  https://example.com/a  ' }).href).toBe('https://example.com/a')
  })
  it('never lets a visitor be sent to an address that is not https, or to something that is not a web address at all', () => {
    for (const href of [undefined, '', '   ', 'http://example.com', 'javascript:alert(1)', 'data:text/html,x', 'ftp://example.com', 'example.com', '//example.com', 'https://', 'https:// bad']) {
      expect(resolveItem({ ...ext, href }).kind, String(href)).toBe('locked')
    }
  })
  it('shows an empty or broken link as "opening soon", unless a reason was given', () => {
    expect(resolveItem({ ...ext, href: '' })).toMatchObject({ kind: 'locked', lock: 'opening soon' })
    expect(resolveItem({ ...ext, href: '', lock: 'not started yet' }).lock).toBe('not started yet')
  })
  it('treats a kind it does not know as locked, and copes with nothing at all', () => {
    expect(resolveItem({ ...page, kind: 'portal' }).kind).toBe('locked')
    expect(resolveItem({ id: 'z', name: 'Z', blurb: 'z' }).kind).toBe('locked')
    expect(() => resolveItem(undefined)).not.toThrow()
  })
  it('does not change the item it was given', () => {
    const original = { ...ext, href: '' }
    const copy = JSON.stringify(original)
    resolveItem(original)
    expect(JSON.stringify(original)).toBe(copy)
  })
})

describe('the words for a lock', () => {
  it('has plain words for each reason, and a sensible fallback', () => {
    expect(lockText('paid')).toBe('Paid members only')
    expect(lockText('not started yet')).toBe('Starting soon')
    expect(lockText('opening soon')).toBe('Opening soon')
    expect(lockText('something new')).toBe('Not open yet')
    expect(lockText(undefined)).toBe('')
    expect(Object.keys(LOCK_TEXT).sort()).toEqual(['not started yet', 'opening soon', 'paid'])
  })
  it('describes each kind of item for a screen reader', () => {
    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'page' })).toBe('A. About A.')
    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'external' })).toBe('A. About A. (opens in a new tab)')
    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'locked', lock: 'paid' })).toBe('A. About A. Paid members only (locked)')
    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'page', lock: 'paid' })).toBe('A. About A. Paid members only')
  })
})

describe('where things are put on the picture', () => {
  const sc = { width: 1000, height: 500 }
  it('works out everything as percentages, so it scales with the picture', () => {
    const p = placement({ cx: 500, cy: 250, w: 200, h: 100, rot: 5, pad: 40 }, sc)
    expect(p['--cx']).toBe('50%')
    expect(p['--cy']).toBe('50%')
    expect(p['--w']).toBe('28%')               // (200 + 80) / 1000
    expect(p['--h']).toBe('36%')               // (100 + 80) / 500
    expect(p['--rot']).toBe('5deg')
  })
  it('puts the paper, the writing and the note in the right places inside the item\'s own picture', () => {
    const p = placement({ cx: 500, cy: 250, w: 200, h: 100, rot: 0, pad: 40, labelTop: 20 }, sc)
    const n = (v) => parseFloat(v)
    expect(n(p['--sx'])).toBeCloseTo((40 / 280) * 100, 1)      // the paper starts one pad in
    expect(n(p['--sw'])).toBeCloseTo((200 / 280) * 100, 1)
    expect(n(p['--sy'])).toBeCloseTo((40 / 180) * 100, 1)
    expect(n(p['--sh'])).toBeCloseTo((100 / 180) * 100, 1)
    expect(n(p['--lx'])).toBeCloseTo(((40 + 18) / 280) * 100, 1)
    expect(n(p['--lw'])).toBeCloseTo(((200 - 36) / 280) * 100, 1)
    expect(n(p['--ly'])).toBeCloseTo(((40 + 20) / 180) * 100, 1)
    expect(n(p['--ty'])).toBeCloseTo(((40 + 100) / 180) * 100, 1)   // the note sits on the paper's bottom edge
  })
  it('keeps the writing inside the paper, whatever the paper\'s size', () => {
    for (const [w, h] of [[200, 120], [270, 340], [320, 235]]) {
      const p = placement({ cx: 100, cy: 100, w, h, pad: 44 }, sc)
      const left = parseFloat(p['--lx']), width = parseFloat(p['--lw']), sx = parseFloat(p['--sx']), sw = parseFloat(p['--sw'])
      expect(left).toBeGreaterThan(sx)
      expect(left + width).toBeLessThan(sx + sw)
    }
  })
  it('uses a gentle default for the writing\'s height, and no padding if none is given', () => {
    const p = placement({ cx: 0, cy: 0, w: 100, h: 100 }, { width: 100, height: 100 })
    expect(p['--sx']).toBe('0%')
    expect(p['--sw']).toBe('100%')
    expect(p['--rot']).toBe('0deg')
    expect(parseFloat(p['--ly'])).toBe(30)
  })
})

describe('how the scene looks and behaves', () => {
  const css = fs.readFileSync('src/rooms/roomscene.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = (selector) => {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = css.match(new RegExp('(?:^|[}\\s])' + esc + '\\s*\\{([^}]*)\\}'))
    return m ? m[1] : ''
  }
  it('lets only the paper itself be clicked, not the empty space round it, so overlapping shadows never steal a click', () => {
    expect(rule('.rs-item')).toMatch(/pointer-events:\s*none/)
    expect(rule('.rs-hit')).toMatch(/pointer-events:\s*auto/)
    expect(rule('.rs-art')).toMatch(/pointer-events:\s*none/)
    expect(rule('.rs-label')).toMatch(/pointer-events:\s*none/)
  })
  it('lifts a paper you can open when you point at it or tab to it, and not one that is locked', () => {
    expect(rule('a.rs-item:hover,\na.rs-item:focus-visible')).toMatch(/translate\(-50%, calc\(-50% - /)
    expect(css).not.toMatch(/\.is-locked:hover\s*\{[^}]*translate/)
    expect(css).not.toMatch(/(^|[^a])\.rs-item:hover\s*\{[^}]*translate/)
  })
  it('keeps the tilt while it lifts', () => {
    expect(rule('a.rs-item:hover,\na.rs-item:focus-visible')).toMatch(/rotate\(var\(--rot/)
  })
  it('shows the note about a lock only when you point at the paper or tab to it', () => {
    expect(rule('.rs-tip')).toMatch(/opacity:\s*0/)
    expect(css).toMatch(/\.rs-item:hover \.rs-tip,\s*\.rs-item:focus-visible \.rs-tip\s*\{\s*opacity:\s*1/)
  })
  it('shows a ring round the paper when you tab to it', () => {
    expect(rule('.rs-item:focus-visible .rs-hit')).toMatch(/outline:\s*3px solid/)
  })
  it('hides the picture and shows the plain list on phones', () => {
    expect(rule('.rs-list')).toMatch(/display:\s*none/)
    const phone = css.match(/@media \(max-width: 820px\)\s*\{([\s\S]*?)\n\}/)[1]
    expect(phone).toMatch(/\.rs-stage\s*\{\s*display:\s*none/)
    expect(phone).toMatch(/\.rs-list\s*\{\s*display:\s*block/)
  })
  it('stops moving for anyone who has asked their device for less motion', () => {
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)[1]
    expect(reduced).toMatch(/transition:\s*none/)
    expect(reduced).toMatch(/a\.rs-item:hover[\s\S]*transform:\s*translate\(-50%, -50%\) rotate/)
  })
  it('scales the writing with the picture, but never smaller than can be read', () => {
    expect(rule('.rs-label strong')).toMatch(/font-size:\s*clamp\(14px,/)
    expect(rule('.rs-label small')).toMatch(/font-size:\s*clamp\(12px,/) // writing on the drawn paper can go down to 12px, never less
  })
  it('keeps every locked paper looking like something you cannot press', () => {
    expect(rule('.rs-item.is-locked .rs-hit')).toMatch(/cursor:\s*not-allowed/)
  })
  it('gives the lock note its own text colour on its white background', () => {
    const body = rule('.rs-tip')
    expect(body).toMatch(/background:\s*#fff/)
    expect(body).toMatch(/(^|[;\s])color:\s*var\(--sf-navy-700/)
  })
})
