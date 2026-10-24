// A print is found by its readable address (slug) or by its long id, and every call still works when the database has no address column yet (sql/print-slugs.sql not run).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ calls: [], next: () => ({ data: null, error: null }) }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      const call = { table, select: null, eq: [] }
      h.calls.push(call)
      const b = { select: (c) => { call.select = c; return b }, eq: (k, v) => { call.eq.push([k, v]); return b }, order: () => b, maybeSingle: async () => h.next(call), then: (res, rej) => Promise.resolve(h.next(call)).then(res, rej) }
      return b
    },
  },
}))
import { fetchPrint, fetchPrints, isUuid } from '../src/artloft/artLoftApi'

const ID = 'eb8bc42c-ad85-463e-a61c-3673b033e7c0'
const PRINT = { id: ID, slug: 'behind-the-curtain', title: 'Behind the Curtain', product_variants: [{ id: 'b', position: 2 }, { id: 'a', position: 1 }] }
const missing = (what) => ({ data: null, error: { message: `column products.${what} does not exist` } })
beforeEach(() => { h.calls.length = 0; h.next = () => ({ data: PRINT, error: null }) })

describe('finding one print', () => {
  it('looks a readable address up in the slug column, and a long id in the id column (both only among Creative Hub prints)', async () => {
    const bySlug = await fetchPrint('behind-the-curtain'); expect(bySlug.slug).toBe('behind-the-curtain'); expect(h.calls[0].eq).toEqual([['slug', 'behind-the-curtain'], ['fulfilment', 'creativehub']]); expect(h.calls[0].select).toContain('slug')
    h.calls.length = 0; await fetchPrint(ID); expect(h.calls[0].eq).toEqual([['id', ID], ['fulfilment', 'creativehub']])
    expect(isUuid(ID)).toBe(true); expect(isUuid('behind-the-curtain')).toBe(false); expect(isUuid(undefined)).toBe(false); expect(isUuid(`${ID}x`)).toBe(false)
  })
  it('puts its sizes in order', async () => { expect((await fetchPrint('behind-the-curtain')).product_variants.map((v) => v.id)).toEqual(['a', 'b']) })
  it('still finds a print by its long id when the database has no address column yet (asks again without it)', async () => {
    h.next = (call) => (/\bslug\b/.test(call.select) ? missing('slug') : { data: { ...PRINT, slug: undefined }, error: null })
    const print = await fetchPrint(ID); expect(print.id).toBe(ID); expect(h.calls.length).toBe(2); expect(h.calls[1].select).not.toMatch(/\bslug\b/)
  })
  it('says "not found" (not an error) for a readable address when there is no address column to look in', async () => {
    h.next = () => missing('slug'); expect(await fetchPrint('behind-the-curtain')).toBeNull(); expect(h.calls.length).toBe(1)
  })
  it('still copes with the older missing picture column as before, and passes on any other problem', async () => {
    h.next = (call) => (/image_url/.test(call.select) ? missing('image_url') : { data: PRINT, error: null }); expect((await fetchPrint(ID)).id).toBe(ID)
    h.next = () => ({ data: null, error: { message: 'permission denied for table products' } }); await expect(fetchPrint(ID)).rejects.toMatchObject({ message: 'permission denied for table products' })
    h.next = () => ({ data: null, error: null }); expect(await fetchPrint('nothing-here')).toBeNull()
  })
})

describe('the list of prints', () => {
  it('asks for the address too, and falls back without it, then without the pictures, rather than showing an empty shop', async () => {
    h.next = () => ({ data: [{ id: '1' }], error: null }); expect(await fetchPrints()).toEqual([{ id: '1' }]); expect(h.calls[0].select).toMatch(/slug/)
    h.calls.length = 0; h.next = (call) => (/\bslug\b/.test(call.select) ? missing('slug') : { data: [{ id: '2' }], error: null }); expect(await fetchPrints({ withPictures: true })).toEqual([{ id: '2' }]); expect(h.calls.length).toBe(2)
    h.calls.length = 0; h.next = (call) => (/slug|image_url/.test(call.select) ? missing('slug') : { data: [{ id: '3' }], error: null }); expect(await fetchPrints({ withPictures: true })).toEqual([{ id: '3' }])
    h.next = () => ({ data: null, error: { message: 'boom' } }); await expect(fetchPrints()).rejects.toMatchObject({ message: 'boom' })
  })
})
