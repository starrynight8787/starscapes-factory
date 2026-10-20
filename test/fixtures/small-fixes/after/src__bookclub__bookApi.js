import { supabase } from '../supabaseClient'

const plain = (e) => (/row-level security|42501|permission/i.test(String((e && (e.message || e.code)) || '')) ? 'Only the site owner can change the books.' : 'That did not go through just now. Please try again in a moment.')

// The books, newest finished first. A problem comes back as plain words.
export async function fetchBooks() {
  const columns = 'id, title, author, genre, status, started, finished, rating, cover_url, review_post_id, note, created_at'
  const ask = (list) => supabase.from('books').select(list).order('finished', { ascending: false, nullsFirst: false })
  let { data, error } = await ask(`${columns}, about`)
  // Before the "about" column has been added to the database (sql/books-about.sql), asking for it fails: ask again without it, so the page never breaks
  if (error && /\babout\b/i.test(String(error.message || error))) ({ data, error } = await ask(columns))
  if (error) throw new Error(plain(error))
  return Array.isArray(data) ? data : []
}

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
