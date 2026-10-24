import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import PrintCard from './PrintCard'
import { fetchPrints } from './artLoftApi'
import { COLLECTIONS, collectionBySlug } from './artLoftData'

export default function PrintsPage() {
  useTitle('Digital Prints')
  const [params] = useSearchParams()
  const active = collectionBySlug(params.get('collection') || '')
  const [prints, setPrints] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true
    fetchPrints({ withPictures: true })
      .then((data) => alive && (setPrints(data), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  const items = active ? prints.filter((p) => p.collection === active.name) : prints
  return (
    <main className="al">
      <p className="al-back"><Link to="/art-loft">← Back to the Art Loft</Link></p>
      <header className="al-head al-head--left">
        <h1>Digital Prints</h1>
        <p className="al-blurb">Every print is made to order and posted directly from the print studio.</p>
      </header>

      <div className="al-chips" role="navigation" aria-label="Filter by collection">
        <Link to="/art-loft/prints" className={!active ? 'is-on' : ''} aria-current={!active ? 'page' : undefined}>All</Link>
        {COLLECTIONS.map((c) => (
          <Link key={c.slug} to={`/art-loft/prints?collection=${c.slug}`} className={active && active.slug === c.slug ? 'is-on' : ''} aria-current={active && active.slug === c.slug ? 'page' : undefined}>
            {c.name}
          </Link>
        ))}
      </div>

      {status === 'error' && <p className="al-note" role="alert">The prints could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="al-note">Loading…</p>}
      {status === 'ready' && items.length === 0 && <p className="al-note">Nothing here yet. Check back soon.</p>}
      <ul className="al-grid">
        {items.map((p, i) => (
          <li key={p.id}>
            <PrintCard print={p} eager={i < 4} />
          </li>
        ))}
      </ul>
    </main>
  )
}
