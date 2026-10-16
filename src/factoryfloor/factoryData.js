// What the Factory Floor needs to know that is not in the database.

export const FACTORY = {
  name: 'The Factory Floor',
  tagline: 'Building Starscapes Factory, one line of code at a time.',
  channel: 'factory-floor', // the room's name as saved on each post
  latestCount: 6, // how many post-its show under the two objects
}

// The two things at the top (a protractor and a rolled blueprint), and what to call each kind of post.
export const SECTIONS = {
  story: {
    key: 'story',
    name: 'The Factory Floor',
    blurb: 'The story: what happened each day',
    label: 'Factory Floor',
    to: '/factory-floor/floor',
    art: '/scenes/factory-floor/protractor.svg', // the protractor
  },
  blueprint: {
    key: 'blueprint',
    name: 'Factory Blueprints',
    blurb: 'The reasoning behind every decision',
    label: 'Blueprints',
    to: '/factory-floor/blueprints',
    art: '/scenes/factory-floor/blueprint-roll.svg', // the rolled blueprint with its lock
  },
}

// Post-it colours, in the order the notes use them: green, orange, pale blue, pink, pale purple, yellow.
// (The same six are in factoryfloor.css as ff-note--c0 to ff-note--c5. Change one in both places.)
export const NOTE_COLOURS = ['#C9F29B', '#FFC78F', '#CDE4FF', '#FFB3D1', '#DCCDFF', '#FFE27A']

// Tags that only say which room or kind a post is. They are not worth offering as filters.
export const INTERNAL_TAGS = ['factory-floor', 'blueprints', 'blueprint', 'test-import']

// A post is a Blueprint if it has a "blueprints" tag, or its title starts with "Blueprints".
// Everything else in this room is part of the story.
export function kindOf(post) {
  const tags = Array.isArray(post && post.tags) ? post.tags.map((t) => String(t).trim().toLowerCase()) : []
  if (tags.includes('blueprints') || tags.includes('blueprint')) return 'blueprint'
  if (/^\s*blueprints?\b/i.test(String((post && post.title) || ''))) return 'blueprint'
  return 'story'
}

// A small, steady tilt for each note, so the row looks stuck on by hand but never moves around between visits
const TILTS = [-3, 2, -1.5, 3, -2.5, 1.5]
export const noteTilt = (i) => TILTS[((i % TILTS.length) + TILTS.length) % TILTS.length]

export function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// The tags worth offering as filters, with how many posts each one has, in alphabetical order.
// If a tag is written with different capitals on different posts, the button uses the spelling that appears most often.
export function tagsOf(posts) {
  const found = new Map()
  for (const post of posts) {
    const seenHere = new Set()
    for (const raw of Array.isArray(post && post.tags) ? post.tags : []) {
      const spelling = String(raw).trim()
      const key = spelling.toLowerCase()
      if (!spelling || INTERNAL_TAGS.includes(key) || seenHere.has(key)) continue
      seenHere.add(key)
      const entry = found.get(key) || { key, count: 0, spellings: new Map() }
      entry.count += 1
      entry.spellings.set(spelling, (entry.spellings.get(spelling) || 0) + 1)
      found.set(key, entry)
    }
  }
  return [...found.values()]
    .map(({ key, count, spellings }) => ({
      key,
      count,
      label: [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))[0][0],
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))
}

// A post is pinned if it is pinned in its own section (a Blueprint pinned in the story section does not count).
export function isPinned(post) {
  return Boolean(post && post.pinned_in && post.pinned_in === kindOf(post))
}

// Search by the words in the title (every word must be there, in any order), by one tag, and sort by date.
export function filterPosts(posts, { q = '', tag = '', sort = 'newest' } = {}) {
  const words = String(q).toLowerCase().split(/\s+/).filter(Boolean)
  const wantedTag = String(tag).trim().toLowerCase()
  const kept = posts.filter((post) => {
    const title = String(post.title || '').toLowerCase()
    if (!words.every((w) => title.includes(w))) return false
    if (!wantedTag) return true
    return (Array.isArray(post.tags) ? post.tags : []).some((t) => String(t).trim().toLowerCase() === wantedTag)
  })
  const time = (post) => new Date(post.created_at).getTime() || 0
  const ordered = kept.sort((a, b) => (sort === 'oldest' ? time(a) - time(b) : time(b) - time(a)))
  // the pinned post always leads its section (if it matches the search); the others keep their order
  return [...ordered.filter(isPinned), ...ordered.filter((p) => !isPinned(p))]
}
