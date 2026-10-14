import { supabase } from '../supabaseClient'
import { FACTORY } from './factoryData'

// Every published post in this room, newest first.
export async function fetchFactoryPosts(limit = 200) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, created_at, tags, channel, published')
    .eq('channel', FACTORY.channel)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
