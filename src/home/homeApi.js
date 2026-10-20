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

// ---------- the featured room's picture: the owner can swap the line drawing for her own picture, per room ----------
// The picture is kept in the same storage as post pictures; its address is kept in site_settings as room_picture_<room>. No picture chosen = the line drawing.
const PICTURE_KEY = 'room_picture_'
export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PICTURE_MAX_BYTES = 3 * 1024 * 1024
export async function fetchRoomPictures() {
  const { data, error } = await supabase.from('site_settings').select('key, value').like('key', `${PICTURE_KEY}%`)
  if (error || !Array.isArray(data)) return {}
  const out = {}
  for (const row of data) if (/^https:\/\//.test(row.value || '')) out[String(row.key).slice(PICTURE_KEY.length)] = row.value
  return out
}
export async function saveRoomPicture(slug, file, userId) {
  if (!PICTURE_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG or WebP picture.')
  if (file.size > PICTURE_MAX_BYTES) throw new Error('That picture is over 3 MB. Please choose a smaller one.')
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/room-${slug}-${Date.now()}.${ext}`
  const { error: upError } = await supabase.storage.from('post-images').upload(path, file, { contentType: file.type })
  if (upError) throw new Error(plain(upError))
  const url = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl
  const { error } = await supabase.from('site_settings').upsert({ key: PICTURE_KEY + slug, value: url, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(/check constraint|violates/i.test(String(error.message || '')) ? 'The database needs the room-pictures step first (the SQL in sql/room-pictures.sql).' : plain(error))
  return url
}
export async function removeRoomPicture(slug) {
  const { error } = await supabase.from('site_settings').delete().eq('key', PICTURE_KEY + slug)
  if (error) throw new Error(plain(error))
}
