import { useEffect, useState } from 'react'
import { INSTAGRAM_GILL } from '../data/contact'
import './instagram.css'

export const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }

// The latest pictures from Gill's Instagram, on the Photography page. Same idea as the YouTube Series page: the pictures come from this site's own function
// (api/youtube-series?source=instagram), so a visitor's browser never contacts Instagram until they press a picture. If Instagram is not connected yet, or cannot
// be reached, the pictures are simply left out and the Follow button is still there.
export default function InstagramGallery() {
  const [photos, setPhotos] = useState([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(() => fetch('/api/youtube-series?source=instagram'))
      .then((r) => r.json())
      .then((body) => { if (alive && body && body.ok && Array.isArray(body.photos)) setPhotos(body.photos.filter((p) => p && p.id && p.src && p.link)) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const shown = expanded ? photos : photos.slice(0, 8)
  return (
    <section className="ig" aria-labelledby="ig-title">
      <h2 id="ig-title" className="ig__h2">From Instagram</h2>
      {shown.length > 0 && (
        <ul className="ig__grid">
          {shown.map((p) => (
            <li key={p.id} className="ig__item">
              <a className="ig__link" href={p.link} target="_blank" rel="noopener noreferrer" aria-label={`${p.caption || 'A photo'} (opens Instagram in a new tab)`}>
                <img src={p.src} alt={p.caption || ''} loading="lazy" onError={(e) => { e.currentTarget.closest('li').style.display = 'none' }} />
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="ig__after">
        {photos.length > 8 && !expanded && <button type="button" className="pg-btn" onClick={() => setExpanded(true)}>Show more photos</button>}
        <a className="pg-btn fm-btn--primary" href={INSTAGRAM_GILL} target="_blank" rel="noopener noreferrer" aria-label="Follow @gill_bennet on Instagram (opens in a new tab)">Follow @gill_bennet on Instagram ↗</a>
      </div>
    </section>
  )
}
