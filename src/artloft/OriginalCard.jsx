import { Link } from 'react-router-dom'
import { formatPrice } from './artLoftData'
import { isSold, sizeText } from './originals'

// One original painting in a grid. A sold one stays here, with a Sold label.
export default function OriginalCard({ original }) {
  const image = original.images && original.images[0]
  const sold = isSold(original)
  const size = sizeText(original)
  return (
    <Link className={`al-card al-card--original${sold ? ' is-sold' : ''}`} to={`/art-loft/originals/${original.id}`}>
      <span className="al-card__frame">
        {image ? <img src={image} alt="" loading="lazy" /> : <span className="al-card__blank" aria-hidden="true" />}
        {sold && <span className="al-badge al-badge--sold">Sold</span>}
        {!original.published && <span className="al-badge al-badge--draft">Draft</span>}
      </span>
      <span className="al-card__title">{original.title}</span>
      <span className="al-card__price">{sold ? 'Sold' : formatPrice(original.price)}</span>
      {size && <span className="al-card__size">{size}</span>}
    </Link>
  )
}
