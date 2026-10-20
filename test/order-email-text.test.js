// @vitest-environment node
// The order confirmation email: what it must say (the law requires it, and nothing can go in the parcel), and the rails around it.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { buildConfirmation, buildSections, deliveryEstimate, reference, money, pendingItems, WORDING_APPROVED, COMPANY, RETURN, PAGES, SITE } from '../lib/orderEmailText'
import { CONTACT_EMAIL } from '../src/data/contact'

const order = (extra = {}) => ({
  stripe_session_id: 'cs_test_a1B2c3D4e5F6g7H8',
  livemode: false,
  created_at: '2026-10-17T10:00:00Z',
  customer_name: 'Jane Smith',
  customer_email: 'jane@example.com',
  shipping: { name: 'Jane Smith', address: { line1: '1 High Street', line2: 'Flat 2', city: 'Leeds', state: 'West Yorkshire', postal_code: 'LS1 1AA', country: 'GB' } },
  amount_total: 14900,
  currency: 'gbp',
  items: [{ title: 'Forests', description: '30 × 40 cm, unframed', qty: 1, unit_amount: 14900 }],
  ...extra,
})

describe('the confirmation email carries what the law asks for', () => {
  const { text } = buildConfirmation(order())
  it('names the print, its size and finish, the quantity and the price', () => {
    expect(text).toMatch(/1 x Forests \(30 × 40 cm, unframed\): £149\.00 each, £149\.00/)
  })
  it('gives the total including VAT, and says delivery is free', () => {
    expect(text).toMatch(/Total paid, including VAT: £149\.00/)
    expect(text).toMatch(/Delivery: Free/)
  })
  it('says who we are: full company name, number, registered office, VAT number and an email address', () => {
    for (const part of [COMPANY.name, COMPANY.number, COMPANY.office, COMPANY.vat, CONTACT_EMAIL]) expect(text).toContain(part)
    expect(COMPANY.vat).toBe('GB445903680')
  })
  it('gives the delivery address and the delivery time, and the 30-day backstop', () => {
    expect(text).toMatch(/Leeds/)
    expect(text).toMatch(/United Kingdom/)
    expect(text).toMatch(/We expect your print to reach you within 6 to 10 working days of your order \(printing and delivery together\)/)
    expect(text).not.toMatch(/7 to 15|then the post takes the rest/)
    expect(text).toMatch(/within 30 days of your order/)
  })
  it('explains the 14-day right to cancel, how to use it, who pays to send it back, and the refund', () => {
    expect(text).toMatch(/right to cancel this contract within 14 days without giving any reason/)
    expect(text).toContain(`email ${CONTACT_EMAIL}`)
    expect(text).toMatch(/You pay the cost of sending it back/)
    expect(text).toMatch(/within 14 days of getting the print back or of you showing us proof/)
    expect(text).toMatch(/cannot charge any other fee/)
  })
  it('includes the model cancellation form, so cancelling never depends on a page being published', () => {
    expect(text).toMatch(/MODEL CANCELLATION FORM/)
    expect(text).toMatch(/hereby give notice that I \/ We \[\*\] cancel my \/ our contract of sale of the following goods/)
    expect(text).toMatch(/\[\*\] Delete as appropriate/)
  })
  it('says the print must match the order, and what to do if it is faulty, without making the customer pay to return it', () => {
    expect(text).toMatch(/faulty, damaged or not as described/)
    expect(text).toMatch(/do not pay to send a faulty print back/)
  })
  it('says the contract begins with this email, as the Terms say', () => {
    expect(text).toMatch(/your contract with us begins with this email/)
  })
  it('says when the print is at our risk and when it is the customer\u2019s', () => {
    expect(text).toMatch(/Until then it is at our risk/)
  })
})

describe('promises it must not make', () => {
  const { text, html } = buildConfirmation(order())
  it('does not claim a guarantee or worldwide delivery (Creative Hub has not confirmed them)', () => {
    expect(text + html).not.toMatch(/guarantee|worldwide/i)
  })
  it('may say tracking details will be emailed, because Creative Hub confirmed in writing on 20 October 2026 that all orders have tracking: and says it as the Terms do', () => {
    expect(text).toMatch(/We will email you when your order has been posted, with your tracking details\./)
  })
  it('says an address can only be changed before posting, matching what Creative Hub told us, and asks them to email straight away', () => {
    expect(text).toMatch(/If something is wrong with the delivery address, email us straight away: we can only change it before your order has been posted\./)
  })
  it('does not use the old contact address, and does not write the address out by hand', () => {
    expect(text + html).not.toMatch(/inspire@/)
    expect(fs.readFileSync('lib/orderEmailText.js', 'utf8')).not.toMatch(/@starscapesfactory\.com/)
  })
  it('does not link to a page that is not published', () => {
    expect(Object.values(PAGES).every((p) => p === '' || p.startsWith(`${SITE}/`))).toBe(true)
    if (Object.values(PAGES).every((p) => p === '')) expect(text.replace(/View or print your invoice: \S+/, '')).not.toMatch(/https?:\/\//) // the invoice page is published, so its link is allowed
  })
})

describe('delivery times follow Creative Hub\u2019s numbers', () => {
  // Creative Hub, in writing on 20 October 2026: the standard 6 to 10 working days (production and delivery together) applies to both framed and unframed prints.
  it('unframed: 6 to 10 working days in the launch countries', () => {
    expect(deliveryEstimate([{ description: '30 × 40 cm, unframed' }], 'GB').text).toBe('6 to 10 working days')
    expect(deliveryEstimate([{ description: '30 × 40 cm, unframed' }], 'US').text).toBe('6 to 10 working days')
  })
  it('framed: the same 6 to 10 working days (making and delivery together), not making days added on top', () => {
    expect(deliveryEstimate([{ description: '60 × 80 cm, oak frame' }], 'DE').text).toBe('6 to 10 working days')
    expect(deliveryEstimate([{ description: '60 × 80 cm, oak frame' }], 'DE').framed).toBe(true)
  })
  it('a mixed order gets the same answer, framed or not', () => {
    expect(deliveryEstimate([{ description: 'x, unframed' }, { description: 'y, black frame' }], 'FR').text).toBe('6 to 10 working days')
  })
  it('outside the countries with the standard time it goes up to 15 working days, so it never says 6 to 10 there', () => {
    expect(deliveryEstimate([{ description: '30 × 40 cm, unframed' }], 'AU').text).toBe('6 to 15 working days')
  })
})

describe('safety', () => {
  it('escapes anything a customer typed, so a name or address cannot add markup to the email', () => {
    const o = order({ customer_name: '<script>alert(1)</script>', shipping: { name: '<b>x</b>', address: { line1: '"><img src=x onerror=1>', city: 'Leeds', country: 'GB' } } })
    const { html, text } = buildConfirmation(o)
    expect(html).not.toMatch(/<script|<img|<b>x/)
    expect(html).toMatch(/&lt;script&gt;/)
    expect(text).toContain('<script>') // plain text is not markup, so it can say what was typed
  })
  it('puts a clear TEST banner on a test order, and none on a real one', () => {
    expect(buildConfirmation(order()).subject).toMatch(/^\[TEST\] /)
    expect(buildConfirmation(order()).text).toMatch(/THIS IS A TEST ORDER/)
    const real = buildConfirmation(order({ livemode: true }))
    expect(real.subject).not.toMatch(/TEST/)
    expect(real.text).not.toMatch(/THIS IS A TEST ORDER/)
  })
  it('keeps the subject on one line', () => {
    expect(buildConfirmation(order()).subject).not.toMatch(/[\r\n]/)
  })
  it('copes with an order missing its details, without throwing', () => {
    expect(() => buildConfirmation({})).not.toThrow()
    expect(() => buildConfirmation(order({ items: null, shipping: null, amount_total: null }))).not.toThrow()
  })
  it('gives each order a short reference from its Stripe id', () => {
    expect(reference(order())).toBe('SF-E5F6G7H8')
    expect(reference({})).toBe('SF-ORDER')
  })
  it('formats pounds', () => {
    expect(money(14900)).toBe('£149.00')
    expect(money(5)).toBe('£0.05')
    expect(money(NaN)).toBe('')
  })
  it('has the same sections for the text and the HTML, because both are made from one list', () => {
    const headings = buildSections(order()).map((s) => s.heading).filter(Boolean)
    const { html } = buildConfirmation(order())
    headings.forEach((h) => expect(html).toContain(h))
  })
})

describe('the approval rail', () => {
  it('is NOT approved yet: real customers get no email, and real checkout stays closed, until Gill says yes', () => {
    expect(WORDING_APPROVED).toBe(false)
  })
  it('can never be switched on while a gap is still open', () => {
    if (WORDING_APPROVED) {
      expect(pendingItems()).toEqual([])
      expect(RETURN.address).not.toBe('')
      expect(RETURN.largeFramedNote).not.toBe('')
    }
  })
  it('shows a visible marker for each open gap, so a test email cannot hide one', () => {
    const { text } = buildConfirmation(order())
    if (!RETURN.address) expect(text).toMatch(/\[RETURN ADDRESS/)
    if (!RETURN.largeFramedNote) expect(text).toMatch(/\[LARGE FRAMED PRINTS/)
    expect(text).toMatch(/DRAFT WORDING/)
  })
})
