// @vitest-environment node
// VAT on the passes (src/membership/vat.js): the price already includes it, and Stripe shows it as its own line at checkout. Gill, 20 October 2026.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { UK_VAT_PERCENT, VAT_NAME, VAT_RATE_TAG, vatIncluded, netOfVat } from '../src/membership/vat.js'
import { monthlyPence, yearlyPence, offerPence } from '../src/membership/pricing.js'

describe('the VAT inside a price that already includes it', () => {
  it('is the UK standard rate, named VAT', () => {
    expect([UK_VAT_PERCENT, VAT_NAME, VAT_RATE_TAG]).toEqual([20, 'VAT', 'uk-20-inclusive'])
  })
  it('splits each monthly price: 5 pounds is 4.17 plus 0.83, 7 is 5.83 plus 1.17, 10 is 8.33 plus 1.67, 12 is 10.00 plus 2.00', () => {
    expect([1, 2, 3, 4].map((n) => [netOfVat(monthlyPence(n)), vatIncluded(monthlyPence(n))])).toEqual([[417, 83], [583, 117], [833, 167], [1000, 200]])
  })
  it('splits each yearly price (ten months): 50 pounds is 41.67 plus 8.33, and 120 is 100.00 plus 20.00', () => {
    expect([1, 2, 3, 4].map((n) => [netOfVat(yearlyPence(n)), vatIncluded(yearlyPence(n))])).toEqual([[4167, 833], [5833, 1167], [8333, 1667], [10000, 2000]])
  })
  it('splits the launch offer price too (half of the normal price), because VAT is worked out on what is actually paid', () => {
    expect([offerPence(500), vatIncluded(offerPence(500)), netOfVat(offerPence(500))]).toEqual([250, 42, 208])
  })
  it('always adds back up to the price, to the penny, for every price the passes can have', () => {
    for (let n = 1; n <= 8; n += 1) for (const gross of [monthlyPence(n), yearlyPence(n), offerPence(monthlyPence(n)), offerPence(yearlyPence(n))]) expect(netOfVat(gross) + vatIncluded(gross), String(gross)).toBe(gross)
  })
  it('copes with nothing, a bad number and a minus', () => {
    for (const bad of [0, null, undefined, 'x', -500, NaN]) expect([vatIncluded(bad), netOfVat(bad)], String(bad)).toEqual([0, 0])
  })
})

describe('what the page says about VAT', () => {
  it('says prices include VAT, shown separately at checkout, and that passes are for customers in the UK for now', async () => {
    const { VAT_NOTE } = await import('../src/membership/passes.js')
    expect(VAT_NOTE).toBe('Prices include VAT, which is shown separately at checkout. Passes are for customers in the UK for now.')
    expect(readFileSync(join(process.cwd(), 'src/membership/MembershipPage.jsx'), 'utf8')).toMatch(/<p className="mb__stripe">\{VAT_NOTE\}<\/p>/)
  })
})
