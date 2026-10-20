// The plain rules for the owner's list of every post (/admin/posts): which pages of each room list posts, which of them a given post appears on, and how the list is filtered.
// Nothing here talks to the database. The rules about WHERE a post appears are the site's own (see src/rooms/postRules.js, src/draftingdesk/draftingData.js and the Factory Floor), written out here
// so the list can say it in plain words.
import { channels } from '../data/channels'
import { ROOMS } from '../rooms/roomsData'
import { DOORS } from '../doors/doorsData'
import { inArea, tidyTag } from '../rooms/postRules'

export const roomName = (slug) => {
  const found = channels.find((c) => c.slug === slug)
  return found ? found.name : slug ? String(slug) : ''
}

// The pages of a room that LIST its posts, and how a post gets onto each one: { name, to, tags } where tags is a list (a post needs one of them) or null (every post in the room).
export function pagesOfRoom(slug) {
  if (slug === 'factory-floor') return [{ name: 'The Factory Floor', to: '/factory-floor', tags: null }] // every published post in the room is a note on the floor
  if (slug === 'drafting-desk') {
    return [
      { name: 'Archive Entries', to: '/drafting-desk/archive-entries', tags: ['archive-entries', 'archive-entry'] },
      { name: 'Author\u2019s Notebook', to: '/drafting-desk/authors-notebook', tags: ['authors-notebook', 'notebook'] },
      { name: 'Writing Prompts', to: '/drafting-desk/writing-prompts', tags: ['writing-prompts', 'writing-prompt'] },
      { name: 'Poems', to: '/drafting-desk/poems', tags: ['poems', 'poem', 'poetry'] },
    ]
  }
  const pages = []
  const room = ROOMS[slug]
  if (room) {
    for (const [key, area] of Object.entries(room.areas || {})) {
      if (area.own || area.oldLink) continue // a page with its own design (not a list of posts), or an old address kept on purpose
      pages.push({ name: area.name, to: `/${slug}/${key}`, tags: Array.isArray(area.tags) ? area.tags : null })
    }
  }
  // doors with an ordinary list or gallery page show the room's posts tagged with the door's name
  for (const d of DOORS) if (d.room === slug && d.page && d.page.layout !== 'custom') pages.push({ name: d.name, to: `/${slug}/${d.id}`, tags: [d.id] })
  // two pages with their own design that still list the Nook's posts by tag: the Book Club's reviews and conversations, and the Story Ledger's audits
  if (slug === 'knowledge-nook') {
    pages.push({ name: 'Book Club (reviews and conversations)', to: '/knowledge-nook/book-club', tags: ['book-club'] })
    pages.push({ name: 'Story Ledger (audits)', to: '/knowledge-nook/story-ledger', tags: ['story-ledger'] })
  }
  return pages
}

// Which of its room's pages a post appears on (only a published post appears anywhere)
export const pagesFor = (post) => (post && post.published && post.channel ? pagesOfRoom(post.channel).filter((p) => p.tags === null || inArea({ tags: p.tags }, post)) : [])

// One plain sentence about where a post appears
export function whereIs(post) {
  if (!post) return ''
  if (!post.published) return 'Not published, so it does not appear anywhere yet.'
  const blog = 'the blog page (which lists every post from every room)'
  if (!post.channel) return `It has no room, so it appears only on ${blog}.`
  const pages = pagesFor(post)
  if (pages.length > 0) return `Appears on: ${pages.map((p) => p.name).join(', ')}, and ${blog}.`
  const tagged = pagesOfRoom(post.channel).filter((p) => p.tags)
  if (tagged.length === 0) return `No page in ${roomName(post.channel)} lists posts. It appears only on ${blog}.`
  const examples = tagged.slice(0, 4).map((p) => `${tidyTag(p.tags[0])} (${p.name})`).join(', ')
  return `Not on a page of ${roomName(post.channel)} yet, because none of its tags is one that room's pages use. It appears on ${blog}. Add one of these tags to put it on a page: ${examples}.`
}

// The list, narrowed: room is 'all', 'none' (posts with no room) or a room's name as saved on posts; show is 'published', 'unpublished' or 'all'; search matches part of a title, ignoring capitals.
export function filterPosts(posts, { room = 'all', show = 'published', search = '' } = {}) {
  const needle = String(search || '').trim().toLowerCase()
  return (Array.isArray(posts) ? posts : []).filter((p) => {
    if (!p) return false
    if (show === 'published' && !p.published) return false
    if (show === 'unpublished' && p.published) return false
    if (room === 'none' && p.channel) return false
    if (room !== 'all' && room !== 'none' && p.channel !== room) return false
    if (needle && !String(p.title || '').toLowerCase().includes(needle)) return false
    return true
  })
}

// How many posts each room has under the chosen published/not-published choice: { all, none, rooms: { slug: n } }
export function countByRoom(posts, show = 'published') {
  const list = filterPosts(posts, { room: 'all', show })
  const rooms = {}
  let none = 0
  for (const p of list) { if (p.channel) rooms[p.channel] = (rooms[p.channel] || 0) + 1; else none += 1 }
  return { all: list.length, none, rooms }
}
