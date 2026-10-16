import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [] }))
vi.mock('../src/factoryfloor/factoryApi', () => ({ fetchFactoryPosts: () => Promise.resolve(h.posts) }))
import SectionPage from '../src/factoryfloor/SectionPage'

const post = (n, extra = {}) => ({ id: `p${n}`, title: `Day ${n}: a story post`, created_at: `2026-10-${String(10 + n).padStart(2, '0')}T09:00:00Z`, tags: [], channel: 'factory-floor', published: true, pinned_in: null, ...extra })
const bp = (n, extra = {}) => post(n, { title: `Blueprints #${n}: a blueprint`, ...extra })
const page = async (kind, posts, at = '/factory-floor/floor') => {
  h.posts = posts
  const view = render(
    <MemoryRouter initialEntries={[at]}>
      <SectionPage kind={kind} />
    </MemoryRouter>
  )
  await screen.findByRole('search')
  return view
}
const titlesIn = (el) => within(el).queryAllByRole('link').map((l) => l.querySelector('.ff-note__title').textContent.replace('Pinned post: ', ''))
const side = (c) => c.querySelector('.ff-side')
const main = (c) => c.querySelector('.ff-main')

beforeEach(() => {
  h.posts = []
})

describe('section pages: the search and the pinned post in a right-hand column', () => {
  const story = [post(6), post(5), post(4), post(1, { pinned_in: 'story' })]
  it('puts the search first and the pinned post under it, in the side column', async () => {
    const { container } = await page('story', story)
    const kids = [...side(container).children]
    expect(kids[0].getAttribute('role')).toBe('search')
    expect(kids[1].className).toMatch(/ff-side__pinned/)
    expect(titlesIn(side(container))).toEqual(['Day 1: a story post'])
    expect(side(container).textContent).toMatch(/Start here/)
  })
  it('puts the other posts across the left, newest first, without the pinned one', async () => {
    const { container } = await page('story', story)
    expect(titlesIn(main(container))).toEqual(['Day 6: a story post', 'Day 5: a story post', 'Day 4: a story post'])
  })
  it('shows each post once', async () => {
    const { container } = await page('story', story)
    const all = [...titlesIn(side(container)), ...titlesIn(main(container))]
    expect(new Set(all).size).toBe(all.length)
    expect(all).toHaveLength(4)
  })
  it('reads in a sensible order: the search and pinned post come before the list', async () => {
    const { container } = await page('story', story)
    expect(side(container).compareDocumentPosition(main(container)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('counts only the posts on the left', async () => {
    await page('story', story)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 3 of 3 posts')
  })
  it('gives the pinned note the first colour and carries on with the next colours on the left', async () => {
    const { container } = await page('story', story)
    expect(side(container).querySelector('.ff-note').className).toMatch(/ff-note--c0/)
    expect(main(container).querySelector('.ff-note').className).toMatch(/ff-note--c1/)
  })
  it('works the same way for Blueprints', async () => {
    const { container } = await page('blueprint', [bp(11), bp(10), bp(1, { pinned_in: 'blueprint' })], '/factory-floor/blueprints')
    expect(titlesIn(side(container))).toEqual(['Blueprints #1: a blueprint'])
    expect(titlesIn(main(container))).toEqual(['Blueprints #11: a blueprint', 'Blueprints #10: a blueprint'])
  })
})

describe('section pages: searching and sorting', () => {
  const story = [post(6), post(5), post(4), post(1, { pinned_in: 'story' })]
  it('searches only the posts on the left, and the pinned post stays where it is', async () => {
    const user = userEvent.setup()
    const { container } = await page('story', story)
    await user.type(screen.getByRole('searchbox'), 'Day 5')
    expect(titlesIn(main(container))).toEqual(['Day 5: a story post'])
    expect(titlesIn(side(container))).toEqual(['Day 1: a story post'])
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 3 posts')
  })
  it('says nothing matches, and still shows the pinned post', async () => {
    const user = userEvent.setup()
    const { container } = await page('story', story)
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText(/No posts match/)).toBeInTheDocument()
    expect(titlesIn(side(container))).toEqual(['Day 1: a story post'])
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(titlesIn(main(container))).toHaveLength(3)
  })
  it('sorts oldest first on the left, and the pinned post does not move', async () => {
    const user = userEvent.setup()
    const { container } = await page('story', story)
    await user.selectOptions(screen.getByRole('combobox'), 'oldest')
    expect(titlesIn(main(container))).toEqual(['Day 4: a story post', 'Day 5: a story post', 'Day 6: a story post'])
    expect(titlesIn(side(container))).toEqual(['Day 1: a story post'])
  })
})

describe('section pages: when nothing is pinned, or only one post exists', () => {
  it('with nothing pinned, the column holds just the search, and the colours start at the first', async () => {
    const { container } = await page('story', [post(3), post(2), post(1)])
    expect(side(container).querySelector('.ff-side__pinned')).toBeNull()
    expect(titlesIn(main(container))).toEqual(['Day 3: a story post', 'Day 2: a story post', 'Day 1: a story post'])
    expect(main(container).querySelector('.ff-note').className).toMatch(/ff-note--c0/)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 3 of 3 posts')
  })
  it('with only the pinned post, there is no search and no "no match" message', async () => {
    h.posts = [post(1, { pinned_in: 'story' })]
    const { container } = render(<MemoryRouter initialEntries={['/factory-floor/floor']}><SectionPage kind="story" /></MemoryRouter>)
    await screen.findByText('Start here')
    expect(screen.queryByRole('search')).toBeNull()
    expect(screen.queryByText(/No posts match/)).toBeNull()
    expect(titlesIn(side(container))).toEqual(['Day 1: a story post'])
    expect(titlesIn(main(container))).toEqual([])
  })
  it('a post pinned in the wrong section is treated as an ordinary post', async () => {
    const { container } = await page('story', [post(3), post(2, { pinned_in: 'blueprint' })])
    expect(titlesIn(side(container))).toEqual([])
    expect(titlesIn(main(container))).toHaveLength(2)
  })
})

describe('section pages: the layout rules', () => {
  const css = readFileSync(join(process.cwd(), 'src/factoryfloor/factoryfloor.css'), 'utf8')
  it('is two columns on a wide screen, with the side column 300px and on the right', () => {
    expect(css).toMatch(/\.ff-split \{[^}]*grid-template-columns: minmax\(0, 1fr\) 300px/)
    expect(css).toMatch(/\.ff-side \{[^}]*grid-column: 2/)
    expect(css).toMatch(/\.ff-main \{[^}]*grid-column: 1/)
  })
  it('is one column on a tablet or phone, with the search and the pinned post first, then two notes across', () => {
    expect(css).toMatch(/@media \(max-width: 900px\) \{\s*\.ff-split \{\s*grid-template-columns: minmax\(0, 1fr\)/)
    expect(css).toMatch(/@media \(max-width: 720px\) \{\s*\.ff-split \.ff-latest--all \{\s*grid-template-columns: repeat\(2/)
  })
  it('makes the search box shorter: the fields stack and it has less padding', () => {
    expect(css).toMatch(/\.ff-side \.ff-filter__row \{[^}]*flex-direction: column/)
    expect(css).toMatch(/\.ff-side \.ff-filter \{[^}]*padding: 12px 16px 10px/)
  })
})
