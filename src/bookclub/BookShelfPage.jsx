import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import { fetchBooks } from './bookApi'
import { BOOK_CLUB_PATH, GENRES, bookPath, genreShelves, spineClass } from './bookRules'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './bookclub.css'
import './bookshelf.css'

// The bookshelf page (Figma: "Bookshelf page · Book Club"): one shelf for each genre, holding the books read or being read as spines. Pick a genre (tabs on a wide screen,
// a drop-down on a phone) to jump to its shelf, which is highlighted; search by author or title to keep only the matching books. A spine opens that book's own page.
export default function BookShelfPage() {
  useTitle('The bookshelf')
  const [params, setParams] = useSearchParams()
  const genre = [...GENRES.map((g) => g.key), 'other'].includes(params.get('genre')) ? params.get('genre') : ''
  const query = params.get('q') || ''
  const [books, setBooks] = useState([])
  const [status, setStatus] = useState('loading')
  const scrolled = useRef('')

  useEffect(() => {
    let alive = true
    fetchBooks().then((b) => alive && (setBooks(b), setStatus('ready'))).catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [])

  const all = useMemo(() => genreShelves(books), [books])
  const shelves = useMemo(() => genreShelves(books, query), [books, query])
  const searching = query.trim() !== ''
  const visible = searching ? shelves.filter((s) => s.books.length > 0) : shelves
  const countOf = (key) => (all.find((s) => s.key === key) || { books: [] }).books.length

  // Bring the chosen genre's shelf into view (once for each choice, after the books have loaded)
  useEffect(() => {
    if (status !== 'ready' || !genre || scrolled.current === genre) return
    scrolled.current = genre
    const el = document.getElementById(`shelf-${genre}`)
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [status, genre, visible.length])

  const update = (next) => {
    const merged = { genre, q: query, ...next }
    const out = {}
    if (merged.genre) out.genre = merged.genre
    if (merged.q) out.q = merged.q
    setParams(out, { replace: true })
  }
  const choose = (key) => { scrolled.current = ''; update({ genre: key }) }

  return (
    <main className="rp bc bs">
      <p className="rp-back"><Link to={BOOK_CLUB_PATH}>← Back to Book Club</Link></p>
      <PageBanner chip="Members" title="The Bookshelf" subtitle="Every book I've read, shelved by genre. Pick a spine to see my notes." art="nook" />

      <div className="bs__bar">
        <nav className="bs__jump" aria-label="Jump to a shelf">
          <span className="bs__jumplabel">Jump to a shelf</span>
          <div className="bs__tabs">
            {[...GENRES, ...(all.some((x) => x.other) ? [{ key: 'other', label: 'No genre yet' }] : [])].map((g) => (
              <button key={g.key} type="button" className="bs__tab" aria-pressed={genre === g.key} onClick={() => choose(g.key)}>
                {g.label} <span className="bs__count">{countOf(g.key)}</span>
              </button>
            ))}
          </div>
          <div className="bs__select">
            <label htmlFor="bs-genre" className="bs__jumplabel">Jump to a shelf</label>
            <select id="bs-genre" className="bs__selectbox" value={genre} onChange={(e) => choose(e.target.value)}>
              <option value="">All shelves</option>
              {[...GENRES, ...(all.some((x) => x.other) ? [{ key: 'other', label: 'No genre yet' }] : [])].map((g) => <option key={g.key} value={g.key}>{g.label} · {countOf(g.key)} {countOf(g.key) === 1 ? 'book' : 'books'}</option>)}
            </select>
          </div>
        </nav>
        <form className="bs__search" role="search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="bs-search" className="bs__sr">Search by author or title</label>
          <span className="bs__icon" aria-hidden="true" />
          <input id="bs-search" className="bs__input" type="search" value={query} placeholder="Search author or title" onChange={(e) => update({ q: e.target.value })} autoComplete="off" />
        </form>
      </div>

      <section className="bc__box bs__case" aria-labelledby="bs-title">
        <h2 id="bs-title" className="bc__big">My bookshelf</h2>
        <p className="bc__muted">One shelf for each genre.{genre ? ' The shelf you chose is highlighted.' : ''}</p>
        {status === 'error' && <p className="rp-note" role="alert">The books could not load just now. Please try again in a moment.</p>}
        {status === 'loading' && <p className="rp-note">Loading the shelves…</p>}
        {status === 'ready' && searching && visible.length === 0 && <p className="rp-note" role="status">No books match &ldquo;{query.trim()}&rdquo;. Try part of an author&apos;s name or a title.</p>}
        {status === 'ready' && visible.map((s) => (
          <section key={s.key} id={`shelf-${s.key}`} className={`bs__shelf${genre === s.key ? ' bs__shelf--on' : ''}`} aria-labelledby={`bs-h-${s.key}`}>
            <div className="bs__label">
              <h3 id={`bs-h-${s.key}`} className="bs__name">{s.label}</h3>
              <span className="bs__muted">{s.books.length === 0 ? 'No books yet' : `${s.books.length} ${s.books.length === 1 ? 'book' : 'books'}`}</span>
              {genre === s.key && <span className="bs__picked">You picked this shelf</span>}
            </div>
            <div className="bs__cubby">
              {s.books.length === 0 ? (
                <div className="bs__empty"><span className="bs__end" aria-hidden="true" /><p><strong>Nothing on this shelf yet</strong><span>I&apos;m still adding my reads. Check back soon.</span></p><span className="bs__end" aria-hidden="true" /></div>
              ) : (
                <ul className="bs__spines">
                  {s.books.map((b) => (
                    <li key={b.id}>
                      <Link className={`bc__spine bs__spine bc__spine--${b.genre || 'none'} ${spineClass(b.id)}${b.status === 'reading' ? ' bs__spine--now' : ''}`} to={bookPath(b.id)} aria-label={`${b.title}${b.author ? ` by ${b.author}` : ''}${b.status === 'reading' ? ' (reading now)' : ''}`}>
                        <span>{b.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bs__plank" aria-hidden="true" />
          </section>
        ))}
      </section>
    </main>
  )
}
