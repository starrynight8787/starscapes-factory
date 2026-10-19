import { tidyTag } from '../rooms/postRules'

// The plain rules for which entry goes where on an entry page (Writing in Transit now; Archive Entries and the Author's Notebook later). Nothing here talks
// to the database. HOW GILL CHOOSES: the LATEST entry is simply the newest. The PINNED entry is the newest one tagged  pinned  , or, if none is, the OLDEST
// (the beginning, "Start from the beginning"). The rest fill the grid, newest first.
export const PINNED_TAG = 'pinned'
export const GRID_COUNT = 8 // entries shown in the grid on a computer; a phone shows four first

const usable = (posts) => (Array.isArray(posts) ? posts.filter((p) => p && p.id) : [])
const newestFirst = (posts) => usable(posts).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
export const hasTag = (post, tag) => Array.isArray(post && post.tags) && post.tags.map(tidyTag).includes(tidyTag(tag))

export const pickLatest = (posts) => newestFirst(posts)[0] || null

// The pinned entry is never the latest one again: it is the newest tagged "pinned" among the others, otherwise the oldest of the others
export function pickPinned(posts, latest) {
  const others = newestFirst(posts).filter((p) => !latest || p.id !== latest.id)
  if (others.length === 0) return null
  return others.find((p) => hasTag(p, PINNED_TAG)) || others[others.length - 1]
}

// What the pinned entry's button says: the beginning of the series, or just an entry Gill chose to pin
export function pinnedIsBeginning(posts, pinned) {
  const list = newestFirst(posts)
  return Boolean(pinned && list.length > 0 && list[list.length - 1].id === pinned.id)
}

export function pickGrid(posts, latest, pinned) {
  const skip = new Set([latest && latest.id, pinned && pinned.id].filter(Boolean))
  return newestFirst(posts).filter((p) => !skip.has(p.id))
}
