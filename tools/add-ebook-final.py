#!/usr/bin/env python3
"""Puts the final ebook and its real cover on the free ebook page with words that match the real book, brings three older test expectations up to date, and adds tests that keep the words, the file and the cover in agreement. The new test is only put in place if every edit succeeds. It does not open sign-ups.

Run it from the project folder, AFTER unzipping starscapes-ebook-final-23oct.zip into it:   python3 tools/add-ebook-final.py

What it does: it makes exact edits to 4 files and, only if all succeed, puts one new test in place.
  src/ebook/FreeEbookPage.jsx, src/ebook/ebookConfig.js, src/ebook/ebookv2.css, test/free-ebook.test.jsx

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-ebook-final.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-EBOOK.txt, tools/ebook-final-files/test_ebook-download.test.jsx.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{"src/ebook/FreeEbookPage.jsx": [["\n  const back = <p className=\"rp-back\"><Link to=\"/leadership-lounge\">← Back to Leadership Lounge</Link></p>\n  const cover = <div className=\"eb__cover\" aria-hidden=\"true\"><span>Leading from the Middle</span></div>\n\n  if (done) {\n", "\n  const back = <p className=\"rp-back\"><Link to=\"/leadership-lounge\">← Back to Leadership Lounge</Link></p>\n  const cover = <div className=\"eb__cover eb__cover--picture\"><img src=\"/ebook/leading-from-the-middle-cover.jpg\" width=\"910\" height=\"1287\" alt=\"Cover of Leading from the Middle by Gill Bennet\" /></div>\n\n  if (done) {\n"]], "src/ebook/ebookConfig.js": [["// The free ebook: its words and its file. Used by the page (src/ebook/FreeEbookPage.jsx) and by the newsletter's server code (lib/newsletter.js): getting the free ebook needs NO tick and does not sign anyone up to the newsletter. The newsletter is a separate, optional, unticked box on the page (the same words as everywhere: see OPTIONAL_NEWSLETTER_TEXT in src/newsletter/newsletterRules.js). The request itself is kept apart from the newsletter list.\n// WHEN THE PDF IS READY: save it in the project at public/downloads/ (for example public/downloads/leading-from-the-middle.pdf), then set \"file\" below to\n// '/downloads/leading-from-the-middle.pdf', push, and the page starts offering the download. While \"file\" is empty the page says the ebook is being finished,\n// and no email with a link is sent.\nexport const SITE_URL = 'https://starscapesfactory.com'\n\nexport const EBOOK = {\n  title: 'Leading from the Middle: the free ebook',\n  summary: 'A short guide for people who lead without the big title. Read it in an afternoon.',\n  inside: ['Why the middle is where most leading happens', 'Small habits for being heard without shouting', 'Questions to ask in your next one-to-one'],\n  file: '',\n  fileNote: 'PDF, about 40 pages.',\n  // The words recorded as what they asked for (chosen on the server, never taken from the browser). Nothing about the newsletter is in it: that has its own box and its own words.\n  request: 'Send me the free ebook, Leading from the Middle, by email.',\n", "// The free ebook: its words and its file. Used by the page (src/ebook/FreeEbookPage.jsx) and by the newsletter's server code (lib/newsletter.js): getting the free ebook needs NO tick and does not sign anyone up to the newsletter. The newsletter is a separate, optional, unticked box on the page (the same words as everywhere: see OPTIONAL_NEWSLETTER_TEXT in src/newsletter/newsletterRules.js). The request itself is kept apart from the newsletter list.\n// THE PDF is Gill's final book, saved as public/downloads/leading-from-the-middle.pdf (11 pages). A test checks that it is really there, that it is a PDF under 10 MB, and that the page count in \"fileNote\" below is right.\n// While \"file\" is empty the page says the ebook is being finished, and no email with a link is sent.\nexport const SITE_URL = 'https://starscapesfactory.com'\n\nexport const EBOOK = {\n  title: 'Leading from the Middle: the free ebook',\n  summary: 'A short book about leading without the big title, and the six building blocks behind it. Read it in one sitting.',\n  inside: ['My story, and why I believe you are already a leader', 'The six building blocks of Leading from the Middle', 'How they fit together, with a seesaw and the great circle of life'],\n  file: '/downloads/leading-from-the-middle.pdf',\n  fileNote: 'PDF, 11 pages, to read on screen or print.',\n  // The words recorded as what they asked for (chosen on the server, never taken from the browser). Nothing about the newsletter is in it: that has its own box and its own words.\n  request: 'Send me the free ebook, Leading from the Middle, by email.',\n"]], "src/ebook/ebookv2.css": [["@media (max-width: 760px) {\n  .eb--v2 .eb__layout {\n    grid-template-columns: minmax(0, 1fr);\n  }\n}\n", "@media (max-width: 760px) {\n  .eb--v2 .eb__layout {\n    grid-template-columns: minmax(0, 1fr);\n  }\n}\n\n/* The real cover picture (pale lines on white) in place of the plain card: no padding, a white ground, a thin edge so the white does not melt into the page, and the picture keeps its own proportions. */\n.eb--v2 .eb__side .eb__cover.eb__cover--picture { padding: 0; background: #fff; border: 1px solid #c9d3ec; overflow: hidden; aspect-ratio: 910 / 1287; }\n.eb__cover--picture img { display: block; width: 100%; height: auto; }\n"]], "test/free-ebook.test.jsx": [["    show()\n    expect(screen.getByRole('heading', { level: 1, name: 'Leading from the Middle: the free ebook' })).toBeInTheDocument()\n    expect(screen.getByText('A short guide for people who lead without the big title. Read it in an afternoon.')).toBeInTheDocument()\n    for (const line of EBOOK.inside) expect(screen.getByText(line)).toBeInTheDocument()\n    expect(screen.getByRole('link', { name: /Back to Leadership Lounge/ })).toHaveAttribute('href', '/leadership-lounge')\n", "    show()\n    expect(screen.getByRole('heading', { level: 1, name: 'Leading from the Middle: the free ebook' })).toBeInTheDocument()\n    expect(screen.getByText(EBOOK.summary)).toBeInTheDocument() // the exact words are pinned in test/ebook-download.test.jsx\n    for (const line of EBOOK.inside) expect(screen.getByText(line)).toBeInTheDocument()\n    expect(screen.getByRole('link', { name: /Back to Leadership Lounge/ })).toHaveAttribute('href', '/leadership-lounge')\n"], ["  })\n  it('while there is no PDF, says the ebook is not quite ready and the link will be emailed; once there is one, says the download waits on the page the button opens', async () => {\n    show(); fill(); expect(await screen.findByText(/not quite ready to download. As soon as it is, I will email you the link/)).toBeInTheDocument()\n    EBOOK.file = '/downloads/leading-from-the-middle.pdf'; const again = show(); again.unmount(); show(); fill()\n    expect(await screen.findByText(/The download will be waiting for you on the page the button opens/)).toBeInTheDocument(); expect(screen.queryByRole('link', { name: /Download the/ })).toBeNull()\n", "  })\n  it('while there is no PDF, says the ebook is not quite ready and the link will be emailed; once there is one, says the download waits on the page the button opens', async () => {\n    EBOOK.file = ''; show(); fill(); expect(await screen.findByText(/not quite ready to download. As soon as it is, I will email you the link/)).toBeInTheDocument()\n    EBOOK.file = '/downloads/leading-from-the-middle.pdf'; const again = show(); again.unmount(); show(); fill()\n    expect(await screen.findByText(/The download will be waiting for you on the page the button opens/)).toBeInTheDocument(); expect(screen.queryByRole('link', { name: /Download the/ })).toBeNull()\n"], ["    expect(read('src/ebook/FreeEbookPage.jsx')).not.toMatch(/style=\\{\\{/)\n  })\n  it('says in its own file how to add the PDF, and starts with no file so nothing is offered that is not there', () => {\n    expect(read('src/ebook/ebookConfig.js')).toMatch(/public\\/downloads\\//)\n    expect(originalFile).toBe('')\n  })\n  it('sets no text under 14px', () => {\n", "    expect(read('src/ebook/FreeEbookPage.jsx')).not.toMatch(/style=\\{\\{/)\n  })\n  it('says in its own file where the PDF is, and offers only that file (a test in test/ebook-download.test.jsx checks it is really there)', () => {\n    expect(read('src/ebook/ebookConfig.js')).toMatch(/public\\/downloads\\//)\n    expect(originalFile).toBe('/downloads/leading-from-the-middle.pdf')\n  })\n  it('sets no text under 14px', () => {\n"]]}''')
STAGED = {
    'test/ebook-download.test.jsx': 'tools/ebook-final-files/test_ebook-download.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-EBOOK.txt", "tools/ebook-final-files/test_ebook-download.test.jsx.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-ebook-final-23oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-ebook-final').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-ebook-final').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
