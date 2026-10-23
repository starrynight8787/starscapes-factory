// SFW-14: the wording a customer is given BEFORE they pay (on the cart and on Stripe's page), and the rail that ties it to the legal pages being published.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BeforeYouPayBox from '../src/cart/BeforeYouPayBox'
import { BEFORE_YOU_PAY, STRIPE_SUBMIT_MESSAGE, STRIPE_TERMS_MESSAGE, STRIPE_TEXT_LIMIT, TERMS_URL, RETURNS_URL, LEGAL_PAGES_PUBLISHED } from '../src/cart/beforeYouPay'
import { LARGE_FRAMED_RETURN } from '../src/data/returns'
import { LEGAL_PAGES } from '../src/data/legalPages'

const read = (p) => fs.readFileSync(p, 'utf8')
const page = (slug) => LEGAL_PAGES.find((p) => p.slug === slug)
const returnsText = () => page('returns').sections.map((s) => s.paragraphs.join('\n')).join('\n')

describe('the wording itself', () => {
  it('tells the customer: they can change their mind (14 days after delivery, no reason), who pays for a large framed return, that faults are put right free, and that paying is an offer', () => {
    expect(BEFORE_YOU_PAY).toHaveLength(4)
    expect(BEFORE_YOU_PAY[0]).toMatch(/cancel at any time until 14 days after your print is delivered, without giving a reason/)
    expect(BEFORE_YOU_PAY[1]).toBe(`${LARGE_FRAMED_RETURN}.`)
    expect(BEFORE_YOU_PAY[2]).toMatch(/faulty, damaged or not as you ordered.*You do not pay to send it back/)
    expect(BEFORE_YOU_PAY[3]).toMatch(/you make an offer to buy.*when we email you to confirm your order/)
  })
  it('agrees with the Returns page and the Terms: the same large-framed sentence, the same 14 days, the same offer-and-acceptance', () => {
    expect(returnsText()).toContain(LARGE_FRAMED_RETURN); expect(returnsText()).toMatch(/14 days after the day your print is delivered/)
    expect(page('terms').sections.find((s) => s.title.startsWith('Placing an order')).paragraphs.join(' ')).toMatch(/Pressing the pay button is your offer to buy\. We accept your offer, and a contract between you and us begins, when we email you to confirm your order/)
  })
  it('Stripe\'s two pieces of text fit its limit, and carry the whole summary, the Returns link and (for the tick box) both pages and the 14-day right', () => {
    for (const t of [STRIPE_SUBMIT_MESSAGE, STRIPE_TERMS_MESSAGE]) expect(t.length).toBeLessThanOrEqual(STRIPE_TEXT_LIMIT)
    for (const line of BEFORE_YOU_PAY) expect(STRIPE_SUBMIT_MESSAGE).toContain(line)
    expect(STRIPE_SUBMIT_MESSAGE).toContain(`[Returns and refunds](${RETURNS_URL})`)
    expect(STRIPE_TERMS_MESSAGE).toContain(`[Terms and conditions](${TERMS_URL})`); expect(STRIPE_TERMS_MESSAGE).toContain(`[Returns and refunds](${RETURNS_URL})`); expect(STRIPE_TERMS_MESSAGE).toMatch(/14-day right to cancel/)
  })
  it('the two addresses are the real addresses of the Terms and Returns pages', () => {
    expect(TERMS_URL).toBe(`https://starscapesfactory.com/page/${page('terms').slug}`); expect(RETURNS_URL).toBe(`https://starscapesfactory.com/page/${page('returns').slug}`)
  })
  it('is imported by the server, so every import in it ends in .js', () => {
    const specifiers = [...read('src/cart/beforeYouPay.js').matchAll(/from '([^']+)'/g)].map((m) => m[1]); expect(specifiers.length).toBeGreaterThan(0)
    for (const s of specifiers) expect(s, s).toMatch(/\.js$/); expect(read('api/checkout.js')).toMatch(/from '\.\.\/src\/cart\/beforeYouPay\.js'/)
  })
})

describe('the rail: real payments wait for the legal pages', () => {
  it('LEGAL_PAGES_PUBLISHED is true only when EVERY legal page is ready, so the two are changed together (SFW-186)', () => {
    expect(LEGAL_PAGES_PUBLISHED).toBe(LEGAL_PAGES.every((p) => p.ready === true))
  })
})

describe('the "Before you pay" box on the cart page', () => {
  it('shows the heading, the four lines, and links to the Terms and the Returns page that open in a new tab, and says a tick box comes next', () => {
    render(<MemoryRouter><BeforeYouPayBox /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Before you pay' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(BEFORE_YOU_PAY)
    const terms = screen.getByRole('link', { name: 'Terms and conditions' }); const returns = screen.getByRole('link', { name: 'Returns and refunds' })
    expect(terms).toHaveAttribute('href', '/page/terms'); expect(returns).toHaveAttribute('href', '/page/returns')
    for (const a of [terms, returns]) { expect(a).toHaveAttribute('target', '_blank'); expect(a.getAttribute('rel')).toMatch(/noopener/) }
    expect(screen.getByText(/tick a box to agree to them/)).toBeInTheDocument(); expect(within(screen.getByRole('region', { name: 'Before you pay' })).getByText(/cancellation form/)).toBeInTheDocument()
  })
  it('sits in the order summary, ABOVE the pay button, so it is read before paying', () => {
    const cart = read('src/cart/CartPage.jsx')
    expect(cart).toMatch(/import BeforeYouPayBox from '\.\/BeforeYouPayBox'/)
    const at = cart.indexOf('<BeforeYouPayBox />'); expect(at).toBeGreaterThan(cart.indexOf('Order summary')); expect(at).toBeLessThan(cart.indexOf('className="cart-checkout"'))
  })
})
