// The rules behind the "Manage comments" page (/admin/comments): the counts, the filters, and the words about each comment. Nothing here touches the screen or the
// network, so all of it is tested directly.
import { aboutParagraphs } from '../bookclub/bookRules'

export const NEW_DAYS = 7
const DAY = 86400000

const when = (iso) => { const t = Date.parse(iso); return Number.isNaN(t) ? null : t }

export const isNew = (c, nowMs = Date.now()) => { const t = when(c && c.createdAt); return t !== null && nowMs - t >= 0 && nowMs - t < NEW_DAYS * DAY }

export function stats(comments, nowMs = Date.now()) {
  const list = Array.isArray(comments) ? comments : []
  return { total: list.length, recent: list.filter((c) => isNew(c, nowMs)).length, books: new Set(list.map((c) => c.bookId)).size, people: new Set(list.map((c) => String(c.author || '').trim().toLowerCase())).size }
}

// The books that have comments, A to Z, each with how many
export function bookChoices(comments) {
  const by = new Map()
  for (const c of Array.isArray(comments) ? comments : []) {
    const row = by.get(c.bookId) || { id: c.bookId, title: c.bookTitle || 'A book with no title', count: 0 }
    row.count += 1
    by.set(c.bookId, row)
  }
  return [...by.values()].sort((a, b) => a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base' }))
}

// Narrow by book, and by words in the comment, the name of the person, or the book's title (capitals ignored)
export function filterComments(comments, { book = 'all', search = '' } = {}) {
  const q = String(search || '').trim().toLowerCase()
  return (Array.isArray(comments) ? comments : []).filter((c) => {
    if (book !== 'all' && c.bookId !== book) return false
    if (q && ![c.body, c.author, c.bookTitle].some((v) => String(v || '').toLowerCase().includes(q))) return false
    return true
  })
}

// A comment's paragraphs, as the book page shows them (a blank line starts a new one)
export const paragraphsOf = (body) => aboutParagraphs(body)

// "20 October 2026, 21:16", in London time (the day and hour the owner sees)
export function whenText(iso) {
  const t = when(iso)
  if (t === null) return ''
  const d = new Date(t)
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' })
  return `${day}, ${time}`
}
