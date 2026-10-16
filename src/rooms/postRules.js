// Small rules about posts that the room pages share.

// A post's picture, if it has a usable one: an https address, or one on this site. Anything else is ignored.
export function safeImage(url) {
  const u = typeof url === 'string' ? url.trim() : ''
  return /^https:\/\/[^\s/]+/i.test(u) || (u.startsWith('/') && !u.startsWith('//')) ? u : ''
}

export function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Capitals, spaces and apostrophes do not matter in a tag: "Stop Motion" and "stop-motion" are the same.
export const tidyTag = (tag) => String(tag).trim().toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-')

// Does a post belong on an area's page? An area lists the posts in its room that carry any of its tags.
// An area with no list of tags (null) is the "everything" page: every post in the room.
export function inArea(area, post) {
  if (area.tags === null) return true
  const have = Array.isArray(post && post.tags) ? post.tags.map(tidyTag) : []
  return area.tags.map(tidyTag).some((t) => have.includes(t))
}
