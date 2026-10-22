import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import { SOCIAL_LINKS } from '../data/contact'
import { fetchIntroId, fetchSeries } from './youtubeApi'
import { ID, pickGrid, pickIntro } from './youtubeRules'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../styles/forms.css'
import './youtube.css'

export const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }

// One video that only loads from YouTube when it is pressed: until then it is a picture passed along by this site, so a visitor's browser never contacts YouTube.
export function Player({ video, big, playing, onPlay }) {
  if (playing) return <iframe className={`yt__frame${big ? ' yt__frame--big' : ''}`} title={video.title} src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
  return (
    <button type="button" className={`yt__play${big ? ' yt__play--big' : ''}`} onClick={onPlay} aria-label={`Play: ${video.title}`}>
      <img src={`/api/youtube-thumb?id=${video.id}`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
      <span className="yt__icon" aria-hidden="true">▶</span>
    </button>
  )
}

// The YouTube Series page behind the Den's door (Figma: "YouTube Series v2"): a banner, the pinned intro video, and the latest videos. It fills itself from the
// channel's public feed (api/youtube-series). The pinned video is the one Gill chooses in Admin, Home page, or the newest if she has not chosen one.
export default function YouTubeSeriesPage() {
  useTitle('YouTube Series')
  const [state, setState] = useState({ status: 'loading', videos: [] })
  const [introId, setIntroId] = useState('')
  const [playing, setPlaying] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([fetchSeries().then((videos) => ({ ok: true, videos: videos.filter((v) => v && ID.test(v.id)) })).catch(() => ({ ok: false, videos: [] })), fetchIntroId().catch(() => '')])
      .then(([series, chosen]) => { if (alive) { setState({ status: series.ok ? 'ready' : 'error', videos: series.videos }); setIntroId(chosen) } })
    return () => { alive = false }
  }, [])

  const intro = pickIntro(state.videos, introId)
  const grid = pickGrid(state.videos, intro && intro.id)
  const channel = SOCIAL_LINKS.youtube

  return (
    <main className="rp yt">
      <p className="rp-back"><Link to="/sarah-jrs-den">← Back to Sarah Junior&apos;s Clubhouse</Link></p>
      <PageBanner title="YouTube Series" subtitle="come write with me, come read with me, come study with me" art="sarah-jr" room="sarah-jrs-den">
        {channel && <a className="pg-btn fm-btn--primary" href={channel} target="_blank" rel="noopener noreferrer" aria-label="Subscribe on YouTube (opens in a new tab)">Subscribe on YouTube ↗</a>}
      </PageBanner>
      {state.status === 'loading' && <p className="rp-note">Loading…</p>}
      {state.status === 'error' && <p className="rp-note" role="alert">The videos could not load just now. Please try again in a moment.</p>}
      {state.status === 'ready' && state.videos.length === 0 && !intro && <p className="rp-note">The first adventure is on its way.</p>}

      {intro && (
        <section className="yt__card yt__intro" aria-labelledby="yt-intro-title">
          <Player video={intro} big playing={playing === intro.id} onPlay={() => setPlaying(intro.id)} />
          <p className="yt__meta"><span className="pg-chip">Start here</span> {intro.published ? when(intro.published) : 'The channel intro'}</p>
          <h2 id="yt-intro-title" className="yt__title">{intro.title}</h2>
          <div className="yt__buttons"><a className="pg-btn fm-btn--primary" href={`https://www.youtube.com/watch?v=${intro.id}`} target="_blank" rel="noopener noreferrer" aria-label="Watch on YouTube (opens in a new tab)">Watch on YouTube ↗</a></div>
        </section>
      )}

      {grid.length > 0 && (
        <section className="yt__latest" aria-labelledby="yt-latest-title">
          <h2 id="yt-latest-title" className="yt__h2">Latest videos</h2>
          <ul className={`yt__grid${expanded ? ' is-expanded' : ''}`}>
            {grid.map((v) => (
              <li key={v.id} className="yt__card">
                <Player video={v} playing={playing === v.id} onPlay={() => setPlaying(v.id)} />
                <h3 className="yt__cardtitle">{v.title}</h3>
                {v.published && <p className="yt__date">{when(v.published)}</p>}
              </li>
            ))}
          </ul>
          <div className="yt__after">
            {grid.length > 4 && !expanded && <button type="button" className="pg-btn yt__more" onClick={() => setExpanded(true)}>Show more videos</button>}
            {channel && <a className="pg-btn" href={channel} target="_blank" rel="noopener noreferrer" aria-label="See all videos on YouTube (opens in a new tab)">See all videos on YouTube ↗</a>}
          </div>
        </section>
      )}
    </main>
  )
}
