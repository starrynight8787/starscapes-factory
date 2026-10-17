import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import useCurrentOwner from '../doors/useCurrentOwner'
import useUser from './useUser'
import { SPACES, cleanSuggestion, rankSuggestions } from './suggestRules'
import { addSuggestion, fetchSpaceOn, fetchSuggestions, setVote } from './suggestApi'
import '../styles/pages.css'
import './suggest.css'

// The "suggest and vote" box, drawn in Figma (page 06 Room pages, "Suggest and vote"). It appears on a page only while its space is switched on
// in Admin, Suggestions. A signed-in visitor can suggest (the owner approves it first) and vote once for each approved suggestion.
export default function SuggestPanel({ space }) {
  const config = SPACES[space]
  const { loading: whoLoading, user } = useUser()
  const { owner } = useCurrentOwner()
  const [on, setOn] = useState(null)
  const [data, setData] = useState({ rows: [], tally: {}, mine: new Set() })
  const [listProblem, setListProblem] = useState('')
  const [kind, setKind] = useState(config ? config.kinds[0].key : '')
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [thanks, setThanks] = useState(false)
  const [problem, setProblem] = useState('')

  useEffect(() => {
    let alive = true
    fetchSpaceOn(space).then((value) => alive && setOn(value))
    return () => {
      alive = false
    }
  }, [space])

  const userId = user ? user.id : null
  const load = useCallback(() => {
    return fetchSuggestions(space, userId)
      .then((result) => { setData(result); setListProblem('') })
      .catch((e) => setListProblem(e.message))
  }, [space, userId])
  useEffect(() => {
    if (on && !whoLoading) load()
  }, [on, whoLoading, load])

  const items = useMemo(() => rankSuggestions(data.rows, data.tally, data.mine), [data])
  if (!config || on === null) return null
  if (on === false) {
    return owner ? <p className="sg-off" role="note">The suggest and vote box is switched off here. <Link to="/admin/suggestions">Switch it on in Admin</Link></p> : null
  }
  const current = config.kinds.find((k) => k.key === kind) || config.kinds[0]
  const summary = Object.entries(errors).filter(([k]) => k !== 'form').map(([k, message]) => ({ id: k === 'kind' ? 'sg-kind' : `sg-${k}`, message }))

  async function submit(event) {
    event.preventDefault()
    setThanks(false); setProblem('')
    const result = cleanSuggestion(space, { kind, title, why })
    if (!result.ok) { setErrors(result.errors); return }
    setErrors({})
    setSaving(true)
    try {
      await addSuggestion(user, result.value)
      setTitle(''); setWhy(''); setThanks(true)
    } catch (e) {
      setProblem(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(item) {
    if (!user) return
    setProblem('')
    const next = !item.voted
    setData((d) => {
      const mine = new Set(d.mine)
      if (next) mine.add(item.id); else mine.delete(item.id)
      return { ...d, mine, tally: { ...d.tally, [item.id]: Math.max(0, (Number(d.tally[item.id]) || 0) + (next ? 1 : -1)) } }
    })
    try {
      await setVote(user, item.id, next)
    } catch (e) {
      setProblem(e.message)
      load() // put the numbers back as the database has them
    }
  }

  return (
    <section className="sg" aria-labelledby={`sg-${space}-title`}>
      <h2 id={`sg-${space}-title`} className="sg__title">{config.heading}</h2>
      <p className="sg__blurb">{config.blurb}</p>

      {!whoLoading && !user && (
        <div className="sg__login">
          <p className="sg__login-title">Log in to suggest or vote.</p>
          <p className="sg__login-text">You can read everything without an account. An account just lets me count one vote per person.</p>
          <div className="sg__login-buttons">
            <Link className="pg-btn sg-btn--primary" to="/login">Log in</Link>
            <Link className="pg-btn" to="/signup">Sign up</Link>
          </div>
        </div>
      )}

      {user && (
        <form className="sg__form" onSubmit={submit} noValidate>
          <ErrorSummary errors={summary} />
          {problem && <FailureMessage title="That did not go through">{problem}</FailureMessage>}
          {thanks && <SuccessMessage title="Thanks! I will read it before it shows.">You can suggest up to three a day.</SuccessMessage>}
          {config.kinds.length > 1 && (
            <fieldset className="sg__kinds" id="sg-kind">
              <legend>I am suggesting:</legend>
              {config.kinds.map((k) => (
                <label key={k.key} className={`pg-chip sg__kind${kind === k.key ? ' is-on' : ''}`}>
                  <input type="radio" name={`${space}-kind`} value={k.key} checked={kind === k.key} onChange={() => setKind(k.key)} />
                  {k.label}
                </label>
              ))}
            </fieldset>
          )}
          <div className="sg__fields">
            <Field id="sg-title" label={current.field} help={current.help} error={errors.title}>
              {(p) => <input {...p} type="text" value={title} maxLength={140} placeholder={current.placeholder} onChange={(e) => setTitle(e.target.value)} />}
            </Field>
            <Field id="sg-why" label="Why? (optional)" help="A line or two." error={errors.why}>
              {(p) => <input {...p} type="text" value={why} maxLength={320} onChange={(e) => setWhy(e.target.value)} />}
            </Field>
            <button type="submit" className="pg-btn sg-btn--primary sg__submit" disabled={saving}>{saving ? 'Sending…' : 'Suggest it'}</button>
          </div>
        </form>
      )}

      <div className="sg__list">
        <h3 className="sg__label">Most wanted</h3>
        {listProblem && <p className="rp-note" role="alert">{listProblem}</p>}
        {!listProblem && items.length === 0 && <p className="sg__empty">No suggestions yet. Be the first.</p>}
        <ul className="sg__rows">
          {items.map((item, i) => {
            const kindInfo = config.kinds.find((k) => k.key === item.kind)
            const chosen = item.status === 'chosen'
            return (
              <li key={item.id} className={`sg__row${chosen ? ' is-chosen' : ''}`}>
                <span className="sg__rank" aria-hidden="true">{i + 1}</span>
                <div className="sg__text">
                  <p className="sg__name">{item.title}</p>
                  {item.why && <p className="sg__why">{item.why}</p>}
                </div>
                {chosen && <span className="pg-chip sg__chosen">{config.chosenLabel}</span>}
                {kindInfo && config.kinds.length > 1 && <span className="pg-chip">{kindInfo.chip}</span>}
                <button
                  type="button"
                  className={`pg-btn sg__vote${item.voted ? ' sg-btn--primary' : ''}`}
                  aria-pressed={item.voted}
                  aria-label={`${item.voted ? 'Take back your vote for' : 'Vote for'} ${item.title}. ${item.votes} ${item.votes === 1 ? 'vote' : 'votes'} so far.`}
                  disabled={!user || chosen}
                  onClick={() => toggle(item)}
                >
                  ▲ {item.votes}{item.voted ? ' · Voted' : ''}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="sg__note">You can vote once for each suggestion, and take your vote back. Suggestions are read by me before they appear.</p>
    </section>
  )
}
