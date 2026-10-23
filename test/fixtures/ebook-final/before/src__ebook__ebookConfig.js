// The free ebook: its words and its file. Used by the page (src/ebook/FreeEbookPage.jsx) and by the newsletter's server code (lib/newsletter.js): getting the free ebook needs NO tick and does not sign anyone up to the newsletter. The newsletter is a separate, optional, unticked box on the page (the same words as everywhere: see OPTIONAL_NEWSLETTER_TEXT in src/newsletter/newsletterRules.js). The request itself is kept apart from the newsletter list.
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
  // The words recorded as what they asked for (chosen on the server, never taken from the browser). Nothing about the newsletter is in it: that has its own box and its own words.
  request: 'Send me the free ebook, Leading from the Middle, by email.',
  // The small print under the button.
  smallPrint: 'We will email you a link to confirm your address. Once you confirm, the ebook is yours. We use your email for that only, unless you tick the box.',
}
