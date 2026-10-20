import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import OriginalCard from './OriginalCard'
import { fetchOriginals } from './artLoftApi'
import { sortOriginals } from './originals'
import { COLLECTIONS } from './artLoftData'

// All the original paintings, at /art-loft/originals. Sold ones stay, with a Sold label, after the ones still available.
export default function OriginalsPage() {
  useTitle('Original paintings')
  const [originals, setOriginals] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true
    fetchOriginals()
      .then((data) => alive && (setOriginals(data), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  const [params, setParams] = useSearchParams()
  const sorted = useMemo(() => sortOriginals(originals), [originals])
  // one tab per collection that has at least one original, in the same order as the Art Loft collections
  const tabs = useMemo(
    () => COLLECTIONS.map((c) => ({ name: c.name, count: sorted.filter((o) => o.collection === c.name).length })).filter((t) => t.count > 0),
    [sorted],
  )
  const wanted = params.get('collection')
  const active = tabs.some((t) => t.name === wanted) ? wanted : ''
  const items = active ? sorted.filter((o) => o.collection === active) : sorted
  const choose = (name) => setParams(name ? { collection: name } : {}, { replace: true })
  return (
    <main className="al">
      <p className="al-back"><Link to="/art-loft">← Back to the Art Loft</Link></p>
      <header className="al-head al-head--left">
        <h1>Original paintings</h1>
        <p className="al-blurb">Each original is one of a kind. When one is sold it stays here, with a Sold label.</p>
      </header>
      {status === 'error' && <p className="al-note" role="alert">The originals could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="al-note">Loading…</p>}
      {status === 'ready' && items.length === 0 && <p className="al-note">Original paintings are on their way. Check back soon.</p>}
      {status === 'ready' && tabs.length > 1 && (
        <div className="al-chips al-chips--tabs" role="tablist" aria-label="Filter originals by collection">
          <button type="button" role="tab" aria-selected={!active} className={!active ? 'is-on' : ''} onClick={() => choose('')}>All ({sorted.length})</button>
          {tabs.map((t) => (
            <button key={t.name} type="button" role="tab" aria-selected={active === t.name} className={active === t.name ? 'is-on' : ''} onClick={() => choose(t.name)}>
              {t.name} ({t.count})
            </button>
          ))}
        </div>
      )}
      <ul className="al-grid">
        {items.map((o) => (
          <li key={o.id}>
            <OriginalCard original={o} />
          </li>
        ))}
      </ul>
    </main>
  )
}
