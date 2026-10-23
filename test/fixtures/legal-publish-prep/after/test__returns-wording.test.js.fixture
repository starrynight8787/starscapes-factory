// @vitest-environment node
// How a print is sent back (Gill, 21 October 2026): NO return address is published. A customer who cancels emails first and we tell them how and where to send it. The confirmation email
// and the Returns page say the same thing, and no gap is left open about it. UPDATED 22 October 2026 (legal review decision D5): for framed prints in the large sizes Gill arranges and pays for the return;
// for every other print the customer pays. The sentence is built in src/data/returns.js, from the real acrylic sizes, and used by both.
import { describe, it, expect } from 'vitest'
import { DRAFT } from './legalState'
import { buildConfirmation, RETURN, pendingItems } from '../lib/orderEmailText'
import { LEGAL_PAGES } from '../src/data/legalPages'
import { CONTACT_EMAIL } from '../src/data/contact'
import { LARGE_FRAMED_RETURN } from '../src/data/returns'

const order = () => ({ stripe_session_id: 'cs_test_abc123XYZ789', livemode: false, customer_name: 'Jane Smith', customer_email: 'jane@example.com', shipping: { name: 'Jane Smith', address: { line1: '1 High St', city: 'Leeds', country: 'GB' } }, amount_total: 8900, currency: 'gbp', items: [{ title: 'Floating', description: '21 × 30 cm, unframed', qty: 1, unit_amount: 8900 }] })
const NEW_EMAIL = 'If you cancel, we will tell you how and where to send the print back. You must send it back without delay, and no later than 14 days after you tell us you are cancelling.'
const NOTE = `${LARGE_FRAMED_RETURN}.`
const NOTE_HTML = NOTE.replaceAll("'", '&#39;') // the HTML email writes an apostrophe as a safe code
const returns = () => LEGAL_PAGES.find((p) => p.slug === 'returns')
const sendItBack = () => returns().sections.find((s) => s.title === 'If you change your mind').paragraphs.find((p) => p.startsWith('**To send it back:**'))

describe('the confirmation email', () => {
  it('says we will tell them how and where to send it back (no address), by when, and who pays (we do, for large framed prints; they do for the rest)', () => {
    const { text, html } = buildConfirmation(order())
    expect(text).toContain(NEW_EMAIL); expect(html).toContain(NEW_EMAIL); expect(text).toContain(NOTE); expect(html).toContain(NOTE_HTML)
  })
  it('has the large framed prints sentence, straight after, and before the refund paragraph', () => {
    const { text } = buildConfirmation(order())
    expect(text).toContain(NOTE)
    expect(text.indexOf(NEW_EMAIL)).toBeLessThan(text.indexOf(NOTE)); expect(text.indexOf(NOTE)).toBeLessThan(text.indexOf('We will refund everything you paid'))
  })
  it('has no placeholder or address left about returns, and nothing about posting it back TO anywhere', () => {
    const { text, html } = buildConfirmation(order())
    for (const part of [text, html]) { expect(part).not.toMatch(/\[RETURN ADDRESS|\[LARGE FRAMED|not yet decided/); expect(part).not.toMatch(/send the print back to |post the print to /i) }
  })
  it('still tells them how to cancel, and keeps the 14 days and the refund promise', () => {
    const { text } = buildConfirmation(order())
    expect(text).toContain(`email ${CONTACT_EMAIL}`); expect(text).toContain('within 14 days without giving any reason'); expect(text).toContain('We will refund everything you paid')
  })
})

describe('the Returns page', () => {
  it('says: email us first, we will tell you how and where to send it, then send it within 14 days of telling us, and who pays', () => {
    const p = sendItBack()
    expect(p).toBeTruthy()
    for (const piece of ['email us first, and we will tell you how and where to send the print back', 'send it within 14 days of telling us you are cancelling', 'we will arrange the return for you and pay for it', 'For every other print you pay the cost of sending it back', 'tracked and insured service']) expect(p, piece).toContain(piece)
    expect(p).not.toMatch(/can cost a lot to post back/)
  })
  it('has the same large framed prints sentence as the email', () => {
    expect(sendItBack()).toContain(LARGE_FRAMED_RETURN); expect(RETURN.largeFramedNote).toBe(NOTE)
  })
  it('has no return address or placeholder, and does not say to post it to one', () => {
    const all = returns().sections.flatMap((s) => s.paragraphs).join('\n')
    expect(all).not.toMatch(/\[RETURN ADDRESS\]|post the print to /i)
    expect(sendItBack()).not.toMatch(/\[/)
  })
  it.runIf(DRAFT)('leaves the [date] as the only gap on any of the legal pages', () => {
    const gaps = new Set(LEGAL_PAGES.flatMap((p) => [p.updated, ...p.intro, ...p.sections.flatMap((s) => s.paragraphs)]).join('\n').replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '').match(/\[[^\]\n]+\]/g))
    expect([...gaps]).toEqual(['[date]'])
  })
})

describe('the two agree, and nothing is left to decide', () => {
  it('both say email first / we will tell you, both keep the 14 days, and both say we arrange and pay for large framed returns while the customer pays for the rest', () => {
    const email = buildConfirmation(order()).text; const page = sendItBack()
    expect(email).toMatch(/we will tell you how and where to send the print back/); expect(page).toMatch(/we will tell you how and where to send the print back/)
    expect(email).toContain('14 days'); expect(page).toContain('14 days')
    for (const piece of ['we will arrange the return for you and pay for it', 'For every other print you pay the cost of sending it back']) { expect(email).toContain(piece); expect(page).toContain(piece) }
  })
  it('has no return address in the code at all, so one cannot be published by accident', () => {
    expect(Object.keys(RETURN)).toEqual(['largeFramedNote']); expect('address' in RETURN).toBe(false); expect(Object.isFrozen(RETURN)).toBe(true)
  })
  it('has nothing left pending about returns, so the only things keeping real checkout closed are the approval and the email key', () => {
    expect(pendingItems()).toEqual([])
  })
})
