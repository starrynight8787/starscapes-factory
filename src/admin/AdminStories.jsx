import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { cleanChapter, cleanStory, slugFrom } from '../stories/storiesRules'
import { fetchChapterPosts, fetchChapterRows, fetchStories, removeChapter, removeStory, saveChapter, saveStory } from '../stories/storiesApi'
import '../styles/pages.css'
import './admin.css'

const BLANK = { title: '', slug: '', teaser: '', picture: '', status: 'running', finished: '' }
const BLANK_CHAPTER = { story: '', number: '', post: '' }
const toForm = (s) => ({ title: s.title || '', slug: s.slug || '', teaser: s.teaser || '', picture: s.picture_url || '', status: s.status || 'running', finished: s.finished_on || '' })

// The owner's tool at /admin/stories: add a story, say which posts are its chapters (a chapter is an ordinary post: write it in New post, set its pass to Come Write With Me, then
// give it its number here), and mark a story finished. The Stories page shows them. The database only lets the owner's account change anything.
export default function AdminStories({ session }) {
  useTitle('Stories')
  const { checking, owner } = useOwnerCheck(session)
  const [stories, setStories] = useState([])
  const [rows, setRows] = useState([])
  const [titles, setTitles] = useState({})
  const [status, setStatus] = useState('loading')
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState('')
  const [errors, setErrors] = useState({})
  const [chapter, setChapter] = useState(BLANK_CHAPTER)
  const [chapterErrors, setChapterErrors] = useState({})
  const [problem, setProblem] = useState('')
  const [saved, setSaved] = useState('')

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([fetchStories(), fetchChapterRows()])
      setStories(s); setRows(r); setStatus('ready')
      fetchChapterPosts(r.map((x) => x.post_id)).then((posts) => setTitles(Object.fromEntries(posts.map((p) => [p.id, p.title])))).catch(() => {})
    } catch (e) { setProblem(e.message); setStatus('error') }
  }, [])
  useEffect(() => { if (owner) load() }, [owner, load])

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Stories</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setC = (key) => (e) => setChapter((f) => ({ ...f, [key]: e.target.value }))
  const summary = (errs, prefix) => Object.entries(errs).map(([id, message]) => ({ id: `${prefix}-${id}`, message }))

  async function submitStory(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    const result = cleanStory(form)
    if (!result.ok) { setErrors(result.errors); return }
    setErrors({})
    try { await saveStory(editing || null, result.value); setSaved(editing ? 'Saved your changes.' : `Added \u201c${result.value.title}\u201d.`); setForm(BLANK); setEditing(''); await load() } catch (e) { setProblem(e.message) }
  }
  async function submitChapter(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    const result = cleanChapter(chapter)
    if (!result.ok) { setChapterErrors(result.errors); return }
    setChapterErrors({})
    try { await saveChapter(result.value); setSaved(`Chapter ${result.value.number} is saved.`); setChapter({ story: chapter.story, number: String(result.value.number + 1), post: '' }); await load() } catch (e) { setProblem(e.message) }
  }

  return (
    <main className="ad ast">
      <p className="rp-back"><Link to="/admin">← Back to Admin</Link></p>
      <h1>Stories</h1>
      <p className="ad-note">The story we write together, on the Stories page in the Idea Hatchery. A chapter is an ordinary post: write it in New post, choose the pass Come Write With Me, then give it its number here. Chapters 1 to 3 are free to read; chapter 4 and on are for members.</p>
      {problem && <FailureMessage title="That did not go through">{problem}</FailureMessage>}
      {saved && <SuccessMessage title={saved} />}

      <section aria-labelledby="ast-story-title">
        <h2 id="ast-story-title">{editing ? 'Change this story' : 'Add a story'}</h2>
        <form className="ab__form" onSubmit={submitStory} noValidate>
          <ErrorSummary errors={summary(errors, 'ast')} />
          <Field id="ast-title" label="Title" error={errors.title}>{(p) => <input {...p} type="text" value={form.title} onChange={set('title')} />}</Field>
          <Field id="ast-slug" label="Address name (optional)" help={`Letters, numbers and dashes. Leave empty to use ${slugFrom(form.title) || 'one made from the title'}.`} error={errors.slug}>{(p) => <input {...p} type="text" value={form.slug} onChange={set('slug')} />}</Field>
          <Field id="ast-teaser" label="The first lines (optional)" help="A few words to make people want to read on. Up to 300 letters." error={errors.teaser}>{(p) => <textarea {...p} rows={3} value={form.teaser} onChange={set('teaser')} />}</Field>
          <Field id="ast-picture" label="Picture address (optional)" help="A web address starting https:// and ending .jpg, .png or .webp. If you leave it empty, the first chapter's picture is used." error={errors.picture}>{(p) => <input {...p} type="url" value={form.picture} onChange={set('picture')} />}</Field>
          <Field id="ast-status" label="Where is the story?" error={errors.status}>{(p) => <select {...p} value={form.status} onChange={set('status')}><option value="running">Still being written</option><option value="completed">Finished</option></select>}</Field>
          <Field id="ast-finished" label="Finished on (needed once it is finished)" error={errors.finished}>{(p) => <input {...p} type="date" value={form.finished} onChange={set('finished')} />}</Field>
          <div className="ab__buttons">
            <button type="submit" className="pg-btn sg-btn--primary">{editing ? 'Save changes' : 'Add the story'}</button>
            {editing && <button type="button" className="pg-btn" onClick={() => { setForm(BLANK); setEditing(''); setErrors({}) }}>Cancel</button>}
          </div>
        </form>
      </section>

      <section aria-labelledby="ast-chapter-title">
        <h2 id="ast-chapter-title">Make a post a chapter</h2>
        <form className="ab__form" onSubmit={submitChapter} noValidate>
          <ErrorSummary errors={summary(chapterErrors, 'asc')} />
          <Field id="asc-story" label="Story" error={chapterErrors.story}>{(p) => <select {...p} value={chapter.story} onChange={setC('story')}><option value="">Choose a story</option>{stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>}</Field>
          <Field id="asc-number" label="Chapter number" help="Saving a number that is already used replaces that chapter." error={chapterErrors.number}>{(p) => <input {...p} type="number" min="1" value={chapter.number} onChange={setC('number')} />}</Field>
          <Field id="asc-post" label="The post" help="Paste the post's address, or just the code at the end of it." error={chapterErrors.post}>{(p) => <input {...p} type="text" value={chapter.post} onChange={setC('post')} />}</Field>
          <div className="ab__buttons"><button type="submit" className="pg-btn sg-btn--primary">Save the chapter</button></div>
        </form>
      </section>

      <section aria-labelledby="ast-list-title">
        <h2 id="ast-list-title">Your stories ({stories.length})</h2>
        {status === 'loading' && <p className="rp-note">Loading…</p>}
        {status === 'ready' && stories.length === 0 && <p className="rp-note">No stories yet.</p>}
        <ul className="sg__rows">
          {stories.map((s) => {
            const mine = rows.filter((r) => r.story_id === s.id).sort((a, b) => a.number - b.number)
            return (
              <li key={s.id} className="sg__row">
                <div className="sg__text">
                  <p className="sg__name">{s.title}</p>
                  <p className="sg__why">{[s.status === 'completed' ? `Finished ${s.finished_on}` : 'Still being written', `${mine.length} ${mine.length === 1 ? 'chapter' : 'chapters'}`].join(' · ')}</p>
                  <ul>{mine.map((r) => (
                    <li key={r.post_id}>Chapter {r.number}: {titles[r.post_id] || r.post_id.slice(0, 8)}{' '}
                      <button type="button" className="pg-btn" aria-label={`Take chapter ${r.number} of ${s.title} out of the story`} onClick={() => { if (window.confirm(`Take chapter ${r.number} out of \u201c${s.title}\u201d? The post itself stays.`)) removeChapter(s.id, r.number).then(load).catch((e) => setProblem(e.message)) }}>Remove</button>
                    </li>
                  ))}</ul>
                </div>
                <div className="as__buttons">
                  <button type="button" className="pg-btn" onClick={() => { setForm(toForm(s)); setEditing(s.id); setErrors({}); setSaved(''); window.scrollTo && window.scrollTo(0, 0) }}>Change</button>
                  <button type="button" className="pg-btn pg-btn--danger" onClick={() => { if (window.confirm(`Delete \u201c${s.title}\u201d and its list of chapters for good? The posts themselves stay.`)) removeStory(s.id).then(load).catch((e) => setProblem(e.message)) }}>Delete</button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
