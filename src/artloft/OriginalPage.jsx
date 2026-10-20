import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import { fetchOriginal } from './artLoftApi'
import { formatPrice, ORIGINALS_ONLINE_CHECKOUT } from './artLoftData'
import { detailLines, enquiryHref, isSold, ENQUIRY_EMAIL } from './originals'
import { addItem } from '../cart/cartStore'
import useCart from '../cart/useCart'
import { descriptionParagraphs } from './descriptionText'

// One original painting, at /art-loft/originals/:id.
// While originals cannot be bought online, an available one shows an email button. A sold one says so and offers nothing to buy.
export default function OriginalPage({ online = ORIGINALS_ONLINE_CHECKOUT }) {
  const { id } = useParams()
  const [original, setOriginal] = useState(undefined) // undefined = loading, null = not found
  const [failed, setFailed] = useState(false)
  const [photo, setPhoto] = useState(0)
  const [added, setAdded] = useState(false)
  const { items } = useCart()
  useTitle(original ? original.title : 'Original painting')

  useEffect(() => {
    let alive = true
    setOriginal(undefined)
    setFailed(false)
    setPhoto(0)
    fetchOriginal(id)
      .then((o) => alive && setOriginal(o))
      .catch(() => alive && (setFailed(true), setOriginal(null)))
    return () => {
      alive = false
    }
  }, [id])

  const back = <p className="al-back"><Link to="/art-loft/originals">← All originals</Link></p>
  if (original === undefined) return <main className="al">{back}<p className="al-note">Loading…</p></main>
  if (!original) {
    return (
      <main className="al">
        {back}
        <h1>{failed ? 'This could not load' : 'Original not found'}</h1>
        <p>{failed ? 'Please try again in a moment.' : "That original doesn't exist, or it is no longer shown."} <Link to="/art-loft/originals">See all the originals.</Link></p>
      </main>
    )
  }

  const sold = isSold(original)
  const images = original.images || []
  const main = images[Math.min(photo, Math.max(images.length - 1, 0))]
  const facts = detailLines(original)
  const key = `original:${original.id}`
  const inCart = items.some((i) => i.key === key)

  function addToCart() {
    const result = addItem({
      key,
      type: 'original',
      id: original.id,
      productId: original.id,
      title: original.title,
      detail: facts.filter((f) => f !== 'Framed' && f !== 'Unframed' && !f.startsWith('Painted in')).join(', '),
      price: original.price,
      image: images[0] || '',
      href: `/art-loft/originals/${original.id}`,
    })
    if (result.ok) setAdded(true)
  }

  return (
    <main className="al">
      {back}
      <div className="al-print">
        <div className="al-print__image">
          {main ? <img src={main} alt={`${original.title}${photo > 0 ? `, photo ${photo + 1}` : ''}`} /> : <div className="al-card__blank" aria-hidden="true" />}
          {sold && <span className="al-badge al-badge--sold">Sold</span>}
          {!original.published && <span className="al-badge al-badge--draft">Draft: only you can see this</span>}
          {images.length > 1 && (
            <div className="al-thumbs" role="group" aria-label="Choose a photo">
              {images.map((src, i) => (
                <button key={src} type="button" className={`al-thumb${i === photo ? ' is-on' : ''}`} aria-pressed={i === photo} aria-label={`Photo ${i + 1} of ${images.length}`} onClick={() => setPhoto(i)}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="al-print__info">
          <h1>{original.title}</h1>
          <p className="al-print__collection">Original painting, one of a kind</p>
          {facts.length > 0 && (
            <ul className="al-facts">
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {original.description && (
            <div className="al-print__desc">
              {descriptionParagraphs(original.description).map((para, n) => (
                <p key={n}>{para}</p>
              ))}
            </div>
          )}

          {sold ? (
            <div className="al-original__buy">
              <p className="al-price">Sold</p>
              <p className="al-original__note">This original has found a home. <Link to="/art-loft/originals">See the other originals</Link> or <Link to="/art-loft/prints">browse the prints</Link>.</p>
            </div>
          ) : (
            <div className="al-original__buy">
              <p className="al-price">{formatPrice(original.price)}</p>
              {online ? (
                <>
                  <button type="button" className="al-buy" onClick={addToCart} disabled={inCart}>
                    {inCart ? 'In your cart' : 'Add to cart'}
                  </button>
                  <p className="al-original__note" role="status">
                    {(added || inCart) && <>This is one of a kind, so there is only one to buy. <Link to="/cart">View cart</Link></>}
                  </p>
                </>
              ) : (
                <>
                  <a className="al-btn" href={enquiryHref(original)}>Enquire about this original</a>
                  <p className="al-original__note">To buy this original, email {ENQUIRY_EMAIL} and mention its title.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
