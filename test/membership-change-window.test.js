// @vitest-environment node
// When a member may change their passes (src/membership/changeWindow.js). A working rule from Gill, 20 October 2026: only in the 7 days before the next payment.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHANGE_WINDOW_DAYS, changeWindow, closedMessage, formatLondonDate } from '../src/membership/changeWindow.js'

const END = '2026-11-16T10:00:00Z'
const at = (iso) => Date.parse(iso)

describe('the window to change passes', () => {
  it('is 7 days', () => { expect(CHANGE_WINDOW_DAYS).toBe(7) })
  it('is closed more than 7 days before the next payment, with the dates it gives', () => {
    const w = changeWindow({ current_period_end: END }, at('2026-11-01T12:00:00Z'))
    expect(w).toEqual({ known: true, open: false, opensAt: '2026-11-09T10:00:00.000Z', nextPayment: '2026-11-16T10:00:00.000Z' })
  })
  it('opens at exactly 7 days before, and not a minute earlier', () => {
    expect(changeWindow({ current_period_end: END }, at('2026-11-09T09:59:00Z')).open).toBe(false)
    expect(changeWindow({ current_period_end: END }, at('2026-11-09T10:00:00Z')).open).toBe(true)
    expect(changeWindow({ current_period_end: END }, at('2026-11-09T10:01:00Z')).open).toBe(true)
  })
  it('stays open right up to the payment, and just after it if the new period has not been recorded yet', () => {
    expect(changeWindow({ current_period_end: END }, at('2026-11-16T09:59:00Z')).open).toBe(true)
    expect(changeWindow({ current_period_end: END }, at('2026-11-16T10:30:00Z')).open).toBe(true)
  })
  it('works the same for a yearly member: closed for most of the year', () => {
    const yearly = { billing_interval: 'year', current_period_end: '2027-10-20T10:00:00Z' }
    expect(changeWindow(yearly, at('2026-11-01T12:00:00Z')).open).toBe(false)
    expect(changeWindow(yearly, at('2027-10-14T10:00:00Z')).open).toBe(true)
  })
  it('is OPEN, never locked, when the date is missing or unreadable (a gap in our records must not lock a member out)', () => {
    for (const row of [null, undefined, {}, { current_period_end: null }, { current_period_end: '' }, { current_period_end: 'nonsense' }]) {
      expect(changeWindow(row, at('2026-11-01T12:00:00Z')), JSON.stringify(row)).toEqual({ known: false, open: true, opensAt: null, nextPayment: null })
    }
  })
})

describe('what a member is told', () => {
  it('says the window, the day of the next payment and the day it opens', () => {
    expect(closedMessage(changeWindow({ current_period_end: END }, at('2026-11-01T12:00:00Z')))).toBe('You can change your passes in the 7 days before your next payment. Your next payment is on 16 November 2026, so you can change them from 9 November 2026.')
  })
  it('gives the London day: a payment late on a winter evening, and one just before midnight in summer', () => {
    expect(formatLondonDate('2026-12-01T23:30:00Z')).toBe('1 December 2026')
    expect(formatLondonDate('2026-06-30T23:30:00Z')).toBe('1 July 2026')
    expect(formatLondonDate('nope')).toBe('')
    expect(formatLondonDate('')).toBe('')
  })
})

describe('the file itself', () => {
  it('has no imports, so the payment server and the page can both use it', () => {
    expect(readFileSync(join(process.cwd(), 'src/membership/changeWindow.js'), 'utf8')).not.toMatch(/^import /m)
  })
})
