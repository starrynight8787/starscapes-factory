#!/usr/bin/env python3
"""Changes one sentence in the Privacy policy's newsletter row: a plainer reason for keeping people who have unsubscribed. The policy stays a draft.

Run it from the project folder, AFTER unzipping starscapes-privacy-wording-20oct.zip into it:   python3 tools/add-privacy-wording.py

What it does: it makes one exact edit to the legal pages file (it only works once the earlier privacy package is installed) and adds one new file from the zip (the unzip itself also replaces one test).
  src/data/legalPages.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-privacy-wording.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PRIVACY-WORDING.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, and the date and wording you agreed to | When you sign up for the free ebook | To send you the ebook and our free blog posts by email | Your consent, which you can take back at any time |\\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter, confirm it, or unsubscribe | To send you the newsletter, to keep proof that you asked for it and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in respecting your choice if you leave |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\"\n",
"        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, and the date and wording you agreed to | When you sign up for the free ebook | To send you the ebook and our free blog posts by email | Your consent, which you can take back at any time |\\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter, confirm it, or unsubscribe | To send you the newsletter, to keep proof that you asked for it and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in making sure we never email someone who has asked us to stop |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\"\n"
]
]
}''')
NEW_FILES = ["INSTALL-PRIVACY-WORDING.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-privacy-wording-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-privacy-wording').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
