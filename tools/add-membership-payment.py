#!/usr/bin/env python3
"""Adds the membership payment (Stripe test mode), the welcome page and the fifth pass, Come Write With Me.

Run it from the project folder, AFTER unzipping starscapes-membership-payment-19oct.zip into it:   python3 tools/add-membership-payment.py

What it does: it makes exact edits to seven files that already exist (the shop's Stripe listener, the page list, the page descriptions, the membership page, its passes and styles, and the database file) and adds the new membership files from the zip.
  api/stripe-webhook.js, src/App.jsx, src/data/pageMeta.js, src/membership/MembershipPage.jsx, src/membership/passes.js, src/membership/membership.css, sql/memberships.sql

How it keeps you safe:
  - It checks ALL 7 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-membership-payment.
  - It is safe to run twice: a file already done is left alone.
  - The new files (api/membership-checkout.js, api/membership-webhook.js, lib/membershipStripe.js, lib/userGuard.js, src/membership/membershipApi.js, src/membership/WelcomePage.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/stripe-webhook.js": [
[
"  const session = event.data && event.data.object\n  if (!session || typeof session.id !== 'string') return reply(400, { ok: false, message: 'That message had no payment in it.' })\n  if (session.payment_status !== 'paid') return reply(200, { ok: true, ignored: 'not paid yet' })\n\n",
"  const session = event.data && event.data.object\n  if (!session || typeof session.id !== 'string') return reply(400, { ok: false, message: 'That message had no payment in it.' })\n  // A membership (a subscription) is not a print order: the membership listener deals with it, and this one must never make an order from it.\n  if (session.mode === 'subscription') return reply(200, { ok: true, ignored: 'membership' })\n  if (session.payment_status !== 'paid') return reply(200, { ok: true, ignored: 'not paid yet' })\n\n"
]
],
"src/App.jsx": [
[
"import StaticPage from './pages/StaticPage'\nimport MembershipPage from './membership/MembershipPage'\nimport TestersPage from './testers/TestersPage'\nimport Footer from './components/Footer'\n",
"import StaticPage from './pages/StaticPage'\nimport MembershipPage from './membership/MembershipPage'\nimport WelcomePage from './membership/WelcomePage'\nimport TestersPage from './testers/TestersPage'\nimport Footer from './components/Footer'\n"
],
[
"<Route path=\"/page/:slug\" element={<StaticPage owner={owner} />} /> \n<Route path=\"/testers\" element={<TestersPage />} />\n<Route path=\"/membership\" element={<MembershipPage owner={owner} />} />\n<Route path=\"/products\" element={<ProductGallery />} /> \n<Route path=\"/products/:id\" element={<ProductPage />} /> \n",
"<Route path=\"/page/:slug\" element={<StaticPage owner={owner} />} /> \n<Route path=\"/testers\" element={<TestersPage />} />\n<Route path=\"/membership\" element={<MembershipPage owner={owner} session={session} />} />\n<Route path=\"/membership/welcome\" element={ <ProtectedRoute session={session}> <WelcomePage /> </ProtectedRoute> } />\n<Route path=\"/products\" element={<ProductGallery />} /> \n<Route path=\"/products/:id\" element={<ProductPage />} /> \n"
]
],
"src/data/pageMeta.js": [
[
"  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/membership': { title: 'Choose your passes', description: 'Open the parts of the story you want with one pass or several.', image: 'site', index: false, client: true },\n  '/testers': { title: 'For testers', description: 'A private page for the people testing Starscapes Factory.', image: 'site', index: false, client: true },\n",
"  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/membership/welcome': { title: 'Welcome', description: 'Your passes are open.', image: 'site', index: false, client: true },\n  '/membership': { title: 'Choose your passes', description: 'Open the parts of the story you want with one pass or several.', image: 'site', index: false, client: true },\n  '/testers': { title: 'For testers', description: 'A private page for the people testing Starscapes Factory.', image: 'site', index: false, client: true },\n"
]
],
"src/membership/MembershipPage.jsx": [
[
"import { useState } from 'react'\nimport { Link } from 'react-router-dom'\nimport useTitle from '../pages/useTitle'\nimport RoomIcon from '../components/RoomIcon'\nimport { channels } from '../data/channels'\nimport { MEMBERSHIP } from '../data/membership'\nimport { PASSES, CONSENT_TEXT, FREE_TEXT, STRIPE_NOTE } from './passes'\nimport { LAUNCH_OFFER, priceFor, formatPounds, ladderRows, ladderKey, YEARLY_MONTHS } from './pricing'\nimport './membership.css'\n\n// Every room's name, by its address (the Drafting Desk, the Factory Floor and the Knowledge Nook are not all in the illustrated-rooms list, but they are all here).\nconst ROOM_NAME = Object.fromEntries(channels.map((c) => [c.slug, c.name]))\n\n// \"Choose your passes\", at /membership (Figma: 13 Membership). While memberships are closed (MEMBERSHIP.open is false in src/data/membership.js) visitors are told they are not\n// open yet; only the owner sees the page, under a draft banner. Nothing here takes a payment: \"Continue to payment\" is connected in the next step.\nexport default function MembershipPage({ owner = false }) {\n  useTitle('Choose your passes')\n  const open = MEMBERSHIP.open === true\n  if (!open && !owner) return <NotOpen />\n  return <Chooser draft={!open} />\n}\n\n",
"import { useEffect, useState } from 'react'\nimport { Link } from 'react-router-dom'\nimport useTitle from '../pages/useTitle'\nimport RoomIcon from '../components/RoomIcon'\nimport { channels } from '../data/channels'\nimport { MEMBERSHIP } from '../data/membership'\nimport { redirectTo } from '../cart/redirect'\nimport { PASSES, PASS_IDS, cleanPassIds, CONSENT_TEXT, FREE_TEXT, STRIPE_NOTE } from './passes'\nimport { LAUNCH_OFFER, priceFor, formatPounds, ladderRows, ladderKey, YEARLY_MONTHS } from './pricing'\nimport { startMembershipCheckout, checkPromoCode } from './membershipApi'\nimport './membership.css'\n\n// Every room's name, by its address (the Drafting Desk, the Factory Floor and the Knowledge Nook are not all in the illustrated-rooms list, but they are all here).\nconst ROOM_NAME = Object.fromEntries(channels.map((c) => [c.slug, c.name]))\n\n// What someone has chosen is kept for the rest of their visit, so going off to log in or sign up does not lose it. The tick box and the promo code are NOT kept:\n// agreeing to open the passes now must be done fresh, every time.\nconst CHOICE_KEY = 'sf-membership-choice'\nfunction loadChoice() {\n  try {\n    const v = JSON.parse(window.sessionStorage.getItem(CHOICE_KEY) || 'null')\n    return { picked: cleanPassIds(v && v.picked), billing: v && v.billing === 'year' ? 'year' : 'month' }\n  } catch (e) {\n    return { picked: [], billing: 'month' }\n  }\n}\nfunction saveChoice(picked, billing) {\n  try {\n    window.sessionStorage.setItem(CHOICE_KEY, JSON.stringify({ picked, billing }))\n  } catch (e) {\n    // some private-browsing modes refuse; the choice then lasts only until the page is closed\n  }\n}\n\n// \"Choose your passes\", at /membership (Figma: 13 Membership). While memberships are closed (MEMBERSHIP.open is false in src/data/membership.js) visitors are told they are not\n// open yet; only the owner sees the page, under a draft banner. \"Continue to payment\" starts a Stripe checkout (a test one, until real payments are switched on).\nexport default function MembershipPage({ owner = false, session = null }) {\n  useTitle('Choose your passes')\n  const open = MEMBERSHIP.open === true\n  if (!open && !owner) return <NotOpen />\n  return <Chooser draft={!open} signedIn={Boolean(session)} />\n}\n\n"
],
[
"\n// The big price box. It says what you pay, what it becomes after the launch year, and the other way of paying, in plain words.\nfunction PriceText({ count, billing }) {\n  if (count === 0) {\n    return (\n",
"\n// The big price box. It says what you pay, what it becomes after the launch year, and the other way of paying, in plain words.\nfunction PriceText({ count, billing, code }) {\n  if (count === 0) {\n    return (\n"
],
[
"  const here = billing === 'year' ? price.year : price.month\n  const other = billing === 'year' ? price.month : price.year\n  if (price.offerActive) {\n    const otherWay = billing === 'year'\n",
"  const here = billing === 'year' ? price.year : price.month\n  const other = billing === 'year' ? price.month : price.year\n  if (code) {\n    // A promo code takes the place of the launch offer (Stripe allows one discount), and Stripe works out the final price on its own page.\n    return (\n      <>\n        <p className=\"mb__big\">{`${formatPounds(here.regular)} ${unit(billing)}`}</p>\n        <p className=\"mb__small\">{`Code ${code.code} applied: ${code.summary}. A code replaces the launch offer. Your final price is shown on the payment page.`}</p>\n      </>\n    )\n  }\n  if (price.offerActive) {\n    const otherWay = billing === 'year'\n"
],
[
"}\n\nfunction Chooser({ draft }) {\n  const [picked, setPicked] = useState([]) // pass ids, always in the order the passes are drawn\n  const [billing, setBilling] = useState('month')\n  const [agreed, setAgreed] = useState(false)\n  const [code, setCode] = useState('')\n  const [note, setNote] = useState('')\n  const count = picked.length\n  const current = ladderKey(count)\n  const canContinue = count > 0 && agreed\n\n  function toggle(id) {\n    setNote('')\n    setPicked((now) => PASSES.map((p) => p.id).filter((pid) => (pid === id ? !now.includes(pid) : now.includes(pid))))\n  }\n  function apply() {\n    setNote(code.trim() ? 'Your code will be checked on the payment page.' : 'Type your code first.')\n  }\n  function proceed() {\n    if (!canContinue) return\n    setNote('Payment is not connected yet, so nothing has been charged.')\n  }\n\n",
"}\n\nfunction Chooser({ draft, signedIn }) {\n  const [start] = useState(loadChoice)\n  const [picked, setPicked] = useState(start.picked) // pass ids, always in the order the passes are drawn\n  const [billing, setBilling] = useState(start.billing)\n  const [agreed, setAgreed] = useState(false)\n  const [code, setCode] = useState('')\n  const [codeInfo, setCodeInfo] = useState(null) // { code, summary } once a code has been checked and works\n  const [note, setNote] = useState('')\n  const [needLogin, setNeedLogin] = useState(false)\n  const [busy, setBusy] = useState(false)\n  const count = picked.length\n  const current = ladderKey(count)\n  const canContinue = count > 0 && agreed\n\n  useEffect(() => saveChoice(picked, billing), [picked, billing])\n\n  function toggle(id) {\n    setNote('')\n    setPicked((now) => PASS_IDS.filter((pid) => (pid === id ? !now.includes(pid) : now.includes(pid))))\n  }\n  function changeCode(value) {\n    setCode(value)\n    setCodeInfo(null) // a code that has been changed has not been checked\n  }\n  async function apply() {\n    const text = code.trim()\n    if (!text) return setNote('Type your code first.')\n    if (!signedIn) return setNeedLogin(true)\n    setNote('')\n    try {\n      const summary = await checkPromoCode(text)\n      setCodeInfo({ code: text, summary })\n    } catch (e) {\n      setCodeInfo(null)\n      setNote(e.message)\n    }\n  }\n  async function proceed() {\n    if (!canContinue || busy) return\n    if (!signedIn) return setNeedLogin(true)\n    setBusy(true)\n    setNote('')\n    try {\n      const url = await startMembershipCheckout({ passes: picked, interval: billing, consent: agreed, code: codeInfo ? codeInfo.code : '' })\n      redirectTo(url)\n    } catch (e) {\n      setNote(e.message)\n      setBusy(false)\n    }\n  }\n\n"
],
[
"        <div className=\"mb__right\">\n          <section className=\"mb__price\" aria-label=\"Your price\">\n            {LAUNCH_OFFER.active && count > 0 && <span className=\"mb__offer\">{LAUNCH_OFFER.label}</span>}\n            <p className=\"mb__count\">{`Your passes: ${count} of ${PASSES.length}`}</p>\n            <div aria-live=\"polite\">\n              <PriceText count={count} billing={billing} />\n            </div>\n            <div className=\"mb__billing\" role=\"group\" aria-label=\"How you pay\">\n",
"        <div className=\"mb__right\">\n          <section className=\"mb__price\" aria-label=\"Your price\">\n            {LAUNCH_OFFER.active && count > 0 && !codeInfo && <span className=\"mb__offer\">{LAUNCH_OFFER.label}</span>}\n            <p className=\"mb__count\">{`Your passes: ${count} of ${PASSES.length}`}</p>\n            <div aria-live=\"polite\">\n              <PriceText count={count} billing={billing} code={codeInfo} />\n            </div>\n            <div className=\"mb__billing\" role=\"group\" aria-label=\"How you pay\">\n"
],
[
"            <label htmlFor=\"mb-code\">Have a promo code?</label>\n            <div className=\"mb__promorow\">\n              <input id=\"mb-code\" className=\"mb__field\" type=\"text\" value={code} onChange={(e) => setCode(e.target.value)} placeholder=\"Enter your code\" autoComplete=\"off\" />\n              <button type=\"button\" className=\"pg-btn\" onClick={apply}>\n                Apply\n",
"            <label htmlFor=\"mb-code\">Have a promo code?</label>\n            <div className=\"mb__promorow\">\n              <input id=\"mb-code\" className=\"mb__field\" type=\"text\" value={code} onChange={(e) => changeCode(e.target.value)} placeholder=\"Enter your code\" autoComplete=\"off\" />\n              <button type=\"button\" className=\"pg-btn\" onClick={apply}>\n                Apply\n"
],
[
"          </label>\n\n          <button type=\"button\" className=\"mb__go\" disabled={!canContinue} aria-describedby={canContinue ? undefined : 'mb-why'} onClick={proceed}>\n            Continue to payment\n          </button>\n          {!canContinue && (\n            <p id=\"mb-why\" className=\"mb__why\">\n              Choose at least one pass and tick the box above to continue.\n            </p>\n          )}\n",
"          </label>\n\n          <button type=\"button\" className=\"mb__go\" disabled={!canContinue || busy} aria-describedby={canContinue ? undefined : 'mb-why'} onClick={proceed}>\n            {busy ? 'Taking you to Stripe…' : 'Continue to payment'}\n          </button>\n          {!canContinue && (\n            <p id=\"mb-why\" className=\"mb__why\">\n              Choose at least one pass and tick the box above to continue.\n            </p>\n          )}\n          {needLogin && !signedIn && (\n            <p className=\"mb__note\" role=\"status\">\n              Please <Link to=\"/login\">log in</Link> or <Link to=\"/signup\">sign up</Link> first. Your choices are kept for when you come back to this page.\n            </p>\n          )}\n"
]
],
"src/membership/passes.js": [
[
"// A pass is identified by its id, which is what the database and Stripe will store, so never change an id once people hold it.\n//\n// The first three posts in EVERY pass are free to read (decided 19 October 2026), so the passes do not each advertise it: one line under \"Free, always\" says it.\n\nexport const PASSES = [\n  { id: 'authors-notebook', name: \"The Author's Notebook\", blurb: 'Behind the scenes, straight from the notebook.', room: 'drafting-desk' },\n  { id: 'early-drafts', name: 'Early drafts and book background', blurb: 'Early drafts of the stories, and the background to the book.', room: 'drafting-desk' },\n  { id: 'blueprints', name: 'Blueprints', blurb: 'The reasoning behind every decision, in full.', room: 'factory-floor' },\n  { id: 'book-club', name: 'Book Club', blurb: 'Reviews, conversations about books, and a theme we follow each year.', room: 'knowledge-nook' },\n",
"// A pass is identified by its id, which is what the database and Stripe will store, so never change an id once people hold it.\n//\n// The first three posts in EVERY pass are free to read, and the first three Come Write With Me sessions are free to join (decided 19 October 2026), so the passes do not each\n// advertise it: one line under \"Free, always\" says it.\n// Come Write With Me is the interactive story: Gill writes, the members decide where it goes (the \"Stories v2\" idea in Figma). The pass was added the same day.\n\nexport const PASSES = [\n  { id: 'authors-notebook', name: \"The Author's Notebook\", blurb: 'Behind the scenes, straight from the notebook.', room: 'drafting-desk' },\n  { id: 'early-drafts', name: 'Early drafts and book background', blurb: 'Early drafts of the stories, and the background to the book.', room: 'drafting-desk' },\n  { id: 'come-write-with-me', name: 'Come Write With Me', blurb: \"Let's write a story together. I write, you decide. Where the story goes will be decided by you.\", room: 'drafting-desk' },\n  { id: 'blueprints', name: 'Blueprints', blurb: 'The reasoning behind every decision, in full.', room: 'factory-floor' },\n  { id: 'book-club', name: 'Book Club', blurb: 'Reviews, conversations about books, and a theme we follow each year.', room: 'knowledge-nook' },\n"
],
[
"export const CONSENT_TEXT = 'Open my passes now. I understand that once they open, I lose my 14-day right to cancel and get a refund.'\n\nexport const FREE_TEXT = 'Read every public entry and the latest posts, and get the free ebook. The first three posts in every pass are free to read too.'\nexport const STRIPE_NOTE = 'You pay on Stripe, by card. Cancel any time. You keep your passes until the end of what you have paid for.'\n",
"export const CONSENT_TEXT = 'Open my passes now. I understand that once they open, I lose my 14-day right to cancel and get a refund.'\n\nexport const FREE_TEXT = 'Read every public entry and the latest posts, and get the free ebook. The first three posts in every pass are free to read too, and the first three Come Write With Me sessions are free to join.'\nexport const STRIPE_NOTE = 'You pay on Stripe, by card. Cancel any time. You keep your passes until the end of what you have paid for.'\n"
]
],
"src/membership/membership.css": [
[
"    justify-self: stretch;\n  }\n}\n",
"    justify-self: stretch;\n  }\n}\n\n/* the welcome page: where each pass opens (Figma: 13 Membership, welcome) */\n.mb__w {\n  box-sizing: border-box;\n  max-width: 760px;\n  margin: 0 auto;\n  padding: 64px 24px 72px;\n}\n.mb__w h1 {\n  margin: 14px 0 12px;\n  font-family: var(--sf-head, 'Inter', system-ui, sans-serif);\n  font-size: clamp(1.75rem, 4vw, 2.5rem);\n  line-height: 1.15;\n  color: var(--sf-navy-700, #14306a);\n}\n.mb__wlist {\n  display: grid;\n  gap: 16px;\n  margin: 28px 0 0;\n  padding: 0;\n  list-style: none;\n}\n.mb__wcard {\n  display: grid;\n  grid-template-columns: 48px minmax(0, 1fr);\n  gap: 16px;\n  align-items: start;\n  padding: 17px;\n  border: 1.5px solid #9fb4e8;\n  border-radius: 14px;\n  background: #fff;\n}\n.mb__wname {\n  margin: 0 0 4px;\n  font-family: var(--sf-head, 'Inter', system-ui, sans-serif);\n  font-size: 1.25rem;\n  line-height: 1.25;\n  color: var(--sf-navy-700, #14306a);\n}\n.mb__wtext p {\n  margin: 0 0 12px;\n  color: var(--sf-muted, #5b6585);\n}\n.mb__wbtn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  box-sizing: border-box;\n  padding: 8px 22px;\n  border: 2px solid var(--sf-navy-700, #14306a);\n  border-radius: 999px;\n  background: #fff;\n  color: var(--sf-navy-700, #14306a);\n  font: inherit;\n  font-weight: 700;\n  text-decoration: none;\n  cursor: pointer;\n}\n.mb__wbtn:hover {\n  background: var(--sf-navy-700, #14306a);\n  color: #fff;\n}\n.mb__wbtn:focus-visible {\n  outline: 3px solid var(--sf-blue, #1f6fa8);\n  outline-offset: 2px;\n}\n"
]
],
"sql/memberships.sql": [
[
"  cancel_at_period_end boolean not null default false,\n  offer_ends_at timestamptz,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);\n\nalter table public.memberships enable row level security;\n",
"  cancel_at_period_end boolean not null default false,\n  offer_ends_at timestamptz,\n  consent_at timestamptz,\n  consent_text text,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);\n\n-- the record of what the customer agreed to at checkout (the tick box wording, and when). Added separately too, so running this file again on a table made earlier adds them.\nalter table public.memberships add column if not exists consent_at timestamptz;\nalter table public.memberships add column if not exists consent_text text;\n\nalter table public.memberships enable row level security;\n"
]
]
}''')
NEW_FILES = ["api/membership-checkout.js", "api/membership-webhook.js", "lib/membershipStripe.js", "lib/userGuard.js", "src/membership/membershipApi.js", "src/membership/WelcomePage.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/MembershipPage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the membership page update first. These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-membership-payment-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-membership-payment').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
