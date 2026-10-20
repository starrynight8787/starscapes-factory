import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { ISSUE_WORDS, STATUS_WORDS, cleanDraft, renderNewsletter } from '../newsletter/newsletterRules'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { deleteDraft, fetchNewsletter, removeSubscriber, retryFailed, saveDraft, sendStep, sendTest } from './newsletterAdminApi'
import { SUBSCRIBER_FILTERS, counts, filterSubscribers, issueLine, peopleWords, personWhen, progressText } from './newsletterAdminRules'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'
import './adminnewsletter.css'

const EMPTY = { id: '', subject: '', body: '' }
const MAX_STEPS = 400 // a safety stop: 400 presses of fifty is twenty thousand people

// The owner's page at /admin/newsletter: who is signed up, a place to write a newsletter (with a preview and a test to yourself), sending it, and the ones already sent.
// The list is the shop's own; Resend only delivers. A newsletter goes only to people who confirmed, fifty at a time, and carries on from where it stopped if it is interrupted.
export default function AdminNewsletter({ session }) {
  useTitle('Newsletter')
  const { checking, owner } = useOwnerCheck(session)
  const [state, setState] = useState({ phase: 'loading', open: false, subscribers: [], issues: [] })
  const [form, setForm] = useState(EMPTY)
  const [problem, setProblem] = useState(null) // { field, message }
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState('') // what is happening now: save, test, send, or an id
  const [progress, setProgress] = useState(null)
  const [note, setNote] = useState({ kind: '', text: '' })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const refs = useRef({})

  const load = () => fetchNewsletter().then((r) => setState({ phase: 'ready', ...r })).catch((e) => setState((s) => ({ ...s, phase: 'error', message: e && e.message })))
  useEffect(() => {
    if (!owner) return undefined
    let alive = true
    fetchNewsletter().then((r) => alive && setState({ phase: 'ready', ...r })).catch((e) => alive && setState((s) => ({ ...s, phase: 'error', message: e && e.message })))
    return () => { alive = false }
  }, [owner])

  const { subscribers, issues } = state
  const totals = useMemo(() => counts(subscribers), [subscribers])
  const shown = useMemo(() => filterSubscribers(subscribers, { status: filter, search }), [subscribers, filter, search])
  const checked = useMemo(() => cleanDraft(form), [form])
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setProblem(null); setNote({ kind: '', text: '' }) }
  const say = (kind, text) => setNote({ kind, text })

  function show(field, message) {
    setProblem({ field, message })
    const el = refs.current[field]
    if (el && el.focus) el.focus()
  }
  const draftOrShow = () => { if (!checked.ok) { show(checked.field, checked.message); return false } return true }

  async function save() {
    if (!draftOrShow()) return null
    setBusy('save'); setProblem(null); say('', '')
    try {
      const issue = await saveDraft({ id: form.id, ...checked.value })
      setForm({ id: issue.id, subject: issue.subject, body: issue.body })
      await load()
      say('done', 'Draft saved.')
      return issue
    } catch (e) {
      if (e && e.field) show(e.field, e.message); else say('error', (e && e.message) || 'The draft could not be saved just now. Please try again in a moment.')
      return null
    } finally { setBusy('') }
  }

  async function test() {
    if (!draftOrShow()) return
    setBusy('test'); setProblem(null); say('', '')
    try { const r = await sendTest(checked.value); say('done', `A test was sent to ${r.to}. It can take a minute to arrive.`) } catch (e) { say('error', (e && e.message) || 'The test could not be sent just now. Please try again in a moment.') } finally { setBusy('') }
  }

  async function run(id) { // sends the next fifty, again and again, until it is done or something stops it
    setBusy('send')
    try {
      for (let n = 0; n < MAX_STEPS; n += 1) {
        const r = await sendStep(id)
        setProgress({ sent: r.sent, total: r.total, failed: r.failed, remaining: r.remaining })
        if (r.stopped) { say('error', r.message); break }
        if (r.done) { say('done', `Finished: ${progressText(r)}.`); break }
      }
    } catch (e) {
      say('error', (e && e.message) || 'The newsletter could not carry on just now. Nothing was lost: press Send again in a moment.')
    } finally { setBusy(''); await load() }
  }

  async function sendNow() {
    if (!draftOrShow()) return
    if (totals.confirmed === 0) { say('error', 'Nobody has confirmed yet, so there is nobody to send it to.'); return }
    if (!window.confirm(`Send “${checked.value.subject}” to ${peopleWords(totals.confirmed)} now? You cannot take it back.`)) return
    setProgress(null)
    const issue = await save()
    if (issue) await run(issue.id)
  }

  async function carryOn(i) {
    if (!window.confirm(`Carry on sending “${i.subject}”?`)) return
    setProgress(null); say('', ''); await run(i.id)
  }
  async function again(i) {
    setBusy(i.id); say('', '')
    try { await retryFailed(i.id) } catch (e) { say('error', (e && e.message) || 'That could not be done just now.'); setBusy(''); return }
    setBusy(''); setProgress(null); await run(i.id)
  }
  async function discard(i) {
    if (!window.confirm(`Delete the draft “${i.subject}”? This cannot be undone.`)) return
    setBusy(i.id); say('', '')
    try { await deleteDraft(i.id); if (form.id === i.id) setForm(EMPTY); await load(); say('done', 'Draft deleted.') } catch (e) { say('error', (e && e.message) || 'The draft could not be deleted just now.') } finally { setBusy('') }
  }
  async function takeOut(p) {
    if (!window.confirm(`Remove ${p.email} and everything kept about them, for good? If they sign up again they start from the beginning.`)) return
    setBusy(p.id); say('', '')
    try { await removeSubscriber(p.id); setState((s) => ({ ...s, subscribers: s.subscribers.filter((x) => x.id !== p.id) })); say('done', `Removed ${p.email}.`) } catch (e) { say('error', (e && e.message) || 'That person could not be removed just now.') } finally { setBusy('') }
  }
  const edit = (i) => { setForm({ id: i.id, subject: i.subject, body: i.body }); setProblem(null); setPreview(false); say('', ''); if (refs.current.subject) refs.current.subject.focus() }

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Newsletter</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  const err = (f) => (problem && problem.field === f ? problem.message : '')
  const aria = (f) => ({ 'aria-invalid': err(f) ? 'true' : undefined, 'aria-describedby': err(f) ? `nl-${f}-error` : undefined })
  const sending = busy === 'send'
  const previewHtml = checked.ok ? renderNewsletter({ subject: checked.value.subject, body: checked.value.body, unsubscribeUrl: 'https://starscapesfactory.com/newsletter/unsubscribe' }).html : ''

  return (
    <main className="ad ad--wide nlw">
      <AdminBanner chip="Newsletter" title="Newsletter" subtitle="Write a newsletter and send it to the people who have confirmed. Someone only joins after pressing the link in the confirmation email we send them." icon="newsletter" room="drafting-desk" />

      {state.phase === 'ready' && (
        <p className={`nlw__mode nlw__mode--${state.open ? 'open' : 'closed'}`} role="note">
          <strong>{state.open ? 'The sign-up box is showing to visitors.' : 'The sign-up box is not showing to visitors yet.'}</strong> {state.open ? 'Anyone can sign up from the footer of the site.' : 'It opens when NEWSLETTER_OPEN is set to yes in Vercel: do that only once the Privacy policy is live. You can still write and test newsletters.'}
        </p>
      )}
      {state.phase === 'loading' && <p className="rp-note">Loading…</p>}
      {state.phase === 'error' && <p className="rp-note" role="alert">{state.message || 'The newsletter could not load just now. Please try again in a moment.'}</p>}
      {note.text && <p className={`nlw__note nlw__note--${note.kind}`} role={note.kind === 'error' ? 'alert' : undefined} aria-live={note.kind === 'error' ? undefined : 'polite'}>{note.text}</p>}

      <section className="nlw__section ad-card" aria-labelledby="nlw-write">
        <h2 id="nlw-write">Write a newsletter</h2>
        <form className="nlw__form" onSubmit={(e) => e.preventDefault()} noValidate>
          {problem && <p className="nlw__summary" role="alert">{problem.message}</p>}
          <div className="nlw__field">
            <label htmlFor="nl-subject">Subject</label>
            <input id="nl-subject" className="nlw__control" type="text" value={form.subject} onChange={set('subject')} ref={(el) => { refs.current.subject = el }} {...aria('subject')} />
            {err('subject') && <p id="nl-subject-error" className="nlw__error">{err('subject')}</p>}
          </div>
          <div className="nlw__field">
            <label htmlFor="nl-body">The newsletter</label>
            <textarea id="nl-body" className="nlw__control nlw__textarea" rows={14} value={form.body} onChange={set('body')} ref={(el) => { refs.current.body = el }} {...aria('body')} />
            {err('body') && <p id="nl-body-error" className="nlw__error">{err('body')}</p>}
            <details className="nlw__help">
              <summary>How to lay it out</summary>
              <ul>
                <li>A blank line starts a new paragraph.</li>
                <li><strong>## A heading</strong> on a line of its own makes a heading.</li>
                <li>Lines that start with <strong>- </strong> make a list.</li>
                <li><strong>**bold**</strong> makes words bold.</li>
                <li><strong>[the words](https://the-address)</strong> makes a link. Only https:// and mailto: links work.</li>
              </ul>
              <p>Every newsletter ends with a link to unsubscribe and the company details automatically: you do not need to write those.</p>
            </details>
          </div>
          <div className="nlw__buttons">
            <button type="button" className="nlw__button" onClick={() => setPreview((p) => !p)} aria-expanded={preview}>{preview ? 'Hide the preview' : 'Preview'}</button>
            <button type="button" className="nlw__button" onClick={save} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
            <button type="button" className="nlw__button" onClick={test} disabled={Boolean(busy)}>{busy === 'test' ? 'Sending the test…' : 'Send a test to me'}</button>
            <button type="button" className="nlw__button nlw__button--send" onClick={sendNow} disabled={Boolean(busy)} aria-busy={sending}>{sending ? 'Sending…' : `Send to ${peopleWords(totals.confirmed)}`}</button>
            {form.id && <button type="button" className="nlw__button" onClick={() => { setForm(EMPTY); setProblem(null); say('', '') }} disabled={Boolean(busy)}>Start a new one</button>}
          </div>
          {progress && <p className="nlw__progress" aria-live="polite">{sending ? 'Sending: ' : ''}{progressText(progress)}</p>}
        </form>
        {preview && (
          <div className="nlw__preview">
            <h3>Preview of the email</h3>
            {checked.ok ? <iframe className="nlw__frame" title="Preview of the email" sandbox="" srcDoc={previewHtml} /> : <p className="nlw__hint">{checked.message}</p>}
            <p className="nlw__hint">The unsubscribe link in the real email is different for each person.</p>
          </div>
        )}
      </section>

      <section className="nlw__section" aria-labelledby="nlw-issues">
        <h2 id="nlw-issues">Your newsletters</h2>
        {state.phase === 'ready' && issues.length === 0 && <p className="rp-note">Nothing written yet.</p>}
        {issues.length > 0 && (
          <ul className="nlw__list">
            {issues.map((i) => (
              <li key={i.id} className="nlw__row">
                <div className="nlw__main">
                  <p className="nlw__title"><span>{i.subject}</span> <span className={`nlw__chip nlw__chip--${i.status}`}>{ISSUE_WORDS[i.status]}</span></p>
                  <p className="nlw__meta">{issueLine(i)}</p>
                  {i.failed > 0 && <p className="nlw__meta nlw__meta--warn">{peopleWords(i.failed)} could not be sent.</p>}
                </div>
                <div className="nlw__buttons">
                  {i.status === 'draft' && <button type="button" className="nlw__button" onClick={() => edit(i)} disabled={Boolean(busy)} aria-label={`Edit the draft ${i.subject}`}>Edit</button>}
                  {i.status === 'draft' && <button type="button" className="nlw__button" onClick={() => discard(i)} disabled={Boolean(busy)} aria-label={`Delete the draft ${i.subject}`}>Delete</button>}
                  {i.status === 'sending' && <button type="button" className="nlw__button" onClick={() => carryOn(i)} disabled={Boolean(busy)} aria-label={`Carry on sending ${i.subject}`}>Carry on sending</button>}
                  {i.status === 'sent' && i.failed > 0 && <button type="button" className="nlw__button" onClick={() => again(i)} disabled={Boolean(busy)} aria-label={`Try again to send ${i.subject} to the ${i.failed} it missed`}>Try those again</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="nlw__section ad-card" aria-labelledby="nlw-people">
        <h2 id="nlw-people">Who is signed up</h2>
        {state.phase === 'ready' && (
          <>
            <dl className="nlw__stats">
              <div><dt>Confirmed</dt><dd>{totals.confirmed}</dd></div>
              <div><dt>Waiting to confirm</dt><dd>{totals.pending}</dd></div>
              <div><dt>Unsubscribed</dt><dd>{totals.unsubscribed}</dd></div>
            </dl>
            <form className="nlw__filters" onSubmit={(e) => e.preventDefault()}>
              <div className="nlw__field">
                <label htmlFor="nl-filter">Show</label>
                <select id="nl-filter" className="nlw__control" value={filter} onChange={(e) => setFilter(e.target.value)}>{SUBSCRIBER_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
              </div>
              <div className="nlw__field">
                <label htmlFor="nl-search">Search the emails</label>
                <input id="nl-search" className="nlw__control" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Part of an email address" />
              </div>
            </form>
            <p className="nlw__count" role="status">Showing {shown.length} of {subscribers.length} {subscribers.length === 1 ? 'person' : 'people'}</p>
            {subscribers.length === 0 && <p className="rp-note">Nobody has signed up yet.</p>}
            {subscribers.length > 0 && shown.length === 0 && <p className="rp-note">Nobody matches.</p>}
            {shown.length > 0 && (
              <ul className="nlw__list">
                {shown.map((p) => (
                  <li key={p.id} className="nlw__row">
                    <div className="nlw__main">
                      <p className="nlw__title"><span className="nlw__email">{p.email}</span> <span className={`nlw__chip nlw__chip--${p.status}`}>{STATUS_WORDS[p.status]}</span></p>
                      <p className="nlw__meta">{personWhen(p)}{p.source === 'ebook' ? ', from the ebook page' : ''}</p>
                    </div>
                    <div className="nlw__buttons"><button type="button" className="nlw__button" onClick={() => takeOut(p)} disabled={Boolean(busy)} aria-label={`Remove ${p.email} for good`}>Remove</button></div>
                  </li>
                ))}
              </ul>
            )}
            <p className="nlw__hint">Someone who unsubscribes stays on this list, marked Unsubscribed, so they are never emailed again. <strong>Remove</strong> deletes them completely, for example if they ask you to erase their details.</p>
          </>
        )}
      </section>
    </main>
  )
}
