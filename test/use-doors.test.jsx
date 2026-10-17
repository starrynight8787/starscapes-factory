import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const api = vi.hoisted(() => ({ result: {}, fail: false, calls: 0 }))
vi.mock('../src/doors/doorsApi', () => ({
  fetchDoors: async () => { api.calls += 1; if (api.fail) throw new Error('nope'); return api.result },
}))
import useDoors, { loadDoors, forgetDoors } from '../src/doors/useDoors'

beforeEach(() => { forgetDoors(); api.result = {}; api.fail = false; api.calls = 0 })

describe('knowing which doors are open', () => {
  it('is not ready until the answer arrives, then says which doors are open and which are not', async () => {
    api.result = { 'sarah-jrs-den/blog': true }
    const { result } = renderHook(() => useDoors())
    expect(result.current.ready).toBe(false)
    expect(result.current.isOpen('sarah-jrs-den', 'blog')).toBe(false)
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.isOpen('sarah-jrs-den', 'blog')).toBe(true)
    expect(result.current.isOpen('sarah-jrs-den', 'books')).toBe(false)
    expect(result.current.failed).toBe(false)
  })
  it('counts every door as closed, and says so, when the question fails', async () => {
    api.fail = true
    const { result } = renderHook(() => useDoors())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.failed).toBe(true)
    expect(result.current.isOpen('sarah-jrs-den', 'blog')).toBe(false)
  })
  it('asks only once, however many pages want to know, and remembers the answer', async () => {
    api.result = { 'a/b': true }
    const one = renderHook(() => useDoors())
    const two = renderHook(() => useDoors())
    await waitFor(() => expect(one.result.current.ready && two.result.current.ready).toBe(true))
    const three = renderHook(() => useDoors())
    expect(three.result.current.ready).toBe(true)
    expect(api.calls).toBe(1)
  })
  it('asks again when told to, and every page using it hears the new answer', async () => {
    const { result } = renderHook(() => useDoors())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.isOpen('a', 'b')).toBe(false)
    api.result = { 'a/b': true }
    await act(async () => { await loadDoors({ force: true }) })
    expect(result.current.isOpen('a', 'b')).toBe(true)
    expect(api.calls).toBe(2)
  })
})
