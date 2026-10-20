// What each illustrated room needs to know that is not in the database: its wording, its objects, and where each object leads.
// The objects are drawn in public/scenes/<room>/, and where they sit was measured from the drawings (roomsGeometry.js).
// To change what something says, or where it leads, change it here. The wording below is a first draft, for you to rewrite.
import { GEOMETRY, OBJECT_PAD } from './roomsGeometry'

export const SCENE_SIZE = { width: 1200, height: 840 }

// Addresses for the two outside links in the Leadership Lounge. Each must start with https://. If one is ever emptied, its object shows as
// "Opening soon" and goes nowhere; while it is filled in, the object is a link that opens in a new tab.
export const AUDIOBOOK_URL = 'https://www.everand.com/audiobook/653427502/Leading-from-the-Middle' // the audio course on Everand (Scribd's newer name)
export const UDEMY_URL = 'https://www.udemy.com/course/leading-from-the-middle/'

// An object's place and picture, from the measurements. Its name goes on a plaque beside it.
const piece = (room, key) => ({ ...GEOMETRY[room][key], pad: OBJECT_PAD, rot: 0, art: `/scenes/${room}/item-${key}.svg`, label: 'below' })

export const ROOMS = {
  'idea-hatchery': {
    slug: 'idea-hatchery',
    name: 'The Idea Hatchery',
    tagline: 'Where ideas get tested.',
    blurb: 'Pick a beaker to see what I am working on.',
    channel: 'idea-hatchery', // the room's name as saved on each post
    items: [
      { ...piece('idea-hatchery', 'short-stories'), id: 'short-stories', name: 'Let\u2019s write a story', blurb: 'I write, you decide where the story goes.', kind: 'page', to: '/idea-hatchery/lets-write-a-story', labelAt: [462, 700] }, // (the beaker keeps its old internal id, picture and place: only its name and where it leads changed)
      { ...piece('idea-hatchery', 'come-study-with-me'), id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me. Starting soon.', kind: 'locked', lock: 'not started yet', labelAt: [600, 754] },
      { ...piece('idea-hatchery', 'stop-motion'), id: 'stop-motion', name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', kind: 'page', to: '/idea-hatchery/stop-motion', labelAt: [847, 700] },
    ],
    areas: {
      'stop-motion': { name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', layout: 'gallery', tags: ['stop-motion'] },
      'lets-write-a-story': { name: 'Let\u2019s write a story', blurb: 'I write, you decide where the story goes.', layout: 'list', tags: null, own: true }, // its own designed page (src/stories), not a list of posts (own: true tells the Admin list of posts not to say posts appear here)
      // The old Short Stories gallery of tagged posts. The beaker no longer leads here, but the address still works, so anything shared or bookmarked keeps working (oldLink: true says it is kept on purpose).
      'short-stories': { name: 'Short Stories', blurb: 'Small tales you can finish in a sitting.', layout: 'gallery', tags: ['short-stories'], oldLink: true },
    },
  },
  'leadership-lounge': {
    slug: 'leadership-lounge',
    name: 'Leadership Lounge',
    tagline: 'Leading from the middle.',
    blurb: 'Pull up a seat and have a look around.',
    channel: 'leadership-lounge',
    items: [
      { ...piece('leadership-lounge', 'leading-from-the-middle'), id: 'leading-from-the-middle', name: 'Leading from the Middle', blurb: 'The idea behind everything in this room.', kind: 'page', to: '/leadership-lounge/leading-from-the-middle', labelAt: [520, 250] },
      { ...piece('leadership-lounge', 'blog'), id: 'blog', name: 'Blog', blurb: 'Notes on leading from where you are.', kind: 'page', to: '/leadership-lounge/blog', labelAt: [488, 722] },
      { ...piece('leadership-lounge', 'free-ebook'), id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free. Opening soon.', kind: 'locked', lock: 'opening soon', labelAt: [707, 722] },
      { ...piece('leadership-lounge', 'audiobook'), id: 'audiobook', name: 'Audiobook', blurb: 'Listen to the audio course on Everand.', kind: 'external', href: AUDIOBOOK_URL, labelAt: [264, 762] },
      { ...piece('leadership-lounge', 'udemy-course'), id: 'udemy-course', name: 'Udemy Course', blurb: 'Take the course on Udemy.', kind: 'external', href: UDEMY_URL, labelAt: [690, 140] },
    ],
    areas: {
      'leading-from-the-middle': { name: 'Leading from the Middle', blurb: 'The idea behind everything in this room.', layout: 'list', tags: ['leading-from-the-middle'] },
      blog: { name: 'Leadership Blog', blurb: 'Notes on leading from where you are.', layout: 'list', tags: null },
    },
  },
  'explorers-bay': {
    slug: 'explorers-bay',
    name: "Explorer's Bay",
    tagline: 'Stories and pictures from the road.',
    blurb: 'Pick something up from the pier.',
    channel: 'explorers-bay',
    items: [
      { ...piece('explorers-bay', 'writing-in-transit'), id: 'writing-in-transit', name: 'Writing in Transit', blurb: 'Words written on the move.', kind: 'page', to: '/explorers-bay/writing-in-transit', labelAt: [280, 700] },
      { ...piece('explorers-bay', 'photography'), id: 'photography', name: 'Photography', blurb: 'Pictures from the road.', kind: 'page', to: '/explorers-bay/photography', labelAt: [710, 520] },
      { ...piece('explorers-bay', 'coming-soon'), id: 'coming-soon', name: 'Something New', blurb: 'A message is drifting in.', kind: 'locked', lock: 'opening soon', labelAt: [915, 722] },
    ],
    areas: {
      'writing-in-transit': { name: 'Writing in Transit', blurb: 'Words written on the move.', layout: 'list', tags: ['writing-in-transit'] },
      photography: { name: 'Photography', blurb: 'Pictures from the road.', layout: 'gallery', tags: ['photography'] },
    },
  },
  'knowledge-nook': {
    slug: 'knowledge-nook',
    name: 'Knowledge Nook',
    tagline: 'Reading, learning and personal growth.',
    blurb: 'Pick a book.',
    channel: 'knowledge-nook',
    items: [
      { ...piece('knowledge-nook', 'book-club'), id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', kind: 'locked', lock: 'opening soon', labelAt: [286, 56] },
      { ...piece('knowledge-nook', 'come-read-with-me'), id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me. Starting soon.', kind: 'locked', lock: 'not started yet', labelAt: [400, 540] },
      { ...piece('knowledge-nook', 'research'), id: 'research', name: 'Research', blurb: 'A space to test things out.', kind: 'locked', lock: 'opening soon', labelAt: [233, 734] },
      { ...piece('knowledge-nook', 'book-to-screen'), id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', kind: 'locked', lock: 'opening soon', labelAt: [570, 734] },
      { ...piece('knowledge-nook', 'story-ledger'), id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', kind: 'locked', lock: 'opening soon', labelAt: [901, 734] },
    ],
    areas: {},
  },
  'sarah-jrs-den': {
    slug: 'sarah-jrs-den',
    name: "Sarah Junior's Clubhouse",
    tagline: "Kids' travel adventures, told through a curious little bear and her pet dinosaur, Daryl.",
    blurb: 'Pick a door.',
    channel: 'sarah-jrs-den',
    items: [
      { ...piece('sarah-jrs-den', 'blog'), id: 'blog', name: 'Blog', blurb: 'Little notes from the Clubhouse.', kind: 'locked', lock: 'opening soon', labelAt: [155, 726] },
      { ...piece('sarah-jrs-den', 'daryls-adventures'), id: 'daryls-adventures', name: "Daryl's Adventures", blurb: "Daryl's world: being developed.", kind: 'locked', lock: 'opening soon', labelAt: [564, 716] },
      { ...piece('sarah-jrs-den', 'books'), id: 'books', name: 'Books', blurb: 'Stories to read together.', kind: 'locked', lock: 'opening soon', labelAt: [935, 672] },
      { ...piece('sarah-jrs-den', 'youtube-series'), id: 'youtube-series', name: 'YouTube Series', blurb: 'Little adventures to watch.', kind: 'locked', lock: 'opening soon', labelAt: [1085, 750] },
    ],
    areas: {},
  },
}

export const ROOM_SLUGS = Object.keys(ROOMS)

// A room as the scene needs it
export function buildRoomScene(slug, { audiobookUrl = AUDIOBOOK_URL, udemyUrl = UDEMY_URL } = {}) {
  const room = ROOMS[slug]
  const external = { audiobook: audiobookUrl, 'udemy-course': udemyUrl }
  return {
    name: room.name,
    tagline: room.tagline,
    blurb: room.blurb,
    width: SCENE_SIZE.width,
    height: SCENE_SIZE.height,
    base: `/scenes/${slug}/base.svg`,
    items: room.items.map((item) => (item.id in external ? { ...item, href: external[item.id] } : item)),
  }
}

// What the Back link on a post should say, when the reader came from one of a room's pages: the area's name if it is an area, else the room's.
export function backLabel(slug, areaKey) {
  const room = ROOMS[slug]
  if (!room) return 'the room'
  const area = typeof areaKey === 'string' && Object.prototype.hasOwnProperty.call(room.areas, areaKey) ? room.areas[areaKey] : null
  return area ? area.name : room.name
}
