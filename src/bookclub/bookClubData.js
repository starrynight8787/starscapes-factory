// The words on the Book Club page that are not from the database, from the Figma design ("Overview page: Book Club").
export const SUBTITLE = 'What I am reading, and what it taught me.'
export const COME_READ = { label: 'Come read with me', note: 'Live reading sessions on YouTube, together.' }
export const THEME_INTRO = 'Each year the Book Club follows one theme. The reviews and conversations through the year all gather around it.'
export const THEME_FALLBACK = 'to be chosen'

// The welcome card and the membership card, from the Figma design "Book Club v3". The words are placeholders in Gill's voice: change them here. While videoId is empty the welcome card
// shows a plain "coming soon" picture; paste the 11-character id of a YouTube video (the part after v=) and it becomes a video that only loads from YouTube when it is pressed.
export const WELCOME = {
  videoId: '',
  label: 'Welcome',
  title: 'A message from me',
  text: 'Welcome to the Book Club. I read, I make notes, and I share what each book teaches me. Join in whenever you like.',
  noVideo: 'Welcome video coming soon',
}
// What a member gets, for the Book Club pass (the first three reviews are free to read, then the pass opens the rest)
export const MEMBER_BENEFITS = ['All my reviews and notes, after the first three free', 'Suggest the next book, and vote for it', 'A place in the conversation']
export const SHELF_INTRO = 'Every year has its own shelf of the books I read.'
export const GENRES_INTRO = 'Every book on this shelf is a genre. Pick one to see my notes.'
export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
