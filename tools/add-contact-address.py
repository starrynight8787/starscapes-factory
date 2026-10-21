#!/usr/bin/env python3
"""Makes the contact address live in one file: the legal pages (24 places), the delivery page and the calendar event id now take it from src/data/contact.js. Clears the last failing test.

Run it from the project folder, AFTER unzipping starscapes-contact-address-21oct.zip into it:   python3 tools/add-contact-address.py

What it does: it makes exact edits to 4 files.
  src/data/legalPages.js, src/data/staticPages.js, src/home/homeRules.js, test/contact-email-single-source.test.js

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-contact-address.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-CONTACT-ADDRESS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//    confirm that no cookie banner is needed for sign-in, cart and the passes choice (they are needed for something the visitor asked for).\nexport const LEGAL_PAGES = [\n  {\n",
"//    confirm that no cookie banner is needed for sign-in, cart and the passes choice (they are needed for something the visitor asked for).\nimport { CONTACT_EMAIL } from './contact'\n\n// The contact address is written ONCE, in src/data/contact.js. In the words below it is {{CONTACT_EMAIL}}, filled in here (test/contact-email-single-source.test.js fails if it is ever written out by hand).\nconst fillContact = (v) => (typeof v === 'string' ? v.split('{{CONTACT_EMAIL}}').join(CONTACT_EMAIL) : Array.isArray(v) ? v.map(fillContact) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillContact(x)])) : v)\n\nexport const LEGAL_PAGES = fillContact([\n  {\n"
],
[
"        \"paragraphs\": [\n          \"This website is run by Starscapes Factory Ltd (\\\"we\\\", \\\"us\\\"), a company registered in England and Wales with company number 14173440. Our registered office is 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ. Our VAT number is GB445903680. You can contact us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com).\"\n        ]\n",
"        \"paragraphs\": [\n          \"This website is run by Starscapes Factory Ltd (\\\"we\\\", \\\"us\\\"), a company registered in England and Wales with company number 14173440. Our registered office is 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ. Our VAT number is GB445903680. You can contact us at [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}).\"\n        ]\n"
],
[
"          \"We will email you when your order has been posted, with your tracking details.\",\n          \"If you need to change the delivery address, or want to stop an order before it is made, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) straight away. We send your order to the print studio very soon after you pay, so we can only cancel it if printing has not started, and we can only change the delivery address before it has been posted. This is separate from your legal right to cancel, which our Returns and refunds page explains.\",\n          \"The print is your responsibility once it has been delivered to you, or to someone you have asked us to deliver it to. Please check the parcel when it arrives and tell us straight away about any damage: see our Returns and refunds page.\"\n",
"          \"We will email you when your order has been posted, with your tracking details.\",\n          \"If you need to change the delivery address, or want to stop an order before it is made, email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) straight away. We send your order to the print studio very soon after you pay, so we can only cancel it if printing has not started, and we can only change the delivery address before it has been posted. This is separate from your legal right to cancel, which our Returns and refunds page explains.\",\n          \"The print is your responsibility once it has been delivered to you, or to someone you have asked us to deliver it to. Please check the parcel when it arrives and tell us straight away about any damage: see our Returns and refunds page.\"\n"
],
[
"        \"paragraphs\": [\n          \"If you are unhappy with anything, email us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) and we will do our best to put it right. These terms, and any dispute about them, are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you live in Scotland or Northern Ireland, you may also bring proceedings in your local courts. If you live outside the UK, the consumer laws of your own country continue to protect you as well.\"\n        ]\n",
"        \"paragraphs\": [\n          \"If you are unhappy with anything, email us at [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) and we will do our best to put it right. These terms, and any dispute about them, are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you live in Scotland or Northern Ireland, you may also bring proceedings in your local courts. If you live outside the UK, the consumer laws of your own country continue to protect you as well.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"Starscapes Factory Ltd is the \\\"controller\\\" of your information, which means we decide how and why it is used. We are registered in England and Wales with company number 14173440, and our registered office is 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ. You can contact us about anything in this policy at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com).\"\n        ]\n",
"        \"paragraphs\": [\n          \"Starscapes Factory Ltd is the \\\"controller\\\" of your information, which means we decide how and why it is used. We are registered in England and Wales with company number 14173440, and our registered office is 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ. You can contact us about anything in this policy at [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}).\"\n        ]\n"
],
[
"          \"You can object to us using your information where we rely on our legitimate interest. Tell us and we will stop, unless we have a strong reason not to. We do not use automated decision-making or profiling.\",\n          \"To use any of these, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). We will reply within one month, and it is normally free. We will need to check who you are first. We may have to keep some records, such as invoices, even if you ask us to delete your information.\"\n        ]\n",
"          \"You can object to us using your information where we rely on our legitimate interest. Tell us and we will stop, unless we have a strong reason not to. We do not use automated decision-making or profiling.\",\n          \"To use any of these, email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}). We will reply within one month, and it is normally free. We will need to check who you are first. We may have to keep some records, such as invoices, even if you ask us to delete your information.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"We use well-known providers and encrypted connections, and we keep access to your information limited to what is needed. No system is perfectly secure, so if you think something has gone wrong, tell us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). If there is a breach that puts your rights at risk, we will tell you and the regulator as the law requires. We do not put customers' personal details into AI tools, ever. See our AI policy.\"\n        ]\n",
"        \"paragraphs\": [\n          \"We use well-known providers and encrypted connections, and we keep access to your information limited to what is needed. No system is perfectly secure, so if you think something has gone wrong, tell us at [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}). If there is a breach that puts your rights at risk, we will tell you and the regulator as the law requires. We do not put customers' personal details into AI tools, ever. See our AI policy.\"\n        ]\n"
],
[
"          \"You have the legal right to cancel your order, without giving a reason. You can cancel from the moment you place your order until 14 days after the day your print is delivered to you (or to someone you have asked us to deliver it to).\",\n          \"**To cancel:** email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) in that time, with your name and order details. You can use the form at the end of this page, or simply write \\\"I am cancelling my order\\\" with the order details.\",\n          \"**To send it back:** post the print to [RETURN ADDRESS] within 14 days of telling us you are cancelling. Please use its original packaging where you can, and pack it carefully, especially if it is framed. You pay the cost of sending it back, and you are responsible for it until it reaches us, so we recommend a tracked and insured service.\",\n",
"          \"You have the legal right to cancel your order, without giving a reason. You can cancel from the moment you place your order until 14 days after the day your print is delivered to you (or to someone you have asked us to deliver it to).\",\n          \"**To cancel:** email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) in that time, with your name and order details. You can use the form at the end of this page, or simply write \\\"I am cancelling my order\\\" with the order details.\",\n          \"**To send it back:** post the print to [RETURN ADDRESS] within 14 days of telling us you are cancelling. Please use its original packaging where you can, and pack it carefully, especially if it is framed. You pay the cost of sending it back, and you are responsible for it until it reaches us, so we recommend a tracked and insured service.\",\n"
],
[
"          \"Your print must be as described, of satisfactory quality and fit for purpose. If it arrives damaged, or has a printing fault:\",\n          \"1. Email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) within 30 days of delivery, with your order details and photos or a short video of the problem and the packaging.\\n2. Keep the print and packaging until we have looked at it. We may ask you for more photos.\\n3. We will arrange a replacement straight away, or refund you in full if you prefer. You don't pay for returning a faulty print or for the replacement.\",\n          \"Your legal rights don't stop after 30 days. If a fault shows up later, contact us and we will work out a repair, replacement or partial refund with you.\"\n        ]\n      },\n      {\n        \"title\": \"If your print isn't what you ordered\",\n        \"paragraphs\": [\n          \"If you receive a different print, size or frame from the one you ordered, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) with clear photos, ideally within 14 days of delivery so we can check while it is fresh. We will compare your photos with the photos taken at the print studio before your order was packed. If the mistake was ours or the print studio's, we will refund you in full and arrange collection of the print at no cost to you. This doesn't limit your legal rights, described above.\"\n        ]\n      },\n      {\n        \"title\": \"If your print doesn't arrive\",\n        \"paragraphs\": [\n          \"If your parcel hasn't arrived by the date we gave you, or within 30 days of your order if we gave none, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com). Every order is sent with tracked delivery, so you can follow your parcel. If the tracking stops moving for several days, email us. If it shows your parcel as delivered but you can't find it, please check with neighbours, reception or building management first, and give it 24 hours, because many turn up that way. If it still hasn't appeared, email us with your order number, and we will investigate with the courier and the print studio, without waiting for the courier's claim to be settled. If the print can't be found, we will send a replacement or refund you in full.\"\n        ]\n",
"          \"Your print must be as described, of satisfactory quality and fit for purpose. If it arrives damaged, or has a printing fault:\",\n          \"1. Email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) within 30 days of delivery, with your order details and photos or a short video of the problem and the packaging.\\n2. Keep the print and packaging until we have looked at it. We may ask you for more photos.\\n3. We will arrange a replacement straight away, or refund you in full if you prefer. You don't pay for returning a faulty print or for the replacement.\",\n          \"Your legal rights don't stop after 30 days. If a fault shows up later, contact us and we will work out a repair, replacement or partial refund with you.\"\n        ]\n      },\n      {\n        \"title\": \"If your print isn't what you ordered\",\n        \"paragraphs\": [\n          \"If you receive a different print, size or frame from the one you ordered, email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) with clear photos, ideally within 14 days of delivery so we can check while it is fresh. We will compare your photos with the photos taken at the print studio before your order was packed. If the mistake was ours or the print studio's, we will refund you in full and arrange collection of the print at no cost to you. This doesn't limit your legal rights, described above.\"\n        ]\n      },\n      {\n        \"title\": \"If your print doesn't arrive\",\n        \"paragraphs\": [\n          \"If your parcel hasn't arrived by the date we gave you, or within 30 days of your order if we gave none, email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}). Every order is sent with tracked delivery, so you can follow your parcel. If the tracking stops moving for several days, email us. If it shows your parcel as delivered but you can't find it, please check with neighbours, reception or building management first, and give it 24 hours, because many turn up that way. If it still hasn't appeared, email us with your order number, and we will investigate with the courier and the print studio, without waiting for the courier's claim to be settled. If the print can't be found, we will send a replacement or refund you in full.\"\n        ]\n"
],
[
"          \"You don't have to use this, but you can copy it into an email:\",\n          \"> To Starscapes Factory Ltd, [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com): I am cancelling my contract for the sale of the following goods: (print name, size and frame). Ordered on (date). Received on (date). Name: (your name). Address: (your address). Date: (date).\"\n        ]\n",
"          \"You don't have to use this, but you can copy it into an email:\",\n          \"> To Starscapes Factory Ltd, [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}): I am cancelling my contract for the sale of the following goods: (print name, size and frame). Ordered on (date). Received on (date). Name: (your name). Address: (your address). Date: (date).\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"If the way I use AI changes, I will update this page and its date. If you have a question about it, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com).\"\n        ]\n",
"        \"paragraphs\": [\n          \"If the way I use AI changes, I will update this page and its date. If you have a question about it, email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}).\"\n        ]\n"
],
[
"  }\n]\n",
"  }\n])\n"
]
],
"src/data/staticPages.js": [
[
"\nIf your print arrives damaged, is not what you ordered, or has not arrived when you expected it, please write to us at [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) and we will look into it. Your rights to cancel an order and to return a print are explained on the [Returns and refunds](/page/returns) page.`,\n  },\n",
"\nIf your print arrives damaged, is not what you ordered, or has not arrived when you expected it, please write to us at [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}) and we will look into it. Your rights to cancel an order and to return a print are explained on the [Returns and refunds](/page/returns) page.`,\n  },\n"
]
],
"src/home/homeRules.js": [
[
"// event is \"next\". Nothing in here talks to the database, so the page, the admin tool and the database file all agree on the same limits (a test checks).\n\n",
"// event is \"next\". Nothing in here talks to the database, so the page, the admin tool and the database file all agree on the same limits (a test checks).\nimport { CONTACT_EMAIL } from '../data/contact'\n\n\n"
],
[
"  const start = new Date(event.starts_at), end = new Date(start.getTime() + EVENT_MINUTES * 60000)\n  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Starscapes Factory//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${event.id || stamp(start)}@starscapesfactory.com`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(event.title)}`]\n  if (event.description) lines.push(`DESCRIPTION:${esc(event.description)}`)\n",
"  const start = new Date(event.starts_at), end = new Date(start.getTime() + EVENT_MINUTES * 60000)\n  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Starscapes Factory//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${event.id || stamp(start)}@${CONTACT_EMAIL.split('@')[1]}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(event.title)}`]\n  if (event.description) lines.push(`DESCRIPTION:${esc(event.description)}`)\n"
]
],
"test/contact-email-single-source.test.js": [
[
"  })\n})\n",
"  })\n})\n\n// The words on the pages are written with a placeholder and filled in from the contact file, so the pages must actually show the address,\n// and the placeholder must never be seen. (Added when the hand-written copies in the legal pages, the delivery page and the calendar file were removed.)\nimport { LEGAL_PAGES } from '../src/data/legalPages'\nimport { staticPages } from '../src/data/staticPages'\nimport { makeIcs } from '../src/home/homeRules'\n\ndescribe('the pages show the contact address from the contact file', () => {\n  const words = (page) => [page.updated, ...(page.intro || []), ...(page.sections || []).flatMap((s) => [s.title, ...s.paragraphs])].filter((t) => typeof t === 'string').join('\\n')\n  it('every legal page that offers an email address shows the real one, as plain text and as a mailto link, and none shows the placeholder', () => {\n    const withEmail = LEGAL_PAGES.filter((p) => words(p).includes(CONTACT_EMAIL))\n    expect(withEmail.map((p) => p.slug).sort()).toEqual(['ai-policy', 'privacy', 'returns', 'terms'])\n    for (const page of LEGAL_PAGES) {\n      expect(words(page), page.slug).not.toMatch(/\\{\\{|\\}\\}/)\n      if (withEmail.includes(page)) expect(words(page), page.slug).toContain(`(mailto:${CONTACT_EMAIL})`)\n    }\n  })\n  it('the delivery page shows it too, as a link', () => {\n    const delivery = staticPages.find((p) => p.slug === 'delivery')\n    expect(delivery.content).toContain(`[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`); expect(delivery.content).not.toMatch(/\\$\\{|\\{\\{/)\n  })\n  it('the calendar file still gives each event an id ending in the site domain, taken from the same constant', () => {\n    const ics = makeIcs({ id: 'abc-1', title: 'T', starts_at: '2026-12-05T19:00:00Z' }, { siteUrl: 'https://example.com', now: new Date('2026-10-01T00:00:00Z') })\n    expect(ics).toContain(`UID:abc-1@${CONTACT_EMAIL.split('@')[1]}`)\n  })\n  it('written out in a page once more by hand, the first test above would catch it (the legal pages file has no copy of the address)', () => {\n    expect(fs.readFileSync(path.resolve('src/data/legalPages.js'), 'utf8')).not.toContain('@starscapesfactory.com')\n  })\n})\n"
]
]
}''')
NEW_FILES = ["INSTALL-CONTACT-ADDRESS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-contact-address-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-contact-address').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
