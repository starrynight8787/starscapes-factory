import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { makeDb, seedRoomPosts } from './fakeDb'

const db = makeDb()
vi.mock('../src/supabaseClient', () => ({ get supabase() { return db.supabase } }))

import RoomRoutes from '../src/rooms/RoomRoutes'
import { ROOMS, ROOM_SLUGS } from '../src/rooms/roomsData'
import { safeImage, tidyTag, inArea, formatDate } from '../src/rooms/postRules'

const css = fs.readFileSync(path.resolve('src/rooms/roompages.css'), 'utf8')
const rule = (selector) => {
  const at = css.indexOf(`${selector} {`)
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

// a stand-in for a post's page, which shows where the reader came from, so we can check the Back link will work
function PostProbe() {
  const here = useLocation()
  return <p>post page, came from {String(here.state && here.state.from)}</p>
}
function open(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        {ROOM_SLUGS.map((s) => <Route key={s} path={`/${s}/*`} element={<RoomRoutes room={s} />} />)}
        <Route path="/post/:id" element={<PostProbe />} />
      </Routes>
    </MemoryRouter>
  )
}
beforeEach(() => { db.state.user = null; db.state.failPosts = false; db.state.postSelects = []; seedRoomPosts(db) })

const titles = (container) => Array.from(container.querySelectorAll('.rp-entry__title')).map((n) => n.textContent)
const wait = async (container) => { await screen.findByRole('heading', { level: 1 }); await vi.waitFor(() => expect(container.querySelector('.rp-note')?.textContent || '').not.toMatch(/Loading/)) }

// ---------- a room's front page ----------
describe('a room\'s front page', () => {
  it.each(ROOM_SLUGS.map((s) => [s]))('%s: shows the room\'s scene at its own address', (slug) => {
    const { container } = open(`/${slug}`)
    expect(screen.getByRole('heading', { level: 1, name: ROOMS[slug].name })).toBeInTheDocument()
    expect(container.querySelector('.rs-stage')).toBeTruthy()
    expect(document.title).toBe(`${ROOMS[slug].name} | Starscapes Factory`)
  })
  it('does not ask the database for anything: the front page is only a picture and its doors', () => {
    open('/idea-hatchery')
    expect(db.state.postSelects).toHaveLength(0)
  })
})

// ---------- the area pages ----------
describe('an area page', () => {
  it('has the area as its heading, its line beneath, and a button back to the room', async () => {
    const { container } = open('/idea-hatchery/stop-motion')
    await wait(container)
    expect(screen.getByRole('heading', { level: 1, name: 'Stop Motion' })).toBeInTheDocument()
    expect(screen.getByText(ROOMS['idea-hatchery'].areas['stop-motion'].blurb)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Back to The Idea Hatchery' })).toHaveAttribute('href', '/idea-hatchery')
    expect(document.title).toBe('Stop Motion | Starscapes Factory')
  })
  it('lists only the published posts of its own room that carry its tag, newest first', async () => {
    const { container } = open('/idea-hatchery/writing-prompts')
    await wait(container)
    expect(titles(container)).toEqual(['Ten prompts for a wet Tuesday'])
    const stop = open('/idea-hatchery/stop-motion')
    await vi.waitFor(() => expect(titles(stop.container).length).toBeGreaterThan(0))
    expect(titles(stop.container)).toEqual(['Ten prompts for a wet Tuesday', 'A tiny world in clay'])        // newest first, and a post with two tags is on both pages
  })
  it('never shows a draft, a post in another room, or a post with none of its tags', async () => {
    const { container } = open('/idea-hatchery/short-stories')
    await wait(container)
    expect(titles(container)).toEqual(['The lighthouse keeper'])                    // not the unfinished one, not "A desk post", not the untagged one
  })
  it('never shows a draft on a public page, even to you when you are signed in and could see it', async () => {
    db.state.user = { id: 'owner-1', email: 'gillian@gillianbennet.com' }
    const { container } = open('/idea-hatchery/short-stories')
    await wait(container)
    expect(titles(container)).toEqual(['The lighthouse keeper'])
    expect(db.state.posts.find((p) => p.id === 'h-4').published).toBe(false)           // and the draft really does exist
  })
  it('asks the database only for published posts of its own room, with the picture along with the title and date', async () => {
    const { container } = open('/idea-hatchery/stop-motion')
    await wait(container)
    expect(db.state.postSelects.length).toBeGreaterThan(0)
    db.state.postSelects.forEach((cols) => expect(cols).toMatch(/image_url/))
  })
  it('treats capitals, spaces and hyphens in a tag as the same thing', async () => {
    const { container } = open('/idea-hatchery/stop-motion')                         // the post is tagged "Stop Motion"
    await wait(container)
    expect(titles(container)).toContain('A tiny world in clay')
    const bay = open('/explorers-bay/writing-in-transit')                            // tagged "Writing in Transit": a notebook-style page, which shows its latest entry big
    await vi.waitFor(() => expect(bay.container.querySelector('.en__latest .en__title')?.textContent).toBe('Notes from a night train'))
  })
  it('shows every published post of the room on the Blog page, whatever its tags, but never another room\'s (the Blog page has its own layout: Featured, Latest posts and so on)', async () => {
    const { container } = open('/leadership-lounge/blog')
    await wait(container)
    await vi.waitFor(() => expect(container.textContent).toContain('A note on meetings'))
    expect(container.textContent).toContain('What the middle is for')
    for (const other of ['Notes from a night train', 'The harbour at night', 'A desk post', 'Ten prompts for a wet Tuesday', 'The unfinished one']) expect(container.textContent, other).not.toContain(other)
    expect(screen.getAllByRole('link', { name: /A note on meetings/ })[0]).toHaveAttribute('href', '/post/l-2')
    expect(screen.getAllByRole('link', { name: /What the middle is for/ })[0]).toHaveAttribute('href', '/post/l-1')
  })
  it('says there is nothing yet, rather than showing an empty page', async () => {
    db.state.posts = db.state.posts.filter((p) => p.channel !== 'explorers-bay')
    const { container } = open('/explorers-bay/photography')
    await vi.waitFor(() => expect(container.querySelector('.rp-note')?.textContent).toMatch(/Nothing here yet/))
    expect(container.querySelectorAll('.rp-entry')).toHaveLength(0)
  })
  it('says so, kindly, if the posts cannot be loaded', async () => {
    db.state.failPosts = true
    open('/explorers-bay/photography')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i)
  })
  it('shows "Loading" while it waits', () => {
    const { container } = open('/explorers-bay/photography')
    expect(container.querySelector('.rp-note')).toHaveTextContent('Loading')
  })
  it('takes you to the post when you press an entry, and remembers the page you came from, so the post\'s Back link comes back here', async () => {
    const { container } = open('/idea-hatchery/short-stories')
    await wait(container)
    fireEvent.click(await screen.findByRole('link', { name: /The lighthouse keeper/ }))
    expect(await screen.findByText('post page, came from /idea-hatchery/short-stories')).toBeInTheDocument()
  })
})

// ---------- galleries and lists ----------
describe('galleries and lists', () => {
  it('shows each post\'s picture on a gallery page, across the top of its card', async () => {
    const { container } = open('/explorers-bay/photography')
    await wait(container)
    const grid = container.querySelector('.rp-entries')
    expect(grid.className).toContain('rp-entries--gallery')
    const card = Array.from(container.querySelectorAll('.rp-entry')).find((c) => c.textContent.includes('The harbour at night'))
    const img = card.querySelector('img.rp-entry__img')
    expect(img).toHaveAttribute('src', 'https://files.example/post-images/e-2.jpg')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(card.firstElementChild).toBe(img)
  })
  it('ignores a picture address that is not safe, and shows that card without a picture', async () => {
    const { container } = open('/explorers-bay/photography')
    await wait(container)
    const card = Array.from(container.querySelectorAll('.rp-entry')).find((c) => c.textContent.includes('broken address'))
    expect(card.querySelector('img')).toBeNull()
  })
  it('shows a gallery post with no picture as its title and date only', async () => {
    const { container } = open('/idea-hatchery/short-stories')
    await wait(container)
    const card = container.querySelector('.rp-entry')
    expect(card.querySelector('img')).toBeNull()
    expect(card.className).not.toContain('has-image')
  })
  it('keeps a list page as compact rectangles with no pictures, even for a post that has one (and a notebook-style page uses the entry template)', async () => {
    const { container } = open('/leadership-lounge/leading-from-the-middle')       // this post has a picture
    await wait(container)
    expect(titles(container)).toEqual(['What the middle is for'])
    expect(container.querySelector('.rp-entries').className).not.toContain('gallery')
    expect(container.querySelectorAll('.rp-entry img')).toHaveLength(0)
    // a notebook-style page (Writing in Transit) uses the entry template instead: its latest entry big, not the compact list
    const notebook = open('/explorers-bay/writing-in-transit')
    await vi.waitFor(() => expect(notebook.container.querySelector('.en__latest')).toBeTruthy())
    expect(notebook.container.querySelector('.rp-entries')).toBeNull()
    expect(within(notebook.container.querySelector('.en__latest')).getByRole('link', { name: 'Read the entry' })).toHaveAttribute('href', '/post/e-1')
  })
  it('hides a picture that will not load, and keeps the title and date', async () => {
    const { container } = open('/explorers-bay/photography')
    await wait(container)
    const card = Array.from(container.querySelectorAll('.rp-entry')).find((c) => c.textContent.includes('The harbour at night'))
    fireEvent.error(card.querySelector('img'))
    expect(card.querySelector('img').style.display).toBe('none')
    expect(card.querySelector('.rp-entry__title')).toHaveTextContent('The harbour at night')
    expect(card.querySelector('.rp-entry__date')).toHaveTextContent('10 Oct 2026')
  })
  it('announces each entry by its title and date, with the picture decorative', async () => {
    const { container } = open('/explorers-bay/photography')
    await wait(container)
    expect(screen.getByRole('link', { name: /The harbour at night/ })).toHaveAccessibleName(/^The harbour at night\s+10 Oct 2026$/)
  })
})

// ---------- pages that are not there ----------
describe('pages that do not exist', () => {
  it.each([
    ['/leadership-lounge/audiobook', 'an outside link has no page of its own'],
    ['/leadership-lounge/udemy-course', 'an outside link has no page of its own'],
    ['/explorers-bay/coming-soon', 'a locked object has no page'],
    ['/idea-hatchery/nonsense', 'an unknown area'],
    ['/idea-hatchery/__proto__', 'a name that could confuse a lookup'],
    ['/idea-hatchery/constructor', 'a name that could confuse a lookup'],
    ['/idea-hatchery/toString', 'a name that could confuse a lookup'],
    ['/explorers-bay/stop-motion', "another room's area"],
    ['/idea-hatchery/stop-motion/extra', 'too deep'],
  ])('%s says "Page not found", and the way back (%s)', (url) => {
    open(url)
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to/ })).toHaveAttribute('href', `/${url.split('/')[1]}`)
  })
  it('tells a visitor that a door which has a page, but is not open yet, is not open yet, with the way back to the room (only the owner sees the page behind it)', () => {
    open('/leadership-lounge/free-ebook')
    expect(screen.getByRole('heading', { level: 1, name: "This door isn't open yet" })).toBeInTheDocument()
    expect(screen.getByText('Come back soon.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Leadership Lounge/ })).toHaveAttribute('href', '/leadership-lounge')
  })
  it('does not even ask the database when the page does not exist', () => {
    open('/idea-hatchery/nonsense')
    expect(db.state.postSelects).toHaveLength(0)
  })
})

// ---------- the small rules ----------
describe('the rules about tags and pictures', () => {
  it('tidyTag: ignores capitals, spaces and apostrophes', () => {
    expect(tidyTag('Stop Motion')).toBe('stop-motion')
    expect(tidyTag('  Writing   in Transit ')).toBe('writing-in-transit')
    expect(tidyTag("Explorer's Notes")).toBe('explorers-notes')
    expect(tidyTag('stop-motion')).toBe('stop-motion')
  })
  it('inArea: a post belongs where one of its tags matches one of the area\'s', () => {
    const area = { tags: ['stop-motion'] }
    expect(inArea(area, { tags: ['Stop Motion', 'x'] })).toBe(true)
    expect(inArea(area, { tags: ['photography'] })).toBe(false)
    expect(inArea(area, { tags: [] })).toBe(false)
    expect(inArea(area, { tags: null })).toBe(false)
    expect(inArea(area, {})).toBe(false)
    expect(inArea(area, null)).toBe(false)
    expect(inArea(area, { tags: 'stop-motion' })).toBe(false)             // not a list: not trusted
  })
  it('inArea: an area with no list of tags takes every post, even one with no tags at all', () => {
    expect(inArea({ tags: null }, { tags: [] })).toBe(true)
    expect(inArea({ tags: null }, {})).toBe(true)
  })
  it('safeImage: an https address, or one on this site; nothing else', () => {
    expect(safeImage('https://files.example/a.jpg')).toBe('https://files.example/a.jpg')
    expect(safeImage(' /blog/a.png ')).toBe('/blog/a.png')
    for (const bad of ['http://x.example/a.jpg', '//x.example/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AA', 'a.jpg', 'https://', '', null, undefined, 7]) expect(safeImage(bad), String(bad)).toBe('')
  })
  it('formatDate: a plain date, and nothing at all for a date that is not one', () => {
    expect(formatDate('2026-10-16T10:00:00Z')).toBe('16 Oct 2026')
    expect(formatDate('not a date')).toBe('')
    expect(formatDate(undefined)).toBe('')
  })
})

// ---------- the look of the pages ----------
describe('the look of the area pages', () => {
  it('has a back button as big as a thumb, with a visible ring when you tab to it', () => {
    expect(rule('.rp-back a')).toMatch(/min-height:\s*44px/)
    expect(css).toMatch(/\.rp-back a:focus-visible\s*\{[^}]*outline:\s*3px solid/)
  })
  it('lays a gallery out in a grid that adapts to the width, and a list in a single column', () => {
    expect(rule('.rp-entries--gallery')).toMatch(/grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(260px,\s*1fr\)\)/)
    expect(rule('.rp-entries')).toMatch(/display:\s*grid/)
    expect(rule('.rp-entries')).not.toMatch(/grid-template-columns/)
  })
  it('shows a picture at a steady wide shape, filling the width of its card', () => {
    const body = rule('.rp-entry__img')
    expect(body).toMatch(/flex:\s*0 0 100%/)
    expect(body).toMatch(/aspect-ratio:\s*16 \/ 9/)
    expect(body).toMatch(/object-fit:\s*cover/)
  })
  it('gives a card a visible ring when you tab to it, and holds still for anyone who has asked for less motion', () => {
    expect(css).toMatch(/\.rp-entry:focus-visible\s*\{[^}]*outline:\s*3px solid/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.rp-entry\s*\{[^}]*transition:\s*none/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transform:\s*none/)
  })
})
