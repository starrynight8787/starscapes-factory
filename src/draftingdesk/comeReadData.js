// The Come Read With Me page (the book on the Knowledge Nook shelf). The words and the playlist are here: change them here.
// Its videos come from the Drafting Desk's YouTube channel (the "write, study and read with me" channel), and, like Come Write With Me, only from ONE playlist.
//
// PLAYLIST_ID: on YouTube, make a playlist called Come Read With Me on the Drafting Desk channel, open it, and copy the part of its address after "list="
//   (it starts with PL, for example PLabc123...). Paste it between the quotes below. Add each session to that playlist and it appears on the page within about fifteen minutes.
//   While this is empty the page says the first session is on its way. The playlist must be Public or Unlisted (a Private playlist cannot be read).
// INTRO_ID: optional. The 11 characters after v= of a video in the playlist to pin at the top as "Start here". Empty means the newest session is shown there instead.
export const PLAYLIST_ID = ''
export const INTRO_ID = ''

// The name the page asks the server for (the server only answers to the names it knows, never to an id sent from a browser)
export const LIST_KEY = 'come-read-with-me'

export const PAGE = {
  title: 'Come Read With Me',
  subtitle: 'Read alongside me, live on YouTube.',
  empty: 'The first reading session is on its way.',
}
