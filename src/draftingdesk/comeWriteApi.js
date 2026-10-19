import { LIST_KEY } from './comeWriteData'

// The Come Write With Me sessions: the videos in the chosen playlist, newest first. If YouTube cannot be reached this throws, and the page says so in plain words.
export async function fetchSessions() {
  const response = await fetch(`/api/youtube-series?list=${LIST_KEY}`)
  const body = await response.json()
  if (!body || body.ok !== true || !Array.isArray(body.videos)) throw new Error('The sessions could not load.')
  return body.videos
}
