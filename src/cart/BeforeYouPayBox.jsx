import { Link } from 'react-router-dom'
import { BEFORE_YOU_PAY } from './beforeYouPay.js'

// The "Before you pay" box on the cart page, above the pay button (SFW-14). Named ...Box so its name can never be mistaken for beforeYouPay.js (the shared wording): on a Mac or Windows computer, which ignore
// capitals, `./BeforeYouPay` found the wording file instead of this one and the build failed.: the cancellation and returns information the law wants the customer to have BEFORE they pay.
// The wording lives in beforeYouPay.js, shared with Stripe's page. The two links open in a new tab so the cart is not lost.
export default function BeforeYouPayBox() {
  return (
    <section className="cart-before" aria-labelledby="cart-before-title">
      <h3 id="cart-before-title" className="cart-before__title">Before you pay</h3>
      <ul className="cart-before__list">
        {BEFORE_YOU_PAY.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="cart-before__links">
        Please read our <Link to="/page/terms" target="_blank" rel="noopener noreferrer">Terms and conditions</Link> and our <Link to="/page/returns" target="_blank" rel="noopener noreferrer">Returns and refunds</Link> page, which has the cancellation form. On the next page you will be asked to tick a box to agree to them.
      </p>
    </section>
  )
}
