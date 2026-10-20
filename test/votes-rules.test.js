// @vitest-environment node
// The plain rules for the story vote (src/stories/votesRules.js).
import { describe, it, expect } from 'vitest'
import { STORY_PASS, MIN_OPTIONS, MAX_OPTIONS, LETTERS, DEFAULT_QUESTION, holdsStoryPass, isOpen, voteState, optionsOf, tally, chosenId, currentVote, closesText, cleanVote } from '../src/stories/votesRules'

const NOW = new Date('2026-10-20T12:00:00Z').getTime()
const STORY = '11111111-2222-4333-8444-555555555555'
const vote = (over = {}) => ({ id: 'v1', story_id: 's1', after_chapter: 3, question: 'What happens next?', closes_at: '2026-10-31T23:59:00Z', chosen_option_id: null, ...over })
const opt = (id, position, label = `Option ${position}`, voteId = 'v1') => ({ id, vote_id: voteId, position, label })

describe('who holds the pass', () => {
  it('is someone whose membership is active, trialing or past due and lists Come Write With Me', () => {
    expect(STORY_PASS).toBe('come-write-with-me')
    for (const status of ['active', 'trialing', 'past_due']) expect(holdsStoryPass({ status, passes: ['blueprints', 'come-write-with-me'] }), status).toBe(true)
    for (const status of ['unpaid', 'canceled', 'incomplete', 'free', '']) expect(holdsStoryPass({ status, passes: ['come-write-with-me'] }), status).toBe(false)
    expect(holdsStoryPass({ status: 'active', passes: ['blueprints'] })).toBe(false); expect(holdsStoryPass({ status: 'active', passes: null })).toBe(false); expect(holdsStoryPass(null)).toBe(false); expect(holdsStoryPass(undefined)).toBe(false)
  })
})

describe('is a vote open', () => {
  it('is open until its closing time and not after, and a bad time counts as closed', () => {
    expect(isOpen(vote(), NOW)).toBe(true); expect(isOpen(vote({ closes_at: '2026-10-20T12:00:00Z' }), NOW)).toBe(false); expect(isOpen(vote({ closes_at: '2026-10-20T11:59:59Z' }), NOW)).toBe(false)
    expect(isOpen(vote({ closes_at: 'nonsense' }), NOW)).toBe(false); expect(isOpen(null, NOW)).toBe(false)
  })
})

describe('the four states of the vote box', () => {
  const base = { vote: vote(), nowMs: NOW }
  it('closed once the vote has closed, whoever is looking', () => {
    const closed = vote({ closes_at: '2026-10-01T00:00:00Z' })
    for (const who of [{ signedIn: false }, { signedIn: true, member: false }, { signedIn: true, member: true, myOption: 'a' }]) expect(voteState({ vote: closed, nowMs: NOW, ...who })).toBe('closed')
    expect(voteState({ vote: null, nowMs: NOW })).toBe('closed')
  })
  it('visitor while open for anyone signed out, or signed in without the pass', () => {
    expect(voteState({ ...base, signedIn: false, member: false })).toBe('visitor'); expect(voteState({ ...base, signedIn: false, member: true, myOption: 'a' })).toBe('visitor'); expect(voteState({ ...base, signedIn: true, member: false })).toBe('visitor')
  })
  it('member for a member who has not voted yet, and voted for one who has', () => {
    expect(voteState({ ...base, signedIn: true, member: true, myOption: null })).toBe('member'); expect(voteState({ ...base, signedIn: true, member: true, myOption: undefined })).toBe('member'); expect(voteState({ ...base, signedIn: true, member: true, myOption: 'a' })).toBe('voted')
  })
})

describe('the choices and the results', () => {
  const options = [opt('c', 3), opt('a', 1), opt('b', 2), opt('x', 1, 'Other', 'v2')]
  it('are a vote\u2019s own choices, in order', () => {
    expect(optionsOf(vote(), options).map((o) => o.id)).toEqual(['a', 'b', 'c']); expect(optionsOf(null, options)).toEqual([]); expect(optionsOf(vote(), null)).toEqual([])
  })
  it('give each choice its letter, votes, share and a bar step to the nearest 5, and the total', () => {
    const t = tally(optionsOf(vote(), options), [{ option_id: 'a', votes: 10 }, { option_id: 'b', votes: 21 }, { option_id: 'c', votes: 7 }])
    expect(t.total).toBe(38); expect(t.rows.map((r) => [r.letter, r.votes, r.percent, r.step])).toEqual([['A', 10, 26, 25], ['B', 21, 55, 55], ['C', 7, 18, 20]]); expect(t.rows[1].label).toBe('Option 2')
  })
  it('treat a choice with no row as no votes, ignore a row that is not a choice, and cope with no votes at all', () => {
    const t = tally(optionsOf(vote(), options), [{ option_id: 'a', votes: 4 }, { option_id: 'zzz', votes: 99 }, { option_id: 'b', votes: 'bad' }, { option_id: 'c', votes: -5 }])
    expect(t.total).toBe(4); expect(t.rows.map((r) => r.votes)).toEqual([4, 0, 0]); expect(tally(optionsOf(vote(), options), []).rows.every((r) => r.percent === 0 && r.step === 0)).toBe(true); expect(tally(null, null)).toEqual({ total: 0, rows: [] })
  })
  it('have letters A to F, for two to six choices', () => {
    expect(LETTERS).toEqual(['A', 'B', 'C', 'D', 'E', 'F']); expect([MIN_OPTIONS, MAX_OPTIONS]).toEqual([2, 6])
  })
  it('say the winner is the one the owner picked, else the one alone at the top; a tie or no votes means nobody yet', () => {
    const o = optionsOf(vote(), options)
    expect(chosenId(vote(), tally(o, [{ option_id: 'a', votes: 3 }, { option_id: 'b', votes: 9 }, { option_id: 'c', votes: 1 }]))).toBe('b')
    expect(chosenId(vote(), tally(o, [{ option_id: 'a', votes: 9 }, { option_id: 'b', votes: 9 }, { option_id: 'c', votes: 1 }]))).toBeNull(); expect(chosenId(vote(), tally(o, []))).toBeNull()
    expect(chosenId(vote({ chosen_option_id: 'c' }), tally(o, [{ option_id: 'a', votes: 9 }, { option_id: 'b', votes: 2 }, { option_id: 'c', votes: 1 }]))).toBe('c')
    expect(chosenId(vote({ chosen_option_id: 'gone' }), tally(o, [{ option_id: 'a', votes: 9 }]))).toBe('a'); expect(chosenId(null, null)).toBeNull()
  })
})

describe('which vote the page shows', () => {
  const votes = [vote({ id: 'old', after_chapter: 3, closes_at: '2026-09-01T00:00:00Z' }), vote({ id: 'now', after_chapter: 6 }), vote({ id: 'other', story_id: 's2', after_chapter: 9 }), vote({ id: 'recent', after_chapter: 5, closes_at: '2026-10-10T00:00:00Z' })]
  it('is the one that is open, else the most recent that closed, for that story only', () => {
    expect(currentVote(votes, 's1', NOW).id).toBe('now'); expect(currentVote(votes.filter((v) => v.id !== 'now'), 's1', NOW).id).toBe('recent'); expect(currentVote(votes, 's2', NOW).id).toBe('other')
    expect(currentVote(votes, 'nobody', NOW)).toBeNull(); expect(currentVote(null, 's1', NOW)).toBeNull()
  })
})

describe('a closing time in words', () => {
  it('is the day, in London time, and nothing for a bad time', () => {
    expect(closesText('2026-10-31T23:59:00Z')).toBe('31 Oct 2026'); expect(closesText('2026-07-01T23:30:00Z')).toBe('2 Jul 2026'); expect(closesText('nope')).toBe('')
  })
})

describe('checking a new vote before it is saved', () => {
  const good = { story: STORY, after: '3', question: '', closes: '2026-10-31T23:59', options: ['She opens the door', 'She runs', 'She waits', ''] }
  it('accepts a good vote: the default question, the closing time as a moment in time, and the choices tidied and blanks dropped', () => {
    const r = cleanVote(good, NOW)
    expect(r.ok).toBe(true); expect(r.value.vote).toEqual({ story_id: STORY, after_chapter: 3, question: DEFAULT_QUESTION, closes_at: new Date('2026-10-31T23:59').toISOString() }); expect(r.value.labels).toEqual(['She opens the door', 'She runs', 'She waits'])
    expect(cleanVote({ ...good, question: '  Where   now? ', options: ['  A  b ', 'C'] }, NOW).value).toMatchObject({ vote: { question: 'Where now?' }, labels: ['A b', 'C'] })
  })
  it('takes just a date to mean the end of that day', () => {
    expect(cleanVote({ ...good, closes: '2026-10-31' }, NOW).value.vote.closes_at).toBe(new Date('2026-10-31T23:59').toISOString())
  })
  it('needs a real story, a chapter from 1 to 200, and not too long a question', () => {
    expect(cleanVote({ ...good, story: '' }, NOW).errors.story).toBeTruthy(); expect(cleanVote({ ...good, story: 'x' }, NOW).errors.story).toBeTruthy()
    for (const n of ['', '0', '201', '1.5', 'abc']) expect(cleanVote({ ...good, after: n }, NOW).errors.after, String(n)).toBeTruthy()
    expect(cleanVote({ ...good, question: 'x'.repeat(121) }, NOW).errors.question).toMatch(/120/)
  })
  it('needs a closing time that is a real time and still to come', () => {
    for (const c of ['', 'tomorrow', '2026-13-45T00:00']) expect(cleanVote({ ...good, closes: c }, NOW).errors.closes, String(c)).toMatch(/closes/)
    expect(cleanVote({ ...good, closes: '2026-10-20T11:00' }, NOW).errors.closes).toMatch(/still to come/); expect(cleanVote({ ...good, closes: '2026-10-19' }, NOW).errors.closes).toMatch(/still to come/)
  })
  it('needs two to six different choices, each not too long', () => {
    expect(cleanVote({ ...good, options: ['Only one', '', ''] }, NOW).errors.options).toMatch(/at least 2/); expect(cleanVote({ ...good, options: [] }, NOW).errors.options).toMatch(/at least 2/)
    expect(cleanVote({ ...good, options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, NOW).errors.options).toMatch(/No more than 6/); expect(cleanVote({ ...good, options: ['a', 'b', 'c', 'd', 'e', 'f'] }, NOW).ok).toBe(true)
    expect(cleanVote({ ...good, options: ['Same', ' same '] }, NOW).errors.options).toMatch(/the same/); expect(cleanVote({ ...good, options: ['ok', 'x'.repeat(161)] }, NOW).errors.options).toMatch(/160/)
  })
  it('gives every problem at once', () => {
    expect(Object.keys(cleanVote({ story: '', after: '', closes: '', options: [] }, NOW).errors).sort()).toEqual(['after', 'closes', 'options', 'story']); expect(cleanVote(null, NOW).ok).toBe(false)
  })
})
