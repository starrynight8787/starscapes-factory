// The plain rules for the YouTube Series page: which video is pinned, which seven show below it, and reading a video's address. Nothing here talks to the
// database or to YouTube.
export const GRID_COUNT = 7 // videos under the pinned one on a computer (a phone shows four first, then "Show more videos")
export const ID = /^[A-Za-z0-9_-]{11}$/

// The video id in whatever Gill pastes: a watch address, a short youtu.be address, a Shorts or embed address, or just the 11-character id. Anything else: ''.
export function videoIdFrom(text) {
  const s = String(text || '').trim()
  if (ID.test(s)) return s
  let url
  try { url = new URL(s) } catch (e) { return '' }
  if (url.protocol !== 'https:') return ''
  const host = url.hostname.replace(/^(www\.|m\.)/, '')
  let id = ''
  if (host === 'youtu.be') id = url.pathname.split('/')[1] || ''
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v') || ''
    else { const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/); id = m ? m[1] : '' }
  }
  return ID.test(id) ? id : ''
}

// The pinned video: the one Gill chose (its title comes from the channel's feed if it is still in the latest videos; if it is older, a plain "Welcome"), or if
// none is chosen, the newest video. No videos and none chosen: nothing.
export function pickIntro(videos, chosenId) {
  const list = Array.isArray(videos) ? videos.filter((v) => v && ID.test(v.id)) : []
  if (chosenId && ID.test(chosenId)) {
    const found = list.find((v) => v.id === chosenId)
    return found || { id: chosenId, title: 'Welcome to the channel', published: null }
  }
  return list[0] || null
}

// The videos under it: the newest, without the pinned one, at most seven
export function pickGrid(videos, introId, count = GRID_COUNT) {
  return (Array.isArray(videos) ? videos : []).filter((v) => v && ID.test(v.id) && v.id !== introId).slice(0, count)
}
