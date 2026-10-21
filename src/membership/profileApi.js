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

// Asks to change the email they log in with. Supabase emails a link to the new address (and may also email the current one); the login email only changes once the link is pressed.
// A refusal never says whether the address already belongs to someone, so this cannot be used to find out who has an account.
export async function changeEmail(newEmail) {
  let result
  try {
    result = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: `${window.location.origin}/membership/passes` })
  } catch (e) {
    throw new Error(SAY.generic)
  }
  const { error } = result || {}
  if (error) throw new Error(/rate|too many|seconds|after/i.test(error.message || '') ? SAY.email_wait : SAY.email_failed)
  return true
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
