import { supabase } from '../supabaseClient'

// Which doors are open: an object like { 'sarah-jrs-den/blog': true }. A door that is not in it is closed.
export async function fetchDoors() {
  const { data, error } = await supabase.from('doors').select('room,door,open')
  if (error) throw new Error(error.message || 'Could not read the doors.')
  const open = {}
  for (const row of Array.isArray(data) ? data : []) if (row && row.open === true) open[`${row.room}/${row.door}`] = true
  return open
}

// Opens or closes one door. Only the owner's account is allowed to (the database says so), so for anyone else this fails.
export async function saveDoor(room, door, open) {
  const { error } = await supabase.from('doors').upsert({ room, door, open: Boolean(open), updated_at: new Date().toISOString() }, { onConflict: 'room,door' })
  if (error) throw new Error(error.message || 'Could not save that door.')
}
