#!/usr/bin/env python3
"""Fixes the failed deployments: it folds the account function into the membership checkout function, so the site has 12 functions again (the free Vercel plan's limit).

Run it from the project folder, AFTER unzipping starscapes-function-fix-19oct.zip into it:   python3 tools/fix-function-count.py

What it does: it makes exact edits to three files that already exist (the membership checkout function, the browser's membership calls and the health check), adds lib/membershipAccount.js from the zip, and REMOVES api/membership-account.js (only if it is exactly the file I put there).
  api/membership-checkout.js, src/membership/membershipApi.js, tools/health-check.mjs

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-function-count.
  - It is safe to run twice: a file already done is left alone.
  - The new files (lib/membershipAccount.js) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/membership-checkout.js": [
[
"import { cleanPassIds } from '../src/membership/passes.js'\nimport { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { STRIPE, stripeMode, stripeHeaders, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\n",
"import { cleanPassIds } from '../src/membership/passes.js'\nimport { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'\nimport { STRIPE, stripeMode, stripeHeaders, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\n"
],
[
"\nexport default async function handler(req, res) {\n  res.setHeader('Cache-Control', 'no-store')\n\n",
"\nexport default async function handler(req, res) {\n  // A member's own passes (card, billing page, resume, change) are handled in lib/membershipAccount.js: this is the only membership function, because the free Vercel plan allows 12.\n  if (isAccountRequest(req)) return handleAccount(req, res)\n  res.setHeader('Cache-Control', 'no-store')\n\n"
]
],
"src/membership/membershipApi.js": [
[
"  const token = await signInToken()\n  try {\n    const res = await fetch('/api/membership-account', { cache: 'no-store', headers: authHeader(token) })\n    const body = await res.json()\n    const card = body && body.ok === true && body.card && /^\\d{4}$/.test(String(body.card.last4)) ? { brand: String(body.card.brand || 'card'), last4: String(body.card.last4) } : null\n",
"  const token = await signInToken()\n  try {\n    const res = await fetch('/api/membership-checkout?account=1', { cache: 'no-store', headers: authHeader(token) })\n    const body = await res.json()\n    const card = body && body.ok === true && body.card && /^\\d{4}$/.test(String(body.card.last4)) ? { brand: String(body.card.brand || 'card'), last4: String(body.card.last4) } : null\n"
],
[
"  let res\n  try {\n    res = await fetch('/api/membership-account', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader(token) }, body: JSON.stringify({ action, ...extra }) })\n  } catch (e) {\n    throw new Error('We could not reach the site just now. Check your connection and try again.')\n",
"  let res\n  try {\n    res = await fetch('/api/membership-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader(token) }, body: JSON.stringify({ action, ...extra }) })\n  } catch (e) {\n    throw new Error('We could not reach the site just now. Check your connection and try again.')\n"
]
],
"tools/health-check.mjs": [
[
"  ['Membership: the page talks to the server', 'src/membership/membershipApi.js', /startMembershipCheckout/, 'the membership payment update (the add-membership-payment script)'],\n  ['Membership: Come Write With Me is a pass', 'src/membership/passes.js', /come-write-with-me/, 'the membership payment update (the add-membership-payment script)'],\n  ['Membership: the account function', 'api/membership-account.js', /action === 'change'/, 'the account pages update (the add-membership-account script)'],\n  ['Membership: the account helpers', 'src/membership/account.js', /accountView/, 'the account pages update (the add-membership-account script)'],\n  ['Membership: the My passes page', 'src/membership/MyPassesPage.jsx', /Manage payment or cancel/, 'the account pages update (the add-membership-account script)'],\n",
"  ['Membership: the page talks to the server', 'src/membership/membershipApi.js', /startMembershipCheckout/, 'the membership payment update (the add-membership-payment script)'],\n  ['Membership: Come Write With Me is a pass', 'src/membership/passes.js', /come-write-with-me/, 'the membership payment update (the add-membership-payment script)'],\n  ['Membership: the account function', 'lib/membershipAccount.js', /action === 'change'/, 'the function-count fix (the fix-function-count script)'],\n  ['Membership: only one membership function', 'api/membership-checkout.js', /isAccountRequest/, 'the function-count fix (the fix-function-count script)'],\n  ['Membership: the account helpers', 'src/membership/account.js', /accountView/, 'the account pages update (the add-membership-account script)'],\n  ['Membership: the My passes page', 'src/membership/MyPassesPage.jsx', /Manage payment or cancel/, 'the account pages update (the add-membership-account script)'],\n"
]
]
}''')
NEW_FILES = ["lib/membershipAccount.js"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-function-fix-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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

DELETE = {"api/membership-account.js": "81f5e022ce5ea13ab1c6b43bbfe8f5d3050a3b1551736a8cc63da90526dea6fc"}
removals = []
import hashlib
for rel, digest in DELETE.items():
    p = root / rel
    if not p.exists():
        done.append(rel + ' (already removed)')
        continue
    if hashlib.sha256(p.read_bytes()).hexdigest() != digest:
        problems.append('%s is not the way I expected (it may have been changed since the last update), so I will not remove it' % rel)
        continue
    removals.append(rel)

if problems:
    print('NOTHING WAS CHANGED, because:')
    for line in problems:
        print('  - ' + line)
    print('Paste this to me and I will tell you what to do.')
    sys.exit(1)

for rel, (before, after) in plan.items():
    p = root / rel
    pathlib.Path(str(p) + '.before-function-count').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in removals:
    p = root / rel
    pathlib.Path(str(p) + '.before-function-count').write_bytes(p.read_bytes())
    p.unlink()
    print('removed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan and not removals:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
