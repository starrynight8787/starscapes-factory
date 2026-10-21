import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StarMark } from '../components/Logo'
import { safeImage } from '../rooms/postRules'
import { PINNED_TAG, hasTag } from './entryRules'
import { fetchReads, pickMostRead } from './readsApi'
import './entries.css'

// The Pinned post and the Most read post, as two boxes to go under the Into the Nebula box on a blog page (the Clubhouse Blog, the Leadership Blog and
// Leading from the Middle). HOW GILL CHOOSES: the pinned post is the newest one tagged  pinned  (if none is tagged, no Pinned box shows). The most read is the
// post opened most often (counted in post_reads); it stays away until someone has read something. A post is never shown twice here.
function Picture({ post }) {
  const src = safeImage(post.image_url)
  return src
    ? <img className="en__img en__img--small" src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
    : <div className="en__img en__img--small en__img--empty"><StarMark width={72} color="#8AA2DA" /></div>
}

export const pickPinnedByTag = (posts) =>
  (Array.isArray(posts) ? posts : []).filter((p) => p && p.id && hasTag(p, PINNED_TAG)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null

export default function PinnedMostRead({ posts, from = '', idPrefix = 'pmr' }) {
  const [reads, setReads] = useState({})
  useEffect(() => {
    if (!Array.isArray(posts) || posts.length === 0) return undefined
    let alive = true
    fetchReads(posts.map((p) => p.id)).then((r) => alive && setReads(r))
    return () => { alive = false }
  }, [posts])
  const pinned = useMemo(() => pickPinnedByTag(posts), [posts])
  const mostRead = useMemo(() => pickMostRead(posts, reads), [posts, reads])
  return (
    <>
      {pinned && (
        <section className="en__card en__pinned" aria-labelledby={`${idPrefix}-pinned-title`}>
          <Picture post={pinned} />
          <p className="en__meta"><span className="pg-chip">Pinned</span></p>
          <h2 id={`${idPrefix}-pinned-title`} className="en__pinnedtitle">{pinned.title}</h2>
          <Link className="pg-btn" to={`/post/${pinned.id}`} state={{ from }}>Read this post</Link>
        </section>
      )}
      {mostRead && (
        <section className="en__card en__pinned en__mostread" aria-labelledby={`${idPrefix}-mostread-title`}>
          <Picture post={mostRead} />
          <p className="en__meta"><span className="pg-chip">Most read</span></p>
          <h2 id={`${idPrefix}-mostread-title`} className="en__pinnedtitle">{mostRead.title}</h2>
          <Link className="pg-btn" to={`/post/${mostRead.id}`} state={{ from }}>Read this post</Link>
        </section>
      )}
    </>
  )
}
