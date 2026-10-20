// The plain rules of the Book Club tracker: what a book may contain, how the shelf and the goal are worked out. Nothing in here talks to the database,
// so the page, the admin tool and the database file all agree on the same limits (a test checks that they do).

export const GENRES = [
  { key: 'leadership', label: 'Leadership' },
  { key: 'fiction', label: 'Fiction' },
  { key: 'memoir', label: 'Memoir' },
  { key: 'self-growth', label: 'Self-growth' },
  { key: 'childrens', label: "Children's" },
]
export const STATUSES = [
  { key: 'reading', label: 'Reading now' },
  { key: 'read', label: 'Read' },
  { key: 'upnext', label: 'Up next' },
]
export const LIMITS = { title: 150, author: 100, note: 300, about: 1000, theme: 120, goalMax: 999, review: 6000, quote: 600, quotePage: 60, series: 100, characters: 12, characterName: 60, characterLine: 160 }

const tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
// A few paragraphs about a book: line breaks are kept (a blank line starts a new paragraph), spaces are tidied, and control characters are removed.
export const tidyText = (v) => String(v === null || v === undefined ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
// What the page shows for it: a list of paragraphs (a single line break inside one is just a space)
export const aboutParagraphs = (text) => tidyText(text).split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v
export const safeCover = (url) => (/^https:\/\/[^\s'"<>]+\.(jpe?g|png|webp)(\?[^\s'"<>]*)?$/i.test(String(url || '').trim()) ? String(url).trim() : '')

// A post's id from what Gill pastes: the id itself, or the post's address ending /post/<id>. Anything else is not an id.
export function postIdFrom(text) {
  const s = String(text || '').trim()
  const fromAddress = s.match(/\/post\/([A-Za-z0-9-]{1,64})\/?(?:[?#].*)?$/)
  if (fromAddress) return fromAddress[1]
  return /^[A-Za-z0-9-]{1,64}$/.test(s) ? s : ''
}

// Key characters are written one to a line in Admin as "Name: who they are" (the part after the colon is optional). They are kept as a list of { name, line }.
export function parseCharacters(text) {
  return String(text === null || text === undefined ? '' : text)
    .split(/\r?\n/)
    .map((l) => tidy(l))
    .filter(Boolean)
    .map((l) => { const i = l.indexOf(':'); return i > 0 ? { name: l.slice(0, i).trim(), line: l.slice(i + 1).trim() } : { name: l, line: '' } })
}
export const charactersToText = (list) => (Array.isArray(list) ? list : []).map((c) => (c && c.name ? (c.line ? `${c.name}: ${c.line}` : c.name) : '')).filter(Boolean).join('\n')

// The books that share this book's series, with the state of each place in it: 'read', 'reading' or 'todo'. A series is only shown when the book names one.
// The tiles run to the series' total (or to the highest number you have added); a number with no book added is simply "not yet".
export function seriesTiles(books, book) {
  if (!book || !book.series_name) return null
  const mates = (Array.isArray(books) ? books : []).filter((b) => b && b.series_name && b.series_name.trim().toLowerCase() === book.series_name.trim().toLowerCase())
  const top = Math.max(Number(book.series_total) || 0, ...mates.map((b) => Number(b.series_number) || 0), Number(book.series_number) || 0)
  const total = Math.min(top, 999)
  const state = (n) => { const m = mates.find((b) => Number(b.series_number) === n); return m ? (m.status === 'read' ? 'read' : m.status === 'reading' ? 'reading' : 'todo') : 'todo' }
  const shown = Math.min(total, 12)
  const tiles = Array.from({ length: shown }, (_, i) => ({ number: i + 1, state: state(i + 1), id: (mates.find((b) => Number(b.series_number) === i + 1) || {}).id || null }))
  const readCount = Array.from({ length: total }, (_, i) => state(i + 1)).filter((s) => s === 'read').length
  return { name: book.series_name, total, readCount, tiles, more: Math.max(0, total - shown) }
}

// The shelves: one for each genre, holding the books read or being read (newest finished first). Searching keeps only books whose title or author contains the words.
export const matchesSearch = (book, query) => {
  const q = tidy(query).toLowerCase()
  if (!q) return true
  return q.split(' ').every((w) => `${book.title || ''} ${book.author || ''}`.toLowerCase().includes(w))
}
export function genreShelves(books, query = '') {
  const have = (Array.isArray(books) ? books : []).filter((b) => b && (b.status === 'read' || b.status === 'reading') && matchesSearch(b, query))
  return GENRES.map((g) => ({ ...g, books: have.filter((b) => b.genre === g.key) }))
}

// Cleans one book before it is saved.
// Checks one book before it is saved. Returns { ok: true, value } or { ok: false, errors } with plain words for each problem.
export function cleanBook(input) {
  const i = input || {}
  const errors = {}
  const title = tidy(i.title)
  const author = tidy(i.author)
  const genre = tidy(i.genre)
  const status = tidy(i.status) || 'read'
  const started = tidy(i.started)
  const finished = tidy(i.finished)
  const note = tidy(i.note)
  const about = tidyText(i.about)
  const coverText = tidy(i.cover)
  const reviewText = tidy(i.review)
  const rating = tidy(i.rating)
  const yearPublished = tidy(i.yearPublished)
  const fullReview = tidyText(i.fullReview)
  const quote = tidyText(i.quote)
  const quotePage = tidy(i.quotePage)
  const seriesName = tidy(i.seriesName)
  const seriesNumber = tidy(i.seriesNumber)
  const seriesTotal = tidy(i.seriesTotal)
  const characters = parseCharacters(i.characters)

  if (!title) errors.title = 'Write the book\u2019s title.'
  else if (title.length > LIMITS.title) errors.title = `Keep the title to ${LIMITS.title} characters or fewer.`
  if (author.length > LIMITS.author) errors.author = `Keep the author to ${LIMITS.author} characters or fewer.`
  if (genre && !GENRES.some((g) => g.key === genre)) errors.genre = 'Choose one of the genres, or none.'
  if (!STATUSES.some((s) => s.key === status)) errors.status = 'Choose reading now, read, or up next.'
  if (started && !isDate(started)) errors.started = 'Write the date as year-month-day, for example 2026-10-03.'
  if (finished && !isDate(finished)) errors.finished = 'Write the date as year-month-day, for example 2026-10-03.'
  if (status === 'read' && !finished) errors.finished = 'A book you have read needs the date you finished it (it decides which year\u2019s shelf it sits on).'
  if (started && finished && isDate(started) && isDate(finished) && finished < started) errors.finished = 'The finishing date is before the starting date.'
  if (rating && !/^[1-5]$/.test(rating)) errors.rating = 'The rating is a whole number from 1 to 5, or empty.'
  if (note.length > LIMITS.note) errors.note = `Keep the note to ${LIMITS.note} characters or fewer.`
  if (about.length > LIMITS.about) errors.about = `Keep what the book is about to ${LIMITS.about} characters or fewer.`
  if (coverText && !safeCover(coverText)) errors.cover = 'The cover must be a web address that starts https:// and ends .jpg, .png or .webp.'
  if (reviewText && !postIdFrom(reviewText)) errors.review = 'Paste the post\u2019s address (it ends /post/ and a code), or just the code.'
  if (yearPublished && !(/^\d{4}$/.test(yearPublished) && Number(yearPublished) >= 1000 && Number(yearPublished) <= 2100)) errors.yearPublished = 'Write the year as four digits, for example 1982.'
  if (fullReview.length > LIMITS.review) errors.fullReview = `Keep the review to ${LIMITS.review} characters or fewer.`
  if (quote.length > LIMITS.quote) errors.quote = `Keep the quote to ${LIMITS.quote} characters or fewer.`
  if (quotePage.length > LIMITS.quotePage) errors.quotePage = `Keep the page or chapter to ${LIMITS.quotePage} characters or fewer.`
  if (seriesName.length > LIMITS.series) errors.seriesName = `Keep the series name to ${LIMITS.series} characters or fewer.`
  if (seriesNumber && !(/^\d+$/.test(seriesNumber) && Number(seriesNumber) >= 1 && Number(seriesNumber) <= 999)) errors.seriesNumber = 'The place in the series is a whole number, for example 1.'
  if (seriesTotal && !(/^\d+$/.test(seriesTotal) && Number(seriesTotal) >= 1 && Number(seriesTotal) <= 999)) errors.seriesTotal = 'The number of books in the series is a whole number, for example 25.'
  if ((seriesNumber || seriesTotal) && !seriesName) errors.seriesName = 'Write the series name, or empty the series boxes.'
  if (characters.length > LIMITS.characters) errors.characters = `Up to ${LIMITS.characters} characters, one to a line.`
  else if (characters.some((c) => c.name.length > LIMITS.characterName || c.line.length > LIMITS.characterLine)) errors.characters = `Keep each name to ${LIMITS.characterName} letters and each description to ${LIMITS.characterLine}.`
  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      title,
      author: author || null,
      genre: genre || null,
      status,
      started: started || null,
      finished: finished || null,
      rating: rating ? Number(rating) : null,
      cover_url: coverText || null,
      review_post_id: reviewText ? postIdFrom(reviewText) : null,
      note: note || null,
      about: about || null,
      year_published: yearPublished ? Number(yearPublished) : null,
      theme_book: i.themeBook === true || i.themeBook === 'true',
      characters,
      review: fullReview || null,
      quote: quote || null,
      quote_page: quotePage || null,
      series_name: seriesName || null,
      series_number: seriesNumber ? Number(seriesNumber) : null,
      series_total: seriesTotal ? Number(seriesTotal) : null,
    },
  }
}

export function cleanGoal(input) {
  const i = input || {}
  const errors = {}
  const year = Number(tidy(i.year))
  const goalText = tidy(i.goal)
  const theme = tidy(i.theme)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.year = 'Write the year, for example 2027.'
  if (goalText && !(/^\d+$/.test(goalText) && Number(goalText) >= 1 && Number(goalText) <= LIMITS.goalMax)) errors.goal = `The goal is a whole number from 1 to ${LIMITS.goalMax}, or empty.`
  if (theme.length > LIMITS.theme) errors.theme = `Keep the theme to ${LIMITS.theme} characters or fewer.`
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { year, goal: goalText ? Number(goalText) : null, theme: theme || null } }
}

// The books read in a year, in the order they were finished (left to right along the shelf)
export const shelfFor = (books, year) =>
  (Array.isArray(books) ? books : [])
    .filter((b) => b && b.status === 'read' && b.finished && String(b.finished).slice(0, 4) === String(year))
    .sort((a, b) => String(a.finished).localeCompare(String(b.finished)) || String(a.created_at || '').localeCompare(String(b.created_at || '')))

// The years that have a shelf, newest first, always including this year
export function yearsOf(books, thisYear) {
  const years = new Set([Number(thisYear)])
  for (const b of Array.isArray(books) ? books : []) if (b && b.status === 'read' && b.finished) years.add(Number(String(b.finished).slice(0, 4)))
  return [...years].filter((y) => Number.isInteger(y)).sort((a, b) => b - a)
}

// "7 of 24 books", with how far along the bar is. With no goal it just counts.
export function progress(count, goal) {
  const n = Math.max(0, Number(count) || 0)
  const g = Number(goal) > 0 ? Number(goal) : null
  return { count: n, goal: g, percent: g ? Math.min(100, Math.round((n / g) * 100)) : null, text: g ? `${n} of ${g} books` : `${n} ${n === 1 ? 'book' : 'books'} read` }
}

// A spine's height class, from the book's id: always the same for the same book, and different between books (h0 to h6)
export function spineClass(id) {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `bc__spine--h${h % 7}`
}

export const starsText = (rating) => (rating >= 1 && rating <= 5 ? `${'\u2605'.repeat(rating)}${'\u2606'.repeat(5 - rating)} (${rating} out of 5)` : '')

// Where a book's own page and the bookshelf live
export const BOOK_CLUB_PATH = '/knowledge-nook/book-club'
export const bookPath = (id) => `${BOOK_CLUB_PATH}/book/${id}`
export const shelfPath = (genre) => `${BOOK_CLUB_PATH}/shelf${genre ? `?genre=${encodeURIComponent(genre)}` : ''}`
