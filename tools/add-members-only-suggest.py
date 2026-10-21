#!/usr/bin/env python3
"""Makes suggesting and voting members-only (Book Club pass, or the owner) on both the Book Club and Story Ledger boxes: the page, the database rules, the wording and the tests. A member whose payment is being retried still counts.

Run it from the project folder, AFTER unzipping starscapes-members-only-suggest-21oct.zip into it:   python3 tools/add-members-only-suggest.py

What it does: it makes exact edits to 7 files.
  sql/book-details.sql, sql/suggestions.sql, src/suggest/SuggestPanel.jsx, src/suggest/suggestRules.js, test/suggest-panel.test.jsx, test/suggest-rules.test.js, test/suggest-sql.test.js

How it keeps you safe:
  - It checks ALL 7 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-members-only-suggest.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-MEMBERS-ONLY-SUGGEST.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"sql/book-details.sql": [
[
"\n-- Is the signed-in person a Book Club member (an active Book Club pass) or the owner?\ncreate or replace function public.is_book_club_member() returns boolean\nlanguage sql stable security definer set search_path = public as $$\n  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'\n    or exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.status in ('active', 'trialing') and 'book-club' = any (m.passes));\n$$;\n",
"\n-- Is the signed-in person a Book Club member (a Book Club pass that is active, in a trial, or past due while Stripe retries a failed payment: the same rule as every other pass; it ends when Stripe gives up and cancels) or the owner?\ncreate or replace function public.is_book_club_member() returns boolean\nlanguage sql stable security definer set search_path = public as $$\n  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'\n    or exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.status in ('active', 'trialing', 'past_due') and 'book-club' = any (m.passes));\n$$;\n"
]
],
"sql/suggestions.sql": [
[
"--   * Everyone can see which spaces are switched on, and the suggestions you have approved, with how many votes each has.\n--   * A signed-in visitor can suggest something (it starts as \"pending\": only they and you can see it until you approve it), at most 3 a day,\n--     and only while that space is switched on. They can vote once for each approved suggestion, and take the vote back.\n--   * Only the account with the email below can switch a space on or off, approve, hide, choose or delete a suggestion. The same rule as your\n--     doors, products and posts.\n--   * Who voted for what is private: the website only ever sees the totals (the suggestion_tally view), plus each person's own votes.\n--\n-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in doors.sql.\n-- Both spaces start SWITCHED OFF, so nothing appears on any page until you turn it on in Admin, Suggestions.\n",
"--   * Everyone can see which spaces are switched on, and the suggestions you have approved, with how many votes each has.\n--   * A Book Club member (or you) can suggest something (it starts as \"pending\": only they and you can see it until you approve it), at most 3 a day,\n--     and only while that space is switched on. They can vote once for each approved suggestion, and take the vote back. This is the same on both spaces:\n--     suggesting and voting are for Book Club members only (Gill's decision, 21 October 2026). Everyone else can still see what has been suggested and the totals.\n--   * Only the account with the email below can switch a space on or off, approve, hide, choose or delete a suggestion. The same rule as your\n--     doors, products and posts.\n--   * Who voted for what is private: the website only ever sees the totals (the suggestion_tally view), plus each person's own votes.\n--\n-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in doors.sql.\n-- It also needs sql/book-details.sql to have been run first: that makes the function is_book_club_member(), which the suggest and vote rules below call.\n-- Both spaces start SWITCHED OFF, so nothing appears on any page until you turn it on in Admin, Suggestions.\n"
],
[
"drop policy if exists \"see approved suggestions, your own, and (as owner) all\" on public.suggestions;\ndrop policy if exists \"signed-in people suggest, three a day, while the space is on\" on public.suggestions;\ndrop policy if exists \"only the owner changes suggestions\" on public.suggestions;\ndrop policy if exists \"only the owner deletes suggestions\" on public.suggestions;\ncreate policy \"see approved suggestions, your own, and (as owner) all\" on public.suggestions for select to anon, authenticated\n  using (status in ('approved', 'chosen') or user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');\ncreate policy \"signed-in people suggest, three a day, while the space is on\" on public.suggestions for insert to authenticated\n  with check (\n    user_id = auth.uid()\n    and status = 'pending'\n",
"drop policy if exists \"see approved suggestions, your own, and (as owner) all\" on public.suggestions;\ndrop policy if exists \"signed-in people suggest, three a day, while the space is on\" on public.suggestions; -- the old name, from before suggesting was for Book Club members only\ndrop policy if exists \"Book Club members suggest, three a day, while the space is on\" on public.suggestions;\ndrop policy if exists \"only the owner changes suggestions\" on public.suggestions;\ndrop policy if exists \"only the owner deletes suggestions\" on public.suggestions;\ncreate policy \"see approved suggestions, your own, and (as owner) all\" on public.suggestions for select to anon, authenticated\n  using (status in ('approved', 'chosen') or user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');\ncreate policy \"Book Club members suggest, three a day, while the space is on\" on public.suggestions for insert to authenticated\n  with check (\n    public.is_book_club_member()\n    and user_id = auth.uid()\n    and status = 'pending'\n"
],
[
"drop policy if exists \"see your own votes\" on public.suggestion_votes;\ndrop policy if exists \"vote for an approved suggestion in a space that is on\" on public.suggestion_votes;\ndrop policy if exists \"take your own vote back\" on public.suggestion_votes;\ncreate policy \"see your own votes\" on public.suggestion_votes for select to authenticated\n  using (user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');\ncreate policy \"vote for an approved suggestion in a space that is on\" on public.suggestion_votes for insert to authenticated\n  with check (\n    user_id = auth.uid()\n    and exists (\n",
"drop policy if exists \"see your own votes\" on public.suggestion_votes;\ndrop policy if exists \"vote for an approved suggestion in a space that is on\" on public.suggestion_votes; -- the old name, from before voting was for Book Club members only\ndrop policy if exists \"Book Club members vote for an approved suggestion in a space that is on\" on public.suggestion_votes;\ndrop policy if exists \"take your own vote back\" on public.suggestion_votes;\ncreate policy \"see your own votes\" on public.suggestion_votes for select to authenticated\n  using (user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');\ncreate policy \"Book Club members vote for an approved suggestion in a space that is on\" on public.suggestion_votes for insert to authenticated\n  with check (\n    public.is_book_club_member()\n    and user_id = auth.uid()\n    and exists (\n"
]
],
"src/suggest/SuggestPanel.jsx": [
[
"import useUser from './useUser'\nimport { SPACES, cleanSuggestion, rankSuggestions } from './suggestRules'\nimport { addSuggestion, fetchSpaceOn, fetchSuggestions, setVote } from './suggestApi'\nimport '../styles/pages.css'\nimport './suggest.css'\n\n// The \"suggest and vote\" box, drawn in Figma (page 06 Room pages, \"Suggest and vote\"). It appears on a page only while its space is switched on\n// in Admin, Suggestions. A signed-in visitor can suggest (the owner approves it first) and vote once for each approved suggestion.\nexport default function SuggestPanel({ space }) {\n  const config = SPACES[space]\n  const { loading: whoLoading, user } = useUser()\n  const { owner } = useCurrentOwner()\n  const [on, setOn] = useState(null)\n",
"import useUser from './useUser'\nimport { SPACES, cleanSuggestion, rankSuggestions, holdsInputPass } from './suggestRules'\nimport { fetchMyMembership } from '../membership/membershipApi'\nimport { addSuggestion, fetchSpaceOn, fetchSuggestions, setVote } from './suggestApi'\nimport '../styles/pages.css'\nimport './suggest.css'\n\n// The \"suggest and vote\" box, drawn in Figma (page 06 Room pages, \"Suggest and vote\"). It appears on a page only while its space is switched on\n// in Admin, Suggestions. A Book Club member (or the owner) can suggest (the owner approves it first) and vote once for each approved suggestion; everyone else can see the list and\n// the totals, and is told plainly that suggesting and voting are for Book Club members (Gill's decision, 21 October 2026).\nexport default function SuggestPanel({ space }) {\n  const config = SPACES[space]\n  const { loading: whoLoading, user } = useUser()\n  const { owner, checking } = useCurrentOwner()\n  const [on, setOn] = useState(null)\n"
],
[
"  const [problem, setProblem] = useState('')\n\n",
"  const [problem, setProblem] = useState('')\n  const [member, setMember] = useState(null) // is this person a Book Club member? null until we know, so the box never flashes the wrong state\n\n"
],
[
"\n  const items = useMemo(() => rankSuggestions(data.rows, data.tally, data.mine), [data])\n  if (!config || on === null) return null\n  if (on === false) {\n    return owner ? <p className=\"sg-off\" role=\"note\">The suggest and vote box is switched off here. <Link to=\"/admin/suggestions\">Switch it on in Admin</Link></p> : null\n  }\n  const current = config.kinds.find((k) => k.key === kind) || config.kinds[0]\n",
"\n  useEffect(() => {\n    let alive = true\n    if (!userId) { setMember(null); return undefined }\n    setMember(null)\n    fetchMyMembership().then((row) => alive && setMember(holdsInputPass(row))).catch(() => alive && setMember(false)) // a membership that cannot be read counts as no pass, never as a member\n    return () => {\n      alive = false\n    }\n  }, [userId])\n\n  const items = useMemo(() => rankSuggestions(data.rows, data.tally, data.mine), [data])\n  if (!config || on === null) return null\n  if (on === false) {\n    return owner ? <p className=\"sg-off\" role=\"note\">The suggest and vote box is switched off here. <Link to=\"/admin/suggestions\">Switch it on in Admin</Link></p> : null\n  }\n  const canGive = Boolean(user) && (owner || member === true)\n  const finding = Boolean(user) && (checking || (!owner && member === null)) // still finding out whether this is a member or the owner: show neither the form nor the explanation\n  const current = config.kinds.find((k) => k.key === kind) || config.kinds[0]\n"
],
[
"  async function toggle(item) {\n    if (!user) return\n    setProblem('')\n",
"  async function toggle(item) {\n    if (!canGive) return\n    setProblem('')\n"
],
[
"          <p className=\"sg__login-title\">Log in to suggest or vote.</p>\n          <p className=\"sg__login-text\">You can read everything without an account. An account just lets me count one vote per person.</p>\n          <div className=\"sg__login-buttons\">\n",
"          <p className=\"sg__login-title\">Log in to suggest or vote.</p>\n          <p className=\"sg__login-text\">You can read everything without an account. Suggesting and voting are for Book Club members.</p>\n          <div className=\"sg__login-buttons\">\n"
],
[
"\n      {user && (\n        <form className=\"sg__form\" onSubmit={submit} noValidate>\n",
"\n      {user && !finding && !canGive && (\n        <div className=\"sg__login\">\n          <p className=\"sg__login-title\">Suggesting and voting are for Book Club members.</p>\n          <p className=\"sg__login-text\">Everyone can see what has been suggested. To suggest something or vote, you need the Book Club pass.</p>\n          <div className=\"sg__login-buttons\">\n            <Link className=\"pg-btn sg-btn--primary\" to=\"/membership\">Choose your passes</Link>\n          </div>\n        </div>\n      )}\n\n      {user && canGive && (\n        <form className=\"sg__form\" onSubmit={submit} noValidate>\n"
],
[
"                  aria-label={`${item.voted ? 'Take back your vote for' : 'Vote for'} ${item.title}. ${item.votes} ${item.votes === 1 ? 'vote' : 'votes'} so far.`}\n                  disabled={!user || chosen}\n                  onClick={() => toggle(item)}\n",
"                  aria-label={`${item.voted ? 'Take back your vote for' : 'Vote for'} ${item.title}. ${item.votes} ${item.votes === 1 ? 'vote' : 'votes'} so far.`}\n                  disabled={!canGive || chosen}\n                  onClick={() => toggle(item)}\n"
]
],
"src/suggest/suggestRules.js": [
[
"export const LIMITS = { titleMin: 2, titleMax: 120, whyMax: 300, perDay: 3 }\n\n",
"export const LIMITS = { titleMin: 2, titleMax: 120, whyMax: 300, perDay: 3 }\n\n// WHO MAY GIVE INPUT (Gill's decision, 21 October 2026): suggesting AND voting are for Book Club members only, on BOTH spaces (what to read next, and what to audit next).\n// Everyone can still see what has been suggested and the totals: the Story Ledger is free to watch. The database enforces it (is_book_club_member() in\n// sql/book-details.sql, called by the rules in sql/suggestions.sql); this is the same rule for the page: a Book Club pass that is active, in a trial, or past due (a payment\n// being retried still counts, as for every other pass). The owner can always suggest and vote.\nexport const INPUT_PASS = 'book-club'\nconst HOLDING = ['active', 'trialing', 'past_due']\nexport const holdsInputPass = (row) => Boolean(row) && HOLDING.includes(row.status) && Array.isArray(row.passes) && row.passes.includes(INPUT_PASS)\n\n"
],
[
"  const text = String((error && (error.message || error.code)) || '')\n  if (/row-level security|42501|violates/i.test(text)) return `That did not go through. You can suggest up to ${LIMITS.perDay} a day, and only while the box is open.`\n  if (/duplicate|23505/i.test(text)) return 'You have already done that.'\n",
"  const text = String((error && (error.message || error.code)) || '')\n  if (/row-level security|42501|violates/i.test(text)) return `That did not go through. Suggesting and voting are for Book Club members. You can suggest up to ${LIMITS.perDay} a day, and only while the box is open.`\n  if (/duplicate|23505/i.test(text)) return 'You have already done that.'\n"
]
],
"test/suggest-panel.test.jsx": [
[
"\nconst h = vi.hoisted(() => ({ on: true, user: null, owner: false, rows: [], tally: {}, mine: new Set(), calls: [], failAdd: false, failList: false }))\nvi.mock('../src/suggest/suggestApi', () => ({\n",
"\nconst h = vi.hoisted(() => ({ on: true, user: null, owner: false, rows: [], tally: {}, mine: new Set(), calls: [], failAdd: false, failList: false, membership: { status: 'active', passes: ['book-club'] }, membershipFails: false, membershipPending: false }))\nvi.mock('../src/suggest/suggestApi', () => ({\n"
],
[
"vi.mock('../src/doors/useCurrentOwner', () => ({ default: () => ({ checking: false, owner: h.owner }) }))\nimport SuggestPanel from '../src/suggest/SuggestPanel'\n\nconst show = (space = 'story-ledger') => render(<MemoryRouter><SuggestPanel space={space} /></MemoryRouter>)\nconst row = (id, title, status = 'approved', extra = {}) => ({ id, title, status, kind: 'show', why: null, created_at: `2026-10-0${id.length}`, ...extra })\nbeforeEach(() => { Object.assign(h, { on: true, user: null, owner: false, rows: [], tally: {}, mine: new Set(), calls: [], failAdd: false, failList: false }) })\n\n",
"vi.mock('../src/doors/useCurrentOwner', () => ({ default: () => ({ checking: false, owner: h.owner }) }))\nvi.mock('../src/membership/membershipApi', () => ({\n  fetchMyMembership: vi.fn(() => { if (h.membershipPending) return new Promise(() => {}); if (h.membershipFails) return Promise.reject(new Error('could not read')); return Promise.resolve(h.membership) }),\n}))\nimport SuggestPanel from '../src/suggest/SuggestPanel'\n\nconst show = (space = 'story-ledger') => render(<MemoryRouter><SuggestPanel space={space} /></MemoryRouter>)\nconst row = (id, title, status = 'approved', extra = {}) => ({ id, title, status, kind: 'show', why: null, created_at: `2026-10-0${id.length}`, ...extra })\nbeforeEach(() => { Object.assign(h, { on: true, user: null, owner: false, rows: [], tally: {}, mine: new Set(), calls: [], failAdd: false, failList: false, membership: { status: 'active', passes: ['book-club'] }, membershipFails: false, membershipPending: false }) })\n\n"
],
[
"    expect(screen.getByRole('button', { name: /41 votes/ })).toBeInTheDocument()\n  })\n",
"    expect(screen.getByRole('button', { name: /41 votes/ })).toBeInTheDocument()\n    expect(screen.getByText(/Suggesting and voting are for Book Club members/)).toBeInTheDocument()\n  })\n"
],
[
"\ndescribe('the styles', () => {\n",
"\ndescribe('signed in, but without a Book Club pass (suggesting and voting are for Book Club members only: Gill, 21 October 2026)', () => {\n  const EXPLAINED = 'Suggesting and voting are for Book Club members.'\n  beforeEach(() => { h.user = { id: 'u1' }; h.rows = [row('a', 'Knight Rider')]; h.tally = { a: 41 }; h.membership = null })\n  it('sees the list and the totals, a plain explanation and a way to choose passes, and no form', async () => {\n    show()\n    expect(await screen.findByText(EXPLAINED)).toBeInTheDocument()\n    expect(screen.getByText('Knight Rider')).toBeInTheDocument()\n    expect(screen.getByRole('button', { name: /41 votes/ })).toBeInTheDocument()\n    expect(screen.getByText(/Everyone can see what has been suggested/)).toBeInTheDocument()\n    expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership')\n    expect(screen.queryByRole('button', { name: 'Suggest it' })).toBeNull()\n    expect(screen.queryByLabelText('What should I audit?')).toBeNull()\n  })\n  it('cannot vote: the buttons are off and nothing is sent', async () => {\n    show()\n    await screen.findByText(EXPLAINED)\n    const vote = screen.getByRole('button', { name: /Vote for Knight Rider/ })\n    expect(vote).toBeDisabled(); fireEvent.click(vote)\n    expect(h.calls).toEqual([])\n  })\n  it('gets the same on the Book Club page, which is for members too', async () => {\n    show('book-club')\n    expect(await screen.findByText(EXPLAINED)).toBeInTheDocument()\n    expect(screen.queryByLabelText('Which book?')).toBeNull()\n  })\n  it('is not let in by another pass', async () => {\n    h.membership = { status: 'active', passes: ['blueprints', 'come-write-with-me', 'authors-notebook'] }\n    show()\n    expect(await screen.findByText(EXPLAINED)).toBeInTheDocument()\n  })\n  it.each(['canceled', 'unpaid', 'incomplete'])('is not let in by a Book Club pass that is %s', async (status) => {\n    h.membership = { status, passes: ['book-club'] }\n    show()\n    expect(await screen.findByText(EXPLAINED)).toBeInTheDocument()\n    expect(screen.queryByRole('button', { name: 'Suggest it' })).toBeNull()\n  })\n  it('is treated as having no pass when the membership cannot be read, never as a member', async () => {\n    h.membershipFails = true\n    show()\n    expect(await screen.findByText(EXPLAINED)).toBeInTheDocument()\n    expect(screen.queryByRole('button', { name: 'Suggest it' })).toBeNull()\n  })\n})\n\ndescribe('Book Club members, and the owner', () => {\n  beforeEach(() => { h.user = { id: 'u1' }; h.rows = [row('a', 'Knight Rider')]; h.tally = { a: 41 } })\n  it.each(['active', 'trialing', 'past_due'])('a Book Club pass that is %s can suggest, and vote', async (status) => {\n    h.membership = { status, passes: ['blueprints', 'book-club'] }\n    show()\n    expect(await screen.findByLabelText('What should I audit?')).toBeInTheDocument()\n    expect(screen.queryByText('Suggesting and voting are for Book Club members.')).toBeNull()\n    fireEvent.click(screen.getByRole('button', { name: /Vote for Knight Rider/ }))\n    await screen.findByRole('button', { name: /Take back your vote for Knight Rider. 42 votes/ })\n    expect(h.calls).toEqual([['vote', 'a', true]])\n  })\n  it('the owner can suggest and vote without any pass', async () => {\n    h.owner = true; h.membership = null\n    show('book-club')\n    expect(await screen.findByLabelText('Which book?')).toBeInTheDocument()\n    expect(screen.queryByText('Suggesting and voting are for Book Club members.')).toBeNull()\n    expect(screen.getByRole('button', { name: /Vote for Knight Rider/ })).not.toBeDisabled()\n  })\n  it('shows neither the form nor the explanation while it is still finding out who this is, so nothing flashes the wrong way', async () => {\n    h.membershipPending = true\n    show()\n    expect(await screen.findByText('Knight Rider')).toBeInTheDocument()\n    expect(screen.queryByText('Suggesting and voting are for Book Club members.')).toBeNull()\n    expect(screen.queryByLabelText('What should I audit?')).toBeNull()\n  })\n})\n\ndescribe('the styles', () => {\n"
]
],
"test/suggest-rules.test.js": [
[
"import path from 'node:path'\nimport { SPACES, LIMITS, cleanSuggestion, rankSuggestions, plainProblem } from '../src/suggest/suggestRules'\n\n",
"import path from 'node:path'\nimport { SPACES, LIMITS, cleanSuggestion, rankSuggestions, plainProblem, holdsInputPass, INPUT_PASS } from '../src/suggest/suggestRules'\n\n"
],
[
"    expect(plainProblem({ message: 'new row violates row-level security policy for table \"suggestions\"' })).toMatch(/up to 3 a day/)\n    expect(plainProblem({ code: '23505' })).toMatch(/already done that/)\n    const other = plainProblem({ message: 'connection to server at db.secret.example failed' })\n    expect(other).toMatch(/try again/)\n    expect(other).not.toMatch(/secret|connection/)\n  })\n})\n",
"    expect(plainProblem({ message: 'new row violates row-level security policy for table \"suggestions\"' })).toMatch(/up to 3 a day/)\n    expect(plainProblem({ message: 'new row violates row-level security policy for table \"suggestions\"' })).toMatch(/Suggesting and voting are for Book Club members/)\n    expect(plainProblem({ code: '23505' })).toMatch(/already done that/)\n    const other = plainProblem({ message: 'connection to server at db.secret.example failed' })\n    expect(other).toMatch(/try again/)\n    expect(other).not.toMatch(/secret|connection/)\n  })\n})\n\ndescribe('who may suggest and vote (Gill, 21 October 2026: Book Club members only, on both spaces)', () => {\n  const row = (status, passes) => ({ status, passes })\n  it('is the Book Club pass', () => { expect(INPUT_PASS).toBe('book-club') })\n  it('counts a Book Club pass that is active, in a trial, or past due (a payment being retried), like every other pass', () => {\n    for (const status of ['active', 'trialing', 'past_due']) expect(holdsInputPass(row(status, ['book-club'])), status).toBe(true)\n    expect(holdsInputPass(row('active', ['blueprints', 'book-club', 'come-write-with-me']))).toBe(true)\n  })\n  it('does not count anyone without it: another pass, a pass that has ended, no row at all, or a row that cannot be read', () => {\n    expect(holdsInputPass(row('active', ['blueprints', 'come-write-with-me']))).toBe(false)\n    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']) expect(holdsInputPass(row(status, ['book-club'])), status).toBe(false)\n    for (const bad of [null, undefined, {}, { status: 'active' }, { status: 'active', passes: 'book-club' }, { status: 'active', passes: [] }]) expect(holdsInputPass(bad)).toBe(false)\n  })\n  it('is the same rule as the database: the statuses it counts are the ones sql/book-details.sql counts', async () => {\n    const fs = await import('node:fs'); const sqlText = fs.readFileSync('sql/book-details.sql', 'utf8'); const i = sqlText.indexOf('create or replace function public.is_book_club_member')\n    const statuses = (sqlText.slice(i, sqlText.indexOf('$$;', i)).match(/m\\.status in \\(([^)]*)\\)/) || [])[1]\n    expect(statuses).toBe(\"'active', 'trialing', 'past_due'\")\n    for (const status of statuses.split(',').map((x) => x.trim().replace(/'/g, ''))) expect(holdsInputPass(row(status, ['book-club'])), status).toBe(true)\n  })\n})\n"
]
],
"test/suggest-sql.test.js": [
[
"    expect(live).toMatch(/on conflict \\(space\\) do nothing/)\n    expect(live.match(/drop policy if exists/g).length).toBe(live.match(/create policy/g).length)\n  })\n",
"    expect(live).toMatch(/on conflict \\(space\\) do nothing/)\n    const created = [...live.matchAll(/create policy \"([^\"]+)\"/g)].map((m) => m[1])\n    const dropped = [...live.matchAll(/drop policy if exists \"([^\"]+)\"/g)].map((m) => m[1])\n    for (const name of created) expect(dropped, name).toContain(name) // every rule is dropped before it is made, so a second run changes nothing\n    expect(dropped.filter((n) => !created.includes(n)).sort()).toEqual(['signed-in people suggest, three a day, while the space is on', 'vote for an approved suggestion in a space that is on']) // only the two retired names\n  })\n"
],
[
"  it('lets a visitor suggest only as themselves, only as pending, only while the space is on, and only 3 a day', () => {\n    const insert = live.slice(live.indexOf('create policy \"signed-in people suggest'), live.indexOf('create policy \"only the owner changes suggestions\"'))\n    expect(insert).toContain('user_id = auth.uid()')\n",
"  it('lets a visitor suggest only as themselves, only as pending, only while the space is on, and only 3 a day', () => {\n    const insert = live.slice(live.indexOf('create policy \"Book Club members suggest'), live.indexOf('create policy \"only the owner changes suggestions\"'))\n    expect(insert).toContain('user_id = auth.uid()')\n"
],
[
"  it('shows visitors only approved or chosen suggestions (and their own), never pending or hidden ones from others', () => {\n    const select = live.slice(live.indexOf('create policy \"see approved suggestions'), live.indexOf('create policy \"signed-in people suggest'))\n    expect(select).toContain(\"status in ('approved', 'chosen')\")\n    expect(select).toContain('user_id = auth.uid()')\n    expect(select).not.toContain(\"'pending'\")\n  })\n  it('lets a visitor vote only as themselves, only for an approved suggestion in a space that is on, and take the vote back', () => {\n    const vote = live.slice(live.indexOf('create policy \"vote for an approved'), live.indexOf('create policy \"take your own vote back\"'))\n    expect(vote).toContain('user_id = auth.uid()')\n    expect(vote).toContain(\"g.status in ('approved', 'chosen')\")\n    expect(vote).toContain('s.enabled')\n    expect(live).toMatch(/create policy \"take your own vote back\" on public.suggestion_votes for delete to authenticated using \\(user_id = auth.uid\\(\\)\\)/)\n  })\n",
"  it('shows visitors only approved or chosen suggestions (and their own), never pending or hidden ones from others', () => {\n    const select = live.slice(live.indexOf('create policy \"see approved suggestions'), live.indexOf('create policy \"Book Club members suggest'))\n    expect(select).toContain(\"status in ('approved', 'chosen')\")\n    expect(select).toContain('user_id = auth.uid()')\n    expect(select).not.toContain(\"'pending'\")\n  })\n  it('lets a visitor vote only as themselves, only for an approved suggestion in a space that is on, and take the vote back', () => {\n    const vote = live.slice(live.indexOf('create policy \"Book Club members vote for an approved'), live.indexOf('create policy \"take your own vote back\"'))\n    expect(vote).toContain('user_id = auth.uid()')\n    expect(vote).toContain(\"g.status in ('approved', 'chosen')\")\n    expect(vote).toContain('s.enabled')\n    expect(live).toMatch(/create policy \"take your own vote back\" on public.suggestion_votes for delete to authenticated using \\(user_id = auth.uid\\(\\)\\)/)\n  })\n  it('lets ONLY Book Club members (and the owner) suggest and vote, on both spaces: both rules call is_book_club_member()', () => {\n    const insert = live.slice(live.indexOf('create policy \"Book Club members suggest'), live.indexOf('create policy \"only the owner changes suggestions\"'))\n    const vote = live.slice(live.indexOf('create policy \"Book Club members vote for an approved'), live.indexOf('create policy \"take your own vote back\"'))\n    expect(insert).toContain('public.is_book_club_member()'); expect(vote).toContain('public.is_book_club_member()')\n    expect(insert).not.toMatch(/space\\s*=\\s*'/); expect(vote).not.toMatch(/space\\s*=\\s*'/) // no space is let off: the rule is the same for story-ledger and book-club\n  })\n  it('replaces the old rules that let any signed-in visitor in: the old policy names are dropped, never created again', () => {\n    expect(live).toContain('drop policy if exists \"signed-in people suggest, three a day, while the space is on\" on public.suggestions;')\n    expect(live).toContain('drop policy if exists \"vote for an approved suggestion in a space that is on\" on public.suggestion_votes;')\n    expect(live).not.toMatch(/create policy \"signed-in people suggest/); expect(live).not.toMatch(/create policy \"vote for an approved suggestion in a space that is on\"/)\n    for (const name of ['Book Club members suggest, three a day, while the space is on', 'Book Club members vote for an approved suggestion in a space that is on']) { expect(live).toContain(`drop policy if exists \"${name}\"`); expect(live).toContain(`create policy \"${name}\"`) }\n  })\n  it('still lets everyone SEE the approved suggestions and the totals (the Story Ledger is free to watch), and anyone take their own vote back', () => {\n    expect(live).toMatch(/create policy \"see approved suggestions, your own, and \\(as owner\\) all\" on public\\.suggestions for select to anon, authenticated/)\n    expect(live).toMatch(/grant select on public\\.suggestion_spaces, public\\.suggestions, public\\.suggestion_tally to anon, authenticated;/)\n    expect(live).toContain('create policy \"take your own vote back\" on public.suggestion_votes for delete to authenticated using (user_id = auth.uid())')\n  })\n  it('says it needs sql/book-details.sql first, and that file really makes the function: it counts the Book Club pass and the owner', () => {\n    expect(sql).toContain('sql/book-details.sql to have been run first'); expect(sql).toContain('is_book_club_member()')\n    const details = fs.readFileSync(path.resolve('sql/book-details.sql'), 'utf8'); const i = details.indexOf('create or replace function public.is_book_club_member'); expect(i).toBeGreaterThan(-1)\n    const fn = details.slice(i, details.indexOf('$$;', i) + 3); expect(fn).toContain(\"'book-club' = any (m.passes)\"); expect(fn).toContain(\"'gillian@gillianbennet.com'\")\n  })\n"
]
]
}''')
NEW_FILES = ["INSTALL-MEMBERS-ONLY-SUGGEST.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-members-only-suggest-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
    sys.exit(1)


def splice(text, pairs):
    spans = []
    for old, new in pairs:
        spans.append((text.find(old), old, new))
    spans.sort()
    out, pos = [], 0
    for index, old, new in spans:
        out.append(text[pos:index])
        out.append(new)
        pos = index + len(old)
    out.append(text[pos:])
    return ''.join(out)


plan, problems, done = {}, [], []
for rel, pairs in PATCH.items():
    p = root / rel
    if not p.exists():
        problems.append('%s is missing' % rel)
        continue
    text = p.read_text(encoding='utf-8')
    # each edit is either already in the file, still to do (its "before" text is there exactly once), or neither (not the file expected)
    def state(old, new):
        # an edit that only ADDS text contains its "before" inside its "after"; one that only REMOVES text has its "after" inside its "before"
        if old in text and not (old in new and new in text):
            return 'todo' if text.count(old) == 1 else 'bad'
        return 'done' if new in text else 'bad'
    states = [state(old, new) for old, new in pairs]
    if all(s == 'done' for s in states):
        done.append(rel)
    elif all(s == 'todo' for s in states):
        spans = sorted((text.find(old), text.find(old) + len(old)) for old, new in pairs)
        if any(a2 > b1 for (a1, a2), (b1, b2) in zip(spans, spans[1:])):
            problems.append('%s: the edits would overlap, so it is not the file I expected' % rel)
        else:
            plan[rel] = (text, splice(text, pairs))
    else:
        problems.append('%s is not the way I expected (it may have been changed since the last update)' % rel)

if problems:
    print('NOTHING WAS CHANGED, because:')
    for line in problems:
        print('  - ' + line)
    print('Paste this to me and I will tell you what to do.')
    sys.exit(1)

for rel, (before, after) in plan.items():
    p = root / rel
    pathlib.Path(str(p) + '.before-members-only-suggest').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
