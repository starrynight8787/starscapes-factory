// The plain rules for the owner's story-round console (Figma: "Admin console", SFW-269). Nothing here talks to the database.
import { BUILT_IN, NAME_BOXES, KINDS, tidyText } from '../stories/round/storyRoundRules'
import { londonToIso } from '../home/homeRules'

export const KIND_NAMES = { full_form: 'Chapter: full form', names_only: 'Chapter: names only', small_vote: 'Chapter: small vote' }
export const STATE_NAMES = { hidden: 'Hidden', open: 'Open', not_yet: 'Opens later', closed: 'Closed' }

// The label the console shows for a chapter: draft, open, closed or archived (a round that has passed its closing date shows as closed even if nobody pressed the button)
export const roundLabel = (round) => (round.status === 'draft' ? 'Draft' : round.status === 'archived' ? 'Archived' : round.state === 'closed' ? 'Closed' : round.state === 'not_yet' ? 'Opens later' : 'Open')

export const blankForm = () => ({
  title: '', kind: 'full_form',
  built: Object.fromEntries(BUILT_IN.map((q) => [q.key, { on: true, nameBox: q.nameBox }])),
  extra: [],
  boxes: Object.fromEntries(NAME_BOXES.map((b) => [b.key, { on: true, slots: 1 }])),
  voteQuestion: 'Which name should we use?', voteOptions: ['', '', ''],
  opensDate: '', opensTime: '09:00', closesDate: '', closesTime: '18:00',
})

export const blankExtra = () => ({ label: '', help: '', type: 'choose_one', optionsText: '', nameBox: false })

const optionsFrom = (text) => String(text || '').split(/\n|,/).map(tidyText).filter(Boolean)

// What the form becomes when the owner presses Save as draft. Returns { ok: true, payload } or { ok: false, message }.
export function buildPayload(form) {
  const title = tidyText(form.title)
  if (!title) return { ok: false, message: 'Please give the chapter a title.' }
  if (!KINDS.includes(form.kind)) return { ok: false, message: 'Please choose what kind of chapter this is.' }
  let opens_at = null
  let closes_at = null
  if (form.opensDate) opens_at = londonToIso(form.opensDate, form.opensTime || '09:00')
  if (form.closesDate) closes_at = londonToIso(form.closesDate, form.closesTime || '18:00')
  if (opens_at && closes_at && new Date(closes_at) <= new Date(opens_at)) return { ok: false, message: 'The chapter must close after it opens.' }
  let questions = []
  if (form.kind === 'full_form') {
    for (const q of BUILT_IN) {
      if (!form.built[q.key] || !form.built[q.key].on) continue
      const item = { label: q.label, help: q.help, type: q.type, options: q.options, name_box: Boolean(form.built[q.key].nameBox) }
      if (q.showIf) {
        const parent = questions.findIndex((x) => x.key === q.showIf.key)
        if (parent >= 0) { item.show_if_index = parent; item.show_if_answers = q.showIf.answers }
      }
      questions.push({ ...item, key: q.key })
    }
    for (const x of form.extra) {
      const label = tidyText(x.label)
      if (!label && !tidyText(x.help) && !tidyText(x.optionsText)) continue
      if (!label) return { ok: false, message: 'One of your own questions has no question written.' }
      const options = x.type === 'choose_one' ? optionsFrom(x.optionsText) : []
      if (x.type === 'choose_one' && options.length < 2) return { ok: false, message: `“${label}” needs at least 2 options.` }
      questions.push({ label, help: tidyText(x.help), type: x.type, options, name_box: x.type === 'choose_one' && Boolean(x.nameBox), name_slots: 1 })
    }
  } else if (form.kind === 'names_only') {
    for (const b of NAME_BOXES) {
      if (!form.boxes[b.key] || !form.boxes[b.key].on) continue
      questions.push({ label: b.label, help: b.help, type: 'name_suggestion', options: [], name_slots: b.slots ? form.boxes[b.key].slots : 1 })
    }
  } else {
    const options = (form.voteOptions || []).map(tidyText).filter(Boolean)
    if (options.length < 2) return { ok: false, message: 'A small vote needs two or three options.' }
    const label = tidyText(form.voteQuestion)
    if (!label) return { ok: false, message: 'Please write the question.' }
    questions = [{ label, help: '', type: 'choose_one', options, name_box: false }]
  }
  if (questions.length === 0) return { ok: false, message: 'Please switch on at least one question.' }
  return { ok: true, payload: { op: 'create', title, kind: form.kind, opens_at, closes_at, questions: questions.map(({ key, ...rest }) => rest) } }
}

// The address Gill sends to members. It is only ever shown to her.
export const memberLink = (origin, token) => `${String(origin || '').replace(/\/+$/, '')}/story-round/${token}`
