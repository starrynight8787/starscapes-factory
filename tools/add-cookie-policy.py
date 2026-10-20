#!/usr/bin/env python3
"""Adds a separate Cookie policy page (a draft, written from what the code really does), a footer link, its page title entry, and a cross-reference in the Privacy policy. (The package also adds one test and updates three.)

Run it from the project folder, AFTER unzipping starscapes-cookie-policy-20oct.zip into it:   python3 tools/add-cookie-policy.py

What it does: it makes exact edits to three files that already exist (the legal pages, the footer and the page titles table) and adds one new file from the zip (the unzip itself also adds one test file and replaces two).
  src/data/legalPages.js, src/components/Footer.jsx, src/data/pageMeta.js

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-cookie-policy.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-COOKIE-POLICY.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n//    in (round brackets) so they are not counted as gaps.\nexport const LEGAL_PAGES = [\n  {\n",
"//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n//    in (round brackets) so they are not counted as gaps.\n//  * COOKIES (added 20 October 2026): a separate Cookie policy, written from what the code really stores and loads. A test (test/cookie-policy.test.js) fails if the site starts storing something new, loading something from\n//    another company, or adding analytics without this page (and the Privacy policy's short cookies section) being brought up to date. THE ONLY GAP LEFT is the [date]. Google Fonts is named because the fonts\n//    are fetched from Google (src/styles/site.css): if the fonts are ever hosted on this site instead, take that line out (the test will say so). Gill asked for a separate page; the free-advice review (SFW-234) should\n//    confirm that no cookie banner is needed for sign-in, cart and the passes choice (they are needed for something the visitor asked for).\nexport const LEGAL_PAGES = [\n  {\n"
],
[
"        \"title\": \"Cookies and similar technologies\",\n        \"paragraphs\": [\n          \"We only use what the site needs to work: your sign-in, your cart, and the choice you make on the passes page. All three are kept on your own device. We don't use advertising or analytics cookies, so we don't show a cookie banner. Nothing loads from YouTube until you press play. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may store its own cookies on your device and see your IP address, under its own policy. Stripe's payment page sets its own cookies under its own policy. If we ever add analytics, we will ask your permission first and update this page.\"\n        ]\n      },\n",
"        \"title\": \"Cookies and similar technologies\",\n        \"paragraphs\": [\n          \"We only use what the site needs to work: your sign-in, your cart, and the choice you make on the passes page. All three are kept on your own device. We don't use advertising or analytics cookies, so we don't show a cookie banner. Nothing loads from YouTube until you press play. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may store its own cookies on your device and see your IP address, under its own policy. Stripe's payment page sets its own cookies under its own policy. Your browser also fetches our fonts from Google whenever a page loads, so Google receives your IP address and browser details; Google says its fonts service sets no cookies. If we ever add analytics, we will ask your permission first and update this page. The full list is on our [Cookie policy](/page/cookies).\"\n        ]\n      },\n"
],
[
"      }\n    ]\n  }\n]\n",
"      }\n    ]\n  },\n  {\n    \"slug\": \"cookies\",\n    \"title\": \"Cookie policy\",\n    \"updated\": \"[date]\",\n    \"ready\": false,\n    \"intro\": [\n      \"This page lists everything this website keeps on your device, and everything it loads from other companies, and why. It goes with our [Privacy policy](/page/privacy), which explains what we do with your information.\"\n    ],\n    \"sections\": [\n      {\n        \"title\": \"The short version\",\n        \"paragraphs\": [\n          \"We only use what the site needs to work. The site itself sets no cookies. It keeps three small things in your browser's storage, listed below, so that signing in, your cart and the passes page work as you would expect.\",\n          \"We don't use advertising cookies, analytics or visitor tracking of any kind. Because the three things below are needed for something you have asked the site to do, we don't show a cookie banner. If we ever add anything that needs your permission, we will ask first and update this page.\"\n        ]\n      },\n      {\n        \"title\": \"What the site keeps on your device\",\n        \"paragraphs\": [\n          \"| Name | What it is for | How long it stays |\\n| --- | --- | --- |\\n| A name that starts **sb-** and ends **-auth-token** | Keeps you signed in, so you can use My passes, vote in a story and read what your passes open. It is only there once you have signed in. | Until you log out or clear your browser's data |\\n| **sf-cart-v1** | Remembers what is in your cart, so it is still there if you leave and come back. It holds the prints in your cart, not your name or address. | Until you empty your cart or clear your browser's data |\\n| **sf-membership-choice** | Remembers which passes you ticked, and whether you chose monthly or yearly, so your choice is still there if you go back a page. | Until you close the tab |\",\n          \"The first two are kept in your browser's local storage, and the third in its session storage. They are not cookies. They stay on your device and are used only to make the site work for you.\"\n        ]\n      },\n      {\n        \"title\": \"What other companies set or see\",\n        \"paragraphs\": [\n          \"* **Google Fonts.** To draw our lettering, your browser fetches the fonts (Caveat, Inter, Josefin Sans, Sacramento and Schoolbell) from Google whenever a page loads. Google receives your IP address, the address of the font file and details of your browser, so that it can send them. Google says its fonts service does not set or log cookies ([Google's explanation](https://developers.google.com/fonts/faq/privacy)).\\n* **YouTube.** Nothing loads from YouTube until you press play on a video. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may then store its own cookies on your device and see your IP address, under its own policy ([how Google uses cookies](https://policies.google.com/technologies/cookies)).\\n* **Stripe.** When you pay, or manage your passes or your card, you leave our site for Stripe's own page. Stripe sets its own cookies there, to take payments and prevent fraud, under its own policy ([Stripe's privacy policy](https://stripe.com/gb/privacy)). We never see or store your card number.\"\n        ]\n      },\n      {\n        \"title\": \"What we don't use\",\n        \"paragraphs\": [\n          \"We don't use advertising cookies, analytics, visitor tracking, social media buttons or tracking pixels, or anything that follows you from one website to another. The links to our social media pages are ordinary links: nothing is sent to those sites unless you follow one.\"\n        ]\n      },\n      {\n        \"title\": \"Your choices\",\n        \"paragraphs\": [\n          \"You can see and delete what the site keeps from your browser's settings (look for \\\"cookies and site data\\\", or \\\"site data\\\"). If you delete the sign-in item you will be signed out, and if you delete the cart item your cart will be empty. You can also block fonts or videos from other companies using your browser or an extension: the site will still work, though some of the lettering may look different.\"\n        ]\n      },\n      {\n        \"title\": \"If this changes\",\n        \"paragraphs\": [\n          \"If we add anything that needs your permission, we will ask first, and we will update this page and the date at the top. If you have a question about any of this, use the contact details on our [Contact page](/page/contact).\"\n        ]\n      }\n    ]\n  }\n]\n"
]
],
"src/components/Footer.jsx": [
[
"// A page link shows once that page is ready. The OWNER also sees the pages that are not ready yet, marked \"draft\", so the whole site can be walked through.\nconst HELP = [['Art Loft prints', '/art-loft'], ['Cart', '/cart'], ['Delivery and returns', '/page/delivery'], ['Contact', '/page/contact']]\nconst LEGAL = [['Terms and conditions', '/page/terms'], ['Privacy policy', '/page/privacy'], ['Returns and refunds', '/page/returns'], ['AI policy', '/page/ai-policy'], ['Accessibility', '/page/accessibility']]\n\n// `social` can be passed in (the tests do), and otherwise comes from src/data/social.js\n",
"// A page link shows once that page is ready. The OWNER also sees the pages that are not ready yet, marked \"draft\", so the whole site can be walked through.\nconst HELP = [['Art Loft prints', '/art-loft'], ['Cart', '/cart'], ['Delivery and returns', '/page/delivery'], ['Contact', '/page/contact']]\nconst LEGAL = [['Terms and conditions', '/page/terms'], ['Privacy policy', '/page/privacy'], ['Cookie policy', '/page/cookies'], ['Returns and refunds', '/page/returns'], ['AI policy', '/page/ai-policy'], ['Accessibility', '/page/accessibility']]\n\n// `social` can be passed in (the tests do), and otherwise comes from src/data/social.js\n"
]
],
"src/data/pageMeta.js": [
[
"  '/page/terms': { title: 'Terms & Conditions', description: 'The terms that apply to everything bought on Starscapes Factory.', image: 'site', index: false, client: true },\n  '/page/privacy': { title: 'Privacy Policy', description: 'How Starscapes Factory uses your information.', image: 'site', index: false, client: true },\n  '/page/ai-policy': { title: 'AI Policy', description: 'How Starscapes Factory uses AI tools.', image: 'site', index: false, client: true },\n  '/page/returns': { title: 'Returns and refunds', description: 'Your rights to cancel an order, return a print and be refunded.', image: 'site', index: false, client: true },\n",
"  '/page/terms': { title: 'Terms & Conditions', description: 'The terms that apply to everything bought on Starscapes Factory.', image: 'site', index: false, client: true },\n  '/page/privacy': { title: 'Privacy Policy', description: 'How Starscapes Factory uses your information.', image: 'site', index: false, client: true },\n  '/page/cookies': { title: 'Cookie policy', description: 'What this website keeps on your device, and what other companies see.', image: 'site', index: false, client: true },\n  '/page/ai-policy': { title: 'AI Policy', description: 'How Starscapes Factory uses AI tools.', image: 'site', index: false, client: true },\n  '/page/returns': { title: 'Returns and refunds', description: 'Your rights to cancel an order, return a print and be refunded.', image: 'site', index: false, client: true },\n"
]
]
}''')
NEW_FILES = ["INSTALL-COOKIE-POLICY.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/invoice/InvoicePage.jsx", "src/membership/changeWindow.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-cookie-policy-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-cookie-policy').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
