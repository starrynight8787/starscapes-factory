// Vercel serverless function: the latest videos for the YouTube pages. Public, read-only, and cached for 15 minutes, so YouTube is asked at most a few times an hour however many people visit.
// With no ?list, it is Sarah Jr.'s channel (the Den's YouTube Series page). With ?list=come-write-with-me it is the Come Write With Me playlist (the Drafting Desk page).
// The playlist is chosen on the server, from src/draftingdesk/comeWriteData.js: a browser can only name a list from the short list below, never send a playlist id of its own.
// (This is one function with two jobs because the free Vercel plan allows only 12 functions.)
import { fetchVideos, playlistFeedUrl } from '../lib/youtubeFeed.js'
import { LIST_KEY, PLAYLIST_ID } from '../src/draftingdesk/comeWriteData.js'

const sendResult = (res, result) => {
  if (result.ok) res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  else res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(result.ok ? { ok: true, videos: result.videos } : { ok: false, videos: [] })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false })
  const asked = req.query && req.query.list !== undefined ? req.query.list : ''
  if (asked !== '') {
    if (asked !== LIST_KEY) { res.setHeader('Cache-Control', 'no-store'); return res.status(400).json({ ok: false, videos: [] }) }
    const feedUrl = playlistFeedUrl(PLAYLIST_ID)
    // no playlist chosen yet: an honest empty list, without asking YouTube anything
    if (!feedUrl) { res.setHeader('Cache-Control', 'public, s-maxage=60'); return res.status(200).json({ ok: true, videos: [] }) }
    return sendResult(res, await fetchVideos({ feedUrl, max: 15 }))
  }
  return sendResult(res, await fetchVideos())
}
