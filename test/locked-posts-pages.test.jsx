// Posts that belong to a pass: the single-post page's gate, the New post and Edit post forms, against a pretend database that behaves like yours (it only hands over a locked post's words when it is allowed to).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const state = vi.hoisted(() => ({ open: true, db: null }))
vi.mock('../src/data/membership', () => ({ MEMBERSHIP: { get open() { return state.open }, textWhileClosed: 'It is not open yet.' } }))
vi.mock('../src/supabaseClient', () => {
  const project = (row, cols) => {
    if (!row) return row
    if (!cols || cols.trim() === '*') return { ...row }
    const out = {}
    for (const c of cols.split(',').map((x) => x.trim())) if (c in row) out[c] = row[c]
    return out
  }
  function table(name) {
    const q = { op: 'select', cols: '', filters: [], payload: null, wantRow: false }
    const db = () => state.db
    const run = () => {
      const d = db()
      d.calls.push({ table: name, op: q.op, cols: q.cols, payload: q.payload, filters: q.filters.map((f) => f.join(':')) })
      const rows = d[name === 'posts' ? 'posts' : 'bodies']
      const match = (r) => q.filters.every(([kind, col, val]) => (kind === 'eq' ? r[col] === val : r[col] !== val))
      if (name === 'posts') {
        if (q.op === 'select') {
          if (d.noPassColumn && /\bpass\b/.test(q.cols)) return { data: null, error: { message: 'column posts.pass does not exist' } }
          if (d.noPinColumn && /pinned_in/.test(q.cols)) return { data: null, error: { message: 'column posts.pinned_in does not exist' } }
          const found = rows.filter(match).map((r) => project(r, q.cols))
          return { data: found, error: null, _found: found }
        }
        if (q.op === 'insert') {
          if (d.failPostInsert) return { data: null, error: { message: 'the post could not be saved' } }
          const row = { id: `new-${rows.length + 1}`, published: true, created_at: '2026-10-19T10:00:00Z', ...q.payload }
          rows.push(row)
          return { data: q.wantRow ? { id: row.id } : null, error: null }
        }
        if (q.op === 'update') {
          if (d.failPostUpdate) return { data: null, error: { message: 'the post could not be changed' } }
          for (const r of rows.filter(match)) Object.assign(r, q.payload)
          return { data: null, error: null }
        }
        if (q.op === 'delete') { d.posts = rows.filter((r) => !match(r)); return { data: null, error: null } }
      }
      // the protected table: the database only hands a row over if the pretend rule says so
      if (q.op === 'select') {
        if (d.bodiesError) return { data: null, error: { message: 'could not read' } }
        const found = rows.filter(match).filter((r) => d.canRead(r.post_id)).map((r) => project(r, q.cols))
        return { data: found, error: null, _found: found }
      }
      if (q.op === 'upsert') {
        if (d.failBodySave) return { data: null, error: { message: 'the words could not be kept' } }
        const at = rows.findIndex((r) => r.post_id === q.payload.post_id)
        if (at >= 0) rows[at] = { ...rows[at], ...q.payload }
        else rows.push({ ...q.payload })
        return { data: null, error: null }
      }
      if (q.op === 'delete') { d.bodies = rows.filter((r) => !match(r)); return { data: null, error: null } }
      return { data: null, error: null }
    }
    const api = {
      select(cols) { q.cols = cols; if (q.op === 'insert') q.wantRow = true; return api },
      eq(col, val) { q.filters.push(['eq', col, val]); return api },
      neq(col, val) { q.filters.push(['neq', col, val]); return api },
      limit() { return api },
      single() { const r = run(); return Promise.resolve(r.error ? { data: null, error: r.error } : q.op === 'insert' ? r : r._found.length ? { data: r._found[0], error: null } : { data: null, error: { message: 'no rows' } }) },
      maybeSingle() { const r = run(); return Promise.resolve(r.error ? { data: null, error: r.error } : { data: r._found.length ? r._found[0] : null, error: null }) },
      insert(payload) { q.op = 'insert'; q.payload = payload; return api },
      update(payload) { q.op = 'update'; q.payload = payload; return api },
      upsert(payload) { q.op = 'upsert'; q.payload = payload; return Promise.resolve(run()) },
      delete() { q.op = 'delete'; return api },
      then(res, rej) { const r = run(); return Promise.resolve(r.error ? { data: null, error: r.error } : { data: q.op === 'select' ? r.data : r.data, error: null }).then(res, rej) },
    }
    return api
  }
  return { supabase: { from: (name) => table(name), storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } } }
})

import PostPage from '../src/pages/PostPage'
import NewPost from '../src/pages/NewPost'
import EditPost from '../src/pages/EditPost'

const SESSION = { user: { id: 'gill', email: 'gillian@gillianbennet.com' } }
const post = (over = {}) => ({ id: 'p1', title: 'Blueprints #4: Why a thing', content: 'These are the free words.', image_url: null, created_at: '2026-10-19T10:00:00Z', author_id: 'gill', tags: [], channel: 'factory-floor', pass: null, pinned_in: null, published: true, ...over })
const fresh = (over = {}) => { state.db = { posts: [post()], bodies: [], calls: [], canRead: () => true, ...over }; return state.db }
const callsTo = (table, op) => state.db.calls.filter((c) => c.table === table && c.op === op)

const showPost = (session = null, id = 'p1') => render(<MemoryRouter initialEntries={[`/post/${id}`]}><Routes><Route path="/post/:id" element={<PostPage session={session} />} /></Routes></MemoryRouter>)
const showNew = () => render(<MemoryRouter initialEntries={['/new']}><Routes><Route path="/new" element={<NewPost session={SESSION} />} /><Route path="/" element={<p>the home page</p>} /></Routes></MemoryRouter>)
const showEdit = (id = 'p1') => render(<MemoryRouter initialEntries={[`/edit/${id}`]}><Routes><Route path="/edit/:id" element={<EditPost session={SESSION} />} /><Route path="/post/:id" element={<p>saved: the post page</p>} /></Routes></MemoryRouter>)

beforeEach(() => { state.open = true; fresh() })

describe('a post nobody has locked', () => {
  it('shows its words straight from the post, and never asks for the protected store', async () => {
    showPost(); expect(await screen.findByText('These are the free words.')).toBeInTheDocument(); expect(callsTo('post_bodies', 'select')).toHaveLength(0)
  })
  it('treats a pass it does not recognise as free', async () => {
    fresh({ posts: [post({ pass: 'made-up-pass' })] }); showPost(); expect(await screen.findByText('These are the free words.')).toBeInTheDocument(); expect(callsTo('post_bodies', 'select')).toHaveLength(0)
  })
  it('still works on a database that has not been given the pass column yet (every post is free)', async () => {
    fresh({ noPassColumn: true }); showPost(); expect(await screen.findByText('These are the free words.')).toBeInTheDocument()
  })
})

describe('a post that belongs to a pass', () => {
  const locked = (over = {}) => fresh({ posts: [post({ content: '', pass: 'blueprints' })], bodies: [{ post_id: 'p1', content: 'These are the WORDS only a pass holder should read.' }], ...over })
  it('shows the words to someone the database lets in (the owner, a pass holder, or one of the free three)', async () => {
    locked(); showPost(); expect(await screen.findByText('These are the WORDS only a pass holder should read.')).toBeInTheDocument(); expect(screen.queryByRole('region', { name: /part of the Blueprints pass/ })).toBeNull()
  })
  it('shows the gate, and NOT the words, to someone the database does not let in', async () => {
    locked({ canRead: () => false }); const { container } = showPost()
    expect(await screen.findByRole('heading', { level: 2, name: 'This is part of the Blueprints pass' })).toBeInTheDocument()
    expect(screen.getByText("The first three posts in every pass are free to read. This isn't one of them, so it opens with the Blueprints pass.")).toBeInTheDocument()
    expect(container.textContent).not.toContain('WORDS only a pass holder'); expect(screen.getByRole('heading', { level: 1, name: 'Blueprints #4: Why a thing' })).toBeInTheDocument()
  })
  it('shows NONE of the post\u2019s own text to someone who may not read it, even if some words were left in the post itself (defence in depth)', async () => {
    fresh({ posts: [post({ content: 'LEFTOVER words that were never moved.', pass: 'blueprints' })], bodies: [{ post_id: 'p1', content: 'Protected.' }], canRead: () => false })
    const { container } = showPost(); await screen.findByRole('heading', { level: 2, name: 'This is part of the Blueprints pass' })
    expect(container.textContent).not.toContain('LEFTOVER'); expect(container.querySelector('.pg-post__body')).toBeNull()
  })
  it('never has the words in the post itself, so the post can be read by anyone without giving them away', () => {
    locked(); expect(state.db.posts[0].content).toBe('')
  })
  it('tells a visitor who is not logged in to log in or choose passes', async () => {
    locked({ canRead: () => false }); showPost(null)
    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login'); expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership'); expect(screen.queryByRole('link', { name: 'My passes' })).toBeNull()
  })
  it('tells a logged-in person who does not hold the pass to choose passes or look at theirs', async () => {
    locked({ canRead: () => false }); showPost({ user: { id: 'someone-else' } })
    expect(await screen.findByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership'); expect(screen.getByRole('link', { name: 'My passes' })).toHaveAttribute('href', '/membership/passes'); expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
  })
  it('says passes are not open yet, with no links to buy, while memberships are closed', async () => {
    state.open = false; locked({ canRead: () => false }); showPost()
    expect(await screen.findByText(/Passes aren.t open yet\. When they are, it will open with the Blueprints pass\./)).toBeInTheDocument(); expect(screen.getByText("The first three posts in every pass are free to read. This isn't one of them.")).toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Choose your passes' })).toBeNull(); expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
  })
  it('does NOT call it locked when the words simply could not be fetched: it says so and tries to carry on', async () => {
    locked({ bodiesError: true }); showPost(); expect(await screen.findByText('We could not load this post just now. Please try again in a moment.')).toBeInTheDocument(); expect(screen.queryByText(/part of the Blueprints pass/)).toBeNull()
  })
  it('still gives the author the Edit and Delete buttons', async () => {
    locked(); showPost(SESSION); expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})

describe('the New post form', () => {
  const fill = async (title = 'My new post', words = 'Words for the post.') => { await userEvent.type(screen.getByLabelText('Title'), title); await userEvent.type(screen.getByLabelText('Post text'), words) }
  it('offers no Pass choice until the database has the pass column, and saves an ordinary post exactly as before', async () => {
    fresh({ noPassColumn: true, posts: [] }); showNew(); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(screen.queryByLabelText('Pass')).toBeNull()
    await screen.findByText('the home page')
    const made = callsTo('posts', 'insert')[0].payload
    expect(Object.keys(made).sort()).toEqual(['author_id', 'channel', 'content', 'image_url', 'published', 'tags', 'title']); expect(made.content).toBe('Words for the post.')
  })
  it('offers the Pass choice once it has the column: free for everyone, then the five passes', async () => {
    fresh({ posts: [] }); showNew()
    const select = await screen.findByLabelText('Pass')
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Free for everyone', "The Author's Notebook", 'Early drafts and book background', 'Come Write With Me', 'Blueprints', 'Book Club'])
    expect(select).toHaveValue('')
  })
  it('keeps an ordinary post ordinary when the choice is left on Free for everyone', async () => {
    fresh({ posts: [] }); showNew(); await screen.findByLabelText('Pass'); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Publish' })); await screen.findByText('the home page')
    expect(callsTo('posts', 'insert')[0].payload).not.toHaveProperty('pass'); expect(callsTo('post_bodies', 'upsert')).toHaveLength(0)
  })
  it('makes a post for a pass WITHOUT its words in the post, and keeps the words in the protected store', async () => {
    fresh({ posts: [] }); showNew(); await userEvent.selectOptions(await screen.findByLabelText('Pass'), 'blueprints'); await fill('A pass post', 'The secret words.')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' })); await screen.findByText('the home page')
    const made = callsTo('posts', 'insert')[0].payload
    expect(made).toMatchObject({ title: 'A pass post', content: '', pass: 'blueprints' }); expect(JSON.stringify(state.db.posts)).not.toContain('The secret words.')
    expect(callsTo('post_bodies', 'upsert')[0].payload).toMatchObject({ post_id: 'new-1', content: 'The secret words.' })
  })
  it('takes the empty post away again, and says what went wrong, if the words cannot be kept (so no empty locked post is left behind)', async () => {
    fresh({ posts: [], failBodySave: true }); showNew(); await userEvent.selectOptions(await screen.findByLabelText('Pass'), 'blueprints'); await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText('the words could not be kept')).toBeInTheDocument(); expect(state.db.posts).toHaveLength(0); expect(callsTo('posts', 'delete')).toHaveLength(1)
  })
  it('does not save any words if the post itself cannot be made', async () => {
    fresh({ posts: [], failPostInsert: true }); showNew(); await userEvent.selectOptions(await screen.findByLabelText('Pass'), 'blueprints'); await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Publish' })); expect(await screen.findByText('the post could not be saved')).toBeInTheDocument(); expect(callsTo('post_bodies', 'upsert')).toHaveLength(0)
  })
})

describe('the Edit post form', () => {
  const lockedPost = (over = {}) => fresh({ posts: [post({ content: '', pass: 'blueprints', channel: null })], bodies: [{ post_id: 'p1', content: 'The protected words.' }], ...over })
  const freePost = (over = {}) => fresh({ posts: [post({ channel: null })], ...over })
  const save = () => userEvent.click(screen.getByRole('button', { name: /^Save/ }))
  it('puts a locked post\u2019s protected words back into the editor, and shows its pass', async () => {
    lockedPost(); showEdit(); expect(await screen.findByLabelText('Post text')).toHaveValue('The protected words.'); expect(screen.getByLabelText('Pass')).toHaveValue('blueprints')
  })
  it('does NOT open an empty editor (which a save would turn into empty words) if the protected words cannot be fetched', async () => {
    lockedPost({ bodiesError: true }); showEdit()
    expect(await screen.findByText('We could not load the words of this post just now. Please try again in a moment.')).toBeInTheDocument(); expect(screen.queryByLabelText('Post text')).toBeNull()
  })
  it('opens an ordinary post with its own words, never asking for the protected store, and shows Free for everyone', async () => {
    freePost(); showEdit(); expect(await screen.findByLabelText('Post text')).toHaveValue('These are the free words.'); expect(screen.getByLabelText('Pass')).toHaveValue(''); expect(callsTo('post_bodies', 'select')).toHaveLength(0)
  })
  it('offers no Pass choice, and saves with no pass, on a database without the pass column', async () => {
    freePost({ noPassColumn: true }); showEdit(); await screen.findByLabelText('Post text'); expect(screen.queryByLabelText('Pass')).toBeNull()
    await save(); await screen.findByText('saved: the post page'); expect(callsTo('posts', 'update')[0].payload).not.toHaveProperty('pass')
  })
  it('moves the words into the protected store FIRST, then leaves the post with none, when a post is given a pass', async () => {
    freePost(); showEdit(); await userEvent.selectOptions(await screen.findByLabelText('Pass'), 'book-club'); await save(); await screen.findByText('saved: the post page')
    const order = state.db.calls.filter((c) => (c.table === 'post_bodies' && c.op === 'upsert') || (c.table === 'posts' && c.op === 'update')).map((c) => `${c.table}:${c.op}`)
    expect(order).toEqual(['post_bodies:upsert', 'posts:update'])
    expect(state.db.posts[0]).toMatchObject({ content: '', pass: 'book-club' }); expect(state.db.bodies[0]).toMatchObject({ post_id: 'p1', content: 'These are the free words.' })
  })
  it('does not touch the post if the words cannot be kept first (so they are never lost)', async () => {
    freePost({ failBodySave: true }); showEdit(); await userEvent.selectOptions(await screen.findByLabelText('Pass'), 'book-club'); await save()
    expect(await screen.findByText('the words could not be kept')).toBeInTheDocument(); expect(callsTo('posts', 'update')).toHaveLength(0); expect(state.db.posts[0].content).toBe('These are the free words.')
  })
  it('keeps a locked post locked with its words in the store when it is saved again', async () => {
    lockedPost(); showEdit(); const box = await screen.findByLabelText('Post text'); await userEvent.clear(box); await userEvent.type(box, 'Edited protected words.'); await save(); await screen.findByText('saved: the post page')
    expect(state.db.posts[0]).toMatchObject({ content: '', pass: 'blueprints' }); expect(state.db.bodies[0].content).toBe('Edited protected words.')
  })
  it('puts the words back in the post, and clears the pass, when a post is made free for everyone again, then tidies the protected copy away', async () => {
    lockedPost(); showEdit(); await userEvent.selectOptions(await screen.findByLabelText('Pass'), ''); await save(); await screen.findByText('saved: the post page')
    expect(state.db.posts[0]).toMatchObject({ content: 'The protected words.', pass: null }); expect(state.db.bodies).toHaveLength(0)
    const order = state.db.calls.filter((c) => (c.table === 'post_bodies' && c.op === 'delete') || (c.table === 'posts' && c.op === 'update')).map((c) => `${c.table}:${c.op}`)
    expect(order).toEqual(['posts:update', 'post_bodies:delete'])
  })
  it('does not leave the words only in the protected store if making the post free fails: the post is changed first', async () => {
    lockedPost({ failPostUpdate: true }); showEdit(); await userEvent.selectOptions(await screen.findByLabelText('Pass'), ''); await save()
    expect(await screen.findByText('the post could not be changed')).toBeInTheDocument(); expect(state.db.bodies).toHaveLength(1)
  })
})
