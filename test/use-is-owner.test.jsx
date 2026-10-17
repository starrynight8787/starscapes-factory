import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import useIsOwner, { useOwnerCheck } from '../src/admin/useIsOwner'

const session = { access_token: 'token-123', user: { id: 'u1' } }
let fetchMock
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
const live = () => vi.stubEnv('DEV', false)

describe('on the live site, the website asks the server who you are', () => {
  it('is no, and does not ask, when nobody is signed in', async () => {
    live()
    const { result } = renderHook(() => useOwnerCheck(null))
    await waitFor(() => expect(result.current).toEqual({ checking: false, owner: false }))
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('asks the server with the sign-in, and says yes only when the server says owner is true', async () => {
    live()
    fetchMock.mockResolvedValue({ json: async () => ({ owner: true }) })
    const { result } = renderHook(() => useOwnerCheck(session))
    expect(result.current).toEqual({ checking: true, owner: false })   // while it is being asked
    await waitFor(() => expect(result.current).toEqual({ checking: false, owner: true }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/is-owner')
    expect(options.headers.Authorization).toBe('Bearer token-123')
    expect(options.cache).toBe('no-store')
  })
  it.each([
    ['the server says no', { owner: false }],
    ['the server says something odd', { owner: 'yes' }],
    ['the answer is empty', null],
    ['the answer is not an owner answer at all', { ok: true }],
  ])('is no when %s', async (_, body) => {
    live()
    fetchMock.mockResolvedValue({ json: async () => body })
    const { result } = renderHook(() => useOwnerCheck(session))
    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(result.current.owner).toBe(false)
  })
  it('is no when the server cannot be reached, or does not answer in the right shape', async () => {
    live()
    fetchMock.mockRejectedValue(new Error('offline'))
    const a = renderHook(() => useOwnerCheck(session))
    await waitFor(() => expect(a.result.current.checking).toBe(false))
    expect(a.result.current.owner).toBe(false)
    fetchMock.mockResolvedValue({ json: async () => { throw new Error('not json') } })
    const b = renderHook(() => useOwnerCheck(session))
    await waitFor(() => expect(b.result.current.checking).toBe(false))
    expect(b.result.current.owner).toBe(false)
  })
  it('asks again when the sign-in changes, and goes back to no when the person signs out', async () => {
    live()
    fetchMock.mockResolvedValue({ json: async () => ({ owner: true }) })
    const { result, rerender } = renderHook(({ s }) => useOwnerCheck(s), { initialProps: { s: session } })
    await waitFor(() => expect(result.current.owner).toBe(true))
    rerender({ s: null })
    await waitFor(() => expect(result.current).toEqual({ checking: false, owner: false }))
    rerender({ s: { access_token: 'another', user: { id: 'u2' } } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
  it('the menu\u2019s yes-or-no version gives the same answer', async () => {
    live()
    fetchMock.mockResolvedValue({ json: async () => ({ owner: true }) })
    const { result } = renderHook(() => useIsOwner(session))
    await waitFor(() => expect(result.current).toBe(true))
  })
})

describe('on your own computer there is no server to ask', () => {
  it('shows the button to anyone signed in, without asking, and still hides it from anyone signed out', async () => {
    vi.stubEnv('DEV', true)
    const signedIn = renderHook(() => useIsOwner(session))
    await waitFor(() => expect(signedIn.result.current).toBe(true))
    const signedOut = renderHook(() => useIsOwner(null))
    await waitFor(() => expect(signedOut.result.current).toBe(false))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
