// Vercel serverless function: one video's thumbnail picture, passed along from YouTube, so visitors' browsers do not contact YouTube until they press play.
import { fetchThumbnail } from '../lib/youtubeFeed.js'
import { fetchPicture } from '../lib/instagramFeed.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (req.query && req.query.ig) { // an Instagram picture (only Instagram's own picture servers are fetched; one function, because the free Vercel plan allows only 12)
    const pic = await fetchPicture(String(req.query.ig))
    if (!pic.ok) { res.setHeader('Cache-Control', 'no-store'); return res.status(404).end() }
    res.setHeader('Content-Type', pic.type)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=604800')
    return res.status(200).send(Buffer.from(pic.bytes))
  }
  const id = String((req.query && req.query.id) || '')
  const result = await fetchThumbnail(id)
  if (!result.ok) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(404).end()
  }
  res.setHeader('Content-Type', result.type)
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=604800')
  return res.status(200).send(Buffer.from(result.bytes))
}
