import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import './roompages.css'
import useTitle from './useTitle'
import RoomEntry from './RoomEntry'
import { fetchRoomPosts } from './roomsApi'
import { ROOMS } from './roomsData'
import { inArea } from './postRules'

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
  return (
    <main className="rp">
      {back}
      <header className="rp-head">
        <h1>{area.name}</h1>
        <p className="rp-blurb">{area.blurb}</p>
      </header>
      {status === 'error' && <p className="rp-note" role="alert">The posts could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'ready' && mine.length === 0 && <p className="rp-note">Nothing here yet. Check back soon.</p>}
      <ul className={`rp-entries${gallery ? ' rp-entries--gallery' : ''}`}>
        {mine.map((p) => (
          <li key={p.id}>
            <RoomEntry post={p} picture={gallery} from={here.pathname + here.search} />
          </li>
        ))}
      </ul>
    </main>
  )
}
