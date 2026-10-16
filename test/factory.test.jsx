import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// A pretend posts table: only published posts of the right room come back, newest first
const db = vi.hoisted(() => {
  const d = { posts: [], fail: false, lastQuery: null }
  d.supabase = {
    from(table) {
      const q = { table, filters: [], order: null, limit: null }
      const api = {
        select() { return api },
        eq(col, val) { q.filters.push([col, val]); return api },
        order(col, o = {}) { q.order = [col, o.ascending !== false]; return api },
        limit(n) { q.limit = n; return api },
        then(resolve, reject) {
          d.lastQuery = q
          if (d.fail) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve, reject)
          let rows = d.posts.filter((p) => q.filters.every(([c, v]) => p[c] === v))
          if (q.order) rows = rows.slice().sort((a, b) => String(a[q.order[0]]).localeCompare(String(b[q.order[0]])) * (q.order[1] ? 1 : -1))
          if (q.limit) rows = rows.slice(0, q.limit)
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
        },
      }
      return api
    },
  }
  return d
})
vi.mock('../src/supabaseClient', () => ({ supabase: db.supabase }))

import FactoryFloorRoutes from '../src/factoryfloor/FactoryFloorRoutes'
import { kindOf, noteTilt, formatDate, tagsOf, filterPosts, NOTE_COLOURS } from '../src/factoryfloor/factoryData'

const open = (path) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/factory-floor/*" element={<FactoryFloorRoutes />} /></Routes></MemoryRouter>)
const post = (n, extra = {}) => ({ id: `p${n}`, title: `Post ${n}`, created_at: `2026-10-${String(10 + n).padStart(2, '0')}T09:00:00Z`, tags: [], channel: 'factory-floor', published: true, ...extra })
beforeEach(() => {
  db.fail = false
  db.posts = [
    post(1, { title: 'Day One: Building From Scratch' }),
    post(2, { title: 'Meet Nano', tags: ['nano', 'Terminal', 'test-import'] }),
    post(3, { title: 'Blueprints #1: Why I Did Not Use Wix' }),
    post(4, { title: 'Why tags are arrays', tags: ['Blueprints', 'database'] }),
    post(5, { title: 'Day Five', tags: ['design'] }),
    post(6, { title: 'Day Six', tags: ['terminal', 'design'] }),
    post(7, { title: 'Day Seven' }),
    post(8, { title: 'A draft', published: false }),
    post(9, { title: 'Someone else\'s room', channel: 'idea-hatchery' }),
  ]
})

describe('helpers', () => {
  it('tells a Blueprint from a story post by tag or by title', () => {
    expect(kindOf({ title: 'Day One', tags: [] })).toBe('story')
    expect(kindOf({ title: 'Anything', tags: ['Blueprints'] })).toBe('blueprint')
    expect(kindOf({ title: 'Anything', tags: [' blueprint '] })).toBe('blueprint')
    expect(kindOf({ title: 'Blueprints #4: Why', tags: [] })).toBe('blueprint')
    expect(kindOf({ title: '  blueprint for a bird house', tags: null })).toBe('blueprint')
    expect(kindOf({ title: 'Blueprinting is hard', tags: [] })).toBe('story')   // only the word itself counts
    expect(kindOf({})).toBe('story')
  })
  it('gives each note a steady tilt that repeats', () => {
    expect(noteTilt(0)).toBe(noteTilt(6))
    expect(noteTilt(-1)).toBe(noteTilt(5))
    expect(new Set([0, 1, 2, 3, 4, 5].map(noteTilt)).size).toBeGreaterThan(3)
  })
  it('writes dates plainly', () => {
    expect(formatDate('2026-10-14T09:00:00Z')).toBe('14 Oct 2026')
    expect(formatDate('nonsense')).toBe('')
  })
})

describe('the Factory Floor page', () => {
  it('has the two objects at the top (a protractor and a rolled blueprint), each going to its own page', async () => {
    open('/factory-floor')
    const nav = await screen.findByRole('navigation', { name: 'Sections of the Factory Floor' })
    const links = within(nav).getAllByRole('link')
    expect(links.length).toBe(2)
    expect(links[0]).toHaveTextContent('The Factory Floor')
    expect(links[0]).toHaveAttribute('href', '/factory-floor/floor')
    expect(links[1]).toHaveTextContent('Factory Blueprints')
    expect(links[1]).toHaveAttribute('href', '/factory-floor/blueprints')
    expect(links[0].className).toContain('ff-obj')
    expect(links[0].querySelector('img')).toHaveAttribute('src', '/scenes/factory-floor/protractor.svg')
    expect(links[1].querySelector('img')).toHaveAttribute('src', '/scenes/factory-floor/blueprint-roll.svg')
  })
  it('shows the latest six posts, newest first, each one a post-it linking to its post', async () => {
    open('/factory-floor')
    const list = (await screen.findByRole('heading', { name: 'Latest posts' })).closest('section').querySelector('ul')
    const notes = within(list).getAllByRole('link')
    expect(notes.length).toBe(6)
    expect(notes.map((n) => n.querySelector('.ff-note__title').textContent)).toEqual(['Day Seven', 'Day Six', 'Day Five', 'Why tags are arrays', 'Blueprints #1: Why I Did Not Use Wix', 'Meet Nano'])
    expect(notes[0]).toHaveAttribute('href', '/post/p7')
    expect(notes[0]).toHaveTextContent('New')
    expect(notes[1]).not.toHaveTextContent('New')
  })
  it('labels each note as Factory Floor or Blueprints, with its date', async () => {
    open('/factory-floor')
    const list = (await screen.findByRole('heading', { name: 'Latest posts' })).closest('section').querySelector('ul')
    const notes = within(list).getAllByRole('link')
    expect(notes[0].querySelector('.ff-note__kind').textContent).toBe('Factory Floor')
    expect(notes[3].querySelector('.ff-note__kind').textContent).toBe('Blueprints')       // tagged
    expect(notes[4].querySelector('.ff-note__kind').textContent).toBe('Blueprints')       // by its title
    expect(notes[0].querySelector('.ff-note__date').textContent).toBe('17 Oct 2026')
  })
  it('uses all six colours, one after another, including pale blue and pale purple', async () => {
    open('/factory-floor')
    const list = (await screen.findByRole('heading', { name: 'Latest posts' })).closest('section').querySelector('ul')
    const classes = within(list).getAllByRole('link').map((n) => n.className.match(/ff-note--c(\d)/)[1])
    expect(classes).toEqual(['0', '1', '2', '3', '4', '5'])
  })
  it('never shows a draft or another room\'s post, and asks for this room only', async () => {
    open('/factory-floor')
    await screen.findByRole('heading', { name: 'Latest posts' })
    expect(screen.queryByText('A draft')).toBeNull()
    expect(screen.queryByText(/Someone else/)).toBeNull()
    expect(db.lastQuery.filters).toEqual(expect.arrayContaining([['channel', 'factory-floor'], ['published', true]]))
    expect(db.lastQuery.order).toEqual(['created_at', false])
  })
  it('says so kindly when there are no posts yet', async () => {
    db.posts = []
    open('/factory-floor')
    expect(await screen.findByText(/first post-it is on its way/)).toBeInTheDocument()
  })
  it('says so kindly when the posts cannot load, and the two objects still work', async () => {
    db.fail = true
    open('/factory-floor')
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load')
    expect(screen.getAllByRole('link').filter((l) => l.className.includes('ff-obj')).length).toBe(2)
  })
})

describe('the two list pages', () => {
  it('Factory Floor shows only the story posts', async () => {
    open('/factory-floor/floor')
    await screen.findByRole('heading', { name: 'The Factory Floor' })
    const titles = (await screen.findAllByRole('link')).filter((l) => l.className.includes('ff-note')).map((n) => n.querySelector('.ff-note__title').textContent)
    expect(titles).toEqual(['Day Seven', 'Day Six', 'Day Five', 'Meet Nano', 'Day One: Building From Scratch'])
  })
  it('Blueprints shows only the Blueprints posts', async () => {
    open('/factory-floor/blueprints')
    await screen.findByRole('heading', { name: 'Factory Blueprints' })
    const titles = (await screen.findAllByRole('link')).filter((l) => l.className.includes('ff-note')).map((n) => n.querySelector('.ff-note__title').textContent)
    expect(titles).toEqual(['Why tags are arrays', 'Blueprints #1: Why I Did Not Use Wix'])
  })
  it('both link back to the main page', async () => {
    open('/factory-floor/blueprints')
    expect(await screen.findByRole('link', { name: '← The Factory Floor' })).toHaveAttribute('href', '/factory-floor')
  })
  it('say so when there is nothing of that kind yet', async () => {
    db.posts = db.posts.filter((p) => kindOf(p) === 'story')
    open('/factory-floor/blueprints')
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument()
  })
  it('an unknown address gets a friendly page', async () => {
    open('/factory-floor/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})


describe('the colours', () => {
  it('are six, with pale blue and pale purple in the mix', () => {
    expect(NOTE_COLOURS).toEqual(['#C9F29B', '#FFC78F', '#CDE4FF', '#FFB3D1', '#DCCDFF', '#FFE27A'])
    expect(new Set(NOTE_COLOURS).size).toBe(6)
  })
  it('match the styles, so a colour never goes missing', async () => {
    const fs = await import('node:fs')
    const css = fs.readFileSync('src/factoryfloor/factoryfloor.css', 'utf8')
    NOTE_COLOURS.forEach((hex, i) => {
      expect(css.toLowerCase()).toContain(`.ff-note--c${i} { --note: ${hex.toLowerCase()}; }`)
    })
    expect(css).not.toContain('ff-note--c6')
  })
  it('never put the same colour on two neighbouring notes', () => {
    for (let i = 0; i < 24; i++) expect(i % NOTE_COLOURS.length).not.toBe((i + 1) % NOTE_COLOURS.length)
  })
})

describe('filtering, the rules', () => {
  const list = [
    { id: 'a', title: 'Meet Nano: My Text Editor', created_at: '2026-10-06T09:00:00Z', tags: ['Nano', 'terminal', 'test-import', 'factory-floor'] },
    { id: 'b', title: 'Day Four: Terminal Troubles', created_at: '2026-10-08T09:00:00Z', tags: ['terminal'] },
    { id: 'c', title: 'Day Five: Post-it Note', created_at: '2026-10-10T09:00:00Z', tags: ['design', ' Design '] },
    { id: 'd', title: 'Day Six', created_at: '2026-10-13T09:00:00Z', tags: null },
  ]
  it('offers only the useful tags, once each, counted, in alphabetical order', () => {
    expect(tagsOf(list)).toEqual([
      { key: 'design', label: 'design', count: 1 },
      { key: 'nano', label: 'Nano', count: 1 },
      { key: 'terminal', label: 'terminal', count: 2 },
    ])
  })
  it('uses the most common spelling of a tag, whichever post comes first', () => {
    const three = [{ tags: ['terminal'] }, { tags: ['Terminal'] }, { tags: ['Terminal'] }]
    expect(tagsOf(three)).toEqual([{ key: 'terminal', label: 'Terminal', count: 3 }])
    expect(tagsOf([...three].reverse())).toEqual([{ key: 'terminal', label: 'Terminal', count: 3 }])
  })
  it('never offers the room and kind tags', () => {
    expect(tagsOf([{ tags: ['factory-floor', 'Blueprints', 'blueprint', 'TEST-IMPORT'] }])).toEqual([])
  })
  it('searches the title: every word must be there, in any order, ignoring capitals', () => {
    expect(filterPosts(list, { q: 'terminal' }).map((p) => p.id)).toEqual(['b'])
    expect(filterPosts(list, { q: 'day post' }).map((p) => p.id)).toEqual(['c'])
    expect(filterPosts(list, { q: 'NOTE post-it' }).map((p) => p.id)).toEqual(['c'])
    expect(filterPosts(list, { q: '   ' }).length).toBe(4)
    expect(filterPosts(list, { q: 'zzz' })).toEqual([])
  })
  it('filters by one tag, ignoring capitals and stray spaces', () => {
    expect(filterPosts(list, { tag: 'terminal' }).map((p) => p.id)).toEqual(['b', 'a'])
    expect(filterPosts(list, { tag: 'NANO' }).map((p) => p.id)).toEqual(['a'])
    expect(filterPosts(list, { tag: 'design' }).map((p) => p.id)).toEqual(['c'])
  })
  it('combines the search and the tag, and sorts newest or oldest first', () => {
    expect(filterPosts(list, { q: 'day', tag: 'terminal' }).map((p) => p.id)).toEqual(['b'])
    expect(filterPosts(list).map((p) => p.id)).toEqual(['d', 'c', 'b', 'a'])
    expect(filterPosts(list, { sort: 'oldest' }).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('leaves the original list alone', () => {
    const before = list.map((p) => p.id)
    filterPosts(list, { sort: 'oldest' })
    expect(list.map((p) => p.id)).toEqual(before)
  })
})

describe('the filter on the list pages', () => {
  const titlesOnPage = async () => (await screen.findAllByRole('link')).filter((l) => l.className.includes('ff-note')).map((n) => n.querySelector('.ff-note__title').textContent)
  it('shows a search box, a sort, the tags and how many posts there are', async () => {
    open('/factory-floor/floor')
    expect(await screen.findByRole('search', { name: 'Filter posts' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue('newest')
    const tags = within(screen.getByRole('group', { name: 'Filter by tag' })).getAllByRole('button').map((b) => b.textContent.trim())
    expect(tags).toEqual(['design 2', 'nano 1', 'terminal 2'])
    expect(screen.queryByRole('button', { name: /test-import|factory-floor/ })).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 5 of 5 posts')
  })
  it('filters as you type, and says how many are showing', async () => {
    const user = userEvent.setup()
    open('/factory-floor/floor')
    await user.type(await screen.findByRole('searchbox', { name: 'Search' }), 'day')
    expect(await titlesOnPage()).toEqual(['Day Seven', 'Day Six', 'Day Five', 'Day One: Building From Scratch'])
    expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 5 posts')
  })
  it('filters by a tag button, and a second click switches it off', async () => {
    const user = userEvent.setup()
    open('/factory-floor/floor')
    const design = await screen.findByRole('button', { name: /^design/ })
    await user.click(design)
    expect(design).toHaveAttribute('aria-pressed', 'true')
    expect(await titlesOnPage()).toEqual(['Day Six', 'Day Five'])
    await user.click(design)
    expect(design).toHaveAttribute('aria-pressed', 'false')
    expect((await titlesOnPage()).length).toBe(5)
  })
  it('puts the oldest first when asked', async () => {
    const user = userEvent.setup()
    open('/factory-floor/floor')
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Sort' }), 'oldest')
    expect((await titlesOnPage())[0]).toBe('Day One: Building From Scratch')
    expect((await titlesOnPage()).at(-1)).toBe('Day Seven')
  })
  it('combines the search with a tag', async () => {
    const user = userEvent.setup()
    open('/factory-floor/floor')
    await user.click(await screen.findByRole('button', { name: /^terminal/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'six')
    expect(await titlesOnPage()).toEqual(['Day Six'])
  })
  it('remembers the filter in the page address, so a shared link or a reload keeps it', async () => {
    open('/factory-floor/floor?q=nano&sort=oldest')
    expect(await screen.findByRole('searchbox', { name: 'Search' })).toHaveValue('nano')
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue('oldest')
    expect(await titlesOnPage()).toEqual(['Meet Nano'])
  })
  it('says nothing matches, and Clear filters brings everything back', async () => {
    const user = userEvent.setup()
    open('/factory-floor/floor?q=zzz&tag=design')
    expect(await screen.findByText(/No posts match/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 5 posts')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect((await titlesOnPage()).length).toBe(5)
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })
  it('works the same way on the Blueprints page, with only its own posts and tags', async () => {
    const user = userEvent.setup()
    open('/factory-floor/blueprints')
    expect(await screen.findByRole('heading', { name: 'Factory Blueprints' })).toBeInTheDocument()
    const tags = within(screen.getByRole('group', { name: 'Filter by tag' })).getAllByRole('button').map((b) => b.textContent.trim())
    expect(tags).toEqual(['database 1'])
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 2 posts')
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'wix')
    expect(await titlesOnPage()).toEqual(['Blueprints #1: Why I Did Not Use Wix'])
  })
  it('shows no tag buttons when the posts have none, and no filter when there is nothing to filter', async () => {
    db.posts = db.posts.map((p) => ({ ...p, tags: [] }))
    open('/factory-floor/floor')
    expect(await screen.findByRole('search', { name: 'Filter posts' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Filter by tag' })).toBeNull()
    cleanupAll()
    db.posts = []
    open('/factory-floor/floor')
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument()
    expect(screen.queryByRole('search', { name: 'Filter posts' })).toBeNull()
  })
  it('colours the filtered notes from the start of the mix again', async () => {
    open('/factory-floor/floor?tag=design')
    await screen.findByRole('search', { name: 'Filter posts' })
    const notes = screen.getAllByRole('link').filter((l) => l.className.includes('ff-note'))
    expect(notes.map((n) => n.className.match(/ff-note--c(\d)/)[1])).toEqual(['0', '1'])
  })
})
function cleanupAll() { document.body.innerHTML = '' }
