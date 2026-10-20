import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import RoomEntry from '../rooms/RoomEntry'
import { fetchRoomPosts } from '../rooms/roomsApi'
import { inArea, formatDate } from '../rooms/postRules'
import { PROJECT_SOCIALS } from '../data/contact'
import { MEMBERSHIP } from '../data/membership'
import SuggestPanel from '../suggest/SuggestPanel'
import { fetchBooks, fetchGoals } from './bookApi'
import { GENRES, aboutParagraphs, bookPath, genreShelves, progress, safeCover, shelfFor, shelfPath, spineClass, starsText, yearsOf } from './bookRules'
import { COME_READ, GENRES_INTRO, MEMBER_BENEFITS, SHELF_INTRO, SUBTITLE, THEME_FALLBACK, THEME_INTRO, VIDEO_ID, WELCOME } from './bookClubData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './bookclub.css'

const genreOf = (key) => GENRES.find((g) => g.key === key)
const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))

// The Book Club page behind the Nook's door (Figma: "Book Club v3"): a banner; a welcome card and the membership card; this year's theme, the Come Read card,
// reading now, up next and The Shelf (the year tiles); the genres as books on a bookshelf; the chosen year's shelf of spines; and reviews and conversations.
// "now" is only passed in by the tests.
export default function BookClubPage({ now = new Date() }) {
  useTitle('Book Club')
  const thisYear = now.getFullYear()
  const [books, setBooks] = useState([])
  const [goals, setGoals] = useState({})
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [postsStatus, setPostsStatus] = useState('loading')
  const [year, setYear] = useState(thisYear)
  const [picked, setPicked] = useState('')
  const [playing, setPlaying] = useState(false)
  const live = PROJECT_SOCIALS['drafting-desk'] || {}

  useEffect(() => {
    let alive = true
    Promise.all([fetchBooks(), fetchGoals()])
      .then(([b, g]) => alive && (setBooks(b), setGoals(g), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    fetchRoomPosts('knowledge-nook')
      .then((data) => alive && (setPosts(data.filter((p) => inArea({ tags: ['book-club'] }, p))), setPostsStatus('ready')))
      .catch(() => alive && setPostsStatus('error'))
    return () => { alive = false }
  }, [])

  const years = useMemo(() => yearsOf(books, thisYear), [books, thisYear])
  const shelf = useMemo(() => shelfFor(books, year), [books, year])
  const reading = books.filter((b) => b.status === 'reading')
  const upNext = books.filter((b) => b.status === 'upnext')
  const goal = goals[year] || {}
  const bar = progress(shelf.length, goal.goal)
  const theme = (goals[thisYear] && goals[thisYear].theme) || THEME_FALLBACK
  const open = shelf.find((b) => b.id === picked) || null
  const membershipOpen = MEMBERSHIP.open === true
  const videoOk = VIDEO_ID.test(String(WELCOME.videoId || ''))

  // The Shelf: one tile for each year, oldest first, then a dashed empty tile for the year to come. Two tiles to a shelf.
  const tileYears = [...years].sort((a, b) => a - b)
  const nextYear = Math.max(thisYear, ...tileYears) + 1
  const tiles = [...tileYears.map((y) => ({ year: y })), { year: nextYear, empty: true }]
  const noteFor = (y) => {
    const n = shelfFor(books, y).length
    const g = goals[y] && goals[y].goal
    if (y === thisYear && g) return `${n} of ${g} so far`
    return `${n} ${n === 1 ? 'book' : 'books'}`
  }

  return (
    <main className="rp bc">
      <p className="rp-back"><Link to="/knowledge-nook">← Back to Knowledge Nook</Link></p>
      <PageBanner chip="Members" title="Book Club" subtitle={SUBTITLE} art="nook" />

      <div className="bc__intro">
        <section className="bc__box bc__welcome" aria-labelledby="bc-welcome">
          {videoOk ? (
            playing ? (
              <iframe className="bc__video" title={WELCOME.title} src={`https://www.youtube-nocookie.com/embed/${WELCOME.videoId}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              <button type="button" className="bc__video bc__video--poster" onClick={() => setPlaying(true)} aria-label={`Play: ${WELCOME.title}`}>
                <img src={`/api/youtube-thumb?id=${WELCOME.videoId}`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                <span className="bc__play" aria-hidden="true">▶</span>
              </button>
            )
          ) : (
            <div className="bc__video bc__video--none"><span className="bc__play" aria-hidden="true">▶</span><span>{WELCOME.noVideo}</span></div>
          )}
          <div className="bc__welcometext">
            <p className="bc__label">{WELCOME.label}</p>
            <h2 id="bc-welcome" className="bc__script">{WELCOME.title}</h2>
            <p>{WELCOME.text}</p>
          </div>
        </section>

        <section className="bc__box bc__box--star bc__member" aria-labelledby="bc-member">
          <p className="bc__label">Membership{!membershipOpen && <span className="bc__soonchip">Coming soon</span>}</p>
          <h2 id="bc-member" className="bc__script">{MEMBERSHIP.name}</h2>
          <ul className="bc__benefits">{MEMBER_BENEFITS.map((line) => <li key={line}><span aria-hidden="true">✓</span> {line}</li>)}</ul>
          {membershipOpen
            ? <Link className="pg-btn sg-btn--primary bc__wide" to="/membership">Choose your passes</Link>
            : <button type="button" className="pg-btn bc__wide bc__soon" disabled>{MEMBERSHIP.buttonWhileClosed}</button>}
        </section>
      </div>

      <div className="bc__grid">
        <section className="bc__box bc__box--star bc__theme" aria-labelledby="bc-theme">
          <p className="bc__label">This year&apos;s theme</p>
          <h2 id="bc-theme" className="bc__big">Theme for {thisYear}: {theme}</h2>
          <p>{THEME_INTRO}</p>
          <a className="pg-btn" href="#bc-reviews">Join the conversation</a>
        </section>

        <section className="bc__box bc__comecard" aria-labelledby="bc-come">
          <p className="bc__label">Come read</p>
          <h2 id="bc-come" className="bc__script">Read along with me</h2>
          <p>{COME_READ.note}</p>
          {live.youtube && <a className="pg-btn sg-btn--primary bc__come" href={live.youtube} target="_blank" rel="noopener noreferrer" aria-label={`${COME_READ.label} (opens YouTube in a new tab)`}>{COME_READ.label} ↗</a>}
        </section>

        <section className="bc__box bc__reading" aria-labelledby="bc-now">
          <h2 id="bc-now" className="bc__label">Reading now</h2>
          {status === 'error' && <p className="rp-note" role="alert">The books could not load just now. Please try again in a moment.</p>}
          {status === 'ready' && reading.length === 0 && <p className="rp-note">Nothing on the go at the moment.</p>}
          {reading.map((b) => (
            <article key={b.id} className="bc__now">
              <BookCover book={b} />
              <div>
                <h3 className="bc__now-title">{b.title}</h3>
                <p className="bc__muted">{[b.author, b.note].filter(Boolean).join('. ')}</p>
                {aboutParagraphs(b.about).length > 0 && <div className="bc__about">{aboutParagraphs(b.about).map((para, n) => <p key={n}>{para}</p>)}</div>}
                <Link className="pg-btn" to={bookPath(b.id)}>See the book page</Link>
                {b.review_post_id && <Link className="pg-btn" to={`/post/${b.review_post_id}`}>Read my notes</Link>}
              </div>
            </article>
          ))}
        </section>

        <section className="bc__box bc__next" aria-labelledby="bc-next">
          <h2 id="bc-next" className="bc__label">Up next</h2>
          {upNext.length > 0 && <ul className="bc__queue">{upNext.map((b) => <li key={b.id} className="bc__queued">{b.title}{b.author ? `, ${b.author}` : ''}</li>)}</ul>}
          <SuggestPanel space="book-club" />
        </section>

        <section className="bc__box bc__shelfcard" aria-labelledby="bc-years">
          <h2 id="bc-years" className="bc__h3">The Shelf</h2>
          <p className="bc__muted">{SHELF_INTRO}</p>
          <div role="group" aria-label="Choose a year" className="bc__tiles">
            {chunk(tiles, 2).map((pair, i) => (
              <div key={i} className="bc__ledge">
                <div className="bc__tilerow">
                  {pair.map((t) => t.empty
                    ? <div key={t.year} className="bc__tile bc__tile--empty"><span className="bc__tile-year">{t.year}</span><span className="bc__tile-note">To come</span></div>
                    : <button key={t.year} type="button" className="bc__tile" aria-pressed={year === t.year} aria-label={`${t.year}, ${noteFor(t.year)}`} onClick={() => { setYear(t.year); setPicked('') }}><span className="bc__tile-year">{t.year}</span><span className="bc__tile-note">{noteFor(t.year)}</span></button>)}
                </div>
                <div className="bc__ledge-plank" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bc__box bc__genres" aria-labelledby="bc-genres">
        <h2 id="bc-genres" className="bc__h3">Choose a genre</h2>
        <p className="bc__muted">{GENRES_INTRO}</p>
        <p><Link className="pg-btn" to={shelfPath()}>See the whole bookshelf</Link></p>
        <div className="bc__bookshelf">
          <ul className="bc__spines">
            {GENRES.map((g, i) => {
              const n = (genreShelves(books).find((x) => x.key === g.key) || { books: [] }).books.length
              return (
                <li key={g.key} className={`bc__bookitem bc__bookitem--${i % 5}`}>
                  <Link className="bc__book" to={shelfPath(g.key)}>
                    <span className="bc__book-name">{g.label}</span>
                    <span className="bc__book-count">{status === 'ready' ? (n === 0 ? 'Nothing yet' : `${n} ${n === 1 ? 'book' : 'books'}`) : '\u00a0'}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="bc__ledge-plank" aria-hidden="true" />
        </div>
      </section>

      <section className="bc__yearshelf" aria-labelledby="bc-shelf">
        <h2 id="bc-shelf">The {year} shelf</h2>
        <div className="bc__goal">
          <p className="bc__goal-text">{bar.text}{bar.goal ? ' read' : ''} in {year}</p>
          {bar.goal && <div className="bc__bar" role="progressbar" aria-valuemin={0} aria-valuemax={bar.goal} aria-valuenow={Math.min(bar.count, bar.goal)} aria-label={`${bar.text} in ${year}`}><span className={`bc__bar-fill bc__bar-fill--p${Math.round(bar.percent / 5) * 5}`} /></div>}
        </div>
        {status === 'ready' && shelf.length === 0 && <p className="rp-note">No books on the {year} shelf yet.</p>}
        <ul className="bc__shelf">
          {shelf.map((b) => (
            <li key={b.id}>
              <button type="button" className={`bc__spine bc__spine--${b.genre || 'none'} ${spineClass(b.id)}`} aria-pressed={picked === b.id} aria-label={`${b.title}${b.author ? ` by ${b.author}` : ''}`} onClick={() => setPicked(picked === b.id ? '' : b.id)}>
                <span>{b.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="bc__plank" aria-hidden="true" />
        <div className="bc__detail" aria-live="polite">
          {open && (
            <article className="bc__card">
              <BookCover book={open} />
              <div>
                <h3 className="bc__now-title">{open.title}</h3>
                {open.author && <p className="bc__muted">{open.author}</p>}
                {genreOf(open.genre) && <span className="pg-chip">{genreOf(open.genre).label}</span>}
                {open.rating && <p className="bc__stars">{starsText(open.rating)}</p>}
                {open.finished && <p className="bc__muted">Finished {formatDate(open.finished)}</p>}
                {open.note && <p>{open.note}</p>}
                <Link className="pg-btn" to={bookPath(open.id)}>See the book page</Link>
                {open.review_post_id && <Link className="pg-btn" to={`/post/${open.review_post_id}`}>Read my review</Link>}
              </div>
            </article>
          )}
        </div>
      </section>

      <section id="bc-reviews" className="bc__box bc__reviews" aria-labelledby="bc-reviews-title">
        <h2 id="bc-reviews-title" className="bc__big">Reviews and conversations</h2>
        {postsStatus === 'error' && <p className="rp-note" role="alert">The reviews could not load just now. Please try again in a moment.</p>}
        {postsStatus === 'ready' && posts.length === 0 && <p className="rp-note">The first review is on its way.</p>}
        <ul className="rp-entries">{posts.slice(0, 8).map((p) => <li key={p.id}><RoomEntry post={p} picture={false} from="/knowledge-nook/book-club" /></li>)}</ul>
      </section>
    </main>
  )
}

function BookCover({ book }) {
  const cover = safeCover(book.cover_url)
  return cover
    ? <img className="bc__cover" src={cover} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
    : <div className="bc__cover bc__cover--blank" aria-hidden="true"><span>{book.title}</span></div>
}
