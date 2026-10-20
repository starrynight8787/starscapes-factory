import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { GENRES, STATUSES, charactersToText, cleanBook, cleanGoal } from '../bookclub/bookRules'
import { fetchBooks, fetchGoals, removeBook, saveBook, saveGoal } from '../bookclub/bookApi'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'

const BLANK = { title: '', author: '', genre: '', status: 'read', started: '', finished: '', rating: '', cover: '', review: '', note: '', about: '', yearPublished: '', themeBook: false, characters: '', fullReview: '', quote: '', quotePage: '', seriesName: '', seriesNumber: '', seriesTotal: '' }
const toForm = (b) => ({ title: b.title || '', author: b.author || '', genre: b.genre || '', status: b.status || 'read', started: b.started || '', finished: b.finished || '', rating: b.rating ? String(b.rating) : '', cover: b.cover_url || '', review: b.review_post_id || '', note: b.note || '', about: b.about || '', yearPublished: b.year_published ? String(b.year_published) : '', themeBook: b.theme_book === true, characters: charactersToText(b.characters), fullReview: b.review || '', quote: b.quote || '', quotePage: b.quote_page || '', seriesName: b.series_name || '', seriesNumber: b.series_number ? String(b.series_number) : '', seriesTotal: b.series_total ? String(b.series_total) : '' })

// The owner's tool at /admin/books: add the books you are reading, have read, or will read next, and set each year's reading goal and theme. The Book Club
// page shows them. The database only lets the owner's account change anything.
export default function AdminBooks({ session }) {
  useTitle('Books')
  const { checking, owner } = useOwnerCheck(session)
  const [books, setBooks] = useState([])
  const [goals, setGoals] = useState({})
  const [status, setStatus] = useState('loading')
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState('')
  const [errors, setErrors] = useState({})
  const [goal, setGoal] = useState({ year: String(new Date().getFullYear()), goal: '', theme: '' })
  const [goalErrors, setGoalErrors] = useState({})
  const [problem, setProblem] = useState('')
  const [saved, setSaved] = useState('')

  const load = useCallback(async () => {
    try { const [b, g] = await Promise.all([fetchBooks(), fetchGoals()]); setBooks(b); setGoals(g); setStatus('ready') } catch (e) { setProblem(e.message); setStatus('error') }
  }, [])
  useEffect(() => { if (owner) load() }, [owner, load])

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Books</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const summary = (errs) => Object.entries(errs).map(([id, message]) => ({ id: `ab-${id}`, message }))

  async function submitBook(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    const result = cleanBook(form)
    if (!result.ok) { setErrors(result.errors); return }
    setErrors({})
    try { await saveBook(editing || null, result.value); setSaved(editing ? 'Saved your changes.' : `Added \u201c${result.value.title}\u201d.`); setForm(BLANK); setEditing(''); await load() } catch (e) { setProblem(e.message) }
  }
  async function submitGoal(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    const result = cleanGoal(goal)
    if (!result.ok) { setGoalErrors(result.errors); return }
    setGoalErrors({})
    try { await saveGoal(result.value); setSaved(`Saved the ${result.value.year} goal and theme.`); await load() } catch (e) { setProblem(e.message) }
  }
  const pickYear = (value) => { const g = goals[Number(value)] || {}; setGoal({ year: value, goal: g.goal ? String(g.goal) : '', theme: g.theme || '' }) }

  return (
    <main className="ad ad--wide ab">
      <AdminBanner chip="Book Club" title="Books" subtitle="The books on the Book Club page: what you are reading, what you have read this year, and what is next." icon="books" />
      {problem && <FailureMessage title="That did not go through">{problem}</FailureMessage>}
      {saved && <SuccessMessage title={saved} />}

      <div className="ad-cols">
        <div className="ad-col">
      <section className="ad-card ad-group" aria-labelledby="ab-goal-title">
        <h2 id="ab-goal-title">Reading goal and theme</h2>
        <form className="ab__form" onSubmit={submitGoal} noValidate>
          <ErrorSummary errors={summary(goalErrors).map((e) => ({ ...e, id: `ab-goal-${e.id.slice(3)}` }))} />
          <Field id="ab-goal-year" label="Year" error={goalErrors.year}>{(p) => <input {...p} type="number" value={goal.year} onChange={(e) => pickYear(e.target.value)} />}</Field>
          <Field id="ab-goal-goal" label="Books you want to read that year" help="Leave empty for no goal: the shelf then just counts." error={goalErrors.goal}>{(p) => <input {...p} type="number" value={goal.goal} onChange={(e) => setGoal({ ...goal, goal: e.target.value })} />}</Field>
          <Field id="ab-goal-theme" label="The year's theme" help="Shown as \u201cTheme for 2027: …\u201d. Leave empty to show \u201cto be chosen\u201d." error={goalErrors.theme}>{(p) => <input {...p} type="text" value={goal.theme} onChange={(e) => setGoal({ ...goal, theme: e.target.value })} />}</Field>
          <button type="submit" className="pg-btn sg-btn--primary">Save goal and theme</button>
        </form>
      </section>
      <section className="ad-card ad-group" aria-labelledby="ab-list-title">
        <h2 id="ab-list-title">Your books ({books.length})</h2>
        {status === 'loading' && <p className="rp-note">Loading…</p>}
        {status === 'ready' && books.length === 0 && <p className="rp-note">No books yet.</p>}
        <ul className="sg__rows">
          {books.map((b) => (
            <li key={b.id} className="sg__row">
              <div className="sg__text">
                <p className="sg__name">{b.title}</p>
                <p className="sg__why">{[b.author, (STATUSES.find((s) => s.key === b.status) || {}).label, b.finished].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="as__buttons">
                <button type="button" className="pg-btn" onClick={() => { setForm(toForm(b)); setEditing(b.id); setErrors({}); setSaved(''); window.scrollTo && window.scrollTo(0, 0) }}>Change</button>
                <button type="button" className="pg-btn pg-btn--danger" onClick={() => { if (window.confirm(`Delete \u201c${b.title}\u201d for good?`)) { removeBook(b.id).then(load).catch((e) => setProblem(e.message)) } }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
        </div>
        <div className="ad-col">
      <section className="ad-card ad-group" aria-labelledby="ab-book-title">
        <h2 id="ab-book-title">{editing ? 'Change this book' : 'Add a book'}</h2>
        <form className="ab__form" onSubmit={submitBook} noValidate>
          <ErrorSummary errors={summary(errors)} />
          <Field id="ab-title" label="Title" error={errors.title}>{(p) => <input {...p} type="text" value={form.title} onChange={set('title')} />}</Field>
          <Field id="ab-author" label="Author" error={errors.author}>{(p) => <input {...p} type="text" value={form.author} onChange={set('author')} />}</Field>
          <Field id="ab-genre" label="Genre" error={errors.genre}>{(p) => <select {...p} value={form.genre} onChange={set('genre')}><option value="">None</option>{GENRES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</select>}</Field>
          <Field id="ab-status" label="Where is it?" error={errors.status}>{(p) => <select {...p} value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>}</Field>
          <Field id="ab-started" label="Started (optional)" error={errors.started}>{(p) => <input {...p} type="date" value={form.started} onChange={set('started')} />}</Field>
          <Field id="ab-finished" label="Finished (needed once you have read it)" help="It decides which year's shelf the book sits on." error={errors.finished}>{(p) => <input {...p} type="date" value={form.finished} onChange={set('finished')} />}</Field>
          <Field id="ab-rating" label="Your rating (optional)" error={errors.rating}>{(p) => <select {...p} value={form.rating} onChange={set('rating')}><option value="">No rating</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} out of 5</option>)}</select>}</Field>
          <Field id="ab-cover" label="Cover picture address (optional)" help="A web address starting https:// and ending .jpg, .png or .webp." error={errors.cover}>{(p) => <input {...p} type="url" value={form.cover} onChange={set('cover')} />}</Field>
          <Field id="ab-review" label="Your review or notes (optional)" help="Paste the post's address, or just the code at the end of it." error={errors.review}>{(p) => <input {...p} type="text" value={form.review} onChange={set('review')} />}</Field>
          <Field id="ab-note" label="A short note (optional)" help="A line on why this one, or what it taught you." error={errors.note}>{(p) => <input {...p} type="text" value={form.note} onChange={set('note')} />}</Field>
          <Field id="ab-about" label="What the book is about (optional)" help="A few lines. They show on the Book Club page under the book you are reading now. A blank line starts a new paragraph. Up to 1,000 letters." error={errors.about}>{(p) => <textarea {...p} rows={6} maxLength={1200} value={form.about} onChange={set('about')} />}</Field>
          <h3 className="ab__sub">The book's own page</h3>
          <Field id="ab-yearPublished" label="Year published (optional)" error={errors.yearPublished}>{(p) => <input {...p} type="text" inputMode="numeric" maxLength={4} value={form.yearPublished} onChange={set('yearPublished')} />}</Field>
          <Field id="ab-themeBook" label="Was it part of that year's theme?">{(p) => <select {...p} value={String(form.themeBook)} onChange={(e) => setForm((f) => ({ ...f, themeBook: e.target.value === 'true' }))}><option value="false">No</option><option value="true">Yes</option></select>}</Field>
          <Field id="ab-characters" label="Key characters (optional)" help="One to a line, like: Kinsey Millhone: private investigator. The part after the colon is optional. Up to 12." error={errors.characters}>{(p) => <textarea {...p} rows={5} value={form.characters} onChange={set('characters')} />}</Field>
          <Field id="ab-fullReview" label="Your review (optional)" help="Shows under My review on the book's page. A blank line starts a new paragraph. Up to 6,000 letters." error={errors.fullReview}>{(p) => <textarea {...p} rows={8} value={form.fullReview} onChange={set('fullReview')} />}</Field>
          <Field id="ab-quote" label="Favourite quote (optional)" help="Just the words, without quote marks." error={errors.quote}>{(p) => <textarea {...p} rows={3} value={form.quote} onChange={set('quote')} />}</Field>
          <Field id="ab-quotePage" label="Where the quote is (optional)" help="For example: page 42, or chapter 3." error={errors.quotePage}>{(p) => <input {...p} type="text" value={form.quotePage} onChange={set('quotePage')} />}</Field>
          <Field id="ab-seriesName" label="Series name (optional)" help="Fill this in only if the book is part of a series. Use the same name on every book in it, so they line up in the series tracker." error={errors.seriesName}>{(p) => <input {...p} type="text" value={form.seriesName} onChange={set('seriesName')} />}</Field>
          <Field id="ab-seriesNumber" label="Its place in the series (optional)" help="For example 1 for the first book." error={errors.seriesNumber}>{(p) => <input {...p} type="number" min="1" value={form.seriesNumber} onChange={set('seriesNumber')} />}</Field>
          <Field id="ab-seriesTotal" label="How many books in the series (optional)" error={errors.seriesTotal}>{(p) => <input {...p} type="number" min="1" value={form.seriesTotal} onChange={set('seriesTotal')} />}</Field>
          <div className="ab__buttons">
            <button type="submit" className="pg-btn sg-btn--primary">{editing ? 'Save changes' : 'Add the book'}</button>
            {editing && <button type="button" className="pg-btn" onClick={() => { setForm(BLANK); setEditing(''); setErrors({}) }}>Cancel</button>}
          </div>
        </form>
      </section>
        </div>
      </div>
    </main>
  )
}
