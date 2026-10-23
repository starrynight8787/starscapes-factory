// @vitest-environment node
// The server side of the hidden "Let's write a story" rounds (SFW-269), against a small pretend database that behaves like the real tables:
// one final answer per question, 3 name suggestions a month, a reset that keeps the count, questions that lock, and rows nobody else can see.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import { BUILT_IN, monthStartLondon } from '../src/stories/round/storyRoundRules.js'

const h = vi.hoisted(() => ({ user: null, owner: { ok: true }, db: null }))
vi.mock('../lib/userGuard.js', () => ({ requireUser: async () => h.user }))
vi.mock('../lib/ownerGuard.js', () => ({ requireOwner: async () => h.owner, sendDenied: (res, d) => res.status(d.status).json({ ok: false, reason: d.reason, message: d.message }) }))
vi.mock('../lib/serviceKey.js', async (importOriginal) => ({ ...(await importOriginal()), serviceFetch: async (path, init = {}) => h.db.handle(path, init) }))
import { handleStory, isStoryRequest } from '../lib/storyRounds.js'

const TOKEN = 'a'.repeat(64)
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ME = uid(901)
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body, headers: { get: () => null } })

function fakeDb() {
  const t = { story_rounds: [], story_questions: [], story_responses: [], story_name_suggestions: [], story_name_reports: [], memberships: [] }
  let n = 0
  const month = monthStartLondon()
  const match = (row, params) => [...params.entries()].every(([k, v]) => {
    if (['select', 'order', 'limit'].includes(k)) return true
    if (v.startsWith('eq.')) return String(row[k]) === v.slice(3)
    if (v === 'is.null') return row[k] === null || row[k] === undefined
    if (v.startsWith('in.(')) return v.slice(4, -1).split(',').includes(String(row[k]))
    return true
  })
  const handle = (path, init) => {
    const method = init.method || 'GET'
    const [p, qs = ''] = path.replace('/rest/v1/', '').split('?')
    const params = new URLSearchParams(qs)
    if (p === 'rpc/story_reset_round') {
      const id = JSON.parse(init.body).p_round_id
      const ids = t.story_name_suggestions.filter((s) => s.round_id === id).map((s) => s.id)
      t.story_name_reports = t.story_name_reports.filter((r) => !ids.includes(r.suggestion_id))
      t.story_name_suggestions.filter((s) => s.round_id === id && !s.cleared_at).forEach((s) => { s.name = null; s.cleared_at = 'now'; s.hidden = false })
      t.story_responses = t.story_responses.filter((r) => r.round_id !== id)
      return reply(204, null)
    }
    const rows = t[p]
    if (method === 'GET') return reply(200, rows.filter((r) => match(r, params)).map((r) => ({ ...r })))
    if (method === 'POST') {
      const parsed = JSON.parse(init.body)
      const list = Array.isArray(parsed) ? parsed : [parsed]
      const made = []
      for (const item of list) {
        n += 1
        const row = { id: uid(n), created_at: `2026-10-${String(10 + (n % 18)).padStart(2, '0')}`, ...item }
        if (p === 'story_rounds') Object.assign(row, { status: 'draft', link_token: t.story_rounds.length === 0 ? TOKEN : String(n).padStart(2, '0') + 'b'.repeat(62), opens_at: item.opens_at || null, closes_at: item.closes_at || null, source_round_id: item.source_round_id || null })
        if (p === 'story_questions') { row.show_if_question_id = null; row.help_text = item.help_text === undefined ? null : item.help_text }
        if (p === 'story_responses' && rows.concat(made).some((r) => r.round_id === row.round_id && r.question_id === row.question_id && r.member_id === row.member_id)) return reply(409, { code: '23505', message: 'duplicate key value' })
        if (p === 'story_name_suggestions') {
          Object.assign(row, { month_start: month, hidden: false, cleared_at: null })
          if (rows.concat(made).filter((r) => r.member_id === row.member_id && r.month_start === month).length >= 3) return reply(400, { code: 'P0001', message: 'name_limit_reached' })
          if (rows.concat(made).some((r) => !r.cleared_at && r.round_id === row.round_id && r.question_id === row.question_id && r.member_id === row.member_id && r.slot === row.slot)) return reply(409, { code: '23505', message: 'duplicate key' })
        }
        if (p === 'story_name_reports' && rows.some((r) => r.suggestion_id === row.suggestion_id && r.reporter_id === row.reporter_id)) return reply(409, { code: '23505', message: 'duplicate' })
        made.push(row)
      }
      rows.push(...made)
      return reply(201, made)
    }
    if (method === 'PATCH') {
      const body = JSON.parse(init.body)
      const target = rows.filter((r) => match(r, params))
      if (p === 'story_questions' && target[0] && (t.story_rounds.find((r) => r.id === target[0].round_id) || {}).status !== 'draft') return reply(400, { message: 'round_questions_locked' })
      target.forEach((r) => Object.assign(r, body))
      return reply(204, null)
    }
    if (method === 'DELETE') {
      if (p === 'story_rounds') {
        const id = params.get('id').slice(3)
        if (t.story_responses.some((r) => r.round_id === id) || t.story_name_suggestions.some((r) => r.round_id === id)) return reply(409, { code: '23503', message: 'foreign key' })
      }
      t[p] = rows.filter((r) => !match(r, params))
      return reply(204, null)
    }
    return reply(400, {})
  }
  return { t, handle }
}

const call = async (story, { method = 'GET', query = {}, body } = {}) => {
  const out = { status: null, body: null, headers: {} }
  const res = { setHeader(k, v) { out.headers[k.toLowerCase()] = v }, status(s) { out.status = s; return res }, json(b) { out.body = b; return res } }
  await handleStory({ method, query: { story, ...query }, headers: {}, body }, res)
  return out
}
const member = (over = {}) => { h.user = { ok: true, user: { id: ME, email: 'test@example.test' } }; h.db.t.memberships.push({ user_id: ME, status: 'active', passes: ['come-write-with-me'], ...over }) }
const openRound = (over = {}) => { const r = h.db.t.story_rounds.find((x) => x.link_token === TOKEN); Object.assign(r, { status: 'open', ...over }) }
const post = (body) => call('submit', { method: 'POST', body })
const admin = (body) => call('admin', { method: 'POST', body })

// A round made the way the console makes it: the ten default questions
async function makeFullRound() {
  const questions = BUILT_IN.map((q) => ({ label: q.label, help: q.help, type: q.type, options: q.options, name_box: q.nameBox, ...(q.showIf ? { show_if_index: 3, show_if_answers: q.showIf.answers } : {}) }))
  const made = await admin({ op: 'create', title: 'Chapter one', kind: 'full_form', questions })
  expect(made.status).toBe(200); expect(made.body.link_token).toBe(TOKEN)
  const qs = [...h.db.t.story_questions].sort((a, b) => a.sort_order - b.sort_order)
  return { qs, byLabel: (l) => qs.find((q) => q.label === l) }
}
const nameRows = (rid, qid, list, extra = {}) => list.map((name, i) => ({ id: uid(300 + i + (extra.base || 0)), round_id: rid, question_id: qid, member_id: uid(100 + i), slot: 1, name, hidden: false, cleared_at: null }))

beforeEach(() => { h.db = fakeDb(); h.user = null; h.owner = { ok: true } })

describe('who can get in', () => {
  it('recognises a story request, and never lets a browser or a shared cache keep an answer', async () => {
    expect(isStoryRequest({ query: { story: 'round' } })).toBe(true); expect(isStoryRequest({ query: {} })).toBe(false)
    expect((await call('round', { query: { token: TOKEN } })).headers['cache-control']).toBe('no-store')
  })
  it('gives a wrong, short or made-up link the same plain "not available"', async () => {
    h.user = { ok: true, user: { id: ME } }
    for (const token of ['', 'abc', 'z'.repeat(64), 'b'.repeat(64)]) { const o = await call('round', { query: { token } }); expect([o.status, o.body.reason]).toEqual([404, 'not_found']) }
  })
  it('asks someone who is not signed in to log in', async () => {
    await makeFullRound(); openRound(); h.user = { ok: false, status: 401, reason: 'not_signed_in', message: 'Please log in first, then try again.' }
    const o = await call('round', { query: { token: TOKEN } }); expect([o.status, o.body.reason]).toEqual([401, 'not_signed_in'])
  })
  it('refuses a free member kindly and sends them nothing about the questions', async () => {
    await makeFullRound(); openRound(); member({ passes: [] })
    const o = await call('round', { query: { token: TOKEN } }); expect([o.status, o.body.reason]).toEqual([403, 'not_paid_member']); expect(JSON.stringify(o.body)).not.toMatch(/Genre|questions/)
    expect((await post({ token: TOKEN, answers: { x: 'y' } })).status).toBe(403); expect(h.db.t.story_responses).toEqual([])
  })
  it('lets a paid member in, and shows a draft or archived round to nobody', async () => {
    await makeFullRound(); member({ status: 'past_due' })
    expect((await call('round', { query: { token: TOKEN } })).status).toBe(404)
    openRound(); const o = await call('round', { query: { token: TOKEN } }); expect([o.status, o.body.state, o.body.questions.length]).toEqual([200, 'open', 10])
    openRound({ status: 'archived' }); expect((await call('round', { query: { token: TOKEN } })).status).toBe(404)
  })
  it('refuses a member whose membership has ended, or who holds a different pass', async () => {
    await makeFullRound(); openRound()
    for (const over of [{ status: 'canceled' }, { passes: ['come-study-with-me'] }]) { h.db = Object.assign(h.db, { t: { ...h.db.t, memberships: [] } }); member(over); expect((await call('round', { query: { token: TOKEN } })).status).toBe(403) }
  })
  it('says closed, or not open yet, by the dates, and takes no answers either way', async () => {
    await makeFullRound(); member(); openRound({ closes_at: '2020-01-01T00:00:00Z' })
    expect((await call('round', { query: { token: TOKEN } })).body.state).toBe('closed'); expect((await post({ token: TOKEN, answers: { x: 'y' } })).status).toBe(409)
    openRound({ closes_at: null, opens_at: '2999-01-01T00:00:00Z' }); expect((await call('round', { query: { token: TOKEN } })).body.state).toBe('not_yet')
    expect(h.db.t.story_responses).toEqual([])
  })
})

describe('one final answer', () => {
  it('saves answers and names, tells the member how many suggestions are left, and refuses a second send', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    const body = { token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy', [byLabel('Villain').id]: 'A ghost with a grudge' }, names: { [byLabel('Villain').id]: ['Ione Calloway'] } }
    const first = await post(body); expect(first.status).toBe(200); expect(first.body.sent).toMatchObject({ answered: 2, total: 9, names: 1, left: 2 }) // the side kicks question stays hidden until the member answers the count question
    expect(h.db.t.story_responses).toHaveLength(2); expect(h.db.t.story_name_suggestions[0]).toMatchObject({ name: 'Ione Calloway', member_id: ME })
    const second = await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Mystery' } })
    expect([second.status, second.body.reason]).toEqual([409, 'already_sent']); expect(h.db.t.story_responses).toHaveLength(2)
    const again = await call('round', { query: { token: TOKEN } }); expect(again.body.state).toBe('sent'); expect(again.body.sent).toMatchObject({ answered: 2, names: 1 })
  })
  it('refuses a duplicate at the database too (two sends at the same moment cannot both save)', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    const rid = h.db.t.story_rounds[0].id; const body = { token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' } }
    const results = await Promise.all([post(body), post(body)])
    expect(results.filter((r) => r.status === 200).length).toBeGreaterThanOrEqual(1); expect(h.db.t.story_responses.filter((r) => r.member_id === ME && r.round_id === rid)).toHaveLength(1)
  })
  it('lets a member skip questions, and counts a lone wolf out of nine', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    const o = await post({ token: TOKEN, answers: { [byLabel('Should the hero have side kicks?').id]: 'No, a lone wolf', [byLabel('Side kicks').id]: 'A wise old mentor' } })
    expect(o.status).toBe(200); expect(o.body.sent).toMatchObject({ answered: 1, total: 9 }); expect(h.db.t.story_responses).toHaveLength(1)
  })
  it('refuses nothing-at-all, a bad choice and a made-up question, and saves nothing', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    for (const b of [{ answers: {} }, { answers: { [byLabel('Genre').id]: 'Cooking' } }, { answers: { nope: 'x' } }]) expect((await post({ token: TOKEN, ...b })).status).toBe(400)
    expect(h.db.t.story_responses).toEqual([])
  })
  it('never sends a name or an account id to another member', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' }, names: { [byLabel('Villain').id]: ['Secret Name'] } })
    h.db.t.story_responses = []; h.db.t.story_name_suggestions = h.db.t.story_name_suggestions.map((s) => ({ ...s, member_id: 'another' }))
    expect(JSON.stringify((await call('round', { query: { token: TOKEN } })).body)).not.toMatch(/Secret Name|member_id|another/)
  })
})

describe('3 name suggestions a month', () => {
  const names = (byLabel, list) => Object.fromEntries(list.map(([label, n]) => [byLabel(label).id, n]))
  it('lets three names through together, and refuses a fourth in another chapter with a clear message', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    const three = names(byLabel, [['Main character', ['A']], ['Love interest', ['B']], ['Villain', ['C']]])
    const o = await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' }, names: three })
    expect(o.status).toBe(200); expect(o.body.sent.left).toBe(0); expect(h.db.t.story_name_suggestions).toHaveLength(3)
    const second = await admin({ op: 'create', title: 'Names', kind: 'names_only', questions: [{ label: 'Villain', type: 'name_suggestion', options: [], name_slots: 1 }] })
    h.db.t.story_rounds.find((r) => r.id === second.body.id).status = 'open'
    const qid = h.db.t.story_questions.find((q) => q.round_id === second.body.id).id
    const fourth = await post({ token: second.body.link_token, answers: {}, names: { [qid]: ['D'] } })
    expect([fourth.status, fourth.body.reason]).toEqual([409, 'name_limit']); expect(fourth.body.message).toMatch(/used your 3 name suggestions/); expect(h.db.t.story_name_suggestions).toHaveLength(3)
  })
  it('refuses two names when only one suggestion is left, and saves nothing at all', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    for (const i of [1, 2]) h.db.t.story_name_suggestions.push({ id: `old${i}`, round_id: 'r', question_id: 'q', member_id: ME, slot: 1, name: 'Old', month_start: monthStartLondon(), hidden: false, cleared_at: null })
    const o = await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' }, names: names(byLabel, [['Main character', ['A']], ['Villain', ['B']]]) })
    expect([o.status, o.body.reason, o.body.left]).toEqual([409, 'name_limit', 1]); expect(h.db.t.story_responses).toEqual([])
  })
  it('starts again next month: names from last month do not count', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    for (const i of [1, 2, 3]) h.db.t.story_name_suggestions.push({ id: `old${i}`, round_id: 'r', question_id: 'q', member_id: ME, slot: 1, name: 'Old', month_start: '2020-01-01', hidden: false, cleared_at: null })
    const o = await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' }, names: names(byLabel, [['Villain', ['New']]]) })
    expect(o.status).toBe(200); expect(o.body.sent.left).toBe(2)
  })
  it('undoes the answers if the database refuses the names at the last moment (two sends racing)', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    const real = h.db.handle; let first = true
    h.db.handle = (path, init) => (path.includes('story_name_suggestions') && init.method === 'POST' && first ? ((first = false), reply(400, { code: 'P0001', message: 'name_limit_reached' })) : real(path, init))
    const o = await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' }, names: names(byLabel, [['Villain', ['New']]]) })
    expect([o.status, o.body.reason]).toEqual([409, 'name_limit']); expect(h.db.t.story_responses).toEqual([])
  })
  it('gives up to three side kick name boxes in a names-only round, each using one suggestion, and keeps it to one final answer', async () => {
    const made = await admin({ op: 'create', title: 'Names', kind: 'names_only', questions: [{ label: 'Side kicks', type: 'name_suggestion', options: [], name_slots: 3 }] })
    h.db.t.story_rounds[0].status = 'open'; member(); const q = h.db.t.story_questions[0]
    const o = await post({ token: TOKEN, answers: {}, names: { [q.id]: ['Pip', 'Moss', 'Ash'] } })
    expect(o.status).toBe(200); expect(o.body.sent).toMatchObject({ names: 3, left: 0 }); expect(h.db.t.story_responses).toHaveLength(1); expect(made.body.link_token).toBe(TOKEN)
    expect((await post({ token: TOKEN, answers: {}, names: { [q.id]: ['More'] } })).body.reason).toBe('already_sent')
  })
})

describe('the owner\'s console', () => {
  it('refuses everyone but the owner on every action, before reading anything', async () => {
    h.owner = { ok: false, status: 403, reason: 'not_owner', message: 'These tools are for the shop owner only.' }
    for (const [story, opts] of [['admin', {}], ['admin_results', { query: { id: uid(1) } }], ['admin', { method: 'POST', body: { op: 'create' } }]]) expect((await call(story, opts)).status).toBe(403)
    expect(h.db.t.story_rounds).toEqual([])
  })
  it('makes a round as a draft with a long private link, and members cannot see it until it is opened', async () => {
    await makeFullRound(); expect(h.db.t.story_rounds[0]).toMatchObject({ status: 'draft', kind: 'full_form' }); expect(h.db.t.story_rounds[0].link_token).toMatch(/^[0-9a-f]{64}$/)
    member(); expect((await call('round', { query: { token: TOKEN } })).status).toBe(404)
  })
  it('wires the side kicks question to the count question', async () => {
    const { byLabel } = await makeFullRound(); expect(byLabel('Side kicks').show_if_question_id).toBe(byLabel('Should the hero have side kicks?').id); expect(byLabel('Side kicks').show_if_answers).toEqual(['1 side kick', '2 side kicks', '3 side kicks'])
  })
  it('opens a round only with questions, closes it, and never reopens a closed or archived one', async () => {
    expect((await admin({ op: 'create', title: 'x', kind: 'names_only', questions: [] })).status).toBe(400)
    await makeFullRound(); const id = h.db.t.story_rounds[0].id; const to = (status) => admin({ op: 'set_status', id, status })
    expect((await to('open')).status).toBe(200); expect((await to('draft')).status).toBe(409); expect((await to('closed')).status).toBe(200)
    expect((await to('open')).status).toBe(409); expect((await to('archived')).status).toBe(200)
  })
  it('will not open a round whose closing date has passed', async () => {
    await makeFullRound(); const r = h.db.t.story_rounds[0]; r.closes_at = '2020-01-01T00:00:00Z'
    expect((await admin({ op: 'set_status', id: r.id, status: 'open' })).status).toBe(409)
  })
  it('locks the questions once a round is open (the database refuses a change)', async () => {
    const { qs } = await makeFullRound(); openRound()
    expect((await h.db.handle(`/rest/v1/story_questions?id=eq.${qs[0].id}`, { method: 'PATCH', body: JSON.stringify({ label: 'Changed' }) })).status).toBe(400)
  })
  it('shows counts, the most popular side kick answer, and every name, without who sent it', async () => {
    const { byLabel } = await makeFullRound(); const rid = h.db.t.story_rounds[0].id
    ;['2 side kicks', '2 side kicks', 'No, a lone wolf'].forEach((a, i) => h.db.t.story_responses.push({ id: `r${i}`, round_id: rid, question_id: byLabel('Should the hero have side kicks?').id, member_id: uid(100 + i), answer: a }))
    h.db.t.story_name_suggestions.push(...nameRows(rid, byLabel('Villain').id, ['Wren', 'wren', 'Marrow']))
    const o = await call('admin_results', { query: { id: rid } })
    expect(o.status).toBe(200); expect(o.body.members).toBe(3)
    const count = o.body.questions.find((q) => q.decides); expect(count.tally.leader).toBe('2 side kicks'); expect(count.tally.rows.map((r) => r.votes)).toEqual([1, 0, 2, 0])
    expect(o.body.names.find((n) => n.name.toLowerCase() === 'wren')).toMatchObject({ times: 2 }); expect(JSON.stringify(o.body)).not.toMatch(/member_id|email/)
  })
  it('hides and shows a name, and a hidden name cannot be shortlisted', async () => {
    const { byLabel } = await makeFullRound(); const rid = h.db.t.story_rounds[0].id
    h.db.t.story_name_suggestions.push(...nameRows(rid, byLabel('Villain').id, ['Wren', 'Marrow', 'Fitch', 'Pale'])); const ids = h.db.t.story_name_suggestions.map((s) => s.id)
    await admin({ op: 'hide', ids: [ids[3]] }); expect(h.db.t.story_name_suggestions[3].hidden).toBe(true)
    expect((await admin({ op: 'shortlist', round_id: rid, suggestion_ids: [ids[0], ids[1], ids[3]] })).status).toBe(400)
    await admin({ op: 'unhide', ids: [ids[3]] }); expect(h.db.t.story_name_suggestions[3].hidden).toBe(false)
  })
  it('makes a draft small vote from exactly three names, linking back to the round, and keeps the suggestion ids away from members', async () => {
    const { byLabel } = await makeFullRound(); const rid = h.db.t.story_rounds[0].id
    h.db.t.story_name_suggestions.push(...nameRows(rid, byLabel('Villain').id, ['Wren', 'Marrow', 'Fitch'])); const ids = h.db.t.story_name_suggestions.map((s) => s.id)
    expect((await admin({ op: 'shortlist', round_id: rid, suggestion_ids: ids.slice(0, 2) })).status).toBe(400)
    const o = await admin({ op: 'shortlist', round_id: rid, suggestion_ids: ids, question: 'Who is the villain called?' })
    expect(o.status).toBe(200); const vote = h.db.t.story_rounds.find((r) => r.id === o.body.id)
    expect(vote).toMatchObject({ kind: 'small_vote', status: 'draft', source_round_id: rid }); expect(h.db.t.story_questions.find((x) => x.round_id === vote.id).options.map((x) => x.label)).toEqual(['Wren', 'Marrow', 'Fitch'])
    vote.status = 'open'; member(); const seen = await call('round', { query: { token: vote.link_token } })
    expect(seen.body.questions[0].options.map((x) => Object.keys(x))).toEqual([['label'], ['label'], ['label']]); expect(JSON.stringify(seen.body)).not.toContain(ids[0])
  })
  it('lets a member report a name in the vote, once, and lets the owner see the report', async () => {
    const { byLabel } = await makeFullRound(); const rid = h.db.t.story_rounds[0].id
    h.db.t.story_name_suggestions.push(...nameRows(rid, byLabel('Villain').id, ['Wren', 'Marrow', 'Fitch'])); const ids = h.db.t.story_name_suggestions.map((s) => s.id)
    const made = await admin({ op: 'shortlist', round_id: rid, suggestion_ids: ids })
    const vote = h.db.t.story_rounds.find((r) => r.id === made.body.id); vote.status = 'open'; member()
    const body = { token: vote.link_token, questionId: h.db.t.story_questions.find((x) => x.round_id === vote.id).id, optionIndex: 1 }
    const report = (b) => call('report', { method: 'POST', body: b })
    expect((await report(body)).status).toBe(200); expect((await report(body)).status).toBe(200); expect(h.db.t.story_name_reports).toHaveLength(1)
    expect((await call('admin')).body.rounds.find((r) => r.id === rid).reports).toBe(1); expect((await report({ ...body, optionIndex: 9 })).status).toBe(404)
  })
  it('resets a round only after a confirm, clears answers and names, and keeps the monthly count', async () => {
    const { byLabel } = await makeFullRound(); openRound(); member()
    await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' }, names: { [byLabel('Villain').id]: ['Wren'], [byLabel('Main character').id]: ['Pip'] } })
    const id = h.db.t.story_rounds[0].id
    expect((await admin({ op: 'reset', id })).status).toBe(400); expect(h.db.t.story_responses).toHaveLength(1)
    expect((await admin({ op: 'reset', id, confirm: true })).status).toBe(200)
    expect(h.db.t.story_responses).toEqual([]); expect(h.db.t.story_name_suggestions.every((s) => s.name === null && s.cleared_at)).toBe(true); expect(h.db.t.story_name_suggestions).toHaveLength(2)
    const again = await call('round', { query: { token: TOKEN } }); expect([again.body.state, again.body.left]).toEqual(['open', 1])
    const second = await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Mystery' }, names: { [byLabel('Villain').id]: ['A'], [byLabel('Main character').id]: ['C'] } })
    expect([second.status, second.body.reason]).toEqual([409, 'name_limit'])
  })
  it('refuses to delete a round that has answers (archive it instead), and deletes an empty one only after a confirm', async () => {
    const { byLabel } = await makeFullRound(); const id = h.db.t.story_rounds[0].id
    expect((await admin({ op: 'delete', id })).status).toBe(400)
    openRound(); member(); await post({ token: TOKEN, answers: { [byLabel('Genre').id]: 'Fantasy' } })
    const o = await admin({ op: 'delete', id, confirm: true }); expect([o.status, o.body.reason]).toEqual([409, 'has_answers']); expect(h.db.t.story_rounds).toHaveLength(1)
    h.db.t.story_responses = []; expect((await admin({ op: 'delete', id, confirm: true })).status).toBe(200); expect(h.db.t.story_rounds).toEqual([])
  })
  it('lets the owner add as many of her own questions as she likes', async () => {
    const questions = Array.from({ length: 25 }, (_, i) => ({ label: `Mine ${i}`, type: 'free_text', options: [] }))
    expect((await admin({ op: 'create', title: 'Lots', kind: 'full_form', questions })).status).toBe(200); expect(h.db.t.story_questions).toHaveLength(25)
  })
})

describe('the site stays within its function limit', () => {
  it('adds no new function (the free plan allows 12) and is reached through the membership function', () => {
    expect(fs.readdirSync('api').filter((f) => f.endsWith('.js'))).toHaveLength(12)
    expect(fs.readFileSync('api/membership-checkout.js', 'utf8')).toMatch(/isStoryRequest\(req\)\) return handleStory/)
  })
})
