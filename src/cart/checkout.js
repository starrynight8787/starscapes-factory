// Starting a payment from the cart. Only WHICH prints and HOW MANY go to the server. Prices are never sent:
// the server looks every price up again in the shop database.

export async function startCheckout(items) {
  const lines = items.map((item) => ({ id: item.id, qty: item.qty }))
  let res
  try {
    res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lines }),
    })
  } catch (e) {
    throw new Error('Could not reach the shop to start checkout. Check your connection and try again.')
  }
  let body = null
  try {
    body = await res.json()
  } catch (e) {
    throw new Error('Checkout only works on the live site. Open starscapesfactory.com and try again there.')
  }
  if (!res.ok || !body || body.ok !== true || typeof body.url !== 'string') {
    throw new Error((body && body.message) || 'We could not start checkout just now. Please try again in a moment.')
  }
  // only ever send the shopper to Stripe's own checkout page
  if (!/^https:\/\/checkout\.stripe\.com\//.test(body.url)) throw new Error('We could not start checkout just now. Please try again in a moment.')
  return body
}
