#!/usr/bin/env python3
"""Adds the newsletter to the Privacy policy (what is kept, who sends it, how long, and the confirm and unsubscribe promises), a daily job that deletes sign-ups nobody confirms after 30 days, and the missing permission line in the Instagram SQL file. The policy stays a draft.

Run it from the project folder, AFTER unzipping starscapes-privacy-newsletter-20oct.zip into it:   python3 tools/add-privacy-newsletter.py

What it does: it makes exact edits to five files that already exist (the legal pages, the newsletter's public code, its shared rules, the daily schedule and the Instagram SQL file) and adds one new file from the zip (the unzip itself also adds two tests and replaces one).
  src/data/legalPages.js, lib/newsletter.js, src/newsletter/newsletterRules.js, vercel.json, sql/instagram.sql

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-privacy-newsletter.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PRIVACY-NEWSLETTER.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//    is only stored in Supabase; before the ebook door opens it must reach a Resend audience and each email must be sent as a Resend Broadcast with its unsubscribe footer (not built yet); check which region the Resend account sends from\n//    and its plan limits (SFW-188); the Founders' wall (display names, opt-in) and a newsletter each need their own lines when built; and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes\n//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n",
"//    is only stored in Supabase; before the ebook door opens it must reach a Resend audience and each email must be sent as a Resend Broadcast with its unsubscribe footer (not built yet); check which region the Resend account sends from\n//    and its plan limits (SFW-188); the Founders' wall (display names, opt-in) needs its own lines when built (the newsletter's lines were added on 21 October 2026, with a daily job that deletes sign-ups nobody confirms after 30 days); and the solicitor should check the YouTube wording, the proof that someone agreed to open their passes\n//    straight away (deleted with the account, though Stripe keeps a copy), and the sentence that we do not look at who voted for what (Gill's promise): see SFW-234. Re-check against the ICO's right-to-be-informed checklist near launch:\n"
],
[
"        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, and the date and wording you agreed to | When you sign up for the free ebook | To send you the ebook and our free blog posts by email | Your consent, which you can take back at any time |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\"\n",
"        \"paragraphs\": [\n          \"| What | When | Why | Our legal reason |\\n| -- | -- | -- | -- |\\n| Your name, email, phone number, delivery address and what you ordered | When you place an order | To take your order, make it, deliver it and contact you about it | It is needed to carry out our contract with you |\\n| Confirmation of your payment, the amount, and your name and email | When you pay | To know your order is paid for | Contract |\\n| Your email address and a password, stored in scrambled form | When you create an account | To run your account | Contract |\\n| Your emails and messages to us | When you contact us | To reply and keep a record | Our legitimate interest in answering customers |\\n| Order and invoice records | After every order | To keep accounts and pay tax | A legal obligation |\\n| Technical details such as your IP address, browser and the pages you request | When you visit | To keep the site secure and working | Our legitimate interest in running a safe website |\\n| Your passes: which you hold, whether they are active, how often you pay, when the next payment is due, whether you have cancelled, and the date and wording you agreed to when you opened them straight away | When you buy passes | To give you your passes, show you what you hold, and keep proof that you agreed to open them straight away | Contract, and our legitimate interest in keeping that proof |\\n| What you suggest (a book, show or stat, and your reason if you give one) and the votes you cast on suggestions | When you suggest or vote | To run the suggest and vote boxes fairly, with one vote each | Our legitimate interest in running them fairly |\\n| Your vote in a story vote | When you vote | To count one vote for each member and let you change it until the vote closes | Contract (it is part of your pass) |\\n| Your email address, and the date and wording you agreed to | When you sign up for the free ebook | To send you the ebook and our free blog posts by email | Your consent, which you can take back at any time |\\n| Your email address, the date and wording you agreed to, whether and when you confirmed it, and, if you leave, that you left | When you sign up for the newsletter, confirm it, or unsubscribe | To send you the newsletter, to keep proof that you asked for it and confirmed, and to make sure nobody who has unsubscribed is emailed again | Your consent, which you can take back at any time, and our legitimate interest in respecting your choice if you leave |\",\n          \"We never see your card number. You type it into Stripe's payment page, and Stripe passes us only the confirmation.\"\n"
],
[
"          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the free ebook, the ebook and our free blog posts. It receives your email address.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\",\n",
"          \"We share only what each of these needs to do its job:\",\n          \"* **Creative Hub, run by Printspace Studios Limited** (company number 06043884, 74 Kingsland Road, London E2 8DL; its privacy policy is at [https://www.theprintspace.co.uk/privacy-policy/](https://www.theprintspace.co.uk/privacy-policy/)) makes and posts your order. It receives your name, delivery address, phone number and what you ordered.\\n* **Stripe** takes your payments for prints and passes. It receives your name, email and payment details, and keeps the payment records for your passes.\\n* **Supabase** stores our database and sign-ins, so it holds your account and order details.\\n* **Vercel** hosts the website, so it sees technical details of visits.\\n* **Resend** sends our emails. That means emails about your orders, account and passes, such as confirmations, receipts and password resets, and, if you sign up for the free ebook, the ebook and our free blog posts, and, if you sign up for the newsletter, the email asking you to confirm and then the newsletter. It receives your email address.\\n* **YouTube (Google)**, only if you press play on a video. It can then see your visit and set its own cookies.\\n* **Our accountants and accounting software** receive sales and invoice records.\\n* **Authorities**, but only where the law requires it.\",\n          \"We don't sell your information, and we don't share it for other people's marketing.\",\n"
],
[
"        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Free ebook sign-ups:** until you unsubscribe or ask us to delete your email address.\\n* **Emails and messages to us:** 2 years, then deleted.\\n* **Website logs:** for a short time only, as set by our hosting provider.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n",
"        \"paragraphs\": [\n          \"* **Order and invoice records:** six years, because tax law requires it.\\n* **Your account:** until you ask us to delete it.\\n* **Your passes record:** until you ask us to delete your account. Payment records for passes are kept for six years, like order records.\\n* **Suggestions and votes:** until you ask us to delete your account.\\n* **Free ebook sign-ups:** until you unsubscribe or ask us to delete your email address.\\n* **Newsletter sign-ups:** until you unsubscribe or ask us to delete your email address. If you sign up but never press the link to confirm, we delete your address after 30 days.\\n* **If you unsubscribe from the newsletter:** we keep your email address, marked as unsubscribed, so that we never email you again by mistake. If you would rather we deleted it completely, ask us and we will.\\n* **Emails and messages to us:** 2 years, then deleted.\\n* **Website logs:** for a short time only, as set by our hosting provider.\",\n          \"Stripe, Creative Hub and our other providers keep information under their own policies.\"\n"
],
[
"          \"We only send emails you have asked for. If you sign up for the free ebook, you are saying yes to receiving the free ebook and our free blog posts by email. Every one of those emails has an unsubscribe link, and you can also email us to stop them. We never sell your email address or share it for other people's marketing.\",\n          \"Emails about your orders, account and passes, such as receipts and password resets, are not marketing. They are sent whether or not you have signed up for the ebook.\"\n",
"          \"We only send emails you have asked for. If you sign up for the free ebook, you are saying yes to receiving the free ebook and our free blog posts by email. Every one of those emails has an unsubscribe link, and you can also email us to stop them. We never sell your email address or share it for other people's marketing.\",\n          \"If you sign up for the newsletter, you are saying yes to the newsletter: new posts and news from Starscapes Factory, by email. We first email you a link, and you are only added once you press it. Every newsletter has a link to unsubscribe, and the unsubscribe button that many email programs show works too. If you unsubscribe, we keep your address, marked as unsubscribed, so that we never email you again by mistake.\",\n          \"Emails about your orders, account and passes, such as receipts and password resets, are not marketing. They are sent whether or not you have signed up for the ebook.\"\n"
]
],
"lib/newsletter.js": [
[
"import { serviceFetch, databaseUrl, serviceKeys } from './serviceKey.js'\nimport { CONSENT_TEXT, cleanSubscribe, confirmationEmail, confirmUrl, isToken } from '../src/newsletter/newsletterRules.js'\n\n",
"import { serviceFetch, databaseUrl, serviceKeys } from './serviceKey.js'\nimport { authorised } from './membershipReminders.js'\nimport { CONSENT_TEXT, UNCONFIRMED_DAYS, cleanSubscribe, confirmationEmail, confirmUrl, isToken } from '../src/newsletter/newsletterRules.js'\n\n"
],
[
"\nexport async function handleNewsletter(req, res) {\n  res.setHeader('Cache-Control', 'no-store')\n  const what = clean(req.query && req.query.newsletter)\n  if (what === 'status') {\n",
"\n// The daily tidy-up (asked for by Vercel's scheduler, see vercel.json): deletes anyone who signed up but never pressed the confirm link, UNCONFIRMED_DAYS after their last sign-up email.\n// Only people still \"pending\" are ever touched: nobody who confirmed, and nobody who unsubscribed (they stay, so they are never emailed again). Like the renewal reminders, it\n// needs CRON_SECRET (set in Vercel) as \"Authorization: Bearer ...\", and refuses to run without it.\nasync function tidy(req, res) {\n  const allowed = authorised(req)\n  if (!allowed.ok) return say(res, allowed.status, { ok: false, message: allowed.message })\n  if (noDatabase()) return say(res, 503, { ok: false, message: 'No server database key is set, so the tidy-up cannot run.' })\n  const cutoff = encodeURIComponent(new Date(Date.now() - UNCONFIRMED_DAYS * 86400000).toISOString())\n  try {\n    let removed = 0\n    for (const filter of [`confirmation_sent_at=lt.${cutoff}`, `confirmation_sent_at=is.null&created_at=lt.${cutoff}`]) { // the second is only a safety net: every sign-up records when its email was sent\n      const gone = await rest(`newsletter_subscribers?status=eq.pending&${filter}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } })\n      if (!gone || !gone.ok) throw new Error('database')\n      const rows = await gone.json().catch(() => [])\n      removed += Array.isArray(rows) ? rows.length : 0\n    }\n    return say(res, 200, { ok: true, removed })\n  } catch (e) {\n    return say(res, 502, { ok: false, message: 'The tidy-up could not run just now.' })\n  }\n}\n\nexport async function handleNewsletter(req, res) {\n  res.setHeader('Cache-Control', 'no-store')\n  const what = clean(req.query && req.query.newsletter)\n  if (what === 'tidy') {\n    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return say(res, 405, { ok: false }) }\n    return tidy(req, res)\n  }\n  if (what === 'status') {\n"
]
],
"src/newsletter/newsletterRules.js": [
[
"export const BODY_MAX = 20000\nexport const BATCH_SIZE = 50 // emails sent per request to Resend (its limit is 100 per request and 2 requests a second)\n",
"export const BODY_MAX = 20000\nexport const UNCONFIRMED_DAYS = 30 // a sign-up that is never confirmed is deleted after this many days (the Privacy policy says so, and a test keeps the two the same)\nexport const BATCH_SIZE = 50 // emails sent per request to Resend (its limit is 100 per request and 2 requests a second)\n"
]
],
"vercel.json": [
[
"      \"schedule\": \"0 8 * * *\"\n    }\n",
"      \"schedule\": \"0 8 * * *\"\n    },\n    {\n      \"path\": \"/api/ebook-signup?newsletter=tidy\",\n      \"schedule\": \"30 8 * * *\"\n    }\n"
]
],
"sql/instagram.sql": [
[
"alter table public.instagram_token enable row level security;\n\n",
"alter table public.instagram_token enable row level security;\n-- Only the SERVER's key (service_role) reads and writes this table, and a table made in the SQL editor gives that key no permission until it is granted. Without this line the site cannot read the\n-- token, or save the fresh one it swaps in before the old one runs out. Added 20 October 2026; run it on a project that already has the table:\n--   grant select, insert, update, delete on public.instagram_token to service_role;\ngrant select, insert, update, delete on public.instagram_token to service_role;\n\n"
]
]
}''')
NEW_FILES = ["INSTALL-PRIVACY-NEWSLETTER.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-privacy-newsletter-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-privacy-newsletter').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
