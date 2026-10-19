// Vercel serverless function: the latest videos from Sarah Jr.'s channel, for the YouTube Series page. Public, read-only, and cached for 15 minutes,
// so YouTube is asked at most a few times an hour however many people visit.
import { fetchVideos } from '../lib/youtubeFeed.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false })
  const result = await fetchVideos()
  if (result.ok) res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  else res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(result.ok ? { ok: true, videos: result.videos } : { ok: false, videos: [] })
}
