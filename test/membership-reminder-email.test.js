// @vitest-environment node
// The reminder emails (lib/reminderEmailText.js): what the law asks a renewal reminder to say, the price-change promise in the Terms, and the draft-wording rail.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildReminder, WORDING_APPROVED, MY_PASSES_URL } from '../lib/reminderEmailText.js'
import { COMPANY } from '../lib/orderEmailText.js'
import { CONTACT_EMAIL } from '../src/data/contact.js'

const row = (over = {}) => ({ user_id: 'u1', passes: ['blueprints', 'book-club'], billing_interval: 'year', current_period_end: '2026-11-16T10:00:00+00:00', offer_note: null, ...over })

describe('the rail', () => {
  it('starts as not approved, so a real member is never sent one until Gill says yes', () => {
    expect(WORDING_APPROVED).toBe(false)
    expect(buildReminder({ kind: 'renewal', row: row(), amount: 5000 }).text).toMatch(/^DRAFT WORDING: this email has not been approved yet, so it is only sent to the site owner\./)
  })
  it('shows no draft banner once approved', () => {
    const m = buildReminder({ kind: 'renewal', row: row(), amount: 5000, approved: true })
    expect(m.text).not.toMatch(/DRAFT WORDING/); expect(m.html).not.toMatch(/DRAFT WORDING/)
  })
})

describe('an ordinary renewal reminder', () => {
  const m = buildReminder({ kind: 'renewal', row: row(), amount: 5000, previous: 5000, approved: true })
  it('says the date, the passes, the amount, that the price includes VAT, and that it renews by itself', () => {
    expect(m.subject).toBe('Your Starscapes Factory passes renew on 16 November 2026')
    expect(m.text).toContain('your Starscapes Factory passes will renew automatically on 16 November 2026')
    expect(m.text).toContain('Your passes: Blueprints and Book Club.'); expect(m.text).toContain('we will take £50 (the price includes VAT) from your card, through Stripe'); expect(m.text).toContain('You do not need to do anything to keep your passes.')
  })
  it('says how to cancel, and what cancelling means, and links to My passes', () => {
    expect(m.text).toContain('go to My passes, and choose "Manage payment or cancel"'); expect(m.text).toContain('your passes stay open until the end of what you have paid for, and you will not be charged again')
    expect(m.text).toContain(`My passes: ${MY_PASSES_URL}`); expect(m.html).toContain(`href="${MY_PASSES_URL}"`)
  })
  it('gives the contact address and the company details, and is not a price-change email', () => {
    expect(m.text).toContain(`write to ${CONTACT_EMAIL}`); expect(m.text).toContain(`${COMPANY.name}, company number ${COMPANY.number}. Registered office: ${COMPANY.office}.`)
    expect(m.text).not.toMatch(/price is changing|more each/)
  })
})

describe('a price-change reminder (the promise in the Terms: "we will email you before the price changes")', () => {
  it('says the old price, the new price, how much more, and why when the launch offer ends', () => {
    const m = buildReminder({ kind: 'price-change', row: row(), amount: 10000, previous: 5000, approved: true })
    expect(m.subject).toBe('The price of your Starscapes Factory passes changes on 16 November 2026')
    expect(m.text).toContain('Until now you have paid £50. From 16 November 2026 you will pay £100 a year, because the launch offer (half price for your first year) comes to an end. That is £50 more each year.')
    expect(m.text).toContain('we will take £100 (the price includes VAT)'); expect(m.text).toContain('Manage payment or cancel')
  })
  it('says "month" for a monthly member, and a plain "discount" if they used a promo code, never the launch offer', () => {
    const m = buildReminder({ kind: 'price-change', row: row({ billing_interval: 'month', offer_note: '20% off for 3 months' }), amount: 1000, previous: 500, approved: true })
    expect(m.text).toContain('you will pay £10 a month, because your discount comes to an end. That is £5 more each month.'); expect(m.text).not.toMatch(/launch offer/)
  })
  it('writes pounds and pence properly (£2.50 and £7)', () => {
    expect(buildReminder({ kind: 'price-change', row: row({ billing_interval: 'month' }), amount: 700, previous: 250, approved: true }).text).toContain('Until now you have paid £2.50. From 16 November 2026 you will pay £7 a month')
  })
})

describe('what it never does', () => {
  it('shows no "undefined", "NaN" or "null", even if the record is thin', () => {
    for (const r of [row({ passes: [] }), row({ passes: null, billing_interval: undefined }), {}]) {
      const m = buildReminder({ kind: 'renewal', row: r, amount: 500, approved: true }); expect(m.text + m.html + m.subject, JSON.stringify(r)).not.toMatch(/undefined|NaN|null/)
    }
  })
  it('does not put anything unescaped in the HTML', () => {
    const m = buildReminder({ kind: 'renewal', row: row(), amount: 500, approved: true }); expect(m.html).not.toMatch(/<script/i); expect(m.html).toMatch(/^<!doctype html><html lang="en-GB">/)
  })
  it('does not name an address in its own text except the contact one', () => {
    const t = readFileSync(join(process.cwd(), 'lib/reminderEmailText.js'), 'utf8'); expect(t).not.toMatch(/@starscapesfactory\.com/); expect(t).toContain('CONTACT_EMAIL')
  })
  it('does not promise a refund or a tracking number or a delivery date: it is only about a renewal', () => {
    const m = buildReminder({ kind: 'price-change', row: row(), amount: 10000, previous: 5000, approved: true }); expect(m.text).not.toMatch(/refund|tracking|delivery|guarantee/i)
  })
})
