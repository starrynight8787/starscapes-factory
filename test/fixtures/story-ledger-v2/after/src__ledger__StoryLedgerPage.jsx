import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import { fetchRoomPosts } from '../rooms/roomsApi'
import { formatDate, inArea, safeImage } from '../rooms/postRules'
import { PROJECT_SOCIALS } from '../data/contact'
import { StarMark } from '../components/Logo'
import SuggestPanel from '../suggest/SuggestPanel'
import { NOW_WATCHING, TAGLINE, WHAT_IT_IS, VIDEOS, MOSAIC, HEAVY, CURRENTLY, SUBSCRIBE, PREVIOUS_COUNT } from './ledgerData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../styles/forms.css'
import './ledger.css'

function Picture({ post, className }) {
  const src = post ? safeImage(post.image_url) : ''
  return src
    ? <img className={className} src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
    : <div className={`${className} sl__img--empty`}><StarMark width={48} color="#14306A" /></div>
}

// The Story Ledger page, behind the Nook's television door, from the Figma design "Story Ledger v2": the black banner, then boxes side by side. Latest video
// and Previous audits fill themselves from the Nook's posts tagged story-ledger (the newest is the Latest video). The "suggest and vote" box is the shared one,
// and appears only while it is switched on in Admin. The logo is a file you put at public/story-ledger/logo.png; until it is there the page shows the name.
export default function StoryLedgerPage() {
  useTitle('Story Ledger')
  const [logoOk, setLogoOk] = useState(true)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const socials = PROJECT_SOCIALS['story-ledger'] || {}
  const from = useLocation().pathname

  useEffect(() => {
    let alive = true
    fetchRoomPosts('knowledge-nook')
      .then((data) => alive && (setPosts(data.filter((p) => inArea({ tags: ['story-ledger'] }, p))), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [])

  const latest = posts[0] || null
  const previous = useMemo(() => posts.slice(1, 1 + PREVIOUS_COUNT), [posts])
  const squares = Array.from({ length: MOSAIC.total }, (_, i) => i < MOSAIC.done)
  const logo = logoOk ? <img className="sl__logo" src="/story-ledger/logo.png" alt="" onError={() => setLogoOk(false)} /> : null

  return (
    <main className="rp sl">
      <p className="rp-back"><Link to="/knowledge-nook">← Back to Knowledge Nook</Link></p>

      <header className="sl__hero">
        <h1 className={logoOk ? 'sl__sr' : 'sl__title'}>Story Ledger</h1>
        {logo}
        <p className="sl__tagline">{TAGLINE}</p>
        <span className="sl__chip">{NOW_WATCHING}</span>
      </header>

      <div className="sl__row sl__row--wide">
        <div className="sl__card sl__about">
          <section className="sl__half" aria-labelledby="sl-what">
            <h2 id="sl-what" className="sl__h2">What it is</h2>
            {WHAT_IT_IS.map((p) => <p key={p} className="sl__text">{p}</p>)}
            <aside className="sl__note" aria-labelledby="sl-heavy">
              <h3 id="sl-heavy" className="sl__h4">{HEAVY.title}</h3>
              <p>{HEAVY.text}</p>
            </aside>
          </section>
          <section className="sl__half sl__half--now" aria-labelledby="sl-now">
            <p className="sl__label">Currently watching <span className="sl__chip">{CURRENTLY.season}</span></p>
            <h2 id="sl-now" className="sl__h3">{CURRENTLY.show}</h2>
            <p className="sl__text">{CURRENTLY.blurb}</p>
            <ul className="sl__facts">{CURRENTLY.facts.map(([number, label]) => <li key={label} className="sl__fact"><strong>{number}</strong><span>{label}</span></li>)}</ul>
            <p className="sl__years">{CURRENTLY.years} {MOSAIC.done} of {MOSAIC.total} watched so far.</p>
          </section>
        </div>

        <section className="sl__card sl__subscribe" aria-labelledby="sl-subscribe">
          {logo}
          <p className="sl__label">Subscribe</p>
          <h2 id="sl-subscribe" className="sl__h2">{SUBSCRIBE.title}</h2>
          <p className="sl__text">{SUBSCRIBE.text}</p>
          {socials.youtube && <a className="pg-btn fm-btn--primary" href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="Subscribe on YouTube (opens in a new tab)">Subscribe on YouTube ↗</a>}
          {socials.tiktok && <a className="pg-btn" href={socials.tiktok} target="_blank" rel="noopener noreferrer" aria-label="Follow on TikTok (opens in a new tab)">Follow on TikTok ↗</a>}
        </section>
      </div>

      <div className="sl__row sl__row--wide">
        <section className="sl__card" aria-labelledby="sl-videos">
          <h2 id="sl-videos" className="sl__h2">The videos</h2>
          <p className="sl__text">New videos appear latest first.</p>
          <ul className="sl__types">{VIDEOS.map(([name, text]) => <li key={name} className="sl__type"><h3 className="sl__h4">{name}</h3><p>{text}</p></li>)}</ul>
        </section>

        <section className="sl__card" aria-labelledby="sl-previous">
          <h2 id="sl-previous" className="sl__h3">Previous audits</h2>
          {status === 'error' && <p className="rp-note" role="alert">The audits could not load just now. Please try again in a moment.</p>}
          {status === 'ready' && previous.length === 0 && <p className="sl__text">More audits are on their way.</p>}
          {previous.length > 0 && (
            <ul className="sl__previous">
              {previous.map((p) => (
                <li key={p.id}>
                  <Link className="sl__audit" to={`/post/${p.id}`} state={{ from }}>
                    <Picture post={p} className="sl__thumb" />
                    <span className="sl__audittext"><span className="sl__audittitle">{p.title}</span>{formatDate(p.created_at) && <span className="sl__auditdate">{formatDate(p.created_at)}</span>}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {socials.youtube && <a className="pg-btn" href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="See all audits on YouTube (opens in a new tab)">See all audits on YouTube ↗</a>}
        </section>
      </div>

      <div className="sl__row sl__row--even">
        <section className="sl__card" aria-labelledby="sl-mosaic">
          <h2 id="sl-mosaic" className="sl__h2">The Mosaic</h2>
          <p className="sl__text">
            A printed grid of {MOSAIC.total} squares, coloured in one by one as each episode is watched, until it spells {MOSAIC.show}. {MOSAIC.done} of {MOSAIC.total} so far. ({MOSAIC.breakdown}.)
          </p>
          <div className="sl__mosaic" aria-hidden="true">{squares.map((done, i) => <span key={i} className={done ? 'is-done' : ''} />)}</div>
        </section>

        <section className="sl__card" aria-labelledby="sl-latest">
          <h2 id="sl-latest" className="sl__h2">Latest video</h2>
          {latest ? (
            <>
              <Picture post={latest} className="sl__video" />
              <h3 className="sl__latesttitle">{latest.title}</h3>
              {formatDate(latest.created_at) && <p className="sl__auditdate">{formatDate(latest.created_at)}</p>}
              <div className="sl__buttons">
                <Link className="pg-btn fm-btn--primary" to={`/post/${latest.id}`} state={{ from }}>Read the audit</Link>
                {socials.youtube && <a className="pg-btn" href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="Watch on YouTube (opens in a new tab)">Watch on YouTube ↗</a>}
              </div>
            </>
          ) : (
            status === 'ready' && <p className="sl__text">The first audit is on its way.</p>
          )}
          {status === 'loading' && <p className="sl__text">Loading…</p>}
        </section>
      </div>

      <div className="sl__row sl__row--even sl__row--last">
        <section className="sl__card sl__where" aria-labelledby="sl-where">
          <h2 id="sl-where" className="sl__h3">Where to watch</h2>
          <p className="sl__text">Every new video goes up on both.</p>
          <div className="sl__buttons">
            {socials.tiktok && <a className="pg-btn fm-btn--primary" href={socials.tiktok} target="_blank" rel="noopener noreferrer" aria-label="Watch on TikTok (opens in a new tab)">Watch on TikTok ↗</a>}
            {socials.youtube && <a className="pg-btn fm-btn--primary" href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="Watch on YouTube (opens in a new tab)">Watch on YouTube ↗</a>}
          </div>
        </section>
        <SuggestPanel space="story-ledger" />
      </div>
    </main>
  )
}
