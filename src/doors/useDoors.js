import { useCallback, useEffect, useState } from 'react'
import { fetchDoors } from './doorsApi'

// Which doors are open, asked once and remembered while the site is open, so every page shares one answer.
// If the question fails for any reason, every door counts as closed, and the reason the database gave is kept (for the owner's Open a door page).
let cache = null // { open: {}, failed: false, reason }
let inflight = null
const listeners = new Set()

export function loadDoors({ force = false } = {}) {
  if (cache && !force) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetchDoors()
      .then((open) => ({ open, failed: false }))
      .catch((e) => ({ open: {}, failed: true, reason: String((e && e.message) || '') }))
      .then((result) => {
        cache = result
        inflight = null
        listeners.forEach((listen) => listen(result))
        return result
      })
  }
  return inflight
}

export function forgetDoors() {
  cache = null
  inflight = null
}

export default function useDoors() {
  const [state, setState] = useState(cache)
  useEffect(() => {
    let alive = true
    const listen = (result) => alive && setState(result)
    listeners.add(listen)
    loadDoors().then((result) => alive && setState(result))
    return () => {
      alive = false
      listeners.delete(listen)
    }
  }, [])
  const isOpen = useCallback((room, door) => Boolean(state && state.open[`${room}/${door}`]), [state])
  return { ready: state !== null, failed: Boolean(state && state.failed), reason: (state && state.reason) || '', isOpen }
}
