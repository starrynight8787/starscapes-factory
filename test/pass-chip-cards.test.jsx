// The "Blueprints pass" label on post cards (src/membership/PassChip.jsx), in every card that shows a post.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'

const idx = vi.hoisted(() => ({ map: new Map() }))
vi.mock('../src/membership/passIndex', () => ({ loadPassIndex: () => Promise.resolve(idx.map), resetPassIndex: () => {} }))

import PassChip from '../src/membership/PassChip'
import RoomEntry from '../src/rooms/RoomEntry'
import EntryCard from '../src/draftingdesk/EntryCard'
import PostNote from '../src/factoryfloor/PostNote'
import PostCard from '../src/components/PostCard'

const post = (id) => ({ id, title: `Post ${id}`, content: 'Some words.', created_at: '2026-10-12T10:00:00Z', image_url: null, tags: [], channel: 'factory-floor' })
const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)
beforeEach(() => { idx.map = new Map([['p1', { pass: 'blueprints', free: false }], ['p3', { pass: 'book-club', free: true }]]) })

describe('the label', () => {
  it('says which pass a locked post belongs to', async () => {
    inRouter(<PassChip postId="p1" />); expect(await screen.findByText('Blueprints pass')).toBeInTheDocument()
  })
  it('says "free to read" for one of the first three', async () => {
    inRouter(<PassChip postId="p3" />); expect(await screen.findByText('Book Club pass: free to read')).toBeInTheDocument()
  })
  it('shows nothing for an ordinary post, and nothing for a post it knows nothing about', async () => {
    const { container } = inRouter(<PassChip postId="p2" />)
    await Promise.resolve(); await Promise.resolve(); expect(container.textContent).toBe('')
  })
})

describe('every card that shows a post carries the label', () => {
  it('a room\u2019s entries', async () => { inRouter(<RoomEntry post={post('p1')} from="/room" />); expect(await screen.findByText('Blueprints pass')).toBeInTheDocument() })
  it('the Drafting Desk\u2019s entries', async () => { inRouter(<EntryCard post={post('p1')} from="/drafting-desk" />); expect(await screen.findByText('Blueprints pass')).toBeInTheDocument() })
  it('the Factory Floor\u2019s notes', async () => { inRouter(<PostNote post={post('p1')} index={0} />); expect(await screen.findByText('Blueprints pass')).toBeInTheDocument() })
  it('the three styles of the blog\u2019s card (gallery, featured and the ordinary one)', async () => {
    for (const variant of ['gallery', 'featured', 'feed']) {
      const { unmount } = inRouter(<PostCard post={post('p3')} variant={variant} />); expect(await screen.findByText('Book Club pass: free to read'), variant).toBeInTheDocument(); unmount()
    }
  })
  it('and none of them shows a label on an ordinary post', async () => {
    const { container } = inRouter(<><RoomEntry post={post('p2')} /><EntryCard post={post('p2')} /><PostNote post={post('p2')} /><PostCard post={post('p2')} /></>)
    await Promise.resolve(); await Promise.resolve(); expect(container.querySelector('.mb__passchip')).toBeNull()
  })
})

describe('the cards that are too big to draw here still have the label in their source', () => {
  const src = (f) => fs.readFileSync(path.resolve(f), 'utf8')
  it('the Home page\u2019s latest post, the entry pages\u2019 grid and the blog list', () => {
    for (const f of ['src/home/HomeSections.jsx', 'src/entries/EntryPage.jsx', 'src/pages/Home.jsx']) expect(src(f), f).toMatch(/<PassChip postId=\{(post|p)\.id\} \/>/)
  })
  it('saving a post makes the lookup start again, so the next list is right', () => {
    for (const f of ['src/pages/NewPost.jsx', 'src/pages/EditPost.jsx']) { expect(src(f), f).toMatch(/resetPassIndex\(\)/); expect(src(f), f).toMatch(/import \{ resetPassIndex \} from '\.\.\/membership\/passIndex'/) }
  })
})
