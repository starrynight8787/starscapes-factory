import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import { SOCIAL_LINKS } from '../data/contact'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './youtube.css'

const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }
const ID = /^[A-Za-z0-9_-]{11}$/

// The YouTube Series page behind the Den's door (Figma: "Gallery page: Sarah Jr.'s Den: YouTube Series"). It fills itself from the channel's public feed
// (api/youtube-series). Nothing from YouTube loads in a visitor's browser until they press play on a video: the pictures are passed along by this site.
export default function YouTubeSeriesPage() {
  useTitle('YouTube Series')
  const [state, setState] = useState({ status: 'loading', videos: [] })
  const [playing, setPlaying] = useState('')

  useEffect(() => {
    let alive = true
    fetch('/api/youtube-series')
      .then((r) => r.json())
      .then((body) => alive && setState(body && body.ok && Array.isArray(body.videos) ? { status: 'ready', videos: body.videos.filter((v) => v && ID.test(v.id)) } : { status: 'error', videos: [] }))
      .catch(() => alive && setState({ status: 'error', videos: [] }))
    return () => { alive = false }
  }, [])

  return (
    <main className="rp yt">
      <p className="rp-back"><Link to="/sarah-jrs-den">← Back to Sarah Jr.&apos;s Den</Link></p>
      <header className="rp-head">
        <h1>YouTube Series</h1>
        <p className="rp-blurb">Watch the adventures come to life.</p>
        {SOCIAL_LINKS.youtube && <a className="pg-btn sg-btn--primary yt__subscribe" href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener noreferrer" aria-label="Subscribe on YouTube (opens in a new tab)">Subscribe on YouTube ↗</a>}
      </header>
      {state.status === 'loading' && <p className="rp-note">Loading…</p>}
      {state.status === 'error' && <p className="rp-note" role="alert">The videos could not load just now. Please try again in a moment.</p>}
      {state.status === 'ready' && state.videos.length === 0 && <p className="rp-note">The first adventure is on its way.</p>}
      <ul className="yt__grid">
        {state.videos.map((v) => (
          <li key={v.id} className="yt__card">
            {playing === v.id ? (
              <iframe className="yt__frame" title={v.title} src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            ) : (
              <button type="button" className="yt__play" onClick={() => setPlaying(v.id)} aria-label={`Play: ${v.title}`}>
                <img src={`/api/youtube-thumb?id=${v.id}`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                <span className="yt__icon" aria-hidden="true">▶</span>
              </button>
            )}
            <h2 className="yt__title">{v.title}</h2>
            {v.published && <p className="yt__date">{when(v.published)}</p>}
          </li>
        ))}
      </ul>
    </main>
  )
}
