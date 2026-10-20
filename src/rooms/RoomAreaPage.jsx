import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import './roompages.css'
import './roomblog.css'
import useTitle from './useTitle'
import RoomEntry from './RoomEntry'
import PageBanner from '../components/PageBanner'
import { fetchRoomPosts } from './roomsApi'
import { ROOMS } from './roomsData'
import { inArea, safeImage } from './postRules'

// The line-art picture on each room's banner, so a blog or a list page shows which room you are in.
const ROOM_ART = { 'idea-hatchery': 'story', 'leadership-lounge': 'mountain', 'knowledge-nook': 'nook', 'sarah-jrs-den': 'blog', 'explorers-bay': 'transit' }
// Books stand on a shelf, four to a row, each row on its own board.
const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))

// One area of a room, at /<room>/<area>: the room's published posts that belong to it, newest first.
// A gallery shows each post's picture; a list is a compact column of rectangles.
export default function RoomAreaPage({ room, areas }) {
  const config = ROOMS[room]
  const { area: areaKey } = useParams()
  const known = areas || config.areas // the room's own areas, or those plus the pages behind its doors
  const area = Object.prototype.hasOwnProperty.call(known, areaKey) ? known[areaKey] : null
  useTitle(area ? area.name : 'Page not found')
  const here = useLocation() // remembered, so a post's Back link can return to this list
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!area) return undefined
    let alive = true
    fetchRoomPosts(config.channel)
      .then((data) => alive && (setPosts(data), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [config.channel, area])

  const mine = useMemo(() => (area ? posts.filter((p) => inArea(area, p)) : []), [posts, area])
  const back = <p className="rp-back"><Link to={`/${room}`}>← Back to {config.name}</Link></p>

  if (!area) {
    return (
      <main className="rp">
        {back}
        <h1>Page not found</h1>
      </main>
    )
  }
  const gallery = area.layout === 'gallery'
  const shelf = room === 'sarah-jrs-den' && areaKey === 'books' // Sarah Jr. Adventures books: each one appears on the shelf when its post is published
  return (
    <main className={`rp rp--room rp--${room}`}>
      {back}
      <PageBanner chip={config.name} title={area.name} subtitle={area.blurb} art={ROOM_ART[room] || 'plain'} />
      {status === 'error' && <p className="rp-note" role="alert">The posts could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'ready' && mine.length === 0 && !shelf && <p className="rp-note">Nothing here yet. Check back soon.</p>}
      {shelf ? (
        <section className="rp-shelf" aria-label="Sarah Jr. Adventures books">
          {status === 'ready' && mine.length === 0 && <p className="rp-shelf__note">Each book appears here the day it is ready to read.</p>}
          {(mine.length ? chunk(mine, 4) : [[]]).map((row, r) => (
            <div className="rp-shelf__row" key={r}>
              <ul className="rp-shelf__books">
                {row.map((p) => (
                  <li key={p.id}>
                    <Link className="rp-book" to={`/post/${p.id}`} state={{ from: here.pathname + here.search }}>
                      <span className="rp-book__cover">
                        {safeImage(p.image_url) ? <img src={safeImage(p.image_url)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <span className="rp-book__plain">{p.title}</span>}
                      </span>
                      {safeImage(p.image_url) && <span className="rp-book__title">{p.title}</span>}
                    </Link>
                  </li>
                ))}
                {!mine.length && [0, 1, 2, 3].map((i) => <li key={`slot-${i}`} className="rp-book__slot" aria-hidden="true" />)}
              </ul>
              <div className="rp-shelf__board" aria-hidden="true" />
            </div>
          ))}
        </section>
      ) : (
        <ul className={`rp-entries${gallery ? ' rp-entries--gallery' : ''}`}>
          {mine.map((p) => (
            <li key={p.id}>
              <RoomEntry post={p} picture={gallery} from={here.pathname + here.search} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
