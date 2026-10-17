import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { SPACES } from '../suggest/suggestRules'
import { fetchAllForOwner, fetchSpaces, removeSuggestion, setSpaceOn, setStatus } from '../suggest/suggestApi'
import '../styles/pages.css'
import '../suggest/suggest.css'
import './admin.css'

const NAMES = { 'story-ledger': 'Story Ledger: what to audit next', 'book-club': 'Book Club: what to read next' }
const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }

// The owner's tool at /admin/suggestions: switch each "suggest and vote" box on or off, read what has been suggested, and approve, hide,
// choose or delete it. Nothing a visitor writes appears on the site until it is approved here. The database only lets the owner's account do any of this.
export default function AdminSuggestions({ session }) {
  useTitle('Suggestions')
  const { checking, owner } = useOwnerCheck(session)
  const [on, setOn] = useState({})
  const [data, setData] = useState({ rows: [], tally: {} })
  const [status, setLoadStatus] = useState('loading')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [spaces, all] = await Promise.all([fetchSpaces(), fetchAllForOwner()])
      setOn(spaces); setData(all); setLoadStatus('ready')
    } catch (e) {
      setProblem(e.message); setLoadStatus('error')
    }
  }, [])
  useEffect(() => { if (owner) load() }, [owner, load])

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) {
    return (
      <main className="ad">
        <h1>Suggestions</h1>
        <p className="ad-note">This area is for the site owner.</p>
        <p><Link to="/">Back to the homepage</Link></p>
      </main>
    )
  }

  async function act(key, work) {
    setBusy(key); setProblem('')
    try { await work(); await load() } catch (e) { setProblem(e.message) } finally { setBusy('') }
  }
  const votes = (id) => Number(data.tally[id]) || 0

  return (
    <main className="ad as">
      <p className="rp-back"><Link to="/admin">← Back to Admin</Link></p>
      <h1>Suggestions</h1>
      <p className="ad-note">Switch each box on or off, and read what people have suggested. Nothing appears on the site until you approve it.</p>
      {problem && <p className="rp-note" role="alert">{problem}</p>}
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'ready' && Object.keys(SPACES).map((space) => {
        const mine = data.rows.filter((r) => r.space === space)
        const group = (name) => mine.filter((r) => (name === 'showing' ? r.status === 'approved' || r.status === 'chosen' : r.status === name))
        const switchOn = on[space] === true
        return (
          <section key={space} className="as__space" aria-labelledby={`as-${space}`}>
            <div className="as__head">
              <h2 id={`as-${space}`}>{NAMES[space]}</h2>
              <label className="as__switch">
                <input type="checkbox" role="switch" checked={switchOn} disabled={busy === `on-${space}`} onChange={() => act(`on-${space}`, () => setSpaceOn(space, !switchOn))} />
                <span>{switchOn ? 'On: visitors can see it' : 'Off: hidden from visitors'}</span>
              </label>
            </div>
            {[['pending', 'Waiting for you'], ['showing', 'Showing on the page'], ['hidden', 'Hidden']].map(([name, label]) => {
              const rows = group(name === 'pending' ? 'pending' : name)
              return (
                <div key={name} className="as__group">
                  <h3>{label} <span className="as__count">({rows.length})</span></h3>
                  {rows.length === 0 && <p className="rp-note">Nothing here.</p>}
                  <ul className="sg__rows">
                    {rows.map((r) => (
                      <li key={r.id} className={`sg__row${r.status === 'chosen' ? ' is-chosen' : ''}`}>
                        <div className="sg__text">
                          <p className="sg__name">{r.title}</p>
                          {r.why && <p className="sg__why">{r.why}</p>}
                          <p className="sg__why">{r.kind} · {when(r.created_at)} · from a signed-in reader{name === 'showing' ? ` · ${votes(r.id)} ${votes(r.id) === 1 ? 'vote' : 'votes'}` : ''}</p>
                        </div>
                        {r.status === 'chosen' && <span className="pg-chip sg__chosen">Chosen</span>}
                        <div className="as__buttons">
                          {r.status === 'pending' && <button type="button" className="pg-btn sg-btn--primary" disabled={busy === r.id} onClick={() => act(r.id, () => setStatus(r.id, 'approved'))}>Approve</button>}
                          {r.status === 'approved' && <button type="button" className="pg-btn" disabled={busy === r.id} onClick={() => act(r.id, () => setStatus(r.id, 'chosen'))}>Mark as chosen</button>}
                          {r.status === 'chosen' && <button type="button" className="pg-btn" disabled={busy === r.id} onClick={() => act(r.id, () => setStatus(r.id, 'approved'))}>Not chosen</button>}
                          {r.status === 'hidden' && <button type="button" className="pg-btn" disabled={busy === r.id} onClick={() => act(r.id, () => setStatus(r.id, 'approved'))}>Show again</button>}
                          {r.status !== 'hidden' && <button type="button" className="pg-btn" disabled={busy === r.id} onClick={() => act(r.id, () => setStatus(r.id, 'hidden'))}>Hide</button>}
                          <button type="button" className="pg-btn pg-btn--danger" disabled={busy === r.id} onClick={() => { if (window.confirm('Delete this suggestion for good?')) act(r.id, () => removeSuggestion(r.id)) }}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>
        )
      })}
    </main>
  )
}
