import { supabase } from '../supabaseClient'

// The channel's latest videos, through this site's own function (so a visitor's browser never contacts YouTube until they press play)
export async function fetchSeries() {
  const response = await fetch('/api/youtube-series')
  const body = await response.json()
  if (!body || !body.ok || !Array.isArray(body.videos)) throw new Error('no videos')
  return body.videos
}

// The video Gill chose to pin ('' if none, or if the database cannot be asked: the page then pins the newest video)
export async function fetchIntroId() {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'youtube_intro').maybeSingle()
  return error || !data ? '' : data.value || ''
}

// ---------- the owner's side (the database only lets the owner's account do either) ----------
const plain = (e) => (/row-level security|42501|permission/i.test(String((e && (e.message || e.code)) || '')) ? 'Only the site owner can change this.' : /check constraint|violates/i.test(String((e && e.message) || '')) ? 'The database is not ready for this yet. Run sql/youtube-intro.sql in Supabase first.' : 'That did not go through just now. Please try again in a moment.')
export async function saveIntroId(id) {
  const { error } = await supabase.from('site_settings').upsert({ key: 'youtube_intro', value: id, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(plain(error))
}
export async function clearIntroId() {
  const { error } = await supabase.from('site_settings').delete().eq('key', 'youtube_intro')
  if (error) throw new Error(plain(error))
}
