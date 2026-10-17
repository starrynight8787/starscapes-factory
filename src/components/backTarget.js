// Works out where the "Back" link on a post should go.
import { channels } from '../data/channels'
import { roomPath } from '../data/roomImages'
import { kindOf } from '../factoryfloor/factoryData'
import { backLabel } from '../rooms/roomsData'

const roomName = (slug) => {
  const room = (channels || []).find((c) => c.slug === slug)
  return room ? room.name : null
}

// Where the reader came from, if it was a page on this site. The address is kept whole, so a filter comes back too.
// Anything that is not a plain page on this site (another website, another post) is ignored.
export function targetFromPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null
  const [pathname] = path.split(/[?#]/)
  if (pathname.startsWith('/post/')) return null // never "back" to another post, it could loop
  if (pathname === '/') return { to: path, label: 'the homepage' }
  if (pathname === '/blog') return { to: path, label: 'all posts' }
  if (pathname === '/factory-floor' || pathname === '/factory-floor/floor') return { to: path, label: 'The Factory Floor' }
  if (pathname === '/factory-floor/blueprints') return { to: path, label: 'Factory Blueprints' }
  if (pathname === '/art-loft' || pathname.startsWith('/art-loft/')) return { to: path, label: 'The Art Loft' }
  const ownRoom = pathname.match(/^\/(idea-hatchery|leadership-lounge|explorers-bay|knowledge-nook|sarah-jrs-den)(?:\/([^/]+))?\/?$/)
  if (ownRoom) return { to: path, label: backLabel(ownRoom[1], ownRoom[2]) }
  if (pathname === '/drafting-desk') return { to: path, label: 'The Drafting Desk' }
  if (pathname === '/drafting-desk/archive-entries') return { to: path, label: 'Archive Entries' }
  if (pathname === '/drafting-desk/authors-notebook') return { to: path, label: "Author's Notebook" }
  const room = pathname.match(/^\/channel\/([^/]+)\/?$/)
  if (room) return { to: path, label: roomName(room[1]) || 'the room' }
  return null
}

// Where a post belongs: the room it was written in. In the Factory Floor, a Blueprint goes back to the Blueprints.
export function targetFromPost(post) {
  const channel = post && typeof post.channel === 'string' ? post.channel : ''
  if (channel === 'factory-floor') {
    return kindOf(post) === 'blueprint'
      ? { to: '/factory-floor/blueprints', label: 'Factory Blueprints' }
      : { to: '/factory-floor/floor', label: 'The Factory Floor' }
  }
  const name = channel && roomName(channel)
  if (name) return { to: roomPath(channel), label: name }
  return { to: '/blog', label: 'all posts' }
}
