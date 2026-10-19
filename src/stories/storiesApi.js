import { supabase } from '../supabaseClient'

const plain = (e) => (/row-level security|42501|permission/i.test(String((e && (e.message || e.code)) || '')) ? 'Only the site owner can change the stories.' : 'That did not go through just now. Please try again in a moment.')

// Every story, newest first. Trouble comes back as plain words.
export async function fetchStories() {
  const { data, error } = await supabase.from('stories').select('id, slug, title, teaser, picture_url, status, finished_on, created_at').order('created_at', { ascending: false })
  if (error) throw new Error(plain(error))
  return Array.isArray(data) ? data : []
}

// Which post is which chapter of which story
export async function fetchChapterRows() {
  const { data, error } = await supabase.from('story_chapters').select('story_id, number, post_id').order('number', { ascending: true })
  if (error) throw new Error(plain(error))
  return Array.isArray(data) ? data : []
}

// The public details of those posts (their words are not asked for: they are protected). Posts nobody may see simply do not come back.
export async function fetchChapterPosts(ids) {
  const list = (Array.isArray(ids) ? ids : []).filter(Boolean)
  if (list.length === 0) return []
  const { data, error } = await supabase.from('posts').select('id, title, image_url, created_at').in('id', list)
  if (error) throw new Error(plain(error))
  return Array.isArray(data) ? data : []
}

// ---------- the owner's side (the database only lets the owner's account do any of these) ----------
export async function saveStory(id, value) {
  const { error } = id ? await supabase.from('stories').update(value).eq('id', id) : await supabase.from('stories').insert(value)
  if (error) throw new Error(/duplicate|unique|23505/i.test(String(error.message || error.code || '')) ? 'There is already a story with that address name. Change the address name and try again.' : plain(error))
}

export async function removeStory(id) {
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) throw new Error(plain(error))
}

export async function saveChapter(value) {
  const { error } = await supabase.from('story_chapters').upsert(value, { onConflict: 'story_id,number' })
  if (error) throw new Error(/duplicate|unique|23505/i.test(String(error.message || error.code || '')) ? 'That post is already a chapter of a story. Remove it from there first.' : /foreign key|23503/i.test(String(error.message || error.code || '')) ? 'There is no post with that address.' : plain(error))
}

export async function removeChapter(storyId, number) {
  const { error } = await supabase.from('story_chapters').delete().eq('story_id', storyId).eq('number', number)
  if (error) throw new Error(plain(error))
}
