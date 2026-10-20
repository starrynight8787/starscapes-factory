import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ShelfBooks } from '../components/PageBanner'
import useTitle from '../rooms/useTitle'
import useUser from '../suggest/useUser'
import { formatDate } from '../rooms/postRules'
import { MEMBERSHIP } from '../data/membership'
import { addComment, canComment, fetchBooks, fetchComments, fetchGoals, removeComment } from './bookApi'
import { BOOK_CLUB_PATH, GENRES, genresOf, STATUSES, aboutParagraphs, bookPath, safeCover, seriesTiles, shelfPath } from './bookRules'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './bookclub.css'
import './bookshelf.css'

const genreOf = (key) => GENRES.find((g) => g.key === key)
const statusOf = (key) => (STATUSES.find((s) => s.key === key) || {}).label
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`

// One book's own page (Figma: "Book detail page · Book Club"): the cover and the facts (when it was published, genre, when it was read, whether it was part of
// that year's theme, series), what it is about, the key characters, your review, a favourite quote, the series tracker, and the members' comments.
export default function BookPage() {
  const { id } = useParams()
  const [books, setBooks] = useState([])
  const [goals, setGoals] = useState({})
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true
    setStatus('loading')
    Promise.all([fetchBooks(), fetchGoals()]).then(([b, g]) => alive && (setBooks(b), setGoals(g), setStatus('ready'))).catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [id])

  const book = books.find((b) => b.id === id) || null
  useTitle(book ? book.title : 'Book')
  const series = useMemo(() => seriesTiles(books, book), [books, book])

  if (status === 'loading') return <main className="rp bc"><p className="rp-note">Loading the book…</p></main>
  if (status === 'error') return <main className="rp bc"><p className="rp-back"><Link to={shelfPath()}>← Back to the bookshelf</Link></p><p className="rp-note" role="alert">The book could not load just now. Please try again in a moment.</p></main>
  if (!book) return <main className="rp bc"><p className="rp-back"><Link to={shelfPath()}>← Back to the bookshelf</Link></p><h1>We couldn&apos;t find that book</h1><p className="rp-note">It may have been taken off the shelf.</p></main>

  const year = String(book.finished || book.started || '').slice(0, 4)
  const theme = year && goals[Number(year)] && goals[Number(year)].theme
  const genreList = genresOf(book).map(genreOf).filter(Boolean)
  const cover = safeCover(book.cover_url)
  const characters = Array.isArray(book.characters) ? book.characters.filter((c) => c && c.name) : []
  const summary = aboutParagraphs(book.about)
  const review = aboutParagraphs(book.review)
  const facts = [
    ['Year published', book.year_published ? String(book.year_published) : 'Not added yet'],
    [genreList.length > 1 ? 'Genres' : 'Genre', genreList.length ? genreList.map((g) => g.label).join(', ') : 'No genre chosen yet'],
    ['Started reading', book.started ? formatDate(book.started) : 'Not recorded'],
    ['Finished', book.finished ? formatDate(book.finished) : (book.status === 'read' ? 'Not recorded' : 'Not finished yet')],
    ['Year shelf', year || 'Not on a shelf yet'],
    ["Part of that year's theme?", book.theme_book ? (theme ? `Yes · ${theme}` : 'Yes') : 'No'],
    ['Series', book.series_name ? `${book.series_name}${book.series_number ? ` · Book ${book.series_number}${book.series_total ? ` of ${book.series_total}` : ''}` : ''}` : 'Not part of a series'],
    ['Status', statusOf(book.status) || ''],
  ]

  return (
    <main className="rp bc bk">
      <p className="rp-back"><Link to={shelfPath(book.genre)}>← Back to the bookshelf</Link></p>

      <div className="pb pb--starry pb--shelf pb__strip" aria-hidden="true"><ShelfBooks /></div>

      <section className="bc__box bk__hero" aria-labelledby="bk-title">
        {cover
          ? <img className="bk__cover" src={cover} alt={`Cover of ${book.title}`} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
          : <div className="bk__cover bk__cover--blank" aria-hidden="true">{book.title}</div>}
        <div className="bk__info">
          <div className="bk__chips">
            {genreList.map((g) => <Link key={g.key} className="bk__chip" to={shelfPath(g.key)}>{g.label} shelf</Link>)}
            {statusOf(book.status) && <span className="bk__chip bk__chip--dark">{statusOf(book.status)}</span>}
            {book.theme_book && <span className="bk__chip bk__chip--gold">★ Part of the {year || ''} theme</span>}
          </div>
          <h1 id="bk-title" className="bk__title">{book.title}</h1>
          {book.author && <p className="bc__muted">by {book.author}</p>}
          {book.rating ? <p className="bk__stars"><span aria-hidden="true">{stars(book.rating)}</span><span>{book.rating} out of 5</span></p> : null}
          <dl className="bk__facts">
            {facts.map(([k, v]) => <div key={k} className="bk__fact"><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      </section>

      <div className="bk__two">
        <section className="bc__box" aria-labelledby="bk-about">
          <h2 id="bk-about" className="bc__big">What it&apos;s about</h2>
          <p className="bk__hint">my summary of the story, no spoilers</p>
          {summary.length > 0 ? <div className="bk__text">{summary.map((p, n) => <p key={n}>{p}</p>)}</div> : <p className="bc__muted">My summary is on its way.</p>}
        </section>
        <section className="bc__box" aria-labelledby="bk-chars">
          <h2 id="bk-chars" className="bc__big">Key characters</h2>
          <p className="bk__hint">who to watch for</p>
          {characters.length > 0
            ? <ul className="bk__chars">{characters.map((c, n) => <li key={n}><span className="bk__avatar" aria-hidden="true" /><p><strong>{c.name}</strong>{c.line && <span>{c.line}</span>}</p></li>)}</ul>
            : <p className="bc__muted">The characters are on their way.</p>}
        </section>
      </div>

      <section className="bc__box" aria-labelledby="bk-review">
        <h2 id="bk-review" className="bc__big">My review {book.rating ? <span className="bk__stars" style={{ display: 'inline-flex' }}><span aria-hidden="true">{stars(book.rating)}</span></span> : null}</h2>
        {review.length > 0 ? <div className="bk__text">{review.map((p, n) => <p key={n}>{p}</p>)}</div> : <p className="bc__muted">{book.note || 'My review is on its way.'}</p>}
        {book.review_post_id && <p><Link className="pg-btn" to={`/post/${book.review_post_id}`}>Read the full review post</Link></p>}
      </section>

      {book.quote && (
        <section className="bc__box bc__box--star" aria-labelledby="bk-quote">
          <h2 id="bk-quote" className="bc__label">My favourite quote</h2>
          <blockquote className="bk__quote">&ldquo;{book.quote}&rdquo;</blockquote>
          <p className="bc__muted">{book.title}{book.quote_page ? `, ${book.quote_page}` : ''}</p>
        </section>
      )}

      {series && (
        <section className="bc__box" aria-labelledby="bk-series">
          <h2 id="bk-series" className="bc__big">Series tracker <span className="bk__chip">{series.name} · {series.readCount} of {series.total} read</span></h2>
          <ul className="bk__tiles">
            {series.tiles.map((t) => {
              const label = t.state === 'read' ? 'Read' : t.state === 'reading' ? 'Reading' : 'Not yet'
              const inner = <><strong>{t.number}</strong><small>{label}</small></>
              return <li key={t.number}>{t.id && t.id !== book.id ? <Link className={`bk__tile bk__tile--${t.state}`} to={bookPath(t.id)} aria-label={`Book ${t.number}: ${label}`}>{inner}</Link> : <span className={`bk__tile bk__tile--${t.state}`} aria-label={`Book ${t.number}: ${label}`}>{inner}</span>}</li>
            })}
          </ul>
          {series.more > 0 && <p className="bc__muted">+ {series.more} more {series.more === 1 ? 'book' : 'books'} in the series</p>}
        </section>
      )}

      <Comments bookId={book.id} />
    </main>
  )
}

// The comments are for Book Club members: the database only hands them to a member (or to the owner), so this box asks first and says plainly if you are not one.
function Comments({ bookId }) {
  const { loading, user } = useUser()
  const [allowed, setAllowed] = useState(null)
  const [list, setList] = useState([])
  const [text, setText] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [owner, setOwner] = useState(false)

  useEffect(() => {
    if (loading) return undefined
    let alive = true
    if (!user) { setAllowed(false); return undefined }
    canComment().then((ok) => {
      if (!alive) return
      setAllowed(ok)
      setOwner(String(user.email || '').toLowerCase() === 'gillian@gillianbennet.com')
      if (ok) fetchComments(bookId).then((c) => alive && setList(c)).catch((e) => alive && setProblem(e.message))
    })
    return () => { alive = false }
  }, [loading, user, bookId])

  const submit = async (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) { setProblem('Write your comment first.'); return }
    setBusy(true); setProblem('')
    try {
      const name = String((user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || String(user.email || '').split('@')[0] || 'Member').slice(0, 60)
      await addComment(bookId, name, body.slice(0, 1000))
      setText('')
      setList(await fetchComments(bookId))
    } catch (err) { setProblem(err.message) }
    setBusy(false)
  }
  const remove = async (id) => {
    try { await removeComment(id); setList((l) => l.filter((c) => c.id !== id)) } catch (err) { setProblem(err.message) }
  }

  return (
    <section className="bc__box" aria-labelledby="bk-comments">
      <h2 id="bk-comments" className="bc__big">Comments <span className="bk__chip bk__chip--gold">Book Club members</span></h2>
      <p className="bk__hint">Part of Book Club membership. Share what you thought.</p>
      {(loading || allowed === null) && !(!loading && !user) && <p className="rp-note">Loading…</p>}
      {!loading && allowed === false && (
        <p className="bc__muted">
          {user ? 'Comments are part of Book Club membership. ' : 'Log in to read and add comments. '}
          {!user && <Link to="/login">Log in</Link>}
          {user && MEMBERSHIP.open === true && <Link to="/membership">Choose your passes</Link>}
          {user && MEMBERSHIP.open !== true && 'Memberships aren’t open yet.'}
        </p>
      )}
      {allowed && (
        <>
          {list.length === 0 && <p className="bc__muted">No comments yet. Be the first.</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {list.map((c) => (
              <li key={c.id} className="bk__comment">
                <span className="bk__avatar" aria-hidden="true" />
                <div>
                  <p className="bk__who">{c.author_name} <span className="bs__muted">{formatDate(c.created_at)}</span></p>
                  <p>{c.body}</p>
                  {(owner || c.user_id === (user && user.id)) && <button type="button" className="bk__link" onClick={() => remove(c.id)}>Delete</button>}
                </div>
              </li>
            ))}
          </ul>
          <form className="bk__form" onSubmit={submit}>
            <label htmlFor="bk-comment" className="bs__sr">Add a comment</label>
            <textarea id="bk-comment" className="bk__textarea" value={text} maxLength={1000} placeholder="Add a comment…" onChange={(e) => setText(e.target.value)} />
            {problem && <p role="alert" className="rp-note">{problem}</p>}
            <div><button type="submit" className="pg-btn sg-btn--primary" disabled={busy}>Post</button></div>
          </form>
        </>
      )}
      {allowed === false && problem && <p role="alert" className="rp-note">{problem}</p>}
    </section>
  )
}
