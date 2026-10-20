// @vitest-environment node
// The rules behind discount codes: what the form accepts, what it refuses and says, the last-day-of-the-code maths, and the words that describe a code.
import { describe, it, expect } from 'vitest'
import { CODE_PATTERN, DURATIONS, EMPTY_FORM, MAX_MONTHS, MAX_POUNDS_PENCE, MAX_USES, couponWords, expiryText, londonEndOfDay, parseForm, previewWords, stateOf, usesText, STATE_WORDS } from '../src/admin/promotionsRules'
import { describeCoupon } from '../lib/membershipStripe.js'

const NOW = Date.parse('2026-10-21T12:00:00Z')
const ok = (over) => ({ ...EMPTY_FORM, code: 'spring20', kind: 'percent', value: '20', duration: 'once', ...over })
const fails = (over, field) => { const r = parseForm(ok(over), NOW); expect(r.ok, JSON.stringify(over)).toBe(false); if (field) expect(r.field, JSON.stringify(over)).toBe(field); expect(r.message.length).toBeGreaterThan(10); return r }

describe('a good form', () => {
  it('becomes clean numbers: the code in capitals, money in pence, the last day as a Stripe time', () => {
    const r = parseForm(ok({ code: ' spring20 ', value: ' 20 ', duration: 'repeating', months: '3', maxUses: '10', expiresOn: '2026-12-31' }), NOW)
    expect(r).toEqual({ ok: true, value: { code: 'SPRING20', kind: 'percent', percentOff: 20, amountOff: null, duration: 'repeating', months: 3, maxUses: 10, expiresAt: Date.UTC(2026, 11, 31, 23, 59, 59) / 1000 } })
  })
  it('takes an amount of money in pounds, as pence', () => {
    for (const [pounds, pence] of [['5', 500], ['2.50', 250], ['0.01', 1], ['120', 12000], ['119.99', 11999], ['10.5', 1050]]) expect(parseForm(ok({ kind: 'amount', value: pounds }), NOW).value.amountOff, pounds).toBe(pence)
    expect(parseForm(ok({ kind: 'amount', value: '5' }), NOW).value.percentOff).toBeNull()
  })
  it('leaves the limit and the last day empty when they are empty, and ignores months unless months are chosen', () => {
    const v = parseForm(ok({ months: '99', maxUses: '', expiresOn: '' }), NOW).value
    expect(v).toMatchObject({ maxUses: null, expiresAt: null, months: null })
  })
  it('accepts the edges: 1 and 100 percent, 1 and 36 months, 1 and 100,000 people, a 2 and a 40 letter code', () => {
    expect(parseForm(ok({ value: '1' }), NOW).ok).toBe(true); expect(parseForm(ok({ value: '100' }), NOW).ok).toBe(true)
    expect(parseForm(ok({ duration: 'repeating', months: '1' }), NOW).ok).toBe(true); expect(parseForm(ok({ duration: 'repeating', months: String(MAX_MONTHS) }), NOW).ok).toBe(true)
    expect(parseForm(ok({ maxUses: '1' }), NOW).ok).toBe(true); expect(parseForm(ok({ maxUses: String(MAX_USES) }), NOW).ok).toBe(true)
    expect(parseForm(ok({ code: 'ab' }), NOW).ok).toBe(true); expect(parseForm(ok({ code: 'A'.repeat(40) }), NOW).ok).toBe(true); expect(parseForm(ok({ code: 'a_b-c1' }), NOW).value.code).toBe('A_B-C1')
  })
})

describe('what it refuses', () => {
  it('a code that is too short, too long, or has anything but letters, numbers, dashes and underscores', () => {
    for (const code of ['', 'a', ' ', 'SPRING 20', '-BAD', '_BAD', 'A'.repeat(41), '\u00c9CLAIR', '<script>', 'a.b', 'a/b', 'a;b', "a'b", 'EMOJI\u{1F600}']) fails({ code }, 'code')
    expect(CODE_PATTERN.test('SPRING20')).toBe(true)
  })
  it('a percentage that is not a whole number from 1 to 100', () => {
    for (const value of ['', '0', '101', '20.5', '-5', 'abc', '1e2', '1,5', ' ', '%20', '020x']) fails({ value }, 'value')
  })
  it('an amount that is not pounds and pence, or is 0, or is over \u00a3120', () => {
    for (const value of ['', '0', '0.00', '120.01', '121', '.5', '1,50', '-1', '1e2', 'five', '5.555', '1000']) fails({ kind: 'amount', value }, 'value')
    expect(MAX_POUNDS_PENCE).toBe(12000)
  })
  it('a missing or unknown kind or duration', () => {
    fails({ kind: '' }, 'kind'); fails({ kind: 'free' }, 'kind'); fails({ duration: '' }, 'duration'); fails({ duration: 'weekly' }, 'duration')
  })
  it('months that are not a whole number from 1 to 36, when months are chosen', () => {
    for (const months of ['', '0', '37', '99', '1.5', 'x', '-3']) fails({ duration: 'repeating', months }, 'months')
  })
  it('a limit that is not a whole number from 1 to 100,000', () => {
    for (const maxUses of ['0', '100001', '1.5', 'x', '-1', '1e3']) fails({ maxUses }, 'maxUses')
  })
  it('a last day that is not a real date, or is already over', () => {
    for (const expiresOn of ['2026-02-30', '2026-13-01', '2026-00-10', '31/12/2026', 'tomorrow', '2026-1-5', '2026-10-20', '2025-12-31']) fails({ expiresOn }, 'expiresOn')
    expect(parseForm(ok({ expiresOn: '2026-10-21' }), NOW).ok).toBe(true) // today is fine: it works until the end of the day
  })
  it('reports the first thing wrong, in the order of the form, and copes with nothing at all', () => {
    expect(parseForm({ code: '', kind: 'percent', value: 'x' }, NOW).field).toBe('code')
    expect(parseForm({ code: 'ok', kind: 'percent', value: 'x', duration: '' }, NOW).field).toBe('value')
    for (const nothing of [null, undefined, 'text', 5, []]) expect(parseForm(nothing, NOW).ok, String(nothing)).toBe(false)
  })
  it('lists the three durations, with plain labels', () => {
    expect(DURATIONS.map((d) => d.value)).toEqual(['once', 'repeating', 'forever']); expect(new Set(DURATIONS.map((d) => d.label)).size).toBe(3)
  })
})

describe('the last day of a code', () => {
  it('is the last second of that day in London, in summer and in winter', () => {
    expect(londonEndOfDay('2026-12-31')).toBe(Date.UTC(2026, 11, 31, 23, 59, 59) / 1000) // winter: London is UTC
    expect(londonEndOfDay('2026-07-01')).toBe(Date.UTC(2026, 6, 1, 22, 59, 59) / 1000) // summer: London is an hour ahead
  })
  it('is right on the days the clocks change', () => {
    expect(londonEndOfDay('2026-03-29')).toBe(Date.UTC(2026, 2, 29, 22, 59, 59) / 1000)
    expect(londonEndOfDay('2026-10-25')).toBe(Date.UTC(2026, 9, 25, 23, 59, 59) / 1000)
    expect(londonEndOfDay('2026-03-28')).toBe(Date.UTC(2026, 2, 28, 23, 59, 59) / 1000)
  })
  it('is nothing for a date that does not exist or is not written year-month-day', () => {
    for (const bad of ['', null, undefined, '2026-02-29', '2028-02-30', '2026-4-1', '01/04/2026', 'x']) expect(londonEndOfDay(bad), String(bad)).toBeNull()
    expect(londonEndOfDay('2028-02-29')).toBe(Date.UTC(2028, 1, 29, 23, 59, 59) / 1000) // a real leap day
  })
})

describe('the words about a code', () => {
  const stripe = { percent: { percent_off: 20 }, amount: { amount_off: 500, currency: 'gbp' } }
  it('are exactly the words checkout tells a member, for every kind of code', () => {
    for (const [kind, coupon] of Object.entries(stripe)) {
      for (const [duration, months] of [['once', null], ['repeating', 1], ['repeating', 3], ['repeating', 12], ['forever', null]]) {
        const mine = couponWords({ percentOff: kind === 'percent' ? 20 : null, amountOff: kind === 'amount' ? 500 : null, duration, months })
        expect(mine, `${kind} ${duration} ${months}`).toBe(describeCoupon({ ...coupon, duration, duration_in_months: months }))
      }
    }
  })
  it('say the whole code in a sentence, before it is made', () => {
    const v = parseForm(ok({ duration: 'repeating', months: '3', maxUses: '10', expiresOn: '2026-12-31' }), NOW).value
    expect(previewWords(v)).toBe('SPRING20 gives 20% off for 3 months. Up to 10 people can use it. It stops working after 31 December 2026. It replaces the launch offer for anyone who uses it.')
    expect(previewWords(parseForm(ok({ maxUses: '1' }), NOW).value)).toContain('Up to 1 person can use it.')
    expect(previewWords(parseForm(ok(), NOW).value)).toContain('Anyone can use it, as many times as they like. It has no end date.')
  })
  it('warn when a code makes the passes free', () => {
    expect(previewWords(parseForm(ok({ value: '100' }), NOW).value)).toContain('the passes would be free')
    expect(previewWords(parseForm(ok({ value: '99' }), NOW).value)).not.toContain('free')
  })
})

describe('the state of a code', () => {
  const item = (over = {}) => ({ active: true, couponValid: true, expiresAt: null, maxUses: null, used: 0, ...over })
  it('is working, switched off, or finished', () => {
    expect(stateOf(item(), NOW)).toBe('working')
    expect(stateOf(item({ active: false }), NOW)).toBe('off')
    expect(stateOf(item({ couponValid: false }), NOW)).toBe('finished')
    expect(stateOf(item({ expiresAt: '2026-10-01T00:00:00Z' }), NOW)).toBe('finished')
    expect(stateOf(item({ expiresAt: '2026-12-31T23:59:59Z' }), NOW)).toBe('working')
    expect(stateOf(item({ maxUses: 10, used: 10 }), NOW)).toBe('finished')
    expect(stateOf(item({ maxUses: 10, used: 9 }), NOW)).toBe('working')
    expect(stateOf(null, NOW)).toBe('finished')
  })
  it('says a switched-off code is switched off even if it has also finished (so the button to switch it on is not offered by mistake)', () => {
    expect(stateOf(item({ active: false, maxUses: 1, used: 1 }), NOW)).toBe('off')
    expect(STATE_WORDS).toEqual({ working: 'Working', off: 'Switched off', finished: 'Finished' })
  })
  it('says how often it has been used, and until when it works', () => {
    expect(usesText({ maxUses: 10, used: 3 })).toBe('3 of 10 used'); expect(usesText({ maxUses: null, used: 3 })).toBe('3 used, no limit'); expect(usesText({ maxUses: 1500, used: 0 })).toBe('0 of 1,500 used')
    expect(expiryText({ expiresAt: null })).toBe('No end date'); expect(expiryText({ expiresAt: 'nonsense' })).toBe('No end date')
    expect(expiryText({ expiresAt: '2099-12-31T23:59:59Z' })).toBe('Works until 31 December 2099'); expect(expiryText({ expiresAt: '2020-01-31T23:59:59Z' })).toBe('Ended 31 January 2020')
  })
})
