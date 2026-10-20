// @vitest-environment node
// The rules behind the "Passes and members" page: who holds passes, what each status is called, the counts, the filters, and the money and date lines.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HOLDING_STATUSES, STATUS_CHOICES, countByPass, dateLine, filterMembers, holds, offerWords, passesLine, paymentLine, priceRows, statusWords, stripeUrl, summarise } from '../src/admin/membersRules'
import { PASSES } from '../src/membership/passes'

const m = (over = {}) => ({ ref: 'aaaaaaaa', email: 'a@example.com', status: 'active', view: 'active', passes: ['blueprints'], interval: 'month', periodEnd: '2026-11-20T20:16:55Z', cancelling: false, offerEndsAt: '2027-10-20T20:16:55Z', offerNote: null, since: '2026-10-20T20:16:55Z', updated: null, customer: 'cus_abc123', ...over })
const NOW = Date.parse('2026-10-21T12:00:00Z')

describe('who holds passes', () => {
  it('is active, trialing or past_due: the same rule the database uses, so this page cannot disagree with who can read what', () => {
    expect(HOLDING_STATUSES).toEqual(['active', 'trialing', 'past_due'])
    expect(readFileSync(join(process.cwd(), 'sql/locked-posts.sql'), 'utf8')).toContain("m.status in ('active', 'trialing', 'past_due')")
    for (const status of HOLDING_STATUSES) expect(holds(m({ status })), status).toBe(true)
    for (const status of ['unpaid', 'canceled', 'incomplete']) expect(holds(m({ status })), status).toBe(false)
    expect(holds(null)).toBe(false)
  })
})

describe('what each status is called', () => {
  it('says it in plain words, and says whether the passes are still open', () => {
    expect(statusWords(m())).toBe('Active')
    expect(statusWords(m({ view: 'cancelling', cancelling: true }))).toBe('Cancelling')
    expect(statusWords(m({ view: 'trouble', status: 'past_due' }))).toBe('Payment trouble, passes still open')
    expect(statusWords(m({ view: 'trouble', status: 'unpaid' }))).toBe('Payment not made, passes closed')
    expect(statusWords(m({ view: 'ended', status: 'canceled' }))).toBe('Ended')
    expect(statusWords(m({ view: 'free', status: 'incomplete' }))).toBe('Never started')
    expect(statusWords(null)).toBe('Never started')
  })
  it('offers a filter for each, starting with everyone', () => {
    expect(STATUS_CHOICES.map((c) => c.value)).toEqual(['all', 'holding', 'active', 'cancelling', 'trouble', 'ended', 'free'])
    expect(new Set(STATUS_CHOICES.map((c) => c.label)).size).toBe(STATUS_CHOICES.length)
  })
})

const people = [
  m({ ref: '1', email: 'gill@example.com', passes: ['come-write-with-me'] }),
  m({ ref: '2', email: 'Alexandra@Example.com', passes: ['authors-notebook', 'early-drafts', 'blueprints', 'book-club'], interval: 'year' }),
  m({ ref: '3', email: 'sam@example.com', view: 'cancelling', cancelling: true, passes: ['blueprints', 'book-club'] }),
  m({ ref: '4', email: 'priya@example.org', status: 'past_due', view: 'trouble', passes: ['authors-notebook'] }),
  m({ ref: '5', email: '', status: 'canceled', view: 'ended', passes: ['early-drafts', 'blueprints', 'book-club'] }),
  m({ ref: '6', email: 'maybe@example.com', status: 'incomplete', view: 'free', passes: ['blueprints'] }),
]

describe('the counts', () => {
  it('counts people by what they are, and how many hold passes now', () => {
    expect(summarise(people)).toEqual({ total: 6, holding: 4, active: 2, cancelling: 1, trouble: 1, ended: 1, free: 1 })
    expect(summarise([])).toEqual({ total: 0, holding: 0, active: 0, cancelling: 0, trouble: 0, ended: 0, free: 0 })
    expect(summarise(null).total).toBe(0)
  })
  it('counts each of the five passes: only people holding it now, and how many of those are cancelling', () => {
    const rows = countByPass(people)
    expect(rows.map((r) => r.id)).toEqual(PASSES.map((p) => p.id))
    expect(rows).toHaveLength(5)
    const by = Object.fromEntries(rows.map((r) => [r.id, [r.holding, r.cancelling]]))
    expect(by).toEqual({ 'authors-notebook': [2, 0], 'early-drafts': [1, 0], 'come-write-with-me': [1, 0], blueprints: [2, 1], 'book-club': [2, 1] })
  })
  it('does not count someone whose membership ended or never started, even if they once picked that pass', () => {
    const by = Object.fromEntries(countByPass([m({ status: 'canceled', view: 'ended', passes: ['blueprints'] }), m({ status: 'incomplete', view: 'free', passes: ['blueprints'] })]).map((r) => [r.id, r.holding]))
    expect(by.blueprints).toBe(0)
  })
})

describe('the filters', () => {
  const refs = (list) => list.map((p) => p.ref)
  it('shows everyone to begin with, and narrows by pass', () => {
    expect(refs(filterMembers(people))).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(refs(filterMembers(people, { pass: 'blueprints' }))).toEqual(['2', '3', '5', '6'])
    expect(refs(filterMembers(people, { pass: 'come-write-with-me' }))).toEqual(['1'])
  })
  it('narrows by status: "holding now" is not the same as "active"', () => {
    expect(refs(filterMembers(people, { status: 'holding' }))).toEqual(['1', '2', '3', '4'])
    expect(refs(filterMembers(people, { status: 'active' }))).toEqual(['1', '2'])
    expect(refs(filterMembers(people, { status: 'cancelling' }))).toEqual(['3'])
    expect(refs(filterMembers(people, { status: 'trouble' }))).toEqual(['4'])
    expect(refs(filterMembers(people, { status: 'ended' }))).toEqual(['5'])
    expect(refs(filterMembers(people, { status: 'free' }))).toEqual(['6'])
  })
  it('searches the emails, ignoring capitals and spaces at the ends, and combines the filters', () => {
    expect(refs(filterMembers(people, { search: '  ALEXANDRA ' }))).toEqual(['2'])
    expect(refs(filterMembers(people, { search: 'example.com' }))).toEqual(['1', '2', '3', '6'])
    expect(refs(filterMembers(people, { pass: 'blueprints', status: 'holding', search: 'a' }))).toEqual(['2', '3'])
    expect(filterMembers(people, { search: 'nobody-at-all' })).toEqual([])
  })
  it('copes with nothing to filter', () => {
    expect(filterMembers(null)).toEqual([]); expect(filterMembers(undefined, { search: 'x' })).toEqual([])
  })
})

describe('the money line', () => {
  it('shows what they pay now, with the launch offer and when it ends, using the same sums as checkout', () => {
    expect(paymentLine(m(), NOW)).toBe('£2.50 a month (launch offer until 20 October 2027, then £5 a month)')
    expect(paymentLine(m({ passes: ['authors-notebook', 'early-drafts', 'blueprints', 'book-club'], interval: 'year', offerEndsAt: '2027-08-02T09:00:00Z' }), NOW)).toBe('£60 a year (launch offer until 2 August 2027, then £120 a year)')
    expect(paymentLine(m({ passes: ['blueprints', 'book-club'] }), NOW)).toContain('£3.50 a month')
    expect(paymentLine(m({ passes: ['blueprints', 'book-club', 'early-drafts'] }), NOW)).toContain('£5 a month')
  })
  it('shows the full price once the offer has ended, and names a promo code instead of working out its discount', () => {
    expect(paymentLine(m({ offerEndsAt: '2026-10-01T00:00:00Z' }), NOW)).toBe('£5 a month')
    expect(paymentLine(m({ offerEndsAt: null, offerNote: 'Promo code FRIEND20: 20% off' }), NOW)).toBe('£5 a month (Promo code FRIEND20: 20% off)')
  })
  it('shows nothing for someone who never paid, or has no passes', () => {
    expect(paymentLine(m({ view: 'free', status: 'incomplete' }), NOW)).toBe('')
    expect(paymentLine(m({ passes: [] }), NOW)).toBe('')
  })
})

describe('the date line', () => {
  it('says what happens next for each kind of member, in London dates', () => {
    expect(dateLine(m())).toBe('Next payment on 20 November 2026')
    expect(dateLine(m({ view: 'cancelling' }))).toBe('Passes open until 20 November 2026, then they stop (not renewing)')
    expect(dateLine(m({ view: 'trouble', status: 'past_due' }))).toBe('A payment failed. It was due 20 November 2026')
    expect(dateLine(m({ view: 'ended', status: 'canceled' }))).toBe('Ended on 20 November 2026')
    expect(dateLine(m({ view: 'free', status: 'incomplete', periodEnd: null }))).toBe('The payment never finished, so no passes were opened')
  })
  it('copes with a missing date', () => {
    expect(dateLine(m({ periodEnd: null }))).toBe('')
    expect(dateLine(m({ view: 'cancelling', periodEnd: null }))).toBe('Cancelled: not renewing')
    expect(dateLine(m({ view: 'ended', periodEnd: null }))).toBe('Ended')
  })
  it('puts the day a member sees (London), not the day in UTC', () => {
    expect(dateLine(m({ periodEnd: '2026-06-30T23:30:00Z' }))).toBe('Next payment on 1 July 2026')
  })
})

describe('the words about passes', () => {
  it('counts them and names them in the order they are drawn', () => {
    expect(passesLine(m({ passes: ['blueprints'] }))).toBe('1 pass: Blueprints')
    expect(passesLine(m({ passes: ['book-club', 'blueprints'] }))).toBe('2 passes: Blueprints and Book Club')
    expect(passesLine(m({ passes: [] }))).toBe('No passes')
  })
})

describe('the Stripe link', () => {
  it('opens the customer in the mode the site is using, and only for an id that looks like a Stripe customer', () => {
    expect(stripeUrl('test', 'cus_abc123')).toBe('https://dashboard.stripe.com/test/customers/cus_abc123')
    expect(stripeUrl('live', 'cus_abc123')).toBe('https://dashboard.stripe.com/customers/cus_abc123')
    expect(stripeUrl('unknown', 'cus_abc123')).toBe('https://dashboard.stripe.com/customers/cus_abc123')
    for (const bad of ['', null, undefined, 'abc', 'cus_', 'cus_a/b', 'cus_a b', 'https://evil.example/cus_abc', 'sub_abc123']) expect(stripeUrl('test', bad), String(bad)).toBe('')
  })
})

describe('the price table', () => {
  it('has a row for 1, 2, 3 and everything, from the same sums as checkout: a month, a year, and each on the launch offer', () => {
    const rows = priceRows()
    expect(rows.map((r) => r.label)).toEqual(['1 pass', '2 passes', '3 passes', 'Everything'])
    expect(rows.map((r) => [r.month, r.year, r.offerMonth, r.offerYear])).toEqual([['£5', '£50', '£2.50', '£25'], ['£7', '£70', '£3.50', '£35'], ['£10', '£100', '£5', '£50'], ['£12', '£120', '£6', '£60']])
  })
  it('names the launch offer in words', () => {
    expect(offerWords()).toBe('Launch offer: half price for your first year')
  })
})
