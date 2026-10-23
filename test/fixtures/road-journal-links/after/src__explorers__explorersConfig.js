// Explorer's Bay: the words and the file for the Road journal, and the doors that have a "tell me when it opens" list. Used by the pages (src/explorers) and by the server (lib/newsletter.js),
// so they always agree. Like the free ebook, none of these needs a tick to get what was asked for; the newsletter is a separate optional box (src/newsletter/newsletterRules.js).
// THE ROAD JOURNAL'S DOWNLOADS (decided by Gill, 23 October 2026): two final PDFs, shown as two plain links, A4 first and US Letter second. Both files must be in public/downloads/ under exactly these names
// (a test fails if either is missing, so a broken link can never go out). Both go through the SAME confirm step: choosing a size adds no form and no email, and nothing counts the clicks (no analytics, no extra data).
// If the list is empty the Road journal page stays taped even if the door is opened in Admin, and no email with a link is sent.
export const JOURNAL = {
  title: 'The Road Journal',
  summary: 'A free printable journal for the road: pages for the places you go and the things you notice.',
  inside: ['Pages for where you went and what you saw', 'Prompts for the moments that are easy to miss', 'A page for what you would tell your future self'],
  files: [
    { id: 'a4', label: 'A4 (UK and Europe)', file: '/downloads/starscapes-road-journal-a4.pdf' },
    { id: 'us-letter', label: 'US Letter', file: '/downloads/starscapes-road-journal-us-letter.pdf' },
  ],
  fileNote: 'PDF, to print at home.',
  request: 'Send me the free Road journal by email.',
  smallPrint: 'We will email you a link to confirm your address. Your download link comes once you have confirmed. We use your email for that only, unless you tick the box.',
}

// The Road journal's downloads in the order they are shown (A4, then US Letter), leaving out anything without a file. Empty means the journal is not ready.
export const journalFiles = (journal = JOURNAL) => (Array.isArray(journal.files) ? journal.files : []).filter((f) => f && typeof f.file === 'string' && f.file !== '')

// The doors with a taped page and a "tell me when it opens" sign-up. The name is for the email and the page.
export const OPENING_DOORS = {
  'lessons-from-the-road': { name: 'Lessons from the road' },
  'travel-map': { name: 'The Travel map' },
  'road-journal': { name: 'The Road journal' },
}
export const OPENS_REQUEST = 'Tell me once, by email, when this door opens.'
export const OPENS_SMALL_PRINT = 'One message when this door opens, and nothing else unless you tick the box.'
