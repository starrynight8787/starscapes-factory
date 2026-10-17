import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import RoomEntry from '../rooms/RoomEntry'
import { fetchRoomPosts } from '../rooms/roomsApi'
import { inArea } from '../rooms/postRules'
import { PROJECT_SOCIALS } from '../data/contact'
import SuggestPanel from '../suggest/SuggestPanel'
import { NOW_WATCHING, TAGLINE, WHAT_IT_IS, TRACKED, VIDEOS, MOSAIC, HEAVY } from './ledgerData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './ledger.css'

// The Story Ledger page, behind the Nook's television door, from the Figma design. The "suggest and vote" box is the shared one, and appears only
// while it is switched on in Admin. The logo is a file you put at public/story-ledger/logo.png; until it is there the page shows the name as a heading.
export default function StoryLedgerPage() {
  useTitle('Story Ledger')
  const [logoOk, setLogoOk] = useState(true)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const socials = PROJECT_SOCIALS['story-ledger'] || {}

  useEffect(() => {
    let alive = true
    fetchRoomPosts('knowledge-nook')
      .then((data) => alive && (setPosts(data.filter((p) => inArea({ tags: ['story-ledger'] }, p))), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [])

  const squares = Array.from({ length: MOSAIC.total }, (_, i) => i < MOSAIC.done)
  return (
    <main className="rp sl">
      <p className="rp-back"><Link to="/knowledge-nook">← Back to Knowledge Nook</Link></p>

      <header className="sl__hero">
        <h1 className={logoOk ? 'sl__sr' : 'sl__title'}>Story Ledger</h1>
        {logoOk && <img className="sl__logo" src="/story-ledger/logo.png" alt="" onError={() => setLogoOk(false)} />}
        <p className="sl__tagline">{TAGLINE}</p>
        <span className="pg-chip">{NOW_WATCHING}</span>
      </header>

      <section aria-labelledby="sl-what">
        <h2 id="sl-what">What it is</h2>
        {WHAT_IT_IS.map((p) => <p key={p} className="sl__text">{p}</p>)}
      </section>

      <section aria-labelledby="sl-tracked">
        <h2 id="sl-tracked">What gets tracked</h2>
        <ul className="sl__cards">{TRACKED.map(([name, text]) => <li key={name} className="sl__card"><h3>{name}</h3><p>{text}</p></li>)}</ul>
      </section>

      <section aria-labelledby="sl-videos">
        <h2 id="sl-videos">The videos</h2>
        <ul className="sl__cards sl__cards--two">{VIDEOS.map(([name, text]) => <li key={name} className="sl__card"><h3>{name}</h3><p>{text}</p></li>)}</ul>
      </section>

      <section aria-labelledby="sl-mosaic">
        <h2 id="sl-mosaic">The Mosaic</h2>
        <p className="sl__text">
          A printed grid of {MOSAIC.total} squares, coloured in one by one as each episode is watched, until it spells {MOSAIC.show}. {MOSAIC.done} of {MOSAIC.total} so far. ({MOSAIC.breakdown}.)
        </p>
        <div className="sl__mosaic" aria-hidden="true">{squares.map((done, i) => <span key={i} className={done ? 'is-done' : ''} />)}</div>
      </section>

      <aside className="sl__note" aria-labelledby="sl-heavy">
        <h2 id="sl-heavy">{HEAVY.title}</h2>
        <p>{HEAVY.text}</p>
      </aside>

      <section aria-labelledby="sl-find">
        <h2 id="sl-find">Where to find it</h2>
        <div className="sl__buttons">
          {socials.tiktok && <a className="pg-btn sg-btn--primary sl__link" href={socials.tiktok} target="_blank" rel="noopener noreferrer" aria-label="Watch on TikTok (opens in a new tab)">Watch on TikTok ↗</a>}
          {socials.youtube && <a className="pg-btn sg-btn--primary sl__link" href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="Watch on YouTube (opens in a new tab)">Watch on YouTube ↗</a>}
        </div>
      </section>

      <SuggestPanel space="story-ledger" />

      <section aria-labelledby="sl-latest">
        <h2 id="sl-latest">Latest audits</h2>
        {status === 'error' && <p className="rp-note" role="alert">The audits could not load just now. Please try again in a moment.</p>}
        {status === 'ready' && posts.length === 0 && <p className="rp-note">The first audit is on its way.</p>}
        <ul className="rp-entries">{posts.slice(0, 6).map((p) => <li key={p.id}><RoomEntry post={p} picture={false} from="/knowledge-nook/story-ledger" /></li>)}</ul>
      </section>
    </main>
  )
}
