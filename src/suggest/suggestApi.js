import { supabase } from '../supabaseClient'
import { plainProblem } from './suggestRules'

// Everything the "suggest and vote" box asks the database. Every problem comes back as plain words (never the database's own message).

// Is this space switched on? Any trouble means "no": a box that cannot be read is hidden, not broken.
export async function fetchSpaceOn(space) {
  try {
    const { data, error } = await supabase.from('suggestion_spaces').select('enabled').eq('space', space).maybeSingle()
    return !error && Boolean(data) && data.enabled === true
  } catch (e) {
    return false
  }
}

// The suggestions you have approved (and chosen), with their totals, and which ones this person has voted for.
export async function fetchSuggestions(space, userId) {
  const { data, error } = await supabase
    .from('suggestions')
    .select('id, kind, title, why, status, created_at')
    .eq('space', space)
    .in('status', ['approved', 'chosen'])
    .order('created_at', { ascending: true })
  if (error) throw new Error(plainProblem(error))
  const rows = Array.isArray(data) ? data : []
  const tally = {}
  const mine = new Set()
  if (rows.length) {
    const ids = rows.map((r) => r.id)
    const totals = await supabase.from('suggestion_tally').select('suggestion_id, votes').in('suggestion_id', ids)
    if (!totals.error) for (const t of totals.data || []) tally[t.suggestion_id] = t.votes
    if (userId) {
      const votes = await supabase.from('suggestion_votes').select('suggestion_id').eq('user_id', userId).in('suggestion_id', ids)
      if (!votes.error) for (const v of votes.data || []) mine.add(v.suggestion_id)
    }
  }
  return { rows, tally, mine }
}

// A new suggestion starts as "pending": only its writer and the owner can see it until the owner approves it.
export async function addSuggestion(user, value) {
  const { error } = await supabase.from('suggestions').insert({ space: value.space, kind: value.kind, title: value.title, why: value.why, user_id: user.id, status: 'pending' })
  if (error) throw new Error(plainProblem(error))
}

export async function setVote(user, suggestionId, on) {
  const request = on
    ? supabase.from('suggestion_votes').insert({ suggestion_id: suggestionId, user_id: user.id })
    : supabase.from('suggestion_votes').delete().eq('suggestion_id', suggestionId).eq('user_id', user.id)
  const { error } = await request
  if (error) throw new Error(plainProblem(error))
}

// ---------- the owner's side (the database only lets the owner's account do any of these) ----------
export async function fetchSpaces() {
  const { data, error } = await supabase.from('suggestion_spaces').select('space, enabled')
  if (error) throw new Error(plainProblem(error))
  const on = {}
  for (const row of data || []) on[row.space] = row.enabled === true
  return on
}

export async function setSpaceOn(space, enabled) {
  const { error } = await supabase.from('suggestion_spaces').upsert({ space, enabled: Boolean(enabled), updated_at: new Date().toISOString() }, { onConflict: 'space' })
  if (error) throw new Error(plainProblem(error))
}

export async function fetchAllForOwner() {
  const { data, error } = await supabase.from('suggestions').select('id, space, kind, title, why, status, created_at').order('created_at', { ascending: false })
  if (error) throw new Error(plainProblem(error))
  const rows = Array.isArray(data) ? data : []
  const tally = {}
  if (rows.length) {
    const totals = await supabase.from('suggestion_tally').select('suggestion_id, votes').in('suggestion_id', rows.map((r) => r.id))
    if (!totals.error) for (const t of totals.data || []) tally[t.suggestion_id] = t.votes
  }
  return { rows, tally }
}

export async function setStatus(id, status) {
  const { error } = await supabase.from('suggestions').update({ status }).eq('id', id)
  if (error) throw new Error(plainProblem(error))
}

export async function removeSuggestion(id) {
  const { error } = await supabase.from('suggestions').delete().eq('id', id)
  if (error) throw new Error(plainProblem(error))
}
