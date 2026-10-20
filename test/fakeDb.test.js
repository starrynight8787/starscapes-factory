// @vitest-environment node
// The pretend database (test/fakeDb.js) keeps the same rules as the real one for what the tests ask of it. If these ever fail, the tests that use it are no longer telling the truth.
import { describe, it, expect } from 'vitest'
import { makeDb, seed, seedOriginals, seedRoomPosts, owner } from './fakeDb'

const fresh = () => { const db = makeDb(); seed(db); seedOriginals(db); seedRoomPosts(db); return db }
const ask = (db, table) => db.supabase.from(table)

describe('products: who can see and change what', () => {
  it('shows a visitor only the published ones, and the owner their own drafts too', async () => {
    const db = fresh()
    const visitor = (await ask(db, 'products').select('id')).data.map((p) => p.id)
    expect(visitor).not.toContain('o3'); expect(visitor).not.toContain('p5'); expect(visitor).toContain('o1')
    db.state.user = owner
    expect((await ask(db, 'products').select('id')).data.map((p) => p.id)).toEqual(expect.arrayContaining(['o3', 'p5']))
  })
  it('lets only the owner of a product change it (anyone else is quietly ignored)', async () => {
    const db = fresh()
    db.state.user = { id: 'a-customer' }
    await ask(db, 'products').update({ status: 'sold' }).eq('id', 'o1')
    expect(db.state.products.find((p) => p.id === 'o1').status).toBe('available')
    db.state.user = owner
    await ask(db, 'products').update({ status: 'sold' }).eq('id', 'o1')
    expect(db.state.products.find((p) => p.id === 'o1').status).toBe('sold')
  })
  it('refuses an insert by someone who is not the author, and gives back the new id for the owner', async () => {
    const db = fresh()
    const refused = await ask(db, 'products').insert({ title: 'X', author_id: owner.id }).select('id').single()
    expect(refused.error.message).toMatch(/row-level security/)
    db.state.user = owner
    const made = await ask(db, 'products').insert({ title: 'X', author_id: owner.id, fulfilment: 'hand' }).select('id').single()
    expect(made.error).toBeNull(); expect(made.data.id).toMatch(/^new-/)
  })
  it('deletes only what the filters and the ownership allow (a draft, not a switched-on piece)', async () => {
    const db = fresh(); db.state.user = owner
    await ask(db, 'products').delete().eq('id', 'o1').eq('published', false)
    expect(db.state.products.some((p) => p.id === 'o1')).toBe(true)
    await ask(db, 'products').delete().eq('id', 'o3').eq('published', false)
    expect(db.state.products.some((p) => p.id === 'o3')).toBe(false)
  })
  it('does not let anyone but the owner delete a draft', async () => {
    const db = fresh(); db.state.user = { id: 'a-customer' }
    await ask(db, 'products').delete().eq('id', 'o3').eq('published', false)
    expect(db.state.products.some((p) => p.id === 'o3')).toBe(true)
    db.state.user = null
    await ask(db, 'products').delete().eq('id', 'o3').eq('published', false)
    expect(db.state.products.some((p) => p.id === 'o3')).toBe(true)
  })
  it('says the database is missing the original-painting columns when told to, but not for the prints\u2019 own sizes and frames', async () => {
    const db = fresh(); db.state.noOriginalColumns = true
    expect((await ask(db, 'products').select('id, title, status')).error.message).toMatch(/does not exist/)
    expect((await ask(db, 'products').select('id, title, product_variants(id, size, framed, price)')).error).toBeNull()
  })
})

describe('the seeds', () => {
  it('give the prints and originals the tests rely on', () => {
    const db = fresh(); const byTitle = (t) => db.state.products.find((p) => p.title === t)
    expect(db.state.products.filter((p) => p.collection === 'Calm Series' && p.published && p.fulfilment === 'creativehub')).toHaveLength(2)
    expect(byTitle('Forests')).toBeTruthy(); expect(byTitle('Tops of Jupiter')).toBeTruthy()
    expect(byTitle('Rainforest')).toMatchObject({ id: 'o1', fulfilment: 'hand', status: 'available', published: true, price: 1200, collection: 'Calm Series' })
    expect(byTitle('Quilt')).toMatchObject({ id: 'o2', status: 'sold', published: true, collection: 'Unique One of a Kind' })
    expect(byTitle('Storm')).toMatchObject({ id: 'o3', published: false, images: [] })
    expect(db.state.products.filter((p) => p.fulfilment === 'creativehub').every((p) => p.status === undefined)).toBe(true)
    expect(db.state.variants.filter((v) => v.product_id === 'p1')).toHaveLength(8)
  })
})

describe('posts', () => {
  it('are filtered, ordered and counted as the room pages ask, and the asking is recorded', async () => {
    const db = fresh()
    const { data } = await ask(db, 'posts').select('id, title, image_url').eq('channel', 'idea-hatchery').eq('published', true).order('created_at', { ascending: false }).limit(2)
    expect(data.map((p) => p.id)).toEqual(['h-1', 'h-3']); expect(db.state.postSelects).toEqual(['id, title, image_url'])
  })
  it('can be made to fail', async () => {
    const db = fresh(); db.state.failPosts = true
    expect((await ask(db, 'posts').select('id')).error).toBeTruthy()
  })
})

describe('the storage bucket', () => {
  it('records uploads and removals, and gives public addresses in the folder of the bucket', async () => {
    const db = fresh(); const bucket = db.supabase.storage.from('post-images')
    expect((await bucket.upload('owner-1/originals/1-0.jpg', {}, { contentType: 'image/jpeg' })).error).toBeNull()
    expect(db.state.uploads).toHaveLength(1)
    expect(bucket.getPublicUrl('owner-1/originals/1-0.jpg').data.publicUrl).toBe('https://files.example/post-images/owner-1/originals/1-0.jpg')
    await bucket.remove(['owner-1/originals/1-0.jpg'])
    expect(db.state.uploads).toHaveLength(0); expect(db.state.removed).toEqual(['owner-1/originals/1-0.jpg'])
  })
  it('fails from the start, or after the first few, as the tests ask', async () => {
    const db = fresh(); const bucket = db.supabase.storage.from('post-images')
    db.state.failUpload = true
    expect((await bucket.upload('a', {}, {})).error).toBeTruthy()
    db.state.failUploadAfter = 1
    db.state.failUpload = false; await bucket.upload('a', {}, {}); db.state.failUpload = true
    expect((await bucket.upload('b', {}, {})).error).toBeTruthy(); expect(db.state.uploads).toHaveLength(1)
  })
})
