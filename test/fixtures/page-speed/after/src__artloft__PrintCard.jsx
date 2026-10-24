import { Link } from 'react-router-dom'
import { firstImage, formatPrice } from './artLoftData'

// What the picture shows, for people who cannot see it and for Pinterest, which uses it as the pin's description: "Behind the Curtain, abstract art print, Out of this World collection"
export const printAlt = (print) => `${print.title}, abstract art print${print.collection ? `, ${print.collection} collection` : ''}`

// eager: the first few cards on a page are in view straight away, so they load at once instead of lazily (a lazily loaded picture that is already on screen arrives late and
// is what a speed test counts as the page's biggest paint); the rest load lazily as before
export default function PrintCard({ print, eager = false }) {
  const image = firstImage(print)
  return (
    <Link className="al-card" to={`/art-loft/prints/${print.slug || print.id}`}>
      <span className="al-card__frame">
        {image ? <img src={image} alt={printAlt(print)} loading={eager ? 'eager' : 'lazy'} decoding="async" /> : <span className="al-card__blank" aria-hidden="true" />}
        {!print.published && <span className="al-badge">Draft</span>}
      </span>
      <span className="al-card__title">{print.title}</span>
      <span className="al-card__price">From {formatPrice(print.price)}</span>
    </Link>
  )
}
