#!/usr/bin/env python3
"""Adds the Terms for passes (owner-only draft) and the rule that passes can be changed only in the 7 days before the next payment.

Run it from the project folder, AFTER unzipping starscapes-passes-terms-20oct.zip into it:   python3 tools/add-passes-terms.py

What it does: it makes exact edits to three files that already exist (the legal pages, the account server and the change-passes page) and adds two new files from the zip (the unzip itself also replaces four test files and adds one).
  src/data/legalPages.js, lib/membershipAccount.js, src/membership/ChangePassesPage.jsx

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-passes-terms.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/membership/changeWindow.js, INSTALL-PASSES-TERMS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//    the ICO says its guidance is under review after the Data (Use and Access) Act.\n//    A sentence about links to other websites such as the Substack was added on 20 October (SFW-236). If the Substack link in src/draftingdesk/draftingData.js is ever removed, take the sentence out too.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n",
"//    the ICO says its guidance is under review after the Data (Use and Access) Act.\n//    A sentence about links to other websites such as the Substack was added on 20 October (SFW-236). If the Substack link in src/draftingdesk/draftingData.js is ever removed, take the sentence out too.\n//  * THE TERMS GAINED FOUR SECTIONS FOR PASSES on 20 October 2026 (SFW-182), placed before \"Changes to these terms\" so no existing section number moves: Passes; Paying for passes; Changing your passes;\n//    Cancelling passes and your right to change your mind. They are written from the site as it works and from Gill's decisions (VAT included in the price and shown separately at checkout; UK customers only for now; no refund\n//    for a part-used period; changes only in the 7 days before the next payment, a WORKING RULE in src/membership/changeWindow.js that Gill has not yet confirmed). Two promises need building before passes open:\n//    we email before the price changes (SFW-237), and Stripe's retry settings must match \"your passes stay open while it tries again\" (not checked). The accountant (SFW-183) and the free-advice questions (SFW-234)\n//    may change the wording on VAT, overseas customers and the 14-day right: change the words here and the tests will say what else has to follow.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n"
],
[
"        \"paragraphs\": [\n          \"If something outside our reasonable control delays or prevents an order, such as a postal strike, severe weather or a fault at the print studio, we are not responsible for the delay. We will tell you as soon as we can, and if it goes on for a long time you may cancel and be refunded.\"\n        ]\n      },\n",
"        \"paragraphs\": [\n          \"If something outside our reasonable control delays or prevents an order, such as a postal strike, severe weather or a fault at the print studio, we are not responsible for the delay. We will tell you as soon as we can, and if it goes on for a long time you may cancel and be refunded.\"\n        ]\n      },\n      {\n        \"title\": \"Passes\",\n        \"paragraphs\": [\n          \"A pass gives you access to members-only posts and other material in one part of the site. The passes are The Author's Notebook, Early drafts and book background, Come Write With Me, Blueprints and Book Club. The first three posts in every pass are free to read, and the first three Come Write With Me sessions are free to join.\",\n          \"In Come Write With Me, members vote on where the story goes: one vote each, which you can change until the vote closes.\",\n          \"Passes are digital: nothing is posted to you. They are for your own use, so please don't share your login or copy the material.\"\n        ]\n      },\n      {\n        \"title\": \"Paying for passes\",\n        \"paragraphs\": [\n          \"You choose which passes you want and whether to pay monthly or yearly. One pass costs £5 a month, two cost £7, three cost £10, and four or more cost £12. A year costs ten months. Prices are in pounds and include VAT, which is shown separately at checkout. Passes are for customers in the UK for now.\",\n          \"While the launch offer lasts, your first year costs half the normal price. After that we charge the normal price shown when you chose, unless you cancel first, and we will email you before the price changes.\",\n          \"Your passes renew automatically at the end of each month or year, at the price shown, until you cancel. Payment is taken by Stripe, by card. If a payment fails, Stripe tries again and your passes stay open while it does. If it still fails, your passes close.\"\n        ]\n      },\n      {\n        \"title\": \"Changing your passes\",\n        \"paragraphs\": [\n          \"You can add or remove passes in My passes, in the 7 days before your next payment. The change starts at once, and the new price starts with that payment. Nothing is charged or refunded when you change. This stops passes being added just after a payment and taken away just before the next one.\",\n          \"If you add a pass, we ask you to tick the same box as when you first bought, because the new pass opens straight away.\"\n        ]\n      },\n      {\n        \"title\": \"Cancelling passes and your right to change your mind\",\n        \"paragraphs\": [\n          \"You can cancel at any time in My passes, under \\\"Manage payment or cancel\\\". Your passes stay open until the end of the period you have paid for, and you will not be charged again. We do not refund the rest of a period you have paid for, apart from where the law says we must.\",\n          \"By law you have 14 days from buying to cancel and get your money back. Your passes open as soon as you pay, so before you pay we ask you to tick a box that says: \\\"Open my passes now. I understand that once they open, I lose my 14-day right to cancel and get a refund.\\\" You cannot buy passes without ticking it, because they open at once.\"\n        ]\n      },\n"
]
],
"lib/membershipAccount.js": [
[
"import { stripeMode, ensureProduct, logProblem, fetchSubscription, buildChangeForm, updateSubscription, setCancelAtPeriodEnd, cardOnFile, createPortalSession, membershipRowFromSubscription } from './membershipStripe.js'\nimport { saveMembership } from '../api/membership-webhook.js'\n\nconst SITE = 'https://starscapesfactory.com'\n",
"import { stripeMode, ensureProduct, logProblem, fetchSubscription, buildChangeForm, updateSubscription, setCancelAtPeriodEnd, cardOnFile, createPortalSession, membershipRowFromSubscription } from './membershipStripe.js'\nimport { saveMembership } from '../api/membership-webhook.js'\nimport { changeWindow, closedMessage } from '../src/membership/changeWindow.js'\n\nconst SITE = 'https://starscapesfactory.com'\n"
],
[
"// THIS person's own row, and nobody else's\nasync function myMembership(userId) {\n  const response = await serviceFetch(`/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}&select=status,passes,stripe_customer_id,stripe_subscription_id,cancel_at_period_end`, { headers: { Accept: 'application/json' } })\n  if (!response.ok) throw new Error(`database answered ${response.status}`)\n  const rows = await response.json()\n",
"// THIS person's own row, and nobody else's\nasync function myMembership(userId) {\n  const response = await serviceFetch(`/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}&select=status,passes,stripe_customer_id,stripe_subscription_id,cancel_at_period_end,current_period_end`, { headers: { Accept: 'application/json' } })\n  if (!response.ok) throw new Error(`database answered ${response.status}`)\n  const rows = await response.json()\n"
],
[
"    if (body.action === 'change') {\n      if (!HOLDING.includes(row.status) || row.cancel_at_period_end === true) return say(res, 409, 'You can change your passes while they are open and not set to end.')\n      const wanted = cleanPassIds(body.passes)\n      if (wanted.length === 0) return say(res, 400, 'To stop all your passes, use \"Manage payment or cancel\" instead.')\n",
"    if (body.action === 'change') {\n      if (!HOLDING.includes(row.status) || row.cancel_at_period_end === true) return say(res, 409, 'You can change your passes while they are open and not set to end.')\n      // Only in the last few days before the next payment (see src/membership/changeWindow.js)\n      const win = changeWindow(row)\n      if (!win.open) return say(res, 409, closedMessage(win), { reason: 'change_window_closed', opensAt: win.opensAt, nextPayment: win.nextPayment })\n      const wanted = cleanPassIds(body.passes)\n      if (wanted.length === 0) return say(res, 400, 'To stop all your passes, use \"Manage payment or cancel\" instead.')\n"
]
],
"src/membership/ChangePassesPage.jsx": [
[
"import { formatPounds, ladderRows, ladderKey } from './pricing'\nimport { accountView, priceNow, changeOf, nameList, unitWord } from './account'\nimport { fetchMyMembership, changePasses } from './membershipApi'\nimport { NotOpen } from './MembershipPage'\n",
"import { formatPounds, ladderRows, ladderKey } from './pricing'\nimport { accountView, priceNow, changeOf, nameList, unitWord } from './account'\nimport { changeWindow, closedMessage } from './changeWindow'\nimport { fetchMyMembership, changePasses } from './membershipApi'\nimport { NotOpen } from './MembershipPage'\n"
],
[
"            {state.phase === 'error' || row ? 'Back to my passes' : 'Choose your passes'}\n          </Link>\n        </div>\n      </main>\n",
"            {state.phase === 'error' || row ? 'Back to my passes' : 'Choose your passes'}\n          </Link>\n        </div>\n      </main>\n    )\n  }\n\n  // Only in the last days before the next payment (a working rule, see changeWindow.js): outside that, say when it opens\n  const win = changeWindow(row)\n  if (!win.open) {\n    return (\n      <main className=\"mb mb--welcome\">\n        <div className=\"mb__w\">\n          <h1>Change my passes</h1>\n          <p className=\"mb__lead\">{closedMessage(win)}</p>\n          <p className=\"mb__small\">To stop all your passes, go back and use \"Manage payment or cancel\".</p>\n          <Link className=\"mb__wbtn\" to=\"/membership/passes\">Back to my passes</Link>\n        </div>\n      </main>\n"
]
]
}''')
NEW_FILES = ["src/membership/changeWindow.js", "INSTALL-PASSES-TERMS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/account.js", "lib/membershipAccount.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier membership packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-passes-terms-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-passes-terms').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
