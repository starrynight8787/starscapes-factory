import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './factoryfloor.css'
import useTitle from './useTitle'
import PostNote from './PostNote'
import PostFilter from './PostFilter'
import NebulaBox from '../entries/NebulaBox'
import { fetchFactoryPosts } from './factoryApi'
import { fetchReads, pickMostRead } from '../entries/readsApi'
import { SECTIONS, kindOf, tagsOf, filterPosts, isPinned } from './factoryData'

// Every post of one kind: the story (/factory-floor/floor) or the Blueprints (/factory-floor/blueprints),
// with a search, a sort and tag buttons. The choices live in the address, so the back button and shared links work.
export default function SectionPage({ kind }) {
  const section = SECTIONS[kind]
  useTitle(section.name)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [reads, setReads] = useState({})
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    let alive = true
    fetchFactoryPosts()
      .then((data) => alive && (setPosts(data.filter((p) => kindOf(p) === kind)), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [kind])

  useEffect(() => {
    if (posts.length === 0) return undefined
    let alive = true
    fetchReads(posts.map((p) => p.id)).then((r) => alive && setReads(r))
    return () => { alive = false }
  }, [posts])

  const q = params.get('q') || ''
  const tag = params.get('tag') || ''
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const tags = useMemo(() => tagsOf(posts), [posts])
  const shown = useMemo(() => filterPosts(posts, { q, tag, sort }), [posts, q, tag, sort])
  // The pinned post sits in the right-hand column, under the search, and stays there whatever is typed in the search.
  // The other posts flow across the left, and the numbers in the filter count only those.
  const pinnedPost = useMemo(() => posts.find(isPinned) || null, [posts])
  const rest = useMemo(() => shown.filter((p) => !isPinned(p)), [shown])
  const mostRead = useMemo(() => pickMostRead(posts, reads), [posts, reads])
  const restTotal = pinnedPost ? posts.length - 1 : posts.length

  function change(patch) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  return (
    <main className="ff">
      <div className="ff-inner">
        <p className="ff-back"><Link to="/factory-floor">← The Factory Floor</Link></p>
        <header className="ff-head">
          <h1>{section.name}</h1>
          <p className="ff-tagline">{section.blurb}</p>
        </header>

        {status === 'error' && <p className="ff-msg" role="alert">The posts could not load just now. Please try again in a moment.</p>}
        {status === 'loading' && <p className="ff-msg">Loading…</p>}
        {status === 'ready' && posts.length === 0 && <p className="ff-msg">Nothing here yet.</p>}

        <div className="ff-split">
          {/* the right-hand column: the search first, then the Into the Nebula box, then the pinned post, then the most read */}
          <aside className="ff-side" aria-label="Search, and the pinned post">
            {status === 'ready' && restTotal > 0 && (
              <PostFilter q={q} tag={tag} sort={sort} tags={tags} total={restTotal} shown={rest.length} onChange={change} />
            )}
            <NebulaBox />
            {status === 'ready' && pinnedPost && (
              <div className="ff-side__pinned">
                <PostNote post={pinnedPost} index={0} />
              </div>
            )}
            {status === 'ready' && mostRead && (
              <div className="ff-side__pinned">
                <PostNote post={mostRead} index={2} label="Most read" />
              </div>
            )}
          </aside>

          <div className="ff-main">
            {status === 'ready' && restTotal > 0 && rest.length === 0 && (
              <p className="ff-msg">No posts match. Try a different word, or clear the filters.</p>
            )}
            <ul className="ff-latest ff-latest--all">
              {rest.map((p, i) => (
                <li key={p.id}>
                  <PostNote post={p} index={i + (pinnedPost ? 1 : 0)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
