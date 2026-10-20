import { useCallback, useEffect, useState } from 'react'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import { chooseWinner, closeVoteNow, fetchResults, fetchVotes, removeVote, saveVote } from '../stories/votesApi'
import { DEFAULT_QUESTION, LETTERS, MAX_OPTIONS, MIN_OPTIONS, cleanVote, closesText, isOpen, optionsOf, tally } from '../stories/votesRules'
import './admin.css'

const BLANK = { story: '', after: '', question: '', closes: '', options: ['', '', ''] }

// The owner's part of the story vote, inside the Stories tool: make a vote (after which chapter, the question, when it closes, and two to six choices), close it early, say which choice won, or delete it.
// The numbers are shown to the owner at any time (the database hands them over to her alone while a vote is open).
export default function AdminStoryVotes({ stories, rows }) {
  const [data, setData] = useState({ votes: [], options: [] })
  const [counts, setCounts] = useState({})
  const [status, setStatus] = useState('loading')
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [problem, setProblem] = useState('')
  const [saved, setSaved] = useState('')
  const [winner, setWinner] = useState({})

  const load = useCallback(async () => {
    try {
      const d = await fetchVotes()
      setData(d); setStatus('ready')
      const pairs = await Promise.all(d.votes.map(async (v) => [v.id, await fetchResults(v.id)]))
      setCounts(Object.fromEntries(pairs))
    } catch (e) { setProblem(e.message); setStatus('error') }
  }, [])
  useEffect(() => { load() }, [load])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setOption = (i) => (e) => setForm((f) => ({ ...f, options: f.options.map((o, n) => (n === i ? e.target.value : o)) }))
  const last = (storyId) => rows.filter((r) => r.story_id === storyId).reduce((m, r) => Math.max(m, r.number), 0)
  const titleOf = (id) => (stories.find((s) => s.id === id) || {}).title || 'A story'
  const summary = Object.entries(errors).map(([id, message]) => ({ id: `asv-${id}`, message }))

  async function submit(event) {
    event.preventDefault(); setProblem(''); setSaved('')
    const result = cleanVote(form)
    if (!result.ok) { setErrors(result.errors); return }
    setErrors({})
    try { await saveVote(result.value.vote, result.value.labels); setSaved(`The vote after chapter ${result.value.vote.after_chapter} is saved.`); setForm({ ...BLANK, story: form.story }); await load() } catch (e) { setProblem(e.message) }
  }
  const act = (task) => task().then(load).catch((e) => setProblem(e.message))

  return (
    <section className="ad-card ad-group" aria-labelledby="asv-title">
      <h2 id="asv-title">Votes</h2>
      <p className="ad-note">After a chapter, members who hold the Come Write With Me pass choose where the story goes. Everyone can see the choices; only members can vote, once each, and change their mind until the vote closes. The numbers stay hidden from visitors until the vote has closed, or they have voted.</p>
      {problem && <FailureMessage title="That did not go through">{problem}</FailureMessage>}
      {saved && <SuccessMessage title={saved} />}

      <form className="ab__form" onSubmit={submit} noValidate>
        <ErrorSummary errors={summary} />
        <Field id="asv-story" label="Which story is the vote for?" error={errors.story}>{(p) => <select {...p} className="as__control" value={form.story} onChange={set('story')}><option value="">Choose a story</option>{stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>}</Field>
        <Field id="asv-after" label="After which chapter?" help={form.story ? `This story has chapters up to ${last(form.story) || 'none yet'}.` : 'The chapter the vote comes after.'} error={errors.after}>{(p) => <input {...p} className="as__control" type="number" min="1" value={form.after} onChange={set('after')} />}</Field>
        <Field id="asv-question" label="The question" help={`Leave empty to ask “${DEFAULT_QUESTION}”`} error={errors.question}>{(p) => <input {...p} className="as__control" type="text" value={form.question} onChange={set('question')} />}</Field>
        <Field id="asv-closes" label="Voting closes" help="A date and time, for example 31 October 2026 at 23:59. People can vote and change their vote until then." error={errors.closes}>{(p) => <input {...p} className="as__control" type="datetime-local" value={form.closes} onChange={set('closes')} />}</Field>
        <fieldset id="asv-options" tabIndex={-1} className="as__fieldset">
          <legend>The choices ({MIN_OPTIONS} to {MAX_OPTIONS})</legend>
          {errors.options && <p className="as__error" role="alert">{errors.options}</p>}
          {form.options.map((o, i) => (
            <div key={i} className="as__optionrow">
              <Field id={`asv-option-${i}`} label={`Choice ${LETTERS[i]}`}>{(p) => <input {...p} className="as__control" type="text" value={o} onChange={setOption(i)} />}</Field>
              {form.options.length > MIN_OPTIONS && <button type="button" className="pg-btn" aria-label={`Take out choice ${LETTERS[i]}`} onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, n) => n !== i) }))}>Take out</button>}
            </div>
          ))}
          {form.options.length < MAX_OPTIONS && <button type="button" className="pg-btn" onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}>Add another choice</button>}
        </fieldset>
        <div className="ab__buttons"><button type="submit" className="pg-btn sg-btn--primary">Save the vote</button></div>
      </form>

      <h3>Your votes ({data.votes.length})</h3>
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'ready' && data.votes.length === 0 && <p className="rp-note">No votes yet.</p>}
      <ul className="sg__rows">
        {data.votes.map((v) => {
          const options = optionsOf(v, data.options)
          const tallied = tally(options, counts[v.id])
          const open = isOpen(v)
          return (
            <li key={v.id} className="sg__row">
              <div className="sg__text">
                <p className="sg__name">{titleOf(v.story_id)}: after chapter {v.after_chapter}</p>
                <p className="sg__why">{open ? 'Open' : 'Closed'} · {open ? 'closes' : 'closed'} {closesText(v.closes_at)} · {tallied.total} {tallied.total === 1 ? 'vote' : 'votes'}</p>
                <ul>{tallied.rows.map((r) => <li key={r.id}>{r.letter}: {r.label} ({r.votes}){v.chosen_option_id === r.id ? ' · chosen by you' : ''}</li>)}</ul>
                <label className="as__winner">Winner
                  <select className="as__control" value={winner[v.id] ?? (v.chosen_option_id || '')} onChange={(e) => setWinner((w) => ({ ...w, [v.id]: e.target.value }))}>
                    <option value="">The one with the most votes</option>
                    {tallied.rows.map((r) => <option key={r.id} value={r.id}>{r.letter}: {r.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="as__buttons">
                <button type="button" className="pg-btn" aria-label={`Save the winner of the vote after chapter ${v.after_chapter}`} onClick={() => act(() => chooseWinner(v.id, winner[v.id] ?? (v.chosen_option_id || '')))}>Save the winner</button>
                {open && <button type="button" className="pg-btn" aria-label={`Close the vote after chapter ${v.after_chapter} now`} onClick={() => { if (window.confirm('Close this vote now? Nobody will be able to vote or change their vote after that.')) act(() => closeVoteNow(v.id)) }}>Close it now</button>}
                <button type="button" className="pg-btn pg-btn--danger" aria-label={`Delete the vote after chapter ${v.after_chapter}`} onClick={() => { if (window.confirm('Delete this vote and everyone\u2019s votes in it for good?')) act(() => removeVote(v.id)) }}>Delete</button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
