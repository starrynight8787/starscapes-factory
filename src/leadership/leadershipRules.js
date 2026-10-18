import { tidyTag } from '../rooms/postRules'
import { BLOCK_COUNT, FEATURED_TAG, LATEST_COUNT, MORE_COUNT, blockTag } from './leadershipData'

// The plain rules for which post goes where on the Leadership Blog page. Nothing here talks to the database.
const newestFirst = (posts) => (Array.isArray(posts) ? posts.filter((p) => p && p.id) : []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
export const hasTag = (post, tag) => Array.isArray(post && post.tags) && post.tags.map(tidyTag).includes(tidyTag(tag))

// The featured post: the newest one tagged "featured", otherwise the newest post of all, otherwise nothing
export function pickFeatured(posts) {
  const list = newestFirst(posts)
  return list.find((p) => hasTag(p, FEATURED_TAG)) || list[0] || null
}

// The six Building Blocks, in order: each is the newest post tagged for it, or null for "Coming soon"
export function blocksFrom(posts) {
  const list = newestFirst(posts)
  return Array.from({ length: BLOCK_COUNT }, (_, i) => ({ number: i + 1, post: list.find((p) => hasTag(p, blockTag(i + 1))) || null }))
}

export const latestPosts = (posts, count = LATEST_COUNT) => newestFirst(posts).slice(0, count)

// More from the blog: the newer-to-older posts that are NOT already on the page (not the featured one, not in Latest posts, not a Building Block)
export function morePosts(posts, { featured, latest, blocks }, count = MORE_COUNT) {
  const shown = new Set([featured && featured.id, ...(latest || []).map((p) => p.id), ...(blocks || []).map((b) => b.post && b.post.id)].filter(Boolean))
  return newestFirst(posts).filter((p) => !shown.has(p.id)).slice(0, count)
}
