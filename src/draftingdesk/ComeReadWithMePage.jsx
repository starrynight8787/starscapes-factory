import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import { PROJECT_SOCIALS } from '../data/contact'
import { Player, when } from '../den/YouTubeSeriesPage'
import { ID, pickGrid, pickIntro } from '../den/youtubeRules'
import { INTRO_ID, LIST_KEY, PAGE } from './comeReadData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../styles/forms.css'
import '../den/youtube.css'

// The Come Read With Me page behind the Knowledge Nook's book, on the YouTube Series page's layout (a banner, the pinned video, the latest videos). It only shows the
// videos in ONE playlist on the Drafting Desk's YouTube channel (see src/draftingdesk/comeReadData.js), so the channel's other videos stay off it.
async function fetchSessions() {
  const response = await fetch(`/api/youtube-series?list=${LIST_KEY}`)
  const body = await response.json()
  if (!body || body.ok !== true || !Array.isArray(body.videos)) throw new Error('The sessions could not load.')
  return body.videos
}

export default function ComeReadWithMePage() {
  useTitle(PAGE.title)
  const [state, setState] = useState({ status: 'loading', videos: [] })
  const [playing, setPlaying] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let alive = true
    fetchSessions()
      .then((videos) => alive && setState({ status: 'ready', videos: videos.filter((v) => v && ID.test(v.id)) }))
      .catch(() => alive && setState({ status: 'error', videos: [] }))
    return () => { alive = false }
  }, [])

  const intro = pickIntro(state.videos, INTRO_ID)
  const grid = pickGrid(state.videos, intro && intro.id)
  const channel = (PROJECT_SOCIALS['drafting-desk'] || {}).youtube
  const chosen = Boolean(INTRO_ID)

  return (
    <main className="rp yt">
      <p className="rp-back"><Link to="/knowledge-nook">← Back to the Knowledge Nook</Link></p>
      <PageBanner title={PAGE.title} subtitle={PAGE.subtitle} art="nook" room="knowledge-nook">
        {channel && <a className="pg-btn fm-btn--primary" href={channel} target="_blank" rel="noopener noreferrer" aria-label="Subscribe on YouTube (opens in a new tab)">Subscribe on YouTube ↗</a>}
      </PageBanner>
      {state.status === 'loading' && <p className="rp-note">Loading…</p>}
      {state.status === 'error' && <p className="rp-note" role="alert">The sessions could not load just now. Please try again in a moment.</p>}
      {state.status === 'ready' && state.videos.length === 0 && !intro && <p className="rp-note">{PAGE.empty}</p>}

      {intro && (
        <section className="yt__card yt__intro" aria-labelledby="cr-intro-title">
          <Player video={intro} big playing={playing === intro.id} onPlay={() => setPlaying(intro.id)} />
          <p className="yt__meta"><span className="pg-chip">{chosen ? 'Start here' : 'Latest session'}</span> {intro.published ? when(intro.published) : 'Come and read with me'}</p>
          <h2 id="cr-intro-title" className="yt__title">{intro.title}</h2>
          <div className="yt__buttons"><a className="pg-btn fm-btn--primary" href={`https://www.youtube.com/watch?v=${intro.id}`} target="_blank" rel="noopener noreferrer" aria-label="Watch on YouTube (opens in a new tab)">Watch on YouTube ↗</a></div>
        </section>
      )}

      {grid.length > 0 && (
        <section className="yt__latest" aria-labelledby="cr-latest-title">
          <h2 id="cr-latest-title" className="yt__h2">Latest sessions</h2>
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
            {grid.length > 4 && !expanded && <button type="button" className="pg-btn yt__more" onClick={() => setExpanded(true)}>Show more sessions</button>}
            {channel && <a className="pg-btn" href={channel} target="_blank" rel="noopener noreferrer" aria-label="See all videos on YouTube (opens in a new tab)">See all videos on YouTube ↗</a>}
          </div>
        </section>
      )}
    </main>
  )
}
