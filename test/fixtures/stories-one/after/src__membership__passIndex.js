// Which posts belong to a pass, found ONCE for the whole visit and remembered, so every list can show a small "Blueprints pass" chip without each asking separately.
// Only public facts are used (a post's id, its pass, when it was made, whether it is published: titles and dates are public anyway). The first three published posts of each pass (the three
// oldest) are the free ones, the same rule the database uses to decide who may read them (sql/locked-posts.sql), so the chip can say "free to read" for exactly those.
import { supabase } from '../supabaseClient'
import { cleanPass } from './lockedPosts'
import { FREE_CHAPTERS } from '../stories/storiesRules'

export const FREE_SAMPLE = 3

let loading = null

// Which posts are chapters of a story, and which chapter: a story's chapters 1 to 3 are free, and chapters do not use up the pass's other free places (the same rule as the database, sql/stories.sql).
// If this cannot be found there are simply no chapters, never a broken page.
async function fetchChapterNumbers() {
  try {
    const result = await supabase.from('story_chapters').select('post_id, number')
    const rows = result && Array.isArray(result.data) ? result.data : []
    return new Map(rows.filter((r) => r && r.post_id && Number.isInteger(r.number)).map((r) => [r.post_id, r.number]))
  } catch (e) {
    return new Map()
  }
}

async function fetchIndex() {
  const [{ data, error }, chapters] = await Promise.all([supabase.from('posts').select('id, pass, created_at, published').not('pass', 'is', null), fetchChapterNumbers()])
  if (error || !Array.isArray(data)) return new Map()
  const byPass = new Map()
  for (const row of data) {
    const pass = cleanPass(row.pass)
    if (!pass || !row.id) continue
    if (!byPass.has(pass)) byPass.set(pass, [])
    byPass.get(pass).push(row)
  }
  const index = new Map()
  for (const [pass, rows] of byPass) {
    // the free ones: the oldest published posts of this pass (oldest first, then by id, exactly as the database orders them)
    const free = new Set(
      rows
        .filter((r) => r.published !== false && !chapters.has(r.id))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))
        .slice(0, FREE_SAMPLE)
        .map((r) => r.id),
    )
    for (const r of rows) index.set(r.id, { pass, free: chapters.has(r.id) ? chapters.get(r.id) <= FREE_CHAPTERS : free.has(r.id) })
  }
  return index
}

// The index (a Map of post id to { pass, free }). One request, remembered. Never throws: if it cannot be found there are simply no chips.
export function loadPassIndex() {
  if (!loading) loading = fetchIndex().catch(() => new Map())
  return loading
}

// Forget it, so the next list asks again (after a post is given a pass, or made free)
export function resetPassIndex() {
  loading = null
}
