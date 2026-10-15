import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import PrintCard from './PrintCard'
import OriginalCard from './OriginalCard'
import { fetchPrints, fetchOriginals } from './artLoftApi'
import { collectionBySlug, printsIn } from './artLoftData'
import { originalsIn, sortOriginals } from './originals'

export default function CollectionPage() {
  const { slug } = useParams()
  const collection = collectionBySlug(slug)
  useTitle(collection ? collection.name : 'Collection not found')
  const [prints, setPrints] = useState([])
  const [originals, setOriginals] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true
    // The originals are an extra: if they cannot be loaded (for example the database has not been updated yet), the prints still show
    const originalsOrNone = fetchOriginals().catch(() => [])
    Promise.all([fetchPrints({ withPictures: true }), originalsOrNone])
      .then(([data, extra]) => alive && (setPrints(data), setOriginals(extra), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  if (!collection) {
    return (
      <main className="al">
        <p className="al-back"><Link to="/art-loft">← Back to the Art Loft</Link></p>
        <h1>Collection not found</h1>
        <p>That collection doesn't exist. <Link to="/art-loft">Go back to the Art Loft.</Link></p>
      </main>
    )
  }

  const items = printsIn(collection.name, prints)
  const originalsHere = sortOriginals(originalsIn(collection.name, originals))
  return (
    <main className="al">
      <p className="al-back"><Link to="/art-loft">← Back to the Art Loft</Link></p>
      <header className="al-head al-head--left">
        <h1>{collection.name}</h1>
        <p className="al-blurb">{collection.blurb}</p>
      </header>
      {status === 'error' && <p className="al-note" role="alert">The prints could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="al-note">Loading…</p>}
      {status === 'ready' && items.length === 0 && originalsHere.length === 0 && <p className="al-note">These prints are on their way. Check back soon.</p>}
      {items.length > 0 && originalsHere.length > 0 && <h2 className="al-section">Prints</h2>}
      <ul className="al-grid">
        {items.map((p) => (
          <li key={p.id}>
            <PrintCard print={p} />
          </li>
        ))}
      </ul>
      {originalsHere.length > 0 && (
        <section className="al-originals" aria-label="Original paintings">
          <h2 className="al-section">Original paintings</h2>
          <ul className="al-grid">
            {originalsHere.map((o) => (
              <li key={o.id}>
                <OriginalCard original={o} />
              </li>
            ))}
          </ul>
          <p className="al-note"><Link to="/art-loft/originals">See all the original paintings</Link></p>
        </section>
      )}
    </main>
  )
}
