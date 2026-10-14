import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './factoryfloor.css'
import useTitle from './useTitle'
import PostNote from './PostNote'
import PostFilter from './PostFilter'
import { fetchFactoryPosts } from './factoryApi'
import { SECTIONS, kindOf, tagsOf, filterPosts } from './factoryData'

// Every post of one kind: the story (/factory-floor/floor) or the Blueprints (/factory-floor/blueprints),
// with a search, a sort and tag buttons. The choices live in the address, so the back button and shared links work.
export default function SectionPage({ kind }) {
  const section = SECTIONS[kind]
  useTitle(section.name)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
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

  const q = params.get('q') || ''
  const tag = params.get('tag') || ''
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const tags = useMemo(() => tagsOf(posts), [posts])
  const shown = useMemo(() => filterPosts(posts, { q, tag, sort }), [posts, q, tag, sort])

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

        {status === 'ready' && posts.length > 0 && (
          <PostFilter q={q} tag={tag} sort={sort} tags={tags} total={posts.length} shown={shown.length} onChange={change} />
        )}
        {status === 'ready' && posts.length > 0 && shown.length === 0 && (
          <p className="ff-msg">No posts match. Try a different word, or clear the filters.</p>
        )}

        <ul className="ff-latest ff-latest--all">
          {shown.map((p, i) => (
            <li key={p.id}>
              <PostNote post={p} index={i} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
