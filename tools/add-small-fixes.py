#!/usr/bin/env python3
"""Adds a description box for the book being read (Admin, Books and the Book Club page), makes Reading now as tall as the Shelf, and brings two guard tests up to date. (The unzip also replaces the share picture with a smaller identical one.)

Run it from the project folder, AFTER unzipping starscapes-small-fixes-20oct.zip into it:   python3 tools/add-small-fixes.py

What it does: it makes exact edits to six files that already exist (the book rules, the book database calls, the Book Club page and its styles, the books admin form and the books SQL file) and adds two new files from the zip (the unzip itself also replaces the share picture and five test files, and adds one test).
  src/bookclub/bookRules.js, src/bookclub/bookApi.js, src/bookclub/BookClubPage.jsx, src/bookclub/bookclub.css, src/admin/AdminBooks.jsx, sql/books.sql

How it keeps you safe:
  - It checks ALL 6 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-small-fixes.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/books-about.sql, INSTALL-SMALL-FIXES.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/bookclub/bookRules.js": [
[
"  { key: 'upnext', label: 'Up next' },\n]\nexport const LIMITS = { title: 150, author: 100, note: 300, theme: 120, goalMax: 999 }\n\nconst tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\\u0000-\\u001f\\u007f]/g, ' ').replace(/\\s+/g, ' ').trim()\nconst isDate = (v) => /^\\d{4}-\\d{2}-\\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v\nexport const safeCover = (url) => (/^https:\\/\\/[^\\s'\"<>]+\\.(jpe?g|png|webp)(\\?[^\\s'\"<>]*)?$/i.test(String(url || '').trim()) ? String(url).trim() : '')\n",
"  { key: 'upnext', label: 'Up next' },\n]\nexport const LIMITS = { title: 150, author: 100, note: 300, about: 1000, theme: 120, goalMax: 999 }\n\nconst tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\\u0000-\\u001f\\u007f]/g, ' ').replace(/\\s+/g, ' ').trim()\n// A few paragraphs about a book: line breaks are kept (a blank line starts a new paragraph), spaces are tidied, and control characters are removed.\nexport const tidyText = (v) => String(v === null || v === undefined ? '' : v).replace(/\\r\\n?/g, '\\n').replace(/[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]/g, ' ').split('\\n').map((l) => l.replace(/[ \\t]+/g, ' ').trim()).join('\\n').replace(/\\n{3,}/g, '\\n\\n').trim()\n// What the page shows for it: a list of paragraphs (a single line break inside one is just a space)\nexport const aboutParagraphs = (text) => tidyText(text).split(/\\n\\s*\\n/).map((p) => p.replace(/\\s*\\n\\s*/g, ' ').trim()).filter(Boolean)\nconst isDate = (v) => /^\\d{4}-\\d{2}-\\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v\nexport const safeCover = (url) => (/^https:\\/\\/[^\\s'\"<>]+\\.(jpe?g|png|webp)(\\?[^\\s'\"<>]*)?$/i.test(String(url || '').trim()) ? String(url).trim() : '')\n"
],
[
"  const finished = tidy(i.finished)\n  const note = tidy(i.note)\n  const coverText = tidy(i.cover)\n  const reviewText = tidy(i.review)\n",
"  const finished = tidy(i.finished)\n  const note = tidy(i.note)\n  const about = tidyText(i.about)\n  const coverText = tidy(i.cover)\n  const reviewText = tidy(i.review)\n"
],
[
"  if (rating && !/^[1-5]$/.test(rating)) errors.rating = 'The rating is a whole number from 1 to 5, or empty.'\n  if (note.length > LIMITS.note) errors.note = `Keep the note to ${LIMITS.note} characters or fewer.`\n  if (coverText && !safeCover(coverText)) errors.cover = 'The cover must be a web address that starts https:// and ends .jpg, .png or .webp.'\n  if (reviewText && !postIdFrom(reviewText)) errors.review = 'Paste the post\\u2019s address (it ends /post/ and a code), or just the code.'\n",
"  if (rating && !/^[1-5]$/.test(rating)) errors.rating = 'The rating is a whole number from 1 to 5, or empty.'\n  if (note.length > LIMITS.note) errors.note = `Keep the note to ${LIMITS.note} characters or fewer.`\n  if (about.length > LIMITS.about) errors.about = `Keep what the book is about to ${LIMITS.about} characters or fewer.`\n  if (coverText && !safeCover(coverText)) errors.cover = 'The cover must be a web address that starts https:// and ends .jpg, .png or .webp.'\n  if (reviewText && !postIdFrom(reviewText)) errors.review = 'Paste the post\\u2019s address (it ends /post/ and a code), or just the code.'\n"
],
[
"      review_post_id: reviewText ? postIdFrom(reviewText) : null,\n      note: note || null,\n    },\n  }\n",
"      review_post_id: reviewText ? postIdFrom(reviewText) : null,\n      note: note || null,\n      about: about || null,\n    },\n  }\n"
]
],
"src/bookclub/bookApi.js": [
[
"// The books, newest finished first. A problem comes back as plain words.\nexport async function fetchBooks() {\n  const { data, error } = await supabase.from('books').select('id, title, author, genre, status, started, finished, rating, cover_url, review_post_id, note, created_at').order('finished', { ascending: false, nullsFirst: false })\n  if (error) throw new Error(plain(error))\n  return Array.isArray(data) ? data : []\n",
"// The books, newest finished first. A problem comes back as plain words.\nexport async function fetchBooks() {\n  const columns = 'id, title, author, genre, status, started, finished, rating, cover_url, review_post_id, note, created_at'\n  const ask = (list) => supabase.from('books').select(list).order('finished', { ascending: false, nullsFirst: false })\n  let { data, error } = await ask(`${columns}, about`)\n  // Before the \"about\" column has been added to the database (sql/books-about.sql), asking for it fails: ask again without it, so the page never breaks\n  if (error && /\\babout\\b/i.test(String(error.message || error))) ({ data, error } = await ask(columns))\n  if (error) throw new Error(plain(error))\n  return Array.isArray(data) ? data : []\n"
],
[
"export async function saveBook(id, value) {\n  const { error } = id ? await supabase.from('books').update(value).eq('id', id) : await supabase.from('books').insert(value)\n  if (error) throw new Error(plain(error))\n}\n",
"export async function saveBook(id, value) {\n  const { error } = id ? await supabase.from('books').update(value).eq('id', id) : await supabase.from('books').insert(value)\n  // A save that includes \"about\" cannot work until sql/books-about.sql has been run in Supabase: say so plainly rather than a vague failure\n  if (error && /\\babout\\b/i.test(String(error.message || error)) && value && value.about !== undefined) throw new Error('The \"about\" box needs one small step in Supabase first (run sql/books-about.sql). Nothing was saved.')\n  if (error) throw new Error(plain(error))\n}\n"
]
],
"src/bookclub/BookClubPage.jsx": [
[
"import SuggestPanel from '../suggest/SuggestPanel'\nimport { fetchBooks, fetchGoals } from './bookApi'\nimport { GENRES, progress, safeCover, shelfFor, spineClass, starsText, yearsOf } from './bookRules'\nimport { COME_READ, GENRES_INTRO, MEMBER_BENEFITS, SHELF_INTRO, SUBTITLE, THEME_FALLBACK, THEME_INTRO, VIDEO_ID, WELCOME } from './bookClubData'\nimport '../rooms/roompages.css'\n",
"import SuggestPanel from '../suggest/SuggestPanel'\nimport { fetchBooks, fetchGoals } from './bookApi'\nimport { GENRES, aboutParagraphs, progress, safeCover, shelfFor, spineClass, starsText, yearsOf } from './bookRules'\nimport { COME_READ, GENRES_INTRO, MEMBER_BENEFITS, SHELF_INTRO, SUBTITLE, THEME_FALLBACK, THEME_INTRO, VIDEO_ID, WELCOME } from './bookClubData'\nimport '../rooms/roompages.css'\n"
],
[
"                <h3 className=\"bc__now-title\">{b.title}</h3>\n                <p className=\"bc__muted\">{[b.author, b.note].filter(Boolean).join('. ')}</p>\n                {b.review_post_id && <Link className=\"pg-btn\" to={`/post/${b.review_post_id}`}>Read my notes</Link>}\n              </div>\n",
"                <h3 className=\"bc__now-title\">{b.title}</h3>\n                <p className=\"bc__muted\">{[b.author, b.note].filter(Boolean).join('. ')}</p>\n                {aboutParagraphs(b.about).length > 0 && <div className=\"bc__about\">{aboutParagraphs(b.about).map((para, n) => <p key={n}>{para}</p>)}</div>}\n                {b.review_post_id && <Link className=\"pg-btn\" to={`/post/${b.review_post_id}`}>Read my notes</Link>}\n              </div>\n"
]
],
"src/bookclub/bookclub.css": [
[
".bc__reading .bc__now, .bc__next .bc__queue { margin: 0; }\n.bc__reading .bc__now { padding: 0; border: 0; background: transparent; }\n.bc__queue { display: grid; gap: 10px; padding: 0; list-style: none; }\n.bc__queued { padding: 10px 12px; background: #f6f8fc; border: 1px solid var(--sf-border, #dde3f0); border-radius: 10px; font-weight: 700; color: var(--sf-navy-700, #14306a); overflow-wrap: anywhere; }\n",
".bc__reading .bc__now, .bc__next .bc__queue { margin: 0; }\n.bc__reading .bc__now { padding: 0; border: 0; background: transparent; }\n.bc__about { display: grid; gap: 10px; margin: 4px 0 12px; }\n.bc__about p { margin: 0; line-height: 1.6; color: var(--sf-ink, #0e1530); max-width: 62ch; overflow-wrap: anywhere; }\n.bc__queue { display: grid; gap: 10px; padding: 0; list-style: none; }\n.bc__queued { padding: 10px 12px; background: #f6f8fc; border: 1px solid var(--sf-border, #dde3f0); border-radius: 10px; font-weight: 700; color: var(--sf-navy-700, #14306a); overflow-wrap: anywhere; }\n"
],
[
"  .bc__theme { grid-area: theme; }\n  .bc__comecard { grid-area: come; }\n  .bc__reading { grid-area: read; align-self: start; } /* Reading now and Up next are wide horizontal bands beside the Shelf, not narrow tall boxes: an empty one stays short, and the suggest form gets room to sit in a row */\n  .bc__next { grid-area: next; align-self: start; }\n  .bc__shelfcard { grid-area: shelf; align-self: start; }\n  /* Up next is a full-width band: the suggest box inside it sits in two columns, the form and its words on the left and \"Most wanted\" on the right */\n  .bc__next .sg { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto auto 1fr auto; column-gap: 32px; align-items: start; margin: 20px 0 0; }\n",
"  .bc__theme { grid-area: theme; }\n  .bc__comecard { grid-area: come; }\n  .bc__reading { grid-area: read; } /* Reading now and Up next are wide horizontal bands, not narrow tall boxes. Reading now is as tall as the Shelf beside it (it stretches to fit: the grid does that, so nothing here may stop it) */\n  .bc__next { grid-area: next; align-self: start; }\n  .bc__shelfcard { grid-area: shelf; }\n  /* Up next is a full-width band: the suggest box inside it sits in two columns, the form and its words on the left and \"Most wanted\" on the right */\n  .bc__next .sg { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto auto 1fr auto; column-gap: 32px; align-items: start; margin: 20px 0 0; }\n"
]
],
"src/admin/AdminBooks.jsx": [
[
"import AdminBanner from './AdminBanner'\n\nconst BLANK = { title: '', author: '', genre: '', status: 'read', started: '', finished: '', rating: '', cover: '', review: '', note: '' }\nconst toForm = (b) => ({ title: b.title || '', author: b.author || '', genre: b.genre || '', status: b.status || 'read', started: b.started || '', finished: b.finished || '', rating: b.rating ? String(b.rating) : '', cover: b.cover_url || '', review: b.review_post_id || '', note: b.note || '' })\n\n// The owner's tool at /admin/books: add the books you are reading, have read, or will read next, and set each year's reading goal and theme. The Book Club\n",
"import AdminBanner from './AdminBanner'\n\nconst BLANK = { title: '', author: '', genre: '', status: 'read', started: '', finished: '', rating: '', cover: '', review: '', note: '', about: '' }\nconst toForm = (b) => ({ title: b.title || '', author: b.author || '', genre: b.genre || '', status: b.status || 'read', started: b.started || '', finished: b.finished || '', rating: b.rating ? String(b.rating) : '', cover: b.cover_url || '', review: b.review_post_id || '', note: b.note || '', about: b.about || '' })\n\n// The owner's tool at /admin/books: add the books you are reading, have read, or will read next, and set each year's reading goal and theme. The Book Club\n"
],
[
"          <Field id=\"ab-review\" label=\"Your review or notes (optional)\" help=\"Paste the post's address, or just the code at the end of it.\" error={errors.review}>{(p) => <input {...p} type=\"text\" value={form.review} onChange={set('review')} />}</Field>\n          <Field id=\"ab-note\" label=\"A short note (optional)\" help=\"A line on why this one, or what it taught you.\" error={errors.note}>{(p) => <input {...p} type=\"text\" value={form.note} onChange={set('note')} />}</Field>\n          <div className=\"ab__buttons\">\n            <button type=\"submit\" className=\"pg-btn sg-btn--primary\">{editing ? 'Save changes' : 'Add the book'}</button>\n",
"          <Field id=\"ab-review\" label=\"Your review or notes (optional)\" help=\"Paste the post's address, or just the code at the end of it.\" error={errors.review}>{(p) => <input {...p} type=\"text\" value={form.review} onChange={set('review')} />}</Field>\n          <Field id=\"ab-note\" label=\"A short note (optional)\" help=\"A line on why this one, or what it taught you.\" error={errors.note}>{(p) => <input {...p} type=\"text\" value={form.note} onChange={set('note')} />}</Field>\n          <Field id=\"ab-about\" label=\"What the book is about (optional)\" help=\"A few lines. They show on the Book Club page under the book you are reading now. A blank line starts a new paragraph. Up to 1,000 letters.\" error={errors.about}>{(p) => <textarea {...p} rows={6} maxLength={1200} value={form.about} onChange={set('about')} />}</Field>\n          <div className=\"ab__buttons\">\n            <button type=\"submit\" className=\"pg-btn sg-btn--primary\">{editing ? 'Save changes' : 'Add the book'}</button>\n"
]
],
"sql/books.sql": [
[
"  review_post_id text check (review_post_id is null or review_post_id ~ '^[A-Za-z0-9-]{1,64}$'),\n  note text check (note is null or char_length(note) <= 300),\n  created_at timestamptz not null default now(),\n  check (status <> 'read' or finished is not null)\n",
"  review_post_id text check (review_post_id is null or review_post_id ~ '^[A-Za-z0-9-]{1,64}$'),\n  note text check (note is null or char_length(note) <= 300),\n  about text check (about is null or char_length(about) <= 1000),\n  created_at timestamptz not null default now(),\n  check (status <> 'read' or finished is not null)\n"
]
]
}''')
NEW_FILES = ["sql/books-about.sql", "INSTALL-SMALL-FIXES.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/suggest/SuggestPanel.jsx", "src/bookclub/bookClubData.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier Book Club and suggest box packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-small-fixes-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-small-fixes').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
