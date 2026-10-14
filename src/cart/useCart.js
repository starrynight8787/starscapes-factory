import { useMemo, useSyncExternalStore } from 'react'
import { getItems, subscribe, countOf, subtotalOf } from './cartStore'

const EMPTY = []

// The cart, kept up to date on screen. Any component can call this.
export default function useCart() {
  const items = useSyncExternalStore(subscribe, getItems, () => EMPTY)
  return useMemo(() => ({ items, count: countOf(items), subtotal: subtotalOf(items) }), [items])
}
