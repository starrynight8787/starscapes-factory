import { supabase } from '../supabaseClient'

// Every post the owner can see, newest first. (The pass column is asked for if the database has it, and left out if it does not.) A problem comes back as plain words.
export async function fetchAllPosts(limit = 1000) {
  const ask = (columns) => supabase.from('posts').select(columns).order('created_at', { ascending: false }).limit(limit)
  let { data, error } = await ask('id, title, channel, tags, published, created_at, pass')
  if (error && /\bpass\b/i.test(String(error.message || error))) ({ data, error } = await ask('id, title, channel, tags, published, created_at'))
  if (error) throw new Error('The posts could not load just now. Please try again in a moment.')
  return Array.isArray(data) ? data : []
}
