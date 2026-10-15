import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import OriginalCard from './OriginalCard'
import { fetchOriginals } from './artLoftApi'
import { sortOriginals } from './originals'

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

  const items = useMemo(() => sortOriginals(originals), [originals])
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
