// The plain rules of the "suggest and vote" box: what each space says, what a suggestion may contain, and how the list is put in order.
// Nothing in here talks to the database, so it is easy to test and the page and the database agree on the same limits.

export const LIMITS = { titleMin: 2, titleMax: 120, whyMax: 300, perDay: 3 }

// One entry per page that has the box. "kinds" are the things a visitor can suggest; the key must match what the database allows.
export const SPACES = {
  'story-ledger': {
    heading: 'What should I audit next?',
    blurb: 'Suggest a show to audit, or a stat to track, and vote for the ones you want. I read every suggestion before it shows.',
    chosenLabel: 'Chosen: next audit',
    kinds: [
      { key: 'show', label: 'A show to audit', field: 'What should I audit?', placeholder: 'e.g. Knight Rider', help: 'The name of the show.', chip: 'Show' },
      { key: 'stat', label: 'A stat to track', field: 'What should I count?', placeholder: 'e.g. Dramatic slow-motion running', help: 'Something to count in each episode.', chip: 'Stat' },
    ],
  },
  'book-club': {
    heading: 'What should we read next?',
    blurb: 'Suggest a book, and vote for the ones you want. I read every suggestion before it shows.',
    chosenLabel: 'Chosen: next book',
    kinds: [{ key: 'book', label: 'A book', field: 'Which book?', placeholder: 'Title, and the author if you know it', help: 'The title, and the author if you know it.', chip: 'Book' }],
  },
}

const tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const hasLink = (text) => /https?:|www\.|\.(com|net|org|co|uk|io|ru|xyz)\b/i.test(text)

// Checks one suggestion before it is sent. Returns { ok: true, value } or { ok: false, errors } with plain words for each problem.
export function cleanSuggestion(space, input) {
  const config = SPACES[space]
  const errors = {}
  if (!config) return { ok: false, errors: { form: 'That page does not take suggestions.' } }
  const kind = tidy(input && input.kind)
  const title = tidy(input && input.title)
  const why = tidy(input && input.why)
  if (!config.kinds.some((k) => k.key === kind)) errors.kind = 'Choose what you are suggesting.'
  if (title.length < LIMITS.titleMin) errors.title = 'Please write what you are suggesting.'
  else if (title.length > LIMITS.titleMax) errors.title = `Please keep it to ${LIMITS.titleMax} characters or fewer.`
  else if (hasLink(title)) errors.title = 'Please leave web addresses out: just the name.'
  if (why.length > LIMITS.whyMax) errors.why = `Please keep it to ${LIMITS.whyMax} characters or fewer.`
  else if (hasLink(why)) errors.why = 'Please leave web addresses out.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { space, kind, title, why: why || null } }
}

// Puts the list in order: chosen first, then the most votes, then the one suggested first. Adds each one's votes and whether you voted.
export function rankSuggestions(rows, tally = {}, mine = new Set()) {
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && (r.status === 'approved' || r.status === 'chosen'))
  return list
    .map((r) => ({ ...r, votes: Number(tally[r.id]) || 0, voted: mine.has(r.id) }))
    .sort((a, b) => (b.status === 'chosen') - (a.status === 'chosen') || b.votes - a.votes || String(a.created_at).localeCompare(String(b.created_at)))
}

// What to tell someone when the database refuses, in plain words (and never the database's own message)
export function plainProblem(error) {
  const text = String((error && (error.message || error.code)) || '')
  if (/row-level security|42501|violates/i.test(text)) return `That did not go through. You can suggest up to ${LIMITS.perDay} a day, and only while the box is open.`
  if (/duplicate|23505/i.test(text)) return 'You have already done that.'
  return 'That did not go through just now. Please try again in a moment.'
}
