import { supabase } from '../supabaseClient'

const plain = (e) => (/row-level security|42501|permission/i.test(String((e && (e.message || e.code)) || '')) ? 'Only the site owner can change the books.' : 'That did not go through just now. Please try again in a moment.')

// The books, newest finished first. A problem comes back as plain words.
export async function fetchBooks() {
  const columns = 'id, title, author, genre, status, started, finished, rating, cover_url, review_post_id, note, created_at'
  const ask = (list) => supabase.from('books').select(list).order('finished', { ascending: false, nullsFirst: false })
  // Ask for the most, then fewer columns if the database has not had its extra steps yet (sql/books-about.sql, sql/book-details.sql), so the page never breaks
  for (const extra of [`, about, ${DETAIL_COLUMNS}`, ', about', '']) {
    const { data, error } = await ask(`${columns}${extra}`)
    if (!error) return Array.isArray(data) ? data : []
    if (!/column|schema cache|does not exist|\b(about|year_published|series_name)\b/i.test(String(error.message || error))) throw new Error(plain(error))
  }
  throw new Error(plain(null))
}

export const DETAIL_COLUMNS = 'year_published, theme_book, characters, review, quote, quote_page, series_name, series_number, series_total'

// Each year's goal and theme: { 2026: { goal: 24, theme: '...' } }. Any trouble means "none set", never a broken page.
export async function fetchGoals() {
  const { data, error } = await supabase.from('reading_goals').select('year, goal, theme')
  if (error) return {}
  const out = {}
  for (const r of data || []) out[r.year] = { goal: r.goal, theme: r.theme }
  return out
}

// ---------- the owner's side (the database only lets the owner's account do any of these) ----------
export async function saveBook(id, value) {
  const { error } = id ? await supabase.from('books').update(value).eq('id', id) : await supabase.from('books').insert(value)
  // A save that includes "about" cannot work until sql/books-about.sql has been run in Supabase: say so plainly rather than a vague failure
  if (error && /\babout\b/i.test(String(error.message || error)) && value && value.about !== undefined) throw new Error('The "about" box needs one small step in Supabase first (run sql/books-about.sql). Nothing was saved.')
  if (error && /year_published|theme_book|characters|review|quote|series_/i.test(String(error.message || error)) && /column|schema cache/i.test(String(error.message || error))) throw new Error('The book page boxes need one small step in Supabase first (run sql/book-details.sql). Nothing was saved.')
  if (error) throw new Error(plain(error))
}

export async function removeBook(id) {
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw new Error(plain(error))
}

export async function saveGoal(value) {
  const { error } = await supabase.from('reading_goals').upsert({ ...value, updated_at: new Date().toISOString() }, { onConflict: 'year' })
  if (error) throw new Error(plain(error))
}

// ---------- comments on a book (Book Club members only: the database decides, so anyone else just gets nothing back) ----------
export async function fetchComments(bookId) {
  const { data, error } = await supabase.from('book_comments').select('id, user_id, author_name, body, created_at').eq('book_id', bookId).order('created_at', { ascending: true })
  if (error) throw new Error('The comments could not load just now. Please try again in a moment.')
  return Array.isArray(data) ? data : []
}

export async function addComment(bookId, authorName, body) {
  const { error } = await supabase.from('book_comments').insert({ book_id: bookId, author_name: authorName, body })
  if (error) throw new Error(/row-level security|42501|permission/i.test(String(error.message || error.code)) ? 'Comments are for Book Club members.' : 'That did not go through just now. Please try again in a moment.')
}

export async function removeComment(id) {
  const { error } = await supabase.from('book_comments').delete().eq('id', id)
  if (error) throw new Error('That did not go through just now. Please try again in a moment.')
}

// Is the signed-in person allowed to read and write comments (an active Book Club pass, or the owner)? Any trouble means "no".
export async function canComment() {
  try {
    const { data, error } = await supabase.rpc('is_book_club_member')
    return !error && data === true
  } catch (e) {
    return false
  }
}
