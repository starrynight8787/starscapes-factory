#!/usr/bin/env python3
"""Puts a small pass label on every post card (and says 'free to read' on the first three).

Run it from the project folder, AFTER unzipping starscapes-pass-labels-19oct.zip into it:   python3 tools/add-pass-labels.py

What it does: it makes exact edits to eleven files that already exist (the post cards, the post forms, the styles and the health check) and adds two new files from the zip.
  src/components/PostCard.jsx, src/draftingdesk/EntryCard.jsx, src/entries/EntryPage.jsx, src/factoryfloor/PostNote.jsx, src/home/HomeSections.jsx, src/membership/membership.css, src/pages/EditPost.jsx, src/pages/Home.jsx, src/pages/NewPost.jsx, src/rooms/RoomEntry.jsx, tools/health-check.mjs

How it keeps you safe:
  - It checks ALL 11 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-pass-labels.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/membership/passIndex.js, src/membership/PassChip.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/components/PostCard.jsx": [
[
"import { Link } from 'react-router-dom'\nimport '../styles/articles.css'\n\nexport default function PostCard({ post, variant = 'feed' }) {\n",
"import { Link } from 'react-router-dom'\nimport '../styles/articles.css'\nimport PassChip from '../membership/PassChip'\n\nexport default function PostCard({ post, variant = 'feed' }) {\n"
],
[
"        )}\n        <h3 className=\"sf-article-title\" style={{ margin: '10px 0 4px', fontSize: 18 }}>{post.title}</h3>\n        <p className=\"muted\" style={{ fontSize: 14, margin: 0 }}>\n          {excerpt}\n",
"        )}\n        <h3 className=\"sf-article-title\" style={{ margin: '10px 0 4px', fontSize: 18 }}>{post.title}</h3>\n        <PassChip postId={post.id} />\n        <p className=\"muted\" style={{ fontSize: 14, margin: 0 }}>\n          {excerpt}\n"
],
[
"        )}\n        <h2 className=\"sf-article-title\" style={{ margin: '0 0 8px', fontSize: 28 }}>{post.title}</h2>\n        <p className=\"muted\" style={{ margin: '0 0 8px' }}>\n          {new Date(post.created_at).toLocaleDateString()}\n",
"        )}\n        <h2 className=\"sf-article-title\" style={{ margin: '0 0 8px', fontSize: 28 }}>{post.title}</h2>\n        <PassChip postId={post.id} />\n        <p className=\"muted\" style={{ margin: '0 0 8px' }}>\n          {new Date(post.created_at).toLocaleDateString()}\n"
],
[
"      <div>\n        <h3 className=\"sf-article-title\" style={{ margin: '0 0 4px', fontSize: 20 }}>{post.title}</h3>\n        <p className=\"muted\" style={{ fontSize: 14, margin: '0 0 6px' }}>\n          {new Date(post.created_at).toLocaleDateString()}\n",
"      <div>\n        <h3 className=\"sf-article-title\" style={{ margin: '0 0 4px', fontSize: 20 }}>{post.title}</h3>\n        <PassChip postId={post.id} />\n        <p className=\"muted\" style={{ fontSize: 14, margin: '0 0 6px' }}>\n          {new Date(post.created_at).toLocaleDateString()}\n"
]
],
"src/draftingdesk/EntryCard.jsx": [
[
"import { Link } from 'react-router-dom'\nimport { formatDate, safeImage } from './draftingData'\n\n// One post on an area page: its picture (if it has one) across the top, then its title and date.\n",
"import { Link } from 'react-router-dom'\nimport { formatDate, safeImage } from './draftingData'\nimport PassChip from '../membership/PassChip'\n\n// One post on an area page: its picture (if it has one) across the top, then its title and date.\n"
],
[
"      )}\n      <span className=\"dd-entry__title\">{post.title}</span>\n      {date && <span className=\"dd-entry__date\">{date}</span>}\n    </Link>\n",
"      )}\n      <span className=\"dd-entry__title\">{post.title}</span>\n      <PassChip postId={post.id} />\n      {date && <span className=\"dd-entry__date\">{date}</span>}\n    </Link>\n"
]
],
"src/entries/EntryPage.jsx": [
[
"import '../styles/forms.css'\nimport './entries.css'\n\nfunction Picture({ post, className }) {\n",
"import '../styles/forms.css'\nimport './entries.css'\nimport PassChip from '../membership/PassChip'\n\nfunction Picture({ post, className }) {\n"
],
[
"                      <Picture post={p} className=\"en__itemimg\" />\n                      <span className=\"en__itemtitle\">{p.title}</span>\n                      {formatDate(p.created_at) && <span className=\"en__itemdate\">{formatDate(p.created_at)}</span>}\n                    </Link>\n",
"                      <Picture post={p} className=\"en__itemimg\" />\n                      <span className=\"en__itemtitle\">{p.title}</span>\n                      <PassChip postId={p.id} />\n                      {formatDate(p.created_at) && <span className=\"en__itemdate\">{formatDate(p.created_at)}</span>}\n                    </Link>\n"
]
],
"src/factoryfloor/PostNote.jsx": [
[
"import { Link, useLocation } from 'react-router-dom'\nimport { SECTIONS, NOTE_COLOURS, kindOf, noteTilt, formatDate, isPinned } from './factoryData'\n\n// One post, as a post-it note stuck to the blueprint.\n",
"import { Link, useLocation } from 'react-router-dom'\nimport { SECTIONS, NOTE_COLOURS, kindOf, noteTilt, formatDate, isPinned } from './factoryData'\nimport PassChip from '../membership/PassChip'\n\n// One post, as a post-it note stuck to the blueprint.\n"
],
[
"        {post.title}\n      </span>\n      {date && <span className=\"ff-note__date\">{date}</span>}\n    </Link>\n",
"        {post.title}\n      </span>\n      <PassChip postId={post.id} />\n      {date && <span className=\"ff-note__date\">{date}</span>}\n    </Link>\n"
]
],
"src/home/HomeSections.jsx": [
[
"import '../styles/forms.css'\nimport './homeSections.css'\n\n// The boxes under the floor plan on the home page, from the Figma design \"Row: Home v2\": Next event and Membership side by side, the Featured room,\n",
"import '../styles/forms.css'\nimport './homeSections.css'\nimport PassChip from '../membership/PassChip'\n\n// The boxes under the floor plan on the home page, from the Figma design \"Row: Home v2\": Next event and Membership side by side, the Featured room,\n"
],
[
"        <h2 id=\"hs-post-title\" className=\"hs__title hs__title--school\">{post.title}</h2>\n        <p className=\"hs__meta\">{[room ? room.name : 'Blog', date].filter(Boolean).join(' · ')}</p>\n        <div className=\"hs__buttons\">\n          <Link className=\"pg-btn fm-btn--primary\" to={`/post/${post.id}`}>Read the post</Link>\n",
"        <h2 id=\"hs-post-title\" className=\"hs__title hs__title--school\">{post.title}</h2>\n        <p className=\"hs__meta\">{[room ? room.name : 'Blog', date].filter(Boolean).join(' · ')}</p>\n        <PassChip postId={post.id} />\n        <div className=\"hs__buttons\">\n          <Link className=\"pg-btn fm-btn--primary\" to={`/post/${post.id}`}>Read the post</Link>\n"
]
],
"src/membership/membership.css": [
[
"  margin: 0;\n  font-family: var(--sf-head, 'Inter', system-ui, sans-serif);\n  font-size: 1.25rem;\n  line-height: 1.25;\n  color: var(--sf-navy-700, #14306a);\n}\n",
"  margin: 0;\n  font-family: var(--sf-head, 'Inter', system-ui, sans-serif);\n  font-size: 1.25rem;\n  line-height: 1.25;\n  color: var(--sf-navy-700, #14306a);\n}\n\n/* the label on a post card that belongs to a pass */\n.mb__passchip {\n  display: inline-block;\n  align-self: flex-start;\n  margin-top: 6px;\n  font-size: 0.875rem;\n}\n"
]
],
"src/pages/EditPost.jsx": [
[
"import '../styles/pages.css'\nimport '../styles/forms.css'\n\nconst IDS = { title: 'ep-title', content: 'ep-content', file: 'ep-file' }\n",
"import '../styles/pages.css'\nimport '../styles/forms.css'\nimport { resetPassIndex } from '../membership/passIndex'\n\nconst IDS = { title: 'ep-title', content: 'ep-content', file: 'ep-file' }\n"
],
[
"      if (canPass && !wantPass && wasLocked) await removeLockedBody(id)\n\n      navigate(`/post/${id}`)\n    } catch (err) {\n",
"      if (canPass && !wantPass && wasLocked) await removeLockedBody(id)\n\n      resetPassIndex()\n      navigate(`/post/${id}`)\n    } catch (err) {\n"
]
],
"src/pages/Home.jsx": [
[
"import '../styles/pages.css'\nimport '../styles/articles.css'\n\n// Every published post from every room, newest first, at /blog. The tags found on the posts become the filter above the list.\n",
"import '../styles/pages.css'\nimport '../styles/articles.css'\nimport PassChip from '../membership/PassChip'\n\n// Every published post from every room, newest first, at /blog. The tags found on the posts become the filter above the list.\n"
],
[
"                  </Link>\n                </h2>\n                {date && <span className=\"rp-entry__date\">{date}</span>}\n              </article>\n",
"                  </Link>\n                </h2>\n                <PassChip postId={post.id} />\n                {date && <span className=\"rp-entry__date\">{date}</span>}\n              </article>\n"
]
],
"src/pages/NewPost.jsx": [
[
"import '../styles/pages.css'\nimport '../styles/forms.css'\n\nconst IDS = { title: 'np-title', content: 'np-content', file: 'np-file' }\n",
"import '../styles/pages.css'\nimport '../styles/forms.css'\nimport { resetPassIndex } from '../membership/passIndex'\n\nconst IDS = { title: 'np-title', content: 'np-content', file: 'np-file' }\n"
],
[
"      }\n\n      navigate('/')\n    } catch (err) {\n",
"      }\n\n      resetPassIndex()\n      navigate('/')\n    } catch (err) {\n"
]
],
"src/rooms/RoomEntry.jsx": [
[
"import { Link } from 'react-router-dom'\nimport { formatDate, safeImage } from './postRules'\n\n// One post on an area page. In a gallery it shows its picture across the top; in a list it is a compact rectangle with no picture.\n",
"import { Link } from 'react-router-dom'\nimport { formatDate, safeImage } from './postRules'\nimport PassChip from '../membership/PassChip'\n\n// One post on an area page. In a gallery it shows its picture across the top; in a list it is a compact rectangle with no picture.\n"
],
[
"      )}\n      <span className=\"rp-entry__title\">{post.title}</span>\n      {date && <span className=\"rp-entry__date\">{date}</span>}\n    </Link>\n",
"      )}\n      <span className=\"rp-entry__title\">{post.title}</span>\n      <PassChip postId={post.id} />\n      {date && <span className=\"rp-entry__date\">{date}</span>}\n    </Link>\n"
]
],
"tools/health-check.mjs": [
[
"  ['Locked posts: the Edit post form has the Pass choice', 'src/pages/EditPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n  ['Membership: the webhook follows the current subscription', 'api/membership-webhook.js', /not the current subscription/, 'the webhook tidy-up (the fix-webhook-current script)'],\n]\n\n",
"  ['Locked posts: the Edit post form has the Pass choice', 'src/pages/EditPost.jsx', /PASS_CHOICES/, 'the locked posts update (the add-locked-posts script)'],\n  ['Membership: the webhook follows the current subscription', 'api/membership-webhook.js', /not the current subscription/, 'the webhook tidy-up (the fix-webhook-current script)'],\n  ['Pass labels: the lookup', 'src/membership/passIndex.js', /FREE_SAMPLE/, 'the pass labels update (the add-pass-labels script)'],\n  ['Pass labels: the chip', 'src/membership/PassChip.jsx', /free to read/, 'the pass labels update (the add-pass-labels script)'],\n  ['Pass labels: the Factory Floor notes carry it', 'src/factoryfloor/PostNote.jsx', /PassChip/, 'the pass labels update (the add-pass-labels script)'],\n  ['Pass labels: the Drafting Desk cards carry it', 'src/draftingdesk/EntryCard.jsx', /PassChip/, 'the pass labels update (the add-pass-labels script)'],\n]\n\n"
]
]
}''')
NEW_FILES = ["src/membership/passIndex.js", "src/membership/PassChip.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/lockedPosts.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the locked posts update first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-pass-labels-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-pass-labels').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
