// Every door that starts closed, and the page that goes behind it.
//
// page: { layout } means a plain page of the room's posts that carry this door's tag, as a list or a gallery. It exists now, so the door can be opened.
// page: { layout: 'custom' } means the page has its own design and its own component (see CUSTOM_PAGES in src/rooms/RoomRoutes.jsx), not a list of posts.
// page: null means the page has not been built yet (it needs its own design), so the door cannot be opened until it is.
// paid: true means the page, once it is built, is for pass holders only (testers and teasers for the travel work). The bottle is drawn with its own padlock.
// ghost: true means the door's picture is a dotted outline, which is its "not yet" look. Opened as it is, it would still look unfinished.
//
// The page for a door is at /<room>/<door id>, and the posts on it are the room's posts tagged with the door's id.
export const DOORS = [
  { room: 'idea-hatchery', id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me.', page: { layout: 'list' }, ghost: true },
  { room: 'leadership-lounge', id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free.', page: { layout: 'custom' } },
  { room: 'explorers-bay', id: 'lessons-from-the-road', name: 'Lessons from the road', blurb: 'What each place taught me.', page: { layout: 'custom' } },
  { room: 'explorers-bay', id: 'travel-map', name: 'Travel map', blurb: 'Where I have been.', page: { layout: 'custom' } }, // the map, drawn in the site's own code (src/explorers/TravelMapPage.jsx)
  { room: 'explorers-bay', id: 'road-journal', name: 'Road journal', blurb: 'A free journal for the road.', page: { layout: 'custom' } },
  { room: 'knowledge-nook', id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', page: { layout: 'custom' } },
  { room: 'knowledge-nook', id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me.', page: { layout: 'custom' } },
  { room: 'knowledge-nook', id: 'research', name: 'Research', blurb: 'A space to test things out.', page: { layout: 'list' } },
  { room: 'knowledge-nook', id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', page: { layout: 'gallery' } },
  { room: 'knowledge-nook', id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', page: { layout: 'custom' } },
  { room: 'sarah-jrs-den', id: 'blog', name: 'Blog', blurb: 'Little notes from the Clubhouse.', page: { layout: 'list' } },
  { room: 'sarah-jrs-den', id: 'daryls-adventures', name: "Daryl's Adventures", blurb: "Daryl's world, one adventure at a time.", page: { layout: 'gallery' } },
  { room: 'sarah-jrs-den', id: 'books', name: 'Books', blurb: 'Stories to read together.', page: { layout: 'gallery' } },
  { room: 'sarah-jrs-den', id: 'youtube-series', name: 'YouTube Series', blurb: 'Little adventures to watch.', page: { layout: 'custom' } },
]

export const doorKey = (room, id) => `${room}/${id}`
export const doorsOf = (room) => DOORS.filter((d) => d.room === room)
export const findDoor = (room, id) => DOORS.find((d) => d.room === room && d.id === id) || null
export const doorPath = (door) => (door && door.page ? `/${door.room}/${door.id}` : null)
export const doorArt = (door) => `/scenes/${door.room}/item-${door.id}-open.svg`

// The room pages for the doors that have one, in the same shape as a room's own areas, so the same page can show them.
export function doorAreas(room) {
  const areas = {}
  for (const d of doorsOf(room)) if (d.page && d.page.layout !== 'custom') areas[d.id] = { name: d.name, blurb: d.blurb, layout: d.page.layout, tags: [d.id] }
  return areas
}
