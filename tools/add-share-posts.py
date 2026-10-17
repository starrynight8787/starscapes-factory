#!/usr/bin/env python3
"""Adds share previews for each post, each print and each collection.

Run it from the project folder, AFTER unzipping starscapes-share-posts-17oct.zip into it:   python3 tools/add-share-posts.py

What it does: it makes small, exact edits to one file that already exists (the build step), so each published post, print and collection gets its own title, description and share picture, read from the database at build time.
  scripts/make-share-pages.mjs

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-share-posts.
  - It is safe to run twice: a file already done is left alone.
  - The new files (scripts/dynamicPages.mjs) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"scripts/make-share-pages.mjs": [
[
"//                               so it deliberately has no address of its own (no canonical, no og:url): a post is never taken for the home page\n//   dist/<address>/index.html   each other page in the table, with its own words and its own address\n//   dist/sitemap.xml            the addresses in the table that are allowed in search results\n//\n// If this script is ever skipped, nothing breaks: the site still works, and index.html still carries the general words from the project's own\n",
"//                               so it deliberately has no address of its own (no canonical, no og:url): a post is never taken for the home page\n//   dist/<address>/index.html   each other page in the table, with its own words and its own address\n//   dist/post/<id>/index.html, dist/art-loft/prints/<id>/index.html, dist/art-loft/collections/<slug>/index.html\n//                               one for each published post, each published print and each collection, read from the database at build time\n//                               (see dynamicPages.mjs). If the database cannot be reached these are skipped and the build carries on.\n//                               A post or print added after the last build gets the home page's general words until the site is next built.\n//   dist/sitemap.xml            the addresses in the table, and those pages, that are allowed in search results\n//\n// If this script is ever skipped, nothing breaks: the site still works, and index.html still carries the general words from the project's own\n"
],
[
"import fs from 'node:fs'\nimport path from 'node:path'\nimport { createServer } from 'vite'\nimport { renderHead, fileFor, sitemapXml } from './shareHead.mjs'\n\nconst dist = path.resolve(process.argv[2] || 'dist')\nconst template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')\n\n// The table imports the rooms' own data the way the site does, so it is loaded the way the site loads it\nconst server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', root: process.cwd() })\nlet meta\ntry {\n  meta = await server.ssrLoadModule('/src/data/pageMeta.js')\n} finally {\n  await server.close()\n",
"import fs from 'node:fs'\nimport path from 'node:path'\nimport { createServer, loadEnv } from 'vite'\nimport { renderHead, fileFor, sitemapXml } from './shareHead.mjs'\nimport { collectionPage, databasePages } from './dynamicPages.mjs'\n\nconst dist = path.resolve(process.argv[2] || 'dist')\nconst template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')\n\n// The table imports the rooms' own data the way the site does, so it is loaded the way the site loads it\nconst server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', root: process.cwd() })\nlet meta, collections, rooms\ntry {\n  meta = await server.ssrLoadModule('/src/data/pageMeta.js')\n  collections = (await server.ssrLoadModule('/src/artloft/artLoftData.js')).COLLECTIONS\n  rooms = Object.fromEntries((await server.ssrLoadModule('/src/data/channels.js')).channels.map((c) => [c.slug, c.name]))\n} finally {\n  await server.close()\n"
],
[
"}\n\n// The sitemap\nfs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml(indexable))\nconsole.log(`Share pages: ${Object.keys(PAGES).length} written (${indexable.length} in the sitemap).`)\n",
"}\n\n// The collections (fixed), then each post and print from the database\nconst ctx = { siteUrl: meta.SITE_URL, siteName: SITE_NAME, rooms, images: IMAGES, siteImage: 'site', imageUrl: (key) => `${meta.SITE_URL}/share/${IMAGES[key].file}` }\nconst database = await databasePages({ ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }, ctx)\nconst extra = [...collections.map((c) => collectionPage(c, ctx)), ...database.pages].filter(Boolean)\nfor (const { urlPath, meta: info } of extra) {\n  const target = path.join(dist, fileFor(urlPath))\n  fs.mkdirSync(path.dirname(target), { recursive: true })\n  fs.writeFileSync(target, renderHead(template, info))\n  indexable.push(info.url)\n}\n\n// The sitemap\nfs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml(indexable))\nconsole.log(`Share pages: ${Object.keys(PAGES).length} written, plus ${collections.length} collections, ${database.counts.posts} post${database.counts.posts === 1 ? '' : 's'} and ${database.counts.prints} print${database.counts.prints === 1 ? '' : 's'} (${indexable.length} in the sitemap).`)\nfor (const note of database.notes) console.log(`  note: ${note}`)\n"
]
]
}''')
NEW_FILES = ["scripts/dynamicPages.mjs"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["scripts/shareHead.mjs", "src/data/pageMeta.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the share pages update first (starscapes-share-pages-17oct.zip). These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-share-posts-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    states = ['done' if new in text else 'todo' if text.count(old) == 1 else 'bad' for old, new in pairs]
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
    pathlib.Path(str(p) + '.before-share-posts').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
