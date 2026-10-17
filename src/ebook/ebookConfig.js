// The free ebook: its words and its file. Used by the page (src/ebook/FreeEbookPage.jsx) and by the server (lib/ebookSignup.js).
// WHEN THE PDF IS READY: save it in the project at public/downloads/ (for example public/downloads/leading-from-the-middle.pdf), then set "file" below to
// '/downloads/leading-from-the-middle.pdf', push, and the page starts offering the download. While "file" is empty the page says the ebook is being finished,
// and no email with a link is sent.
export const SITE_URL = 'https://starscapesfactory.com'

export const EBOOK = {
  title: 'Leading from the Middle: the free ebook',
  summary: 'A short guide for people who lead without the big title. Read it in an afternoon.',
  inside: ['Why the middle is where most leading happens', 'Small habits for being heard without shouting', 'Questions to ask in your next one-to-one'],
  file: '',
  fileNote: 'PDF, about 40 pages.',
  consent: 'Yes, send me the free ebook and your free blog posts by email. I can unsubscribe at any time.',
}
