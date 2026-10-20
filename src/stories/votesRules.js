// The plain rules for the story vote: who may vote, which of the four states the vote box is in, how the results are worked out, and how the owner's form is checked.
// Nothing here talks to the database.
import { UUID } from './storiesRules'

export const STORY_PASS = 'come-write-with-me'
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
export const LIMITS = { question: 120, option: 160 }
export const DEFAULT_QUESTION = 'What happens next?'
const HOLDING = ['active', 'trialing', 'past_due']

const tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()

// Does this membership row hold the Come Write With Me pass? (The same rule as the database: active, trialing or past due, and the pass in the list.)
export const holdsStoryPass = (row) => Boolean(row) && HOLDING.includes(row.status) && Array.isArray(row.passes) && row.passes.includes(STORY_PASS)

export const isOpen = (vote, nowMs = Date.now()) => {
  const t = new Date(vote && vote.closes_at).getTime()
  return Number.isFinite(t) && t > nowMs
}

// The four states of the vote box (Figma: "The vote box in each state"):
//   'closed'  the vote has closed: where the story went
//   'visitor' open, and the person is signed out or does not hold the pass: the choices show, but only members can vote
//   'member'  open, a member who has not voted yet (or who is changing their vote)
//   'voted'   open, a member who has voted: the results, with their own choice marked
export function voteState({ vote, nowMs = Date.now(), signedIn, member, myOption }) {
  if (!vote || !isOpen(vote, nowMs)) return 'closed'
  if (!signedIn || !member) return 'visitor'
  return myOption ? 'voted' : 'member'
}

// The choices of one vote, in order
export const optionsOf = (vote, options) => (vote && Array.isArray(options) ? options.filter((o) => o && o.vote_id === vote.id).sort((a, b) => a.position - b.position) : [])

// The results: each choice with its letter, its number of votes and its share, and the total. A share is a whole per cent; `step` is that per cent to the nearest 5 (for the bar's width class).
export function tally(options, rows) {
  const counts = new Map((Array.isArray(rows) ? rows : []).filter((r) => r && r.option_id).map((r) => [r.option_id, Math.max(0, Number(r.votes) || 0)]))
  const list = Array.isArray(options) ? options : []
  const total = list.reduce((sum, o) => sum + (counts.get(o.id) || 0), 0)
  return {
    total,
    rows: list.map((o) => {
      const votes = counts.get(o.id) || 0
      const percent = total > 0 ? Math.round((votes / total) * 100) : 0
      return { id: o.id, letter: LETTERS[o.position - 1] || '', label: o.label, votes, percent, step: Math.min(100, Math.round(percent / 5) * 5) }
    }),
  }
}

// Which choice won: the one the owner picked, if she picked one; otherwise the one with the most votes, as long as it is on its own at the top (a tie, or no votes, means nobody has won yet)
export function chosenId(vote, tallied) {
  const rows = (tallied && tallied.rows) || []
  if (vote && vote.chosen_option_id && rows.some((r) => r.id === vote.chosen_option_id)) return vote.chosen_option_id
  const most = Math.max(0, ...rows.map((r) => r.votes))
  if (most <= 0) return null
  const leaders = rows.filter((r) => r.votes === most)
  return leaders.length === 1 ? leaders[0].id : null
}

// The vote the page shows for a story: the one that is open (the latest chapter's, if more than one), otherwise the most recent one that has closed
export function currentVote(votes, storyId, nowMs = Date.now()) {
  const mine = (Array.isArray(votes) ? votes : []).filter((v) => v && v.story_id === storyId).sort((a, b) => b.after_chapter - a.after_chapter)
  return mine.find((v) => isOpen(v, nowMs)) || mine[0] || null
}

// A closing time as people say it: "31 Oct 2026" (in London time)
export function closesText(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
}

// Checks one new vote before it is saved. input: { story, after, question, closes, options: [text, ...] }. closes is a date and time such as 2026-10-31T23:59 (or just a date, which means the end of that day).
// Returns { ok: true, value: { vote, labels } } or { ok: false, errors } with plain words for each problem.
export function cleanVote(input, nowMs = Date.now()) {
  const i = input || {}
  const errors = {}
  const story = tidy(i.story)
  if (!UUID.test(story)) errors.story = 'Choose the story this vote is for.'
  const after = Number(tidy(i.after))
  if (!Number.isInteger(after) || after < 1 || after > 200) errors.after = 'Say which chapter the vote comes after, from 1 to 200.'
  const question = tidy(i.question) || DEFAULT_QUESTION
  if (question.length > LIMITS.question) errors.question = `Keep the question to ${LIMITS.question} letters or fewer.`
  let closes = tidy(i.closes)
  if (/^\d{4}-\d{2}-\d{2}$/.test(closes)) closes = `${closes}T23:59`
  const when = closes ? new Date(closes) : null
  if (!when || Number.isNaN(when.getTime())) errors.closes = 'Say when the voting closes, for example 2026-10-31 23:59.'
  else if (when.getTime() <= nowMs) errors.closes = 'Choose a time that is still to come.'
  const labels = (Array.isArray(i.options) ? i.options : []).map(tidy).filter(Boolean)
  const lower = labels.map((l) => l.toLowerCase())
  if (labels.length < MIN_OPTIONS) errors.options = `Give at least ${MIN_OPTIONS} choices.`
  else if (labels.length > MAX_OPTIONS) errors.options = `No more than ${MAX_OPTIONS} choices.`
  else if (labels.some((l) => l.length > LIMITS.option)) errors.options = `Keep each choice to ${LIMITS.option} letters or fewer.`
  else if (new Set(lower).size !== lower.length) errors.options = 'Two of the choices are the same. Make each one different.'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { vote: { story_id: story, after_chapter: after, question, closes_at: when.toISOString() }, labels } }
}
