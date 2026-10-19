// The four passes. Names and words are Gill's, from the Figma design ("13 Membership"); the room each belongs to is shown on its card.
// A pass is identified by its id, which is what the database and Stripe will store, so never change an id once people hold it.
//
// The first three posts in EVERY pass are free to read (decided 19 October 2026), so the passes do not each advertise it: one line under "Free, always" says it.

export const PASSES = [
  { id: 'authors-notebook', name: "The Author's Notebook", blurb: 'Behind the scenes, straight from the notebook.', room: 'drafting-desk' },
  { id: 'early-drafts', name: 'Early drafts and book background', blurb: 'Early drafts of the stories, and the background to the book.', room: 'drafting-desk' },
  { id: 'blueprints', name: 'Blueprints', blurb: 'The reasoning behind every decision, in full.', room: 'factory-floor' },
  { id: 'book-club', name: 'Book Club', blurb: 'Reviews, conversations about books, and a theme we follow each year.', room: 'knowledge-nook' },
]

export const PASS_IDS = PASSES.map((p) => p.id)

// Only real, known pass ids, each once, in the order the passes are drawn. (The payment server uses this to throw away anything made up.)
export function cleanPassIds(ids) {
  const wanted = new Set(Array.isArray(ids) ? ids : [])
  return PASS_IDS.filter((id) => wanted.has(id))
}

// The words a customer agrees to by ticking the box above "Continue to payment". Both parts are required by law (express consent AND acknowledgement that the right
// to cancel is lost) for digital content opened within the 14 days. Checked against regulation 37 of the Consumer Contracts Regulations 2013 on 19 October 2026.
export const CONSENT_TEXT = 'Open my passes now. I understand that once they open, I lose my 14-day right to cancel and get a refund.'

export const FREE_TEXT = 'Read every public entry and the latest posts, and get the free ebook. The first three posts in every pass are free to read too.'
export const STRIPE_NOTE = 'You pay on Stripe, by card. Cancel any time. You keep your passes until the end of what you have paid for.'
