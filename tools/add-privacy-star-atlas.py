#!/usr/bin/env python3
"""Adds the Star Atlas reading check-in to the privacy policy: four table rows, a section of its own, and a retention line, all saying reading habits are only ever looked at as totals. A test keeps the policy switched off until the Star Atlas is live. The new test is only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-privacy-star-atlas-22oct.zip into it:   python3 tools/add-privacy-star-atlas.py

What it does: it makes exact edits to 3 files and, only if all succeed, puts one new test in place.
  src/data/legalPages.js, test/legal-pages.test.jsx, test/newsletter-privacy.test.js

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-privacy-star-atlas.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PRIVACY-STAR-ATLAS.txt, tools/privacy-star-atlas-files/privacy-star-atlas.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"const fillContact = (v) => (typeof v === 'string' ? v.split('{{CONTACT_EMAIL}}').join(CONTACT_EMAIL) : Array.isArray(v) ? v.map(fillContact) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillContact(x)])) : v)\n\n",
"const fillContact = (v) => (typeof v === 'string' ? v.split('{{CONTACT_EMAIL}}').join(CONTACT_EMAIL) : Array.isArray(v) ? v.map(fillContact) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillContact(x)])) : v)\n\n// THE STAR ATLAS (the stamps, the monthly reading check-in, the optional genre and the optional survey) is designed but NOT BUILT YET. The privacy policy describes it (Gill, 22 October 2026),\n// so the policy must not be published before the atlas is live. Set this to true on the day the Star Atlas goes live; until then a test refuses to let the privacy policy be switched on.\n// (If the atlas is dropped, take its section, its table rows and its retention line out of the privacy policy instead.)\nexport const STAR_ATLAS_LIVE = false\n\n"
],
[
"        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your profile: your name, your username, the icon you choose and your email choice (free updates, news about your passes only, or no emails) | When you fill in or change your profile on the My passes page | To show your username and icon beside what you write on the site, and to send only the emails you asked for | Contract (your profile is part of your account), and your consent for emails, which you can take back at any time on the same page |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter or the free ebook, confirm it, or unsubscribe | To send you the newsletter and, if you asked for it, the free ebook, to keep proof that you asked and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in making sure we never email someone who has asked us to stop |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\",\n",
"        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your profile: your name, your username, the icon you choose and your email choice (free updates, news about your passes only, or no emails) | When you fill in or change your profile on the My passes page | To show your username and icon beside what you write on the site, and to send only the emails you asked for | Contract (your profile is part of your account), and your consent for emails, which you can take back at any time on the same page |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter or the free ebook, confirm it, or unsubscribe | To send you the newsletter and, if you asked for it, the free ebook, to keep proof that you asked and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in making sure we never email someone who has asked us to stop |\\n| Your Star Atlas: the stamps you earn (which room, what earned each one, and when), the stardust you spend, and the dates of your free taste week | When you earn a stamp, spend stardust or start your taste week | To show your atlas, to count your stardust, and to give each person one taste week | Contract (the atlas is part of your account) |\\n| Your monthly reading check-in: a number from 0 to 3, and, only if you choose, a genre | When you do the monthly check-in (pass holders) | To give you your stardust, and to see how many books members read, as totals only | Contract for the number, because it earns your stardust. Your consent for the genre, which is optional and is never needed for your stardust. Our legitimate interest in seeing the totals |\\n| The country you choose | When you pick it | To give you your First country stamp | Contract |\\n| Your answers to the optional year-one survey about reading habits | If you choose to answer it | To learn about members' reading habits, as totals only | Your consent, which you can take back at any time by asking us to delete your answers |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\",\n"
],
[
"      {\n        \"title\": \"Reading habits\",\n        \"paragraphs\": [\n          \"If you use the monthly reading check-in, we store how many extra books you tell us you read each month and, if you choose to add it, the genre. We only ever look at these as combined totals, and a month's totals are only shown once at least 5 members have checked in. We never look at one member's answers, and we never put them into an AI tool.\"\n        ]\n",
"      {\n        \"title\": \"Your Star Atlas and reading check-ins\",\n        \"paragraphs\": [\n          \"The Star Atlas is your own record of the stamps you earn in the rooms of the site. We keep what you earned and when, the stardust you spend, the dates of your free taste week and the country you choose. If you hold a pass and do the monthly reading check-in, we keep the number of extra books you give (0 to 3) and, only if you choose, a genre. If you answer the optional year-one survey, we keep your answers too. Only you can see and change your own atlas.\",\n          \"We only ever look at reading habits as totals. Our admin page shows how many members checked in each month, how many books they read, and which genres, but only once at least 5 members have checked in that month. Until then it shows \\\"Fewer than 5 so far\\\", and the download follows the same rule. A genre chosen by fewer than 5 members is grouped under \\\"Other\\\". We could see one member's answers by looking directly in our database, but we don't, and the admin page has no way to show them.\",\n          \"The genre is optional, and your stardust counts either way. Your name, email address, location and reading answers are never put into AI tools: AI tools only ever see the totals. We don't share your atlas or your reading answers with anyone else, apart from our database provider, which stores them for us. If you ask us to delete your account, your atlas, your check-ins and your survey answers are deleted with it.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Your profile (name, username, icon and email choice):** until you ask us to delete your account.\\n* **Newsletter and free ebook sign-ups (they are one list):** until you unsubscribe or ask us to delete your email address. If you sign up but never press the link to confirm, we delete your address after 30 days.\\n* **If you unsubscribe from the newsletter:** we keep your email address, marked as unsubscribed, so that we never email you again by mistake. If you would rather we deleted it completely, ask us and we will.\\n* **Emails and messages to us:** 2 years, then deleted.\\n* **Website logs:** only as long as needed to keep the site secure and fix faults. Our hosting provider sets this, and we do not keep our own copy.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n",
"        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Your profile (name, username, icon and email choice):** until you ask us to delete your account.\\n* **Your Star Atlas, your reading check-ins and your survey answers:** until you ask us to delete your account.\\n* **Newsletter and free ebook sign-ups (they are one list):** until you unsubscribe or ask us to delete your email address. If you sign up but never press the link to confirm, we delete your address after 30 days.\\n* **If you unsubscribe from the newsletter:** we keep your email address, marked as unsubscribed, so that we never email you again by mistake. If you would rather we deleted it completely, ask us and we will.\\n* **Emails and messages to us:** 2 years, then deleted.\\n* **Website logs:** only as long as needed to keep the site secure and fix faults. Our hosting provider sets this, and we do not keep our own copy.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n"
]
],
"test/legal-pages.test.jsx": [
[
"  it('each has the sections of its draft, with their titles', () => {\n    expect(page('privacy').sections.map((s) => s.title)).toEqual(['Who we are', 'What we collect and why', 'Suggestions and votes', 'Your profile and what other people see', 'Cookies and similar technologies', 'Who we share your information with', 'Sending information abroad', 'How long we keep it', 'Your rights', 'Marketing', 'Children', 'Keeping it safe', 'Complaints', 'Changes to this policy'])\n    expect(page('returns').sections.map((s) => s.title)).toEqual(['If you change your mind', 'If your print is faulty or damaged', \"If your print isn't what you ordered\", \"If your print doesn't arrive\", 'If you ordered from outside the UK', 'How refunds are paid', 'Cancellation form'])\n",
"  it('each has the sections of its draft, with their titles', () => {\n    expect(page('privacy').sections.map((s) => s.title)).toEqual(['Who we are', 'What we collect and why', 'Suggestions and votes', 'Your profile and what other people see', 'Your Star Atlas and reading check-ins', 'Cookies and similar technologies', 'Who we share your information with', 'Sending information abroad', 'How long we keep it', 'Your rights', 'Marketing', 'Children', 'Keeping it safe', 'Complaints', 'Changes to this policy'])\n    expect(page('returns').sections.map((s) => s.title)).toEqual(['If you change your mind', 'If your print is faulty or damaged', \"If your print isn't what you ordered\", \"If your print doesn't arrive\", 'If you ordered from outside the UK', 'How refunds are paid', 'Cancellation form'])\n"
],
[
"  })\n  it('the Privacy policy\\u2019s table is a real table: four columns with headings, and ten rows (one for each thing it keeps: the newsletter and the free ebook are one list, so one row)', () => {\n    const { container } = open('privacy')\n    const table = container.querySelector('table')\n    expect([...table.querySelectorAll('th')].map((h) => h.textContent)).toEqual(['What', 'When', 'Why', 'Our legal reason'])\n    expect(table.querySelectorAll('tbody tr')).toHaveLength(11); for (const th of table.querySelectorAll('th')) expect(th).toHaveAttribute('scope', 'col')\n    expect(container.querySelector('.md-tablewrap')).toBeTruthy()\n",
"  })\n  it('the Privacy policy\\u2019s table is a real table: four columns with headings, and fifteen rows (one for each thing it keeps: the newsletter and the free ebook are one list, so one row; four of them are for the Star Atlas)', () => {\n    const { container } = open('privacy')\n    const table = container.querySelector('table')\n    expect([...table.querySelectorAll('th')].map((h) => h.textContent)).toEqual(['What', 'When', 'Why', 'Our legal reason'])\n    expect(table.querySelectorAll('tbody tr')).toHaveLength(15); for (const th of table.querySelectorAll('th')) expect(th).toHaveAttribute('scope', 'col')\n    expect(container.querySelector('.md-tablewrap')).toBeTruthy()\n"
],
[
"  })\n  it('lists are lists: the people Privacy shares with (8), how long it keeps things (9: the member profile has its own point), your rights (7)', () => {\n    const { container } = open('privacy')\n    expect([...container.querySelectorAll('.lg-text ul')].map((u) => u.querySelectorAll('li').length)).toEqual([8, 9, 7])\n    expect(container.querySelector('ul li strong')).toHaveTextContent('Creative Hub, run by Printspace Studios Limited')\n",
"  })\n  it('lists are lists: the people Privacy shares with (8), how long it keeps things (10: the member profile and the Star Atlas each have their own point), your rights (7)', () => {\n    const { container } = open('privacy')\n    expect([...container.querySelectorAll('.lg-text ul')].map((u) => u.querySelectorAll('li').length)).toEqual([8, 10, 7])\n    expect(container.querySelector('ul li strong')).toHaveTextContent('Creative Hub, run by Printspace Studios Limited')\n"
]
],
"test/newsletter-privacy.test.js": [
[
"    expect(r[3]).toMatch(/Your consent, which you can take back at any time/); expect(r[3]).toMatch(/legitimate interest in making sure we never email someone who has asked us to stop/)\n    expect(rows().filter((x) => /free ebook/.test(x[1]))).toHaveLength(1); expect(rows().filter((x) => /newsletter/.test(x[1]))).toHaveLength(1); expect(rows()).toHaveLength(13) // the heading line, the divider line, and eleven rows: the newsletter and the free ebook are ONE list (one row), and the member profile is the eleventh\n  })\n",
"    expect(r[3]).toMatch(/Your consent, which you can take back at any time/); expect(r[3]).toMatch(/legitimate interest in making sure we never email someone who has asked us to stop/)\n    expect(rows().filter((x) => /free ebook/.test(x[1]))).toHaveLength(1); expect(rows().filter((x) => /newsletter/.test(x[1]))).toHaveLength(1); expect(rows()).toHaveLength(17) // the heading line, the divider line, and fifteen rows (four of them for the Star Atlas): the newsletter and the free ebook are ONE list (one row), and the member profile is the eleventh\n  })\n"
]
]
}''')
STAGED = {
    'test/privacy-star-atlas.test.js': 'tools/privacy-star-atlas-files/privacy-star-atlas.test.js.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-PRIVACY-STAR-ATLAS.txt", "tools/privacy-star-atlas-files/privacy-star-atlas.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-privacy-star-atlas-22oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-privacy-star-atlas').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-privacy-star-atlas').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
