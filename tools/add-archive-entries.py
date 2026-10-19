#!/usr/bin/env python3
"""Puts the entry template on the Drafting Desk's Archive Entries, with the Author's Notebook box.

Run it from the project folder, AFTER unzipping starscapes-archive-entries-19oct.zip into it:   python3 tools/add-archive-entries.py

What it does: it makes exact edits to four files that already exist: the entry template and its styles, the Writing in Transit page, and the Drafting Desk's routes.
  src/entries/EntryPage.jsx, src/entries/WritingInTransitPage.jsx, src/entries/entries.css, src/draftingdesk/DraftingDeskRoutes.jsx

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-archive-entries.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/entries/ArchiveEntriesPage.jsx, src/entries/NotebookTeaser.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/entries/EntryPage.jsx": [
[
"import { Link, useLocation } from 'react-router-dom'\nimport useTitle from '../rooms/useTitle'\nimport { fetchRoomPosts } from '../rooms/roomsApi'\nimport { ROOMS } from '../rooms/roomsData'\nimport { formatDate, inArea, safeImage } from '../rooms/postRules'\nimport { StarMark } from '../components/Logo'\nimport { GRID_COUNT, pickGrid, pickLatest, pickPinned, pinnedIsBeginning } from './entryRules'\n",
"import { Link, useLocation } from 'react-router-dom'\nimport useTitle from '../rooms/useTitle'\nimport { formatDate, safeImage } from '../rooms/postRules'\nimport { StarMark } from '../components/Logo'\nimport { GRID_COUNT, pickGrid, pickLatest, pickPinned, pinnedIsBeginning } from './entryRules'\n"
],
[
"\n// The entry template (Figma: \"Archive Entry / Author's Notebook\"): the latest entry big, the pinned entry beside it, a grid of the rest, and an optional extra\n// box under the pinned one (for example the Author's Notebook for members). It takes a page from the room's own list of pages (src/rooms/roomsData.js), so the\n// title, the line under it and the tag that picks its posts have one home. On a phone: latest, pinned, the grid (four first), then the extra box.\nexport default function EntryPage({ room, area, aside = null }) {\n  const config = ROOMS[room]\n  const page = config.areas[area]\n  useTitle(page.name)\n  const [posts, setPosts] = useState([])\n  const [status, setStatus] = useState('loading')\n",
"\n// The entry template (Figma: \"Archive Entry / Author's Notebook\"): the latest entry big, the pinned entry beside it, a grid of the rest, and an optional extra\n// box under the pinned one (for example the Author's Notebook for members). It works for any room: the page that uses it says what it is called, where \"back\"\n// goes, how to fetch the room's posts (load) and which of them belong on the page (belongs). Those two should be fixed functions (defined outside the page),\n// so the page does not fetch again on every redraw. On a phone: latest, pinned, the grid (four first), then the extra box.\nexport default function EntryPage({ title, blurb, backTo, backLabel, load, belongs, aside = null }) {\n  useTitle(title)\n  const [posts, setPosts] = useState([])\n  const [status, setStatus] = useState('loading')\n"
],
[
"  useEffect(() => {\n    let alive = true\n    fetchRoomPosts(room).then((data) => alive && (setPosts(data.filter((p) => inArea(page, p))), setStatus('ready'))).catch(() => alive && setStatus('error'))\n    return () => { alive = false }\n  }, [room, page])\n\n  const latest = useMemo(() => pickLatest(posts), [posts])\n",
"  useEffect(() => {\n    let alive = true\n    load().then((data) => alive && (setPosts(data.filter(belongs)), setStatus('ready'))).catch(() => alive && setStatus('error'))\n    return () => { alive = false }\n  }, [load, belongs])\n\n  const latest = useMemo(() => pickLatest(posts), [posts])\n"
],
[
"  return (\n    <main className=\"rp en\">\n      <p className=\"rp-back\"><Link to={`/${room}`}>← Back to {config.name}</Link></p>\n      <header className=\"rp-head\">\n        <h1>{page.name}</h1>\n        <p className=\"rp-blurb\">{page.blurb}</p>\n      </header>\n      {status === 'error' && <p className=\"rp-note\" role=\"alert\">The entries could not load just now. Please try again in a moment.</p>}\n",
"  return (\n    <main className=\"rp en\">\n      <p className=\"rp-back\"><Link to={backTo}>← {backLabel}</Link></p>\n      <header className=\"rp-head\">\n        <h1>{title}</h1>\n        <p className=\"rp-blurb\">{blurb}</p>\n      </header>\n      {status === 'error' && <p className=\"rp-note\" role=\"alert\">The entries could not load just now. Please try again in a moment.</p>}\n"
]
],
"src/entries/WritingInTransitPage.jsx": [
[
"import EntryPage from './EntryPage'\n\n// Writing in Transit (Explorer's Bay), on the entry template. It has no extra box under the pinned entry for now (what goes there is not decided).\nexport default function WritingInTransitPage() {\n  return <EntryPage room=\"explorers-bay\" area=\"writing-in-transit\" />\n}\n",
"import EntryPage from './EntryPage'\nimport { fetchRoomPosts } from '../rooms/roomsApi'\nimport { ROOMS } from '../rooms/roomsData'\nimport { inArea } from '../rooms/postRules'\n\n// Writing in Transit (Explorer's Bay), on the entry template. Its title, the line under it and the tag that picks its posts come from the room's own data.\n// It has no extra box under the pinned entry for now (what goes there is not decided).\nconst ROOM = 'explorers-bay'\nconst PAGE = ROOMS[ROOM].areas['writing-in-transit']\nconst load = () => fetchRoomPosts(ROOM)\nconst belongs = (post) => inArea(PAGE, post)\n\nexport default function WritingInTransitPage() {\n  return <EntryPage title={PAGE.name} blurb={PAGE.blurb} backTo={`/${ROOM}`} backLabel={`Back to ${ROOMS[ROOM].name}`} load={load} belongs={belongs} />\n}\n"
]
],
"src/entries/entries.css": [
[
"  display: inline-flex !important;\n}\n@media (max-width: 960px) {\n  .en__cols {\n",
"  display: inline-flex !important;\n}\n/* The Author's Notebook box under the pinned entry on Archive Entries */\n.en__notebook {\n  background: var(--sf-star, #dce6ff);\n}\n.en__notebooktitle {\n  margin: 0;\n  font-family: var(--sf-head, 'Josefin Sans', sans-serif);\n  font-size: 1.375rem;\n  color: var(--sf-navy-700, #14306a);\n}\n.en__text {\n  margin: 0;\n  line-height: 1.55;\n}\n.en__caption {\n  margin: 0;\n  color: var(--sf-muted, #5b6585);\n  font-size: 0.95rem;\n}\n.en__notebook button:disabled {\n  opacity: 0.55;\n  cursor: not-allowed;\n}\n.en__notebook .pg-btn {\n  width: 100%;\n}\n@media (max-width: 960px) {\n  .en__cols {\n"
]
],
"src/draftingdesk/DraftingDeskRoutes.jsx": [
[
"import { Routes, Route, Link } from 'react-router-dom'\nimport DraftingDeskHome from './DraftingDeskHome'\nimport AreaPage from './AreaPage'\nimport NotebookPage from './NotebookPage'\nimport './draftingdesk.css'\n",
"import { Routes, Route, Link } from 'react-router-dom'\nimport DraftingDeskHome from './DraftingDeskHome'\nimport ArchiveEntriesPage from '../entries/ArchiveEntriesPage'\nimport NotebookPage from './NotebookPage'\nimport './draftingdesk.css'\n"
],
[
"    <Routes>\n      <Route index element={<DraftingDeskHome />} />\n      <Route path=\"archive-entries\" element={<AreaPage area=\"archive-entries\" />} />\n      <Route path=\"authors-notebook\" element={<NotebookPage />} />\n      <Route\n",
"    <Routes>\n      <Route index element={<DraftingDeskHome />} />\n      <Route path=\"archive-entries\" element={<ArchiveEntriesPage />} />\n      <Route path=\"authors-notebook\" element={<NotebookPage />} />\n      <Route\n"
]
]
}''')
NEW_FILES = ["src/entries/ArchiveEntriesPage.jsx", "src/entries/NotebookTeaser.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/entries/EntryPage.jsx", "src/draftingdesk/DraftingDeskRoutes.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the entry template update first. These files from earlier updates are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-archive-entries-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-archive-entries').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
