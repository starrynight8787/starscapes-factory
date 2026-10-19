#!/usr/bin/env python3
"""Gives the server's key its permission lines in the database files, and makes the site ask Stripe before it allows a second purchase.

Run it from the project folder, AFTER unzipping starscapes-cleanup-19oct.zip into it:   python3 tools/add-cleanup.py

What it does: it makes exact edits to six files that already exist (the membership checkout function, the Stripe helpers, the orders, ebook sign-ups and memberships database files, and the health check).
  api/membership-checkout.js, lib/membershipStripe.js, sql/orders.sql, sql/ebook-signups.sql, sql/memberships.sql, tools/health-check.mjs

How it keeps you safe:
  - It checks ALL 6 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-cleanup.
  - It is safe to run twice: a file already done is left alone.
  - The new files () come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/membership-checkout.js": [
[
"import { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'\nimport { STRIPE, stripeMode, stripeHeaders, logProblem, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n",
"import { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'\nimport { saveMembership } from './membership-webhook.js'\nimport { STRIPE, stripeMode, stripeHeaders, logProblem, findHeldSubscription, membershipRowFromSubscription, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n"
],
[
"  }\n\n  try {\n    let promotionCodeId = null\n",
"  }\n\n  // Our own table might not have caught up (a payment made but not yet recorded). So ask STRIPE too: if this person already holds passes there, do not take a second payment,\n  // and put their membership right in our table while we are about it.\n  let heldInStripe = null\n  try {\n    heldInStripe = await findHeldSubscription(who.user.id, who.user.email, k.key)\n  } catch (e) {\n    logProblem('looking for an existing subscription', e)\n    return say(res, 502, \"We couldn't check your account just now. Please try again in a moment.\")\n  }\n  if (heldInStripe) {\n    try {\n      const row = membershipRowFromSubscription(heldInStripe)\n      if (row) await saveMembership(row)\n    } catch (e) {\n      logProblem('putting a membership right', e)\n    }\n    return say(res, 409, 'You already have passes. If they have not shown on your account yet, give it a minute and refresh the page.', { reason: 'already_member' })\n  }\n\n  try {\n    let promotionCodeId = null\n"
]
],
"lib/membershipStripe.js": [
[
"}\n\n// ---- The account pages: change passes, cancel and resume, the card on file, and the billing page ----\n\n",
"}\n\n// ---- Has this person already paid? Asked of STRIPE, not just our own table ----\n\nconst HOLDING_STATES = ['active', 'trialing', 'past_due', 'unpaid']\n\n// Looks in Stripe for a subscription that belongs to this person (their customer record, by email; then a subscription that carries THEIR user id) and is still holding passes.\n// Returns it, or null. This is what stops a second purchase when our own table has not caught up (a payment that was made but not yet recorded). Throws if Stripe cannot be asked.\n// The lists are used, not Stripe's search: a list is up to date at once, and search can be a minute behind, which is exactly the moment this matters.\nexport async function findHeldSubscription(userId, email, key, doFetch = fetch) {\n  const id = clean(userId).toLowerCase()\n  const customers = await stripeCall(`/v1/customers?email=${encodeURIComponent(clean(email))}&limit=10`, key, doFetch)\n  if (!customers.ok) throw stripeFailure('look for your customer record', customers)\n  for (const customer of (customers.body && Array.isArray(customers.body.data) ? customers.body.data : [])) {\n    if (!customer || typeof customer.id !== 'string') continue\n    const subs = await stripeCall(`/v1/subscriptions?customer=${encodeURIComponent(customer.id)}&status=all&limit=20`, key, doFetch)\n    if (!subs.ok) throw stripeFailure('list your subscriptions', subs)\n    const found = (subs.body && Array.isArray(subs.body.data) ? subs.body.data : []).find((s) => s && s.metadata && clean(s.metadata.user_id).toLowerCase() === id && HOLDING_STATES.includes(s.status))\n    if (found) return found\n  }\n  return null\n}\n\n// ---- The account pages: change passes, cancel and resume, the card on file, and the billing page ----\n\n"
]
],
"sql/orders.sql": [
[
"-- Only your server (with the service key kept in Vercel) can.\nalter table public.orders enable row level security;\n",
"-- Only your server (with the service key kept in Vercel) can.\nalter table public.orders enable row level security;\n\n-- The SERVER's key (service_role) is the only thing that reads and writes orders (the Stripe listener saves them, the orders list shows them). A table made in the SQL editor gives that key\n-- no permission until it is granted. Visitors and signed-in people get nothing: there is no grant for them, and no rule that lets them in.\ngrant select, insert, update, delete on public.orders to service_role;\n"
]
],
"sql/ebook-signups.sql": [
[
"revoke all on public.ebook_signups from anon, authenticated;\n\n-- To confirm it worked, run this. It should list 0 policies (that is right: no visitor can touch the table):\n--   select count(*) from pg_policies where tablename = 'ebook_signups';\n",
"revoke all on public.ebook_signups from anon, authenticated;\n\n-- Only the SERVER's key (service_role) reads and writes sign-ups, and a table made in the SQL editor gives that key no permission until it is granted.\ngrant select, insert, update, delete on public.ebook_signups to service_role;\n\n-- To confirm it worked, run this. It should list 0 policies (that is right: no visitor can touch the table):\n--   select count(*) from pg_policies where tablename = 'ebook_signups';\n"
]
],
"sql/memberships.sql": [
[
"\ngrant select on public.memberships to authenticated;\n\ncreate table if not exists public.founding_members (\n",
"\ngrant select on public.memberships to authenticated;\n-- The SERVER's key (service_role) writes memberships (when Stripe says someone paid, changed or cancelled) and reads them (to stop a second purchase). Without this line the site cannot even\n-- check whether a person already holds passes. A table made in the SQL editor gives that key no permission until it is granted.\ngrant select, insert, update, delete on public.memberships to service_role;\n\ncreate table if not exists public.founding_members (\n"
],
[
"grant select (display_name, show_name, created_at) on public.founding_members to anon, authenticated;\ngrant update (display_name, show_name) on public.founding_members to authenticated;\n\n-- To confirm it worked, run these. The first should list 4 rows, the second should show SELECT for authenticated on memberships:\n",
"grant select (display_name, show_name, created_at) on public.founding_members to anon, authenticated;\ngrant update (display_name, show_name) on public.founding_members to authenticated;\ngrant select, insert, update, delete on public.founding_members to service_role; -- the server adds and manages founding members\n\n-- To confirm it worked, run these. The first should list 4 rows, the second should show SELECT for authenticated on memberships:\n"
]
],
"tools/health-check.mjs": [
[
"  ['Membership: changes are priced under an active product', 'lib/membershipStripe.js', /PRODUCT_ID/, 'the change fix (the fix-change-passes script)'],\n  ['Membership: failures are written to the log', 'lib/membershipStripe.js', /logProblem/, 'the change fix (the fix-change-passes script)'],\n]\n\n",
"  ['Membership: changes are priced under an active product', 'lib/membershipStripe.js', /PRODUCT_ID/, 'the change fix (the fix-change-passes script)'],\n  ['Membership: failures are written to the log', 'lib/membershipStripe.js', /logProblem/, 'the change fix (the fix-change-passes script)'],\n  ['Membership: a second purchase is checked with Stripe', 'lib/membershipStripe.js', /findHeldSubscription/, 'the clean-up update (the add-cleanup script)'],\n  ['Server tables: orders lets the server key in', 'sql/orders.sql', /to service_role/, 'the clean-up update (the add-cleanup script)'],\n  ['Server tables: sign-ups let the server key in', 'sql/ebook-signups.sql', /to service_role/, 'the clean-up update (the add-cleanup script)'],\n  ['Server tables: memberships let the server key in', 'sql/memberships.sql', /to service_role/, 'the clean-up update (the add-cleanup script)'],\n]\n\n"
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
    print('Unzip starscapes-cleanup-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-cleanup').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
