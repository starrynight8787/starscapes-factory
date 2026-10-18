import { supabase } from '../supabaseClient'
import { GRACE_HOURS } from './homeRules'

// The home page's three extras. A problem with any of them means "nothing to show", never a broken home page.
export async function fetchNextEvent(now = new Date()) {
  const since = new Date(now.getTime() - GRACE_HOURS * 3600 * 1000).toISOString()
  const { data, error } = await supabase.from('events').select('id, title, starts_at, description, link_url').eq('published', true).gte('starts_at', since).order('starts_at', { ascending: true }).limit(1)
  if (error || !Array.isArray(data)) return null
  return data[0] || null
}

export async function fetchFeaturedSlug() {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'featured_room').maybeSingle()
  return error || !data ? '' : data.value || ''
}

export async function fetchLatestPost() {
  const { data, error } = await supabase.from('posts').select('id, title, image_url, channel, created_at').eq('published', true).order('created_at', { ascending: false }).limit(1)
  if (error || !Array.isArray(data)) return null
  return data[0] || null
}

// ---------- the owner's side (the database only lets the owner's account do any of these) ----------
const plain = (e) => (/row-level security|42501|permission/i.test(String((e && (e.message || e.code)) || '')) ? 'Only the site owner can change this.' : 'That did not go through just now. Please try again in a moment.')

export async function listEvents() {
  const { data, error } = await supabase.from('events').select('id, title, starts_at, description, link_url, published').order('starts_at', { ascending: false })
  if (error) throw new Error(plain(error))
  return Array.isArray(data) ? data : []
}
export async function saveEvent(id, value) {
  const { error } = id ? await supabase.from('events').update(value).eq('id', id) : await supabase.from('events').insert(value)
  if (error) throw new Error(plain(error))
}
export async function removeEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(plain(error))
}
export async function saveFeaturedSlug(slug) {
  const { error } = await supabase.from('site_settings').upsert({ key: 'featured_room', value: slug, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(plain(error))
}
