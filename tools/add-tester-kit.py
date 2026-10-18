#!/usr/bin/env python3
"""Adds the tester kit: one switch that closes the whole site to search engines, a private page for testers, a real Contact page, and hides the four pages that are not ready.

Run it from the project folder, AFTER unzipping starscapes-tester-kit-18oct.zip into it:   python3 tools/add-tester-kit.py

What it does: it makes exact edits to eight files that already exist: the build, the footer and menu, the page table and the text pages.
  scripts/make-share-pages.mjs, scripts/shareHead.mjs, src/App.jsx, src/components/Footer.jsx, src/components/Navbar.jsx, src/data/pageMeta.js, src/data/staticPages.js, src/pages/StaticPage.jsx

How it keeps you safe:
  - It checks ALL 8 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-tester-kit.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/data/siteSettings.js, src/testers/testersData.js, src/testers/TestersPage.jsx, src/testers/testers.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"scripts/make-share-pages.mjs": [
[
"// The table imports the rooms' own data the way the site does, so it is loaded the way the site loads it\nconst server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', root: process.cwd() })\nlet meta, collections, rooms\ntry {\n  meta = await server.ssrLoadModule('/src/data/pageMeta.js')\n  collections = (await server.ssrLoadModule('/src/artloft/artLoftData.js')).COLLECTIONS\n  rooms = Object.fromEntries((await server.ssrLoadModule('/src/data/channels.js')).channels.map((c) => [c.slug, c.name]))\n} finally {\n  await server.close()\n}\nconst { PAGES, IMAGES, SITE_NAME, urlFor, fullTitleFor, imageUrlFor } = meta\n\nconst forPage = (page, urlPath) => ({\n",
"// The table imports the rooms' own data the way the site does, so it is loaded the way the site loads it\nconst server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', root: process.cwd() })\nlet meta, collections, rooms, settings\ntry {\n  meta = await server.ssrLoadModule('/src/data/pageMeta.js')\n  settings = await server.ssrLoadModule('/src/data/siteSettings.js')\n  collections = (await server.ssrLoadModule('/src/artloft/artLoftData.js')).COLLECTIONS\n  rooms = Object.fromEntries((await server.ssrLoadModule('/src/data/channels.js')).channels.map((c) => [c.slug, c.name]))\n} finally {\n  await server.close()\n}\nconst { PAGES, IMAGES, SITE_NAME, urlFor, fullTitleFor, imageUrlFor } = meta\n\n// Is the whole site closed to search engines? (src/data/siteSettings.js.) SEARCH_ENGINES_OVERRIDE is only for the tests: open or closed.\nconst allowed = process.env.SEARCH_ENGINES_OVERRIDE === 'open' ? true : process.env.SEARCH_ENGINES_OVERRIDE === 'closed' ? false : settings.SEARCH_ENGINES_ALLOWED === true\nconst closed = !allowed\n\nconst forPage = (page, urlPath) => ({\n"
],
[
"  const info = forPage(page, urlPath)\n  if (urlPath === '/') delete info.url // the home page file is also the fallback for unlisted addresses, so it carries no address of its own\n  fs.writeFileSync(target, renderHead(template, info))\n  if (page.index !== false) indexable.push(urlFor(urlPath))\n}\n",
"  const info = forPage(page, urlPath)\n  if (urlPath === '/') delete info.url // the home page file is also the fallback for unlisted addresses, so it carries no address of its own\n  fs.writeFileSync(target, renderHead(template, info, { closed }))\n  if (page.index !== false) indexable.push(urlFor(urlPath))\n}\n"
],
[
"  const target = path.join(dist, fileFor(urlPath))\n  fs.mkdirSync(path.dirname(target), { recursive: true })\n  fs.writeFileSync(target, renderHead(template, info))\n  indexable.push(info.url)\n}\n\n// The sitemap\nfs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml(indexable))\nconsole.log(`Share pages: ${Object.keys(PAGES).length} written, plus ${collections.length} collections, ${database.counts.posts} post${database.counts.posts === 1 ? '' : 's'} and ${database.counts.prints} print${database.counts.prints === 1 ? '' : 's'} (${indexable.length} in the sitemap).`)\nfor (const note of database.notes) console.log(`  note: ${note}`)\n",
"  const target = path.join(dist, fileFor(urlPath))\n  fs.mkdirSync(path.dirname(target), { recursive: true })\n  fs.writeFileSync(target, renderHead(template, info, { closed }))\n  indexable.push(info.url)\n}\n\n// The sitemap\nfs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml(closed ? [] : indexable))\nconsole.log(closed ? 'The whole site is CLOSED to search engines (every page says noindex, and the sitemap is empty). To open it, set SEARCH_ENGINES_ALLOWED to true in src/data/siteSettings.js.' : 'The site is OPEN to search engines.')\nconsole.log(`Share pages: ${Object.keys(PAGES).length} written, plus ${collections.length} collections, ${database.counts.posts} post${database.counts.posts === 1 ? '' : 's'} and ${database.counts.prints} print${database.counts.prints === 1 ? '' : 's'} (${indexable.length} in the sitemap).`)\nfor (const note of database.notes) console.log(`  note: ${note}`)\n"
]
],
"scripts/shareHead.mjs": [
[
"\n// meta: { title, description, siteName, url (omit for a page with no address of its own), imageUrl, imageAlt, index }\nexport function renderHead(template, meta) {\n  let html = String(template)\n  for (const pattern of OURS) html = html.replace(pattern, '')\n",
"\n// meta: { title, description, siteName, url (omit for a page with no address of its own), imageUrl, imageAlt, index }\n// options.closed: the whole site is closed to search engines (src/data/siteSettings.js), so EVERY page says noindex, nofollow, not only the private ones\nexport function renderHead(template, meta, { closed = false } = {}) {\n  let html = String(template)\n  for (const pattern of OURS) html = html.replace(pattern, '')\n"
],
[
"    `<link rel=\"icon\" type=\"image/png\" href=\"${ICON}\" />`,\n    `<link rel=\"apple-touch-icon\" href=\"${ICON}\" />`,\n    ...(meta.index === false ? ['<meta name=\"robots\" content=\"noindex\" />'] : []),\n    ...(meta.url ? [`<link rel=\"canonical\" href=\"${esc(meta.url)}\" />`] : []),\n    '<meta property=\"og:type\" content=\"website\" />',\n",
"    `<link rel=\"icon\" type=\"image/png\" href=\"${ICON}\" />`,\n    `<link rel=\"apple-touch-icon\" href=\"${ICON}\" />`,\n    ...(closed ? ['<meta name=\"robots\" content=\"noindex, nofollow\" />'] : meta.index === false ? ['<meta name=\"robots\" content=\"noindex\" />'] : []),\n    ...(meta.url ? [`<link rel=\"canonical\" href=\"${esc(meta.url)}\" />`] : []),\n    '<meta property=\"og:type\" content=\"website\" />',\n"
]
],
"src/App.jsx": [
[
"import ChannelPage from './pages/ChannelPage'\nimport StaticPage from './pages/StaticPage'\nimport Footer from './components/Footer'\nimport ProductGallery from './pages/ProductGallery'\n",
"import ChannelPage from './pages/ChannelPage'\nimport StaticPage from './pages/StaticPage'\nimport TestersPage from './testers/TestersPage'\nimport Footer from './components/Footer'\nimport ProductGallery from './pages/ProductGallery'\n"
],
[
"<Route path=\"/post/:id\" element={<PostPage session={session} />} />\n<Route path=\"/page/:slug\" element={<StaticPage />} /> \n<Route path=\"/products\" element={<ProductGallery />} /> \n<Route path=\"/products/:id\" element={<ProductPage />} /> \n",
"<Route path=\"/post/:id\" element={<PostPage session={session} />} />\n<Route path=\"/page/:slug\" element={<StaticPage />} /> \n<Route path=\"/testers\" element={<TestersPage />} />\n<Route path=\"/products\" element={<ProductGallery />} /> \n<Route path=\"/products/:id\" element={<ProductPage />} /> \n"
]
],
"src/components/Footer.jsx": [
[
"import Logo from './Logo'\nimport { social as socialLinks } from '../data/social'\nimport '../styles/site.css'\n\n",
"import Logo from './Logo'\nimport { social as socialLinks } from '../data/social'\nimport { pageIsReady } from '../data/staticPages'\nimport '../styles/site.css'\n\n"
],
[
"          <div>\n            <nav className=\"sf-footer__links\" aria-label=\"Footer\">\n              {links.map(([label, to]) => (\n                <Link key={to} to={to}>\n                  {label}\n",
"          <div>\n            <nav className=\"sf-footer__links\" aria-label=\"Footer\">\n              {links.filter(([, to]) => pageIsReady(to.replace('/page/', ''))).map(([label, to]) => (\n                <Link key={to} to={to}>\n                  {label}\n"
]
],
"src/components/Navbar.jsx": [
[
"import { supabase } from '../supabaseClient'\nimport { channels } from '../data/channels'\nimport { roomPath } from '../data/roomImages'\nimport Logo from './Logo'\n",
"import { supabase } from '../supabaseClient'\nimport { channels } from '../data/channels'\nimport { pageIsReady } from '../data/staticPages'\nimport { roomPath } from '../data/roomImages'\nimport Logo from './Logo'\n"
],
[
"              )}\n            </div>\n            <Link to=\"/page/about\" className=\"sf-link\">\n              About\n            </Link>\n            <CartNavLink className=\"sf-link\" />\n          </div>\n",
"              )}\n            </div>\n            {pageIsReady('about') && (\n              <Link to=\"/page/about\" className=\"sf-link\">\n                About\n              </Link>\n            )}\n            <CartNavLink className=\"sf-link\" />\n          </div>\n"
],
[
"              </Link>\n            ))}\n            <Link to=\"/page/about\" className=\"sf-menu__item sf-menu__item--plain\" onClick={closeMenu}>\n              About\n            </Link>\n            <CartNavLink className=\"sf-menu__item sf-menu__item--plain\" onClick={closeMenu} />\n            {isOwner && (\n",
"              </Link>\n            ))}\n            {pageIsReady('about') && (\n              <Link to=\"/page/about\" className=\"sf-menu__item sf-menu__item--plain\" onClick={closeMenu}>\n                About\n              </Link>\n            )}\n            <CartNavLink className=\"sf-menu__item sf-menu__item--plain\" onClick={closeMenu} />\n            {isOwner && (\n"
]
],
"src/data/pageMeta.js": [
[
"  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/page/about': { title: 'About Me', description: 'About the person behind Starscapes Factory.', image: 'site', index: false, client: true },\n  '/page/contact': { title: 'Contact', description: 'How to get in touch with Starscapes Factory.', image: 'site', index: false, client: true },\n",
"  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/testers': { title: 'For testers', description: 'A private page for the people testing Starscapes Factory.', image: 'site', index: false, client: true },\n  '/page/about': { title: 'About Me', description: 'About the person behind Starscapes Factory.', image: 'site', index: false, client: true },\n  '/page/contact': { title: 'Contact', description: 'How to get in touch with Starscapes Factory.', image: 'site', index: false, client: true },\n"
]
],
"src/data/staticPages.js": [
[
"  {\n    slug: 'about',\n    title: 'About Me',\n    content: `Hi, I'm Gill — the person behind Starscapes Factory.\n",
"  {\n    slug: 'about',\n    ready: false,\n    title: 'About Me',\n    content: `Hi, I'm Gill — the person behind Starscapes Factory.\n"
],
[
"  {\n    slug: 'contact',\n    title: 'Contact',\n    content: `Want to get in touch? Reach me at:\n\nimagine@starscapesfactory.com\n\n[Replace with your real contact email, or add a contact form here later.]`,\n  },\n  {\n    slug: 'terms',\n    title: 'Terms & Conditions',\n    content: `Last updated: [date]\n",
"  {\n    slug: 'contact',\n    ready: true,\n    showEmail: true,\n    title: 'Contact',\n    content: `Want to get in touch? I read every message myself, and I will reply as soon as I can.\n\nEmail is the best way to reach me. If it is about an order, please put your order number in the message, so I can find it quickly.`,\n  },\n  {\n    slug: 'terms',\n    ready: false,\n    title: 'Terms & Conditions',\n    content: `Last updated: [date]\n"
],
[
"  {\n    slug: 'privacy',\n    title: 'Privacy Policy',\n    content: `Last updated: [date]\n",
"  {\n    slug: 'privacy',\n    ready: false,\n    title: 'Privacy Policy',\n    content: `Last updated: [date]\n"
],
[
"  {\n    slug: 'ai-policy',\n    title: 'AI Policy',\n    content: `Last updated: [date]\n",
"  {\n    slug: 'ai-policy',\n    ready: false,\n    title: 'AI Policy',\n    content: `Last updated: [date]\n"
],
[
"Contact: imagine@starscapesfactory.com`,\n  },\n]",
"Contact: imagine@starscapesfactory.com`,\n  },\n]\n\n// A page is only shown, and only linked from the footer and the menu, once \"ready\" is true. Set it to true when the page has its real words.\n// (Until then the address shows a plain \"not ready yet\" message, never the placeholder text.)\nexport const pageIsReady = (slug) => {\n  const page = staticPages.find((p) => p.slug === slug)\n  return Boolean(page && page.ready === true)\n}\n"
]
],
"src/pages/StaticPage.jsx": [
[
"import { Link, useParams } from 'react-router-dom'\nimport { staticPages } from '../data/staticPages'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\n",
"import { Link, useParams } from 'react-router-dom'\nimport { staticPages } from '../data/staticPages'\nimport { CONTACT_EMAIL } from '../data/contact'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\n"
],
[
"  }\n\n  return (\n    <main className=\"pg pg-text\">\n",
"  }\n\n  // A page whose real words are not written yet is never shown: no placeholder text reaches a visitor\n  if (page.ready !== true) {\n    return (\n      <main className=\"pg pg-text\">\n        <p className=\"rp-back\">\n          <Link to=\"/\">&larr; Back home</Link>\n        </p>\n        <h1>{page.title}</h1>\n        <p>This page is not ready yet. Please check back soon.</p>\n      </main>\n    )\n  }\n\n  return (\n    <main className=\"pg pg-text\">\n"
],
[
"      <h1>{page.title}</h1>\n      <div className=\"pg-text__body\">{page.content}</div>\n    </main>\n  )\n",
"      <h1>{page.title}</h1>\n      <div className=\"pg-text__body\">{page.content}</div>\n      {page.showEmail && CONTACT_EMAIL && (\n        <p>\n          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>\n        </p>\n      )}\n    </main>\n  )\n"
]
]
}''')
NEW_FILES = ["src/data/siteSettings.js", "src/testers/testersData.js", "src/testers/TestersPage.jsx", "src/testers/testers.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/styles/forms.css", "src/styles/legacy.css"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install restyle part 2 first (starscapes-restyle-two-18oct.zip). These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-tester-kit-18oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-tester-kit').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
