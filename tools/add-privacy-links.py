#!/usr/bin/env python3
"""Adds one sentence to the Privacy policy draft about links to other websites such as the Substack.

Run it from the project folder, AFTER unzipping starscapes-privacy-links-20oct.zip into it:   python3 tools/add-privacy-links.py

What it does: it makes exact edits to one file that already exists (the legal pages) and adds the instructions from the zip (the unzip itself also replaces one test file).
  src/data/legalPages.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-privacy-links.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PRIVACY-LINKS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n//    the ICO says its guidance is under review after the Data (Use and Access) Act.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n",
"//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n//    the ICO says its guidance is under review after the Data (Use and Access) Act.\n//    A sentence about links to other websites such as the Substack was added on 20 October (SFW-236). If the Substack link in src/draftingdesk/draftingData.js is ever removed, take the sentence out too.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n"
],
[
"          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the free ebook, the ebook and our free blog posts. It receives your email address.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\"\n        ]\n      },\n",
"          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the free ebook, the ebook and our free blog posts. It receives your email address.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\",\n          \"Our site links to other websites, such as our Substack. Once you follow a link you have left this site, and that website's own privacy policy applies.\"\n        ]\n      },\n"
]
]
}''')
NEW_FILES = ["INSTALL-PRIVACY-LINKS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["tools/add-privacy-gaps.py", "src/draftingdesk/draftingData.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier privacy packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-privacy-links-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-privacy-links').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
