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
export const LIMITS = { title: 150, author: 100, note: 300, about: 1000, theme: 120, goalMax: 999 }

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
