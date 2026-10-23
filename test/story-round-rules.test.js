// @vitest-environment node
// The rules behind the hidden "Let's write a story" rounds (SFW-269): numbering, the side kicks question, name suggestions, the monthly count, and the owner's results.
import { describe, it, expect } from 'vitest'
import { BUILT_IN, checkSubmission, cleanQuestion, groupNames, holdsStoryPass, monthStartLondon, nameBoxCount, nameSummary, roundState, sideKickCount, tallyQuestion, visibleQuestions } from '../src/stories/round/storyRoundRules.js'
import { holdsStoryPass as voteHolds } from '../src/stories/votesRules'
import { blankForm, buildPayload, memberLink, roundLabel } from '../src/admin/storyRoundsAdminRules.js'

// The ten default questions as the database would hold them
const rows = BUILT_IN.map((q, i) => ({ id: `q${i + 1}`, sort_order: i + 1, label: q.label, type: q.type, options: q.options, name_box: q.nameBox, name_slots: 1, show_if_question_id: q.showIf ? 'q4' : null, show_if_answers: q.showIf ? q.showIf.answers : null }))
const COUNT = 'q4'; const SIDE = 'q5'

describe('numbering and the side kicks question', () => {
  it('has ten questions, and the side kicks question is number 5 once a member says Yes', () => {
    expect(rows).toHaveLength(10)
    const v = visibleQuestions(rows, { [COUNT]: '2 side kicks' })
    expect(v).toHaveLength(10); expect(v.find((q) => q.id === SIDE)).toMatchObject({ number: 5, total: 10, label: 'Side kicks' })
  })
  it('hides the side kicks question for a lone wolf, and the numbers never skip: nine questions, 1 to 9', () => {
    const v = visibleQuestions(rows, { [COUNT]: 'No, a lone wolf' })
    expect(v.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]); expect(v.every((q) => q.total === 9)).toBe(true); expect(v.find((q) => q.id === SIDE)).toBeUndefined()
  })
  it('hides it until the member has answered the count question', () => { expect(visibleQuestions(rows, {}).find((q) => q.id === SIDE)).toBeUndefined() })
  it('reads 1, 2 and 3 side kicks, and nothing for a lone wolf', () => {
    expect([sideKickCount('1 side kick'), sideKickCount('2 side kicks'), sideKickCount('3 side kicks'), sideKickCount('No, a lone wolf'), sideKickCount('4 side kicks')]).toEqual([1, 2, 3, 0, 0])
  })
  it('never puts a name box on the side kicks choice in round one (the names come in the names-only round)', () => {
    expect(nameBoxCount(rows.find((q) => q.id === SIDE))).toBe(0)
    expect(nameBoxCount(rows.find((q) => q.label === 'Villain'))).toBe(1); expect(nameBoxCount(rows.find((q) => q.label === 'Genre'))).toBe(0)
    expect(nameBoxCount({ type: 'name_suggestion', name_slots: 3 })).toBe(3)
  })
})

describe('what a member may send', () => {
  const ok = (body) => checkSubmission(rows, body)
  it('accepts a normal answer with a name, and keeps the name', () => {
    const r = ok({ answers: { q1: 'Fantasy', q2: 'A shy inventor' }, names: { q2: ['  Wren  '] } })
    expect(r.ok).toBe(true); expect(r.answers).toHaveLength(2); expect(r.names).toEqual([{ question_id: 'q2', slot: 1, name: 'Wren', label: 'Main character' }])
  })
  it('lets a member skip questions, but not send nothing at all', () => {
    expect(ok({ answers: { q1: 'Fantasy' } }).ok).toBe(true)
    expect(ok({ answers: {}, names: {} }).ok).toBe(false); expect(ok({}).ok).toBe(false)
  })
  it('refuses an answer that is not one of the choices, and an unknown question', () => {
    expect(ok({ answers: { q1: 'Cooking' } }).ok).toBe(false); expect(ok({ answers: { nope: 'x' } }).ok).toBe(false)
  })
  it('drops an answer to the side kicks question when the member is a lone wolf', () => {
    const r = ok({ answers: { [COUNT]: 'No, a lone wolf', [SIDE]: 'A wise old mentor' } })
    expect(r.ok).toBe(true); expect(r.answers.map((a) => a.question_id)).toEqual([COUNT])
  })
  it('ignores a name box that does not exist (the Genre question has none) and a second box on a one-box question', () => {
    expect(ok({ answers: { q1: 'Fantasy' }, names: { q1: ['Nope'] } }).names).toEqual([])
    expect(ok({ answers: { q2: 'A shy inventor' }, names: { q2: ['A', 'B'] } }).names).toHaveLength(1)
  })
  it('refuses a name longer than 40 letters', () => { expect(ok({ answers: { q2: 'A shy inventor' }, names: { q2: ['x'.repeat(41)] } }).ok).toBe(false) })
  it('gives up to three side kick boxes in a names-only round, and each filled box is a name', () => {
    const names = [{ id: 'n1', sort_order: 1, label: 'Side kicks', type: 'name_suggestion', options: [], name_box: false, name_slots: 3 }]
    const r = checkSubmission(names, { answers: {}, names: { n1: ['Pip', 'Moss', 'Ash', 'Too many'] } })
    expect(r.ok).toBe(true); expect(r.names.map((n) => [n.slot, n.name])).toEqual([[1, 'Pip'], [2, 'Moss'], [3, 'Ash']])
  })
  it('writes the sentence members see before sending', () => {
    expect(nameSummary(3, 3)).toBe('You are sending 3 names. You will have 0 suggestions left this month.')
    expect(nameSummary(1, 3)).toBe('You are sending 1 name. You will have 2 suggestions left this month.')
    expect(nameSummary(0, 2)).toContain('not sending any names')
  })
})

describe('the monthly count and the clock', () => {
  it('starts a new month at midnight in London, in summer and winter', () => {
    expect(monthStartLondon(new Date('2026-10-31T23:30:00Z'))).toBe('2026-10-01') // 23:30 UTC is 23:30 in London (summer time ended on the 25th)
    expect(monthStartLondon(new Date('2026-11-01T00:00:00Z'))).toBe('2026-11-01')
    expect(monthStartLondon(new Date('2026-07-31T23:30:00Z'))).toBe('2026-08-01') // 23:30 UTC is 00:30 on 1 August in London
  })
  it('opens and closes a round by its dates, and hides drafts and archived rounds', () => {
    const now = Date.parse('2027-03-10T12:00:00Z')
    expect(roundState({ status: 'draft' }, now)).toBe('hidden'); expect(roundState({ status: 'archived' }, now)).toBe('hidden'); expect(roundState({ status: 'closed' }, now)).toBe('closed')
    expect(roundState({ status: 'open', opens_at: '2027-03-11T00:00:00Z' }, now)).toBe('not_yet'); expect(roundState({ status: 'open', closes_at: '2027-03-10T11:00:00Z' }, now)).toBe('closed')
    expect(roundState({ status: 'open', opens_at: '2027-03-01T00:00:00Z', closes_at: '2027-03-31T00:00:00Z' }, now)).toBe('open'); expect(roundState({ status: 'open' }, now)).toBe('open')
  })
})

describe('who may take part', () => {
  it('agrees with the story vote: active, trialing or past due, with the Come Write With Me pass', () => {
    for (const row of [null, { status: 'active', passes: [] }, { status: 'active', passes: ['come-write-with-me'] }, { status: 'trialing', passes: ['come-write-with-me', 'x'] }, { status: 'past_due', passes: ['come-write-with-me'] }, { status: 'canceled', passes: ['come-write-with-me'] }, { status: 'active', passes: ['come-study-with-me'] }]) expect(holdsStoryPass(row)).toBe(voteHolds(row))
  })
})

describe('the owner\'s results', () => {
  const q = { id: 'q4', options: [{ label: 'No, a lone wolf' }, { label: '1 side kick', group: 'Yes' }, { label: '2 side kicks', group: 'Yes' }, { label: '3 side kicks', group: 'Yes' }] }
  const r = (answer) => ({ question_id: 'q4', answer })
  it('counts lone wolf, 1, 2 and 3 and marks the one that is on its own at the top', () => {
    const t = tallyQuestion(q, [r('No, a lone wolf'), r('2 side kicks'), r('2 side kicks'), r('3 side kicks')])
    expect(t.rows.map((x) => x.votes)).toEqual([1, 0, 2, 1]); expect(t.leader).toBe('2 side kicks'); expect(t.rows.find((x) => x.popular).label).toBe('2 side kicks')
  })
  it('says nobody is ahead in a tie or with no answers', () => {
    expect(tallyQuestion(q, [r('No, a lone wolf'), r('2 side kicks')]).leader).toBeNull(); expect(tallyQuestion(q, []).leader).toBeNull()
  })
  it('counts the same name typed twice (any capitals) as one name suggested twice, and sends no member details', () => {
    const g = groupNames([{ id: 'a', question_id: 'x', name: 'Wren', reports: 0, hidden: false }, { id: 'b', question_id: 'x', name: 'wren', reports: 1, hidden: false }, { id: 'c', question_id: 'y', name: 'Wren', reports: 0, hidden: false }])
    expect(g).toHaveLength(2); expect(g[0]).toMatchObject({ times: 2, reports: 1 }); expect(JSON.stringify(g)).not.toMatch(/member|email/)
  })
})

describe('cleaning what Gill types, and the round builder', () => {
  it('needs a question, a kind and two options, and refuses the same option twice', () => {
    expect(cleanQuestion({ label: '', type: 'choose_one' }).ok).toBe(false); expect(cleanQuestion({ label: 'Mood?', type: 'choose_one', options: ['Cosy'] }).ok).toBe(false)
    expect(cleanQuestion({ label: 'Mood?', type: 'choose_one', options: ['Cosy', 'cosy'] }).ok).toBe(false); expect(cleanQuestion({ label: 'Mood?', type: 'choose_one', options: ['Cosy', 'Tense'] }).ok).toBe(true)
  })
  it('lets Gill add as many of her own questions as she likes', () => {
    const f = blankForm(); f.extra = Array.from({ length: 12 }, (_, i) => ({ label: `Mine ${i}`, help: '', type: 'free_text', optionsText: '', nameBox: false }))
    const b = buildPayload({ ...f, title: 'Round 2' }); expect(b.ok).toBe(true); expect(b.payload.questions).toHaveLength(22)
  })
  it('puts the side kicks question under the count question, and drops the dependency if the count question is off', () => {
    const f = { ...blankForm(), title: 'Round 2' }; const a = buildPayload(f).payload.questions
    expect(a.find((x) => x.label === 'Side kicks')).toMatchObject({ show_if_index: a.findIndex((x) => x.label === 'Should the hero have side kicks?') })
    f.built.count.on = false; expect(buildPayload(f).payload.questions.find((x) => x.label === 'Side kicks').show_if_index).toBeUndefined()
  })
  it('needs a title, at least one question, and a closing date after the opening date (London time)', () => {
    expect(buildPayload({ ...blankForm(), title: '' }).ok).toBe(false)
    const none = blankForm(); none.title = 'x'; for (const k of Object.keys(none.built)) none.built[k].on = false; expect(buildPayload(none).ok).toBe(false)
    expect(buildPayload({ ...blankForm(), title: 'x', opensDate: '2027-03-05', closesDate: '2027-03-01' }).ok).toBe(false)
    expect(buildPayload({ ...blankForm(), title: 'x', opensDate: '2027-03-01', opensTime: '09:00', closesDate: '2027-03-31', closesTime: '18:00' }).payload).toMatchObject({ opens_at: '2027-03-01T09:00:00.000Z', closes_at: '2027-03-31T17:00:00.000Z' })
  })
  it('makes a names-only round with the side kick boxes matching the number chosen, and a one-question vote', () => {
    const n = { ...blankForm(), title: 'Names', kind: 'names_only' }; n.boxes.sidekicks.slots = 2
    expect(buildPayload(n).payload.questions.find((x) => x.label === 'Side kicks')).toMatchObject({ type: 'name_suggestion', name_slots: 2 })
    expect(buildPayload({ ...blankForm(), title: 'v', kind: 'small_vote', voteOptions: ['A', '', ''] }).ok).toBe(false)
    expect(buildPayload({ ...blankForm(), title: 'v', kind: 'small_vote', voteOptions: ['A', 'B', 'C'] }).payload.questions).toHaveLength(1)
  })
  it('labels rounds the way the console shows them, and builds the private link', () => {
    expect([roundLabel({ status: 'draft' }), roundLabel({ status: 'archived' }), roundLabel({ status: 'open', state: 'open' }), roundLabel({ status: 'open', state: 'closed' })]).toEqual(['Draft', 'Archived', 'Open', 'Closed'])
    expect(memberLink('https://starscapesfactory.com/', 'a'.repeat(64))).toBe(`https://starscapesfactory.com/story-round/${'a'.repeat(64)}`)
  })
})
