import { Link } from 'react-router-dom'
import './cart.css'
import useCart from './useCart'
import { KINDS, setQty, removeItem, clearCart } from './cartStore'
import { formatMoney } from './money'

export default function CartPage() {
  const { items, count, subtotal } = useCart()

  if (items.length === 0) {
    return (
      <main className="cart">
        <h1>Your cart</h1>
        <p className="cart-empty">Your cart is empty.</p>
        <p>
          <Link to="/art-loft">Browse the Art Loft</Link> · <Link to="/art-loft/prints">See all digital prints</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="cart">
      <h1>Your cart</h1>
      <p className="cart-count" role="status">
        {count} {count === 1 ? 'item' : 'items'}
      </p>

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

      <section className="cart-summary" aria-label="Order summary">
        <p className="cart-summary__row">
          <span>Subtotal</span>
          <strong>{formatMoney(subtotal)}</strong>
        </p>
        <p className="cart-summary__note">Delivery and any taxes are worked out at checkout.</p>
        <button type="button" className="cart-checkout" disabled>Checkout: coming soon</button>
        <p className="cart-summary__note">Checkout opens soon. Your cart is saved on this device until then.</p>
        <p className="cart-summary__clear">
          <button type="button" onClick={clearCart}>Empty cart</button>
        </p>
      </section>

      <p className="cart-more"><Link to="/art-loft">← Keep browsing the Art Loft</Link></p>
    </main>
  )
}
