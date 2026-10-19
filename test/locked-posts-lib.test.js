// @vitest-environment node
// The helpers for locked posts (src/membership/lockedPosts.js).
import { describe, it, expect, vi } from 'vitest'

const sb = vi.hoisted(() => ({ result: { data: null, error: null }, seen: [], throws: false }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      const chain = {
        select: (cols) => { sb.seen.push(['select', table, cols]); return chain },
        eq: (c, v) => { sb.seen.push(['eq', c, v]); return chain },
        limit: () => { if (sb.throws) throw new Error('not a chain'); return Promise.resolve(sb.result) },
        maybeSingle: () => Promise.resolve(sb.result),
        upsert: (row) => { sb.seen.push(['upsert', table, row]); return Promise.resolve(sb.result) },
        delete: () => { sb.seen.push(['delete', table]); return chain },
        then: (res, rej) => Promise.resolve(sb.result).then(res, rej),
      }
      return chain
    },
  },
}))

import { PASS_CHOICES, passName, cleanPass, hasPassColumn, canUsePasses, loadLockedBody, saveLockedBody, removeLockedBody } from '../src/membership/lockedPosts'

describe('the pass choices', () => {
  it('are the five passes, with their names', () => {
    expect(PASS_CHOICES.map((c) => c.id)).toEqual(['authors-notebook', 'early-drafts', 'come-write-with-me', 'blueprints', 'book-club'])
    expect(passName('blueprints')).toBe('Blueprints'); expect(passName('nonsense')).toBe(''); expect(passName(null)).toBe('')
  })
  it('turn anything that is not a real pass into "free for everyone"', () => {
    expect(cleanPass('blueprints')).toBe('blueprints')
    for (const v of ['', null, undefined, 'made-up', 'Blueprints', ' blueprints', 42, ['blueprints'], {}]) expect(cleanPass(v), String(v)).toBe('')
  })
  it('know whether the database sent the pass column at all', () => {
    expect(hasPassColumn({ id: 1, pass: null })).toBe(true); expect(hasPassColumn({ id: 1 })).toBe(false); expect(hasPassColumn(null)).toBe(false); expect(hasPassColumn(undefined)).toBe(false)
  })
})

describe('asking whether the database has the pass column yet', () => {
  it('says yes when the question works, and no when the database refuses it', async () => {
    sb.result = { data: [], error: null }; await expect(canUsePasses()).resolves.toBe(true)
    sb.result = { data: null, error: { message: 'column posts.pass does not exist' } }; await expect(canUsePasses()).resolves.toBe(false)
  })
  it('never throws, even if the question cannot be asked at all', async () => {
    sb.throws = true; await expect(canUsePasses()).resolves.toBe(false); sb.throws = false
  })
})

describe('the protected words', () => {
  it('reads a post\u2019s words from the protected table, by the post\u2019s id, and nothing else', async () => {
    sb.seen = []; sb.result = { data: { content: 'The words.' }, error: null }
    await expect(loadLockedBody('p1')).resolves.toBe('The words.')
    expect(sb.seen).toEqual([['select', 'post_bodies', 'content'], ['eq', 'post_id', 'p1']])
  })
  it('gives null (not an empty string) when the database hands over nothing, so "not allowed" can be told from "empty"', async () => {
    sb.result = { data: null, error: null }; await expect(loadLockedBody('p1')).resolves.toBeNull()
    sb.result = { data: { content: '' }, error: null }; await expect(loadLockedBody('p1')).resolves.toBe(''); sb.result = { data: { content: null }, error: null }; await expect(loadLockedBody('p1')).resolves.toBe('')
  })
  it('throws, rather than saying "locked", if the database could not be asked', async () => {
    sb.result = { data: null, error: { message: 'could not read' } }; await expect(loadLockedBody('p1')).rejects.toThrow('could not read')
  })
  it('keeps the words by the post\u2019s id (an upsert, so saving twice just replaces them), with when it was saved, and throws if it cannot', async () => {
    sb.seen = []; sb.result = { data: null, error: null }; await saveLockedBody('p1', 'Words.')
    const [, table, row] = sb.seen.find((s) => s[0] === 'upsert'); expect(table).toBe('post_bodies'); expect(row).toMatchObject({ post_id: 'p1', content: 'Words.' }); expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    sb.result = { data: null, error: { message: 'no' } }; await expect(saveLockedBody('p1', 'Words.')).rejects.toBeTruthy()
  })
  it('takes the words away by the post\u2019s id, and never throws', async () => {
    sb.seen = []; sb.result = { data: null, error: null }; await removeLockedBody('p1'); expect(sb.seen).toEqual([['delete', 'post_bodies'], ['eq', 'post_id', 'p1']])
    sb.result = { data: null, error: { message: 'no' } }; await expect(removeLockedBody('p1')).resolves.toBeUndefined()
  })
})
