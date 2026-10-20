#!/usr/bin/env python3
"""Fills two gaps in the Privacy policy draft: Resend is the mailing tool, and emails to us are kept 2 years.

Run it from the project folder, AFTER unzipping starscapes-privacy-gaps-20oct.zip into it:   python3 tools/add-privacy-gaps.py

What it does: it makes exact edits to one file that already exists (the legal pages) and adds the instructions from the zip (the unzip itself also replaces one test file).
  src/data/legalPages.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-privacy-gaps.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PRIVACY-GAPS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//    delivery together. Wait for their answer to Gill's follow-up email, then correct those two sections (and the delivery estimate in the shop).\n//  * THE PRIVACY POLICY was brought up to date on 20 October 2026 (SFW-233): passes, the suggest and vote boxes, story votes, the free ebook (its tick box also says yes to free blog posts by email, so Marketing now says so),\n//    the YouTube player and the browser storage. STILL TO DO BEFORE IT GOES LIVE: [MAILING TOOL] needs the real name (and a working unsubscribe link in every email) before the ebook door opens; [2 years] for emails is a gap;\n//    the Founders' wall (display names, opt-in) and a newsletter each need their own lines when they are built; and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes straight away\n//    (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise). Re-check against the ICO's right-to-be-informed checklist near launch: the ICO says its guidance is under review after the Data (Use and Access) Act.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n",
"//    delivery together. Wait for their answer to Gill's follow-up email, then correct those two sections (and the delivery estimate in the shop).\n//  * THE PRIVACY POLICY was brought up to date on 20 October 2026 (SFW-233): passes, the suggest and vote boxes, story votes, the free ebook (its tick box also says yes to free blog posts by email, so Marketing now says so),\n//    the YouTube player and the browser storage. Decided 20 October: Resend is the mailing tool, and emails and messages to us are kept 2 years. THE ONLY GAP LEFT is the [date]. STILL TO DO BEFORE IT GOES LIVE: the ebook sign-up list\n//    is only stored in Supabase; before the ebook door opens it must reach a Resend audience and each email must be sent as a Resend Broadcast with its unsubscribe footer (not built yet); check which region the Resend account sends from\n//    and its plan limits (SFW-188); the Founders' wall (display names, opt-in) and a newsletter each need their own lines when built; and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes\n//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n//    the ICO says its guidance is under review after the Data (Use and Access) Act.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n"
],
[
"        \"paragraphs\": [\n          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends emails about your orders, account and passes, such as confirmations, receipts and password resets.\\n* **[MAILING TOOL]** sends the free ebook and our free blog posts by email. It receives your email address.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\"\n        ]\n      },\n      {\n        \"title\": \"Sending information abroad\",\n        \"paragraphs\": [\n          \"Some of the companies above handle information outside the UK, for example in the United States (such as Google, which runs YouTube, and our mailing tool) and in Ireland, where our database is stored. When they do, we rely on safeguards the law accepts, such as the UK's approved list of countries (which includes Ireland and the rest of the EU) or UK-approved standard contract terms. If you order for delivery outside the UK, your delivery details also go to the print studio that makes your order (in Brooklyn in the United States for the United States and Canada, and in Düsseldorf in Germany for the EU and the rest of the world) and to the courier in that country.\"\n        ]\n      },\n      {\n        \"title\": \"How long we keep it\",\n        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Free ebook sign-ups:** until you unsubscribe or ask us to delete your email address.\\n* **Emails and messages to us:** [2 years], then deleted.\\n* **Website logs:** for a short time only, as set by our hosting provider.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n        ]\n",
"        \"paragraphs\": [\n          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the free ebook, the ebook and our free blog posts. It receives your email address.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\"\n        ]\n      },\n      {\n        \"title\": \"Sending information abroad\",\n        \"paragraphs\": [\n          \"Some of the companies above handle information outside the UK, for example in the United States (such as Google, which runs YouTube) and in Ireland, where our database is stored. When they do, we rely on safeguards the law accepts, such as the UK's approved list of countries (which includes Ireland and the rest of the EU) or UK-approved standard contract terms. If you order for delivery outside the UK, your delivery details also go to the print studio that makes your order (in Brooklyn in the United States for the United States and Canada, and in Düsseldorf in Germany for the EU and the rest of the world) and to the courier in that country.\"\n        ]\n      },\n      {\n        \"title\": \"How long we keep it\",\n        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Free ebook sign-ups:** until you unsubscribe or ask us to delete your email address.\\n* **Emails and messages to us:** 2 years, then deleted.\\n* **Website logs:** for a short time only, as set by our hosting provider.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n        ]\n"
]
]
}''')
NEW_FILES = ["INSTALL-PRIVACY-GAPS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["tools/add-privacy-policy.py", "lib/sendEmail.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the privacy policy package first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-privacy-gaps-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-privacy-gaps').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
