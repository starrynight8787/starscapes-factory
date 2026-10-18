import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ db: null }))
vi.mock('../src/supabaseClient', () => ({ supabase: { from: (t) => h.db.from(t), storage: {} } }))
import EditPost from '../src/pages/EditPost'

// A pretend posts table. It also behaves like the real unique index: two posts cannot be pinned in the same section.
function makeDb(posts, { noPinColumn = false } = {}) {
  const log = []
  const rows = posts.map((p) => ({ ...p }))
  const from = () => ({
    select: (cols) => build('select', null, cols),
    update: (payload) => build('update', payload),
  })
  function build(op, payload, cols) {
    const filters = []
    let wantOne = false
    const matches = () => rows.filter((r) => filters.every(([k, c, v]) => (k === 'eq' ? r[c] === v : r[c] !== v)))
    const run = () => {
      if (op === 'select') {
        if (noPinColumn && /pinned_in/.test(cols)) return { data: null, error: { message: 'column posts.pinned_in does not exist' } }
        const found = matches()
        return wantOne ? { data: found[0] || null, error: found[0] ? null : { message: 'not found' } } : { data: found.map((r) => ({ ...r })), error: null }
      }
      if (noPinColumn && 'pinned_in' in payload) return { data: null, error: { message: 'column "pinned_in" of relation "posts" does not exist' } }
      log.push({ ...payload })
      const targets = matches()
      const before = rows.map((r) => ({ ...r }))
      for (const r of targets) Object.assign(r, payload)
      const taken = rows.filter((r) => r.pinned_in).map((r) => r.pinned_in)
      if (new Set(taken).size !== taken.length) {
        rows.forEach((r, i) => Object.assign(r, before[i]))
        return { data: null, error: { message: 'duplicate key value violates unique constraint "posts_one_pinned_per_section"' } }
      }
      return { data: null, error: null }
    }
    const b = {
      eq: (c, v) => (filters.push(['eq', c, v]), b),
      neq: (c, v) => (filters.push(['neq', c, v]), b),
      limit: () => b,
      single: () => ((wantOne = true), b),
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    }
    return b
  }
  return { from, rows, log }
}

const me = { user: { id: 'gill' } }
const row = (id, extra = {}) => ({ id, title: `Post ${id}`, content: 'Words', image_url: null, author_id: 'gill', tags: [], channel: 'factory-floor', pinned_in: null, ...extra })
const DAY_ONE = row('day1', { title: 'Day One: Building Starscapes Factory From Scratch', pinned_in: 'story' })
const DAY_SIX = row('day6', { title: 'Day Six: Plugging My Website Into a Real Factory' })
const BP1 = row('bp1', { title: 'Blueprints #1: Why I Didn\u2019t Just Use Wix', pinned_in: 'blueprint' })
const BP4 = row('bp4', { title: 'Blueprints #4: Another One', tags: ['blueprints'] })
const DESK = row('desk1', { title: 'A desk post', channel: 'drafting-desk' })

async function open(id, posts, opts) {
  h.db = makeDb(posts, opts)
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[`/edit/${id}`]}>
      <Routes>
        <Route path="/edit/:id" element={<EditPost session={me} />} />
        <Route path="/post/:id" element={<p>The post page</p>} />
      </Routes>
    </MemoryRouter>
  )
  await screen.findByRole('heading', { name: 'Edit post' })
  return user
}
const sw = () => screen.queryByRole('switch', { name: /Pin this post to the top of its section/ })

beforeEach(() => {
  h.db = null
})

describe('the Pin this post switch: when it shows', () => {
  it('shows for a Factory Floor post, naming its section', async () => {
    await open('day6', [DAY_ONE, DAY_SIX])
    expect(sw()).toBeInTheDocument()
    expect(screen.getByText('The Factory Floor', { selector: 'strong' })).toBeInTheDocument()
  })
  it('names the Blueprints section for a Blueprint', async () => {
    await open('bp4', [BP1, BP4])
    expect(screen.getByText('Factory Blueprints', { selector: 'strong' })).toBeInTheDocument()
  })
  it('is off for a post that is not pinned, and on for the pinned one', async () => {
    await open('day6', [DAY_ONE, DAY_SIX])
    expect(sw()).not.toBeChecked()
  })
  it('is on for the post that holds the pin', async () => {
    await open('day1', [DAY_ONE, DAY_SIX])
    expect(sw()).toBeChecked()
  })
  it('does not show for a post in another room', async () => {
    await open('desk1', [DESK])
    expect(sw()).toBeNull()
  })
  it('appears when the room is changed to the Factory Floor, and goes when it is changed away', async () => {
    const user = await open('desk1', [DESK])
    await user.selectOptions(screen.getByRole('combobox'), 'factory-floor')
    expect(sw()).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox'), 'drafting-desk')
    expect(sw()).toBeNull()
  })
  it('follows the title and tags: a post that becomes a Blueprint changes section', async () => {
    const user = await open('day6', [DAY_ONE, DAY_SIX])
    await user.type(screen.getByPlaceholderText(/Tags/), 'blueprints')
    expect(screen.getByText('Factory Blueprints', { selector: 'strong' })).toBeInTheDocument()
  })
})

describe('the Pin this post switch: the warning', () => {
  it('says which post will be unpinned, when the switch is turned on', async () => {
    const user = await open('day6', [DAY_ONE, DAY_SIX])
    expect(screen.queryByRole('status')).toBeNull()
    await user.click(sw())
    const note = await screen.findByRole('status')
    expect(note.textContent).toMatch(/already has a pinned post/)
    expect(note.textContent).toMatch(/Day One: Building Starscapes Factory From Scratch/)
    expect(note.textContent).toMatch(/will unpin that one/)
  })
  it('says nothing when no other post is pinned in that section', async () => {
    const user = await open('bp4', [DAY_ONE, row('bp4', { title: 'Blueprints #4: Another One', tags: ['blueprints'] })])
    await user.click(sw())
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('does not warn about the post itself', async () => {
    await open('day1', [DAY_ONE, DAY_SIX])
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the Pin this post switch: saving', () => {
  it('pins this post and unpins the old one, in that order, so the one-per-section rule is never broken', async () => {
    const user = await open('day6', [DAY_ONE, DAY_SIX])
    await user.click(sw())
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText('The post page')
    expect(h.db.log[0]).toEqual({ pinned_in: null })
    expect(h.db.log[1]).toMatchObject({ pinned_in: 'story', title: DAY_SIX.title })
    expect(h.db.rows.find((r) => r.id === 'day1').pinned_in).toBeNull()
    expect(h.db.rows.find((r) => r.id === 'day6').pinned_in).toBe('story')
  })
  it('unpins when the switch is turned off', async () => {
    const user = await open('day1', [DAY_ONE, DAY_SIX])
    await user.click(sw())
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText('The post page')
    expect(h.db.rows.find((r) => r.id === 'day1').pinned_in).toBeNull()
    expect(h.db.rows.filter((r) => r.pinned_in)).toHaveLength(0)
  })
  it('leaves the pin alone when other things are edited', async () => {
    const user = await open('day1', [DAY_ONE, DAY_SIX])
    await user.type(screen.getByPlaceholderText('Title'), '!')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText('The post page')
    expect(h.db.rows.find((r) => r.id === 'day1')).toMatchObject({ pinned_in: 'story', title: DAY_ONE.title + '!' })
  })
  it('a Blueprint takes the Blueprints pin without touching the story pin', async () => {
    const user = await open('bp4', [DAY_ONE, BP1, BP4])
    await user.click(sw())
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText('The post page')
    expect(h.db.rows.find((r) => r.id === 'bp4').pinned_in).toBe('blueprint')
    expect(h.db.rows.find((r) => r.id === 'bp1').pinned_in).toBeNull()
    expect(h.db.rows.find((r) => r.id === 'day1').pinned_in).toBe('story')
  })
  it('moving a post to another room releases its pin, so it cannot hold a section pin from elsewhere', async () => {
    const user = await open('day1', [DAY_ONE, DAY_SIX])
    await user.selectOptions(screen.getByRole('combobox'), 'drafting-desk')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText('The post page')
    expect(h.db.rows.find((r) => r.id === 'day1')).toMatchObject({ pinned_in: null, channel: 'drafting-desk' })
  })
  it('shows the error and keeps the form if saving fails', async () => {
    const user = await open('day6', [DAY_ONE, DAY_SIX])
    h.db.from = () => ({ select: () => ({ eq: () => ({ neq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }), update: () => ({ eq: () => ({ neq: () => Promise.resolve({ error: { message: 'could not save' } }) }) }) })
    await user.click(sw())
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('could not save')).toBeInTheDocument()
  })
})

describe('the edit page before the database has the new column', () => {
  it('still opens and saves, with no switch and nothing about pinning in the save', async () => {
    const user = await open('day6', [DAY_ONE, DAY_SIX], { noPinColumn: true })
    expect(sw()).toBeNull()
    await user.type(screen.getByPlaceholderText('Title'), '!')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText('The post page')
    expect(h.db.log).toHaveLength(1)
    expect(h.db.log[0]).not.toHaveProperty('pinned_in')
    expect(h.db.rows.find((r) => r.id === 'day6').title).toBe(DAY_SIX.title + '!')
  })
})

describe('the edit page keeps its old rules', () => {
  it('only lets you edit your own posts', async () => {
    h.db = makeDb([row('theirs', { author_id: 'someone-else' })])
    render(<MemoryRouter initialEntries={['/edit/theirs']}><Routes><Route path="/edit/:id" element={<EditPost session={me} />} /></Routes></MemoryRouter>)
    expect(await screen.findByText('You can only edit your own posts.')).toBeInTheDocument()
  })
})

describe('the switch styling', () => {
  const css = readFileSync(join(process.cwd(), 'src/pages/pinswitch.css'), 'utf8')
  it('overrides the old full-width input rule and keeps a visible keyboard focus', () => {
    expect(css).toMatch(/\.pin-box \.pin-switch input\[type='checkbox'\] \{[^}]*width: 46px/)
    expect(css).toMatch(/input:focus-visible \+ \.pin-switch__track \{[^}]*outline: 3px solid/)
  })
  it('has no text under 14px, and calms its motion on request', () => {
    const px = [...css.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]))
    expect(Math.min(...px)).toBeGreaterThanOrEqual(14)
    expect(css).toMatch(/prefers-reduced-motion: reduce/)
  })
})

describe('the live page file', () => {
  const src = readFileSync(join(process.cwd(), 'src/pages/EditPost.jsx'), 'utf8')
  it('asks for pinned_in with a fallback, and only saves it when the column exists', () => {
    expect(src).toMatch(/\/pinned_in\/i\.test/)
    expect(src).toMatch(/if \(canPin\)/)
  })
})

describe('the edit page\u2019s own form (labels, plain-words problems, Cancel)', () => {
  it('has a visible label on every field, as well as the placeholder text', async () => {
    await open('day6', [DAY_SIX])
    for (const label of ['Title', 'Post text', 'Tags', 'Room']) expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByLabelText(/New header picture \(optional, up to 6 MB\)/)).toBeInTheDocument()
  })
  it('does not save a post with no title, and says so in words with a link to the field', async () => {
    const user = await open('day6', [DAY_SIX])
    await user.clear(screen.getByLabelText('Title'))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Write a title for the post.')
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(h.db.log).toEqual([])
  })
  it('does not save a post with no words in it', async () => {
    const user = await open('day6', [DAY_SIX])
    await user.clear(screen.getByLabelText('Post text'))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Write the post itself.')
    expect(h.db.log).toEqual([])
  })
  it('refuses a header picture over 6 MB, and says so', async () => {
    const user = await open('day6', [DAY_SIX])
    const big = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 7 * 1024 * 1024 })
    await user.upload(screen.getByLabelText(/New header picture/), big)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That picture is over 6 MB. Choose a smaller one.')
    expect(h.db.log).toEqual([])
  })
  it('goes back to the post, without saving, when Cancel is pressed', async () => {
    const user = await open('day6', [DAY_SIX])
    await user.type(screen.getByLabelText('Title'), ' CHANGED')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('The post page')).toBeInTheDocument()
    expect(h.db.log).toEqual([])
  })
})
