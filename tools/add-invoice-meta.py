#!/usr/bin/env python3
"""Adds the invoice page to the table of page names: a tab title, and kept out of search results and the sitemap.

Run it from the project folder, AFTER unzipping starscapes-invoice-meta-20oct.zip into it:   python3 tools/add-invoice-meta.py

What it does: it adds one line to one file that already exists (the table of page names) and adds one new file from the zip (the unzip itself also adds one test).
  src/data/pageMeta.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-invoice-meta.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-INVOICE-META.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/pageMeta.js": [
[
"  '/reset-password': { title: 'Choose a new password', description: 'Choose a new password for your account.', image: 'site', index: false, client: true },\n  '/checkout/success': { title: 'Thank you', description: 'Your order has been received.', image: 'site', index: false, client: true },\n  '/products': { title: 'Shop', description: 'The original shop page.', image: 'site', index: false, client: true },\n  '/new': { title: 'New post', description: 'Write a new post.', image: 'site', index: false, client: true },\n",
"  '/reset-password': { title: 'Choose a new password', description: 'Choose a new password for your account.', image: 'site', index: false, client: true },\n  '/checkout/success': { title: 'Thank you', description: 'Your order has been received.', image: 'site', index: false, client: true },\n  '/invoice': { title: 'Your invoice', description: 'Your invoice for your order from Starscapes Factory.', image: 'site', index: false, client: true },\n  '/products': { title: 'Shop', description: 'The original shop page.', image: 'site', index: false, client: true },\n  '/new': { title: 'New post', description: 'Write a new post.', image: 'site', index: false, client: true },\n"
]
]
}''')
NEW_FILES = ["INSTALL-INVOICE-META.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/invoice/InvoicePage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the invoice page first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-invoice-meta-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-invoice-meta').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
