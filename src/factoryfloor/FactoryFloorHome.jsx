import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './factoryfloor.css'
import useTitle from './useTitle'
import PostNote from './PostNote'
import { fetchFactoryPosts } from './factoryApi'
import { FACTORY, SECTIONS } from './factoryData'

export default function FactoryFloorHome() {
  useTitle(FACTORY.name)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let alive = true
    fetchFactoryPosts()
      .then((data) => alive && (setPosts(data), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  const latest = posts.slice(0, FACTORY.latestCount)

  return (
    <main className="ff">
      <div className="ff-inner">
        <header className="ff-head">
          <h1>{FACTORY.name}</h1>
          <p className="ff-tagline">{FACTORY.tagline}</p>
        </header>

        <div className="ff-big" role="navigation" aria-label="Sections of the Factory Floor">
          {[SECTIONS.story, SECTIONS.blueprint].map((s) => (
            <Link key={s.key} className={`ff-note ff-note--big ff-note--${s.key}`} to={s.to}>
              <span className="ff-note__title">{s.name}</span>
              <span className="ff-note__blurb">{s.blurb}</span>
              <span className="ff-note__go" aria-hidden="true">Read on →</span>
            </Link>
          ))}
        </div>

        <section aria-labelledby="ff-latest-title">
          <h2 id="ff-latest-title" className="ff-latest__title">Latest posts</h2>
          {status === 'error' && <p className="ff-msg" role="alert">The posts could not load just now. Please try again in a moment.</p>}
          {status === 'loading' && <p className="ff-msg">Loading…</p>}
          {status === 'ready' && latest.length === 0 && <p className="ff-msg">Nothing here yet. The first post-it is on its way.</p>}
          <ul className="ff-latest">
            {latest.map((p, i) => (
              <li key={p.id}>
                <PostNote post={p} index={i} isNew={i === 0} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
