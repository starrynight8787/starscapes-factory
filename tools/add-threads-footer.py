#!/usr/bin/env python3
"""Adds your Threads, @gillycreates_, to the footer's Follow column and updates the three tests that said Threads was blank.

Run it from the project folder, AFTER unzipping starscapes-threads-footer-21oct.zip into it:   python3 tools/add-threads-footer.py

What it does: it makes exact edits to 4 files.
  src/data/contact.js, test/contact-details.test.js, test/footer-nav.test.jsx, test/foundations.test.jsx

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-threads-footer.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-THREADS-FOOTER.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/contact.js": [
[
"\n// The social accounts for the footer: Sarah Jr.'s. A blank one is simply not shown.\nexport const SOCIAL_LINKS = {\n  youtube: 'https://www.youtube.com/@sarahjradventures',\n  instagram: 'https://www.instagram.com/sarahjradventures/',\n  tiktok: 'https://www.tiktok.com/@sarahjradventures',\n  threads: '',\n}\n",
"\n// The social accounts for the footer: Sarah Jr.'s YouTube, Instagram and TikTok, and Gill's own Threads (@gillycreates_, chosen by Gill on 21 October 2026).\n// A blank one is simply not shown.\nexport const SOCIAL_LINKS = {\n  youtube: 'https://www.youtube.com/@sarahjradventures',\n  instagram: 'https://www.instagram.com/sarahjradventures/',\n  tiktok: 'https://www.tiktok.com/@sarahjradventures',\n  threads: 'https://www.threads.com/@gillycreates_', // Threads moved from threads.net to threads.com in 2025 (the old address still redirects)\n}\n"
]
],
"test/contact-details.test.js": [
[
"  })\n  it('leaves Threads blank until it is found, never a placeholder', () => {\n    expect(SOCIAL_LINKS.threads).toBe('')\n  })\n",
"  })\n  it('uses Gill\\u2019s own Threads, @gillycreates_, for the footer, on the current address (threads.com, not the old threads.net)', () => {\n    expect(SOCIAL_LINKS.threads).toBe('https://www.threads.com/@gillycreates_')\n  })\n"
],
[
"  it('only has real addresses on the right sites: no placeholders, and each one a proper account address', () => {\n    const hosts = { youtube: /^https:\\/\\/www\\.youtube\\.com\\/@[\\w.]+$/, tiktok: /^https:\\/\\/www\\.tiktok\\.com\\/@[\\w.]+$/, instagram: /^https:\\/\\/www\\.instagram\\.com\\/[\\w.]+\\/?$/ }\n    const all = [SOCIAL_LINKS, ...Object.values(PROJECT_SOCIALS)]\n",
"  it('only has real addresses on the right sites: no placeholders, and each one a proper account address', () => {\n    const hosts = { youtube: /^https:\\/\\/www\\.youtube\\.com\\/@[\\w.]+$/, tiktok: /^https:\\/\\/www\\.tiktok\\.com\\/@[\\w.]+$/, instagram: /^https:\\/\\/www\\.instagram\\.com\\/[\\w.]+\\/?$/, threads: /^https:\\/\\/www\\.threads\\.com\\/@[\\w.]+$/ }\n    const all = [SOCIAL_LINKS, ...Object.values(PROJECT_SOCIALS)]\n"
]
],
"test/footer-nav.test.jsx": [
[
"describe('the footer\\u2019s Follow column', () => {\n  it('has the heading from the design, and the accounts that have an address', () => {\n    const [, , follow] = navs()\n    expect(within(follow).getByRole('heading', { level: 2, name: 'Follow' })).toBeInTheDocument()\n    expect(within(follow).getAllByRole('link')).toHaveLength(3)\n  })\n",
"describe('the footer\\u2019s Follow column', () => {\n  it('has the heading from the design, and all four accounts', () => {\n    const [, , follow] = navs()\n    expect(within(follow).getByRole('heading', { level: 2, name: 'Follow' })).toBeInTheDocument()\n    expect(within(follow).getAllByRole('link').map((l) => l.textContent)).toEqual(['YouTube ↗', 'Instagram ↗', 'TikTok ↗', 'Threads ↗'])\n  })\n"
]
],
"test/foundations.test.jsx": [
[
"  })\n  it('the shipped list names the four accounts, and takes their addresses from contact.js (Threads is blank until found)', () => {\n    expect(social.map((s) => s.name)).toEqual(['YouTube', 'Instagram', 'TikTok', 'Threads'])\n    const byName = Object.fromEntries(social.map((s) => [s.name, s.url]))\n    expect(byName.YouTube).toBe(SOCIAL_LINKS.youtube)\n    expect(byName.Instagram).toBe(SOCIAL_LINKS.instagram)\n    expect(byName.TikTok).toBe(SOCIAL_LINKS.tiktok)\n    expect(byName.Threads).toBe(SOCIAL_LINKS.threads)\n    for (const name of ['YouTube', 'Instagram', 'TikTok']) expect(byName[name], name).toMatch(/^https:\\/\\//)\n  })\n  it('the real footer shows the accounts that have an address, and hides the blank one', () => {\n    renderFooter()\n    const nav = screen.getByRole('navigation', { name: 'Follow us' })\n    expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('aria-label'))).toEqual(['YouTube (opens in a new tab)', 'Instagram (opens in a new tab)', 'TikTok (opens in a new tab)'])\n  })\n",
"  })\n  it('the shipped list names the four accounts, and takes their addresses from contact.js (Threads is Gill\\u2019s own, @gillycreates_)', () => {\n    expect(social.map((s) => s.name)).toEqual(['YouTube', 'Instagram', 'TikTok', 'Threads'])\n    const byName = Object.fromEntries(social.map((s) => [s.name, s.url]))\n    expect(byName.YouTube).toBe(SOCIAL_LINKS.youtube)\n    expect(byName.Instagram).toBe(SOCIAL_LINKS.instagram)\n    expect(byName.TikTok).toBe(SOCIAL_LINKS.tiktok)\n    expect(byName.Threads).toBe(SOCIAL_LINKS.threads)\n    expect(byName.Threads).toBe('https://www.threads.com/@gillycreates_')\n    for (const name of ['YouTube', 'Instagram', 'TikTok', 'Threads']) expect(byName[name], name).toMatch(/^https:\\/\\//)\n  })\n  it('the real footer shows all four accounts, now that every one has an address', () => {\n    renderFooter()\n    const nav = screen.getByRole('navigation', { name: 'Follow us' })\n    expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('aria-label'))).toEqual(['YouTube (opens in a new tab)', 'Instagram (opens in a new tab)', 'TikTok (opens in a new tab)', 'Threads (opens in a new tab)'])\n    expect(within(nav).getByRole('link', { name: 'Threads (opens in a new tab)' })).toHaveAttribute('href', 'https://www.threads.com/@gillycreates_')\n  })\n"
]
]
}''')
NEW_FILES = ["INSTALL-THREADS-FOOTER.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-threads-footer-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-threads-footer').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
