// @vitest-environment node
// The price rules (src/membership/pricing.js). The page shows them and the payment server will charge them, so they are checked to the penny.
import { describe, it, expect } from 'vitest'
import { monthlyPence, yearlyPence, offerPence, formatPounds, priceFor, ladderRows, ladderKey, LAUNCH_OFFER, YEARLY_MONTHS } from '../src/membership/pricing'
import { PASSES, PASS_IDS, cleanPassIds, CONSENT_TEXT } from '../src/membership/passes'

describe('what passes cost (Gill, 17 October 2026)', () => {
  it('is 5, 7, 10 and 12 pounds a month for one, two, three and four passes', () => {
    expect([1, 2, 3, 4].map((n) => monthlyPence(n))).toEqual([500, 700, 1000, 1200])
  })
  it('stays at 12 pounds however many passes there are beyond four ("Everything")', () => {
    for (const n of [4, 5, 9, 100]) expect(monthlyPence(n)).toBe(1200)
  })
  it('costs nothing for no passes, and treats nonsense as no passes', () => {
    for (const n of [0, -3, NaN, undefined, null, 'x']) expect(monthlyPence(n)).toBe(0)
  })
  it('makes a year cost ten months, so two months are free', () => {
    expect(YEARLY_MONTHS).toBe(10)
    expect([1, 2, 3, 4].map((n) => yearlyPence(n))).toEqual([5000, 7000, 10000, 12000])
  })
  it('counts a part-number of passes down to the whole number', () => {
    expect(monthlyPence(2.9)).toBe(700)
  })
})

describe('the launch offer: half price for the first year', () => {
  it('is on, and says so in the words on the page', () => {
    expect(LAUNCH_OFFER.active).toBe(true)
    expect(LAUNCH_OFFER.fraction).toBe(0.5)
    expect(LAUNCH_OFFER.label).toBe('Launch offer: half price for your first year')
  })
  it('halves every price exactly, with the pence right', () => {
    expect([500, 700, 1000, 1200].map((p) => offerPence(p))).toEqual([250, 350, 500, 600])
    expect([5000, 7000, 10000, 12000].map((p) => offerPence(p))).toEqual([2500, 3500, 5000, 6000])
  })
  it('gives no offer price when the offer is off, or nothing is chosen', () => {
    expect(offerPence(1000, { active: false, fraction: 0.5 })).toBeNull()
    expect(offerPence(1000, null)).toBeNull()
    expect(offerPence(0)).toBeNull()
  })
  it('works out everything the price box says for three passes, as drawn in the design', () => {
    const p = priceFor(3)
    expect(p.month).toEqual({ regular: 1000, offer: 500 })
    expect(p.year).toEqual({ regular: 10000, offer: 5000 })
    expect(p.offerActive).toBe(true)
  })
  it('has no offer for no passes, and none when the offer is switched off', () => {
    expect(priceFor(0).offerActive).toBe(false)
    expect(priceFor(3, { active: false, fraction: 0.5 })).toMatchObject({ offerActive: false, month: { regular: 1000, offer: null } })
  })
})

describe('writing prices', () => {
  it('writes whole pounds without pence and other amounts with two figures', () => {
    expect([0, 500, 1200, 250, 350, 5, 105].map(formatPounds)).toEqual(['£0', '£5', '£12', '£2.50', '£3.50', '£0.05', '£1.05'])
  })
})

describe('the "the more passes you take" table', () => {
  it('has the four rows drawn in the design, with their prices', () => {
    expect(ladderRows().map((r) => [r.label, formatPounds(r.month), formatPounds(r.year)])).toEqual([
      ['1 pass', '£5', '£50'], ['2 passes', '£7', '£70'], ['3 passes', '£10', '£100'], ['Everything', '£12', '£120'],
    ])
  })
  it('knows which row to show in bold, and none for no passes', () => {
    expect([0, 1, 2, 3, 4, 6].map(ladderKey)).toEqual([null, '1', '2', '3', 'everything', 'everything'])
  })
})

describe('the passes', () => {
  it('are the four Gill named, in the order drawn, each in a room that exists', () => {
    expect(PASSES.map((p) => p.name)).toEqual(["The Author's Notebook", 'Early drafts and book background', 'Blueprints', 'Book Club'])
    expect(PASSES.map((p) => p.room)).toEqual(['drafting-desk', 'drafting-desk', 'factory-floor', 'knowledge-nook'])
  })
  it('have ids that are unique and safe to store (they go in the database and Stripe, so they never change)', () => {
    expect(new Set(PASS_IDS).size).toBe(4)
    for (const id of PASS_IDS) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
    expect(PASS_IDS).toEqual(['authors-notebook', 'early-drafts', 'blueprints', 'book-club'])
  })
  it('are cleaned to real passes only, once each, in the order drawn (the payment server will use this to throw away anything made up)', () => {
    expect(cleanPassIds(['book-club', 'nonsense', 'authors-notebook', 'book-club'])).toEqual(['authors-notebook', 'book-club'])
    expect(cleanPassIds('blueprints')).toEqual([])
    expect(cleanPassIds(undefined)).toEqual([])
  })
})

describe('the tick box wording (checked against regulation 37 of the Consumer Contracts Regulations 2013)', () => {
  it('asks for BOTH the consent to open now AND the acknowledgement that the 14-day right to cancel is lost', () => {
    expect(CONSENT_TEXT).toBe('Open my passes now. I understand that once they open, I lose my 14-day right to cancel and get a refund.')
    expect(CONSENT_TEXT).toMatch(/open my passes now/i)
    expect(CONSENT_TEXT).toMatch(/I understand/i)
    expect(CONSENT_TEXT).toMatch(/lose my 14-day right to cancel/i)
  })
})
