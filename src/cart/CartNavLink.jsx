import { Link } from 'react-router-dom'
import './cart.css'
import useCart from './useCart'

// The "Cart" link in the menu, with a little count when there is something in it.
export default function CartNavLink({ className, onClick }) {
  const { count } = useCart()
  return (
    <Link
      to="/cart"
      className={className}
      onClick={onClick}
      aria-label={count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
    >
      Cart
      {count > 0 && <span className="sf-cart-count" aria-hidden="true">{count}</span>}
    </Link>
  )
}
