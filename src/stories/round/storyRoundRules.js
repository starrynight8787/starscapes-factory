// The plain rules for the hidden "Let's write a story" rounds (Linear SFW-269). Nothing here talks to the database or the screen, so the website and the
// server (lib/storyRounds.js) use exactly the same rules: which questions a member sees, how they are numbered, what counts as a name suggestion,
// how many a member has left this month, and how the owner's results are worked out.

// Who may take part: the same rule as the story vote (src/stories/votesRules.js): a membership that is active, trialing or past due, with the Come Write With Me pass.
// It is written out here again, because the server cannot load votesRules (that file imports without ".js"); a test checks the two always agree.
export const STORY_PASS = 'come-write-with-me'
const HOLDING = ['active', 'trialing', 'past_due']
export const holdsStoryPass = (row) => Boolean(row) && HOLDING.includes(row.status) && Array.isArray(row.passes) && row.passes.includes(STORY_PASS)

export const MONTHLY_NAMES = 3 // name suggestions each member may send in one UK calendar month, across every round
export const MAX_NAME = 40
export const MAX_ANSWER = 500
export const MAX_TITLE = 120
export const MAX_LABEL = 200
export const MAX_QUESTIONS = 60
export const MAX_OPTIONS = 8
export const KINDS = ['full_form', 'names_only', 'small_vote']
export const STATUSES = ['draft', 'open', 'closed', 'archived']
export const TOKEN_RE = /^[0-9a-f]{64}$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const YES_COUNTS = ['1 side kick', '2 side kicks', '3 side kicks']
export const LONE_WOLF = 'No, a lone wolf'

const tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
export const tidyText = tidy

// ---------- the questions Gill can switch on or off when she makes a round (Figma: "Create a round") ----------
// `key` is only used while making a round; the database stores each question as its own row, so Gill may add as many of her own as she likes.
export const BUILT_IN = [
  { key: 'genre', label: 'Genre', help: 'What kind of story should it be?', type: 'choose_one', options: ['Fantasy', 'Science fiction', 'Mystery', 'Adventure'], nameBox: false },
  { key: 'main', label: 'Main character', help: 'Who is the story about?', type: 'choose_one', options: ['A shy inventor', 'A runaway apprentice', 'A retired spy'], nameBox: true },
  { key: 'start', label: 'Where the story starts', help: 'Where does chapter one open?', type: 'choose_one', options: ['A floating market', 'A lighthouse on a cliff', 'A night train'], nameBox: true },
  { key: 'count', label: 'Should the hero have side kicks?', help: 'Choose one.', type: 'choose_one', options: [{ label: LONE_WOLF }, ...YES_COUNTS.map((label) => ({ label, group: 'Yes' }))], nameBox: false, decides: true },
  { key: 'sidekicks', label: 'Side kicks', help: 'What are the side kicks like?', type: 'choose_one', options: ['A loyal best friend', 'A cheeky younger sibling', 'A wise old mentor'], nameBox: false, showIf: { key: 'count', answers: YES_COUNTS } },
  { key: 'love', label: 'Love interest', help: 'Who does our hero fall for?', type: 'choose_one', options: ['The rival', 'A stranger from the sea', 'An old friend'], nameBox: true },
  { key: 'villain', label: 'Villain', help: 'Who stands in their way?', type: 'choose_one', options: ['A charming mayor', 'A ghost with a grudge', 'A rival writer'], nameBox: true },
  { key: 'henchman', label: 'Henchman', help: 'Who does the villain’s dirty work?', type: 'choose_one', options: ['A nervous bodyguard', 'A talking raven', 'A clockwork butler'], nameBox: true },
  { key: 'weapons', label: 'Weapons', help: 'What do they fight with?', type: 'choose_one', options: ['Words and wit', 'A sword with a secret', 'Gadgets and traps'], nameBox: false },
  { key: 'era', label: 'Era', help: 'When is it set?', type: 'choose_one', options: ['Long ago', 'Right now', 'Far in the future'], nameBox: false },
]

// The name boxes of a names-only round (Figma: "Names-only round"): one box for each character, and up to three for the side kicks
export const NAME_BOXES = [
  { key: 'main', label: 'Main character', help: 'Suggest a name for the main character.' },
  { key: 'start', label: 'Where the story starts', help: 'Suggest a name for the place.' },
  { key: 'sidekicks', label: 'Side kicks', help: 'Suggest a name for each side kick.', slots: true },
  { key: 'love', label: 'Love interest', help: 'Suggest a name for the love interest.' },
  { key: 'villain', label: 'Villain', help: 'Suggest a name for the villain.' },
  { key: 'henchman', label: 'Henchman', help: 'Suggest a name for the henchman.' },
]

const optionLabel = (o) => (o && typeof o === 'object' ? tidy(o.label) : tidy(o))

// ---------- cleaning what the owner types into the round builder (used by the server, and by the page before it asks) ----------
export function cleanQuestion(q, index = 0) {
  const label = tidy(q && q.label).slice(0, MAX_LABEL)
  const type = ['choose_one', 'free_text', 'name_suggestion'].includes(q && q.type) ? q.type : ''
  if (!label) return { ok: false, message: `Question ${index + 1} needs a question.` }
  if (!type) return { ok: false, message: `Question ${index + 1} needs a kind of box.` }
  let options = []
  if (type === 'choose_one') {
    const raw = Array.isArray(q.options) ? q.options : []
    options = raw
      .map((o) => (o && typeof o === 'object' ? { label: tidy(o.label).slice(0, 160), ...(tidy(o.group) ? { group: tidy(o.group).slice(0, 40) } : {}) } : { label: tidy(o).slice(0, 160) }))
      .filter((o) => o.label)
    if (options.length < 2) return { ok: false, message: `“${label}” needs at least 2 options.` }
    if (options.length > MAX_OPTIONS) return { ok: false, message: `“${label}” can have up to ${MAX_OPTIONS} options.` }
    const labels = options.map((o) => o.label.toLowerCase())
    if (new Set(labels).size !== labels.length) return { ok: false, message: `“${label}” has the same option twice.` }
  }
  const slots = Math.min(3, Math.max(1, Number(q.name_slots || q.nameSlots) || 1))
  const showAnswers = Array.isArray(q.show_if_answers) ? q.show_if_answers.map(tidy).filter(Boolean).slice(0, MAX_OPTIONS) : []
  return {
    ok: true,
    value: {
      label,
      help_text: tidy(q.help_text || q.help).slice(0, 300) || null,
      type,
      options,
      name_box: type === 'choose_one' && Boolean(q.name_box || q.nameBox),
      name_slots: type === 'name_suggestion' ? slots : 1,
      show_if_index: Number.isInteger(q.show_if_index) && q.show_if_index >= 0 && q.show_if_index < index ? q.show_if_index : null,
      show_if_answers: Number.isInteger(q.show_if_index) && showAnswers.length > 0 ? showAnswers : null,
    },
  }
}

// ---------- which questions a member sees ----------
// A question that depends on another (the side kicks) shows only once the other has the right answer. Anything else always shows.
export function isShown(question, questions, answers) {
  if (!question || !question.show_if_question_id) return true
  const parent = (questions || []).find((q) => q.id === question.show_if_question_id)
  if (!parent) return true
  const given = answers && answers[parent.id]
  const wanted = Array.isArray(question.show_if_answers) ? question.show_if_answers : []
  return Boolean(given) && wanted.includes(given)
}

// The questions on the page right now, each with its number: the numbers never skip, and the total goes down by one when a question is hidden ("Question 4 of 9").
export function visibleQuestions(questions, answers) {
  const list = (questions || []).filter((q) => isShown(q, questions, answers))
  return list.map((q, i) => ({ ...q, number: i + 1, total: list.length }))
}

// "2 side kicks" -> 2, "1 side kick" -> 1, a lone wolf or anything else -> 0
export const sideKickCount = (answer) => {
  const m = /^([123]) side kicks?$/.exec(tidy(answer))
  return m ? Number(m[1]) : 0
}

// How many name boxes a question has: none, one, or (for a names-only question) up to three
export const nameBoxCount = (question) => (!question ? 0 : question.type === 'name_suggestion' ? Math.min(3, Math.max(1, Number(question.name_slots) || 1)) : question.name_box ? 1 : 0)

export const cleanName = (v) => tidy(v).slice(0, MAX_NAME + 1)

// The names a member filled in, from { questionId: [text, text] }, kept only for questions that are on the page and have that many boxes. Blank boxes are ignored.
export function namesFrom(questions, answers, rawNames) {
  const out = []
  for (const q of visibleQuestions(questions, answers)) {
    const boxes = nameBoxCount(q)
    const given = rawNames && Array.isArray(rawNames[q.id]) ? rawNames[q.id] : []
    given.slice(0, boxes).forEach((text, i) => {
      const name = cleanName(text)
      if (name) out.push({ question_id: q.id, slot: i + 1, name, label: q.label })
    })
  }
  return out
}

// The sentence above the Send button: "You are sending 3 names. You will have 0 suggestions left this month."
export function nameSummary(sending, left) {
  const after = Math.max(0, left - sending)
  if (sending === 0) return `You are not sending any names. You will still have ${left} ${left === 1 ? 'suggestion' : 'suggestions'} left this month.`
  return `You are sending ${sending} ${sending === 1 ? 'name' : 'names'}. You will have ${after} ${after === 1 ? 'suggestion' : 'suggestions'} left this month.`
}

// ---------- checking a whole submission ----------
// Returns { ok: true, answers: [{ question_id, answer }], names: [{ question_id, slot, name }] } or { ok: false, message, field }.
// Skipping a question is allowed. Sending nothing at all is not.
export function checkSubmission(questions, body) {
  const given = body && typeof body.answers === 'object' && body.answers ? body.answers : {}
  const byId = new Map((questions || []).map((q) => [q.id, q]))
  const answers = {}
  for (const [id, raw] of Object.entries(given)) {
    const q = byId.get(id)
    if (!q) return { ok: false, message: 'That did not look right. Please refresh the page and try again.' }
    const text = tidy(raw)
    if (!text) continue
    if (q.type === 'name_suggestion') return { ok: false, message: 'That did not look right. Please refresh the page and try again.' }
    if (q.type === 'choose_one') {
      if (!(Array.isArray(q.options) ? q.options : []).map(optionLabel).includes(text)) return { ok: false, message: `Please pick one of the choices for “${q.label}”.`, field: id }
    } else if (text.length > MAX_ANSWER) return { ok: false, message: `“${q.label}” is too long. Please keep it under ${MAX_ANSWER} letters.`, field: id }
    answers[id] = text
  }
  const shown = new Set(visibleQuestions(questions, answers).map((q) => q.id))
  for (const id of Object.keys(answers)) if (!shown.has(id)) delete answers[id] // an answer to a question that is no longer shown is dropped
  const rawNames = body && typeof body.names === 'object' && body.names ? body.names : {}
  for (const [id, list] of Object.entries(rawNames)) {
    if (!byId.has(id) || !Array.isArray(list)) return { ok: false, message: 'That did not look right. Please refresh the page and try again.' }
  }
  const names = namesFrom(questions, answers, rawNames)
  const tooLong = names.find((n) => n.name.length > MAX_NAME)
  if (tooLong) return { ok: false, message: `A name can have up to ${MAX_NAME} letters. Please make “${tooLong.name.slice(0, 20)}…” shorter.`, field: tooLong.question_id }
  if (Object.keys(answers).length === 0 && names.length === 0) return { ok: false, message: 'Please answer at least one question before you send.' }
  return { ok: true, answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer })), names }
}

// ---------- the clock ----------
// The first day of this month in London, as 2026-10-01. Name suggestions are counted per UK calendar month, so the count starts again on the 1st at midnight London time.
export function monthStartLondon(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' }).formatToParts(date)
  const get = (t) => (parts.find((p) => p.type === t) || {}).value
  return `${get('year')}-${get('month')}-01`
}

// What a member can do with a round right now. `status` is the button Gill pressed; the dates open and close it by themselves.
export function roundState(round, now = Date.now()) {
  if (!round) return 'missing'
  if (round.status === 'draft' || round.status === 'archived') return 'hidden'
  if (round.status === 'closed') return 'closed'
  const closes = round.closes_at ? new Date(round.closes_at).getTime() : null
  const opens = round.opens_at ? new Date(round.opens_at).getTime() : null
  if (closes !== null && Number.isFinite(closes) && closes <= now) return 'closed'
  if (opens !== null && Number.isFinite(opens) && opens > now) return 'not_yet'
  return 'open'
}

// ---------- the owner's results ----------
// Counts for one choose-one question: each option with how many members chose it, and the one that is on its own at the top (a tie means nobody is ahead yet)
export function tallyQuestion(question, responses) {
  const options = (Array.isArray(question.options) ? question.options : []).map(optionLabel)
  const mine = (responses || []).filter((r) => r.question_id === question.id)
  const rows = options.map((label, i) => ({ label, letter: 'ABCDEFGH'[i] || '', votes: mine.filter((r) => r.answer === label).length }))
  const total = rows.reduce((s, r) => s + r.votes, 0)
  const most = Math.max(0, ...rows.map((r) => r.votes))
  const leaders = rows.filter((r) => r.votes === most && most > 0)
  return { total, rows: rows.map((r) => ({ ...r, percent: total ? Math.round((r.votes / total) * 100) : 0, popular: leaders.length === 1 && r.votes === most })), leader: leaders.length === 1 ? leaders[0].label : null }
}

// The same name typed twice (any capitals) counts as one name suggested twice
export function groupNames(rows) {
  const map = new Map()
  for (const r of rows || []) {
    if (!r.name) continue
    const key = `${r.question_id}|${r.name.toLowerCase()}`
    const g = map.get(key) || { question_id: r.question_id, name: r.name, ids: [], times: 0, reports: 0, hidden: true }
    g.ids.push(r.id)
    g.times += 1
    g.reports += Number(r.reports) || 0
    g.hidden = g.hidden && Boolean(r.hidden)
    map.set(key, g)
  }
  return [...map.values()]
}
