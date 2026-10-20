// Vercel serverless function: the latest videos for the YouTube pages. Public, read-only, and cached for 15 minutes, so YouTube is asked at most a few times an hour however many people visit.
// With no ?list, it is Sarah Jr.'s channel (the Den's YouTube Series page). With ?list=come-write-with-me it is the Come Write With Me playlist (the Drafting Desk page); with ?list=come-read-with-me it is the Come Read With Me playlist (the Knowledge Nook page).
// The playlist is chosen on the server, from src/draftingdesk/comeWriteData.js: a browser can only name a list from the short list below, never send a playlist id of its own.
// With ?source=instagram it is the latest pictures of Gill's Instagram, for the Photography page (lib/instagramFeed.js).
// (This is one function with two jobs because the free Vercel plan allows only 12 functions.)
import { fetchVideos, playlistFeedUrl } from '../lib/youtubeFeed.js'
import { fetchPhotos } from '../lib/instagramFeed.js'
import { LIST_KEY, PLAYLIST_ID } from '../src/draftingdesk/comeWriteData.js'
import { LIST_KEY as READ_KEY, PLAYLIST_ID as READ_PLAYLIST_ID } from '../src/draftingdesk/comeReadData.js'

const sendResult = (res, result) => {
  if (result.ok) res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  else res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(result.ok ? { ok: true, videos: result.videos } : { ok: false, videos: [] })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false })
  if (req.query && req.query.source === 'instagram') {
    const result = await fetchPhotos()
    res.setHeader('Cache-Control', result.ok ? 'public, s-maxage=1800, stale-while-revalidate=7200' : 'no-store')
    const photos = result.ok ? result.photos.map((p) => ({ id: p.id, src: `/api/youtube-thumb?ig=${encodeURIComponent(p.src)}`, link: p.link, caption: p.caption, published: p.published })) : []
    return res.status(200).json({ ok: result.ok, photos })
  }
  const asked = req.query && req.query.list !== undefined ? req.query.list : ''
  if (asked !== '') {
    if (asked !== LIST_KEY && asked !== READ_KEY) { res.setHeader('Cache-Control', 'no-store'); return res.status(400).json({ ok: false, videos: [] }) }
    const feedUrl = playlistFeedUrl(asked === READ_KEY ? READ_PLAYLIST_ID : PLAYLIST_ID)
    // no playlist chosen yet: an honest empty list, without asking YouTube anything
    if (!feedUrl) { res.setHeader('Cache-Control', 'public, s-maxage=60'); return res.status(200).json({ ok: true, videos: [] }) }
    return sendResult(res, await fetchVideos({ feedUrl, max: 15 }))
  }
  return sendResult(res, await fetchVideos())
}
