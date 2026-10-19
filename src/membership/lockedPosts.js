// Posts that belong to a pass. A locked post's WORDS are kept in a separate table (post_bodies), which the database only hands over to the owner, to someone who holds that post's pass, and for the
// first three posts of each pass (see sql/locked-posts.sql). Everything here talks to that table, and every part of it copes if the SQL has not been run yet, so the site never breaks in between.
import { supabase } from '../supabaseClient'
import { PASSES, cleanPassIds } from './passes'

export const PASS_CHOICES = PASSES.map((p) => ({ id: p.id, name: p.name }))
export const passName = (id) => (PASSES.find((p) => p.id === id) || {}).name || ''

// A real pass id, or '' for "free for everyone" (anything else, including nonsense, counts as free)
export const cleanPass = (value) => cleanPassIds([value])[0] || ''

// Did the database send the pass column at all? (A row from a database that has not had the SQL run has no pass key.)
export const hasPassColumn = (row) => Boolean(row) && Object.prototype.hasOwnProperty.call(row, 'pass')

// Has the SQL been run? Used by the New post form to decide whether to offer the Pass choice. Never throws.
export async function canUsePasses() {
  try {
    const { error } = await supabase.from('posts').select('pass').limit(1)
    return !error
  } catch (e) {
    return false
  }
}

// The words of a locked post: the text if this person may read them, or null if the database gave them nothing (they may not). Throws if it could not ask.
export async function loadLockedBody(postId) {
  const { data, error } = await supabase.from('post_bodies').select('content').eq('post_id', postId).maybeSingle()
  if (error) throw new Error(error.message || 'Could not load this post.')
  return data ? String(data.content == null ? '' : data.content) : null
}

// Keeps the words of a locked post (the owner only: the database refuses anyone else)
export async function saveLockedBody(postId, content) {
  const { error } = await supabase.from('post_bodies').upsert({ post_id: postId, content, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Takes the words away again, for a post that has been made free for everyone (the words have already gone back into the post). Best effort: a leftover row is harmless, because the post is no longer locked.
export async function removeLockedBody(postId) {
  try {
    await supabase.from('post_bodies').delete().eq('post_id', postId)
  } catch (e) {
    // nothing to do: see above
  }
}
