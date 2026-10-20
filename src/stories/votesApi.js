import { supabase } from '../supabaseClient'

const plain = (e) => (/row-level security|42501|permission/i.test(String((e && (e.message || e.code)) || '')) ? 'Only the site owner can change the votes.' : 'That did not go through just now. Please try again in a moment.')
const used = (e) => /duplicate|unique|23505/i.test(String((e && (e.message || e.code)) || ''))

// Every vote and every choice (both are public). Trouble comes back as plain words.
export async function fetchVotes() {
  const [votes, options] = await Promise.all([
    supabase.from('story_votes').select('id, story_id, after_chapter, question, closes_at, chosen_option_id, created_at').order('after_chapter', { ascending: false }),
    supabase.from('story_vote_options').select('id, vote_id, position, label').order('position', { ascending: true }),
  ])
  if (votes.error) throw new Error(plain(votes.error))
  if (options.error) throw new Error(plain(options.error))
  return { votes: Array.isArray(votes.data) ? votes.data : [], options: Array.isArray(options.data) ? options.data : [] }
}

// The numbers, as the database chooses to hand them over: nothing at all unless the vote has closed, or the person asking has voted in it, or it is the owner. Never throws.
export async function fetchResults(voteId) {
  try {
    const { data, error } = await supabase.rpc('vote_results', { p_vote_id: voteId })
    return !error && Array.isArray(data) ? data : []
  } catch (e) {
    return []
  }
}

// Which choice this person voted for, or null. Never throws (the box then treats them as not having voted).
export async function fetchMyBallot(voteId, userId) {
  try {
    const { data, error } = await supabase.from('story_ballots').select('option_id').eq('vote_id', voteId).eq('user_id', userId).maybeSingle()
    return !error && data ? data.option_id : null
  } catch (e) {
    return null
  }
}

// Casts a vote, or changes it (one vote each: saving again replaces it). The database only lets a member do this, for themselves, while the vote is open.
export async function castVote({ voteId, userId, optionId }) {
  const { error } = await supabase.from('story_ballots').upsert({ vote_id: voteId, user_id: userId, option_id: optionId, updated_at: new Date().toISOString() }, { onConflict: 'vote_id,user_id' })
  if (error) throw new Error(/row-level security|42501|permission/i.test(String(error.message || error.code || '')) ? 'Voting is for members, and only while the vote is open.' : 'That did not go through just now. Please try again in a moment.')
}

// ---------- the owner's side (the database only lets the owner's account do any of these) ----------
export async function saveVote(vote, labels) {
  const { data, error } = await supabase.from('story_votes').insert(vote).select('id').single()
  if (error) throw new Error(used(error) ? 'There is already a vote after that chapter of that story.' : plain(error))
  const rows = labels.map((label, i) => ({ vote_id: data.id, position: i + 1, label }))
  const made = await supabase.from('story_vote_options').insert(rows)
  if (made.error) {
    await supabase.from('story_votes').delete().eq('id', data.id) // no half-made vote is left behind
    throw new Error(plain(made.error))
  }
}

export async function closeVoteNow(id) {
  const { error } = await supabase.from('story_votes').update({ closes_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(plain(error))
}

export async function chooseWinner(id, optionId) {
  const { error } = await supabase.from('story_votes').update({ chosen_option_id: optionId || null }).eq('id', id)
  if (error) throw new Error(plain(error))
}

export async function removeVote(id) {
  const { error } = await supabase.from('story_votes').delete().eq('id', id)
  if (error) throw new Error(plain(error))
}
