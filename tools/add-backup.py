#!/usr/bin/env python3
"""Adds a 'Download a backup' tile and page to Admin: one button saves the whole database to one file on the owner's computer, through the existing owner-only function (no new function). It refuses to save a half-finished backup. The new files and tests are only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-backup-22oct.zip into it:   python3 tools/add-backup.py

What it does: it makes exact edits to 5 files and, only if all succeed, puts the eleven new backup files in place.
  api/order-actions.js, src/App.jsx, src/admin/AdminConsole.jsx, src/admin/adminTools.js, src/data/pageMeta.js

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-backup.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-BACKUP.txt, tools/backup-files/lib_backupData.js.staged, tools/backup-files/lib_backupTables.js.staged, tools/backup-files/src_admin_AdminBackup.jsx.staged, tools/backup-files/src_admin_adminbackup.css.staged, tools/backup-files/src_admin_makeBackup.js.staged, tools/backup-files/src_admin_saveFile.js.staged, tools/backup-files/test_admin-backup-page.test.jsx.staged, tools/backup-files/test_backup-action.test.js.staged, tools/backup-files/test_backup-data.test.js.staged, tools/backup-files/test_backup-tables.test.js.staged, tools/backup-files/test_make-backup.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/order-actions.js": [
[
"//   sending_state  whether real payments go to Creative Hub by themselves, and whether the customer emails are ready\n//   send_sample    for a TEST order only: send the owner a sample of a short customer email (with its TEST banner), so she can read the wording before approving it\n",
"//   sending_state  whether real payments go to Creative Hub by themselves, and whether the customer emails are ready\n//   backup_plan, backup_page, backup_users   the owner's \"Download a backup\" (Admin): the list of tables, then one page of a table or of the accounts at a time (lib/backupData.js)\n//   send_sample    for a TEST order only: send the owner a sample of a short customer email (with its TEST banner), so she can read the wording before approving it\n"
],
[
"import { databaseUrl, serviceKeys, serviceFetch, saidWhat } from '../lib/serviceKey.js'\nimport { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, getOrder, listOrders, summariseOrder, candidatesFor, isSafeOrderId, buildPayload } from '../lib/creativehubOrders.js'\n",
"import { databaseUrl, serviceKeys, serviceFetch, saidWhat } from '../lib/serviceKey.js'\nimport { backupPlan, readTablePage, readUsersPage } from '../lib/backupData.js'\nimport { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, getOrder, listOrders, summariseOrder, candidatesFor, isSafeOrderId, buildPayload } from '../lib/creativehubOrders.js'\n"
],
[
"\nconst ACTIONS = { refresh, check, link, send, mark_refunded: markRefunded, send_sample: sendSample, sending_state: sendingState, resend_confirmation: resendConfirmation, send_dispatch: sendDispatch }\n\n",
"\n// ---------- the owner's backup (Admin, \"Download a backup\") ----------\n// Read-only. Only for the owner (the same guard as everything here), and only tables on the approved list in lib/backupTables.js. The answers are never kept: the browser puts them in a file on her computer.\nconst reading = async (res, work, what) => {\n  try {\n    const r = await work()\n    if (!r.ok) return bad(res, r.status || 502, r.message)\n    return res.status(200).json(r)\n  } catch (e) {\n    return bad(res, 502, `The backup could not read ${what} just now. Nothing was changed. Please try again in a moment.`)\n  }\n}\nasync function backupPlanAction(res) { return res.status(200).json({ ok: true, ...backupPlan() }) }\nasync function backupPageAction(res, body) { return reading(res, () => readTablePage(body.table, body.offset), 'the data') }\nasync function backupUsersAction(res, body) { return reading(res, () => readUsersPage(body.page), 'the list of accounts') }\n\nconst ACTIONS = { backup_plan: backupPlanAction, backup_page: backupPageAction, backup_users: backupUsersAction, refresh, check, link, send, mark_refunded: markRefunded, send_sample: sendSample, sending_state: sendingState, resend_confirmation: resendConfirmation, send_dispatch: sendDispatch }\n\n"
]
],
"src/App.jsx": [
[
"import AdminPromotions from './admin/AdminPromotions'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n",
"import AdminPromotions from './admin/AdminPromotions'\nimport AdminBackup from './admin/AdminBackup'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n"
],
[
"<Route path=\"/admin/promotions\" element={ <ProtectedRoute session={session}> <AdminPromotions session={session} /> </ProtectedRoute> } />\n          <Route\n",
"<Route path=\"/admin/promotions\" element={ <ProtectedRoute session={session}> <AdminPromotions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/backup\" element={ <ProtectedRoute session={session}> <AdminBackup session={session} /> </ProtectedRoute> } />\n          <Route\n"
]
],
"src/admin/AdminConsole.jsx": [
[
"  stories: <><path d=\"M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z\" /><path d=\"M8 8h6\" /></>,\n  ideas: <><path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z\" /></>,\n",
"  stories: <><path d=\"M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z\" /><path d=\"M8 8h6\" /></>,\n  backup: <><path d=\"M12 4v11\" /><path d=\"M7.5 11l4.5 4.5 4.5-4.5\" /><path d=\"M4 19h16\" /></>,\n  ideas: <><path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z\" /></>,\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Shop', name: 'Prints, orders and Creative Hub', to: '/art-loft/admin', blurb: 'Switch prints on, sort them into collections, write descriptions, sync with Creative Hub, and see your orders.', icon: 'hub' },\n  { group: 'Shop', name: 'Originals', to: '/art-loft/admin/originals', blurb: 'Add your original paintings, mark them sold, and switch them on.', icon: 'originals' },\n",
"  { group: 'Shop', name: 'Prints, orders and Creative Hub', to: '/art-loft/admin', blurb: 'Switch prints on, sort them into collections, write descriptions, sync with Creative Hub, and see your orders.', icon: 'hub' },\n  { group: 'Shop', name: 'Download a backup', to: '/admin/backup', blurb: 'Save a copy of your orders, members, posts and everything else to your own computer, so nothing is lost if something goes wrong.', icon: 'backup' },\n  { group: 'Shop', name: 'Originals', to: '/art-loft/admin/originals', blurb: 'Add your original paintings, mark them sold, and switch them on.', icon: 'originals' },\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin/promotions': { title: 'Promotions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin/promotions': { title: 'Promotions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/backup': { title: 'Download a backup', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
]
}''')
STAGED = {
    'lib/backupTables.js': 'tools/backup-files/lib_backupTables.js.staged',
    'lib/backupData.js': 'tools/backup-files/lib_backupData.js.staged',
    'src/admin/makeBackup.js': 'tools/backup-files/src_admin_makeBackup.js.staged',
    'src/admin/saveFile.js': 'tools/backup-files/src_admin_saveFile.js.staged',
    'src/admin/AdminBackup.jsx': 'tools/backup-files/src_admin_AdminBackup.jsx.staged',
    'src/admin/adminbackup.css': 'tools/backup-files/src_admin_adminbackup.css.staged',
    'test/backup-tables.test.js': 'tools/backup-files/test_backup-tables.test.js.staged',
    'test/backup-data.test.js': 'tools/backup-files/test_backup-data.test.js.staged',
    'test/backup-action.test.js': 'tools/backup-files/test_backup-action.test.js.staged',
    'test/make-backup.test.js': 'tools/backup-files/test_make-backup.test.js.staged',
    'test/admin-backup-page.test.jsx': 'tools/backup-files/test_admin-backup-page.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-BACKUP.txt", "tools/backup-files/lib_backupData.js.staged", "tools/backup-files/lib_backupTables.js.staged", "tools/backup-files/src_admin_AdminBackup.jsx.staged", "tools/backup-files/src_admin_adminbackup.css.staged", "tools/backup-files/src_admin_makeBackup.js.staged", "tools/backup-files/src_admin_saveFile.js.staged", "tools/backup-files/test_admin-backup-page.test.jsx.staged", "tools/backup-files/test_backup-action.test.js.staged", "tools/backup-files/test_backup-data.test.js.staged", "tools/backup-files/test_backup-tables.test.js.staged", "tools/backup-files/test_make-backup.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-backup-22oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-backup').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
for target, source in STAGED.items():
    t, src = root / target, root / source
    new_text = src.read_text(encoding='utf-8')
    if t.exists() and t.read_text(encoding='utf-8') == new_text:
        print('already done  ' + target)
        continue
    if t.exists():
        pathlib.Path(str(t) + '.before-backup').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
