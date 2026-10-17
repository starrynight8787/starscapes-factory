// @vitest-environment node
// The "your order has been posted" email: honest about tracking, safe with what is typed in, and the same numbers as the print page.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { buildDispatch, cleanTracking } from '../lib/dispatchEmailText'
import { COMPANY } from '../lib/orderEmailText'
import { CONTACT_EMAIL } from '../src/data/contact'

const order = (extra = {}) => ({
  stripe_session_id: 'cs_live_a1B2c3D4e5F6g7H8', livemode: true, customer_name: 'Jane Smith', customer_email: 'jane@example.com',
  shipping: { address: { city: 'Leeds', country: 'GB' } },
  items: [{ title: 'Forests', description: '30 × 40 cm, unframed', qty: 1, unit_amount: 14900 }],
  ...extra,
})

describe('the posted email', () => {
  it('says the order has been posted, where to, and what was in it', () => {
    const { text, subject } = buildDispatch(order())
    expect(subject).toBe('Your Starscapes Factory order SF-E5F6G7H8 has been posted')
    expect(text).toMatch(/has been posted to Leeds, United Kingdom/)
    expect(text).toMatch(/1 x Forests \(30 × 40 cm, unframed\)/)
  })
  it('says nothing at all about tracking when none was given, so it cannot promise what is not there', () => {
    const { text, html } = buildDispatch(order())
    expect(text + html).not.toMatch(/track/i)
  })
  it('shows the tracking link and number when they are given', () => {
    const { text, html } = buildDispatch(order(), { url: 'https://track.example.com/abc123', number: 'AB 123-456' })
    expect(text).toContain('Track your parcel: https://track.example.com/abc123')
    expect(text).toContain('Tracking number: AB 123-456')
    expect(html).toContain('href="https://track.example.com/abc123"')
  })
  it('gives the posting time from the same numbers as the print page, and never "6 to 10" outside the countries it applies to', () => {
    expect(buildDispatch(order()).text).toMatch(/6 to 10 working days/)
    expect(buildDispatch(order({ shipping: { address: { city: 'Sydney', country: 'AU' } } })).text).toMatch(/6 to 15 working days/)
  })
  it('reminds them about damage and the 14-day right to cancel, and gives the company details', () => {
    const { text } = buildDispatch(order())
    expect(text).toMatch(/damaged or not as it should be/)
    expect(text).toMatch(/14-day right to cancel runs from the day you receive/)
    for (const part of [COMPANY.name, COMPANY.number, COMPANY.office, CONTACT_EMAIL]) expect(text).toContain(part)
  })
  it('puts a TEST banner on a test order, and none on a real one', () => {
    expect(buildDispatch(order({ livemode: false })).subject).toMatch(/^\[TEST\] /)
    expect(buildDispatch(order({ livemode: false })).text).toMatch(/Nothing was posted/)
    expect(buildDispatch(order()).text).not.toMatch(/TEST ORDER/)
  })
  it('escapes everything typed in, and ignores a tracking link that would be refused', () => {
    const o = order({ customer_name: '<script>x</script>', items: [{ title: '<img src=x onerror=1>', qty: 1 }] })
    expect(buildDispatch(o, { url: 'https://ok.example.com/a?b=1&c=2' }).html).toMatch(/b=1&amp;c=2/)
    expect(buildDispatch(o).html).not.toMatch(/<script|<img/)
    expect(buildDispatch(order(), { url: 'javascript:alert(1)' }).html).not.toMatch(/javascript:/)
  })
  it('does not use the old address or write the address out by hand, and copes with a broken order', () => {
    expect(buildDispatch(order()).text).not.toMatch(/inspire@/)
    expect(fs.readFileSync('lib/dispatchEmailText.js', 'utf8')).not.toMatch(/@starscapesfactory\.com/)
    expect(() => buildDispatch({})).not.toThrow()
    expect(() => buildDispatch(null)).not.toThrow()
  })
})

describe('what the owner may type for tracking', () => {
  it('accepts nothing, a link, a number, or both', () => {
    expect(cleanTracking({})).toEqual({ ok: true, url: '', number: '' })
    expect(cleanTracking({ url: 'https://t.example.com/x' }).ok).toBe(true)
    expect(cleanTracking({ number: 'RM123456789GB' }).ok).toBe(true)
  })
  it('refuses a link that is not https, has a space, a quote, markup or is very long', () => {
    for (const url of ['http://t.example.com', 'javascript:alert(1)', 'https://a b.com', 'https://a.com/"x', 'https://a.com/<b>', `https://a.com/${'x'.repeat(600)}`, 'ftp://x.com']) expect(cleanTracking({ url }).ok, url).toBe(false)
  })
  it('refuses a number with odd characters or that is too long', () => {
    for (const number of ['<script>', 'AB;DROP', 'x'.repeat(41), '-leading']) expect(cleanTracking({ number }).ok, number).toBe(false)
  })
})
