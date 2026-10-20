import { supabase } from '../supabaseClient'

// How many times each post has been opened (the post_reads table, see sql/post-reads.sql). Counting never gets in the way of anything: if the table is not
// there yet, or the call fails, nothing happens. Opening the same post again without reloading the page counts once.
const counted = new Set() // kept in memory only (nothing is stored on the visitor's device), so opening the same post again without reloading counts once
export function recordRead(id) {
  if (counted.has(id)) return
  counted.add(id)
  Promise.resolve().then(() => supabase.rpc('record_post_read', { p_id: id })).catch(() => {})
}

// { postId: number of reads } for these posts; an empty object if it cannot be loaded
export async function fetchReads(ids) {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return {}
    const { data, error } = await supabase.from('post_reads').select('post_id, reads').in('post_id', ids)
    if (error || !Array.isArray(data)) return {}
    return Object.fromEntries(data.map((r) => [r.post_id, Number(r.reads) || 0]))
  } catch (e) { return {} }
}

// The post with the most reads (the newest wins a tie); null when nobody has read any yet
export function pickMostRead(posts, reads) {
  let best = null
  for (const p of posts || []) {
    const n = (reads && reads[p.id]) || 0
    if (n <= 0) continue
    if (!best || n > best.n || (n === best.n && String(p.created_at) > String(best.post.created_at))) best = { post: p, n }
  }
  return best ? best.post : null
}
