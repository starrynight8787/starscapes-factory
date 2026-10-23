#!/usr/bin/env python3
"""Makes the footer's newsletter box wide and shorter on a computer-sized screen (style only) and adds a test that protects the layout and the keyboard order. The new test is only put in place if the edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-footer-newsletter-wide-23oct.zip into it:   python3 tools/add-footer-newsletter-wide.py

What it does: it makes one exact edit to 1 file and, only if it succeeds, puts one new test in place.
  src/newsletter/newsletter.css

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-footer-newsletter-wide.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-FOOTER-NEWSLETTER-WIDE.txt, tools/footer-newsletter-wide-files/test_footer-newsletter-layout.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/newsletter/newsletter.css": [
[
".nlp__error { max-width: 560px; margin: 0 0 16px; padding: 10px 14px; border: 2px solid #8f1d1d; border-radius: 10px; background: #fff1f1; color: #5c0f0f; font-weight: 700; }\n",
".nlp__error { max-width: 560px; margin: 0 0 16px; padding: 10px 14px; border: 2px solid #8f1d1d; border-radius: 10px; background: #fff1f1; color: #5c0f0f; font-weight: 700; }\n\n/* On a computer-sized screen the footer's sign-up box stretches across the footer and sits in two columns (the words on the left, the form on the right), so it is wide and short instead of narrow and tall.\n   The order in the page is unchanged (email, then the tick box, then the button), so the keyboard order still matches what you see. Phones and tablets keep the single column. */\n@media (min-width: 900px) {\n  .nl-signup { max-width: none; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); grid-template-rows: auto auto 1fr; column-gap: 48px; align-items: start; padding: 20px 28px; }\n  .nl-signup__title, .nl-signup__text { grid-column: 1; }\n  .nl-signup__text:last-of-type { margin-bottom: 0; }\n  .nl-signup__form { grid-column: 2; grid-row: 1 / span 3; }\n  .nl-signup__done { grid-column: 1 / -1; }\n}\n"
]
]
}''')
STAGED = {
    'test/footer-newsletter-layout.test.js': 'tools/footer-newsletter-wide-files/test_footer-newsletter-layout.test.js.staged',
}  # copied into place ONLY after the edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-FOOTER-NEWSLETTER-WIDE.txt", "tools/footer-newsletter-wide-files/test_footer-newsletter-layout.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-footer-newsletter-wide-23oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-footer-newsletter-wide').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-footer-newsletter-wide').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
