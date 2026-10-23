// @vitest-environment node
// SFW-14: the Terms tick box and the returns summary on Stripe's page, and the rail that keeps REAL payments closed until the legal pages are published.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ published: false }))
vi.mock('../lib/orderConfirmation.js', () => ({ confirmationProblems: () => [] })) // so the only rail under test here is the legal pages one
vi.mock('../src/cart/beforeYouPay.js', async (importOriginal) => {
  const m = await importOriginal(); const out = { ...m }
  Object.defineProperty(out, 'LEGAL_PAGES_PUBLISHED', { get: () => h.published, enumerable: true })
  return out
})
import handler from '../api/checkout.js'
import { STRIPE_SUBMIT_MESSAGE, STRIPE_TERMS_MESSAGE } from '../src/cart/beforeYouPay.js'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const ROW = { id: ID, size_label: '30 x 40 cm', framed: false, frame_colour: null, price: 149, image_url: null, creativehub_variant_id: 'ch-1', products: { title: 'Forests', published: true, images: [] } }
const call = async () => {
  const out = { status: null, body: null }
  const res = { setHeader() {}, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler({ method: 'POST', headers: { origin: 'https://starscapesfactory.com' }, body: { items: [{ id: ID, qty: 1 }] } }, res)
  return out
}
// a stand-in for the database and for Stripe; it records what was sent to Stripe
function network(stripe = { ok: true, status: 200, body: { url: 'https://checkout.stripe.com/c/pay/cs_test_1' } }) {
  const sent = []
  const fn = vi.fn(async (url, init) => {
    if (String(url).includes('/rest/v1/product_variants')) return { ok: true, status: 200, json: async () => [ROW] }
    if (String(url).startsWith('https://api.stripe.com/v1/checkout/sessions')) { sent.push(new URLSearchParams(init.body)); return { ok: stripe.ok, status: stripe.status, json: async () => stripe.body } }
    throw new Error(`unexpected network call: ${url}`)
  })
  vi.stubGlobal('fetch', fn)
  return { sent, fn }
}
beforeEach(() => {
  process.env.CHECKOUT_OPEN = 'yes'; process.env.ALLOW_LIVE_CHECKOUT = 'yes'; process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_ANON_KEY = 'anon'
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'; h.published = false
})

describe('what Stripe is asked to show', () => {
  it('a REQUIRED tick box for the Terms, with our wording, and the returns summary beside the pay button', async () => {
    const { sent } = network(); const out = await call()
    expect(out.status).toBe(200); expect(out.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//); expect(sent).toHaveLength(1)
    const form = sent[0]
    expect(form.get('consent_collection[terms_of_service]')).toBe('required')
    expect(form.get('custom_text[terms_of_service_acceptance][message]')).toBe(STRIPE_TERMS_MESSAGE)
    expect(form.get('custom_text[submit][message]')).toBe(STRIPE_SUBMIT_MESSAGE)
  })
  it('keeps what was already there: a one-off payment, the delivery and import tax note, and no other consent boxes', async () => {
    const { sent } = network(); await call(); const form = sent[0]
    expect(form.get('mode')).toBe('payment'); expect(form.get('custom_text[shipping_address][message]')).toMatch(/Delivery is free/); expect(form.get('shipping_address_collection[allowed_countries][0]')).toBe('GB')
    expect([...form.keys()].filter((k) => k.startsWith('consent_collection'))).toEqual(['consent_collection[terms_of_service]'])
  })
})

describe('real payments wait for the legal pages to be published', () => {
  it('a LIVE payment is refused while the pages are drafts, and nothing is sent to the database or Stripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x'; h.published = false
    const { fn } = network(); const out = await call()
    expect(out.status).toBe(503); expect(out.body.message).toMatch(/not open for real payments/); expect(fn).not.toHaveBeenCalled()
  })
  it('once they are published, a LIVE payment goes through to Stripe, with the tick box', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_x'; h.published = true
    const { sent } = network(); const out = await call()
    expect(out.status).toBe(200); expect(out.body.mode).toBe('live'); expect(sent).toHaveLength(1); expect(sent[0].get('consent_collection[terms_of_service]')).toBe('required')
  })
  it('TEST payments are never held back by it (so the owner can try checkout while the pages are drafts)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'; h.published = false
    const { sent } = network(); expect((await call()).status).toBe(200); expect(sent).toHaveLength(1)
  })
})

describe('when Stripe cannot start the checkout', () => {
  it('says plainly that the Terms page address is missing in Stripe, instead of a vague "try again"', async () => {
    network({ ok: false, status: 400, body: { error: { message: 'You cannot collect consent to your terms of service unless a URL is set in the Dashboard.' } } })
    const out = await call(); expect(out.status).toBe(503); expect(out.body.reason).toBe('terms_url_missing'); expect(out.body.message).toMatch(/address of the Terms page still has to be entered in Stripe/)
  })
  it('any other Stripe problem still gets the ordinary gentle message, with no reason or Stripe detail passed on', async () => {
    network({ ok: false, status: 500, body: { error: { message: 'Something else went wrong inside Stripe: sk_test_secret' } } })
    const out = await call(); expect(out.status).toBe(502); expect(out.body.message).toMatch(/couldn't start checkout just now/); expect(out.body.reason).toBeUndefined(); expect(JSON.stringify(out.body)).not.toMatch(/sk_test|inside Stripe/)
  })
})
