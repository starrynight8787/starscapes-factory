// @vitest-environment node
// The rules behind the home page's Next event and Featured room, and that they agree with the database file.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { LIMITS, cleanEvent, featuredRoomSlug, formatEventWhen, icsHref, isoToLondonInputs, isYouTube, londonToIso, makeIcs, pickNextEvent } from '../src/home/homeRules'

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')
const NOW = new Date('2026-10-31T12:00:00Z')
const ev = (id, iso, extra = {}) => ({ id, title: `Event ${id}`, starts_at: iso, published: true, ...extra })

describe('London time', () => {
  it('turns a London clock time into the right moment, in winter and in summer', () => {
    expect(londonToIso('2026-12-05', '19:00')).toBe('2026-12-05T19:00:00.000Z')
    expect(londonToIso('2026-07-04', '19:00')).toBe('2026-07-04T18:00:00.000Z')
  })
  it('gets it right either side of the nights the clocks change', () => {
    expect(londonToIso('2026-10-24', '19:00')).toBe('2026-10-24T18:00:00.000Z') // still summer time
    expect(londonToIso('2026-10-25', '19:00')).toBe('2026-10-25T19:00:00.000Z') // the clocks went back that night
    expect(londonToIso('2026-03-28', '12:00')).toBe('2026-03-28T12:00:00.000Z')
    expect(londonToIso('2026-03-29', '12:00')).toBe('2026-03-29T11:00:00.000Z') // the clocks went forward that night
  })
  it('turns a moment back into the same London day and time, for the admin form', () => {
    for (const [d, t] of [['2026-12-05', '19:00'], ['2026-07-04', '07:30'], ['2026-10-25', '23:45'], ['2026-03-29', '15:00']]) expect(isoToLondonInputs(londonToIso(d, t))).toEqual({ date: d, time: t })
  })
  it('writes the day and time the way a person would say it, in London time', () => {
    expect(formatEventWhen('2026-10-31T19:00:00Z')).toBe('Saturday 31 October, 7pm')
    expect(formatEventWhen('2026-07-04T18:00:00Z')).toBe('Saturday 4 July, 7pm') // 7pm in summer time
    expect(formatEventWhen('2026-12-05T19:30:00Z')).toBe('Saturday 5 December, 7:30pm')
    expect(formatEventWhen('2026-12-05T00:05:00Z')).toBe('Saturday 5 December, 12:05am')
    expect(formatEventWhen('2026-12-05T12:00:00Z')).toBe('Saturday 5 December, 12pm')
    expect(formatEventWhen('not a date')).toBe('')
  })
})

describe('which event is next', () => {
  it('is the soonest one that has not finished', () => {
    const list = [ev('late', '2026-12-01T19:00:00Z'), ev('soon', '2026-11-05T19:00:00Z'), ev('past', '2026-10-01T19:00:00Z')]
    expect(pickNextEvent(list, NOW).id).toBe('soon')
  })
  it('keeps an event that started less than two hours ago, and drops one that started longer ago', () => {
    expect(pickNextEvent([ev('on', '2026-10-31T10:30:00Z')], NOW).id).toBe('on')
    expect(pickNextEvent([ev('over', '2026-10-31T09:30:00Z')], NOW)).toBeNull()
  })
  it('ignores a hidden event, and copes with an empty list, junk and a bad date', () => {
    expect(pickNextEvent([ev('hidden', '2026-11-05T19:00:00Z', { published: false })], NOW)).toBeNull()
    expect(pickNextEvent([], NOW)).toBeNull()
    expect(pickNextEvent(null, NOW)).toBeNull()
    expect(pickNextEvent([null, ev('bad', 'nonsense'), ev('ok', '2026-11-05T19:00:00Z')], NOW).id).toBe('ok')
  })
})

describe('an event, before it is saved', () => {
  const good = { title: '  Come read with me, live ', date: '2026-12-05', time: '19:00', description: ' We read a chapter together. ', link: 'https://www.youtube.com/@thedraftingdesk' }
  it('is accepted when good, tidied, with its time worked out in London time', () => {
    expect(cleanEvent(good)).toEqual({ ok: true, value: { title: 'Come read with me, live', starts_at: '2026-12-05T19:00:00.000Z', description: 'We read a chapter together.', link_url: 'https://www.youtube.com/@thedraftingdesk', published: true } })
    expect(cleanEvent({ title: 'A', date: '2026-07-04', time: '19:00' }).value).toMatchObject({ starts_at: '2026-07-04T18:00:00.000Z', description: null, link_url: null })
  })
  it('needs a name, a real day and a time, in plain words', () => {
    expect(cleanEvent({ ...good, title: ' ' }).errors.title).toMatch(/name/)
    expect(cleanEvent({ ...good, date: '' }).errors.date).toMatch(/Choose the day/)
    expect(cleanEvent({ ...good, date: '2026-02-30' }).errors.date).toMatch(/year-month-day/)
    expect(cleanEvent({ ...good, time: '' }).errors.time).toMatch(/Choose the time/)
    expect(cleanEvent({ ...good, time: '7pm' }).errors.time).toMatch(/19:00/)
    expect(cleanEvent(null).ok).toBe(false)
  })
  it('only takes a safe https link, and keeps text within the database\u2019s limits', () => {
    for (const bad of ['http://x.example', 'javascript:alert(1)', 'youtube.com', 'https://x.example/a b']) expect(cleanEvent({ ...good, link: bad }).errors.link, bad).toBeTruthy()
    expect(cleanEvent({ ...good, title: 'x'.repeat(LIMITS.title + 1) }).errors.title).toBeTruthy()
    expect(cleanEvent({ ...good, description: 'x'.repeat(LIMITS.description + 1) }).errors.description).toBeTruthy()
    expect(cleanEvent({ ...good, title: 'A\u0000 B' }).value.title).toBe('A B')
  })
  it('knows which links are YouTube', () => {
    expect(isYouTube('https://www.youtube.com/@x')).toBe(true); expect(isYouTube('https://youtu.be/abc')).toBe(true)
    expect(isYouTube('https://example.com/youtube.com/')).toBe(false); expect(isYouTube('http://youtube.com/x')).toBe(false); expect(isYouTube(null)).toBe(false)
  })
})

describe('the calendar file', () => {
  const event = { id: 'abc-1', title: 'Read, laugh; repeat', starts_at: '2026-12-05T19:00:00.000Z', description: 'Line one\nLine two', link_url: 'https://www.youtube.com/@thedraftingdesk' }
  const ics = makeIcs(event, { siteUrl: 'https://starscapesfactory.com', now: new Date('2026-10-18T10:00:00Z') })
  it('is a proper calendar event with the right start, and an end an hour later', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true); expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261205T190000Z'); expect(ics).toContain('DTEND:20261205T200000Z'); expect(ics).toContain('DTSTAMP:20261018T100000Z')
    expect(ics).toContain('UID:abc-1@starscapesfactory.com'); expect(ics).toContain('URL:https://www.youtube.com/@thedraftingdesk')
  })
  it('escapes commas, semicolons and line breaks so a title cannot break the file', () => {
    expect(ics).toContain('SUMMARY:Read\\, laugh\\; repeat'); expect(ics).toContain('DESCRIPTION:Line one\\nLine two')
  })
  it('uses the site address when the event has no link, and keeps every line short enough', () => {
    expect(makeIcs({ ...event, link_url: null }, { siteUrl: 'https://starscapesfactory.com' })).toContain('URL:https://starscapesfactory.com')
    const long = makeIcs({ ...event, title: 'x'.repeat(200) })
    for (const line of long.split('\r\n')) expect(line.length).toBeLessThanOrEqual(74)
  })
  it('can be turned into a link that downloads, and back', () => {
    const href = icsHref(ics)
    expect(href.startsWith('data:text/calendar;charset=utf-8,')).toBe(true)
    expect(decodeURIComponent(href.split(',')[1])).toBe(ics)
  })
})

describe('the featured room', () => {
  it('is the chosen room if it is a real room, otherwise the Art Loft', () => {
    const slugs = ['art-loft', 'knowledge-nook', 'sarah-jrs-den']
    expect(featuredRoomSlug('knowledge-nook', slugs)).toBe('knowledge-nook')
    for (const v of ['', 'nonsense', null, undefined]) expect(featuredRoomSlug(v, slugs)).toBe('art-loft')
  })
})

describe('agreement with the database file', () => {
  const sql = read('sql/home.sql')
  const live = sql.split('-- TO UNDO')[0]
  const OWNER = "lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com'"
  it('uses the same limits, an https-only link, and only the one setting key', () => {
    expect(sql).toContain(`between 1 and ${LIMITS.title}`); expect(sql).toContain(`char_length(description) <= ${LIMITS.description}`)
    expect(sql).toContain("link_url ~ '^https://'"); expect(sql).toContain("key in ('featured_room')")
  })
  it('is closed to everyone but the owner for changes, with row level security on', () => {
    for (const t of ['events', 'site_settings']) expect(live).toContain(`alter table public.${t} enable row level security`)
    for (const name of ['only the owner changes events', 'only the owner changes the site settings']) {
      const block = live.slice(live.indexOf(`create policy "${name}"`)).split(';')[0]
      expect(block).toContain('for all to authenticated'); expect(block.split(OWNER).length - 1, name).toBe(2)
    }
    expect(live).not.toMatch(/grant (insert|update|delete)[^;]*to anon/)
  })
  it('shows a visitor only published events, while the owner sees them all', () => {
    expect(live).toMatch(/create policy "anyone can see published events" on public\.events for select to anon, authenticated\s+using \(published or lower\(auth\.jwt\(\) ->> 'email'\) = 'gillian@gillianbennet\.com'\)/)
  })
  it('can be run twice, and says how to confirm it and undo it', () => {
    expect(live.match(/drop policy if exists/g).length).toBe(live.match(/create policy/g).length)
    expect(live).toContain('create table if not exists public.events'); expect(live).toContain('create table if not exists public.site_settings')
    expect(sql).toMatch(/where tablename in \('events', 'site_settings'\)/); expect(sql).toContain('drop table if exists public.events')
  })
})
