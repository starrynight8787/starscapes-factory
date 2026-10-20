// @vitest-environment node
// WHEN a member is reminded, and WHICH reminder (src/membership/reminderRules.js). Working rules, to be changed once the government's subscription guidance is published (January 2027).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PRICE_CHANGE_DAYS, YEARLY_DAYS, MONTHLY_DAYS, MONTHLY_EVERY_DAYS, WINDOW_DAYS, daysUntil, inWindow, decide } from '../src/membership/reminderRules.js'

const DAY = 86400000
const NOW = Date.parse('2026-11-01T12:00:00Z')
const inDays = (d) => new Date(NOW + d * DAY).toISOString()
const row = (over = {}) => ({ user_id: 'u1', status: 'active', passes: ['blueprints'], billing_interval: 'year', current_period_end: inDays(10), cancel_at_period_end: false, stripe_subscription_id: 'sub_1', ...over })
const amounts = (next, last) => ({ next: { total: next }, last: { total: last } })
const run = (r, next = 500, last = 500, notices = []) => decide({ row: r, ...amounts(next, last), notices, nowMs: NOW })

describe('the numbers', () => {
  it('are 14 days for a price change and for a yearly renewal, 7 for a monthly one, about six months between monthly reminders, and nobody further out than 14 is looked at', () => {
    expect([PRICE_CHANGE_DAYS, YEARLY_DAYS, MONTHLY_DAYS, MONTHLY_EVERY_DAYS, WINDOW_DAYS]).toEqual([14, 14, 7, 150, 14])
  })
  it('has no imports, so the server and the tests can both use it', () => {
    expect(readFileSync(join(process.cwd(), 'src/membership/reminderRules.js'), 'utf8')).not.toMatch(/^import /m)
  })
  it('works out days to a date, and nothing for a bad one', () => {
    expect(daysUntil(inDays(3), NOW)).toBe(3); expect(Number.isNaN(daysUntil('nope', NOW))).toBe(true); expect(Number.isNaN(daysUntil(null, NOW))).toBe(true)
  })
})

describe('who is looked at at all', () => {
  it('is a member whose passes are open (active or trialing), who has not cancelled, with a subscription, and a payment still to come within 14 days', () => {
    expect(inWindow(row(), NOW)).toBe(true); expect(inWindow(row({ status: 'trialing' }), NOW)).toBe(true)
    expect(inWindow(row({ current_period_end: inDays(14) }), NOW)).toBe(true); expect(inWindow(row({ current_period_end: inDays(14.01) }), NOW)).toBe(false)
  })
  it('is nobody who has cancelled, whose payment failed, who has ended, who never finished paying, or who has no subscription', () => {
    for (const status of ['past_due', 'unpaid', 'canceled', 'incomplete', 'free', '', undefined]) expect(inWindow(row({ status }), NOW), String(status)).toBe(false)
    expect(inWindow(row({ cancel_at_period_end: true }), NOW)).toBe(false); expect(inWindow(row({ stripe_subscription_id: null }), NOW)).toBe(false); expect(inWindow(null, NOW)).toBe(false)
  })
  it('is nobody whose payment date is past, now, missing or unreadable', () => {
    for (const end of [inDays(-1), new Date(NOW).toISOString(), null, '', 'nonsense']) expect(inWindow(row({ current_period_end: end }), NOW), String(end)).toBe(false)
  })
})

describe('a yearly renewal', () => {
  it('is reminded 14 days before, and not a moment earlier', () => {
    expect(run(row({ current_period_end: inDays(14.01) }))).toBeNull()
    expect(run(row({ current_period_end: inDays(14) }))).toMatchObject({ kind: 'renewal', interval: 'year', amount: 500 })
    expect(run(row({ current_period_end: inDays(1) }))).toMatchObject({ kind: 'renewal' })
  })
  it('is reminded even when Stripe has no earlier payment to compare with', () => {
    expect(run(row(), 5000, null)).toMatchObject({ kind: 'renewal', amount: 5000, previous: null })
  })
})

describe('a monthly renewal', () => {
  const monthly = (days, over = {}) => row({ billing_interval: 'month', current_period_end: inDays(days), ...over })
  it('is reminded 7 days before when no reminder has been sent, and not earlier', () => {
    expect(run(monthly(7.01))).toBeNull(); expect(run(monthly(7))).toMatchObject({ kind: 'renewal', interval: 'month' }); expect(run(monthly(10))).toBeNull()
  })
  it('is reminded about every six months: not if one went 149 days ago, yes at 150', () => {
    const sent = (daysAgo) => [{ user_id: 'u1', kind: 'renewal', period_end: inDays(-30), status: 'sent', sent_at: inDays(-daysAgo) }]
    expect(run(monthly(5), 500, 500, sent(149))).toBeNull(); expect(run(monthly(5), 500, 500, sent(150))).toMatchObject({ kind: 'renewal' }); expect(run(monthly(5), 500, 500, sent(10))).toBeNull()
  })
  it('counts only reminders that really went (a failed one, or one with no readable date, does not count as sent)', () => {
    const notice = (extra) => [{ user_id: 'u1', kind: 'renewal', period_end: inDays(-30), status: 'sent', sent_at: inDays(-5), ...extra }]
    expect(run(monthly(5), 500, 500, notice({ status: 'failed' }))).toMatchObject({ kind: 'renewal' }); expect(run(monthly(5), 500, 500, notice({ sent_at: 'nonsense' }))).toMatchObject({ kind: 'renewal' })
  })
  it('does not count another member\u2019s reminder', () => {
    expect(run(monthly(5), 500, 500, [{ user_id: 'someone-else', kind: 'renewal', period_end: inDays(-30), status: 'sent', sent_at: inDays(-5) }])).toMatchObject({ kind: 'renewal' })
  })
})

describe('when the price is going up (the launch offer ending): the promise in the Terms', () => {
  it('says so 14 days before, with both prices, for a monthly member too (even though a plain monthly reminder waits until 7)', () => {
    const r = row({ billing_interval: 'month', current_period_end: inDays(12) })
    expect(run(r, 1000, 500)).toEqual({ kind: 'price-change', days: 12, amount: 1000, previous: 500, interval: 'month' })
    expect(run(r, 500, 500)).toBeNull() // no rise, and a monthly reminder is not due at 12 days
  })
  it('is the one email for a yearly member whose first renewal costs more (not a price email and a renewal email)', () => {
    expect(run(row({ current_period_end: inDays(10) }), 10000, 5000)).toMatchObject({ kind: 'price-change', amount: 10000, previous: 5000 })
  })
  it('is not a price change if the next payment is the same, or lower', () => {
    expect(run(row(), 5000, 5000).kind).toBe('renewal'); expect(run(row(), 4000, 5000).kind).toBe('renewal')
  })
  it('waits for the 14 days: no price email at 14.01', () => {
    expect(run(row({ billing_interval: 'month', current_period_end: inDays(14.01) }), 1000, 500)).toBeNull(); expect(run(row({ billing_interval: 'month', current_period_end: inDays(14) }), 1000, 500).kind).toBe('price-change')
  })
})

describe('one reminder for each renewal date, never two', () => {
  const same = (status) => [{ user_id: 'u1', kind: 'renewal', period_end: row().current_period_end, status, sent_at: inDays(-1) }]
  it('sends nothing if one has gone, or is going, for that date, whatever kind', () => {
    expect(run(row(), 10000, 5000, same('sent'))).toBeNull(); expect(run(row(), 10000, 5000, same('sending'))).toBeNull()
  })
  it('tries again if the last attempt failed', () => {
    expect(run(row(), 10000, 5000, same('failed'))).toMatchObject({ kind: 'price-change' })
  })
  it('knows the same moment written two ways (a +00:00 and a Z)', () => {
    const r = row({ current_period_end: '2026-11-10T10:00:00+00:00' })
    expect(run(r, 500, 500, [{ user_id: 'u1', kind: 'renewal', period_end: '2026-11-10T10:00:00Z', status: 'sent', sent_at: inDays(-1) }])).toBeNull()
  })
  it('is not stopped by a reminder about a different date', () => {
    expect(run(row(), 500, 500, [{ user_id: 'u1', kind: 'renewal', period_end: inDays(-355), status: 'sent', sent_at: inDays(-355) }])).toMatchObject({ kind: 'renewal' })
  })
})

describe('when it does not know what will be taken', () => {
  it('says nothing, rather than guess (no amount, nothing to pay, or not a number)', () => {
    for (const total of [null, undefined, 0, -5, NaN, 'x']) expect(decide({ row: row(), next: { total }, last: { total: 500 }, notices: [], nowMs: NOW }), String(total)).toBeNull()
  })
  it('copes with nothing at all from Stripe', () => {
    expect(decide({ row: row(), next: null, last: null, notices: null, nowMs: NOW })).toBeNull()
  })
})
