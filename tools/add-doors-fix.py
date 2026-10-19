#!/usr/bin/env python3
"""Fixes the doors permission, and makes the Open a door page show the real reason when it cannot read the doors.

Run it from the project folder, AFTER unzipping starscapes-doors-fix-19oct.zip into it:   python3 tools/add-doors-fix.py

What it does: it makes exact edits to three files that already exist: the doors database file, the doors loader and the Open a door page.
  sql/doors.sql, src/doors/useDoors.js, src/admin/OpenDoors.jsx

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-doors-fix.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/admin/opendoors.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"sql/doors.sql": [
[
"-- WHO CAN DO WHAT: everyone can read it (the website needs to know which doors to show as open). Only the account with the email below\n-- can open or close a door, the same rule as your products, posts and photos.\n--\n-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in lock-editing-to-owner.sql.\n",
"-- WHO CAN DO WHAT: everyone can read it (the website needs to know which doors to show as open). Only the account with the email below\n-- can open or close a door, the same rule as your products, posts and photos.\n--\n-- PERMISSIONS: a table made in the SQL editor cannot be read by the website until it is granted permission, however good its rules are. The two grant lines near\n-- the end do that (visitors can read; only a signed-in account can write, and the rules above then limit that to you). Without them the Open a door page says\n-- \"I could not read the doors\".\n--\n-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in lock-editing-to-owner.sql.\n"
],
[
"  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');\n\n-- To confirm it worked, run this. It should list 4 rows:\n--   select policyname, cmd from pg_policies where tablename = 'doors' order by policyname;\n\n-- TO UNDO (run these lines if you ever need to):\n",
"  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');\n\ngrant select on public.doors to anon, authenticated;\ngrant insert, update, delete on public.doors to authenticated;\n\n-- To confirm it worked, run this. It should list 4 rows:\n--   select policyname, cmd from pg_policies where tablename = 'doors' order by policyname;\n-- And this should show SELECT for both anon and authenticated:\n--   select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'doors' order by grantee, privilege_type;\n\n-- TO UNDO (run these lines if you ever need to):\n"
]
],
"src/doors/useDoors.js": [
[
"\n// Which doors are open, asked once and remembered while the site is open, so every page shares one answer.\n// If the question fails for any reason, every door counts as closed.\nlet cache = null // { open: {}, failed: false }\nlet inflight = null\nconst listeners = new Set()\n",
"\n// Which doors are open, asked once and remembered while the site is open, so every page shares one answer.\n// If the question fails for any reason, every door counts as closed, and the reason the database gave is kept (for the owner's Open a door page).\nlet cache = null // { open: {}, failed: false, reason }\nlet inflight = null\nconst listeners = new Set()\n"
],
[
"    inflight = fetchDoors()\n      .then((open) => ({ open, failed: false }))\n      .catch(() => ({ open: {}, failed: true }))\n      .then((result) => {\n        cache = result\n",
"    inflight = fetchDoors()\n      .then((open) => ({ open, failed: false }))\n      .catch((e) => ({ open: {}, failed: true, reason: String((e && e.message) || '') }))\n      .then((result) => {\n        cache = result\n"
],
[
"  }, [])\n  const isOpen = useCallback((room, door) => Boolean(state && state.open[`${room}/${door}`]), [state])\n  return { ready: state !== null, failed: Boolean(state && state.failed), isOpen }\n}\n",
"  }, [])\n  const isOpen = useCallback((room, door) => Boolean(state && state.open[`${room}/${door}`]), [state])\n  return { ready: state !== null, failed: Boolean(state && state.failed), reason: (state && state.reason) || '', isOpen }\n}\n"
]
],
"src/admin/OpenDoors.jsx": [
[
"import { useOwnerCheck } from './useIsOwner'\nimport './admin.css'\n\nconst ROOM_ORDER = ['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'knowledge-nook', 'sarah-jrs-den']\n",
"import { useOwnerCheck } from './useIsOwner'\nimport './admin.css'\nimport './opendoors.css'\n\nconst ROOM_ORDER = ['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'knowledge-nook', 'sarah-jrs-den']\n"
],
[
"  useTitle('Open a door')\n  const { checking, owner } = useOwnerCheck(session)\n  const { ready, failed, isOpen } = useDoors()\n  const [busy, setBusy] = useState(null)\n  const [message, setMessage] = useState(null) // { ok, text }\n",
"  useTitle('Open a door')\n  const { checking, owner } = useOwnerCheck(session)\n  const { ready, failed, reason, isOpen } = useDoors()\n  const [busy, setBusy] = useState(null)\n  const [message, setMessage] = useState(null) // { ok, text }\n"
],
[
"      {failed && (\n        <FailureMessage title=\"I could not read the doors\">\n          Every door is staying closed for now. Has sql/doors.sql been run in Supabase? If it has, try again in a moment.\n        </FailureMessage>\n      )}\n",
"      {failed && (\n        <FailureMessage title=\"I could not read the doors\">\n          <span className=\"od-fail\">Every door is staying closed for now. The database said: &ldquo;{reason || 'no reason given'}&rdquo;.</span>\n          <span className=\"od-fail\">The usual cause is a missing permission on the doors table. In Supabase&apos;s SQL editor, paste and run these two lines (the lines themselves, not a file name), then reload this page:</span>\n          <code className=\"od-code\">grant select on public.doors to anon, authenticated;<br />grant insert, update, delete on public.doors to authenticated;</code>\n          <span className=\"od-fail\">If the database says the table does not exist, ask Claude for the doors SQL.</span>\n        </FailureMessage>\n      )}\n"
]
]
}''')
NEW_FILES = ["src/admin/opendoors.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/admin/OpenDoors.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('These files from earlier updates are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-doors-fix-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-doors-fix').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
