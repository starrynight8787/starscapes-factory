// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({ rows: [], error: null, upserts: [], upsertError: null, table: null }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      db.table = table
      return {
        select: async () => ({ data: db.error ? null : db.rows, error: db.error }),
        upsert: async (row, options) => { db.upserts.push({ row, options }); return { error: db.upsertError } },
      }
    },
  },
}))
import { fetchDoors, saveDoor } from '../src/doors/doorsApi'

beforeEach(() => { db.rows = []; db.error = null; db.upserts = []; db.upsertError = null; db.table = null })

describe('reading the doors', () => {
  it('asks the doors table, and gives back only the doors that are open', async () => {
    db.rows = [{ room: 'sarah-jrs-den', door: 'blog', open: true }, { room: 'sarah-jrs-den', door: 'books', open: false }, { room: 'knowledge-nook', door: 'book-to-screen', open: true }]
    expect(await fetchDoors()).toEqual({ 'sarah-jrs-den/blog': true, 'knowledge-nook/book-to-screen': true })
    expect(db.table).toBe('doors')
  })
  it('counts only a plain true as open, so a stray value never opens a door', async () => {
    db.rows = [{ room: 'a', door: 'b', open: 'true' }, { room: 'a', door: 'c', open: 1 }, { room: 'a', door: 'd', open: null }, null]
    expect(await fetchDoors()).toEqual({})
  })
  it('gives nothing open when there are no rows, or the answer is not a list', async () => {
    expect(await fetchDoors()).toEqual({})
    db.rows = null
    expect(await fetchDoors()).toEqual({})
  })
  it('fails, rather than guessing, when the database says no', async () => {
    db.error = { message: 'relation "doors" does not exist' }
    await expect(fetchDoors()).rejects.toThrow('relation "doors" does not exist')
  })
})

describe('opening and closing a door', () => {
  it('saves one door by its room and its name, replacing any earlier answer for it', async () => {
    await saveDoor('sarah-jrs-den', 'blog', true)
    expect(db.upserts).toHaveLength(1)
    expect(db.upserts[0].row).toMatchObject({ room: 'sarah-jrs-den', door: 'blog', open: true })
    expect(db.upserts[0].options).toEqual({ onConflict: 'room,door' })
    expect(new Date(db.upserts[0].row.updated_at).toString()).not.toBe('Invalid Date')
  })
  it('saves a plain yes or no, whatever it is given', async () => {
    await saveDoor('a', 'b', 'yes')
    await saveDoor('a', 'b', 0)
    expect(db.upserts.map((u) => u.row.open)).toEqual([true, false])
  })
  it('fails with the database\u2019s words when it is not allowed, as it is for anyone but the owner', async () => {
    db.upsertError = { message: 'new row violates row-level security policy for table "doors"' }
    await expect(saveDoor('a', 'b', true)).rejects.toThrow(/row-level security/)
  })
})
