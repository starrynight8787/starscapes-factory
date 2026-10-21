#!/usr/bin/env python3
"""Fixes everything the accessibility scan found (logo name, main landmarks, contrast, faded items, spoken label order, heading order) and updates the room tests to the new wording; adds the scan's test and the scan tool. The new test is only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-accessibility-scan-21oct.zip into it:   python3 tools/add-accessibility-scan.py

What it does: it makes exact edits to 15 files and, only if all succeed, puts the new accessibility test in place.
  src/artloft/artloft.css, src/components/Logo.jsx, src/components/PostCard.jsx, src/entries/entries.css, src/index.css, src/pages/ChannelDirectory.jsx, src/pages/ChannelPage.jsx, src/pages/ProductGallery.jsx, src/pages/ProductPage.jsx, src/rooms/RoomScene.jsx, src/rooms/roomscene.css, src/rooms/sceneRules.js, test/nook-scene.test.jsx, test/rooms-data.test.jsx, test/rooms.test.jsx

How it keeps you safe:
  - It checks ALL 15 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-accessibility-scan.
  - It is safe to run twice: a file already done is left alone.
  - The new files (tools/accessibility-scan-fixes-files/accessibility-scan.test.jsx.staged, INSTALL-ACCESSIBILITY-SCAN.txt, tools/accessibility-scan/scan.py, tools/accessibility-scan/README.md) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/artloft/artloft.css": [
[
".al-list .is-soon {\n  opacity: 0.6;\n",
".al-list .is-soon {\n  background: #f4f6fb; /* not open yet: a softer box and a faded picture, but the writing stays at full strength (fading the whole item gave its text only 2.5:1 contrast; the minimum is 4.5:1) */\n  border-style: dashed;\n}\n.al-list .is-soon .al-list__thumb {\n  opacity: 0.6;\n"
]
],
"src/components/Logo.jsx": [
[
"      <StarMark color={dark ? '#DCE6FF' : '#2E8FD0'} />\n      <span className=\"sf-logo__word\">Starscapes</span>\n      <span className=\"sf-logo__script\">Factory</span>\n",
"      <StarMark color={dark ? '#DCE6FF' : '#2E8FD0'} />\n      <span className=\"sf-logo__word\">Starscapes</span>{' '}\n      <span className=\"sf-logo__script\">Factory</span>\n"
]
],
"src/components/PostCard.jsx": [
[
"        )}\n        <h3 className=\"sf-article-title\" style={{ margin: '10px 0 4px', fontSize: 18 }}>{post.title}</h3>\n        <PassChip postId={post.id} />\n",
"        )}\n        <h2 className=\"sf-article-title\" style={{ margin: '10px 0 4px', fontSize: 18 }}>{post.title}</h2>\n        <PassChip postId={post.id} />\n"
],
[
"      <div>\n        <h3 className=\"sf-article-title\" style={{ margin: '0 0 4px', fontSize: 20 }}>{post.title}</h3>\n        <PassChip postId={post.id} />\n",
"      <div>\n        <h2 className=\"sf-article-title\" style={{ margin: '0 0 4px', fontSize: 20 }}>{post.title}</h2>\n        <PassChip postId={post.id} />\n"
]
],
"src/entries/entries.css": [
[
"  text-transform: uppercase;\n  color: var(--sf-blue, #1f6fa8);\n}\n",
"  text-transform: uppercase;\n  color: #1a62a0; /* 5.1:1 on the pale blue chip (the site blue, #1f6fa8, was 4.3:1; the minimum is 4.5:1) */\n}\n"
]
],
"src/index.css": [
[
".muted {\n  color: #777;\n  font-size: 14px;\n",
".muted {\n  color: #666; /* 5.4:1 on the page tint and 5.7:1 on white (the minimum is 4.5:1); the old #777 was 4.2:1 */\n  font-size: 14px;\n"
]
],
"src/pages/ChannelDirectory.jsx": [
[
"  return (\n    <div className=\"sf-home\">\n      {/* ---------- Hero with the floor plan ---------- */}\n",
"  return (\n    <main className=\"sf-home\">\n      {/* ---------- Hero with the floor plan ---------- */}\n"
],
[
"      </div>\n    </div>\n  )\n",
"      </div>\n    </main>\n  )\n"
]
],
"src/pages/ChannelPage.jsx": [
[
"    return (\n      <div>\n        <p>\n          <Link to=\"/\">&larr; Back home</Link>\n        </p>\n        <p>Channel not found.</p>\n      </div>\n    )\n  }\n\n  const [featuredPost, ...restPosts] = posts\n\n  return (\n    <div>\n      <p>\n",
"    return (\n      <main>\n        <p>\n          <Link to=\"/\">&larr; Back home</Link>\n        </p>\n        <p>Channel not found.</p>\n      </main>\n    )\n  }\n\n  const [featuredPost, ...restPosts] = posts\n\n  return (\n    <main>\n      <p>\n"
],
[
"      )}\n    </div>\n  )\n",
"      )}\n    </main>\n  )\n"
]
],
"src/pages/ProductGallery.jsx": [
[
"\n  if (loading) return <p>Loading products...</p>\n  if (error) return <p className=\"error\">{error}</p>\n\n  return (\n    <div className=\"legacy\">\n      <h1>🎨 The Art Loft</h1>\n",
"\n  if (loading) return <main className=\"legacy\"><p>Loading products...</p></main>\n  if (error) return <main className=\"legacy\"><p className=\"error\">{error}</p></main>\n\n  return (\n    <main className=\"legacy\">\n      <h1>🎨 The Art Loft</h1>\n"
],
[
"            )}\n            <h3 style={{ margin: '10px 0 4px', fontSize: 15 }}>{product.title}</h3>\n            <p className=\"muted\" style={{ margin: 0, fontSize: 14 }}>\n              £{Number(product.price).toFixed(2)}\n            </p>\n          </Link>\n        ))}\n      </div>\n    </div>\n  )\n",
"            )}\n            <h2 style={{ margin: '10px 0 4px', fontSize: 15 }}>{product.title}</h2>\n            <p className=\"muted\" style={{ margin: 0, fontSize: 14 }}>\n              £{Number(product.price).toFixed(2)}\n            </p>\n          </Link>\n        ))}\n      </div>\n    </main>\n  )\n"
]
],
"src/pages/ProductPage.jsx": [
[
"\n  if (loading) return <p>Loading...</p>\n  if (error) return <p className=\"error\">{error}</p>\n  if (!product) return <p>Product not found.</p>\n\n  const images = product.images && product.images.length > 0 ? product.images : []\n\n  return (\n    <div className=\"legacy\">\n      <p>\n",
"\n  if (loading) return <main className=\"legacy\"><p>Loading...</p></main>\n  if (error) return <main className=\"legacy\"><p className=\"error\">{error}</p></main>\n  if (!product) return <main className=\"legacy\"><p>Product not found.</p></main>\n\n  const images = product.images && product.images.length > 0 ? product.images : []\n\n  return (\n    <main className=\"legacy\">\n      <p>\n"
],
[
"      </div>\n    </div>\n  )\n",
"      </div>\n    </main>\n  )\n"
]
],
"src/rooms/RoomScene.jsx": [
[
"        <span className=\"rs-label\">\n          <strong>{item.name}</strong>\n          <small>{item.blurb}</small>\n        </span>\n      )}\n      {!plaque && why && <span className=\"rs-tip\" role=\"note\">{why}</span>}\n",
"        <span className=\"rs-label\">\n          <strong>{item.name}</strong>{' '}\n          <small>{item.blurb}</small>\n        </span>\n      )}\n      {!plaque && why ? ' ' : null}\n      {!plaque && why && <span className=\"rs-tip\" role=\"note\">{why}</span>}\n"
]
],
"src/rooms/roomscene.css": [
[
".rs-list .is-locked {\n  opacity: 0.7;\n}\n",
".rs-list .is-locked {\n  background: #f4f6fb; /* not open yet: a softer box and a faded picture, but the writing stays at full strength (fading the whole item gave its text only 3.1:1 contrast; the minimum is 4.5:1) */\n  border-style: dashed;\n}\n.rs-list .is-locked img {\n  opacity: 0.6;\n}\n"
]
],
"src/rooms/sceneRules.js": [
[
"\n// What a screen reader says for an item\nexport function itemLabel(item) {\n  const why = lockText(item.lock)\n  const parts = [item.name]\n  if (item.kind === 'locked') parts.push(`locked, ${why.toLowerCase()}`)\n  else if (why) parts.push(why.toLowerCase())\n  const head = parts.join(', ')\n  const tail = item.kind === 'external' ? ' (opens in a new tab)' : ''\n  return `${head}. ${item.blurb}${tail}`\n}\n",
"\n// What a screen reader says for an item. It follows the order of the writing on the item (name, description, then the note about access), because a spoken label that does not\n// contain the written words, in that order, fails people who use voice control and screen readers together (WCAG 2.5.3, \"label in name\"). What the writing does not say comes\n// after it: that a locked item is not a link, and that a link opens a new tab.\nexport function itemLabel(item) {\n  const why = lockText(item.lock)\n  let label = `${item.name}. ${item.blurb}`\n  if (why) label += ` ${why}`\n  if (item.kind === 'locked') label += ' (locked)'\n  if (item.kind === 'external') label += ' (opens in a new tab)'\n  return label\n}\n"
]
],
"test/nook-scene.test.jsx": [
[
"    expect(container.querySelectorAll('.rs-stage a')).toHaveLength(0)\n    expect(doors[1].getAttribute('aria-label')).toBe('Come Read With Me, locked, starting soon. Read alongside me. Starting soon.')\n  })\n",
"    expect(container.querySelectorAll('.rs-stage a')).toHaveLength(0)\n    expect(doors[1].getAttribute('aria-label')).toBe('Come Read With Me. Read alongside me. Starting soon. Starting soon (locked)')\n  })\n"
]
],
"test/rooms-data.test.jsx": [
[
"        expect(link, i.id).toHaveAttribute('href', i.kind === 'page' ? i.to : i.href)\n        expect(link, i.id).toHaveAccessibleName(`${i.name}. ${i.blurb}${i.kind === 'external' ? ' (opens in a new tab)' : ''}`)\n      } else {\n        const closed = stage.getByRole('group', { name: new RegExp(`^${i.name}, locked`) })\n        expect(closed, i.id).toHaveAttribute('tabindex', '0')\n",
"        expect(link, i.id).toHaveAttribute('href', i.kind === 'page' ? i.to : i.href)\n        expect(link, i.id).toHaveAccessibleName(`${i.name}. ${i.blurb}${i.lock ? ` ${lockText(i.lock)}` : ''}${i.kind === 'external' ? ' (opens in a new tab)' : ''}`)\n      } else {\n        const closed = stage.getByRole('group', { name: new RegExp(`^${i.name}\\\\. .*\\\\(locked\\\\)$`) })\n        expect(closed, i.id).toHaveAttribute('tabindex', '0')\n"
],
[
"    ;['Audiobook', 'Udemy Course'].forEach((name) => {\n      expect(stage.getByRole('group', { name: new RegExp(`^${name}, locked, opening soon`) })).toBeInTheDocument()\n      expect(stage.queryByRole('link', { name: new RegExp(`^${name}`) })).toBeNull()\n",
"    ;['Audiobook', 'Udemy Course'].forEach((name) => {\n      expect(stage.getByRole('group', { name: new RegExp(`^${name}\\\\. .*Opening soon \\\\(locked\\\\)$`) })).toBeInTheDocument()\n      expect(stage.queryByRole('link', { name: new RegExp(`^${name}`) })).toBeNull()\n"
],
[
"      expect(stage.queryByRole('link', { name: /^Audiobook\\b/ }), bad).toBeNull()\n      expect(stage.getByRole('group', { name: /^Audiobook, locked/ }), bad).toBeInTheDocument()\n      unmount()\n",
"      expect(stage.queryByRole('link', { name: /^Audiobook\\b/ }), bad).toBeNull()\n      expect(stage.getByRole('group', { name: /^Audiobook\\. .*\\(locked\\)$/ }), bad).toBeInTheDocument()\n      unmount()\n"
]
],
"test/rooms.test.jsx": [
[
"    const labels = Array.from(stage(container).querySelectorAll('.rs-label')).map((l) => l.textContent)\n    expect(labels).toEqual(['Open pageOpens here.', 'Other siteOpens elsewhere.', 'Not yetNot open yet.', 'Members pageFor members.'])\n  })\n",
"    const labels = Array.from(stage(container).querySelectorAll('.rs-label')).map((l) => l.textContent)\n    expect(labels).toEqual(['Open page Opens here.', 'Other site Opens elsewhere.', 'Not yet Not open yet.', 'Members page For members.']) // a space between the name and the description, so the written words read as words\n  })\n"
],
[
"      const item = within(stage(container)).getByRole('group', { name: /Not yet/ })\n      expect(item).toHaveAccessibleName('Not yet, locked, starting soon. Not open yet.')\n      expect(within(item).getByRole('note')).toHaveTextContent('Starting soon')\n",
"      const item = within(stage(container)).getByRole('group', { name: /Not yet/ })\n      expect(item).toHaveAccessibleName('Not yet. Not open yet. Starting soon (locked)')\n      expect(within(item).getByRole('note')).toHaveTextContent('Starting soon')\n"
],
[
"      expect(link).toHaveAttribute('href', '/test/d')\n      expect(link).toHaveAccessibleName('Members page, paid members only. For members.')\n      expect(within(link).getByRole('note')).toHaveTextContent('Paid members only')\n",
"      expect(link).toHaveAttribute('href', '/test/d')\n      expect(link).toHaveAccessibleName('Members page. For members. Paid members only')\n      expect(within(link).getByRole('note')).toHaveTextContent('Paid members only')\n"
],
[
"    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'external' })).toBe('A. About A. (opens in a new tab)')\n    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'locked', lock: 'paid' })).toBe('A, locked, paid members only. About A.')\n    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'page', lock: 'paid' })).toBe('A, paid members only. About A.')\n  })\n",
"    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'external' })).toBe('A. About A. (opens in a new tab)')\n    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'locked', lock: 'paid' })).toBe('A. About A. Paid members only (locked)')\n    expect(itemLabel({ name: 'A', blurb: 'About A.', kind: 'page', lock: 'paid' })).toBe('A. About A. Paid members only')\n  })\n"
]
]
}''')
STAGED = {
    'test/accessibility-scan.test.jsx': 'tools/accessibility-scan-fixes-files/accessibility-scan.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["tools/accessibility-scan-fixes-files/accessibility-scan.test.jsx.staged", "INSTALL-ACCESSIBILITY-SCAN.txt", "tools/accessibility-scan/scan.py", "tools/accessibility-scan/README.md"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-accessibility-scan-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-accessibility-scan').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-accessibility-scan').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
