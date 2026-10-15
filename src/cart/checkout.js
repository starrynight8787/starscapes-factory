// Starting a payment from the cart. Only WHICH prints and HOW MANY go to the server. Prices are never sent:
// the server looks every price up again in the shop database.

// The shop owner's sign-in, if there is one. The server only lets the owner start a checkout while the shop is closed.
async function signInToken() {
  try {
    const { supabase } = await import('../supabaseClient')
    const { data } = await supabase.auth.getSession()
    return (data && data.session && data.session.access_token) || ''
  } catch (e) {
    return ''
  }
}

// Is checkout open to visitors? And, if not, may this signed-in person test it? Anything unclear means closed.
export async function checkoutStatus() {
  const token = await signInToken()
  try {
    const res = await fetch('/api/checkout', { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} })
    const body = await res.json()
    if (!res.ok || !body || body.ok !== true) return { open: false, can_test: false }
    return { open: body.open === true, can_test: body.can_test === true }
  } catch (e) {
    return { open: false, can_test: false }
  }
}

export async function startCheckout(items) {
  const lines = items.map((item) => ({ id: item.id, qty: item.qty }))
  const token = await signInToken()
  let res
  try {
    res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
