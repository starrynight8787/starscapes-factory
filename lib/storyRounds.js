// The server side of the hidden "Let's write a story" rounds (Linear SFW-269). Handled here, not in a function of its own, because the free Vercel plan allows
// 12 functions and all 12 are used: api/membership-checkout.js hands anything with ?story=... to this file, like ?admin=... and ?account=...
//
//   MEMBERS (signed in, with the Come Write With Me pass)
//     GET  ?story=round&token=...   the round behind a hidden link: the questions, or a plain message if it is closed, not open yet, or already answered
//     POST ?story=submit            one final answer for each question, and any name suggestions (3 a month, enforced by the database too)
//     POST ?story=report            "report this name" on a name in a small vote
//   THE OWNER (Gill's sign-in only, checked before anything is read)
//     GET  ?story=admin             every round, with counts
//     GET  ?story=admin_results&id= the results of one round: counts for every question and every name suggested (never who suggested it)
//     POST ?story=admin             make a round, open/close/archive it, change its dates, reset it, delete an empty one, hide a name, make a shortlist vote
//
// The tables have no public access at all: only this file (with the server key) reads or writes them. A member's account id is only ever used here, to find their own
// rows. It is never sent to the browser, and the owner's screens never show who said what.
import { requireOwner, sendDenied } from './ownerGuard.js'
import { requireUser } from './userGuard.js'
import { serviceFetch, saidWhat } from './serviceKey.js'
import {
  MONTHLY_NAMES, KINDS, MAX_QUESTIONS, MAX_TITLE, TOKEN_RE, visibleQuestions, UUID_RE, tidyText, holdsStoryPass, roundState, monthStartLondon, checkSubmission, cleanQuestion, tallyQuestion, groupNames,
} from '../src/stories/round/storyRoundRules.js'

const MAX_BODY = 40000
const clean = (v) => String(v || '').trim()
const say = (res, status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra })
const GENERIC_NOT_FOUND = 'This page is not available.'
const TROUBLE = 'That did not go through just now. Please try again in a moment.'

export const isStoryRequest = (req) => Boolean(req && req.query && typeof req.query.story === 'string' && req.query.story !== '')

function readBody(req) {
  let data = req.body
  if (typeof data === 'string') {
    if (data.length > MAX_BODY) return null
    try { data = JSON.parse(data) } catch (e) { return null }
  }
  return data && typeof data === 'object' ? data : null
}

// One question to the database. Returns { ok, status, rows, text } and never throws for a refusal (only when the database cannot be reached at all).
async function db(path, init = {}) {
  const response = await serviceFetch(`/rest/v1/${path}`, { ...init, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) } })
  let rows = null
  let text = ''
  if (response.ok) {
    try { rows = await response.json() } catch (e) { rows = null }
  } else {
    text = await saidWhat(response)
  }
  return { ok: response.ok, status: response.status, rows, text }
}
const insert = (table, body, representation = false) => db(table, { method: 'POST', body: JSON.stringify(body), headers: { Prefer: representation ? 'return=representation' : 'return=minimal' } })
const patch = (path, body) => db(path, { method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } })
const must = (r) => { if (!r.ok) throw new Error(`database answered ${r.status}`); return Array.isArray(r.rows) ? r.rows : [] }

const QUESTION_COLUMNS = 'id,round_id,sort_order,label,help_text,type,options,name_box,name_slots,show_if_question_id,show_if_answers'
const ROUND_COLUMNS = 'id,title,kind,status,link_token,opens_at,closes_at,source_round_id,created_at'

// What a member is allowed to see of a question: never the id of a suggestion behind a shortlist option
const publicQuestion = (q) => ({
  id: q.id, label: q.label, help_text: q.help_text, type: q.type, name_box: q.name_box, name_slots: q.name_slots, show_if_question_id: q.show_if_question_id, show_if_answers: q.show_if_answers,
  options: (Array.isArray(q.options) ? q.options : []).map((o) => (o && typeof o === 'object' ? { label: o.label, ...(o.group ? { group: o.group } : {}) } : { label: String(o) })),
})

async function suggestionsLeft(userId) {
  const rows = must(await db(`story_name_suggestions?member_id=eq.${userId}&month_start=eq.${monthStartLondon()}&select=id`))
  return Math.max(0, MONTHLY_NAMES - rows.length)
}

async function myRoundRows(userId, roundId) {
  const [responses, names] = await Promise.all([
    db(`story_responses?round_id=eq.${roundId}&member_id=eq.${userId}&select=question_id,answer`),
    db(`story_name_suggestions?round_id=eq.${roundId}&member_id=eq.${userId}&cleared_at=is.null&select=id`),
  ])
  const answerRows = must(responses)
  return { answers: answerRows.length, names: must(names).length, rows: answerRows }
}

// "Answers saved 3 of 10": how many questions the member answered, out of how many they were shown (a lone wolf is shown one fewer)
function sentSummary(questions, answerRows, nameCount, left) {
  const map = {}
  for (const r of answerRows) map[r.question_id] = r.answer
  const shown = visibleQuestions(questions, map).filter((q) => q.type !== 'name_suggestion')
  return { answered: shown.filter((q) => map[q.id]).length, total: shown.length, names: nameCount, left }
}

// Everything a member's request needs: who they are, the round (found by its hidden link), that they hold the pass, and what state it is in.
// Sends the refusal itself and returns null if any of that fails. A wrong, hidden or archived link all get the same plain "not available".
async function memberContext(req, res, token) {
  if (!TOKEN_RE.test(clean(token))) { say(res, 404, GENERIC_NOT_FOUND, { reason: 'not_found' }); return null }
  const who = await requireUser(req)
  if (!who.ok) { res.status(who.status).json({ ok: false, reason: who.reason, message: who.message }); return null }
  const rounds = must(await db(`story_rounds?link_token=eq.${clean(token)}&select=${ROUND_COLUMNS}`))
  const round = rounds[0]
  if (!round || roundState(round) === 'hidden') { say(res, 404, GENERIC_NOT_FOUND, { reason: 'not_found' }); return null }
  const rows = must(await db(`memberships?user_id=eq.${who.user.id}&select=status,passes`))
  if (!holdsStoryPass(rows[0])) {
    say(res, 403, 'This is for members who hold the Come Write With Me pass.', { reason: 'not_paid_member' })
    return null
  }
  return { user: who.user, round, state: roundState(round) }
}

async function memberRound(req, res) {
  if (req.method !== 'GET') return say(res, 405, 'That did not look right.')
  const ctx = await memberContext(req, res, req.query.token)
  if (!ctx) return undefined
  const { user, round, state } = ctx
  const roundInfo = { title: round.title, kind: round.kind, opens_at: round.opens_at, closes_at: round.closes_at }
  if (state === 'closed' || state === 'not_yet') return res.status(200).json({ ok: true, state, round: roundInfo })
  const mine = await myRoundRows(user.id, round.id)
  const left = await suggestionsLeft(user.id)
  const questions = must(await db(`story_questions?round_id=eq.${round.id}&order=sort_order.asc&select=${QUESTION_COLUMNS}`))
  if (mine.answers + mine.names > 0) return res.status(200).json({ ok: true, state: 'sent', round: roundInfo, sent: sentSummary(questions, mine.rows, mine.names, left) })
  return res.status(200).json({ ok: true, state: 'open', round: roundInfo, questions: questions.map(publicQuestion), left })
}

async function memberSubmit(req, res) {
  if (req.method !== 'POST') return say(res, 405, 'That did not look right.')
  const body = readBody(req)
  if (!body) return say(res, 400, 'That did not look right. Please try again.')
  const ctx = await memberContext(req, res, body.token)
  if (!ctx) return undefined
  const { user, round, state } = ctx
  if (state !== 'open') return say(res, 409, 'This round is not open for answers.', { reason: state })
  const mine = await myRoundRows(user.id, round.id)
  if (mine.answers + mine.names > 0) return say(res, 409, 'You have already sent your answer. It is final, so it cannot be changed or sent again.', { reason: 'already_sent' })
  const questions = must(await db(`story_questions?round_id=eq.${round.id}&order=sort_order.asc&select=${QUESTION_COLUMNS}`))
  const checked = checkSubmission(questions, body)
  if (!checked.ok) return say(res, 400, checked.message, { reason: 'invalid', field: checked.field || null })
  const left = await suggestionsLeft(user.id)
  if (checked.names.length > left) {
    return say(res, 409, left === 0
      ? 'You have used your 3 name suggestions for this month. They start again on the 1st.'
      : `You have ${left} name ${left === 1 ? 'suggestion' : 'suggestions'} left this month, and you are sending ${checked.names.length}. Please take some names out.`, { reason: 'name_limit', left })
  }
  const byId = new Map(questions.map((q) => [q.id, q]))
  const rows = checked.answers.map((a) => ({ round_id: round.id, question_id: a.question_id, member_id: user.id, answer: a.answer }))
  // a names-only question has no choice to make, so a marker row keeps it to one final answer too
  for (const id of new Set(checked.names.map((n) => n.question_id))) {
    if (byId.get(id) && byId.get(id).type === 'name_suggestion') rows.push({ round_id: round.id, question_id: id, member_id: user.id, answer: 'names' })
  }
  if (rows.length > 0) {
    const saved = await insert('story_responses', rows)
    if (!saved.ok) {
      if (saved.status === 409 || /23505|duplicate/i.test(saved.text)) return say(res, 409, 'You have already sent your answer. It is final, so it cannot be changed or sent again.', { reason: 'already_sent' })
      throw new Error('could not save')
    }
  }
  if (checked.names.length > 0) {
    const named = await insert('story_name_suggestions', checked.names.map((n) => ({ round_id: round.id, question_id: n.question_id, member_id: user.id, slot: n.slot, name: n.name })))
    if (!named.ok) {
      await db(`story_responses?round_id=eq.${round.id}&member_id=eq.${user.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }) // nothing half-saved
      if (/name_limit_reached/.test(named.text)) return say(res, 409, 'You have used your name suggestions for this month. Please try again without the names, or wait until the 1st.', { reason: 'name_limit' })
      if (/23505|duplicate/.test(named.text)) return say(res, 409, 'You have already sent your answer. It is final, so it cannot be changed or sent again.', { reason: 'already_sent' })
      throw new Error('could not save names')
    }
  }
  return res.status(200).json({ ok: true, state: 'sent', sent: sentSummary(questions, checked.answers, checked.names.length, Math.max(0, left - checked.names.length)) })
}

async function memberReport(req, res) {
  if (req.method !== 'POST') return say(res, 405, 'That did not look right.')
  const body = readBody(req)
  if (!body) return say(res, 400, 'That did not look right. Please try again.')
  const ctx = await memberContext(req, res, body.token)
  if (!ctx) return undefined
  const { user, round, state } = ctx
  if (state !== 'open' || round.kind !== 'small_vote') return say(res, 409, 'This round is not open.', { reason: state })
  const qid = clean(body.questionId)
  if (!UUID_RE.test(qid) || !Number.isInteger(body.optionIndex)) return say(res, 400, 'That did not look right. Please try again.')
  const question = must(await db(`story_questions?id=eq.${qid}&round_id=eq.${round.id}&select=options`))[0]
  const option = question && Array.isArray(question.options) ? question.options[body.optionIndex] : null
  const suggestionId = option && typeof option === 'object' ? clean(option.suggestionId) : ''
  if (!UUID_RE.test(suggestionId)) return say(res, 404, 'That name could not be found.', { reason: 'not_found' })
  const saved = await insert('story_name_reports', { suggestion_id: suggestionId, reporter_id: user.id })
  if (!saved.ok && !(saved.status === 409 || /23505|duplicate/i.test(saved.text))) throw new Error('could not report')
  return res.status(200).json({ ok: true, message: 'Thank you. I will take a look.' })
}

// ---------------------------------------------------------------- the owner's side ----------------------------------------------------------------
const validDate = (v) => {
  if (v === null || v === undefined || v === '') return { ok: true, value: null }
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? { ok: true, value: new Date(t).toISOString() } : { ok: false }
}

function checkDates(opens, closes) {
  const o = validDate(opens)
  const c = validDate(closes)
  if (!o.ok || !c.ok) return { ok: false, message: 'Those dates did not look right.' }
  if (o.value && c.value && new Date(c.value) <= new Date(o.value)) return { ok: false, message: 'The round must close after it opens.' }
  return { ok: true, opens_at: o.value, closes_at: c.value }
}

async function adminList(res) {
  const [rounds, responses, names, reports] = await Promise.all([
    db(`story_rounds?select=${ROUND_COLUMNS}&order=created_at.desc`),
    db('story_responses?select=round_id,member_id&limit=20000'),
    db('story_name_suggestions?select=id,round_id,member_id,cleared_at,hidden&limit=20000'),
    db('story_name_reports?select=suggestion_id&limit=20000'),
  ])
  const r = must(rounds); const resp = must(responses); const nm = must(names); const rep = must(reports)
  const roundOf = new Map(nm.map((n) => [n.id, n.round_id]))
  const out = r.map((round) => {
    const members = new Set([...resp.filter((x) => x.round_id === round.id).map((x) => x.member_id), ...nm.filter((x) => x.round_id === round.id).map((x) => x.member_id)])
    return {
      id: round.id, title: round.title, kind: round.kind, status: round.status, state: roundState(round), link_token: round.link_token, opens_at: round.opens_at, closes_at: round.closes_at,
      source_round_id: round.source_round_id, created_at: round.created_at, members: members.size,
      names: nm.filter((x) => x.round_id === round.id && !x.cleared_at).length,
      reports: rep.filter((x) => roundOf.get(x.suggestion_id) === round.id).length,
    }
  })
  return res.status(200).json({ ok: true, rounds: out })
}

async function adminResults(req, res) {
  const id = clean(req.query.id)
  if (!UUID_RE.test(id)) return say(res, 400, 'That did not look right.')
  const round = must(await db(`story_rounds?id=eq.${id}&select=${ROUND_COLUMNS}`))[0]
  if (!round) return say(res, 404, 'That round could not be found.')
  const [questions, responses, names] = await Promise.all([
    db(`story_questions?round_id=eq.${id}&order=sort_order.asc&select=${QUESTION_COLUMNS}`),
    db(`story_responses?round_id=eq.${id}&select=question_id,member_id,answer&limit=20000`),
    db(`story_name_suggestions?round_id=eq.${id}&cleared_at=is.null&select=id,question_id,name,hidden&limit=20000`),
  ])
  const qs = must(questions); const resp = must(responses); const nm = must(names)
  const ids = nm.map((n) => n.id)
  const reportRows = ids.length ? must(await db(`story_name_reports?suggestion_id=in.(${ids.join(',')})&select=suggestion_id&limit=20000`)) : []
  const withReports = nm.map((n) => ({ ...n, reports: reportRows.filter((x) => x.suggestion_id === n.id).length }))
  const labelOf = new Map(qs.map((q) => [q.id, q.label]))
  const questionsOut = qs.map((q) => {
    if (q.type === 'choose_one') return { id: q.id, label: q.label, type: q.type, tally: tallyQuestion(q, resp), decides: (Array.isArray(q.options) ? q.options : []).some((o) => o && o.group) }
    if (q.type === 'free_text') return { id: q.id, label: q.label, type: q.type, texts: resp.filter((x) => x.question_id === q.id).map((x) => x.answer) }
    return { id: q.id, label: q.label, type: q.type }
  })
  const grouped = groupNames(withReports).map((g) => ({ question_id: g.question_id, label: labelOf.get(g.question_id) || '', name: g.name, times: g.times, reports: g.reports, hidden: g.hidden, ids: g.ids }))
  const members = new Set([...resp.map((x) => x.member_id), ...must(await db(`story_name_suggestions?round_id=eq.${id}&select=member_id&limit=20000`)).map((x) => x.member_id)])
  return res.status(200).json({ ok: true, round: { id: round.id, title: round.title, kind: round.kind, status: round.status, state: roundState(round), link_token: round.link_token, closes_at: round.closes_at }, members: members.size, questions: questionsOut, names: grouped })
}

async function createRound(res, body, { fromShortlist = null } = {}) {
  const title = tidyText(body.title).slice(0, MAX_TITLE)
  if (!title) return say(res, 400, 'Please give the round a title.')
  if (!KINDS.includes(body.kind)) return say(res, 400, 'Please choose what kind of round this is.')
  const dates = checkDates(body.opens_at, body.closes_at)
  if (!dates.ok) return say(res, 400, dates.message)
  let list = []
  if (fromShortlist) list = [fromShortlist]
  else {
    const raw = Array.isArray(body.questions) ? body.questions : []
    if (raw.length === 0) return say(res, 400, 'Please choose at least one question.')
    if (raw.length > MAX_QUESTIONS) return say(res, 400, `A round can have up to ${MAX_QUESTIONS} questions.`)
    for (let i = 0; i < raw.length; i += 1) {
      const c = cleanQuestion(raw[i], i)
      if (!c.ok) return say(res, 400, c.message)
      list.push(c.value)
    }
  }
  if (body.kind === 'names_only' && list.some((q) => q.type !== 'name_suggestion')) return say(res, 400, 'A names-only round can only have name boxes.')
  if (body.kind === 'small_vote' && (list.length !== 1 || list[0].type !== 'choose_one' || list[0].options.length < 2 || list[0].options.length > 3)) return say(res, 400, 'A small vote is one question with two or three options.')
  const made = await insert('story_rounds', { title, kind: body.kind, opens_at: dates.opens_at, closes_at: dates.closes_at, ...(fromShortlist && body.source_round_id ? { source_round_id: body.source_round_id } : {}) }, true)
  const round = must(made)[0]
  if (!round) throw new Error('no round made')
  const rows = list.map((q, i) => ({ round_id: round.id, sort_order: i + 1, label: q.label, help_text: q.help_text, type: q.type, options: q.options, name_box: q.name_box, name_slots: q.name_slots, show_if_answers: q.show_if_answers }))
  const qmade = await insert('story_questions', rows, true)
  if (!qmade.ok || !Array.isArray(qmade.rows) || qmade.rows.length !== rows.length) {
    await db(`story_rounds?id=eq.${round.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }) // no half-made round is left behind
    throw new Error('no questions made')
  }
  const ordered = [...qmade.rows].sort((a, b) => a.sort_order - b.sort_order)
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].show_if_index !== null && list[i].show_if_index !== undefined) await patch(`story_questions?id=eq.${ordered[i].id}`, { show_if_question_id: ordered[list[i].show_if_index].id })
  }
  return res.status(200).json({ ok: true, id: round.id, link_token: round.link_token })
}

const NEXT = { draft: ['open', 'archived'], open: ['closed', 'archived'], closed: ['archived'], archived: [] }

async function adminAct(req, res) {
  const body = readBody(req)
  if (!body) return say(res, 400, 'That did not look right. Please try again.')
  const op = clean(body.op)
  if (op === 'create') return createRound(res, body)
  if (op === 'hide' || op === 'unhide') {
    const ids = Array.isArray(body.ids) ? body.ids.map(clean).filter((x) => UUID_RE.test(x)).slice(0, 200) : []
    if (ids.length === 0) return say(res, 400, 'That did not look right.')
    const done = await patch(`story_name_suggestions?id=in.(${ids.join(',')})&cleared_at=is.null`, op === 'hide' ? { hidden: true, hidden_at: new Date().toISOString() } : { hidden: false, hidden_at: null })
    if (!done.ok) throw new Error('hide failed')
    return res.status(200).json({ ok: true })
  }
  if (op === 'shortlist') {
    const source = clean(body.round_id)
    const ids = Array.isArray(body.suggestion_ids) ? [...new Set(body.suggestion_ids.map(clean))] : []
    if (!UUID_RE.test(source) || ids.length !== 3 || !ids.every((x) => UUID_RE.test(x))) return say(res, 400, 'Please tick exactly three names.')
    const found = must(await db(`story_name_suggestions?id=in.(${ids.join(',')})&round_id=eq.${source}&cleared_at=is.null&hidden=eq.false&select=id,name`))
    if (found.length !== 3) return say(res, 400, 'One of those names is hidden or no longer there. Please tick three names again.')
    const labels = found.map((f) => f.name.toLowerCase())
    if (new Set(labels).size !== 3) return say(res, 400, 'Two of those names are the same. Please choose three different names.')
    const label = tidyText(body.question).slice(0, 200) || 'Which name should we use?'
    const question = { label, help_text: null, type: 'choose_one', options: found.map((f) => ({ label: f.name, suggestionId: f.id })), name_box: false, name_slots: 1, show_if_index: null, show_if_answers: null }
    return createRound(res, { title: body.title || `Vote: ${label}`, kind: 'small_vote', opens_at: body.opens_at, closes_at: body.closes_at, source_round_id: source }, { fromShortlist: question })
  }
  const id = clean(body.id)
  if (!UUID_RE.test(id)) return say(res, 400, 'That did not look right.')
  const round = must(await db(`story_rounds?id=eq.${id}&select=${ROUND_COLUMNS}`))[0]
  if (!round) return say(res, 404, 'That round could not be found.')
  if (op === 'set_status') {
    const to = clean(body.status)
    if (!(NEXT[round.status] || []).includes(to)) return say(res, 409, `A ${round.status} round cannot become ${to}.`)
    if (to === 'open') {
      const count = must(await db(`story_questions?round_id=eq.${id}&select=id`)).length
      if (count === 0) return say(res, 409, 'Add at least one question before you open the round.')
      if (round.closes_at && new Date(round.closes_at).getTime() <= Date.now()) return say(res, 409, 'The closing date has already passed. Change the dates first.')
    }
    const done = await patch(`story_rounds?id=eq.${id}`, { status: to })
    if (!done.ok) throw new Error('status failed')
    return res.status(200).json({ ok: true })
  }
  if (op === 'set_dates') {
    if (round.status === 'closed' || round.status === 'archived') return say(res, 409, 'The dates of a closed round cannot be changed.')
    const dates = checkDates(body.opens_at, body.closes_at)
    if (!dates.ok) return say(res, 400, dates.message)
    const done = await patch(`story_rounds?id=eq.${id}`, { opens_at: dates.opens_at, closes_at: dates.closes_at })
    if (!done.ok) throw new Error('dates failed')
    return res.status(200).json({ ok: true })
  }
  if (op === 'reset') {
    if (body.confirm !== true) return say(res, 400, 'Please confirm before you reset a round.')
    if (round.status === 'draft') return say(res, 409, 'A draft round has no answers to reset.')
    const done = await db('rpc/story_reset_round', { method: 'POST', body: JSON.stringify({ p_round_id: id }) })
    if (!done.ok) throw new Error('reset failed')
    return res.status(200).json({ ok: true })
  }
  if (op === 'delete') {
    if (body.confirm !== true) return say(res, 400, 'Please confirm before you delete a round.')
    const [r, n] = await Promise.all([db(`story_responses?round_id=eq.${id}&select=id&limit=1`), db(`story_name_suggestions?round_id=eq.${id}&select=id&limit=1`)])
    if (must(r).length + must(n).length > 0) return say(res, 409, 'This round has answers, so it cannot be deleted. Archive it instead. Its answers are kept.', { reason: 'has_answers' })
    const done = await db(`story_rounds?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    if (!done.ok) throw new Error('delete failed')
    return res.status(200).json({ ok: true })
  }
  return say(res, 400, 'That did not look right.')
}

async function handleAdmin(req, res, action) {
  const who = await requireOwner(req)
  if (!who || !who.ok) return sendDenied(res, who || { status: 403, reason: 'not_owner', message: 'These tools are for the shop owner only.' })
  if (action === 'admin' && req.method === 'GET') return adminList(res)
  if (action === 'admin_results' && req.method === 'GET') return adminResults(req, res)
  if (action === 'admin' && req.method === 'POST') return adminAct(req, res)
  return say(res, 405, 'That did not look right.')
}

export async function handleStory(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const action = clean(req.query && req.query.story)
  try {
    if (action === 'admin' || action === 'admin_results') return await handleAdmin(req, res, action)
    if (action === 'round') return await memberRound(req, res)
    if (action === 'submit') return await memberSubmit(req, res)
    if (action === 'report') return await memberReport(req, res)
    return say(res, 404, GENERIC_NOT_FOUND)
  } catch (e) {
    return say(res, 503, TROUBLE)
  }
}
