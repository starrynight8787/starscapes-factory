import { Link } from 'react-router-dom'
import { firstImage, formatPrice } from './artLoftData'

export default function PrintCard({ print }) {
  const image = firstImage(print)
  return (
    <Link className="al-card" to={`/art-loft/prints/${print.id}`}>
      <span className="al-card__frame">
        {image ? <img src={image} alt="" loading="lazy" /> : <span className="al-card__blank" aria-hidden="true" />}
        {!print.published && <span className="al-badge">Draft</span>}
      </span>
      <span className="al-card__title">{print.title}</span>
      <span className="al-card__price">From {formatPrice(print.price)}</span>
    </Link>
  )
}
