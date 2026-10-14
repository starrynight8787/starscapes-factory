import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import { fetchPrint } from './artLoftApi'
import { addItem } from '../cart/cartStore'
import useCart from '../cart/useCart'
import { collectionBySlug, COLLECTIONS, firstImage, formatPrice, formatSize } from './artLoftData'

export default function PrintPage() {
  const { id } = useParams()
  const [print, setPrint] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing | error
  const [pick, setPick] = useState(null) // the chosen variant id

  useTitle(print ? print.title : 'Print')

  useEffect(() => {
    let alive = true
    setStatus('loading')
    fetchPrint(id)
      .then((data) => {
        if (!alive) return
        if (!data) return setStatus('missing')
        setPrint(data)
        setPick(data.product_variants.length ? data.product_variants[0].id : null)
        setStatus('ready')
      })
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [id])

  const variants = print ? print.product_variants : []
  const selected = variants.find((v) => v.id === pick) || null
  const finishes = useMemo(() => {
    const out = []
    if (variants.some((v) => !v.framed)) out.push({ key: 'unframed', label: 'Unframed' })
    const framed = variants.find((v) => v.framed)
    if (framed) out.push({ key: 'framed', label: `${framed.frame_colour || 'Framed'} frame`.replace(/^Framed frame$/, 'Framed') })
    return out
  }, [variants])
  const finish = selected && selected.framed ? 'framed' : 'unframed'
  const sizes = variants.filter((v) => (finish === 'framed') === Boolean(v.framed))
  const collection = print ? COLLECTIONS.find((c) => c.name === print.collection) || null : null

  const { count: inCart } = useCart()
  const [note, setNote] = useState(null) // what to tell the shopper after pressing Add to cart

  function handleAdd() {
    if (!selected || !print) return
    const finishText = selected.framed ? `${selected.frame_colour || 'framed'} frame` : 'unframed'
    const result = addItem({
      key: `print:${selected.id}`,
      type: 'print',
      id: selected.id,
      productId: print.id,
      title: print.title,
      detail: `${formatSize(selected.size_label)}, ${finishText}`,
      price: Number(selected.price),
      image: firstImage(print) || '',
      href: `/art-loft/prints/${print.id}`,
    })
    if (!result.ok) setNote({ kind: 'full' })
    else setNote({ kind: result.capped ? 'max' : 'added' })
  }

  // keep the same size when the finish changes, if that size exists in the other finish
  function chooseFinish(key) {
    if (!selected) return
    const match = variants.find((v) => (key === 'framed') === Boolean(v.framed) && v.size_label === selected.size_label)
    const fallback = variants.find((v) => (key === 'framed') === Boolean(v.framed))
    const next = match || fallback
    if (next) setPick(next.id)
  }

  if (status === 'loading') return <main className="al"><p className="al-note">Loading…</p></main>
  if (status === 'error') return <main className="al"><p className="al-note" role="alert">This print could not load just now. Please try again in a moment.</p></main>
  if (status === 'missing') {
    return (
      <main className="al">
        <p className="al-back"><Link to="/art-loft">← The Art Loft</Link></p>
        <h1>Print not found</h1>
        <p>We couldn't find that print. <Link to="/art-loft/prints">See all prints.</Link></p>
      </main>
    )
  }

  const image = firstImage(print)
  return (
    <main className="al">
      <p className="al-back">
        {collection ? <Link to={`/art-loft/collections/${collection.slug}`}>← {collection.name}</Link> : <Link to="/art-loft/prints">← All prints</Link>}
      </p>
      <div className="al-print">
        <div className="al-print__image">
          {image ? <img src={image} alt={print.title} /> : <div className="al-card__blank" aria-hidden="true" />}
          {!print.published && <span className="al-badge">Draft: only you can see this</span>}
        </div>

        <div className="al-print__info">
          <h1>{print.title}</h1>
          {collection && <p className="al-print__collection"><Link to={`/art-loft/collections/${collection.slug}`}>{collection.name}</Link></p>}
          {print.description && <p className="al-print__desc">{print.description}</p>}

          {variants.length === 0 ? (
            <p className="al-note">Sizes for this print are coming soon.</p>
          ) : (
            <>
              <div className="al-field">
                <span className="al-field__label" id="finish-label">Finish</span>
                <div className="al-choice" role="radiogroup" aria-labelledby="finish-label">
                  {finishes.map((f) => (
                    <button key={f.key} type="button" role="radio" aria-checked={finish === f.key} className={finish === f.key ? 'is-on' : ''} onClick={() => { setNote(null); chooseFinish(f.key) }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="al-field">
                <span className="al-field__label" id="size-label">Size</span>
                <div className="al-choice" role="radiogroup" aria-labelledby="size-label">
                  {sizes.map((v) => (
                    <button key={v.id} type="button" role="radio" aria-checked={pick === v.id} className={pick === v.id ? 'is-on' : ''} onClick={() => { setNote(null); setPick(v.id) }}>
                      {formatSize(v.size_label)}
                      <small>{formatPrice(v.price)}</small>
                    </button>
                  ))}
                </div>
              </div>

              <p className="al-price" aria-live="polite">
                {selected ? formatPrice(selected.price) : ''}
                {selected && <span className="al-price__what"> · {formatSize(selected.size_label)}, {selected.framed ? `${selected.frame_colour || 'framed'} frame` : 'unframed'}</span>}
              </p>
            </>
          )}

          <button type="button" className="al-buy" disabled={!selected} onClick={handleAdd}>Add to cart</button>
          <p className="al-added" role="status">
            {note && note.kind === 'added' && <>Added to your cart. <Link to="/cart">View cart ({inCart})</Link></>}
            {note && note.kind === 'max' && <>You already have the most of this print we can send in one order. <Link to="/cart">View cart ({inCart})</Link></>}
            {note && note.kind === 'full' && <>Your cart is full. Remove something to add another. <Link to="/cart">View cart</Link></>}
          </p>
          <ul className="al-facts">
            <li>Made to order and posted directly from the print studio.</li>
            <li>Delivery cost is shown at checkout, which opens soon.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
