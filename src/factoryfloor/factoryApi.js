import { supabase } from '../supabaseClient'
import { FACTORY } from './factoryData'

// Every published post in this room, newest first.
// If the database has not been given the pinned_in column yet (sql/pinned-posts.sql), ask again without it,
// so the Factory Floor still works, just with nothing pinned.
export async function fetchFactoryPosts(limit = 200) {
  const ask = (columns) =>
    supabase
      .from('posts')
      .select(columns)
      .eq('channel', FACTORY.channel)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(limit)
  let { data, error } = await ask('id, title, created_at, tags, channel, published, pinned_in')
  if (error && /pinned_in/i.test(String(error.message || error))) {
    ;({ data, error } = await ask('id, title, created_at, tags, channel, published'))
  }
  if (error) throw error
  return data || []
}
