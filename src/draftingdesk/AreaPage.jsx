import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './draftingdesk.css'
import useTitle from './useTitle'
import { fetchDeskPosts } from './draftingApi'
import EntryCard from './EntryCard'
import { AREAS, areaOf } from './draftingData'

// One area of the desk that is a page here, listing its posts newest first. Used for Archive Entries.
export default function AreaPage({ area }) {
  const info = AREAS[area]
  useTitle(info.name)
  const here = useLocation() // remembered, so a post's Back link can return to this list
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true
    fetchDeskPosts()
      .then((data) => alive && (setPosts(data), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  const mine = useMemo(() => posts.filter((p) => areaOf(p) === area), [posts, area])

  return (
    <main className="dd">
      <p className="dd-back"><Link to="/drafting-desk">← Back to the Drafting Desk</Link></p>
      <header className="dd-head">
        <h1>{info.name}</h1>
        <p className="dd-blurb">{info.blurb}</p>
      </header>
      {status === 'error' && <p className="dd-note" role="alert">The entries could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="dd-note">Loading…</p>}
      {status === 'ready' && mine.length === 0 && <p className="dd-note">Nothing here yet. Check back soon.</p>}
      <ul className="dd-entries">
        {mine.map((p) => (
          <li key={p.id}>
            <EntryCard post={p} from={here.pathname + here.search} />
          </li>
        ))}
      </ul>
    </main>
  )
}
