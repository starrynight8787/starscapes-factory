// Reading the latest pictures of Gill's Instagram (@gill_bennet) for the Photography page, through Instagram's own official API (the "Instagram API with
// Instagram Login"). The page itself never talks to Instagram: this runs on the server and the pictures are passed along by this site.
//
// Rules this keeps:
//   - The access token lives only on the server: in the instagram_token table (see sql/instagram.sql), which no visitor can read, or in the Vercel setting
//     INSTAGRAM_ACCESS_TOKEN as a fallback. It never reaches a browser, a page or a log.
//   - A token lasts 60 days. Whenever it is more than 30 days old it is swapped for a fresh one and the new one is saved, so it never runs out while the page is visited.
//   - Only pictures are used, and only the web addresses Instagram's own picture servers use (see isPictureHost).
//   - It never throws. What happened comes back as { ok, photos } or { ok: false } in plain words.
import { serviceFetch } from './serviceKey.js'

export const PROFILE_URL = 'https://www.instagram.com/gill_bennet/'
export const MAX_PHOTOS = 12
export const REFRESH_AFTER_DAYS = 30
const API = 'https://graph.instagram.com'

// Instagram's picture servers (and nothing else) are the only addresses the picture passer will fetch
export const isPictureHost = (url) => /^https:\/\/[a-z0-9.-]+\.(cdninstagram\.com|fbcdn\.net)\//i.test(String(url || ''))
const permalinkOk = (url) => /^https:\/\/(www\.)?instagram\.com\//i.test(String(url || ''))

// The pictures in an answer from Instagram, newest first, as { id, src, link, caption, published }. src is the picture's address ON INSTAGRAM; the page gets this site's own address for it.
export function parseMedia(body, max = MAX_PHOTOS) {
  const rows = body && Array.isArray(body.data) ? body.data : []
  const photos = []
  for (const row of rows) {
    const src = row && (row.media_type === 'VIDEO' ? row.thumbnail_url : row.media_url)
    if (!row || !/^[0-9]{5,30}$/.test(String(row.id || '')) || !isPictureHost(src) || !permalinkOk(row.permalink)) continue
    const when = new Date(row.timestamp)
    photos.push({ id: String(row.id), src, link: row.permalink, caption: String(row.caption || '').replace(/\s+/g, ' ').trim().slice(0, 140), published: Number.isNaN(when.getTime()) ? null : when.toISOString() })
    if (photos.length >= max) break
  }
  return photos
}

const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000

async function loadToken() {
  try {
    const response = await serviceFetch('/rest/v1/instagram_token?id=eq.1&select=token,refreshed_at')
    if (response.ok) {
      const rows = await response.json()
      if (rows[0] && rows[0].token) return { token: String(rows[0].token).trim(), refreshedAt: rows[0].refreshed_at, stored: true }
    }
  } catch (e) { /* fall through to the setting */ }
  const fromSetting = String(process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  return fromSetting ? { token: fromSetting, refreshedAt: null, stored: false } : null
}

async function refreshToken(current, fetchImpl) {
  try {
    const response = await fetchImpl(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(current.token)}`, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return current
    const body = await response.json()
    if (!body || !body.access_token) return current
    const fresh = { token: String(body.access_token), refreshedAt: new Date().toISOString(), stored: true }
    await serviceFetch('/rest/v1/instagram_token?id=eq.1', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ token: fresh.token, refreshed_at: fresh.refreshedAt }) })
    return fresh
  } catch (e) { return current }
}

export async function fetchPhotos({ fetchImpl = fetch, timeoutMs = 8000, max = MAX_PHOTOS } = {}) {
  try {
    let current = await loadToken()
    if (!current) return { ok: false, reason: 'not set up' }
    if (current.stored && current.refreshedAt && daysSince(current.refreshedAt) > REFRESH_AFTER_DAYS) current = await refreshToken(current, fetchImpl)
    const fields = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp'
    const response = await fetchImpl(`${API}/me/media?fields=${fields}&limit=${max * 2}&access_token=${encodeURIComponent(current.token)}`, { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return { ok: false, reason: `Instagram answered ${response.status}.` }
    return { ok: true, photos: parseMedia(await response.json(), max) }
  } catch (e) {
    return { ok: false, reason: 'Instagram could not be reached just now.' }
  }
}

// One picture, fetched here so a visitor's browser never contacts Instagram
export async function fetchPicture(url, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (!isPictureHost(url)) return { ok: false, reason: 'That is not an Instagram picture.' }
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) })
    const type = response.headers.get('content-type') || ''
    if (!response.ok || !/^image\/(jpeg|png|webp)/i.test(type)) return { ok: false, reason: 'No picture there.' }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length > 4 * 1024 * 1024) return { ok: false, reason: 'Too large.' }
    return { ok: true, type: type.split(';')[0], bytes }
  } catch (e) {
    return { ok: false, reason: 'Instagram could not be reached just now.' }
  }
}
