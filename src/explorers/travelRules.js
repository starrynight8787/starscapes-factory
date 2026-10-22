// Explorer's Bay travel posts, the plain rules. Nothing here talks to the database.
// A Lessons from the road piece (and any Writing in Transit piece that is about one place) carries three optional extras: a two-letter country code, the year visited, and a link to the
// government's official travel advice. The map and the Lessons list read them. Photos sit inside an article as a line of its own: [photo: https://address | what the photo shows]
import { isCountryCode } from '../atlas/atlasRules'
import { tidyTag } from '../rooms/postRules'

export const ROOM = 'explorers-bay'
export const LESSONS_TAG = 'lessons-from-the-road'
export const FIRST_YEAR = 1950

export const cleanCountry = (c) => {
  const code = typeof c === 'string' ? c.trim().toUpperCase() : ''
  return isCountryCode(code) ? code : ''
}

// The country's name in plain English. An unknown code gives an empty string, never a broken page.
export function countryName(code) {
  const c = cleanCountry(code)
  if (!c) return ''
  try {
    return new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(c) || c
  } catch (e) {
    return c
  }
}

export function cleanYear(y, now = new Date().getFullYear()) {
  const n = typeof y === 'string' && /^\d{4}$/.test(y.trim()) ? Number(y.trim()) : typeof y === 'number' ? y : NaN
  return Number.isInteger(n) && n >= FIRST_YEAR && n <= now + 1 ? n : null
}

// Only a secure web address with a real host, and no name or password folded into it. Anything else is dropped, so a bad value can never become a link.
export function cleanAdviceUrl(u) {
  const text = typeof u === 'string' ? u.trim() : ''
  if (!text || /\s/.test(text)) return ''
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) return ''
    return url.href
  } catch (e) {
    return ''
  }
}

export const isLesson = (post) => Array.isArray(post && post.tags) && post.tags.map(tidyTag).includes(LESSONS_TAG)

// What a post says about its place, cleaned: { country, year, advice } (empty string or null where it says nothing)
export const travelOf = (post) => ({
  country: cleanCountry(post && post.country),
  year: cleanYear(post && post.year_visited),
  advice: cleanAdviceUrl(post && post.advice_url),
})

// The fields to save with a post. Only Explorer's Bay posts carry them, and only the ones that were filled in, so a post that has no travel details saves exactly as before
// (and still saves if the database has not been given the columns yet).
export function travelPayload(channel, { country, year, advice } = {}) {
  if (channel !== ROOM) return {}
  const out = {}
  const c = cleanCountry(country)
  const y = cleanYear(year)
  const a = cleanAdviceUrl(advice)
  if (c) out.country = c
  if (y) out.year_visited = y
  if (a) out.advice_url = a
  return out
}

// The same fields when an edit clears them: an empty box saves as nothing.
export function travelChanges(channel, values = {}) {
  if (channel !== ROOM) return {}
  return { country: cleanCountry(values.country) || null, year_visited: cleanYear(values.year) || null, advice_url: cleanAdviceUrl(values.advice) || null }
}

// Plain-words problems under the travel fields: { country, year, advice }
export function travelProblems({ channel, tags, country, year, advice }) {
  const found = {}
  if (channel !== ROOM) return found
  const lesson = (Array.isArray(tags) ? tags : []).map(tidyTag).includes(LESSONS_TAG)
  if (String(country || '').trim() && !cleanCountry(country)) found.country = 'Choose a country from the list.'
  if (lesson && !cleanCountry(country)) found.country = 'A Lessons from the road piece needs its country, so it can go on the map.'
  if (String(year || '').trim() && !cleanYear(year)) found.year = 'Write the year as four digits, for example 2023.'
  if (String(advice || '').trim() && !cleanAdviceUrl(advice)) found.advice = 'Use the full address of the official travel advice page, starting with https://'
  return found
}

// ---- photos inside an article ----
const PHOTO_LINE = /^\[photo:\s*(\S+?)\s*\|\s*([\s\S]*?)\s*\]$/i
const PHOTO_START = /^\[photo:/i

// An address a photo may come from: this site, or a secure address.
export const photoSource = (u) => (typeof u === 'string' && (/^https:\/\/[^\s/]+\//i.test(u.trim()) || (u.trim().startsWith('/') && !u.trim().startsWith('//'))) ? u.trim() : '')

// The words of a post as blocks: { type: 'text', text } and { type: 'photo', url, alt }. A photo with no description or an unusable address is left out, never shown without its alt text.
export function bodyBlocks(text) {
  const blocks = []
  let run = []
  const flush = () => {
    const t = run.join('\n').replace(/^\n+|\n+$/g, '')
    if (t) blocks.push({ type: 'text', text: t })
    run = []
  }
  for (const line of String(text == null ? '' : text).split('\n')) {
    const m = PHOTO_LINE.exec(line.trim())
    if (m) {
      flush()
      const url = photoSource(m[1])
      const alt = m[2].trim()
      if (url && alt) blocks.push({ type: 'photo', url, alt })
    } else if (PHOTO_START.test(line.trim())) {
      flush() // a photo line that does not read properly is not shown as code on the page
    } else run.push(line)
  }
  flush()
  return blocks
}

export const photoLine = (url, alt) => `[photo: ${url} | ${String(alt).replace(/[\]\s]+/g, ' ').trim()}]`

// Photo lines in the text that would not show, with the reason in plain words (for the editor)
export function photoProblems(text) {
  const found = []
  for (const line of String(text == null ? '' : text).split('\n')) {
    const t = line.trim()
    if (!PHOTO_START.test(t)) continue
    const m = PHOTO_LINE.exec(t)
    if (!m) found.push('A photo line is not written as [photo: address | description].')
    else if (!photoSource(m[1])) found.push('A photo has an address that cannot be used.')
    else if (!m[2].trim()) found.push('Every photo needs a description of what it shows.')
  }
  return found
}

// A photo is re-drawn before it is kept, which leaves out the location and camera details that are saved inside the original file. This is the size it is drawn at.
export const PHOTO_MAX_SIDE = 2000
export function scaledSize(w, h, max = PHOTO_MAX_SIDE) {
  if (!(w > 0) || !(h > 0)) return { width: 0, height: 0 }
  const k = Math.min(1, max / Math.max(w, h))
  return { width: Math.round(w * k), height: Math.round(h * k) }
}

// ---- countries with something to read ----
// The posts grouped by country: { GB: { code, name, years: [2019, 2023], lessons: [...], writing: [...] } }. A post with no usable country is not on the map.
export function byCountry(posts) {
  const out = {}
  for (const p of Array.isArray(posts) ? posts : []) {
    const t = travelOf(p)
    if (!t.country) continue
    const c = out[t.country] || (out[t.country] = { code: t.country, name: countryName(t.country), years: [], lessons: [], writing: [] })
    if (isLesson(p)) {
      c.lessons.push(p)
      if (t.year && !c.years.includes(t.year)) c.years.push(t.year)
    } else c.writing.push(p)
  }
  for (const c of Object.values(out)) c.years.sort((a, b) => a - b)
  return out
}

// "Visited 2019 and 2023" (empty when no year is known)
export function yearsLine(years) {
  const ys = (Array.isArray(years) ? years : []).filter(Boolean)
  if (ys.length === 0) return ''
  if (ys.length === 1) return `Visited ${ys[0]}`
  return `Visited ${ys.slice(0, -1).join(', ')} and ${ys[ys.length - 1]}`
}
