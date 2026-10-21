import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './cart.css'
import PageBanner from '../components/PageBanner'
import { clearCart } from './cartStore'

// Where Stripe sends the shopper after paying. The payment itself is confirmed by Stripe, not by this page.
export default function CheckoutSuccess() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')

  useEffect(() => {
    if (sessionId) clearCart() // the cart has done its job
  }, [sessionId])

  if (!sessionId) {
    return (
      <main className="cart">
        <PageBanner art="plain" room="art-loft" chip="Your order" title="Nothing to show here" />
        <p><Link to="/art-loft">Browse the Art Loft</Link></p>
      </main>
    )
  }
  return (
    <main className="cart">
      <PageBanner art="plain" room="art-loft" chip="Your order" title="Thank you" />
      <p role="status">Your payment went through. You'll get a receipt by email from Stripe.</p>
      <p>Each print is made to order and posted straight to you from the print studio.</p>
      <p><Link to={`/invoice?session_id=${encodeURIComponent(sessionId)}`}>View or print your invoice</Link></p>
      <p><Link to="/art-loft">Back to the Art Loft</Link></p>
    </main>
  )
}
