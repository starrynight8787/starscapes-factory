// The free ebook: its words and its file. Used by the page (src/ebook/FreeEbookPage.jsx) and by the newsletter's server code (lib/newsletter.js): getting the free ebook needs NO tick and does not sign anyone up to the newsletter. The newsletter is a separate, optional, unticked box on the page (the same words as everywhere: see OPTIONAL_NEWSLETTER_TEXT in src/newsletter/newsletterRules.js). The request itself is kept apart from the newsletter list.
// THE PDF is Gill's final book, saved as public/downloads/leading-from-the-middle.pdf (11 pages). A test checks that it is really there, that it is a PDF under 10 MB, and that the page count in "fileNote" below is right.
// While "file" is empty the page says the ebook is being finished, and no email with a link is sent.
export const SITE_URL = 'https://starscapesfactory.com'

export const EBOOK = {
  title: 'Leading from the Middle: the free ebook',
  summary: 'A short book about leading without the big title, and the six building blocks behind it. Read it in one sitting.',
  inside: ['My story, and why I believe you are already a leader', 'The six building blocks of Leading from the Middle', 'How they fit together, with a seesaw and the great circle of life'],
  file: '/downloads/leading-from-the-middle.pdf',
  fileNote: 'PDF, 11 pages, to read on screen or print.',
  // The words recorded as what they asked for (chosen on the server, never taken from the browser). Nothing about the newsletter is in it: that has its own box and its own words.
  request: 'Send me the free ebook, Leading from the Middle, by email.',
  // The small print under the button.
  smallPrint: 'We will email you a link to confirm your address. Once you confirm, the ebook is yours. We use your email for that only, unless you tick the box.',
}
