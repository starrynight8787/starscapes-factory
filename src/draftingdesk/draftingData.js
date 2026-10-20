// What the Drafting Desk needs to know that is not in the database.

export const DESK = {
  name: 'The Drafting Desk',
  tagline: 'Where the writing happens.',
  blurb: 'Pick up a page to see what I am working on.',
  channel: 'drafting-desk', // the room's name as saved on each post
}

// The address of your Substack. It no longer has a paper on the desk, but the address is kept here for when it is linked from somewhere else. It must start with https://
export const OVERTHINK_ARCHIVE_URL = 'https://overthinkarchive.substack.com'

export const SCENE_SIZE = { width: 1200, height: 840 }
export const BASE_PICTURE = '/scenes/drafting-desk/base.svg'
export const PAD = 44 // room round each paper's own picture, for its shadow, the paperclip and the pencil

const art = (id) => `/scenes/drafting-desk/sheet-${id}.svg`

// The five papers on the desk, one for each area. (cx, cy) is the middle of the paper on the 1200 by 840 desk, w and h its size, rot its tilt.
// kind "page" opens a page here, "external" opens another site in a new tab, "locked" goes nowhere yet.
// To change where a paper is, how it is tilted, or what it says, change it here.
// (The papers are drawn in public/scenes/drafting-desk/. If you change a paper's size, its picture needs redrawing to match.)
export const SHEETS = [
  { id: 'archive-entries', name: 'Archive Entries', blurb: 'The ongoing story, entry by entry.', kind: 'page', to: '/drafting-desk/archive-entries', cx: 262, cy: 292, w: 250, h: 330, rot: -6 },
  { id: 'authors-notebook', name: "Author's Notebook", blurb: 'Behind the scenes, straight from my notebook.', kind: 'page', to: '/drafting-desk/authors-notebook', lock: 'paid', cx: 612, cy: 262, w: 270, h: 340, rot: 4, labelTop: 48 },
  { id: 'writing-prompts', name: 'Writing Prompts', blurb: 'A spark to start something of your own.', kind: 'page', to: '/drafting-desk/writing-prompts', cx: 952, cy: 322, w: 250, h: 330, rot: 8 },
  { id: 'poems', name: 'Poems', blurb: 'Short pieces, line by line.', kind: 'page', to: '/drafting-desk/poems', cx: 300, cy: 624, w: 250, h: 240, rot: -4 },
  { id: 'come-write-with-me', name: 'Come Write With Me', blurb: 'Join me on YouTube while I write.', kind: 'page', to: '/drafting-desk/come-write-with-me', cx: 700, cy: 636, w: 320, h: 235, rot: 3 },
]

// The room as the scene needs it
export function buildScene() {
  return {
    name: DESK.name,
    tagline: DESK.tagline,
    blurb: DESK.blurb,
    width: SCENE_SIZE.width,
    height: SCENE_SIZE.height,
    base: BASE_PICTURE,
    items: SHEETS.map((s) => ({ ...s, pad: PAD, art: art(s.id) })),
  }
}

// The areas that are pages on this site, and what to call them
export const AREAS = {
  'archive-entries': {
    key: 'archive-entries',
    name: 'Archive Entries',
    blurb: 'The ongoing story, entry by entry.',
    to: '/drafting-desk/archive-entries',
  },
  'writing-prompts': {
    key: 'writing-prompts',
    name: 'Writing Prompts',
    blurb: 'A spark to start something of your own.',
    to: '/drafting-desk/writing-prompts',
  },
  poems: {
    key: 'poems',
    name: 'Poems',
    blurb: 'Short pieces, line by line.',
    to: '/drafting-desk/poems',
  },
  'authors-notebook': {
    key: 'authors-notebook',
    name: "Author's Notebook",
    blurb: 'Behind the scenes, straight from my notebook.',
    to: '/drafting-desk/authors-notebook',
  },
}

// Which area a post belongs to, from its tags. A post in this room with neither tag does not appear on a paper.
//   Archive Entries:    tag "archive-entries" (or "archive-entry")
//   Author's Notebook:  tag "authors-notebook" (or "notebook")
//   Writing Prompts:    tag "writing-prompts" (or "writing-prompt")
//   Poems:              tag "poems" (or "poem", "poetry")
// Capitals and spaces do not matter, so "Archive Entries" and "archive-entries" mean the same.
const tidy = (tag) => String(tag).trim().toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-')
export function areaOf(post) {
  const tags = Array.isArray(post && post.tags) ? post.tags.map(tidy) : []
  if (tags.includes('authors-notebook') || tags.includes('notebook')) return 'authors-notebook'
  if (tags.includes('writing-prompts') || tags.includes('writing-prompt')) return 'writing-prompts'
  if (tags.includes('poems') || tags.includes('poem') || tags.includes('poetry')) return 'poems'
  if (tags.includes('archive-entries') || tags.includes('archive-entry')) return 'archive-entries'
  return null
}

// A post's picture, if it has a usable one: an https address, or one on this site. Anything else is ignored, so a bad value can never break a card.
export function safeImage(url) {
  const u = typeof url === 'string' ? url.trim() : ''
  return /^https:\/\/[^\s/]+/i.test(u) || (u.startsWith('/') && !u.startsWith('//')) ? u : ''
}

export function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
