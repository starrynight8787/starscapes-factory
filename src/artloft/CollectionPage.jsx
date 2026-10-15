import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import PrintCard from './PrintCard'
import { fetchPrints } from './artLoftApi'
import { collectionBySlug, printsIn } from './artLoftData'

export default function CollectionPage() {
  const { slug } = useParams()
  const collection = collectionBySlug(slug)
  useTitle(collection ? collection.name : 'Collection not found')
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
  return (
    <main className="al">
      <p className="al-back"><Link to="/art-loft">← Back to the Art Loft</Link></p>
      <header className="al-head al-head--left">
        <h1>{collection.name}</h1>
        <p className="al-blurb">{collection.blurb}</p>
      </header>
      {status === 'error' && <p className="al-note" role="alert">The prints could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="al-note">Loading…</p>}
      {status === 'ready' && items.length === 0 && <p className="al-note">These prints are on their way. Check back soon.</p>}
      <ul className="al-grid">
        {items.map((p) => (
          <li key={p.id}>
            <PrintCard print={p} />
          </li>
        ))}
      </ul>
    </main>
  )
}
