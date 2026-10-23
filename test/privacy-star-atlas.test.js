// @vitest-environment node
// The privacy policy and the Star Atlas reading check-in (Gill, 22 October 2026: "add line to policy"). What the policy says must match what the Star Atlas build brief says the feature collects
// and who may see it: the stamps, the stardust, the taste week, the country, the monthly book count (0 to 3) and the OPTIONAL genre, and the optional survey; reading habits only ever looked at
// as TOTALS, once at least 5 members have checked in. The atlas is not built yet, so the policy may not be switched on until it is (STAR_ATLAS_LIVE).
import { describe, it, expect } from 'vitest'
// the FULL text of the policy (the Star Atlas wording is written and tested in full here), not the page the site shows (which leaves the atlas out until it is live: test/star-atlas-switch.test.js)
import { ALL_LEGAL_PAGES as LEGAL_PAGES, STAR_ATLAS_LIVE } from '../src/data/legalPages'

const privacy = () => LEGAL_PAGES.find((p) => p.slug === 'privacy')
const section = (title) => privacy().sections.find((s) => s.title === title)
const TITLE = 'Your Star Atlas and reading check-ins'
const atlas = () => section(TITLE).paragraphs.join('\n')
const rows = () => section('What we collect and why').paragraphs[0].split('\n').filter((l) => l.startsWith('|')).slice(2)
const row = (start) => rows().find((r) => r.startsWith(`| ${start}`))
const whole = () => [privacy().updated, ...privacy().intro, ...privacy().sections.flatMap((s) => s.paragraphs)].join('\n')

describe('the Star Atlas section', () => {
  it('has its own section, right after "Your profile and what other people see" and before the cookies', () => {
    const titles = privacy().sections.map((s) => s.title)
    const i = titles.indexOf(TITLE)
    expect(i).toBeGreaterThan(-1)
    expect(titles[i - 1]).toBe('Your profile and what other people see'); expect(titles[i + 1]).toBe('Cookies and similar technologies')
  })
  it('says what is kept: the stamps (what and when), the stardust spent, the taste week dates, the country, the number from 0 to 3, the genre only if chosen, and the optional survey', () => {
    for (const piece of ['what you earned and when', 'the stardust you spend', 'the dates of your free taste week', 'the country you choose', 'the number of extra books you give (0 to 3)', 'only if you choose, a genre', 'the optional year-one survey', 'Only you can see and change your own atlas']) {
      expect(atlas(), piece).toContain(piece)
    }
  })
  it('says reading habits are only ever looked at as TOTALS, once at least 5 members have checked in, and what is shown until then', () => {
    for (const piece of ['only ever look at reading habits as totals', 'only once at least 5 members have checked in that month', '\"Fewer than 5 so far\"', 'the download follows the same rule', 'fewer than 5 members is grouped under \"Other\"']) {
      expect(atlas(), piece).toContain(piece)
    }
  })
  it('is honest about the database: we could look, we do not, and the admin page cannot show one member\u2019s answers', () => {
    expect(atlas()).toContain("We could see one member's answers by looking directly in our database, but we don't"); expect(atlas()).toContain('the admin page has no way to show them')
  })
  it('says the genre is optional and the stardust counts either way', () => { expect(atlas()).toContain('The genre is optional, and your stardust counts either way') })
  it('says AI tools only ever see the totals, and agrees with the promise made elsewhere in the policy', () => {
    expect(atlas()).toContain('Your name, email address, location and reading answers are never put into AI tools: AI tools only ever see the totals')
    expect(whole()).toMatch(/We do not put customers' personal details into AI tools, ever/)
  })
  it('says it is not shared, except with the database provider that stores it', () => {
    expect(atlas()).toContain("We don't share your atlas or your reading answers with anyone else, apart from our database provider, which stores them for us")
  })
  it('says members can have their check-ins deleted at any time, that they are deleted when an account is closed, and that the rest of the atlas and the survey answers go then too (the wording from the Star Atlas review, 22 October 2026)', () => {
    expect(atlas()).toContain("You can ask us to delete your check-ins at any time, and they're deleted if you close your account.")
    expect(atlas()).toContain('The rest of your atlas and your survey answers are deleted then too.')
  })
  it('only describes what the brief says is part of the launch (it says nothing of the later Explorers Map, cities, leaderboards or comparisons between members)', () => {
    expect(atlas()).not.toMatch(/map|city|cities|leaderboard|rank|compare/i)
  })
})

describe('it says it once', () => {
  it('replaced the earlier one-paragraph "Reading habits" section: there is no second section about the reading check-in', () => {
    const titles = privacy().sections.map((s) => s.title)
    expect(titles).not.toContain('Reading habits')
    expect(privacy().sections.filter((s) => /monthly reading check-in/.test(s.paragraphs.join(' ')) && s.title !== 'What we collect and why')).toHaveLength(1)
    expect(titles.filter((t) => /reading|atlas/i.test(t))).toEqual([TITLE])
  })
  it('keeps what that paragraph said: the count and the optional genre, only ever looked at as totals, once at least 5 members have checked in, never one member\u2019s answers, and never put into an AI tool', () => {
    for (const piece of ['the number of extra books you give (0 to 3)', 'only if you choose, a genre', 'only ever look at reading habits as totals', 'at least 5 members have checked in', "We could see one member's answers", 'never put into AI tools']) expect(atlas(), piece).toContain(piece)
  })
})

describe('the table of what is collected and why', () => {
  it('has all its rows with exactly four cells, the new ones included', () => {
    expect(rows().length).toBe(15)
    for (const r of rows()) expect(r.split('|').length - 2, r.slice(0, 60)).toBe(4)
  })
  it('has a row for the atlas, with the reason and the legal basis', () => {
    const r = row('Your Star Atlas')
    expect(r).toContain('which room, what earned each one, and when'); expect(r).toContain('the dates of your free taste week'); expect(r).toMatch(/Contract \(the atlas is part of your account\) \|$/)
  })
  it('has a row for the monthly reading check-in: 0 to 3, genre only if chosen; contract for the number, consent for the genre, and the totals as a legitimate interest', () => {
    const r = row('Your monthly reading check-in')
    for (const piece of ['a number from 0 to 3', 'only if you choose, a genre', 'as totals only', 'Contract for the number, because it earns your stardust', 'Your consent for the genre, which is optional and is never needed for your stardust', 'Our legitimate interest in seeing the totals']) expect(r, piece).toContain(piece)
  })
  it('has a row for the country and a row for the optional survey (consent, which can be taken back)', () => {
    expect(row('The country you choose')).toContain('First country stamp')
    const s = row('Your answers to the optional year-one survey')
    expect(s).toContain('as totals only'); expect(s).toContain('Your consent, which you can take back at any time')
  })
  it('agrees with the section: the same 0 to 3, and the genre optional in both', () => {
    expect(row('Your monthly reading check-in')).toContain('0 to 3'); expect(atlas()).toContain('(0 to 3)')
    expect(row('Your monthly reading check-in')).toMatch(/optional/); expect(atlas()).toMatch(/optional/)
  })
})

describe('how long it is kept', () => {
  it('has its own point: until you ask us to delete them, or to delete your account (check-ins can be deleted on request at any time)', () => {
    const keep = section('How long we keep it').paragraphs.join('\n')
    expect(keep).toContain('* **Your Star Atlas, your reading check-ins and your survey answers:** until you ask us to delete them, or to delete your account.')
  })
})

describe('the policy can be published before the Star Atlas exists, because the site leaves the atlas wording out until it is live', () => {
  it('has a true-or-false switch (flip STAR_ATLAS_LIVE on the day the atlas goes live and the wording appears; test/star-atlas-switch.test.js checks that nothing of it shows before then)', () => {
    expect(typeof STAR_ATLAS_LIVE).toBe('boolean')
  })
  it('has no gap in the full text except the date, and the date only while the page is a draft', () => {
    const text = whole().replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '')
    expect([...new Set(text.match(/\[[^\]\n]+\]/g))]).toEqual(privacy().ready ? [] : ['[date]'])
  })
})
