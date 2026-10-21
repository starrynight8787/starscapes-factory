import { supabase } from '../supabaseClient'
import { SAY } from './memberIcons'

// The signed-in person's own profile, through two database functions (sql/member-profiles.sql). Nobody can read anyone else's.
export async function fetchProfile() {
  let result
  try {
    result = await supabase.rpc('get_my_profile')
  } catch (e) {
    throw new Error(SAY.generic)
  }
  const { data, error } = result || {}
  if (error || !data) throw new Error(SAY.generic)
  return { name: data.name || '', username: data.username || '', icon: data.icon || '', newsletter: data.newsletter || 'none', email: data.email || '' }
}

export async function saveProfile({ name, username, icon, newsletter }) {
  let result
  try {
    result = await supabase.rpc('save_my_profile', { p_name: name || null, p_username: username || null, p_icon: icon || null, p_newsletter: newsletter })
  } catch (e) {
    throw new Error(SAY.generic)
  }
  const { data, error } = result || {}
  if (error || !data) throw new Error(SAY.generic)
  if (data.ok !== true) {
    const err = new Error(SAY[data.error] || SAY.generic)
    if (data.error === 'username_taken' || data.error === 'username_invalid') err.field = 'username'
    if (data.error === 'name_long') err.field = 'name'
    throw err
  }
  return true
}
