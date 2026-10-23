// Explorer's Bay: the words and the file for the Road journal, and the doors that have a "tell me when it opens" list. Used by the pages (src/explorers) and by the server (lib/newsletter.js),
// so they always agree. Like the free ebook, none of these needs a tick to get what was asked for; the newsletter is a separate optional box (src/newsletter/newsletterRules.js).
// WHEN THE ROAD JOURNAL FILE IS READY: save it in the project at public/downloads/ (for example public/downloads/road-journal.pdf), then set "file" below to '/downloads/road-journal.pdf'
// and push. Until "file" is filled in, the Road journal page stays taped even if the door is opened in Admin, and no email with a link is sent.
export const JOURNAL = {
  title: 'The Road Journal',
  summary: 'A free printable journal for the road: pages for the places you go and the things you notice.',
  inside: ['Pages for where you went and what you saw', 'Prompts for the moments that are easy to miss', 'A page for what you would tell your future self'],
  file: '',
  fileNote: 'PDF, to print at home.',
  request: 'Send me the free Road journal by email.',
  smallPrint: 'We will email you a link to confirm your address. Your download link comes once you have confirmed. We use your email for that only, unless you tick the box.',
}

// The doors with a taped page and a "tell me when it opens" sign-up. The name is for the email and the page.
export const OPENING_DOORS = {
  'lessons-from-the-road': { name: 'Lessons from the road' },
  'travel-map': { name: 'The Travel map' },
  'road-journal': { name: 'The Road journal' },
}
export const OPENS_REQUEST = 'Tell me once, by email, when this door opens.'
export const OPENS_SMALL_PRINT = 'One message when this door opens, and nothing else unless you tick the box.'
