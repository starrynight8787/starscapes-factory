import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { LAUNCH_OFFER } from '../membership/pricing'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { createCode, fetchPromotions, switchCode } from './promotionsAdminApi'
import { DURATIONS, EMPTY_FORM, STATE_WORDS, expiryText, parseForm, previewWords, stateOf, usesText } from './promotionsRules'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'
import './adminpromotions.css'

const FIELD_ORDER = ['code', 'kind', 'value', 'duration', 'months', 'maxUses', 'expiresOn']
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) // 2026-10-21, London's today, for the date box's earliest day

// The owner's page at /admin/promotions: the half-price first year (looked at, not changed here) and the discount codes members can type on the passes page: make one, see how
// often each has been used, and switch one off or on. The form is checked with the same rules the server uses before anything reaches Stripe.
export default function AdminPromotions({ session }) {
  useTitle('Promotions')
  const { checking, owner } = useOwnerCheck(session)
  const [state, setState] = useState({ phase: 'loading', codes: [], mode: 'unknown', more: false })
  const [form, setForm] = useState(EMPTY_FORM)
  const [problem, setProblem] = useState(null) // { field, message }
  const [making, setMaking] = useState(false)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState({ kind: '', text: '' })
  const refs = useRef({})

  useEffect(() => {
    if (!owner) return undefined
    let alive = true
    fetchPromotions().then((r) => alive && setState({ phase: 'ready', codes: r.codes, mode: r.mode, more: r.more })).catch((e) => alive && setState((s) => ({ ...s, phase: 'error', message: e && e.message })))
    return () => { alive = false }
  }, [owner])

  const checked = useMemo(() => parseForm(form), [form])
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setProblem(null); setNote({ kind: '', text: '' }) }

  function show(field, message) {
    setProblem({ field, message })
    const el = refs.current[field] || refs.current[FIELD_ORDER.find((k) => refs.current[k])]
    if (el && el.focus) el.focus()
  }

  async function submit(e) {
    e.preventDefault()
    setNote({ kind: '', text: '' })
    const r = parseForm(form)
    if (!r.ok) return show(r.field, r.message)
    setMaking(true)
    try {
      const made = await createCode(form)
      setState((s) => ({ ...s, codes: [made, ...s.codes] }))
      setForm(EMPTY_FORM); setProblem(null)
      setNote({ kind: 'done', text: `Made the code ${made.code}. It is working now: members can type it on the passes page.` })
    } catch (err) {
      show(err && err.field ? err.field : 'code', (err && err.message) || 'That did not go through just now. Please try again in a moment.')
    } finally {
      setMaking(false)
    }
  }

  async function toggle(c, active) {
    setBusy(c.id); setNote({ kind: '', text: '' })
    try {
      const changed = await switchCode(c.id, active)
      setState((s) => ({ ...s, codes: s.codes.map((x) => (x.id === c.id ? changed : x)) }))
      setNote({ kind: 'done', text: `${c.code} is switched ${active ? 'on' : 'off'}.` })
    } catch (err) {
      setNote({ kind: 'error', text: (err && err.message) || 'That did not go through just now. Please try again in a moment.' })
    } finally {
      setBusy('')
    }
  }

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Promotions</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  const err = (field) => (problem && problem.field === field ? problem.message : '')
  const field = (id) => ({ id: `pm-${id}`, ref: (el) => { refs.current[id] = el }, 'aria-invalid': err(id) ? 'true' : undefined, 'aria-describedby': err(id) ? `pm-${id}-error` : undefined })
  const Error = ({ id }) => (err(id) ? <p id={`pm-${id}-error`} className="pm__error">{err(id)}</p> : null)

  return (
    <main className="ad ad--wide pm">
      <AdminBanner chip="Promotions" title="Promotions" subtitle="The half-price first year, and discount codes members can type when they choose their passes. A code replaces the half-price year for whoever uses it." icon="promo" room="factory-floor" />

      {state.phase === 'ready' && state.mode !== 'unknown' && (
        <p className={`pm__mode pm__mode--${state.mode}`} role="note"><strong>{state.mode === 'test' ? 'Stripe is in test mode.' : 'Stripe is in live mode.'}</strong> {state.mode === 'test' ? 'Codes made here are test codes: they work in test mode only, and you will have to make them again when the shop is live.' : 'Codes made here are real: members can use them straight away.'}</p>
      )}

      <section className="pm__section ad-card" aria-labelledby="pm-offer">
        <h2 id="pm-offer">The half-price first year</h2>
        {LAUNCH_OFFER.active ? (
          <>
            <p><strong>{LAUNCH_OFFER.label}.</strong> Every new member gets it automatically: someone paying monthly pays half for their first 12 months, and someone paying yearly pays half for their first year. Then the normal price starts, and the reminder emails tell them before it does.</p>
            <p>A discount code <strong>replaces</strong> it: a member who types a code gets that code&apos;s discount instead, not both.</p>
          </>
        ) : <p>No launch offer is running.</p>}
        <p className="pm__help">You can look at the offer here but not change it, because the Terms, the reminder emails and every member&apos;s price depend on it. To change or end it, it is a change to the site&apos;s code.</p>
      </section>

      <section className="pm__section ad-card" aria-labelledby="pm-make">
        <h2 id="pm-make">Make a code</h2>
        <form className="pm__form" onSubmit={submit} noValidate>
          {problem && <p className="pm__summary" role="alert">{problem.message}</p>}
          <div className="pm__field">
            <label htmlFor="pm-code">The code members type</label>
            <input className="pm__control" type="text" autoCapitalize="characters" autoComplete="off" spellCheck="false" value={form.code} onChange={set('code')} maxLength={60} {...field('code')} ref={field('code').ref} />
            <p className="pm__hint">Letters, numbers and dashes, for example SPRING20. Capitals or not, it works the same.</p>
            <Error id="code" />
          </div>
          <fieldset className="pm__field pm__radios" aria-describedby={err('kind') ? 'pm-kind-error' : undefined}>
            <legend>What it takes off</legend>
            <label className="pm__radio"><input className="pm__radio-input" type="radio" name="pm-kind" value="percent" checked={form.kind === 'percent'} onChange={set('kind')} /> A percentage</label>
            <label className="pm__radio"><input className="pm__radio-input" type="radio" name="pm-kind" value="amount" checked={form.kind === 'amount'} onChange={set('kind')} /> An amount of money</label>
            <Error id="kind" />
          </fieldset>
          <div className="pm__field">
            <label htmlFor="pm-value">{form.kind === 'amount' ? 'Pounds off, for example 5 or 2.50' : 'Percentage off, from 1 to 100'}</label>
            <input className="pm__control" type="text" inputMode="decimal" autoComplete="off" value={form.value} onChange={set('value')} {...field('value')} ref={field('value').ref} />
            <Error id="value" />
          </div>
          <div className="pm__field">
            <label htmlFor="pm-duration">How long the discount lasts</label>
            <select className="pm__control" value={form.duration} onChange={set('duration')} {...field('duration')} ref={field('duration').ref}>
              {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <Error id="duration" />
          </div>
          {form.duration === 'repeating' && (
            <div className="pm__field">
              <label htmlFor="pm-months">How many months, from 1 to 36</label>
              <input className="pm__control" type="text" inputMode="numeric" autoComplete="off" value={form.months} onChange={set('months')} {...field('months')} ref={field('months').ref} />
              <Error id="months" />
            </div>
          )}
          <div className="pm__field">
            <label htmlFor="pm-maxUses">How many people can use it (leave empty for no limit)</label>
            <input className="pm__control" type="text" inputMode="numeric" autoComplete="off" value={form.maxUses} onChange={set('maxUses')} {...field('maxUses')} ref={field('maxUses').ref} />
            <Error id="maxUses" />
          </div>
          <div className="pm__field">
            <label htmlFor="pm-expiresOn">The last day it works (leave empty for no end date)</label>
            <input className="pm__control" type="date" min={today()} value={form.expiresOn} onChange={set('expiresOn')} {...field('expiresOn')} ref={field('expiresOn').ref} />
            <Error id="expiresOn" />
          </div>
          <p className="pm__preview" aria-live="polite">{checked.ok ? previewWords(checked.value) : 'Fill in the boxes and a sentence here will say exactly what the code does.'}</p>
          <div className="pm__buttons"><button type="submit" className="pg-btn pg-btn--primary" disabled={making} aria-busy={making}>{making ? 'Making the code…' : 'Make the code'}</button></div>
        </form>
      </section>

      <section className="pm__section" aria-labelledby="pm-list">
        <h2 id="pm-list">Your codes</h2>
        {state.phase === 'loading' && <p className="rp-note">Loading…</p>}
        {state.phase === 'error' && <p className="rp-note" role="alert">{state.message || 'The codes could not load just now. Please try again in a moment.'}</p>}
        {note.text && <p className={`pm__note pm__note--${note.kind}`} role={note.kind === 'error' ? 'alert' : undefined} aria-live={note.kind === 'error' ? undefined : 'polite'}>{note.text}</p>}
        {state.phase === 'ready' && state.codes.length === 0 && <p className="rp-note">No codes yet. Make one above.</p>}
        {state.phase === 'ready' && state.codes.length > 0 && <p className="pm__count" role="status">{state.codes.length} {state.codes.length === 1 ? 'code' : 'codes'}</p>}
        {state.codes.length > 0 && (
          <ul className="pm__list">
            {state.codes.map((c) => {
              const st = stateOf(c)
              return (
                <li key={c.id} className="pm__row">
                  <div className="pm__main">
                    <p className="pm__codeline"><span className="pm__code">{c.code}</span><span className={`pm__chip pm__chip--${st}`}>{STATE_WORDS[st]}</span></p>
                    <p>{c.summary}</p>
                    <p className="pm__meta">{usesText(c)}. {expiryText(c)}.</p>
                  </div>
                  <div className="pm__buttons">
                    {st === 'working' && <button type="button" className="pg-btn" disabled={busy === c.id} aria-busy={busy === c.id} aria-label={`Switch off the code ${c.code}`} onClick={() => toggle(c, false)}>{busy === c.id ? 'Switching…' : 'Switch off'}</button>}
                    {st === 'off' && <button type="button" className="pg-btn" disabled={busy === c.id} aria-busy={busy === c.id} aria-label={`Switch on the code ${c.code}`} onClick={() => toggle(c, true)}>{busy === c.id ? 'Switching…' : 'Switch on'}</button>}
                    {st === 'finished' && <p className="pm__meta">Finished: it cannot be used again.</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {state.phase === 'ready' && state.more && <p className="pm__help">Showing the newest 100 codes. Older ones are in Stripe.</p>}
        <p className="pm__help">Members type a code in the promo code box on the passes page. Only you can see this page. Codes here are for passes only: the print shop does not take codes.</p>
      </section>
    </main>
  )
}
