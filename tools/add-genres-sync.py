#!/usr/bin/env python3
"""Brings the project's copy of the books database file up to date with the 20 genres the site offers (the live database already allows them).

Run it from the project folder, AFTER unzipping starscapes-genres-sync-20oct.zip into it:   python3 tools/add-genres-sync.py

What it does: it makes exact edits to one file that already exists (the books database file) and adds one new file from the zip (the unzip itself also replaces two test files).
  sql/books.sql

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-genres-sync.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-GENRES-SYNC.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"sql/books.sql": [
[
"-- the same rule as your doors, products and posts.\n--\n-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in doors.sql.\n-- To undo it at any time, run the DROP lines at the very bottom. Nothing else depends on these tables.\n",
"-- the same rule as your doors, products and posts.\n--\n-- THE 20 GENRES: the list of genres below is the one the site now offers (src/bookclub/bookRules.js). The live database was already changed to allow them. A database made from an older copy of this file only allows the\n-- first five; to bring it up to date, run these two lines once:\n--   alter table public.books drop constraint if exists books_genre_check;\n--   alter table public.books add constraint books_genre_check check (genre is null or genre in ('leadership', 'fiction', 'memoir', 'self-growth', 'childrens', 'business', 'creativity', 'productivity', 'parenting', 'mindset', 'biography', 'fantasy', 'mystery', 'romance', 'sci-fi', 'historical-fiction', 'classics', 'picture-books', 'history', 'poetry'));\n--\n-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in doors.sql.\n-- To undo it at any time, run the DROP lines at the very bottom. Nothing else depends on these tables.\n"
],
[
"  title text not null check (char_length(btrim(title)) between 1 and 150),\n  author text check (author is null or char_length(author) <= 100),\n  genre text check (genre is null or genre in ('leadership', 'fiction', 'memoir', 'self-growth', 'childrens')),\n  status text not null default 'read' check (status in ('reading', 'read', 'upnext')),\n  started date,\n",
"  title text not null check (char_length(btrim(title)) between 1 and 150),\n  author text check (author is null or char_length(author) <= 100),\n  genre text check (genre is null or genre in ('leadership', 'fiction', 'memoir', 'self-growth', 'childrens', 'business', 'creativity', 'productivity', 'parenting', 'mindset', 'biography', 'fantasy', 'mystery', 'romance', 'sci-fi', 'historical-fiction', 'classics', 'picture-books', 'history', 'poetry')),\n  status text not null default 'read' check (status in ('reading', 'read', 'upnext')),\n  started date,\n"
]
]
}''')
NEW_FILES = ["INSTALL-GENRES-SYNC.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/bookclub/bookRules.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier Book Club packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-genres-sync-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-genres-sync').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
