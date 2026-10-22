import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './cart.css'
import useCart from './useCart'
import { startCheckout, checkoutStatus } from './checkout'
import { redirectTo } from './redirect'
import { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE } from './launchCountries'
import { KINDS, setQty, removeItem, clearCart } from './cartStore'
import { formatMoney } from './money'
import PageBanner from '../components/PageBanner'

// "United Kingdom, Ireland and Canada"
function countryList(codes) {
  const names = new Intl.DisplayNames(['en'], { type: 'region' })
  const list = codes.map((c) => names.of(c))
  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.join('')
}

export default function CartPage() {
  const { items, count, subtotal } = useCart()
  const [params] = useSearchParams()
  const [paying, setPaying] = useState({ busy: false, error: '' })
  const [gate, setGate] = useState({ ready: false, open: false, can_test: false })
  const printsOnly = items.every((i) => i.type === 'print')
  const canPay = gate.ready && (gate.open || gate.can_test)

  // Is checkout open to visitors yet? (The owner can always test it.)
  useEffect(() => {
    let alive = true
    checkoutStatus().then((status) => {
      if (alive) setGate({ ready: true, ...status })
    })
    return () => {
      alive = false
    }
  }, [])

  async function handleCheckout() {
    setPaying({ busy: true, error: '' })
    try {
      const { url } = await startCheckout(items)
      redirectTo(url) // off to Stripe's own page
    } catch (e) {
      setPaying({ busy: false, error: e.message })
    }
  }

  if (items.length === 0) {
    return (
      <main className="cart legacy cart--v2">
        <PageBanner art="plain" room="factory-floor" chip="Your cart" title="Nothing here yet" subtitle="Browse the Art Loft and add a print you love." />
        <section className="cart-card cart-card--empty" aria-label="Your cart">
          <p className="cart-empty">Your cart is empty.</p>
          <p>
            <Link to="/art-loft">Browse the Art Loft</Link> · <Link to="/art-loft/prints">See all digital prints</Link>
          </p>
        </section>
      </main>
    )
  }

  const vat = Math.round((subtotal * 100) / 6) / 100 // prices already include UK VAT at 20%
  return (
    <main className="cart legacy cart--v2">
      <PageBanner
        art="plain"
        room="factory-floor"
        chip="Your cart"
        title="Nearly there"
        subtitle="Check your order, then pay safely on Stripe. Your receipt arrives by email straight away."
      />
      <div className="cart-body">
      <div className="cart-main">
      <section className="cart-card" aria-label="Your order">
      <h2 className="cart-card__title">Your order</h2>
      <p className="cart-count" role="status">
        {count} {count === 1 ? 'item' : 'items'}
      </p>
      {params.get('checkout') === 'cancelled' && <p className="cart-notice" role="status">Checkout was cancelled. Nothing was charged, and your cart is still here.</p>}

      <ul className="cart-lines">
        {items.map((i) => {
          const kind = KINDS[i.type]
          const title = i.href ? <Link to={i.href}>{i.title}</Link> : i.title
          return (
            <li key={i.key} className="cart-line">
              <div className="cart-line__thumb">{i.image ? <img src={i.image} alt="" /> : <span aria-hidden="true" />}</div>
              <div className="cart-line__info">
                <span className="cart-line__kind">{kind.label}</span>
                <strong className="cart-line__title">{title}</strong>
                {i.detail && <span className="cart-line__detail">{i.detail}</span>}
                <span className="cart-line__each">{formatMoney(i.price)} each</span>
              </div>
              <div className="cart-line__qty">
                {kind.max > 1 ? (
                  <div className="cart-qty" role="group" aria-label={`Quantity for ${i.title}`}>
                    <button type="button" onClick={() => setQty(i.key, i.qty - 1)} aria-label={`One fewer ${i.title}`}>−</button>
                    <span aria-live="polite">{i.qty}</span>
                    <button type="button" onClick={() => setQty(i.key, i.qty + 1)} disabled={i.qty >= kind.max} aria-label={`One more ${i.title}`}>+</button>
                  </div>
                ) : (
                  <span className="cart-qty__one">One only</span>
                )}
              </div>
              <div className="cart-line__total">{formatMoney(Math.round(i.price * 100) * i.qty / 100)}</div>
              <button type="button" className="cart-line__remove" onClick={() => removeItem(i.key)} aria-label={`Remove ${i.title} from your cart`}>
                Remove
              </button>
            </li>
          )
        })}
      </ul>
      </section>
      <p className="cart-more"><Link to="/art-loft">← Keep browsing the Art Loft</Link></p>
      </div>

      <section className="cart-summary" aria-label="Order summary">
        <h2 className="cart-card__title">Order summary</h2>
        <p className="cart-summary__line">
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span>{formatMoney(subtotal)}</span>
        </p>
        <p className="cart-summary__line">
          <span>Delivery</span>
          <span>Free</span>
        </p>
        <p className="cart-summary__line">
          <span>VAT included (20%)</span>
          <span>{formatMoney(vat)}</span>
        </p>
        <p className="cart-summary__row">
          <span>Total due today</span>
          <strong>{formatMoney(subtotal)}</strong>
        </p>
        <p className="cart-summary__note">Delivery is free to {countryList(LAUNCH_COUNTRIES)}. You'll choose your address on the next page.</p>
        <p className="cart-summary__note">{IMPORT_TAX_NOTE}</p>
        {!printsOnly && <p className="cart-summary__note" role="status">Checkout only handles prints for now. Please remove anything else to pay.</p>}
        <button type="button" className="cart-checkout" disabled={paying.busy || !printsOnly || !canPay} onClick={handleCheckout}>
          {paying.busy ? 'Taking you to the payment page…' : gate.ready && !canPay ? 'Checkout opens soon' : `Pay ${formatMoney(subtotal)} securely`}
        </button>
        {gate.ready && !canPay && <p className="cart-summary__note" role="status">Your cart is saved on this device until checkout opens.</p>}
        {gate.ready && !gate.open && gate.can_test && <p className="cart-summary__note" role="status">Checkout is closed to visitors. You can test it because you are signed in as the owner.</p>}
        {paying.error && <p className="cart-summary__note cart-summary__error" role="alert">{paying.error}</p>}
        <p className="cart-summary__note">You pay on Stripe's secure page. Orders sent outside the UK may be charged import taxes or duties by the destination country, which aren't included in the price.</p>
        <p className="cart-summary__clear">
          <button type="button" onClick={clearCart}>Empty cart</button>
        </p>
      </section>
      </div>
    </main>
  )
}
