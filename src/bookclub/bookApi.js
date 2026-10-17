import { supabase } from '../supabaseClient'

const plain = (e) => (/row-level security|42501|permission/i.test(String((e && (e.message || e.code)) || '')) ? 'Only the site owner can change the books.' : 'That did not go through just now. Please try again in a moment.')

// The books, newest finished first. A problem comes back as plain words.
export async function fetchBooks() {
  const { data, error } = await supabase.from('books').select('id, title, author, genre, status, started, finished, rating, cover_url, review_post_id, note, created_at').order('finished', { ascending: false, nullsFirst: false })
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
