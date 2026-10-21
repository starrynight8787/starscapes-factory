// @vitest-environment node
// Import taxes (SFW-16, Gill's decision of 21 October 2026: "a for launch"). A print made and delivered inside one region (the UK, the EU, the US) carries no import taxes.
// Canada is the one launch country whose prints cross a border, and duty-paid delivery is OFF for it, so the buyer is told plainly BEFORE paying: on the print page, in the cart,
// and on Stripe's address step. The Terms and Returns say the same. All of it comes from the one list and wording in src/cart/launchCountries.js.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import handler from '../api/checkout.js'
import { LAUNCH_COUNTRIES, MADE_IN_REGION, IMPORT_TAX_COUNTRIES, IMPORT_TAX_NOTE } from '../src/cart/launchCountries.js'
import { PRINT_FACTS } from '../src/artloft/artLoftData.js'
import { LEGAL_PAGES } from '../src/data/legalPages.js'

const read = (rel) => readFileSync(join(process.cwd(), rel), 'utf8')
const section = (slug, title) => LEGAL_PAGES.find((p) => p.slug === slug).sections.find((s) => s.title === title).paragraphs.join('\n')

describe('which launch countries can carry an import bill', () => {
  it('only Canada: every other free-delivery country is printed inside its own region', () => {
    expect(LAUNCH_COUNTRIES).toEqual(['GB', 'IE', 'DE', 'FR', 'US', 'CA']); expect(MADE_IN_REGION).toEqual(['GB', 'IE', 'DE', 'FR', 'US']); expect(IMPORT_TAX_COUNTRIES).toEqual(['CA'])
  })
  it('refuses a new free-delivery country that is not made locally until its import tax wording has been decided (add it to MADE_IN_REGION only if its prints are made in its region; otherwise write its note, and think about duty-paid delivery, SFW-16)', () => {
    expect(IMPORT_TAX_COUNTRIES, 'a launch country was added that is printed in another region: decide its import tax note first').toEqual(['CA'])
    expect(MADE_IN_REGION.filter((c) => !LAUNCH_COUNTRIES.includes(c)), 'MADE_IN_REGION names a country that is not a launch country').toEqual([])
  })
})

describe('the note itself', () => {
  it('names Canada, says import tax and a courier handling fee may be charged on delivery, that they are not in our prices, and that the other countries have none', () => {
    for (const piece of ['Canada', "import tax", 'courier handling fee', 'may be charged when the parcel arrives', 'not included in our prices', 'UK, Ireland, Germany, France and the US have none']) expect(IMPORT_TAX_NOTE, piece).toContain(piece)
  })
})

describe('where a buyer is told, before paying', () => {
  it('on every print page: it is one of the facts shown under Add to cart', () => { expect(PRINT_FACTS).toContain(IMPORT_TAX_NOTE) })
  it('in the cart, next to the line about free delivery', () => {
    const cart = read('src/cart/CartPage.jsx'); expect(cart).toMatch(/import \{[^}]*IMPORT_TAX_NOTE[^}]*\} from '\.\/launchCountries'/); expect(cart).toContain('{IMPORT_TAX_NOTE}')
    expect(cart.indexOf('{IMPORT_TAX_NOTE}')).toBeGreaterThan(cart.indexOf('Delivery is free to'))
  })
  describe('on Stripe\u2019s address step, where the country is chosen (what the checkout really sends to Stripe)', () => {
    const ID = '123e4567-e89b-12d3-a456-426614174000'
    let sent
    beforeEach(() => {
      Object.assign(process.env, { CHECKOUT_OPEN: 'yes', STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon' }); sent = null
      vi.stubGlobal('fetch', vi.fn(async (url, init) => {
        if (String(url).startsWith('https://db.test/')) return { ok: true, status: 200, json: async () => [{ id: ID, size_label: '30 x 40 cm', framed: false, frame_colour: null, price: 89, image_url: null, creativehub_variant_id: 'v1', products: { title: 'Moon Garden', published: true, images: [] } }] }
        sent = new URLSearchParams(init.body); return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/x' }) }
      }))
    })
    const start = async () => { const out = { status: null, body: null }; const res = { setHeader() {}, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }; await handler({ method: 'POST', headers: { origin: 'https://starscapesfactory.com' }, body: { items: [{ id: ID, qty: 1 }] } }, res); return out }
    it('carries the note, after the line that delivery is free', async () => {
      expect((await start()).status).toBe(200); const message = sent.get('custom_text[shipping_address][message]')
      expect(message).toContain('Delivery is free.'); expect(message).toContain(IMPORT_TAX_NOTE); expect(message.indexOf(IMPORT_TAX_NOTE)).toBeGreaterThan(message.indexOf('Delivery is free.')); expect(message.length).toBeLessThan(1200) // Stripe's limit for this message
    })
    it('still limits the address to exactly the launch countries, and does not switch on duty-paid delivery for any of them', async () => {
      await start(); expect([...sent.entries()].filter(([k]) => k.startsWith('shipping_address_collection[allowed_countries]')).map(([, v]) => v)).toEqual(LAUNCH_COUNTRIES)
      expect([...sent.keys()].filter((k) => /duty|ddp|tax_id|automatic_tax/i.test(k))).toEqual([])
    })
  })
})

describe('the Terms and the Returns page say the same', () => {
  const terms = () => section('terms', 'Orders from outside the UK'); const returns = () => section('returns', 'If you ordered from outside the UK')
  it('Terms: prints are made in the region they are delivered to, so there are no import taxes within the UK, the EU or the US; Canada is the exception, and the buyer pays', () => {
    const t = terms(); for (const piece of ['made in the region it is delivered to', 'in the UK for orders to the UK, in Germany for orders to the EU, and in the United States for orders to the US', 'carries no import taxes or customs charges', 'Orders to Canada are made in the United States and cross the border', 'Canadian import tax and a courier handling fee may be charged', 'you are responsible for paying them', 'we may take the cost of returning it out of any refund', 'We are not responsible for delays caused by customs']) expect(t, piece).toContain(piece)
    expect(t).not.toContain('If you live outside the UK, your country may charge') // the old wording that suggested every order outside the UK could be charged
  })
  it('Returns: no import taxes within the UK, the EU and the US; Canadian charges are paid to customs and the courier, not to us, and cannot be refunded by us', () => {
    const r = returns(); for (const piece of ['Orders delivered within the UK, the EU and the US are made in that region and carry no import taxes', 'If you are in Canada and were charged import tax or a courier handling fee', 'so we can\'t refund it', 'you may be able to claim the tax back from customs', 'The consumer laws of your own country may give you extra rights']) expect(r, piece).toContain(piece)
  })
  it('agree with the shop: both talk about Canada and a courier handling fee, as the note does', () => {
    for (const text of [terms(), returns(), IMPORT_TAX_NOTE]) { expect(text).toContain('Canad'); expect(text).toContain('courier handling fee') }
  })
})
