// The plain rules behind the home page's "Next event" and "Featured room": what an event may contain, working in London time, the calendar file, and which
// event is "next". Nothing in here talks to the database, so the page, the admin tool and the database file all agree on the same limits (a test checks).
import { CONTACT_EMAIL } from '../data/contact'


export const LIMITS = { title: 120, description: 300 }
export const DEFAULT_FEATURED = 'art-loft'
export const GRACE_HOURS = 2 // an event is still "next" for two hours after it starts
export const EVENT_MINUTES = 60 // how long the calendar entry lasts

const LONDON = 'Europe/London'
const tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

function londonParts(ms) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, hourCycle: 'h23', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms))
  const get = (t) => (parts.find((p) => p.type === t) || {}).value
  return { weekday: get('weekday'), year: Number(get('year')), monthName: get('month'), day: Number(get('day')), hour: Number(get('hour')), minute: Number(get('minute')), second: Number(get('second')) }
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const offsetMinutes = (ms) => { const p = londonParts(ms); return Math.round((Date.UTC(p.year, MONTHS.indexOf(p.monthName), p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 60000) }

// "2026-10-31" and "19:00" as London clocks read them, to the moment they mean (so summer time is handled)
export function londonToIso(date, time) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  let utc = guess - offsetMinutes(guess) * 60000
  utc = guess - offsetMinutes(utc) * 60000 // settle across the night the clocks change
  return new Date(utc).toISOString()
}

// The date and the time on a London clock, ready for the two boxes in the admin form
export function isoToLondonInputs(iso) {
  const p = londonParts(new Date(iso).getTime())
  const two = (n) => String(n).padStart(2, '0')
  return { date: `${p.year}-${two(MONTHS.indexOf(p.monthName) + 1)}-${two(p.day)}`, time: `${two(p.hour)}:${two(p.minute)}` }
}

// "Saturday 31 October, 7pm" (or "7:30pm"), in London time
export function formatEventWhen(iso) {
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const p = londonParts(ms)
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12
  const clock = p.minute === 0 ? `${h12}${p.hour < 12 ? 'am' : 'pm'}` : `${h12}:${String(p.minute).padStart(2, '0')}${p.hour < 12 ? 'am' : 'pm'}`
  return `${p.weekday} ${p.day} ${p.monthName}, ${clock}`
}

// The one event the home page shows: published, not over, and the soonest
export function pickNextEvent(events, now = new Date()) {
  const earliest = now.getTime() - GRACE_HOURS * 3600 * 1000
  return (Array.isArray(events) ? events : [])
    .filter((e) => e && e.published !== false && !Number.isNaN(new Date(e.starts_at).getTime()) && new Date(e.starts_at).getTime() >= earliest)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null
}

export const isYouTube = (url) => /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(String(url || ''))

// Checks one event before it is saved. Returns { ok: true, value } or { ok: false, errors } with plain words for each problem.
export function cleanEvent(input) {
  const i = input || {}
  const errors = {}
  const title = tidy(i.title), date = tidy(i.date), time = tidy(i.time), description = tidy(i.description), link = tidy(i.link)
  if (!title) errors.title = 'Write a name for the event.'
  else if (title.length > LIMITS.title) errors.title = `Keep the name to ${LIMITS.title} characters or fewer.`
  if (!date) errors.date = 'Choose the day.'
  else if (!isDate(date)) errors.date = 'Write the date as year-month-day, for example 2026-10-31.'
  if (!time) errors.time = 'Choose the time (London time).'
  else if (!isTime(time)) errors.time = 'Write the time like 19:00.'
  if (description.length > LIMITS.description) errors.description = `Keep the description to ${LIMITS.description} characters or fewer.`
  if (link) { let ok = false; try { const u = new URL(link); ok = u.protocol === 'https:' && !/\s/.test(link) } catch (e) { ok = false }; if (!ok) errors.link = 'The link must be a web address that starts https://.' }
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { title, starts_at: londonToIso(date, time), description: description || null, link_url: link || null, published: true } }
}

// ---- the calendar file (.ics), so "Add to calendar" works in any calendar app
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
function fold(line) { const out = []; let rest = line; while (rest.length > 73) { out.push(rest.slice(0, 73)); rest = ' ' + rest.slice(73) } out.push(rest); return out.join('\r\n') }
export function makeIcs(event, { siteUrl = '', now = new Date() } = {}) {
  const start = new Date(event.starts_at), end = new Date(start.getTime() + EVENT_MINUTES * 60000)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Starscapes Factory//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${event.id || stamp(start)}@${CONTACT_EMAIL.split('@')[1]}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(event.title)}`]
  if (event.description) lines.push(`DESCRIPTION:${esc(event.description)}`)
  const url = event.link_url || siteUrl
  if (url) lines.push(`URL:${url}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
export const icsHref = (ics) => `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`

// The featured room: whatever is chosen if it is a real room, otherwise the Art Loft
export const featuredRoomSlug = (value, slugs) => (Array.isArray(slugs) && slugs.includes(value) ? value : DEFAULT_FEATURED)
