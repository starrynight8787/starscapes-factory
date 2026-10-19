#!/usr/bin/env python3
"""Fixes the page width, the stretching cards, the invisible placeholder star and a style-name clash, makes tables readable on a phone, and gives the new pages real tablet layouts.

Run it from the project folder, AFTER unzipping starscapes-layout-pass-19oct.zip into it:   python3 tools/add-layout-pass.py

What it does: it makes exact edits to thirteen files that already exist: the page styles for the banner pages, the entry pages, the Story Ledger, the Leadership Blog, YouTube, Home and the legal pages, and the pages that use them.
  src/components/pagebanner.css, src/den/youtube.css, src/entries/EntryPage.jsx, src/entries/entries.css, src/home/HomeSections.jsx, src/home/homeSections.css, src/leadership/LeadershipBlogPage.jsx, src/leadership/leadership.css, src/ledger/ledger.css, src/pages/StaticPage.jsx, src/pages/markdown.css, src/pages/simpleMarkdown.jsx, src/pages/staticpage.css

How it keeps you safe:
  - It checks ALL 13 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-layout-pass.
  - It is safe to run twice: a file already done is left alone.
  - The new files () come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/components/pagebanner.css": [
[
".rp:has(> .pb) {\n  max-width: 1232px;\n}\n.pb {\n",
".rp:has(> .pb) {\n  max-width: 1232px;\n}\n/* ...and the page column that holds it: every page sits in a .container that is only 720 pixels wide, which no page inside it can outgrow. 1272 is 1232 plus the 20 pixels of padding each side. */\n.container:has(> .rp > .pb) {\n  max-width: 1272px;\n}\n.pb {\n"
]
],
"src/den/youtube.css": [
[
"@media (max-width: 960px) {\n  .yt__grid {\n    grid-template-columns: 1fr;\n  }\n}\n@media (max-width: 700px) {\n  .yt__grid:not(.is-expanded) .yt__card:nth-child(n + 5) {\n    display: none;\n",
"@media (max-width: 960px) {\n  .yt__grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr)); /* a tablet: two to a row */\n  }\n}\n@media (max-width: 700px) {\n  .yt__grid {\n    grid-template-columns: 1fr; /* a phone: one under another */\n  }\n  .yt__grid:not(.is-expanded) .yt__card:nth-child(n + 5) {\n    display: none;\n"
]
],
"src/entries/EntryPage.jsx": [
[
"  return src\n    ? <img className={className} src={src} alt=\"\" loading=\"lazy\" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />\n    : <div className={`${className} en__img--empty`}><StarMark width={72} color=\"#DCE6FF\" /></div>\n}\n\n",
"  return src\n    ? <img className={className} src={src} alt=\"\" loading=\"lazy\" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />\n    : <div className={`${className} en__img--empty`}><StarMark width={72} color=\"#8AA2DA\" /></div>\n}\n\n"
]
],
"src/entries/entries.css": [
[
".rp.en {\n  max-width: 1232px;\n}\n.en__cols {\n",
".rp.en {\n  max-width: 1232px;\n}\n.container:has(> .rp.en) {\n  max-width: 1272px; /* the page column is only 720 pixels wide otherwise, however wide the page inside it wants to be */\n}\n.en__cols {\n"
],
[
"    display: flex;\n    flex-direction: column;\n    gap: 24px;\n  }\n",
"    display: flex;\n    flex-direction: column;\n    align-items: stretch; /* the wide-screen rule lines the boxes up at the top, which would leave each box only as wide as its words */\n    gap: 24px;\n  }\n"
],
[
"  }\n  .en__grid {\n    grid-template-columns: 1fr;\n  }\n  .en__grid:not(.is-expanded) .en__item:nth-child(n + 5) {\n",
"  }\n  .en__grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr)); /* a tablet: two to a row */\n  }\n  .en__grid:not(.is-expanded) .en__item:nth-child(n + 5) {\n"
],
[
"  }\n}\n",
"  }\n}\n@media (max-width: 720px) {\n  .en__grid {\n    grid-template-columns: 1fr; /* a phone: one under another */\n  }\n}\n"
]
],
"src/home/HomeSections.jsx": [
[
"        <img className=\"hs__postimg\" src={post.image_url} alt=\"\" loading=\"lazy\" />\n      ) : (\n        <div className=\"hs__postimg hs__postimg--empty\"><StarMark width={72} color=\"#DCE6FF\" /></div>\n      )}\n      <div className=\"hs__posttext\">\n",
"        <img className=\"hs__postimg\" src={post.image_url} alt=\"\" loading=\"lazy\" />\n      ) : (\n        <div className=\"hs__postimg hs__postimg--empty\"><StarMark width={72} color=\"#8AA2DA\" /></div>\n      )}\n      <div className=\"hs__posttext\">\n"
]
],
"src/home/homeSections.css": [
[
"}\n@media (max-width: 960px) {\n  .hs {\n    padding: 32px 16px;\n  }\n  .hs__top,\n  .hs__room,\n  .hs__post {\n    grid-template-columns: 1fr;\n    gap: 24px;\n  }\n  .hs__card {\n    padding: 24px;\n  }\n  .hs__title {\n",
"}\n@media (max-width: 960px) {\n  /* a tablet: the same boxes, a little smaller, still side by side */\n  .hs {\n    padding: 32px 16px;\n  }\n  .hs__top {\n    grid-template-columns: 1fr 1fr;\n    gap: 24px;\n  }\n  .hs__room {\n    grid-template-columns: 280px 1fr;\n    gap: 24px;\n  }\n  .hs__post {\n    grid-template-columns: 320px 1fr;\n    gap: 24px;\n  }\n  .hs__card {\n    padding: 24px;\n  }\n}\n@media (max-width: 720px) {\n  /* a phone: one box under another */\n  .hs__top,\n  .hs__room,\n  .hs__post {\n    grid-template-columns: 1fr;\n  }\n  .hs__title {\n"
]
],
"src/leadership/LeadershipBlogPage.jsx": [
[
"          {featured && (\n            <section className=\"lb__card lb__featured lb__o1\" aria-labelledby=\"lb-featured-title\">\n              {picture ? <img className=\"lb__img\" src={picture} alt=\"\" loading=\"lazy\" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} /> : <div className=\"lb__img lb__img--empty\"><StarMark width={72} color=\"#DCE6FF\" /></div>}\n              <p className=\"lb__meta\"><span className=\"pg-chip\">Featured</span> {formatDate(featured.created_at)}</p>\n              <h2 id=\"lb-featured-title\" className=\"lb__title\">{featured.title}</h2>\n",
"          {featured && (\n            <section className=\"lb__card lb__featured lb__o1\" aria-labelledby=\"lb-featured-title\">\n              {picture ? <img className=\"lb__img\" src={picture} alt=\"\" loading=\"lazy\" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} /> : <div className=\"lb__img lb__img--empty\"><StarMark width={72} color=\"#8AA2DA\" /></div>}\n              <p className=\"lb__meta\"><span className=\"pg-chip\">Featured</span> {formatDate(featured.created_at)}</p>\n              <h2 id=\"lb-featured-title\" className=\"lb__title\">{featured.title}</h2>\n"
]
],
"src/leadership/leadership.css": [
[
"    display: flex;\n    flex-direction: column;\n    gap: 24px;\n  }\n  .lb__left,\n  .lb__right {\n    display: contents; /* so the boxes of both columns can be put in one order on a phone */\n  }\n  .lb__boxes {\n    grid-template-columns: 1fr;\n  }\n  .lb__card .pg-btn,\n",
"    display: flex;\n    flex-direction: column;\n    align-items: stretch; /* the wide-screen rule lines the boxes up at the top, which would leave each box only as wide as its words */\n    gap: 24px;\n  }\n  .lb__left,\n  .lb__right {\n    display: contents; /* so the boxes of both columns can be put in one order on a phone */\n  }\n  .lb__card .pg-btn,\n"
],
[
"  }\n}\n",
"  }\n}\n@media (max-width: 720px) {\n  .lb__boxes {\n    grid-template-columns: 1fr; /* a tablet keeps the three boxes in a row; a phone stacks them */\n  }\n}\n"
]
],
"src/ledger/ledger.css": [
[
".rp.sl {\n  max-width: 1232px; /* 1200 pixels of content, as in the design */\n}\n.sl__sr {\n",
".rp.sl {\n  max-width: 1232px; /* 1200 pixels of content, as in the design */\n}\n.container:has(> .rp.sl) {\n  max-width: 1272px; /* the page column is only 720 pixels wide otherwise, however wide the page inside it wants to be */\n}\n.sl__sr {\n"
],
[
"  font-size: 0.95rem;\n}\n.sl__video {\n  display: block;\n",
"  font-size: 0.95rem;\n}\n.sl__video.sl__img--empty {\n  display: grid; /* the star in the middle of the picture panel (the rule below would make it a plain block, with the star in the corner) */\n  place-items: center;\n}\n.sl__video {\n  display: block;\n"
],
[
"}\n@media (max-width: 960px) {\n  .sl__row--wide,\n  .sl__row--even {\n    grid-template-columns: minmax(0, 1fr);\n  }\n  .sl__hero {\n    padding: 24px 16px;\n",
"}\n@media (max-width: 960px) {\n  /* a tablet: the same boxes side by side, a little tighter */\n  .sl__hero {\n    padding: 24px 16px;\n"
],
[
"  .sl__h2 {\n    font-size: 1.625rem;\n  }\n  .sl__types {\n",
"  .sl__h2 {\n    font-size: 1.625rem;\n  }\n}\n@media (max-width: 720px) {\n  /* a phone: one box under another */\n  .sl__row--wide,\n  .sl__row--even {\n    grid-template-columns: minmax(0, 1fr);\n  }\n  .sl__types {\n"
]
],
"src/pages/StaticPage.jsx": [
[
"function DraftBanner({ gaps }) {\n  return (\n    <div className=\"sp__draftwrap\">\n      <div className=\"sp__draft\" role=\"note\">\n        <strong>Draft: only you can see this page.</strong>{' '}\n        {gaps > 0 ? `${gaps} ${gaps === 1 ? 'gap' : 'gaps'} in [square brackets] still to fill. ` : 'No gaps are left in [square brackets]. '}\n",
"function DraftBanner({ gaps }) {\n  return (\n    <div className=\"txp__draftwrap\">\n      <div className=\"txp__draft\" role=\"note\">\n        <strong>Draft: only you can see this page.</strong>{' '}\n        {gaps > 0 ? `${gaps} ${gaps === 1 ? 'gap' : 'gaps'} in [square brackets] still to fill. ` : 'No gaps are left in [square brackets]. '}\n"
],
[
"  const gaps = page.ready ? 0 : countGaps(t.content)\n  return (\n    <main className=\"pg pg-text sp\">\n      {back}\n      {!page.ready && <DraftBanner gaps={gaps} />}\n      <h1>{t.title}</h1>\n      <div className=\"sp__body\">{nodes}</div>\n      {t.showEmail && CONTACT_EMAIL && (\n        <p>\n",
"  const gaps = page.ready ? 0 : countGaps(t.content)\n  return (\n    <main className=\"pg pg-text txp\">\n      {back}\n      {!page.ready && <DraftBanner gaps={gaps} />}\n      <h1>{t.title}</h1>\n      <div className=\"txp__body\">{nodes}</div>\n      {t.showEmail && CONTACT_EMAIL && (\n        <p>\n"
]
],
"src/pages/markdown.css": [
[
"/* Tables and quotes in the text pages (the legal pages). Stands on its own: nothing here depends on the old index.css rules. */\n.md-tablewrap {\n  margin: 0 0 16px;\n",
"/* Tables and quotes in the text pages (the legal pages). Stands on its own: nothing here depends on the old index.css rules. */\n.md-hint {\n  display: none; /* only on a phone, where the table scrolls sideways */\n}\n.md-tablewrap {\n  margin: 0 0 16px;\n"
],
[
"  margin: 0 0 12px;\n}\n",
"  margin: 0 0 12px;\n}\n\n/* The legal pages are drawn wider than the 720 pixel page column every page sits in, so the contents list and the text had only about 650 pixels between them and a table was\n   squeezed. 1000 is the legal page's 960 plus the 20 pixels of padding each side. (The accessibility statement is drawn narrow, so it is left as it is.) */\n.container:has(> .lg:not(.lg--narrow)) {\n  max-width: 1000px;\n}\n.md-tablewrap:focus-visible {\n  outline: 3px solid var(--sf-focus, #14306a);\n  outline-offset: 2px;\n}\n@media (max-width: 720px) {\n  /* on a phone a table keeps room for its columns and scrolls sideways inside its own box, instead of squeezing every cell to a few words */\n  .md-hint {\n    display: block;\n    margin: 0 0 6px;\n    font-size: 0.875rem;\n    color: var(--sf-muted, #5b6585);\n  }\n  .md-tablewrap table {\n    min-width: 560px;\n  }\n}\n"
]
],
"src/pages/simpleMarkdown.jsx": [
[
"    const body = rest.filter((r) => !/^\\|[\\s|:-]+\\|?$/.test(r.trim()))\n    nodes.push(\n      <div key={`t${nodes.length}`} className=\"md-tablewrap\">\n        <table>\n          <thead><tr>{cells(head).map((c, k) => <th key={k} scope=\"col\">{inline(c, `th${nodes.length}-${k}`)}</th>)}</tr></thead>\n          <tbody>{body.map((r, i) => <tr key={i}>{cells(r).map((c, k) => <td key={k}>{inline(c, `td${nodes.length}-${i}-${k}`)}</td>)}</tr>)}</tbody>\n        </table>\n      </div>,\n    )\n",
"    const body = rest.filter((r) => !/^\\|[\\s|:-]+\\|?$/.test(r.trim()))\n    nodes.push(\n      <div key={`t${nodes.length}`} className=\"md-table\">\n        <p className=\"md-hint\" aria-hidden=\"true\">Scroll sideways to see every column &rarr;</p>\n        <div className=\"md-tablewrap\" tabIndex={0} role=\"region\" aria-label=\"Table: scroll sideways to see every column\">\n        <table>\n          <thead><tr>{cells(head).map((c, k) => <th key={k} scope=\"col\">{inline(c, `th${nodes.length}-${k}`)}</th>)}</tr></thead>\n          <tbody>{body.map((r, i) => <tr key={i}>{cells(r).map((c, k) => <td key={k}>{inline(c, `td${nodes.length}-${i}-${k}`)}</td>)}</tr>)}</tbody>\n        </table>\n        </div>\n      </div>,\n    )\n"
]
],
"src/pages/staticpage.css": [
[
"/* Text pages: the legal pages, delivery, accessibility, contact. Stands on its own: nothing here depends on the old index.css rules. */\n.sp {\n  max-width: 760px;\n}\n.sp__draftwrap {\n  max-width: 820px;\n  margin: 8px auto 0;\n  padding: 0 16px;\n  box-sizing: border-box;\n}\n.sp__draft {\n  margin: 8px 0 16px;\n  padding: 12px 16px;\n",
"/* Text pages: the legal pages, delivery, accessibility, contact. Stands on its own: nothing here depends on the old index.css rules. */\n.txp {\n  max-width: 760px;\n}\n.txp__draftwrap {\n  max-width: 820px;\n  margin: 8px auto 0;\n  padding: 0 16px;\n  box-sizing: border-box;\n}\n.txp__draft {\n  margin: 8px 0 16px;\n  padding: 12px 16px;\n"
],
[
"  line-height: 1.5;\n}\n.sp__body {\n  font-size: 1.0625rem;\n  line-height: 1.65;\n  overflow-wrap: anywhere;\n}\n.sp__body h2 {\n  margin: 32px 0 8px;\n  font-family: var(--sf-head, 'Josefin Sans', sans-serif);\n  font-size: 1.5rem;\n  color: var(--sf-navy-700, #14306a);\n  scroll-margin-top: 24px;\n}\n.sp__body h3 {\n  margin: 24px 0 6px;\n  font-family: var(--sf-head, 'Josefin Sans', sans-serif);\n  font-size: 1.2rem;\n  color: var(--sf-navy-700, #14306a);\n  scroll-margin-top: 24px;\n}\n.sp__body p,\n.sp__body ul,\n.sp__body ol {\n  margin: 0 0 14px;\n}\n.sp__body ul,\n.sp__body ol {\n  padding-left: 1.5rem;\n}\n.sp__body li {\n  margin-bottom: 6px;\n}\n",
"  line-height: 1.5;\n}\n.txp__body {\n  font-size: 1.0625rem;\n  line-height: 1.65;\n  overflow-wrap: anywhere;\n}\n.txp__body h2 {\n  margin: 32px 0 8px;\n  font-family: var(--sf-head, 'Josefin Sans', sans-serif);\n  font-size: 1.5rem;\n  color: var(--sf-navy-700, #14306a);\n  scroll-margin-top: 24px;\n}\n.txp__body h3 {\n  margin: 24px 0 6px;\n  font-family: var(--sf-head, 'Josefin Sans', sans-serif);\n  font-size: 1.2rem;\n  color: var(--sf-navy-700, #14306a);\n  scroll-margin-top: 24px;\n}\n.txp__body p,\n.txp__body ul,\n.txp__body ol {\n  margin: 0 0 14px;\n}\n.txp__body ul,\n.txp__body ol {\n  padding-left: 1.5rem;\n}\n.txp__body li {\n  margin-bottom: 6px;\n}\n"
]
]
}''')
NEW_FILES = []

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/entries/EntryPage.jsx", "src/pages/markdown.css", "src/pages/StaticPage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('These files from earlier updates are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-layout-pass-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-layout-pass').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
