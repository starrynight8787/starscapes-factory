import { supabase } from '../supabaseClient'

// Every published post in a room, newest first. Visitors only ever get published posts.
export async function fetchRoomPosts(channel, limit = 200) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, created_at, tags, channel, published, image_url')
    .eq('channel', channel)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
