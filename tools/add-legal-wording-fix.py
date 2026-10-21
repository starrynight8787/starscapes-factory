#!/usr/bin/env python3
"""Puts the approved legal wording into the Privacy, Returns, AI and Cookie pages on top of the current policy file (with your line: customers' personal details never go into AI tools, ever), and replaces three tests to match. The tests are only replaced if the policy edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-legal-wording-fix-21oct.zip into it:   python3 tools/add-legal-wording-fix.py

What it does: it makes exact edits to the legal pages file and, only if that succeeds, replaces three tests with the versions in tools/legal-wording-fix-files.
  src/data/legalPages.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-legal-wording-fix.
  - It is safe to run twice: a file already done is left alone.
  - The new files (tools/legal-wording-fix-files/legal-pages.test.jsx.staged, tools/legal-wording-fix-files/legal-check-wording.test.js.staged, tools/legal-wording-fix-files/newsletter-privacy.test.js.staged, INSTALL-LEGAL-WORDING-FIX.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your profile: your name, your username, the icon you choose and your email choice (free updates, news about your passes only, or no emails) | When you fill in or change your profile on the My passes page | To show your username and icon beside what you write on the site, and to send only the emails you asked for | Contract (your profile is part of your account), and your consent for emails, which you can take back at any time on the same page |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter or the free ebook, confirm it, or unsubscribe | To send you the newsletter and, if you asked for it, the free ebook, to keep proof that you asked and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in making sure we never email someone who has asked us to stop |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\"\n        ]\n",
"          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your profile: your name, your username, the icon you choose and your email choice (free updates, news about your passes only, or no emails) | When you fill in or change your profile on the My passes page | To show your username and icon beside what you write on the site, and to send only the emails you asked for | Contract (your profile is part of your account), and your consent for emails, which you can take back at any time on the same page |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter or the free ebook, confirm it, or unsubscribe | To send you the newsletter and, if you asked for it, the free ebook, to keep proof that you asked and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in making sure we never email someone who has asked us to stop |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\",\n          \"If you order, we need your name, email, delivery address and phone number to make and deliver your order: without them we cannot. Everything else, such as the newsletter, suggestions and votes, is your choice.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Your profile (name, username, icon and email choice):** until you ask us to delete your account.\\n* **Newsletter and free ebook sign-ups (they are one list):** until you unsubscribe or ask us to delete your email address. If you sign up but never press the link to confirm, we delete your address after 30 days.\\n* **If you unsubscribe from the newsletter:** we keep your email address, marked as unsubscribed, so that we never email you again by mistake. If you would rather we deleted it completely, ask us and we will.\\n* **Emails and messages to us:** 2 years, then deleted.\\n* **Website logs:** for a short time only, as set by our hosting provider.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n",
"        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Your profile (name, username, icon and email choice):** until you ask us to delete your account.\\n* **Newsletter and free ebook sign-ups (they are one list):** until you unsubscribe or ask us to delete your email address. If you sign up but never press the link to confirm, we delete your address after 30 days.\\n* **If you unsubscribe from the newsletter:** we keep your email address, marked as unsubscribed, so that we never email you again by mistake. If you would rather we deleted it completely, ask us and we will.\\n* **Emails and messages to us:** 2 years, then deleted.\\n* **Website logs:** only as long as needed to keep the site secure and fix faults. Our hosting provider sets this, and we do not keep our own copy.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n"
],
[
"          \"* tell you what we hold about you, and give you a copy\\n* correct anything that is wrong\\n* delete your information, where we have no good reason to keep it\\n* limit how we use it\\n* stop using it where we rely on our legitimate interest\\n* give you your information in a form you can move elsewhere\\n* take back your consent whenever you like, such as with the unsubscribe link in one of our emails\",\n          \"To use any of these, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). We will reply within one month, and it is normally free. We will need to check who you are first. We may have to keep some records, such as invoices, even if you ask us to delete your information.\"\n",
"          \"* tell you what we hold about you, and give you a copy\\n* correct anything that is wrong\\n* delete your information, where we have no good reason to keep it\\n* limit how we use it\\n* stop using it where we rely on our legitimate interest\\n* give you your information in a form you can move elsewhere\\n* take back your consent whenever you like, such as with the unsubscribe link in one of our emails\",\n          \"You can object to us using your information where we rely on our legitimate interest. Tell us and we will stop, unless we have a strong reason not to. We do not use automated decision-making or profiling.\",\n          \"To use any of these, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). We will reply within one month, and it is normally free. We will need to check who you are first. We may have to keep some records, such as invoices, even if you ask us to delete your information.\"\n"
],
[
"        \"paragraphs\": [\n          \"We use well-known providers and encrypted connections, and we keep access to your information limited to what is needed. No system is perfectly secure, so if you think something has gone wrong, tell us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). If there is a breach that puts your rights at risk, we will tell you and the regulator as the law requires. We don't put customers' personal details into AI tools: see our AI policy.\"\n        ]\n      },\n      {\n        \"title\": \"Complaints\",\n        \"paragraphs\": [\n          \"Please contact us first, and we will try to put things right. You also have the right to complain to the Information Commissioner's Office at [ico.org.uk](https://ico.org.uk), or on 0303 123 1113.\"\n        ]\n",
"        \"paragraphs\": [\n          \"We use well-known providers and encrypted connections, and we keep access to your information limited to what is needed. No system is perfectly secure, so if you think something has gone wrong, tell us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). If there is a breach that puts your rights at risk, we will tell you and the regulator as the law requires. We do not put customers' personal details into AI tools, ever. See our AI policy.\"\n        ]\n      },\n      {\n        \"title\": \"Complaints\",\n        \"paragraphs\": [\n          \"Please contact us first, and we will try to put things right. We will acknowledge your complaint within 30 days, look into it, and tell you what we found. You also have the right to complain to the Information Commissioner's Office at [ico.org.uk](https://ico.org.uk), or on 0303 123 1113.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"You have the legal right to cancel your order, without giving a reason, within 14 days of the day your print is delivered to you (or to someone you have asked us to deliver it to).\",\n          \"**To cancel:** email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) within those 14 days, with your name and order details. You can use the form at the end of this page, or simply write \\\"I am cancelling my order\\\" with the order details.\",\n          \"**To send it back:** post the print to [RETURN ADDRESS] within 14 days of telling us you are cancelling. Please use its original packaging where you can, and pack it carefully, especially if it is framed. You pay the cost of sending it back, and you are responsible for it until it reaches us, so we recommend a tracked and insured service.\",\n",
"        \"paragraphs\": [\n          \"You have the legal right to cancel your order, without giving a reason. You can cancel from the moment you place your order until 14 days after the day your print is delivered to you (or to someone you have asked us to deliver it to).\",\n          \"**To cancel:** email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) in that time, with your name and order details. You can use the form at the end of this page, or simply write \\\"I am cancelling my order\\\" with the order details.\",\n          \"**To send it back:** post the print to [RETURN ADDRESS] within 14 days of telling us you are cancelling. Please use its original packaging where you can, and pack it carefully, especially if it is framed. You pay the cost of sending it back, and you are responsible for it until it reaches us, so we recommend a tracked and insured service.\",\n"
],
[
"        \"paragraphs\": [\n          \"* **Making or changing the work I sell or publish as mine.** The artwork, photographs, stories and books in section 1 are never made, finished or altered by AI.\\n* **Making decisions about you.** Nothing about your order, your account or your payment is decided by an AI system.\\n* **Handling your information.** I never put customers' names, addresses, emails or order details into an AI tool. You can read more in our Privacy policy.\\n* **Talking to customers.** I don't use a chatbot. When you write to me, a person replies.\\n* **Reviews or testimonials.** I don't use AI to write reviews or testimonials, and I don't invent them.\\n* **Training AI.** I don't give permission for my artwork or writing to be used to train AI models.\"\n        ]\n",
"        \"paragraphs\": [\n          \"* **Making or changing the work I sell or publish as mine.** The artwork, photographs, stories and books in section 1 are never made, finished or altered by AI.\\n* **Making decisions about you.** Nothing about your order, your account or your payment is decided by an AI system.\\n* **Handling your information.** I do not put customers' personal details into AI tools, ever. You can read more in our Privacy policy.\\n* **Talking to customers.** I don't use a chatbot. When you write to me, a person replies.\\n* **Reviews or testimonials.** I don't use AI to write reviews or testimonials, and I don't invent them.\\n* **Training AI.** I don't give permission for my artwork or writing to be used to train AI models.\"\n        ]\n"
],
[
"          \"| Name | What it is for | How long it stays |\\n| --- | --- | --- |\\n| A name that starts **sb-** and ends **-auth-token** | Keeps you signed in, so you can use My passes, vote in a story and read what your passes open. It is only there once you have signed in. | Until you log out or clear your browser's data |\\n| **sf-cart-v1** | Remembers what is in your cart, so it is still there if you leave and come back. It holds the prints in your cart, not your name or address. | Until you empty your cart or clear your browser's data |\\n| **sf-membership-choice** | Remembers which passes you ticked, and whether you chose monthly or yearly, so your choice is still there if you go back a page. | Until you close the tab |\",\n          \"The first two are kept in your browser's local storage, and the third in its session storage. They are not cookies. They stay on your device and are used only to make the site work for you.\"\n        ]\n",
"          \"| Name | What it is for | How long it stays |\\n| --- | --- | --- |\\n| A name that starts **sb-** and ends **-auth-token** | Keeps you signed in, so you can use My passes, vote in a story and read what your passes open. It is only there once you have signed in. | Until you log out or clear your browser's data |\\n| **sf-cart-v1** | Remembers what is in your cart, so it is still there if you leave and come back. It holds the prints in your cart, not your name or address. | Until you empty your cart or clear your browser's data |\\n| **sf-membership-choice** | Remembers which passes you ticked, and whether you chose monthly or yearly, so your choice is still there if you go back a page. | Until you close the tab |\",\n          \"The first two are kept in your browser's local storage, and the third in its session storage. The law treats these like cookies, and none of them needs your consent, because each is needed for something you asked the site to do. They stay on your device and are used only to make the site work for you.\"\n        ]\n"
]
]
}''')
STAGED = {
    'test/legal-pages.test.jsx': 'tools/legal-wording-fix-files/legal-pages.test.jsx.staged',
    'test/legal-check-wording.test.js': 'tools/legal-wording-fix-files/legal-check-wording.test.js.staged',
    'test/newsletter-privacy.test.js': 'tools/legal-wording-fix-files/newsletter-privacy.test.js.staged',
}  # copied into place ONLY after the legal pages edit has succeeded (a refusal above exits before this)
NEW_FILES = ["tools/legal-wording-fix-files/legal-pages.test.jsx.staged", "tools/legal-wording-fix-files/legal-check-wording.test.js.staged", "tools/legal-wording-fix-files/newsletter-privacy.test.js.staged", "INSTALL-LEGAL-WORDING-FIX.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-legal-wording-fix-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-legal-wording-fix').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-legal-wording-fix').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
