// Saving a post as a draft, publishing it, and taking it down again (SFW-251), and the empty cart with its banner.
// Before this the New post page always published, nothing could unpublish a post, and an empty cart had no banner.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ posts: [], inserts: [], updates: [], mode: 'ok', owner: true, canPass: false, confirm: true, resets: 0 }))
vi.mock('../src/supabaseClient', () => {
  const chain = (rows, one) => {
    const b = { eq: (c, v) => chain(rows.filter((r) => r[c] === v), one), neq: () => b, order: () => b, limit: () => b, single: () => chain(rows, 'single'), maybeSingle: () => chain(rows, 'single'),
      then: (res, rej) => Promise.resolve(one ? { data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } } : { data: rows, error: null }).then(res, rej) }
    return b
  }
  const posts = {
    select: () => chain(h.posts),
    insert: (row) => { h.inserts.push(row); const r = { data: { id: 'new-1' }, error: null }; const b = { select: () => ({ single: () => Promise.resolve(r) }), then: (res, rej) => Promise.resolve({ error: null }).then(res, rej) }; return b },
    update: (payload) => ({
      eq: (c, v) => {
        const run = () => {
          h.updates.push({ payload: { ...payload }, where: [c, v] })
          if (h.mode === 'throws') throw new Error('network down: srv-secret-key')
          if (h.mode === 'database-error') return { data: null, error: { message: 'permission denied for table posts (srv-secret-key)' } }
          if (h.mode === 'nobody') return { data: [], error: null } // the database refused quietly: no row changed
          const hit = h.posts.filter((r) => r[c] === v); hit.forEach((r) => Object.assign(r, payload)); return { data: hit.map((r) => ({ id: r.id })), error: null }
        }
        return { select: () => Promise.resolve().then(run), then: (res, rej) => Promise.resolve().then(run).then(res, rej) }
      },
    }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }
  return { supabase: { from: () => posts, rpc: async () => ({ error: null }), storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } } }
})
vi.mock('../src/membership/lockedPosts', async (original) => ({ ...(await original()), canUsePasses: async () => h.canPass, saveLockedBody: async () => {}, loadLockedBody: async () => null, removeLockedBody: async () => {} }))
vi.mock('../src/membership/passIndex', async (original) => ({ ...(await original()), resetPassIndex: () => { h.resets += 1 } }))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
vi.mock('../src/admin/postsAdminApi', () => ({ fetchAllPosts: vi.fn(async () => h.posts.map((p) => ({ ...p }))) }))
vi.mock('../src/cart/checkout', () => ({ startCheckout: vi.fn(), checkoutStatus: async () => ({ open: false, can_test: false }) }))

import { setPublished, isPublished, WORDS } from '../src/pages/postPublish'
import NewPost from '../src/pages/NewPost'
import EditPost from '../src/pages/EditPost'
import PostPage from '../src/pages/PostPage'
import AdminPosts from '../src/admin/AdminPosts'
import CartPage from '../src/cart/CartPage'
import { PASS_CHOICES } from '../src/membership/lockedPosts'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const me = { user: { id: 'gill' } }
const row = (id, extra = {}) => ({ id, title: `Post ${id}`, content: 'Words of the post', image_url: null, author_id: 'gill', tags: [], channel: 'drafting-desk', created_at: '2026-10-05T10:00:00Z', published: true, pass: null, ...extra })
beforeEach(() => {
  Object.assign(h, { posts: [row('live'), row('draft', { published: false }), row('older', { published: undefined })], inserts: [], updates: [], mode: 'ok', owner: true, canPass: false, confirm: true, resets: 0 })
  vi.spyOn(window, 'confirm').mockImplementation(() => h.confirm)
})

describe('setPublished: the one change the buttons make', () => {
  it('changes only the published choice of only that post, and says what it is now', async () => {
    expect(await setPublished('live', false)).toBe(false); expect(h.updates).toEqual([{ payload: { published: false }, where: ['id', 'live'] }])
    expect(h.posts.find((p) => p.id === 'live').published).toBe(false); expect(h.posts.find((p) => p.id === 'older').published).toBeUndefined()
    expect(await setPublished('draft', true)).toBe(true); expect(h.updates[1].payload).toEqual({ published: true })
  })
  it('counts a change of no rows as a failure, never as done: the database refuses quietly when the account is not the author', async () => {
    h.mode = 'nobody'; await expect(setPublished('live', false)).rejects.toThrow(WORDS.notChanged); expect(h.resets).toBe(0)
  })
  it('says a problem in plain words, with none of the database\u2019s words or keys, whether it answers badly or the network fails', async () => {
    for (const mode of ['database-error', 'throws']) { h.mode = mode; const e = await setPublished('live', false).catch((x) => x); expect(e.message, mode).toBe(WORDS.failed); expect(e.message).not.toMatch(/permission|srv-secret|network|posts/i) }
  })
  it('lets the pass lists know a post changed, only when it really did', async () => {
    await setPublished('live', false); expect(h.resets).toBe(1)
  })
  it('counts a post with no choice recorded as published, so nothing is taken down by a guess', () => {
    expect(isPublished({})).toBe(true); expect(isPublished({ published: undefined })).toBe(true); expect(isPublished({ published: true })).toBe(true); expect(isPublished({ published: false })).toBe(false)
  })
})

describe('New post: Publish, or Save as draft', () => {
  const open = () => render(<MemoryRouter initialEntries={['/new']}><Routes><Route path="/new" element={<NewPost session={me} />} /><Route path="/" element={<p>the home page</p>} /><Route path="/admin/posts" element={<p>the all posts page</p>} /><Route path="/admin" element={<p>the admin page</p>} /></Routes></MemoryRouter>)
  const fill = async (user) => { await user.type(screen.getByLabelText('Title'), 'A new thought'); await user.type(screen.getByLabelText('Post text'), 'Some words to keep') }
  it('has both buttons, and says in its line that a draft can be saved to finish later', () => {
    open(); expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled(); expect(screen.getByRole('button', { name: 'Save as draft' })).toBeEnabled(); expect(screen.getByText(/save it as a draft to finish later/)).toBeInTheDocument()
  })
  it('Publish makes a post visitors can read, and goes to the home page as it always did', async () => {
    const user = userEvent.setup(); open(); await fill(user); await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText('the home page')).toBeInTheDocument(); expect(h.inserts).toHaveLength(1); expect(h.inserts[0]).toMatchObject({ title: 'A new thought', content: 'Some words to keep', published: true, author_id: 'gill' })
  })
  it('Save as draft keeps the post hidden from visitors (published off), and goes to All posts where it shows as not published', async () => {
    const user = userEvent.setup(); open(); await fill(user); await user.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(await screen.findByText('the all posts page')).toBeInTheDocument(); expect(h.inserts).toHaveLength(1); expect(h.inserts[0]).toMatchObject({ title: 'A new thought', content: 'Some words to keep', published: false, author_id: 'gill' })
  })
  it('keeps a draft hidden when it is for a pass too (the other way a post is saved)', async () => {
    h.canPass = true; const user = userEvent.setup(); open(); await fill(user); await user.selectOptions(await screen.findByLabelText(/^Pass/), PASS_CHOICES[0].id); await user.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(await screen.findByText('the all posts page')).toBeInTheDocument(); expect(h.inserts[0]).toMatchObject({ published: false, pass: PASS_CHOICES[0].id })
  })
  it('asks for the same things before saving a draft as before publishing: nothing is saved without a title and words', async () => {
    const user = userEvent.setup(); open(); await user.click(screen.getByRole('button', { name: 'Save as draft' })); expect(h.inserts).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Publish' })); expect(h.inserts).toHaveLength(0); expect(screen.queryByText('the all posts page')).toBeNull()
  })
  it('cannot be pressed twice while it saves, and the button that was pressed says what it is doing', async () => {
    const user = userEvent.setup(); open(); await fill(user); await user.click(screen.getByRole('button', { name: 'Save as draft' }))
    await waitFor(() => expect(h.inserts).toHaveLength(1)); await screen.findByText('the all posts page'); expect(h.inserts).toHaveLength(1)
  })
})

describe('Edit post: the Published switch', () => {
  const open = (id) => render(<MemoryRouter initialEntries={[`/edit/${id}`]}><Routes><Route path="/edit/:id" element={<EditPost session={me} />} /><Route path="/post/:id" element={<p>the post page</p>} /></Routes></MemoryRouter>)
  const sw = () => screen.getByRole('switch', { name: /Published/ })
  it('is on for a published post and says visitors can read it; off for a draft and says only you can see it', async () => {
    open('live'); await screen.findByLabelText('Title'); expect(sw()).toBeChecked(); expect(screen.getByText(WORDS.switchOn)).toBeInTheDocument()
  })
  it('is off for a draft', async () => {
    open('draft'); await screen.findByLabelText('Title'); expect(sw()).not.toBeChecked(); expect(screen.getByText(WORDS.switchOff)).toBeInTheDocument()
  })
  it('is on for an older post that has no choice recorded, so opening and saving never takes it down', async () => {
    const user = userEvent.setup(); open('older'); await screen.findByLabelText('Title'); expect(sw()).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByText('the post page'); expect(h.updates[0].payload).not.toHaveProperty('published')
  })
  it('turning it off and saving takes the post down (published off); turning it on again publishes a draft', async () => {
    const user = userEvent.setup(); open('live'); await screen.findByLabelText('Title'); await user.click(sw()); expect(screen.getByText(WORDS.switchOff)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByText('the post page'); expect(h.updates[0].payload.published).toBe(false); expect(h.updates[0].where).toEqual(['id', 'live'])
  })
  it('publishes a draft when switched on and saved', async () => {
    const user = userEvent.setup(); open('draft'); await screen.findByLabelText('Title'); await user.click(sw()); await user.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByText('the post page'); expect(h.updates[0].payload.published).toBe(true)
  })
  it('saves the choice only when it was changed: editing a published post, or a draft, leaves the choice alone', async () => {
    for (const id of ['live', 'draft']) { h.updates.length = 0; const user = userEvent.setup(); const { unmount } = open(id); await screen.findByLabelText('Title'); await user.type(screen.getByLabelText('Post text'), ' more'); await user.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByText('the post page'); expect(h.updates[0].payload, id).not.toHaveProperty('published'); unmount() }
  })
})

describe('the post page: Publish and Unpublish for its author', () => {
  const open = (id, session = me) => render(<MemoryRouter initialEntries={[`/post/${id}`]}><Routes><Route path="/post/:id" element={<PostPage session={session} />} /></Routes></MemoryRouter>)
  it('offers Unpublish on a published post, and asks first because visitors will stop seeing it', async () => {
    const user = userEvent.setup(); h.confirm = false; open('live'); await user.click(await screen.findByRole('button', { name: 'Unpublish' }))
    expect(window.confirm).toHaveBeenCalledWith(WORDS.askUnpublish); expect(h.updates).toHaveLength(0); expect(screen.queryByText(WORDS.draftNote)).toBeNull()
  })
  it('takes the post down when the author says yes: it becomes a draft, says so, and offers Publish', async () => {
    const user = userEvent.setup(); open('live'); await user.click(await screen.findByRole('button', { name: 'Unpublish' }))
    expect(await screen.findByText(WORDS.nowDraft)).toBeInTheDocument(); expect(h.updates).toEqual([{ payload: { published: false }, where: ['id', 'live'] }]); expect(screen.getByText(WORDS.draftNote)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
  })
  it('shows a draft its author, with a note that only they can see it, and Publish (which does not ask: nothing is lost by publishing)', async () => {
    const user = userEvent.setup(); open('draft'); expect(await screen.findByText(WORDS.draftNote)).toBeInTheDocument(); await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText(WORDS.nowPublished)).toBeInTheDocument(); expect(window.confirm).not.toHaveBeenCalled(); expect(h.updates[0].payload).toEqual({ published: true }); expect(screen.queryByText(WORDS.draftNote)).toBeNull()
  })
  it('treats an older post with no choice recorded as published', async () => {
    open('older'); expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeInTheDocument(); expect(screen.queryByText(WORDS.draftNote)).toBeNull()
  })
  it('says so, as an alert, when nothing changed, and keeps showing the post as it was', async () => {
    const user = userEvent.setup(); h.mode = 'nobody'; open('live'); await user.click(await screen.findByRole('button', { name: 'Unpublish' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(WORDS.notChanged); expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument(); expect(screen.queryByText(WORDS.draftNote)).toBeNull()
  })
  it('says a failure in plain words, with none of the database\u2019s', async () => {
    const user = userEvent.setup(); h.mode = 'database-error'; open('live'); await user.click(await screen.findByRole('button', { name: 'Unpublish' }))
    const alert = await screen.findByRole('alert'); expect(alert).toHaveTextContent(WORDS.failed); expect(alert.textContent).not.toMatch(/permission|srv-secret/)
  })
  it('shows none of it to anyone but the author: no buttons, no draft note', async () => {
    open('draft', { user: { id: 'someone-else' } }); await screen.findByText('Post draft'); expect(screen.queryByRole('button', { name: /Publish|Unpublish/ })).toBeNull(); expect(screen.queryByText(WORDS.draftNote)).toBeNull()
    open('live', null); await screen.findAllByText('Post live'); expect(screen.queryByRole('button', { name: 'Unpublish' })).toBeNull()
  })
})

describe('All posts: Publish and Unpublish on each row', () => {
  const page = () => render(<MemoryRouter><AdminPosts session={me} /></MemoryRouter>)
  const rowOf = (title) => screen.getByRole('link', { name: title }).closest('li')
  it('offers Unpublish on a published post and Publish on a draft, named after the post', async () => {
    page(); await screen.findByText('Post live'); expect(within(rowOf('Post live')).getByRole('button', { name: 'Unpublish Post live' })).toBeInTheDocument(); expect(within(rowOf('Post draft')).getByRole('button', { name: 'Publish Post draft' })).toBeInTheDocument()
  })
  it('takes a post down only after asking, then marks it Not published and says so, leaving every other post alone', async () => {
    const user = userEvent.setup(); h.confirm = false; page(); await screen.findByText('Post live'); await user.click(screen.getByRole('button', { name: 'Unpublish Post live' }))
    expect(h.updates).toHaveLength(0); h.confirm = true; await user.click(screen.getByRole('button', { name: 'Unpublish Post live' }))
    expect(await screen.findByText(`Post live: ${WORDS.nowDraft}`)).toBeInTheDocument(); expect(within(rowOf('Post live')).getByText('Not published')).toBeInTheDocument(); expect(h.updates).toEqual([{ payload: { published: false }, where: ['id', 'live'] }])
    expect(within(rowOf('Post draft')).getByText('Not published')).toBeInTheDocument(); expect(within(rowOf('Post draft')).getByRole('button', { name: 'Publish Post draft' })).toBeInTheDocument(); expect(within(rowOf('Post live')).getByRole('button', { name: 'Publish Post live' })).toBeInTheDocument()
  })
  it('publishes a draft without asking, and takes its Not published mark away', async () => {
    const user = userEvent.setup(); page(); await screen.findByText('Post draft'); await user.click(screen.getByRole('button', { name: 'Publish Post draft' }))
    expect(await screen.findByText(`Post draft: ${WORDS.nowPublished}`)).toBeInTheDocument(); expect(window.confirm).not.toHaveBeenCalled(); expect(within(rowOf('Post draft')).queryByText('Not published')).toBeNull()
  })
  it('says when nothing changed, and leaves the row as it was (it never shows a change that did not happen)', async () => {
    const user = userEvent.setup(); h.mode = 'nobody'; page(); await screen.findByText('Post live'); await user.click(screen.getByRole('button', { name: 'Unpublish Post live' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(`Post live: ${WORDS.notChanged}`); expect(within(rowOf('Post live')).queryByText('Not published')).toBeNull()
  })
  it('says a failure in plain words, with none of the database\u2019s', async () => {
    const user = userEvent.setup(); h.mode = 'database-error'; page(); await screen.findByText('Post live'); await user.click(screen.getByRole('button', { name: 'Unpublish Post live' }))
    const alert = await screen.findByRole('alert'); expect(alert).toHaveTextContent(WORDS.failed); expect(alert.textContent).not.toMatch(/permission|srv-secret/)
  })
})

describe('the empty cart', () => {
  const open = () => render(<MemoryRouter initialEntries={['/cart']}><Routes><Route path="/cart" element={<CartPage />} /></Routes></MemoryRouter>)
  it('has the new banner: the Factory Floor\u2019s starry banner with its own heading, like the full cart', async () => {
    const { container } = open(); const banner = container.querySelector('header.pb'); expect(banner).toBeTruthy(); expect(banner.className).toMatch(/pb--starry/); expect(banner.className).toMatch(/pb--room-factory-floor/)
    expect(screen.getByRole('heading', { level: 1, name: 'Nothing here yet' })).toBeInTheDocument(); expect(within(banner).getByText('Your cart')).toBeInTheDocument(); expect(container.querySelector('main.cart--v2')).toBeTruthy()
  })
  it('still says the cart is empty, in the new card, with both ways to carry on', () => {
    const { container } = open(); const card = container.querySelector('.cart-card--empty'); expect(card).toBeTruthy()
    expect(within(card).getByText('Your cart is empty.')).toBeInTheDocument(); expect(within(card).getByRole('link', { name: 'Browse the Art Loft' })).toHaveAttribute('href', '/art-loft'); expect(within(card).getByRole('link', { name: 'See all digital prints' })).toHaveAttribute('href', '/art-loft/prints')
  })
  it('has exactly one heading level 1, and the card is styled', () => {
    const { container } = open(); expect(container.querySelectorAll('h1')).toHaveLength(1); expect(read('src/cart/cart.css')).toMatch(/\.cart-card--empty \{[^}]*max-width/)
  })
})
