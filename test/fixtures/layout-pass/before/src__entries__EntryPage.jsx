import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import { formatDate, safeImage } from '../rooms/postRules'
import { StarMark } from '../components/Logo'
import { GRID_COUNT, pickGrid, pickLatest, pickPinned, pinnedIsBeginning } from './entryRules'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../styles/forms.css'
import './entries.css'

function Picture({ post, className }) {
  const src = safeImage(post.image_url)
  return src
    ? <img className={className} src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
    : <div className={`${className} en__img--empty`}><StarMark width={72} color="#DCE6FF" /></div>
}

// The entry template (Figma: "Archive Entry / Author's Notebook"): the latest entry big, the pinned entry beside it, a grid of the rest, and an optional extra
// box under the pinned one (for example the Author's Notebook for members). It works for any room: the page that uses it says what it is called, where "back"
// goes, how to fetch the room's posts (load) and which of them belong on the page (belongs). Those two should be fixed functions (defined outside the page),
// so the page does not fetch again on every redraw. On a phone: latest, pinned, the grid (four first), then the extra box.
export default function EntryPage({ title, blurb, backTo, backLabel, load, belongs, aside = null }) {
  useTitle(title)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [expanded, setExpanded] = useState(false)
  const here = useLocation()
  const from = here.pathname

  useEffect(() => {
    let alive = true
    load().then((data) => alive && (setPosts(data.filter(belongs)), setStatus('ready'))).catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [load, belongs])

  const latest = useMemo(() => pickLatest(posts), [posts])
  const pinned = useMemo(() => pickPinned(posts, latest), [posts, latest])
  const grid = useMemo(() => pickGrid(posts, latest, pinned), [posts, latest, pinned])
  const beginning = pinnedIsBeginning(posts, pinned)
  const shown = expanded ? grid : grid.slice(0, GRID_COUNT)
  const moreOnComputer = grid.length > GRID_COUNT

  return (
    <main className="rp en">
      <p className="rp-back"><Link to={backTo}>← {backLabel}</Link></p>
      <header className="rp-head">
        <h1>{title}</h1>
        <p className="rp-blurb">{blurb}</p>
      </header>
      {status === 'error' && <p className="rp-note" role="alert">The entries could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'ready' && posts.length === 0 && <p className="rp-note">The first entry is on its way.</p>}

      <div className="en__cols">
        <div className="en__left">
          {latest && (
            <section className="en__card en__latest en__o1" aria-labelledby="en-latest-title">
              <Picture post={latest} className="en__img" />
              <p className="en__meta"><span className="pg-chip">Latest entry</span> {formatDate(latest.created_at)}</p>
              <h2 id="en-latest-title" className="en__title">{latest.title}</h2>
              <div className="en__buttons"><Link className="pg-btn fm-btn--primary" to={`/post/${latest.id}`} state={{ from }}>Read the entry</Link></div>
            </section>
          )}
          {shown.length > 0 && (
            <section className="en__more en__o3" aria-label="More entries">
              <ul className={`en__grid${expanded ? ' is-expanded' : ''}`}>
                {shown.map((p) => (
                  <li key={p.id} className="en__item">
                    <Link className="en__itemlink" to={`/post/${p.id}`} state={{ from }}>
                      <Picture post={p} className="en__itemimg" />
                      <span className="en__itemtitle">{p.title}</span>
                      {formatDate(p.created_at) && <span className="en__itemdate">{formatDate(p.created_at)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
              {grid.length > 4 && !expanded && <button type="button" className={`pg-btn en__morebtn${moreOnComputer ? ' en__morebtn--always' : ''}`} onClick={() => setExpanded(true)}>Show more entries</button>}
            </section>
          )}
        </div>

        <div className="en__right">
          {pinned && (
            <section className="en__card en__pinned en__o2" aria-labelledby="en-pinned-title">
              <Picture post={pinned} className="en__img en__img--small" />
              <p className="en__meta"><span className="pg-chip">Pinned</span> {beginning && <span className="en__label">Entry 1</span>}</p>
              <h2 id="en-pinned-title" className="en__pinnedtitle">{pinned.title}</h2>
              <Link className="pg-btn" to={`/post/${pinned.id}`} state={{ from }}>{beginning ? 'Start from the beginning' : 'Read this entry'}</Link>
            </section>
          )}
          {aside && <div className="en__o4">{aside}</div>}
        </div>
      </div>
    </main>
  )
}
