import { supabase } from '../supabaseClient'
import { ROOM } from './travelRules'

const BASE = 'id, title, created_at, tags, channel, published, image_url'
const TRAVEL = 'country, year_visited, advice_url'

// Every published Explorer's Bay post with its country and year, newest first. If the database has not been given the travel columns yet (sql/travel-posts.sql), the posts still load, with no country.
export async function fetchTravelPosts(limit = 300) {
  const ask = (columns) => supabase.from('posts').select(columns).eq('channel', ROOM).eq('published', true).order('created_at', { ascending: false }).limit(limit)
  let { data, error } = await ask(`${BASE}, ${TRAVEL}`)
  if (error && /country|year_visited|advice_url/i.test(String(error.message || ''))) ({ data, error } = await ask(BASE))
  if (error) throw error
  return data || []
}
