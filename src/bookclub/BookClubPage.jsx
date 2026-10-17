import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import RoomEntry from '../rooms/RoomEntry'
import { fetchRoomPosts } from '../rooms/roomsApi'
import { inArea, formatDate } from '../rooms/postRules'
import { PROJECT_SOCIALS } from '../data/contact'
import SuggestPanel from '../suggest/SuggestPanel'
import { fetchBooks, fetchGoals } from './bookApi'
import { GENRES, progress, safeCover, shelfFor, spineClass, starsText, yearsOf } from './bookRules'
import { COME_READ, SUBTITLE, THEME_FALLBACK, THEME_INTRO } from './bookClubData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './bookclub.css'

const genreOf = (key) => GENRES.find((g) => g.key === key)

// The Book Club page behind the Nook's door: a creative reading tracker. From the Figma design (genres, this year's theme, reading now, reviews and
// conversations) plus what was agreed since: the "Come read with me" button to the live reading sessions, the yearly bookshelf with the reading goal,
// and the box where readers suggest and vote on the next book. "now" is only passed in by the tests.
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
  const countFor = (key) => posts.filter((p) => inArea({ tags: [key] }, p)).length

  return (
    <main className="rp bc">
      <p className="rp-back"><Link to="/knowledge-nook">← Back to Knowledge Nook</Link></p>
      <header className="rp-head">
        <h1>Book Club</h1>
        <p className="rp-blurb">{SUBTITLE}</p>
        {live.youtube && (
          <div className="bc__live">
            <a className="pg-btn sg-btn--primary bc__come" href={live.youtube} target="_blank" rel="noopener noreferrer" aria-label={`${COME_READ.label} (opens YouTube in a new tab)`}>{COME_READ.label} ↗</a>
            <span className="bc__live-note">{COME_READ.note}</span>
          </div>
        )}
      </header>

      <section aria-labelledby="bc-genres">
        <h2 id="bc-genres">Choose a genre</h2>
        <ul className="bc__genres">
          {GENRES.map((g) => {
            const n = countFor(g.key)
            return (
              <li key={g.key}>
                <Link className="bc__genre" to={`/blog?tag=${g.key}`}>
                  <span className="bc__genre-name">{g.label}</span>
                  <span className="bc__genre-count">{postsStatus === 'ready' ? (n === 0 ? 'No notes yet' : `${n} ${n === 1 ? 'note' : 'notes'}`) : '\u00a0'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="bc__theme" aria-labelledby="bc-theme">
        <span className="pg-chip">This year&apos;s theme</span>
        <h2 id="bc-theme">Theme for {thisYear}: {theme}</h2>
        <p>{THEME_INTRO}</p>
        <a className="pg-btn" href="#bc-reviews">Join the conversation</a>
      </section>

      <section aria-labelledby="bc-now">
        <h2 id="bc-now">Reading now</h2>
        {status === 'error' && <p className="rp-note" role="alert">The books could not load just now. Please try again in a moment.</p>}
        {status === 'ready' && reading.length === 0 && <p className="rp-note">Nothing on the go at the moment.</p>}
        {reading.map((b) => (
          <article key={b.id} className="bc__now">
            <BookCover book={b} />
            <div>
              <span className="pg-chip bc__now-chip">Reading now</span>
              <h3 className="bc__now-title">{b.title}</h3>
              <p className="bc__muted">{[b.author, b.note].filter(Boolean).join('. ')}</p>
              {b.review_post_id && <Link className="pg-btn" to={`/post/${b.review_post_id}`}>Read my notes</Link>}
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="bc-next">
        <h2 id="bc-next">Up next</h2>
        {upNext.length > 0 && <ul className="bc__queue">{upNext.map((b) => <li key={b.id} className="pg-chip">{b.title}{b.author ? `, ${b.author}` : ''}</li>)}</ul>}
        <SuggestPanel space="book-club" />
      </section>

      <section aria-labelledby="bc-shelf">
        <h2 id="bc-shelf">The shelf</h2>
        <div className="pg-filter" role="group" aria-label="Choose a year">
          {years.map((y) => <button key={y} type="button" className="pg-chip" aria-pressed={year === y} onClick={() => { setYear(y); setPicked('') }}>{y}</button>)}
        </div>
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
                {open.review_post_id && <Link className="pg-btn" to={`/post/${open.review_post_id}`}>Read my review</Link>}
              </div>
            </article>
          )}
        </div>
      </section>

      <section id="bc-reviews" aria-labelledby="bc-reviews-title">
        <h2 id="bc-reviews-title">Reviews and conversations</h2>
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
