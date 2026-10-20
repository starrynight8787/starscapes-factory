#!/usr/bin/env python3
"""Builds the Promotions page for the admin (/admin/promotions): the half-price first year (read-only) and discount codes (make, list, switch off or on), and the owner-only server request behind it (inside the membership function, so there is no 13th function).

Run it from the project folder, AFTER unzipping starscapes-promotions-admin-20oct.zip into it:   python3 tools/add-promotions-admin.py

What it does: it makes exact edits to four files that already exist (the admin server hand-off from the Passes and members package, the app's routes, the admin tool list and the page titles) and adds six new files from the zip (the unzip itself also adds three tests and replaces two).
  lib/membershipAdmin.js, src/App.jsx, src/admin/adminTools.js, src/data/pageMeta.js

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-promotions-admin.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PROMOTIONS-ADMIN.txt, lib/promotionsAdmin.js, src/admin/AdminPromotions.jsx, src/admin/adminpromotions.css, src/admin/promotionsAdminApi.js, src/admin/promotionsRules.js) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"lib/membershipAdmin.js": [
[
"import { accountView } from '../src/membership/account.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\n",
"import { accountView } from '../src/membership/account.js'\nimport { handlePromotions } from './promotionsAdmin.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\n"
],
[
"  if (!who.ok) return sendDenied(res, who)\n  if (req.method !== 'GET') {\n",
"  if (!who.ok) return sendDenied(res, who)\n  if (clean(req.query && req.query.admin) === 'promotions') return handlePromotions(req, res) // codes can be made as well as looked at\n  if (req.method !== 'GET') {\n"
]
],
"src/App.jsx": [
[
"import AdminMembers from './admin/AdminMembers'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n",
"import AdminMembers from './admin/AdminMembers'\nimport AdminPromotions from './admin/AdminPromotions'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n"
],
[
"<Route path=\"/admin/members\" element={ <ProtectedRoute session={session}> <AdminMembers session={session} /> </ProtectedRoute> } />\n          <Route\n",
"<Route path=\"/admin/members\" element={ <ProtectedRoute session={session}> <AdminMembers session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/promotions\" element={ <ProtectedRoute session={session}> <AdminPromotions session={session} /> </ProtectedRoute> } />\n          <Route\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Members', name: 'Passes and members', to: '/admin/members', blurb: 'The five passes, who has them, when each member pays next, and what the passes cost.', icon: 'passes' },\n  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.', icon: 'promo' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.', icon: 'door' },\n",
"  { group: 'Members', name: 'Passes and members', to: '/admin/members', blurb: 'The five passes, who has them, when each member pays next, and what the passes cost.', icon: 'passes' },\n  { group: 'Members', name: 'Promotions', to: '/admin/promotions', blurb: 'The half-price first year, and discount codes for passes: make one, see how often it is used, and switch it off.', icon: 'promo' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.', icon: 'door' },\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin/members': { title: 'Passes and members', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin/members': { title: 'Passes and members', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/promotions': { title: 'Promotions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
]
}''')
NEW_FILES = ["INSTALL-PROMOTIONS-ADMIN.txt", "lib/promotionsAdmin.js", "src/admin/AdminPromotions.jsx", "src/admin/adminpromotions.css", "src/admin/promotionsAdminApi.js", "src/admin/promotionsRules.js"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["lib/membershipAdmin.js", "src/admin/AdminMembers.jsx", "src/admin/membersRules.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the Passes and members package first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-promotions-admin-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-promotions-admin').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
