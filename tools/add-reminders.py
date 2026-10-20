#!/usr/bin/env python3
"""Adds the daily renewal reminder emails: the job, the reminder wording (owner-only until approved), the schedule, and the table that records what was sent.

Run it from the project folder, AFTER unzipping starscapes-reminders-20oct.zip into it:   python3 tools/add-reminders.py

What it does: it makes exact edits to two files that already exist (the payment function and Vercel's settings) and adds five new files from the zip (the unzip itself also adds four test files).
  api/membership-checkout.js, vercel.json

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-reminders.
  - It is safe to run twice: a file already done is left alone.
  - The new files (lib/membershipReminders.js, lib/reminderEmailText.js, src/membership/reminderRules.js, sql/membership-notices.sql, INSTALL-REMINDERS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/membership-checkout.js": [
[
"import { requireOwner } from '../lib/ownerGuard.js'\nimport { requireUser } from '../lib/userGuard.js'\nimport { serviceFetch } from '../lib/serviceKey.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\n",
"import { requireOwner } from '../lib/ownerGuard.js'\nimport { requireUser } from '../lib/userGuard.js'\nimport { handleReminders, isReminderRequest } from '../lib/membershipReminders.js'\nimport { serviceFetch } from '../lib/serviceKey.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\n"
],
[
"  // A member's own passes (card, billing page, resume, change) are handled in lib/membershipAccount.js: this is the only membership function, because the free Vercel plan allows 12.\n  if (isAccountRequest(req)) return handleAccount(req, res)\n  res.setHeader('Cache-Control', 'no-store')\n\n",
"  // A member's own passes (card, billing page, resume, change) are handled in lib/membershipAccount.js: this is the only membership function, because the free Vercel plan allows 12.\n  if (isAccountRequest(req)) return handleAccount(req, res)\n  // The daily reminder job (asked for by Vercel's scheduler, see vercel.json) is handled in lib/membershipReminders.js, for the same reason\n  if (isReminderRequest(req)) return handleReminders(req, res)\n  res.setHeader('Cache-Control', 'no-store')\n\n"
]
],
"vercel.json": [
[
"{\n  \"rewrites\": [\n    {\n",
"{\n  \"crons\": [\n    {\n      \"path\": \"/api/membership-checkout?reminders=1\",\n      \"schedule\": \"0 8 * * *\"\n    }\n  ],\n  \"rewrites\": [\n    {\n"
]
]
}''')
NEW_FILES = ["lib/membershipReminders.js", "lib/reminderEmailText.js", "src/membership/reminderRules.js", "sql/membership-notices.sql", "INSTALL-REMINDERS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/changeWindow.js", "lib/orderEmailText.js", "lib/membershipStripe.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier membership and order email packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-reminders-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-reminders').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
