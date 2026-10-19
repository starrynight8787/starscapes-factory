// The Come Write With Me page (the paper on the Drafting Desk). The words and the playlist are here: change them here.
//
// PLAYLIST_ID: the sessions on the page are the videos in ONE YouTube playlist on the Drafting Desk channel, so every other video on the channel stays off the page.
//   To set it up: on YouTube, make a playlist called Come Write With Me, open it, and copy the part of its address after "list=" (it starts with PL, for example PLabc123...).
//   Paste it between the quotes below. Add each session to that playlist and it appears on the page within about fifteen minutes. While this is empty the page says the first session is on its way.
//   The playlist must be Public or Unlisted (a Private playlist cannot be read).
// INTRO_ID: optional. The 11 characters after v= of a video in the playlist to pin at the top as "Start here". Empty means the newest session is shown there instead.
export const PLAYLIST_ID = ''
export const INTRO_ID = ''

// The name the page asks the server for (the server only answers to this one name, never to an id sent from a browser)
export const LIST_KEY = 'come-write-with-me'

export const PAGE = {
  title: 'Come Write With Me',
  subtitle: 'Join me on YouTube while I write.',
  picture: '/scenes/drafting-desk/sheet-come-write-with-me.svg',
  empty: 'The first session is on its way.',
}
// Not a sign-up form yet: the newsletter needs a mailing tool and an updated privacy policy first. It says so honestly.
export const NEWSLETTER = {
  label: 'Newsletter',
  title: 'Hear about the next session',
  text: 'The newsletter is on its way. It is not open yet.',
  button: 'Coming soon',
}
