import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import AdminBanner from './AdminBanner'
import { BUILT_IN, NAME_BOXES } from '../stories/round/storyRoundRules'
import { KIND_NAMES, blankExtra, blankForm, buildPayload, memberLink, roundLabel } from './storyRoundsAdminRules'
import { act, listRounds, roundResults } from './storyRoundsAdminApi'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import './adminstoryrounds.css'

// The owner's console for the hidden "Let's write a story" rounds, at /admin/story-rounds (Figma: "Story form designs", SFW-269).
// Only the owner's sign-in works: the server checks it on every request. It shows counts and names, never who sent what.
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : 'No date')

const CONFIRMS = {
  close: { title: 'Close this chapter?', text: 'Members will no longer be able to answer. You can still see the results.', button: 'Close the chapter', payload: (r) => ({ op: 'set_status', id: r.id, status: 'closed' }) },
  open: { title: 'Open this chapter?', text: 'Members with the pass can answer as soon as it is open (and inside its dates). The questions are locked from now on.', button: 'Open the chapter', payload: (r) => ({ op: 'set_status', id: r.id, status: 'open' }) },
  archive: { title: 'Archive this chapter?', text: 'It disappears from members. Its answers are kept.', button: 'Archive the chapter', payload: (r) => ({ op: 'set_status', id: r.id, status: 'archived' }) },
  reset: { title: 'Reset this chapter?', text: 'Every answer and name is cleared, and members can answer again. Their name suggestions still count towards the 3 a month: a reset does not give anyone extra.', button: 'Reset the chapter', tick: 'I understand this clears every answer.', payload: (r) => ({ op: 'reset', id: r.id, confirm: true }) },
  delete: { title: 'Delete this chapter?', text: 'Only a chapter with no answers can be deleted. This cannot be undone.', button: 'Delete the chapter', tick: 'I understand this cannot be undone.', payload: (r) => ({ op: 'delete', id: r.id, confirm: true }) },
}

function Confirm({ round, kind, onDone, onCancel, setProblem }) {
  const c = CONFIRMS[kind]
  const [ticked, setTicked] = useState(!c.tick)
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true); setProblem('')
    try { await act(c.payload(round)); await onDone(`${c.button.replace('the chapter', '')}done.`) } catch (e) { setProblem(e.message); setBusy(false) }
  }
  return (
    <div className="asr-confirm" role="alertdialog" aria-labelledby="asr-c-title">
      <h3 id="asr-c-title">{c.title}</h3>
      <p><strong>{round.title}</strong></p>
      <p>{c.text}</p>
      {c.tick && <label className="asr-check"><input className="asr-box" type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} /> {c.tick}</label>}
      <div className="asr-row"><button type="button" className="asr-btn" disabled={!ticked || busy} onClick={go}>{busy ? 'Working…' : c.button}</button><button type="button" className="asr-btn asr-btn--ghost" onClick={onCancel}>Cancel</button></div>
    </div>
  )
}

function CreateRound({ onSaved, onCancel, setProblem }) {
  const [form, setForm] = useState(blankForm())
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setBuilt = (key, patch) => setForm((f) => ({ ...f, built: { ...f.built, [key]: { ...f.built[key], ...patch } } }))
  const setBox = (key, patch) => setForm((f) => ({ ...f, boxes: { ...f.boxes, [key]: { ...f.boxes[key], ...patch } } }))
  const setExtra = (i, patch) => setForm((f) => ({ ...f, extra: f.extra.map((x, n) => (n === i ? { ...x, ...patch } : x)) }))
  async function save(event) {
    event.preventDefault(); setProblem('')
    const built = buildPayload(form)
    if (!built.ok) { setProblem(built.message); return }
    setBusy(true)
    try { await act(built.payload); await onSaved('Saved as a draft. Nothing is visible to members until you open it.') } catch (e) { setProblem(e.message); setBusy(false) }
  }
  return (
    <form className="asr-card" onSubmit={save} noValidate>
      <h2>Create a chapter</h2>
      <label className="asr-label" htmlFor="asr-title">Title (members see this)</label>
      <input id="asr-title" className="asr-input" value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="Chapter 2: choose the ingredients" />
      <fieldset className="asr-fieldset"><legend>What kind of chapter is it?</legend>
        {[['full_form', 'Any of the nine questions, each with a name box.'], ['names_only', 'Only the name boxes, for the characters you choose.'], ['small_vote', 'One question you send to everyone, with two or three options. Used for the shortlist and later votes.']].map(([k, d]) => (
          <label key={k} className="asr-radio"><input className="asr-box" type="radio" name="kind" checked={form.kind === k} onChange={() => set({ kind: k })} /><span><strong>{KIND_NAMES[k]}</strong><br /><small>{d}</small></span></label>
        ))}
      </fieldset>
      {form.kind === 'full_form' && (
        <fieldset className="asr-fieldset"><legend>Which questions are on?</legend>
          <p className="asr-help">Switch a question off to leave it out of this chapter. Questions lock the moment the chapter opens, so check them now.</p>
          {BUILT_IN.map((q) => (
            <div key={q.key} className="asr-qrow">
              <label className="asr-check"><input className="asr-box" type="checkbox" checked={form.built[q.key].on} onChange={(e) => setBuilt(q.key, { on: e.target.checked })} /> <strong>{q.label}</strong>
                {q.decides && <span className="asr-tag">Decides side kicks</span>}{q.showIf && <span className="asr-tag">Only if they chose Yes</span>}</label>
              {form.built[q.key].on && (q.type === 'choose_one' && !q.decides && !q.showIf) && <label className="asr-check asr-sub"><input className="asr-box" type="checkbox" checked={form.built[q.key].nameBox} onChange={(e) => setBuilt(q.key, { nameBox: e.target.checked })} /> Name box</label>}
            </div>
          ))}
          <h3>Your own questions</h3>
          {form.extra.map((x, i) => (
            <div key={i} className="asr-extra">
              <label className="asr-label" htmlFor={`asr-x-${i}`}>Question</label>
              <input id={`asr-x-${i}`} className="asr-input" value={x.label} maxLength={200} onChange={(e) => setExtra(i, { label: e.target.value })} />
              <label className="asr-label" htmlFor={`asr-xh-${i}`}>Help text (optional)</label>
              <input id={`asr-xh-${i}`} className="asr-input" value={x.help} maxLength={300} onChange={(e) => setExtra(i, { help: e.target.value })} />
              <label className="asr-label" htmlFor={`asr-xt-${i}`}>What kind of box is it?</label>
              <select id={`asr-xt-${i}`} className="asr-input" value={x.type} onChange={(e) => setExtra(i, { type: e.target.value })}>
                <option value="choose_one">Pick one: members choose one of the options you write</option>
                <option value="free_text">Free text: a short answer in their own words (only I see it)</option>
                <option value="name_suggestion">Name suggestion: a box for a name (counts towards their 3 a month)</option>
              </select>
              {x.type === 'choose_one' && <>
                <label className="asr-label" htmlFor={`asr-xo-${i}`}>Options (one on each line, 2 to 8)</label>
                <textarea id={`asr-xo-${i}`} className="asr-input" rows={3} value={x.optionsText} onChange={(e) => setExtra(i, { optionsText: e.target.value })} />
                <label className="asr-check"><input className="asr-box" type="checkbox" checked={x.nameBox} onChange={(e) => setExtra(i, { nameBox: e.target.checked })} /> Name box</label>
              </>}
              <button type="button" className="asr-link" onClick={() => setForm((f) => ({ ...f, extra: f.extra.filter((_, n) => n !== i) }))}>Remove</button>
            </div>
          ))}
          <button type="button" className="asr-btn asr-btn--ghost" onClick={() => setForm((f) => ({ ...f, extra: [...f.extra, blankExtra()] }))}>Add another question</button>
        </fieldset>
      )}
      {form.kind === 'names_only' && (
        <fieldset className="asr-fieldset"><legend>Which name boxes are on?</legend>
          {NAME_BOXES.map((b) => (
            <div key={b.key} className="asr-qrow">
              <label className="asr-check"><input className="asr-box" type="checkbox" checked={form.boxes[b.key].on} onChange={(e) => setBox(b.key, { on: e.target.checked })} /> <strong>{b.label}</strong></label>
              {b.slots && form.boxes[b.key].on && (
                <label className="asr-inline">How many side kicks? <select className="asr-input asr-narrow" value={form.boxes[b.key].slots} onChange={(e) => setBox(b.key, { slots: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                  <small>Use the most popular answer from the chapter that asked “Should the hero have side kicks?”.</small></label>
              )}
            </div>
          ))}
        </fieldset>
      )}
      {form.kind === 'small_vote' && (
        <fieldset className="asr-fieldset"><legend>The question</legend>
          <label className="asr-label" htmlFor="asr-vq">Question</label>
          <input id="asr-vq" className="asr-input" value={form.voteQuestion} maxLength={200} onChange={(e) => set({ voteQuestion: e.target.value })} />
          {form.voteOptions.map((o, i) => (<div key={i}><label className="asr-label" htmlFor={`asr-vo-${i}`}>Option {i + 1}{i === 2 ? ' (optional)' : ''}</label><input id={`asr-vo-${i}`} className="asr-input" value={o} maxLength={160} onChange={(e) => set({ voteOptions: form.voteOptions.map((v, n) => (n === i ? e.target.value : v)) })} /></div>))}
          <p className="asr-help">To vote on names people suggested, use “Make a vote from my three” on a chapter’s results instead.</p>
        </fieldset>
      )}
      <fieldset className="asr-fieldset"><legend>When is it open? (UK time)</legend>
        <p className="asr-help">Leave the dates empty to use the buttons only. With dates, the chapter opens and closes by itself. You can still open or close it with a button.</p>
        <div className="asr-dates">
          <label className="asr-label" htmlFor="asr-od">Opens</label><input id="asr-od" type="date" className="asr-input" value={form.opensDate} onChange={(e) => set({ opensDate: e.target.value })} /><input aria-label="Opens at (time)" type="time" className="asr-input" value={form.opensTime} onChange={(e) => set({ opensTime: e.target.value })} />
          <label className="asr-label" htmlFor="asr-cd">Closes</label><input id="asr-cd" type="date" className="asr-input" value={form.closesDate} onChange={(e) => set({ closesDate: e.target.value })} /><input aria-label="Closes at (time)" type="time" className="asr-input" value={form.closesTime} onChange={(e) => set({ closesTime: e.target.value })} />
        </div>
      </fieldset>
      <div className="asr-row"><button className="asr-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save as draft'}</button><button type="button" className="asr-btn asr-btn--ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  )
}

function Results({ id, onBack, onChanged, setProblem, setSaved }) {
  const [data, setData] = useState(null)
  const [ticked, setTicked] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('all')
  const [vote, setVote] = useState({ title: '', question: 'Which name should we use?' })
  const load = useCallback(async () => { try { setData(await roundResults(id)) } catch (e) { setProblem(e.message) } }, [id, setProblem])
  useEffect(() => { load() }, [load])
  if (!data) return <PageLoading label="Loading results…" />
  const key = (n) => `${n.question_id}|${n.name.toLowerCase()}`
  const labels = [...new Set(data.names.map((n) => n.label))]
  const names = data.names.filter((n) => filter === 'all' || n.label === filter)
  const visible = showAll ? names : names.slice(0, 7)
  const toggle = (n) => setTicked((t) => (t.includes(key(n)) ? t.filter((x) => x !== key(n)) : [...t, key(n)]))
  const pickedGroups = data.names.filter((n) => ticked.includes(key(n)))
  async function hide(n, hidden) { setProblem(''); try { await act({ op: hidden ? 'unhide' : 'hide', ids: n.ids }); await load() } catch (e) { setProblem(e.message) } }
  async function shortlist() {
    setProblem('')
    try {
      const ids = pickedGroups.map((g) => g.ids[0])
      await act({ op: 'shortlist', round_id: id, suggestion_ids: ids, title: vote.title || undefined, question: vote.question })
      await onChanged('A draft small vote is ready. Open it from the chapters list when you are happy with it.'); onBack()
    } catch (e) { setProblem(e.message) }
  }
  return (
    <div className="asr-stack">
      <button type="button" className="asr-link" onClick={onBack}>← All chapters</button>
      <section className="asr-card">
        <h2>{data.round.title}</h2>
        <p><span className="asr-tag">{roundLabel({ ...data.round, state: data.round.state })}</span> <span className="asr-tag">{KIND_NAMES[data.round.kind]}</span></p>
        <p>{data.members} {data.members === 1 ? 'member has' : 'members have'} answered. This page shows counts and names only: never who sent them.</p>
      </section>
      <div className="asr-grid">
      {data.questions.filter((q) => q.type === 'choose_one').map((q) => (
        <section key={q.id} className="asr-card" aria-label={q.label}>
          <h3>{q.label}</h3>
          {q.tally.rows.map((r) => (
            <div key={r.label} className={`asr-bar${r.popular ? ' is-top' : ''}`}>
              <div className="asr-barhead"><span>{r.letter} {r.label}</span>{r.popular && <strong className="asr-tag asr-tag--good">Most popular</strong>}</div>
              <div className="asr-track"><span style={{ width: `${r.percent}%` }} /></div>
              <small>{r.votes} {r.votes === 1 ? 'answer' : 'answers'} · {r.percent}%</small>
            </div>
          ))}
          {q.decides && <p className="asr-note">{q.tally.leader ? (q.tally.leader.startsWith('No') ? 'The story will have no side kicks (a lone wolf).' : `The story will have ${q.tally.leader.replace(/\s.*$/, '')} side ${q.tally.leader.startsWith('1 ') ? 'kick' : 'kicks'}. The most popular answer decides it, so the side kick name boxes in the names-only chapter will show ${q.tally.leader.replace(/\s.*$/, '')}.`) : 'No answer is clearly ahead yet.'}</p>}
        </section>
      ))}
      </div>
      {data.questions.filter((q) => q.type === 'free_text').map((q) => (
        <section key={q.id} className="asr-card"><h3>{q.label}</h3>{q.texts.length === 0 ? <p>No answers yet.</p> : <ul>{q.texts.map((t, i) => <li key={i}>{t}</li>)}</ul>}</section>
      ))}
      <section className="asr-card" aria-label="Name suggestions">
        <h3>Name suggestions</h3>
        <p className="asr-help">Names are not linked to members. Tick three to make a shortlist vote. Hide a name that should not go forward.</p>
        <div className="asr-row" role="group" aria-label="Show names for">
          <button type="button" className={`asr-chipbtn${filter === 'all' ? ' is-on' : ''}`} onClick={() => setFilter('all')}>All {data.names.length}</button>
          {labels.map((l) => <button key={l} type="button" className={`asr-chipbtn${filter === l ? ' is-on' : ''}`} onClick={() => setFilter(l)}>{l} {data.names.filter((n) => n.label === l).length}</button>)}
        </div>
        {names.length === 0 && <p>No names yet.</p>}
        <ul className="asr-names">
          {visible.map((n) => (
            <li key={key(n)} className={n.hidden ? 'is-hidden' : ''}>
              <label className="asr-check"><input className="asr-box" type="checkbox" disabled={n.hidden} checked={ticked.includes(key(n))} onChange={() => toggle(n)} /> <strong>{n.name}</strong></label>
              <span className="asr-tag">{n.label}</span>
              {n.times > 1 && <span className="asr-tag asr-tag--warm">Suggested {n.times} times</span>}
              {n.reports > 0 && <span className="asr-tag asr-tag--bad">Reported {n.reports > 1 ? n.reports : ''}</span>}
              {n.hidden && <span className="asr-tag">Hidden</span>}
              <button type="button" className="asr-link" onClick={() => hide(n, n.hidden)}>{n.hidden ? 'Show again' : 'Hide'}</button>
            </li>
          ))}
        </ul>
        {names.length > 7 && <button type="button" className="asr-btn asr-btn--ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show the other ${names.length - 7} names`}</button>}
        <div className="asr-short">
          <p><strong>Shortlisted: {pickedGroups.length} of 3 ticked</strong>. Tick three names, then members vote.</p>
          <label className="asr-label" htmlFor="asr-sq">Question for the vote</label>
          <input id="asr-sq" className="asr-input" value={vote.question} maxLength={200} onChange={(e) => setVote({ ...vote, question: e.target.value })} />
          <button type="button" className="asr-btn" disabled={pickedGroups.length !== 3} onClick={shortlist}>Make a vote from my three</button>
        </div>
      </section>
    </div>
  )
}

export default function AdminStoryRounds({ session }) {
  useTitle('Story chapters')
  const { checking, owner } = useOwnerCheck(session)
  const [state, setState] = useState({ status: 'loading', rounds: [] })
  const [view, setView] = useState('list')
  const [confirm, setConfirm] = useState(null)
  const [problem, setProblem] = useState('')
  const [saved, setSaved] = useState('')
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    try { const d = await listRounds(); setState({ status: 'ready', rounds: d.rounds }) } catch (e) { setProblem(e.message); setState({ status: 'error', rounds: [] }) }
  }, [])
  useEffect(() => { if (owner) load() }, [owner, load])

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Story chapters</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  const done = async (message) => { setConfirm(null); setSaved(message || ''); setView('list'); await load() }
  async function copy(r) {
    const link = memberLink(window.location.origin, r.link_token)
    try { await navigator.clipboard.writeText(link); setCopied(r.id) } catch (e) { setProblem(`Copy this link: ${link}`) }
  }
  return (
    <main className="ad ad--wide asr">
      <AdminBanner chip="Admin · only Gill" title="Story chapters" subtitle="Make a chapter, share its private link, and see the counts." icon="stories" />
      <div aria-live="polite">
        {problem && <p className="asr-problem" role="alert">{problem}</p>}
        {saved && <p className="asr-good" role="status">{saved}</p>}
      </div>
      {view === 'create' && <CreateRound onSaved={done} onCancel={() => setView('list')} setProblem={setProblem} />}
      {typeof view === 'object' && <Results id={view.results} onBack={() => setView('list')} onChanged={done} setProblem={setProblem} setSaved={setSaved} />}
      {view === 'list' && (
        <section className="asr-stack">
          <div className="asr-row"><button type="button" className="asr-btn" onClick={() => { setProblem(''); setSaved(''); setView('create') }}>Create a chapter</button></div>
          {state.status === 'loading' && <PageLoading label="Loading chapters…" />}
          {state.status === 'ready' && state.rounds.length === 0 && <p className="asr-card">No chapters yet. Make your first one.</p>}
          <div className="asr-grid">
          {state.rounds.map((r) => (
            <article key={r.id} className="asr-card" aria-label={r.title}>
              <p><span className={`asr-tag asr-tag--${roundLabel(r).toLowerCase().replace(' ', '')}`}>{roundLabel(r)}</span> <span className="asr-tag">{KIND_NAMES[r.kind]}</span></p>
              <h2>{r.title}</h2>
              <p className="asr-stats">{r.members} answered · {r.names} name suggestions{r.reports > 0 ? ` · ${r.reports} reported` : ''} · opens {when(r.opens_at)} · closes {when(r.closes_at)}</p>
              <div className="asr-row">
                <button type="button" className="asr-btn asr-btn--ghost" onClick={() => { setProblem(''); setSaved(''); setView({ results: r.id }) }}>Results</button>
                {r.status === 'draft' && <button type="button" className="asr-btn" onClick={() => setConfirm({ r, kind: 'open' })}>Open</button>}
                {r.status === 'open' && <button type="button" className="asr-btn asr-btn--ghost" onClick={() => setConfirm({ r, kind: 'close' })}>Close chapter</button>}
                {r.status !== 'draft' && r.status !== 'archived' && <button type="button" className="asr-btn asr-btn--ghost" onClick={() => setConfirm({ r, kind: 'reset' })}>Reset</button>}
                {r.status !== 'archived' && <button type="button" className="asr-btn asr-btn--ghost" onClick={() => setConfirm({ r, kind: 'archive' })}>Archive</button>}
                {r.status === 'draft' && <button type="button" className="asr-btn asr-btn--ghost" onClick={() => setConfirm({ r, kind: 'delete' })}>Delete</button>}
                <button type="button" className="asr-link" onClick={() => copy(r)}>{copied === r.id ? 'Link copied' : 'Copy member link'}</button>
              </div>
              {confirm && confirm.r.id === r.id && <Confirm round={r} kind={confirm.kind} onDone={done} onCancel={() => setConfirm(null)} setProblem={setProblem} />}
            </article>
          ))}
          </div>
        </section>
      )}
    </main>
  )
}
