import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import { PROJECT_SOCIALS } from '../data/contact'
import { Player, when } from '../den/YouTubeSeriesPage'
import { ID, pickGrid, pickIntro } from '../den/youtubeRules'
import { fetchSessions } from './comeWriteApi'
import { INTRO_ID, NEWSLETTER, PAGE } from './comeWriteData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../den/youtube.css'
import './comewrite.css'

// The Come Write With Me page on the Drafting Desk (Gill's sketch: a banner; the pinned intro beside the newsletter box; a grid of videos). It uses the Den's YouTube page
// layout and its video player, but only shows the videos in ONE playlist (see src/draftingdesk/comeWriteData.js), so the channel's other videos stay off it.
export default function ComeWriteWithMePage() {
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
    <main className="rp yt cw">
      <p className="rp-back"><Link to="/drafting-desk">← Back to the Drafting Desk</Link></p>
      <PageBanner title={PAGE.title} subtitle={PAGE.subtitle} picture={PAGE.picture}>
        {channel && <a className="pg-btn fm-btn--primary" href={channel} target="_blank" rel="noopener noreferrer" aria-label="Subscribe on YouTube (opens in a new tab)">Subscribe on YouTube ↗</a>}
      </PageBanner>
      {state.status === 'loading' && <p className="rp-note">Loading…</p>}
      {state.status === 'error' && <p className="rp-note" role="alert">The sessions could not load just now. Please try again in a moment.</p>}
      {state.status === 'ready' && state.videos.length === 0 && !intro && <p className="rp-note">{PAGE.empty}</p>}

      <div className="cw__top">
        {intro && (
          <section className="yt__card yt__intro" aria-labelledby="cw-intro-title">
            <Player video={intro} big playing={playing === intro.id} onPlay={() => setPlaying(intro.id)} />
            <p className="yt__meta"><span className="pg-chip">{chosen ? 'Start here' : 'Latest session'}</span> {intro.published ? when(intro.published) : 'Come and write with me'}</p>
            <h2 id="cw-intro-title" className="yt__title">{intro.title}</h2>
            <div className="yt__buttons"><a className="pg-btn fm-btn--primary" href={`https://www.youtube.com/watch?v=${intro.id}`} target="_blank" rel="noopener noreferrer" aria-label="Watch on YouTube (opens in a new tab)">Watch on YouTube ↗</a></div>
          </section>
        )}
        <section className="cw__newsletter" aria-labelledby="cw-news-title">
          <p className="cw__label">{NEWSLETTER.label}</p>
          <h2 id="cw-news-title" className="cw__title">{NEWSLETTER.title}</h2>
          <p>{NEWSLETTER.text}</p>
          <button type="button" className="pg-btn cw__soon" disabled>{NEWSLETTER.button}</button>
        </section>
      </div>

      {grid.length > 0 && (
        <section className="yt__latest" aria-labelledby="cw-latest-title">
          <h2 id="cw-latest-title" className="yt__h2">Latest sessions</h2>
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
