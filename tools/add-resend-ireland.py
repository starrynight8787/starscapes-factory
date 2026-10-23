#!/usr/bin/env python3
"""Adds the Resend Ireland wording to the Privacy policy (two sentences and a note) and a test for it. The new test is only put in place if every edit succeeds. It publishes nothing.

Run it from the project folder, AFTER unzipping starscapes-resend-ireland-23oct.zip into it:   python3 tools/add-resend-ireland.py

What it does: it makes exact edits to 1 file and, only if all succeed, puts one new test in place.
  src/data/legalPages.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-resend-ireland.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-RESEND-IRELAND.txt, tools/resend-ireland-files/test_resend-region.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{"src/data/legalPages.js": [["//    the YouTube player and the browser storage. Decided 20 October: Resend is the mailing tool, and emails and messages to us are kept 2 years. THE ONLY GAP LEFT is the [date]. STILL TO DO BEFORE IT GOES LIVE: the newsletter list is kept in\n//    Supabase (21 October 2026), and one-purpose requests such as the free ebook are in email_requests (22 October 2026); check which region the Resend account sends from\n//    and its plan limits (SFW-188); the newsletter's lines were added on 21 October 2026, with a daily job that deletes sign-ups nobody confirms after 30 days; and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes\n//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n", "//    the YouTube player and the browser storage. Decided 20 October: Resend is the mailing tool, and emails and messages to us are kept 2 years. THE ONLY GAP LEFT is the [date]. STILL TO DO BEFORE IT GOES LIVE: the newsletter list is kept in\n//    Supabase (21 October 2026), and one-purpose requests such as the free ebook are in email_requests (22 October 2026); Resend sends from Ireland (eu-west-1), confirmed by Gill on 23 October 2026;\n//    its plan limits are still to confirm (SFW-265); the newsletter's lines were added on 21 October 2026, with a daily job that deletes sign-ups nobody confirms after 30 days; and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes\n//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n"], ["          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account, your profile and your order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the newsletter or ask for the free ebook, the email asking you to confirm, the link to the ebook, and then the newsletter if you signed up for it. It receives your email address.\\n* **Cloudflare** runs the security check (called Turnstile) on our sign-up, log-in and forgot-password pages. It checks signals from your browser to tell people from automated programs, and gives your browser a one-time token that we use to let you in. It sees your IP address and browser details.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\",\n", "          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account, your profile and your order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the newsletter or ask for the free ebook, the email asking you to confirm, the link to the ebook, and then the newsletter if you signed up for it. It receives your email address, and sends from its Ireland region.\\n* **Cloudflare** runs the security check (called Turnstile) on our sign-up, log-in and forgot-password pages. It checks signals from your browser to tell people from automated programs, and gives your browser a one-time token that we use to let you in. It sees your IP address and browser details.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\",\n"], ["        \"paragraphs\": [\n          \"Some of the companies above handle information outside the UK, for example in the United States (such as Google, which runs YouTube, and Cloudflare, which runs our security check) and in Ireland, where our database is stored. When they do, we rely on safeguards the law accepts, such as the UK's approved list of countries (which includes Ireland and the rest of the EU) or UK-approved standard contract terms. If you order for delivery outside the UK, your delivery details also go to the print studio that makes your order (in Brooklyn in the United States for the United States and Canada, and in Düsseldorf in Germany for the EU and the rest of the world) and to the courier in that country.\"\n        ]\n", "        \"paragraphs\": [\n          \"Some of the companies above handle information outside the UK, for example in the United States (such as Google, which runs YouTube, and Cloudflare, which runs our security check) and in Ireland, where our database is stored and where our emails are sent from. When they do, we rely on safeguards the law accepts, such as the UK's approved list of countries (which includes Ireland and the rest of the EU) or UK-approved standard contract terms. If you order for delivery outside the UK, your delivery details also go to the print studio that makes your order (in Brooklyn in the United States for the United States and Canada, and in Düsseldorf in Germany for the EU and the rest of the world) and to the courier in that country.\"\n        ]\n"]]}''')
STAGED = {
    'test/resend-region.test.js': 'tools/resend-ireland-files/test_resend-region.test.js.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-RESEND-IRELAND.txt", "tools/resend-ireland-files/test_resend-region.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-resend-ireland-23oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-resend-ireland').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-resend-ireland').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
