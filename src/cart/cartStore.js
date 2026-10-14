// The shopping cart. It lives in this browser (so it needs no account and no database), and it is
// remembered between visits. Anything can go in it: prints, original paintings, services.
//
// IMPORTANT for later: the prices stored here are only for showing the cart. When checkout is built,
// the server must look every price up again from the database and never trust these numbers.

const STORAGE_KEY = 'sf-cart-v1'

// What kinds of thing can be in the cart, what to call them, and how many of one can be bought at a time.
export const KINDS = {
  print: { label: 'Digital print', max: 10 },
  original: { label: 'Original painting', max: 1 }, // one of a kind
  service: { label: 'Service', max: 1 },
}
export const MAX_LINES = 20 // different things in one cart (also the most Creative Hub accepts in one order)

let items = []
let loaded = false
const listeners = new Set()

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch (e) {
    return null // some private-browsing modes refuse; the cart then lasts until the page is closed
  }
}

// Only keep things that look exactly like cart lines. Anything odd, or edited by hand, is dropped.
function clean(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const kind = KINDS[r.type]
    const price = Number(r.price)
    const qty = Number(r.qty)
    if (!kind || typeof r.key !== 'string' || !r.key || typeof r.title !== 'string' || !r.title) continue
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(qty) || qty < 1) continue
    if (out.some((o) => o.key === r.key)) continue
    out.push({
      key: r.key,
      type: r.type,
      id: String(r.id ?? ''),
      productId: r.productId ? String(r.productId) : '',
      title: r.title,
      detail: typeof r.detail === 'string' ? r.detail : '',
      price,
      image: typeof r.image === 'string' ? r.image : '',
      href: typeof r.href === 'string' && r.href.startsWith('/') ? r.href : '',
      qty: Math.min(qty, kind.max),
    })
    if (out.length >= MAX_LINES) break
  }
  return out
}

function load() {
  const s = storage()
  if (!s) return []
  try {
    return clean(JSON.parse(s.getItem(STORAGE_KEY) || '[]'))
  } catch (e) {
    return []
  }
}

function save() {
  const s = storage()
  if (!s) return
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    /* full or blocked: the cart still works for this visit */
  }
}

function emit() {
  listeners.forEach((l) => l())
}

function ensureLoaded() {
  if (loaded) return
  loaded = true
  items = load()
  if (typeof window !== 'undefined' && window.addEventListener) {
    // keep two open tabs in step
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        items = load()
        emit()
      }
    })
  }
}

function commit(next) {
  items = next
  save()
  emit()
}

export function getItems() {
  ensureLoaded()
  return items
}

export function subscribe(listener) {
  ensureLoaded()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const countOf = (list) => list.reduce((n, i) => n + i.qty, 0)
// added up in pence so that pennies never go missing
export const subtotalOf = (list) => list.reduce((p, i) => p + Math.round(i.price * 100) * i.qty, 0) / 100

// Add a thing to the cart.  Returns { ok: true, qty, capped } or { ok: false, reason: 'invalid' | 'full' }.
export function addItem(item, qty = 1) {
  ensureLoaded()
  const kind = item && KINDS[item.type]
  const price = Number(item && item.price)
  if (!kind || !item.key || !item.title || !Number.isFinite(price) || price < 0) return { ok: false, reason: 'invalid' }
  const want = Math.max(1, Math.floor(Number(qty) || 1))
  const existing = items.find((i) => i.key === item.key)
  if (existing) {
    const next = Math.min(existing.qty + want, kind.max)
    const capped = existing.qty + want > kind.max
    commit(items.map((i) => (i.key === item.key ? { ...i, qty: next } : i)))
    return { ok: true, qty: next, capped }
  }
  if (items.length >= MAX_LINES) return { ok: false, reason: 'full' }
  const line = clean([{ ...item, price, qty: Math.min(want, kind.max) }])[0]
  if (!line) return { ok: false, reason: 'invalid' }
  commit([...items, line])
  return { ok: true, qty: line.qty, capped: want > kind.max }
}

// Change how many of something. Zero (or less) removes it.
export function setQty(key, qty) {
  ensureLoaded()
  const q = Math.floor(Number(qty))
  if (!Number.isFinite(q) || q < 1) return removeItem(key)
  commit(items.map((i) => (i.key === key ? { ...i, qty: Math.min(q, KINDS[i.type].max) } : i)))
}

export function removeItem(key) {
  ensureLoaded()
  commit(items.filter((i) => i.key !== key))
}

export function clearCart() {
  ensureLoaded()
  commit([])
}

// for the tests only: forget everything held in memory and read the browser's storage again
export function __reloadFromStorage() {
  loaded = false
  items = []
  ensureLoaded()
  emit()
}
