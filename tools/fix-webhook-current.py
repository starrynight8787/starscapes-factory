#!/usr/bin/env python3
"""Makes the membership webhook follow only a person's CURRENT subscription, so an old or duplicate subscription cannot overwrite it.

Run it from the project folder, AFTER unzipping starscapes-webhook-fix-19oct.zip into it:   python3 tools/fix-webhook-current.py

What it does: it makes exact edits to three files that already exist (the membership webhook, the Stripe helpers and the health check).
  api/membership-webhook.js, lib/membershipStripe.js, tools/health-check.mjs

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-webhook-current.
  - It is safe to run twice: a file already done is left alone.
  - The new files () come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/membership-webhook.js": [
[
"import { signatureIsGood } from './stripe-webhook.js'\nimport { serviceFetch } from '../lib/serviceKey.js'\nimport { fetchSubscription, membershipRowFromSubscription, stripeMode, logProblem } from '../lib/membershipStripe.js'\n\nexport const config = { maxDuration: 30 }\n",
"import { signatureIsGood } from './stripe-webhook.js'\nimport { serviceFetch } from '../lib/serviceKey.js'\nimport { fetchSubscription, membershipRowFromSubscription, stripeMode, logProblem, isHolding } from '../lib/membershipStripe.js'\n\nexport const config = { maxDuration: 30 }\n"
],
[
"  })\n  if (!response.ok) throw new Error(`database answered ${response.status}`)\n}\n\n",
"  })\n  if (!response.ok) throw new Error(`database answered ${response.status}`)\n}\n\n// What our table already holds for this person (one row each), so news about a DIFFERENT subscription cannot overwrite it\nasync function currentRecord(userId) {\n  const response = await serviceFetch(`/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}&select=stripe_subscription_id,status`, { headers: { Accept: 'application/json' } })\n  if (!response.ok) throw new Error(`database answered ${response.status}`)\n  const rows = await response.json()\n  return Array.isArray(rows) && rows[0] ? rows[0] : null\n}\n\n"
],
[
"    const row = membershipRowFromSubscription(sub)\n    if (!row) return reply(200, { ok: true, ignored: 'not from our checkout' })\n    await saveMembership(row)\n    return reply(200, { ok: true, membership: row.status })\n",
"    const row = membershipRowFromSubscription(sub)\n    if (!row) return reply(200, { ok: true, ignored: 'not from our checkout' })\n\n    // One row per person, so the row must follow the person's CURRENT subscription. If this news is about a DIFFERENT subscription from the one we hold, it must not overwrite it while the one\n    // we hold is still going (an old subscription ending, or a second one bought by mistake, must not lock out someone whose current passes are fine). We check with Stripe that the one we\n    // hold really is still going, because our own record might be out of date; if it is not, this subscription takes over (a new purchase after the old passes ended).\n    const held = await currentRecord(row.user_id)\n    if (held && held.stripe_subscription_id && held.stripe_subscription_id !== row.stripe_subscription_id && isHolding(held.status)) {\n      const current = await fetchSubscription(held.stripe_subscription_id, key)\n      if (isHolding(current.status)) {\n        if (isHolding(row.status)) logProblem('a second subscription is holding passes for the same person', new Error(`kept ${held.stripe_subscription_id}, ignored ${row.stripe_subscription_id}: one of them needs cancelling in Stripe`))\n        return reply(200, { ok: true, ignored: 'not the current subscription' })\n      }\n    }\n    await saveMembership(row)\n    return reply(200, { ok: true, membership: row.status })\n"
]
],
"lib/membershipStripe.js": [
[
"\nconst HOLDING_STATES = ['active', 'trialing', 'past_due', 'unpaid']\n\n// Looks in Stripe for a subscription that belongs to this person (their customer record, by email; then a subscription that carries THEIR user id) and is still holding passes.\n",
"\nconst HOLDING_STATES = ['active', 'trialing', 'past_due', 'unpaid']\n// Is a subscription in a state where its owner still has (or is about to settle) a membership? (Not cancelled, not unfinished.)\nexport const isHolding = (status) => HOLDING_STATES.includes(status)\n\n// Looks in Stripe for a subscription that belongs to this person (their customer record, by email; then a subscription that carries THEIR user id) and is still holding passes.\n"
]
],
"tools/health-check.mjs": [
[
"  ['Locked posts: the New post form has the Pass choice', 'src/pages/NewPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n  ['Locked posts: the Edit post form has the Pass choice', 'src/pages/EditPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n]\n\n",
"  ['Locked posts: the New post form has the Pass choice', 'src/pages/NewPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n  ['Locked posts: the Edit post form has the Pass choice', 'src/pages/EditPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n  ['Membership: the webhook follows the current subscription', 'api/membership-webhook.js', /not the current subscription/, 'the webhook tidy-up (the fix-webhook-current script)'],\n]\n\n"
]
]
}''')
NEW_FILES = []

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-webhook-fix-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-webhook-current').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
