import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { bookPath } from '../bookclub/bookRules'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { deleteComment, fetchComments } from './commentsAdminApi'
import { NEW_DAYS, bookChoices, filterComments, isNew, paragraphsOf, stats, whenText } from './commentsRules'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'
import './admincomments.css'

// The owner's page at /admin/comments: every comment on the Book Club books, newest first, with a filter for the book and a search of the words. A comment that should not be
// there can be deleted (it asks first, and deleting is for good). The database only lets the owner delete someone else's comment, and says plainly if nothing was deleted.
export default function AdminComments({ session }) {
  useTitle('Manage comments')
  const { checking, owner } = useOwnerCheck(session)
  const [state, setState] = useState({ phase: 'loading', comments: [] })
  const [book, setBook] = useState('all')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState({ kind: '', text: '' })

  useEffect(() => {
    if (!owner) return undefined
    let alive = true
    fetchComments().then((comments) => alive && setState({ phase: 'ready', comments })).catch((e) => alive && setState({ phase: 'error', comments: [], message: e && e.message }))
    return () => { alive = false }
  }, [owner])

  const { comments } = state
  const totals = useMemo(() => stats(comments), [comments])
  const books = useMemo(() => bookChoices(comments), [comments])
  const activeBook = book !== 'all' && !books.some((b) => b.id === book) ? 'all' : book // if the last comment on the chosen book was just deleted, go back to all books
  const shown = useMemo(() => filterComments(comments, { book: activeBook, search }), [comments, activeBook, search])

  async function remove(c) {
    if (!window.confirm('Delete this comment for good? The person who wrote it will not be told.')) return
    setBusy(c.id); setNote({ kind: '', text: '' })
    try {
      await deleteComment(c.id)
      setState((s) => ({ ...s, comments: s.comments.filter((x) => x.id !== c.id) }))
      setNote({ kind: 'done', text: `Deleted the comment by ${c.author || 'someone'}.` })
    } catch (e) {
      setNote({ kind: 'error', text: (e && e.message) || 'That comment could not be deleted just now. Please try again in a moment.' })
    } finally {
      setBusy('')
    }
  }

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Manage comments</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  return (
    <main className="ad ad--wide ac">
      <AdminBanner chip="Manage comments" title="Manage comments" subtitle="Every comment on the Book Club books, newest first. Only Book Club members can write them. You can delete one that should not be there: deleting is for good." icon="comments" room="knowledge-nook" />

      {state.phase === 'loading' && <p className="rp-note">Loading…</p>}
      {state.phase === 'error' && <p className="rp-note" role="alert">{state.message || 'The comments could not load just now. Please try again in a moment.'}</p>}

      {state.phase === 'ready' && (
        <dl className="ac__stats">
          <div><dt>Comments</dt><dd>{totals.total}</dd></div>
          <div><dt>New in the last {NEW_DAYS} days</dt><dd>{totals.recent}</dd></div>
          <div><dt>Books with comments</dt><dd>{totals.books}</dd></div>
          <div><dt>People who have commented</dt><dd>{totals.people}</dd></div>
        </dl>
      )}

      <form className="ac__filters ad-card" onSubmit={(e) => e.preventDefault()}>
        <label className="ac__field">Book
          <select className="ac__control" value={activeBook} onChange={(e) => setBook(e.target.value)}>
            <option value="all">All books ({totals.total})</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title} ({b.count})</option>)}
          </select>
        </label>
        <label className="ac__field">Search the comments
          <input className="ac__control" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Words, a name, or a book" />
        </label>
      </form>

      {note.text && <p className={`ac__note ac__note--${note.kind}`} role={note.kind === 'error' ? 'alert' : undefined} aria-live={note.kind === 'error' ? undefined : 'polite'}>{note.text}</p>}
      {state.phase === 'ready' && <p className="ac__count" role="status">Showing {shown.length} of {comments.length} {comments.length === 1 ? 'comment' : 'comments'}</p>}
      {state.phase === 'ready' && comments.length === 0 && <p className="rp-note">Nobody has commented on a book yet.</p>}
      {state.phase === 'ready' && comments.length > 0 && shown.length === 0 && <p className="rp-note">No comments match.</p>}

      {shown.length > 0 && <ul className="ac__list">
        {shown.map((c) => (
          <li key={c.id} className="ac__row">
            <div className="ac__main">
              <p className="ac__book">{c.bookId ? <Link to={bookPath(c.bookId)}>{c.bookTitle || 'A book with no title'}</Link> : (c.bookTitle || 'A book with no title')}</p>
              <p className="ac__chips"><span className="ac__chip">{c.author || 'No name'}</span>{whenText(c.createdAt) && <span className="ac__date">{whenText(c.createdAt)}</span>}{isNew(c) && <span className="ac__chip ac__chip--new">New</span>}</p>
              <div className="ac__body">{paragraphsOf(c.body).map((p, i) => <p key={i}>{p}</p>)}</div>
            </div>
            <div className="ac__buttons">
              <button type="button" className="pg-btn pg-btn--danger" disabled={busy === c.id} aria-busy={busy === c.id} aria-label={`Delete the comment by ${c.author || 'someone'} on ${c.bookTitle || 'a book'}`} onClick={() => remove(c)}>{busy === c.id ? 'Deleting…' : 'Delete'}</button>
            </div>
          </li>
        ))}
      </ul>}
      <p className="ac__help">Members write comments on a book&apos;s own page. Only you can see this page. A comment you delete is gone for good, and the person is not told.</p>
    </main>
  )
}
