import '../components/pagebanner-rooms.css'
import { Link } from 'react-router-dom'
import HomeLink from '../components/HomeLink'
import StarryBackdrop from '../components/StarryBackdrop'
import { BannerPicture } from '../components/PageBanner'
import './roomscene.css'
import { resolveItem, itemLabel, lockText, placement, hasPlaque } from './sceneRules'

// An illustrated room: a picture with things on it you can click. Each thing is drawn as its own little picture, so it lifts off the
// base when you point at it. The same doors are also given as a plain list: phones see only the list, everyone else sees only the picture.
// which room this is, taken from the picture's own address (/scenes/<room>/base.svg), so each room's heading can be placed clear of its own drawings
const roomOf = (scene) => ((String(scene.base).match(/\/scenes\/([^/]+)\//) || [])[1]) || ''

// On a phone the room's name, tagline and line become a starry banner with a small word above, and a picture below (the "Room banner" designs in Figma).
// On a bigger screen none of that shows: the heading sits on the room's picture as it always has.
const BANNER = {
  'drafting-desk': { chip: 'Writing', art: 'notebook' },
  'idea-hatchery': { chip: 'Experiments', art: 'story' },
  'leadership-lounge': { chip: 'Leadership', art: 'mountain' },
  'explorers-bay': { chip: 'Travel', art: 'transit' },
  'knowledge-nook': { chip: 'Reading', art: 'nook' },
  'sarah-jrs-den': { chip: 'Stories', art: 'sarah-jr' },
}

// The rooms shown as a Post-it note on the homepage's starry backdrop. Rooms are added here one at a time, as each is checked.
export const POSTIT_ROOMS = ['leadership-lounge']

export default function RoomScene({ scene }) {
  const room = roomOf(scene)
  const postit = POSTIT_ROOMS.includes(room)
  const page = <RoomScenePage scene={scene} />
  if (!postit) return page
  return (
    <div className="sf-home rs-sky">
      <div className="sf-hero rs-hero">
        <StarryBackdrop />
        <div className="rs-frame">{page}</div>
      </div>
    </div>
  )
}

function RoomScenePage({ scene }) {
  const items = scene.items.map(resolveItem)
  const banner = BANNER[roomOf(scene)]
  return (
    <main className="rs" data-room={roomOf(scene)}>
      <div className="rs-home">
        <HomeLink />
      </div>
      <header className={`rs-head pb--starry${banner ? ` pb--room pb--room-${roomOf(scene)}` : ''}`}>
        {banner && <p className="pb__chip rs-chip">{banner.chip}</p>}
        <h1>{scene.name}</h1>
        {scene.tagline && <p className="rs-tagline">{scene.tagline}</p>}
        {scene.blurb && <p className="rs-blurb">{scene.blurb}</p>}
              </header>

      <div className="rs-stage" style={{ aspectRatio: `${scene.width} / ${scene.height}` }}>
        <img className="rs-base" src={scene.base} alt="" />
        {items.map((item) => (
          <SceneItem key={item.id} item={item} scene={scene} />
        ))}
      </div>

      <div className="rs-list" role="navigation" aria-label={`Ways into ${scene.name}`}>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <ListItem item={item} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

function SceneItem({ item, scene }) {
  const style = placement(item, scene)
  const why = lockText(item.lock)
  const plaque = hasPlaque(item) // this item's name is on a plaque beside it, so it does not carry writing or a note of its own
  const inside = (
    <>
      <img className="rs-art" src={item.art} alt="" />
      {!plaque && (
        <span className="rs-label">
          <strong>{item.name}</strong>{' '}
          <small>{item.blurb}</small>
        </span>
      )}
      {!plaque && why ? ' ' : null}
      {!plaque && why && <span className="rs-tip" role="note">{why}</span>}
      {plaque && (
        <span className={`rs-plaque${item.kind === 'locked' ? ' is-locked' : ''}`} aria-hidden="true">
          <strong>{item.name}</strong>
          {why && <small className="rs-plaque__why">{why}</small>}
          <small className="rs-plaque__blurb">{item.blurb}</small>
        </span>
      )}
      <span className="rs-hit" aria-hidden="true" />
    </>
  )
  if (item.kind === 'page') {
    return <Link className="rs-item" style={style} to={item.to} aria-label={itemLabel(item)}>{inside}</Link>
  }
  if (item.kind === 'external') {
    return (
      <a className="rs-item" style={style} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={itemLabel(item)}>
        {inside}
      </a>
    )
  }
  return (
    <div className="rs-item is-locked" style={style} tabIndex={0} role="group" aria-label={itemLabel(item)}>
      {inside}
    </div>
  )
}

function ListItem({ item }) {
  const why = lockText(item.lock)
  const text = (
    <span>
      <strong>{item.name}</strong>
      <small>{item.blurb}</small>
      {why && <small className="rs-list__why">{why}</small>}
      {item.kind === 'external' && <small className="rs-list__why">Opens in a new tab</small>}
    </span>
  )
  if (item.kind === 'page') return <Link to={item.to}>{text}</Link>
  if (item.kind === 'external') return <a href={item.href} target="_blank" rel="noopener noreferrer">{text}</a>
  return <span className="is-locked" aria-label={`${item.name}, locked, ${why.toLowerCase()}`}>{text}</span>
}
