// Reading the public feed of Sarah Jr.'s YouTube channel, for the YouTube Series page (src/den/YouTubeSeriesPage.jsx).
//
// Rules this keeps:
//   - It asks only YouTube's public feed and public thumbnail pictures, with no key and no sign-in.
//   - A video id is only used if it is exactly 11 letters, numbers, dashes or underscores, so nothing odd can reach an address or a page.
//   - Shorts are left out (the page is for the episodes). Change INCLUDE_SHORTS to put them back.
//   - It never throws. What happened comes back as { ok, videos } or { ok: false, reason } in plain words.

export const CHANNEL_ID = 'UCuUUdvPlzi7m8QpD5MAdFTw' // @sarahjradventures
export const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
export const INCLUDE_SHORTS = false
export const MAX_VIDEOS = 12
export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function decode(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

// The videos in a feed, newest first, as { id, title, published }
export function parseFeed(xml, { max = MAX_VIDEOS, shorts = INCLUDE_SHORTS } = {}) {
  const videos = []
  for (const match of String(xml || '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = match[1]
    const id = (entry.match(/<yt:videoId>([^<]*)<\/yt:videoId>/) || [])[1]
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]
    const published = (entry.match(/<published>([^<]*)<\/published>/) || [])[1]
    const isShort = /<link[^>]+href="[^"]*\/shorts\//.test(entry)
    if (!id || !VIDEO_ID.test(id) || !title || (isShort && !shorts)) continue
    const when = new Date(published)
    videos.push({ id, title: decode(title).trim().slice(0, 140), published: Number.isNaN(when.getTime()) ? null : when.toISOString() })
    if (videos.length >= max) break
  }
  return videos
}

// A playlist's own feed, in the same format as the channel's. Only a proper playlist id is used, so nothing odd can reach an address.
export const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,64}$/
export const playlistFeedUrl = (id) => (PLAYLIST_ID.test(String(id || '')) ? `https://www.youtube.com/feeds/videos.xml?playlist_id=${id}` : '')

export async function fetchVideos({ fetchImpl = fetch, timeoutMs = 8000, feedUrl = FEED_URL, max = MAX_VIDEOS } = {}) {
  try {
    const response = await fetchImpl(feedUrl, { headers: { Accept: 'application/atom+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return { ok: false, reason: `YouTube answered ${response.status}.` }
    return { ok: true, videos: parseFeed(await response.text(), { max }) }
  } catch (e) {
    return { ok: false, reason: 'YouTube could not be reached just now.' }
  }
}

// One thumbnail picture, fetched here so a visitor's browser never contacts YouTube until they press play
export async function fetchThumbnail(id, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (!VIDEO_ID.test(String(id || ''))) return { ok: false, reason: 'That is not a video id.' }
  try {
    const response = await fetchImpl(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, { signal: AbortSignal.timeout(timeoutMs) })
    const type = response.headers.get('content-type') || ''
    if (!response.ok || !/^image\/(jpeg|png|webp)/i.test(type)) return { ok: false, reason: 'No picture for that video.' }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length === 0 || bytes.length > 600000) return { ok: false, reason: 'No usable picture for that video.' }
    return { ok: true, bytes, type: type.split(';')[0] }
  } catch (e) {
    return { ok: false, reason: 'YouTube could not be reached just now.' }
  }
}
