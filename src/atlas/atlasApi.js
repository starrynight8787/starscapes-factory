import { supabase } from '../supabaseClient'
import { cleanAtlas, isCountryCode, earnsFirstChapters } from './atlasRules'

// The Star Atlas, through the two database functions and one small table (sql for these was run in Supabase: atlas_years, member_country, atlas_stamps, get_my_atlas, claim_starter_stamp).
// Each member only ever sees and changes their own. Nothing here reads or logs a name, an email or a reading list.

// Everything the Star Atlas page shows, in one call. Throws a plain error if it cannot be loaded; null from the database (signed out) is also an error here.
export async function fetchMyAtlas() {
  let result
  try {
    result = await supabase.rpc('get_my_atlas')
  } catch (e) {
    throw new Error('We could not load your Star Atlas just now. Please try again in a moment.')
  }
  const { data, error } = result || {}
  const atlas = !error && data ? cleanAtlas(data) : null
  if (!atlas) throw new Error('We could not load your Star Atlas just now. Please try again in a moment.')
  return atlas
}

// Earns one of the three starter stamps: 'joined', 'first-country' or 'first-chapters'. Safe to call twice (the database ignores a stamp already earned).
// Returns true if the database accepted it. Never throws: earning a stamp must never get in the way of anything else.
export async function claimStarterStamp(which) {
  try {
    const { data, error } = await supabase.rpc('claim_starter_stamp', { p_which: which })
    return !error && Boolean(data) && data.ok === true
  } catch (e) {
    return false
  }
}

// Saves the member's country (a two-letter code only) to their own member_country row, then earns the First country stamp. Throws a plain error if it did not save.
export async function saveCountry(code) {
  if (!isCountryCode(code)) throw new Error('Please choose a country from the list.')
  let userId = null
  try {
    const { data } = await supabase.auth.getUser()
    userId = data && data.user ? data.user.id : null
  } catch (e) {
    userId = null
  }
  if (!userId) throw new Error('Please log in again to save your country.')
  let result
  try {
    result = await supabase.from('member_country').upsert({ user_id: userId, country: code, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  } catch (e) {
    throw new Error('That did not save just now. Please try again in a moment.')
  }
  if (!result || result.error) throw new Error('That did not save just now. Please try again in a moment.')
  await claimStarterStamp('first-country')
  return true
}

// Called when a signed-in person opens a post. If the post is chapter 3 of a story, they earn the First three chapters stamp.
// Quiet by design: it never throws, and it asks about a post only once per page load. Chapter rows are public, so this reads no personal detail.
const checked = new Set()
export async function claimFirstChaptersIfChapter(postId) {
  if (!postId || checked.has(postId)) return false
  checked.add(postId)
  try {
    const { data, error } = await supabase.from('story_chapters').select('number').eq('post_id', postId).maybeSingle()
    if (error || !data || !earnsFirstChapters(data.number)) return false
    return await claimStarterStamp('first-chapters')
  } catch (e) {
    return false
  }
}
