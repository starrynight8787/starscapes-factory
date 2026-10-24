import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import './artloft.css'
import './printdetails.css'
import useTitle from './useTitle'
import { fetchPrint } from './artLoftApi'
import { addItem } from '../cart/cartStore'
import useCart from '../cart/useCart'
import { collectionBySlug, COLLECTIONS, PRINT_FACTS, firstImage, formatPrice, formatSize } from './artLoftData'
import { detailsFor } from './printDetails'
import { descriptionParagraphs } from './descriptionText'

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

  const [look, setLook] = useState('variant') // which picture is showing: this size and frame, or the plain artwork

  // Once the page has settled, fetch the other sizes' pictures quietly so that changing size or frame feels instant
  useEffect(() => {
    if (!variants.length) return undefined
    const timer = setTimeout(() => {
      variants.forEach((v) => {
        if (v.image_url) {
          const picture = new Image()
          picture.src = v.image_url
        }
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [variants])

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
      image: selected.image_url || firstImage(print) || '',
      href: `/art-loft/prints/${print.slug || print.id}`,
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
  // A visit by the old long address goes to the readable one (the website also redirects those addresses before the page loads)
  if (print && print.slug && id !== print.slug) return <Navigate to={`/art-loft/prints/${print.slug}`} replace />
  if (status === 'error') return <main className="al"><p className="al-note" role="alert">This print could not load just now. Please try again in a moment.</p></main>
  if (status === 'missing') {
    return (
      <main className="al">
        <p className="al-back"><Link to="/art-loft">← Back to the Art Loft</Link></p>
        <h1>Print not found</h1>
        <p>We couldn't find that print. <Link to="/art-loft/prints">See all prints.</Link></p>
      </main>
    )
  }

  const artwork = firstImage(print)
  const finishText = selected ? (selected.framed ? `${selected.frame_colour || 'framed'} frame` : 'unframed') : ''
  const preview = selected && selected.image_url ? selected.image_url : null
  const showArtwork = look === 'artwork' || !preview
  const mainSrc = showArtwork ? artwork : preview
  const mainAlt = showArtwork ? print.title : `${print.title}, ${formatSize(selected.size_label)}, ${finishText}`
  return (
    <main className="al">
      <p className="al-back">
        {collection ? <Link to={`/art-loft/collections/${collection.slug}`}>← {collection.name}</Link> : <Link to="/art-loft/prints">← All prints</Link>}
      </p>
      <div className="al-print">
        <div className="al-print__image">
          {mainSrc ? <img src={mainSrc} alt={mainAlt} /> : <div className="al-card__blank" aria-hidden="true" />}
          {!print.published && <span className="al-badge">Draft: only you can see this</span>}
          {preview && artwork && (
            <div className="al-thumbs" role="group" aria-label="Choose a picture">
              <button type="button" className={`al-thumb${showArtwork ? '' : ' is-on'}`} aria-pressed={!showArtwork} onClick={() => setLook('variant')}>
                <img src={preview} alt="" />
                <span>This size and frame</span>
              </button>
              <button type="button" className={`al-thumb${showArtwork ? ' is-on' : ''}`} aria-pressed={showArtwork} onClick={() => setLook('artwork')}>
                <img src={artwork} alt="" />
                <span>The artwork</span>
              </button>
            </div>
          )}
        </div>

        <div className="al-print__info">
          <h1>{print.title}</h1>
          {collection && <p className="al-print__collection"><Link to={`/art-loft/collections/${collection.slug}`}>{collection.name}</Link></p>}
          <p className="al-print__medium">Digitised from my original acrylic painting, printed to order.</p>
          {print.description && (
            <div className="al-print__desc">
              {descriptionParagraphs(print.description).map((para, n) => (
                <p key={n}>{para}</p>
              ))}
            </div>
          )}

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
              {selected && (
                <ul className="al-details" aria-label="About this size and finish">
                  {detailsFor(selected).map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </>
          )}

          <button type="button" className="al-buy" disabled={!selected} onClick={handleAdd}>Add to cart</button>
          <p className="al-added" role="status">
            {note && note.kind === 'added' && <>Added to your cart. <Link to="/cart">View cart ({inCart})</Link></>}
            {note && note.kind === 'max' && <>You already have the most of this print we can send in one order. <Link to="/cart">View cart ({inCart})</Link></>}
            {note && note.kind === 'full' && <>Your cart is full. Remove something to add another. <Link to="/cart">View cart</Link></>}
          </p>
          <ul className="al-facts">
            {PRINT_FACTS.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
