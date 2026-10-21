#!/usr/bin/env python3
"""Hosts the site's fonts on the site itself (so nothing is sent to Google), keeps them cached for a year, and updates the Cookie and Privacy policy wording to match.

Run it from the project folder, AFTER unzipping starscapes-fonts-21oct.zip into it:   python3 tools/add-fonts.py

What it does: it makes exact edits to three files that already exist (the legal pages, site.css and vercel.json) and adds new files from the zip (the fonts, their stylesheet, a test and these notes; the unzip also replaces one test).
  src/data/legalPages.js, src/styles/site.css, vercel.json

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-fonts.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/styles/fonts.css, public/fonts/inter-latin-400-normal.woff2, test/fonts-hosted.test.js, INSTALL-SELF-HOSTED-FONTS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//  * COOKIES (added 20 October 2026): a separate Cookie policy, written from what the code really stores and loads. A test (test/cookie-policy.test.js) fails if the site starts storing something new, loading something from\n//    another company, or adding analytics without this page (and the Privacy policy's short cookies section) being brought up to date. THE ONLY GAP LEFT is the [date]. Google Fonts is named because the fonts\n//    are fetched from Google (src/styles/site.css): if the fonts are ever hosted on this site instead, take that line out (the test will say so). Gill asked for a separate page; the free-advice review (SFW-234) should\n//    confirm that no cookie banner is needed for sign-in, cart and the passes choice (they are needed for something the visitor asked for).\n",
"//  * COOKIES (added 20 October 2026): a separate Cookie policy, written from what the code really stores and loads. A test (test/cookie-policy.test.js) fails if the site starts storing something new, loading something from\n//    another company, or adding analytics without this page (and the Privacy policy's short cookies section) being brought up to date. THE ONLY GAP LEFT is the [date]. The fonts are kept on this site (public/fonts, SFW-246, 21 October 2026), so Google Fonts is\n//    not named: if the site ever fetches fonts from another company again, put that line back (the test will say so). Gill asked for a separate page; the free-advice review (SFW-234) should\n//    confirm that no cookie banner is needed for sign-in, cart and the passes choice (they are needed for something the visitor asked for).\n"
],
[
"        \"paragraphs\": [\n          \"We only use what the site needs to work: your sign-in, your cart, and the choice you make on the passes page. All three are kept on your own device. We don't use advertising or analytics cookies, so we don't show a cookie banner. Nothing loads from YouTube until you press play. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may store its own cookies on your device and see your IP address, under its own policy. Stripe's payment page sets its own cookies under its own policy. Your browser also fetches our fonts from Google whenever a page loads, so Google receives your IP address and browser details; Google says its fonts service sets no cookies. If we ever add analytics, we will ask your permission first and update this page. The full list is on our [Cookie policy](/page/cookies).\"\n        ]\n",
"        \"paragraphs\": [\n          \"We only use what the site needs to work: your sign-in, your cart, and the choice you make on the passes page. All three are kept on your own device. We don't use advertising or analytics cookies, so we don't show a cookie banner. Nothing loads from YouTube until you press play. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may store its own cookies on your device and see your IP address, under its own policy. Stripe's payment page sets its own cookies under its own policy. Our fonts are kept on our own server, so drawing our lettering tells no other company about your visit. If we ever add analytics, we will ask your permission first and update this page. The full list is on our [Cookie policy](/page/cookies).\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"* **Google Fonts.** To draw our lettering, your browser fetches the fonts (Caveat, Inter, Josefin Sans, Sacramento and Schoolbell) from Google whenever a page loads. Google receives your IP address, the address of the font file and details of your browser, so that it can send them. Google says its fonts service does not set or log cookies ([Google's explanation](https://developers.google.com/fonts/faq/privacy)).\\n* **YouTube.** Nothing loads from YouTube until you press play on a video. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may then store its own cookies on your device and see your IP address, under its own policy ([how Google uses cookies](https://policies.google.com/technologies/cookies)).\\n* **Stripe.** When you pay, or manage your passes or your card, you leave our site for Stripe's own page. Stripe sets its own cookies there, to take payments and prevent fraud, under its own policy ([Stripe's privacy policy](https://stripe.com/gb/privacy)). We never see or store your card number.\"\n        ]\n",
"        \"paragraphs\": [\n          \"* **YouTube.** Nothing loads from YouTube until you press play on a video. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may then store its own cookies on your device and see your IP address, under its own policy ([how Google uses cookies](https://policies.google.com/technologies/cookies)).\\n* **Stripe.** When you pay, or manage your passes or your card, you leave our site for Stripe's own page. Stripe sets its own cookies there, to take payments and prevent fraud, under its own policy ([Stripe's privacy policy](https://stripe.com/gb/privacy)). We never see or store your card number.\",\n          \"Our own lettering is kept on our own server, so drawing it tells no other company about your visit.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"You can see and delete what the site keeps from your browser's settings (look for \\\"cookies and site data\\\", or \\\"site data\\\"). If you delete the sign-in item you will be signed out, and if you delete the cart item your cart will be empty. You can also block fonts or videos from other companies using your browser or an extension: the site will still work, though some of the lettering may look different.\"\n        ]\n",
"        \"paragraphs\": [\n          \"You can see and delete what the site keeps from your browser's settings (look for \\\"cookies and site data\\\", or \\\"site data\\\"). If you delete the sign-in item you will be signed out, and if you delete the cart item your cart will be empty. You can also block videos from other companies using your browser or an extension: the site will still work.\"\n        ]\n"
]
],
"src/styles/site.css": [
[
"@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@400;500;600&family=Josefin+Sans:wght@300;400;500;600;700&family=Sacramento&family=Schoolbell&display=swap');\n\n",
"@import url('./fonts.css');\n\n"
]
],
"vercel.json": [
[
"  ],\n  \"rewrites\": [\n",
"  ],\n  \"headers\": [\n    {\n      \"source\": \"/fonts/(.*)\",\n      \"headers\": [\n        {\n          \"key\": \"Cache-Control\",\n          \"value\": \"public, max-age=31536000, immutable\"\n        }\n      ]\n    }\n  ],\n  \"rewrites\": [\n"
]
]
}''')
NEW_FILES = ["src/styles/fonts.css", "public/fonts/inter-latin-400-normal.woff2", "test/fonts-hosted.test.js", "INSTALL-SELF-HOSTED-FONTS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-fonts-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-fonts').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
