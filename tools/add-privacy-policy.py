#!/usr/bin/env python3
"""Updates the Privacy policy draft for passes, suggest and vote, story votes, the free ebook and YouTube (owner-only draft).

Run it from the project folder, AFTER unzipping starscapes-privacy-policy-20oct.zip into it:   python3 tools/add-privacy-policy.py

What it does: it makes exact edits to one file that already exists (the legal pages) and adds the instructions from the zip (the unzip itself also replaces one test file).
  src/data/legalPages.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-privacy-policy.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PRIVACY-POLICY.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//    days AFTER posting. The print service's help article says postal orders do not include detailed tracking, and their reply says 6 to 10 working days covers production AND\n//    delivery together. Wait for their answer to Gill's follow-up email, then correct those two sections (and the delivery estimate in the shop).\n//  * THE PRIVACY POLICY IS OLDER THAN THE SITE. It says the site uses only sign-in and cart storage and that \"we don't send marketing emails\". Since it was written the site\n//    has also gained: the FREE EBOOK SIGN-UP (an email address, and a record of when the person agreed); the SUGGEST AND VOTE boxes (a signed-in person's suggestions and\n//    votes are stored; who voted is never shown); and the YOUTUBE PLAYER (nothing loads from YouTube until a visitor presses play, and YouTube may then set its own cookies).\n//    The policy needs a line for each, and the ebook door stays closed until it has them. Also the [2 years] for emails is a gap, and a newsletter would need its own section.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n",
"//    days AFTER posting. The print service's help article says postal orders do not include detailed tracking, and their reply says 6 to 10 working days covers production AND\n//    delivery together. Wait for their answer to Gill's follow-up email, then correct those two sections (and the delivery estimate in the shop).\n//  * THE PRIVACY POLICY was brought up to date on 20 October 2026 (SFW-233): passes, the suggest and vote boxes, story votes, the free ebook (its tick box also says yes to free blog posts by email, so Marketing now says so),\n//    the YouTube player and the browser storage. STILL TO DO BEFORE IT GOES LIVE: [MAILING TOOL] needs the real name (and a working unsubscribe link in every email) before the ebook door opens; [2 years] for emails is a gap;\n//    the Founders' wall (display names, opt-in) and a newsletter each need their own lines when they are built; and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes straight away\n//    (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise). Re-check against the ICO's right-to-be-informed checklist near launch: the ICO says its guidance is under review after the Data (Use and Access) Act.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n"
],
[
"        \"title\": \"What we collect and why\",\n        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\"\n        ]\n      },\n      {\n        \"title\": \"Cookies and similar technologies\",\n        \"paragraphs\": [\n          \"We only use what the site needs to work: your sign-in, and your cart. Both are kept on your own device. We don't use advertising or analytics cookies, so we don't show a cookie banner. Stripe's payment page sets its own cookies under its own policy. If we ever add analytics, we will ask your permission first and update this page.\"\n        ]\n      },\n      {\n        \"title\": \"Who we share your information with\",\n        \"paragraphs\": [\n          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payment. It receives your name, email and payment details.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends emails such as order confirmations and password resets.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\"\n        ]\n      },\n      {\n        \"title\": \"Sending information abroad\",\n        \"paragraphs\": [\n          \"Some of the companies above handle information outside the UK, for example in the United States and in Ireland, where our database is stored. When they do, we rely on safeguards the law accepts, such as the UK's approved list of countries (which includes Ireland and the rest of the EU) or UK-approved standard contract terms. If you order for delivery outside the UK, your delivery details also go to the print studio that makes your order (in Brooklyn in the United States for the United States and Canada, and in Düsseldorf in Germany for the EU and the rest of the world) and to the courier in that country.\"\n        ]\n      },\n      {\n        \"title\": \"How long we keep it\",\n        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Emails and messages to us:** [2 years], then deleted.\\n* **Website logs:** for a short time only, as set by our hosting provider.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n        ]\n",
"        \"title\": \"What we collect and why\",\n        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, and the date and wording you agreed to | When you sign up for the free ebook | To send you the ebook and our free blog posts by email | Your consent, which you can take back at any time |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\"\n        ]\n      },\n      {\n        \"title\": \"Suggestions and votes\",\n        \"paragraphs\": [\n          \"We read every suggestion before it appears. What appears is the suggestion and the reason you gave, never your name or email address. Votes are shown only as totals: nobody can see who voted for what, and nobody else can see your vote. In a story vote, you see the totals once you have voted, and everyone sees them when the vote has closed.\",\n          \"We could see who voted for what by looking directly in our database, but we don't look. We only ever use the totals. If you ask us to delete your account, your suggestions, your votes and your passes record are deleted with it. Payment records are kept: see How long we keep it.\"\n        ]\n      },\n      {\n        \"title\": \"Cookies and similar technologies\",\n        \"paragraphs\": [\n          \"We only use what the site needs to work: your sign-in, your cart, and the choice you make on the passes page. All three are kept on your own device. We don't use advertising or analytics cookies, so we don't show a cookie banner. Nothing loads from YouTube until you press play. When you do, the video plays through YouTube's privacy-enhanced player, and YouTube may store its own cookies on your device and see your IP address, under its own policy. Stripe's payment page sets its own cookies under its own policy. If we ever add analytics, we will ask your permission first and update this page.\"\n        ]\n      },\n      {\n        \"title\": \"Who we share your information with\",\n        \"paragraphs\": [\n          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends emails about your orders, account and passes, such as confirmations, receipts and password resets.\\n* **[MAILING TOOL]** sends the free ebook and our free blog posts by email. It receives your email address.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\"\n        ]\n      },\n      {\n        \"title\": \"Sending information abroad\",\n        \"paragraphs\": [\n          \"Some of the companies above handle information outside the UK, for example in the United States (such as Google, which runs YouTube, and our mailing tool) and in Ireland, where our database is stored. When they do, we rely on safeguards the law accepts, such as the UK's approved list of countries (which includes Ireland and the rest of the EU) or UK-approved standard contract terms. If you order for delivery outside the UK, your delivery details also go to the print studio that makes your order (in Brooklyn in the United States for the United States and Canada, and in Düsseldorf in Germany for the EU and the rest of the world) and to the courier in that country.\"\n        ]\n      },\n      {\n        \"title\": \"How long we keep it\",\n        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Free ebook sign-ups:** until you unsubscribe or ask us to delete your email address.\\n* **Emails and messages to us:** [2 years], then deleted.\\n* **Website logs:** for a short time only, as set by our hosting provider.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"The law gives you rights over your information. You can ask us to:\",\n          \"* tell you what we hold about you, and give you a copy\\n* correct anything that is wrong\\n* delete your information, where we have no good reason to keep it\\n* limit how we use it\\n* stop using it where we rely on our legitimate interest\\n* give you your information in a form you can move elsewhere\",\n          \"To use any of these, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). We will reply within one month, and it is normally free. We will need to check who you are first. We may have to keep some records, such as invoices, even if you ask us to delete your information.\"\n        ]\n      },\n      {\n        \"title\": \"Marketing\",\n        \"paragraphs\": [\n          \"We don't send marketing emails. If that changes, we will ask for your permission first, and every email will have a way to unsubscribe.\"\n        ]\n      },\n",
"        \"paragraphs\": [\n          \"The law gives you rights over your information. You can ask us to:\",\n          \"* tell you what we hold about you, and give you a copy\\n* correct anything that is wrong\\n* delete your information, where we have no good reason to keep it\\n* limit how we use it\\n* stop using it where we rely on our legitimate interest\\n* give you your information in a form you can move elsewhere\\n* take back your consent whenever you like, such as with the unsubscribe link in one of our emails\",\n          \"To use any of these, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). We will reply within one month, and it is normally free. We will need to check who you are first. We may have to keep some records, such as invoices, even if you ask us to delete your information.\"\n        ]\n      },\n      {\n        \"title\": \"Marketing\",\n        \"paragraphs\": [\n          \"We only send emails you have asked for. If you sign up for the free ebook, you are saying yes to receiving the free ebook and our free blog posts by email. Every one of those emails has an unsubscribe link, and you can also email us to stop them. We never sell your email address or share it for other people's marketing.\",\n          \"Emails about your orders, account and passes, such as receipts and password resets, are not marketing. They are sent whether or not you have signed up for the ebook.\"\n        ]\n      },\n"
]
]
}''')
NEW_FILES = ["INSTALL-PRIVACY-POLICY.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/ebook/ebookConfig.js", "src/membership/MembershipPage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier packages first (the ebook and the membership ones). These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-privacy-policy-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-privacy-policy').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
