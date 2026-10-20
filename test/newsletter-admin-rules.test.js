// @vitest-environment node
// The rules behind the admin Newsletter page: the counts, the filters, and the words about each person and newsletter.
import { describe, it, expect } from 'vitest'
import { SUBSCRIBER_FILTERS, counts, filterSubscribers, issueLine, peopleWords, personWhen, progressText, whenText } from '../src/admin/newsletterAdminRules'

const p = (email, status, over = {}) => ({ id: email, email, status, source: 'site', createdAt: '2026-10-01T10:00:00Z', confirmedAt: null, unsubscribedAt: null, ...over })
const list = [p('ann@example.com', 'confirmed', { confirmedAt: '2026-10-02T10:00:00Z' }), p('Bob@Example.org', 'pending'), p('cat@example.com', 'unsubscribed', { unsubscribedAt: '2026-10-09T10:00:00Z' }), p('dan@example.com', 'confirmed')]

describe('the counts and filters', () => {
  it('counts people by where they are, and copes with nothing', () => {
    expect(counts(list)).toEqual({ confirmed: 2, pending: 1, unsubscribed: 1, total: 4 }); expect(counts([])).toEqual({ confirmed: 0, pending: 0, unsubscribed: 0, total: 0 }); expect(counts(null).total).toBe(0)
  })
  it('narrows by status and by words in the email (capitals ignored), and both together', () => {
    const e = (l) => l.map((x) => x.email)
    expect(e(filterSubscribers(list))).toHaveLength(4); expect(e(filterSubscribers(list, { status: 'confirmed' }))).toEqual(['ann@example.com', 'dan@example.com']); expect(e(filterSubscribers(list, { search: ' BOB ' }))).toEqual(['Bob@Example.org'])
    expect(e(filterSubscribers(list, { status: 'confirmed', search: 'dan' }))).toEqual(['dan@example.com']); expect(filterSubscribers(list, { search: 'zzz' })).toEqual([]); expect(filterSubscribers(null)).toEqual([])
    expect(SUBSCRIBER_FILTERS.map((f) => f.value)).toEqual(['all', 'confirmed', 'pending', 'unsubscribed'])
  })
})

describe('the words', () => {
  it('give a date in London, and nothing for a bad one', () => { expect(whenText('2026-06-30T23:30:00Z')).toBe('1 July 2026'); expect(whenText(null)).toBe(''); expect(whenText('nope')).toBe('') })
  it('say when each person joined, left, or only signed up', () => {
    expect(personWhen(list[0])).toBe('Confirmed 2 October 2026'); expect(personWhen(list[1])).toBe('Signed up 1 October 2026'); expect(personWhen(list[2])).toBe('Unsubscribed 9 October 2026'); expect(personWhen({ status: 'pending' })).toBe('')
  })
  it('say where each newsletter has got to', () => {
    expect(issueLine({ status: 'draft', updatedAt: '2026-10-20T10:00:00Z' })).toBe('Draft, last changed 20 October 2026'); expect(issueLine({ status: 'draft' })).toBe('Draft')
    expect(issueLine({ status: 'sending', sent: 50, total: 120 })).toBe('Going out: 50 of 120 sent so far'); expect(issueLine({ status: 'sent', sentAt: '2026-10-20T10:00:00Z', sent: 118, total: 120 })).toBe('Sent 20 October 2026 to 118 of 120 people'); expect(issueLine({ status: 'sent', sent: 1, total: 1 })).toBe('Sent to 1 of 1 person')
  })
  it('say how a send is going, and how many people in words', () => {
    expect(progressText({ sent: 50, total: 120, failed: 0 })).toBe('50 of 120 sent'); expect(progressText({ sent: 50, total: 120, failed: 3 })).toBe('50 of 120 sent, 3 could not be sent'); expect(progressText(null)).toBe('')
    expect([peopleWords(0), peopleWords(1), peopleWords(2)]).toEqual(['0 people', '1 person', '2 people'])
  })
})
