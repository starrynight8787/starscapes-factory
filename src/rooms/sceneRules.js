// The rules for an illustrated room: a picture with things on it you can click. Used by the Drafting Desk now, and by any room later.
//
// A room's scene is described like this:
//   { name, tagline, blurb, width, height, base, items: [ ... ] }
// "base" is the picture everything sits on. Each item is something you can click, drawn as its own little picture so it can lift
// off the base:  { id, name, blurb, kind, to | href, lock, art, cx, cy, w, h, rot, pad, labelTop }
//   kind "page"     opens a page on this site (needs "to")
//   kind "external" opens another website in a new tab (needs "href", which must start with https://)
//   kind "locked"   is not open, and goes nowhere
//   "lock" says why something is locked (or paid): paid, not started yet, opening soon
//   cx, cy, w, h, rot  where the item sits on the base (its middle, its size, its tilt in degrees); pad is the room round it for its shadow
//   label  "on" (the default) writes the name and description on the item itself, like a paper; "below" gives it a name plaque instead,
//          for objects too small to carry writing. labelAt is [x, y]: where the middle of the top of the plaque goes on the base.

export const LOCK_TEXT = {
  paid: 'Paid members only',
  'not started yet': 'Starting soon',
  'opening soon': 'Opening soon',
}
const FALLBACK_LOCK = 'Not open yet'

export const lockText = (lock) => (lock ? LOCK_TEXT[lock] || FALLBACK_LOCK : '')

// Something is only treated as a link if it really has a safe place to go. Anything else becomes a locked item, so a mistake in the
// list can never send a visitor to a broken page, or to an address that is not https.
export function resolveItem(item) {
  const kind = item && item.kind
  if (kind === 'page' && typeof item.to === 'string' && item.to.startsWith('/') && !item.to.startsWith('//')) return { ...item, kind: 'page' }
  if (kind === 'external' && typeof item.href === 'string' && /^https:\/\/[^\s/]+/i.test(item.href.trim())) return { ...item, href: item.href.trim(), kind: 'external' }
  const taped = item && item.notify === true && typeof item.to === 'string' && item.to.startsWith('/') && !item.to.startsWith('//') // a taped door that links to its page, where a visitor can ask to hear when it opens
  return { ...item, kind: 'locked', lock: item && item.lock ? item.lock : 'opening soon', ...(taped ? {} : { to: undefined }) }
}

// What a screen reader says for an item. It follows the order of the writing on the item (name, description, then the note about access), because a spoken label that does not
// contain the written words, in that order, fails people who use voice control and screen readers together (WCAG 2.5.3, "label in name"). What the writing does not say comes
// after it: that a locked item is not a link, and that a link opens a new tab.
export function itemLabel(item) {
  const why = lockText(item.lock)
  let label = `${item.name}. ${item.blurb}`
  if (why) label += ` ${why}`
  if (item.kind === 'locked') label += ' (locked)'
  if (item.kind === 'external') label += ' (opens in a new tab)'
  return label
}

const pc = (n) => `${Math.round(n * 10000) / 100}%`

// The numbers the page needs to put an item and its writing in the right place. All as percentages of the picture, so it scales.
export function placement(item, scene) {  // (plaqueAnchor is defined just below)
  const pad = item.pad == null ? 0 : item.pad
  const boxW = item.w + 2 * pad
  const boxH = item.h + 2 * pad
  const top = item.labelTop == null ? 30 : item.labelTop
  return {
    '--cx': pc(item.cx / scene.width),
    '--cy': pc(item.cy / scene.height),
    '--w': pc(boxW / scene.width),
    '--h': pc(boxH / scene.height),
    '--rot': `${item.rot || 0}deg`,
    // the paper itself, inside the item's own picture
    '--sx': pc(pad / boxW),
    '--sy': pc(pad / boxH),
    '--sw': pc(item.w / boxW),
    '--sh': pc(item.h / boxH),
    // the name and the line of description, near the top of the paper
    '--lx': pc((pad + 18) / boxW),
    '--ly': pc((pad + top) / boxH),
    '--lw': pc((item.w - 36) / boxW),
    // the little note that says why something is locked, along the bottom edge of the paper
    '--ty': pc((pad + item.h) / boxH),
    // a name plaque, if the item has one: its anchor point, measured inside the item's own box (so it belongs to the item)
    '--qx': pc((plaqueAnchor(item)[0] - (item.cx - boxW / 2)) / boxW),
    '--qy': pc((plaqueAnchor(item)[1] - (item.cy - boxH / 2)) / boxH),
  }
}

// Where the middle of the top of an item's plaque goes on the base: where the item says, or just under the item
export function plaqueAnchor(item) {
  return Array.isArray(item.labelAt) && item.labelAt.length === 2 ? item.labelAt : [item.cx, item.cy + item.h / 2 + 12]
}

// Does this item use a plaque, and not writing on the item itself?
export const hasPlaque = (item) => item.label === 'below'
