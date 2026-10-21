// The Star Atlas calls (src/atlas/atlasApi.js): which database functions are called, and that none of it ever gets in the way.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sb = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), getUser: vi.fn() }))
vi.mock('../src/supabaseClient', () => ({ supabase: { rpc: sb.rpc, from: sb.from, auth: { getUser: sb.getUser } } }))

import { fetchMyAtlas, claimStarterStamp, saveCountry, claimFirstChaptersIfChapter } from '../src/atlas/atlasApi'

beforeEach(() => { sb.rpc.mockReset(); sb.from.mockReset(); sb.getUser.mockReset() })

describe('fetchMyAtlas', () => {
  it('calls get_my_atlas and returns it cleaned', async () => {
    sb.rpc.mockResolvedValue({ data: { year: 2026, galaxy: 'G', stardust_needed: 100, stardust_earned: 3, is_paid: false, has_country: false, starter: ['joined'], rooms: {} }, error: null })
    const a = await fetchMyAtlas()
    expect(sb.rpc).toHaveBeenCalledWith('get_my_atlas')
    expect(a.earned).toBe(3)
  })
  it('says it in plain words when it cannot load, never the database’s own message', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied for table x' } })
    await expect(fetchMyAtlas()).rejects.toThrow(/could not load your Star Atlas/)
    sb.rpc.mockRejectedValue(new Error('network down'))
    await expect(fetchMyAtlas()).rejects.toThrow(/could not load your Star Atlas/)
  })
})

describe('claimStarterStamp', () => {
  it('asks the database for the named stamp and says whether it was accepted', async () => {
    sb.rpc.mockResolvedValue({ data: { ok: true }, error: null })
    expect(await claimStarterStamp('joined')).toBe(true)
    expect(sb.rpc).toHaveBeenCalledWith('claim_starter_stamp', { p_which: 'joined' })
    sb.rpc.mockResolvedValue({ data: { ok: false, error: 'no_country' }, error: null })
    expect(await claimStarterStamp('first-country')).toBe(false)
  })
  it('never throws', async () => {
    sb.rpc.mockRejectedValue(new Error('boom'))
    expect(await claimStarterStamp('joined')).toBe(false)
  })
})

describe('saveCountry', () => {
  const table = (result) => { const upsert = vi.fn().mockResolvedValue(result); sb.from.mockReturnValue({ upsert }); return upsert }
  it('saves the code to the member’s own member_country row, then claims First country', async () => {
    sb.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const upsert = table({ error: null })
    sb.rpc.mockResolvedValue({ data: { ok: true }, error: null })
    expect(await saveCountry('GB')).toBe(true)
    expect(sb.from).toHaveBeenCalledWith('member_country')
    expect(upsert.mock.calls[0][0]).toMatchObject({ user_id: 'u1', country: 'GB' })
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'user_id' })
    expect(sb.rpc).toHaveBeenCalledWith('claim_starter_stamp', { p_which: 'first-country' })
  })
  it('refuses a code that is not on the list without calling the database', async () => {
    await expect(saveCountry('ZZ')).rejects.toThrow(/choose a country/)
    expect(sb.from).not.toHaveBeenCalled()
  })
  it('says so when it did not save, and does not claim the stamp', async () => {
    sb.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    table({ error: { message: 'rls' } })
    await expect(saveCountry('FR')).rejects.toThrow(/did not save/)
    expect(sb.rpc).not.toHaveBeenCalled()
  })
  it('asks them to log in again when there is no signed-in person', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } })
    await expect(saveCountry('FR')).rejects.toThrow(/log in again/)
  })
})

describe('claimFirstChaptersIfChapter', () => {
  const chapter = (number) => sb.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: number == null ? null : { number }, error: null }) }) }) })
  it('claims First three chapters when the post is chapter 3', async () => {
    chapter(3); sb.rpc.mockResolvedValue({ data: { ok: true }, error: null })
    expect(await claimFirstChaptersIfChapter('post-a')).toBe(true)
    expect(sb.rpc).toHaveBeenCalledWith('claim_starter_stamp', { p_which: 'first-chapters' })
  })
  it('does nothing for chapter 2, a post that is no chapter, or a post asked about twice', async () => {
    chapter(2)
    expect(await claimFirstChaptersIfChapter('post-b')).toBe(false)
    chapter(null)
    expect(await claimFirstChaptersIfChapter('post-c')).toBe(false)
    chapter(3); sb.rpc.mockResolvedValue({ data: { ok: true }, error: null })
    await claimFirstChaptersIfChapter('post-d')
    sb.rpc.mockClear()
    expect(await claimFirstChaptersIfChapter('post-d')).toBe(false)
    expect(sb.rpc).not.toHaveBeenCalled()
  })
  it('never throws', async () => {
    sb.from.mockImplementation(() => { throw new Error('boom') })
    expect(await claimFirstChaptersIfChapter('post-e')).toBe(false)
  })
})
