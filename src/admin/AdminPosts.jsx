import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { channels } from '../data/channels'
import { passName, cleanPass } from '../membership/lockedPosts'
import { formatDate } from '../rooms/postRules'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { fetchAllPosts } from './postsAdminApi'
import { countByRoom, filterPosts, pagesOfRoom, roomName, whereIs } from './postsAdminRules'
import '../styles/pages.css'
import './admin.css'
import './adminposts.css'

// The owner's list of every post at /admin/posts: from every room, newest first, with a filter for the room, for published or not, and a search of the titles. Under each post it says
// in plain words where it appears, because a post only shows on a room's page if it is in that room AND carries one of that page's tags.
export default function AdminPosts({ session }) {
  useTitle('All posts')
  const { checking, owner } = useOwnerCheck(session)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [room, setRoom] = useState('all')
  const [show, setShow] = useState('published')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!owner) return undefined
    let alive = true
    fetchAllPosts().then((data) => alive && (setPosts(data), setStatus('ready'))).catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [owner])

  const counts = useMemo(() => countByRoom(posts, show), [posts, show])
  const shown = useMemo(() => filterPosts(posts, { room, show, search }), [posts, room, show, search])
  const known = new Set(channels.map((c) => c.slug))
  const odd = Object.keys(counts.rooms).filter((slug) => !known.has(slug)) // a room name on a post that is not one of the eight rooms

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>All posts</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  const help = room !== 'all' && room !== 'none' ? pagesOfRoom(room) : []
  return (
    <main className="ad ap">
      <p className="rp-back"><Link to="/admin">← Back to Admin</Link></p>
      <h1>All posts</h1>
      <p className="ad-note">Every post from every room. A post shows on a room&apos;s page only if it is in that room and has a tag that page uses; under each post it says where it appears.</p>

      <form className="ap__filters" onSubmit={(e) => e.preventDefault()}>
        <label className="ap__field">Room
          <select className="ap__control" value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="all">All rooms ({counts.all})</option>
            {channels.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({counts.rooms[c.slug] || 0})</option>)}
            {odd.map((slug) => <option key={slug} value={slug}>{slug} ({counts.rooms[slug]})</option>)}
            <option value="none">No room ({counts.none})</option>
          </select>
        </label>
        <label className="ap__field">Show
          <select className="ap__control" value={show} onChange={(e) => setShow(e.target.value)}>
            <option value="published">Published posts</option>
            <option value="unpublished">Not published (drafts)</option>
            <option value="all">Everything</option>
          </select>
        </label>
        <label className="ap__field">Search the titles
          <input className="ap__control" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Part of a title" />
        </label>
      </form>

      {help.length > 0 && (
        <details className="ap__help">
          <summary>How posts get on {roomName(room)}&apos;s pages</summary>
          <ul>{help.map((p) => <li key={p.to}><strong>{p.name}</strong>: {p.tags ? `a post with the tag ${p.tags.join(' or ')}` : 'every post in this room'}</li>)}</ul>
        </details>
      )}

      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'error' && <p className="rp-note" role="alert">The posts could not load just now. Please try again in a moment.</p>}
      {status === 'ready' && <p className="ap__count" role="status">Showing {shown.length} of {posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>}
      {status === 'ready' && shown.length === 0 && <p className="rp-note">No posts match.</p>}

      <ul className="ap__list">
        {shown.map((p) => (
          <li key={p.id} className="ap__row">
            <div className="ap__main">
              <p className="ap__title"><Link to={`/post/${p.id}`}>{p.title || 'Untitled post'}</Link></p>
              <p className="ap__chips">
                <span className="ap__chip">{p.channel ? roomName(p.channel) : 'No room'}</span>
                {!p.published && <span className="ap__chip ap__chip--draft">Not published</span>}
                {cleanPass(p.pass) && <span className="ap__chip ap__chip--pass">{passName(cleanPass(p.pass))} pass</span>}
                {formatDate(p.created_at) && <span className="ap__date">{formatDate(p.created_at)}</span>}
              </p>
              <p className="ap__tags">{Array.isArray(p.tags) && p.tags.length > 0 ? `Tags: ${p.tags.join(', ')}` : 'No tags'}</p>
              <p className="ap__where">{whereIs(p)}</p>
            </div>
            <div className="ap__buttons">
              <Link className="pg-btn" to={`/edit/${p.id}`} aria-label={`Edit ${p.title || 'this post'}`}>Edit</Link>
              <Link className="pg-btn" to={`/post/${p.id}`} aria-label={`View ${p.title || 'this post'}`}>View</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
