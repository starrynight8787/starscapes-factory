import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { channels } from '../data/channels'
import { cleanEvent, featuredRoomSlug, formatEventWhen, isoToLondonInputs } from '../home/homeRules'
import { fetchFeaturedSlug, listEvents, removeEvent, saveEvent, saveFeaturedSlug } from '../home/homeApi'
import { clearIntroId, fetchIntroId, saveIntroId } from '../den/youtubeApi'
import { videoIdFrom } from '../den/youtubeRules'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'

const BLANK = { title: '', date: '', time: '', description: '', link: '' }

// The owner's tool at /admin/home: choose the featured room, and add the events that the home page's "Next event" box shows (the soonest one that has not
// finished). Times are London time. The database only lets the owner's account change anything.
export default function AdminHome({ session }) {
  useTitle('Home page')
  const { checking, owner } = useOwnerCheck(session)
  const [events, setEvents] = useState([])
  const [featured, setFeatured] = useState('')
  const [status, setStatus] = useState('loading')
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState('')
  const [errors, setErrors] = useState({})
  const [problem, setProblem] = useState('')
  const [saved, setSaved] = useState('')
  const [intro, setIntro] = useState('') // the pinned YouTube video now chosen ('' if none)
  const [introText, setIntroText] = useState('')
  const [introError, setIntroError] = useState('')

  const load = useCallback(async () => {
    try {
      const [list, slug, chosen] = await Promise.all([listEvents(), fetchFeaturedSlug().catch(() => ''), fetchIntroId().catch(() => '')])
      setEvents(list); setFeatured(featuredRoomSlug(slug, channels.map((c) => c.slug))); setIntro(chosen); setStatus('ready')
    } catch (e) { setProblem(e.message); setStatus('error') }
  }, [])
  useEffect(() => { if (owner) load() }, [owner, load])

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Home page</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const summary = Object.entries(errors).map(([id, message]) => ({ id: `ah-${id}`, message }))

  async function submitEvent(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    const result = cleanEvent(form)
    if (!result.ok) { setErrors(result.errors); return }
    setErrors({})
    try { await saveEvent(editing || null, result.value); setSaved(editing ? 'Saved your changes.' : `Added \u201c${result.value.title}\u201d.`); setForm(BLANK); setEditing(''); await load() } catch (e) { setProblem(e.message) }
  }
  async function submitFeatured(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    try { await saveFeaturedSlug(featured); const room = channels.find((c) => c.slug === featured); setSaved(`${room ? room.name : 'That room'} is now the featured room.`) } catch (e) { setProblem(e.message) }
  }

  async function submitIntro(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    const id = videoIdFrom(introText)
    if (!id) { setIntroError('Paste the address of a YouTube video, or its 11-character code.'); return }
    setIntroError('')
    try { await saveIntroId(id); setIntro(id); setIntroText(''); setSaved('That video is now pinned at the top of the YouTube Series page.') } catch (e) { setProblem(e.message) }
  }
  async function unpinIntro() {
    setProblem(''); setSaved('')
    try { await clearIntroId(); setIntro(''); setSaved('Nothing is pinned now, so the YouTube Series page shows its newest video at the top.') } catch (e) { setProblem(e.message) }
  }

  const now = Date.now()
  return (
    <main className="ad ad--wide ab">
      <AdminBanner chip="Home page" title="Home page" subtitle="What the boxes under the floor plan on the home page show: the next event, and the featured room." icon="home" />
      {problem && <FailureMessage title="That did not go through">{problem}</FailureMessage>}
      {saved && <SuccessMessage title={saved} />}

      <div className="ad-cols">
        <div className="ad-col">
      <section className="ad-card ad-group" aria-labelledby="ah-featured-title">
        <h2 id="ah-featured-title">Featured room</h2>
        <form className="ab__form" onSubmit={submitFeatured}>
          <Field id="ah-room" label="Which room to feature" help="It shows with its picture, its description and a button to step inside. If none is chosen, it is the Art Loft.">
            {(p) => <select {...p} value={featured} onChange={(e) => setFeatured(e.target.value)}>{channels.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}
          </Field>
          <button type="submit" className="pg-btn sg-btn--primary">Save the featured room</button>
        </form>
      </section>
      <section className="ad-card ad-group" aria-labelledby="ah-intro-title">
        <h2 id="ah-intro-title">YouTube intro video</h2>
        <p className="ad-note">{intro ? <>Pinned now: <a href={`https://www.youtube.com/watch?v=${intro}`} target="_blank" rel="noopener noreferrer">this video (opens in a new tab)</a>.</> : 'None chosen, so the YouTube Series page pins its newest video.'}</p>
        <form className="ab__form" onSubmit={submitIntro} noValidate>
          <ErrorSummary errors={introError ? [{ id: 'ah-intro', message: introError }] : []} />
          <Field id="ah-intro" label="Address of the video to pin" help="Copy the address from your browser when you are watching it on YouTube." error={introError}>{(p) => <input {...p} type="text" value={introText} onChange={(e) => setIntroText(e.target.value)} />}</Field>
          <div className="ab__buttons">
            <button type="submit" className="pg-btn sg-btn--primary">Pin this video</button>
            {intro && <button type="button" className="pg-btn" onClick={unpinIntro}>Unpin it</button>}
          </div>
        </form>
      </section>
        </div>
        <div className="ad-col">
      <section className="ad-card ad-group" aria-labelledby="ah-event-title">
        <h2 id="ah-event-title">{editing ? 'Change this event' : 'Add an event'}</h2>
        <form className="ab__form" onSubmit={submitEvent} noValidate>
          <ErrorSummary errors={summary} />
          <Field id="ah-title" label="Name of the event" error={errors.title}>{(p) => <input {...p} type="text" value={form.title} onChange={set('title')} />}</Field>
          <Field id="ah-date" label="Day" error={errors.date}>{(p) => <input {...p} type="date" value={form.date} onChange={set('date')} />}</Field>
          <Field id="ah-time" label="Time (London time)" error={errors.time}>{(p) => <input {...p} type="time" value={form.time} onChange={set('time')} />}</Field>
          <Field id="ah-description" label="A line or two about it (optional)" help="What we will do, and how to join." error={errors.description}>{(p) => <input {...p} type="text" value={form.description} onChange={set('description')} />}</Field>
          <Field id="ah-link" label="Link (optional)" help="Where people join or find out more, starting https://. If you leave it empty, the button goes to your Drafting Desk YouTube channel." error={errors.link}>{(p) => <input {...p} type="url" value={form.link} onChange={set('link')} />}</Field>
          <div className="ab__buttons">
            <button type="submit" className="pg-btn sg-btn--primary">{editing ? 'Save changes' : 'Add the event'}</button>
            {editing && <button type="button" className="pg-btn" onClick={() => { setForm(BLANK); setEditing(''); setErrors({}) }}>Cancel</button>}
          </div>
        </form>
      </section>
      <section className="ad-card ad-group" aria-labelledby="ah-list-title">
        <h2 id="ah-list-title">Your events ({events.length})</h2>
        <p className="ad-note">The home page shows the soonest event that has not finished.</p>
        {status === 'loading' && <p className="rp-note">Loading…</p>}
        {status === 'ready' && events.length === 0 && <p className="rp-note">No events yet. The home page says &ldquo;No event planned yet&rdquo;.</p>}
        <ul className="sg__rows">
          {events.map((ev) => {
            const past = new Date(ev.starts_at).getTime() < now
            return (
              <li key={ev.id} className="sg__row">
                <div className="sg__text">
                  <p className="sg__name">{ev.title}</p>
                  <p className="sg__why">{formatEventWhen(ev.starts_at)}{past ? ' · Past' : ''}</p>
                </div>
                <div className="as__buttons">
                  <button type="button" className="pg-btn" onClick={() => { const i = isoToLondonInputs(ev.starts_at); setForm({ title: ev.title, date: i.date, time: i.time, description: ev.description || '', link: ev.link_url || '' }); setEditing(ev.id); setErrors({}); setSaved(''); window.scrollTo && window.scrollTo(0, 0) }}>Change</button>
                  <button type="button" className="pg-btn pg-btn--danger" onClick={() => { if (window.confirm(`Delete \u201c${ev.title}\u201d for good?`)) { removeEvent(ev.id).then(load).catch((e) => setProblem(e.message)) } }}>Delete</button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
        </div>
      </div>
    </main>
  )
}
