#!/usr/bin/env python3
"""Puts Creative Hub's written answers into the site: 6 to 10 days in all, delivery_line2, tracking on every order, and how cancelling and address changes work.

Run it from the project folder, AFTER unzipping starscapes-creative-hub-answers-20oct.zip into it:   python3 tools/add-creative-hub-answers.py

What it does: it makes exact edits to five files that already exist (the legal pages, the Creative Hub order file, the two order emails and the print details) and adds the instructions from the zip (the unzip itself also replaces three test files and adds two).
  src/data/legalPages.js, lib/creativehubOrders.js, lib/orderEmailText.js, lib/dispatchEmailText.js, src/artloft/printDetails.js

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-creative-hub-answers.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-CREATIVE-HUB-ANSWERS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"//\n// CHECK BEFORE PUBLISHING ANY OF THEM:\n//  * TRACKING AND DELIVERY TIMES (SFW-17). Terms section 5 and Returns section 4 say \"Every order is sent with tracked delivery\", and Terms section 5 gives 6 to 10 working\n//    days AFTER posting. The print service's help article says postal orders do not include detailed tracking, and their reply says 6 to 10 working days covers production AND\n//    delivery together. Wait for their answer to Gill's follow-up email, then correct those two sections (and the delivery estimate in the shop).\n//  * THE PRIVACY POLICY was brought up to date on 20 October 2026 (SFW-233): passes, the suggest and vote boxes, story votes, the free ebook (its tick box also says yes to free blog posts by email, so Marketing now says so),\n//    the YouTube player and the browser storage. Decided 20 October: Resend is the mailing tool, and emails and messages to us are kept 2 years. THE ONLY GAP LEFT is the [date]. STILL TO DO BEFORE IT GOES LIVE: the ebook sign-up list\n",
"//\n// CHECK BEFORE PUBLISHING ANY OF THEM:\n//  * TRACKING AND DELIVERY TIMES (SFW-17): ANSWERED by Creative Hub in writing on 20 October 2026. The 6 to 10 working days covers production AND delivery together, framed or unframed; every order has tracking;\n//    an order can be cancelled while printing has not started, and a delivery address changed before dispatch, both by emailing their customer service (there is no way to do it through the API). Terms section 5, the print pages\n//    and the order emails now say so, and Returns section 4 (\"every order is sent with tracked delivery\") is confirmed. STILL NOT ANSWERED: separate figures for Europe, the US and Canada; who receives the tracking email from\n//    Creative Hub (so we do not know if customers would get two emails); whether a test order can be cancelled before it is charged; what the tracking field is called in their API.\n\n//  * THE PRIVACY POLICY was brought up to date on 20 October 2026 (SFW-233): passes, the suggest and vote boxes, story votes, the free ebook (its tick box also says yes to free blog posts by email, so Marketing now says so),\n//    the YouTube player and the browser storage. Decided 20 October: Resend is the mailing tool, and emails and messages to us are kept 2 years. THE ONLY GAP LEFT is the [date]. STILL TO DO BEFORE IT GOES LIVE: the ebook sign-up list\n"
],
[
"        \"paragraphs\": [\n          \"We deliver free to the United Kingdom, Ireland, Germany, France, the United States and Canada. We can't deliver anywhere else at the moment.\",\n          \"Unframed prints are normally made and posted within 1 to 5 working days, and framed prints within 5 to 10 working days. Every order is sent with tracked delivery, which then usually takes 6 to 10 working days (up to 15 outside Europe and North America). These are estimates, not promises. If we haven't agreed a delivery date with you, we will deliver within 30 days of your order. If we are late, contact us and we will put it right, and you may be able to cancel for a refund.\",\n          \"Once your print has been posted, it usually arrives in:\",\n          \"- United Kingdom: 6 to 10 working days\\n- Ireland, Germany and France: 6 to 10 working days\\n- United States and Canada: 6 to 10 working days\",\n          \"We will email you when your order has been posted, with your tracking details.\",\n          \"The print is your responsibility once it has been delivered to you, or to someone you have asked us to deliver it to. Please check the parcel when it arrives and tell us straight away about any damage: see our Returns and refunds page.\"\n        ]\n",
"        \"paragraphs\": [\n          \"We deliver free to the United Kingdom, Ireland, Germany, France, the United States and Canada. We can't deliver anywhere else at the moment.\",\n          \"Every print is made to order and sent with tracked delivery. Framed or unframed, it usually reaches you within 6 to 10 working days of your order, which covers making it and delivering it. These are estimates, not promises. If we haven't agreed a delivery date with you, we will deliver within 30 days of your order. If we are late, contact us and we will put it right, and you may be able to cancel for a refund.\",\n          \"We will email you when your order has been posted, with your tracking details.\",\n          \"If you need to change the delivery address, or want to stop an order before it is made, email [imagine@starscapesfactory.com](mailto:imagine@starscapesfactory.com) straight away. We send your order to the print studio very soon after you pay, so we can only cancel it if printing has not started, and we can only change the delivery address before it has been posted. This is separate from your legal right to cancel, which our Returns and refunds page explains.\",\n          \"The print is your responsibility once it has been delivered to you, or to someone you have asked us to deliver it to. Please check the parcel when it arrives and tell us straight away about any damage: see our Returns and refunds page.\"\n        ]\n"
]
],
"lib/creativehubOrders.js": [
[
"// What Creative Hub's own documentation says (read on 16 October 2026):\n//   POST /v1/orders       items[] (variant_id, quantity), delivery_name, delivery_line1, delivery_city and delivery_country_code are\n//                         required. delivery_postcode, delivery_county, delivery_phone and delivery_email are optional, and \"line2\" is\n//                         mentioned as optional without its field being named. Answers 201 with { order_id, order_number, currency,\n//                         total_incl_vat, lines }, or 409 delivery_zone_unavailable, in which case nothing is placed.\n//   GET  /v1/orders       your orders, newest first (limit and offset). GET /v1/orders/{order_id} is one order with its items and\n",
"// What Creative Hub's own documentation says (read on 16 October 2026):\n//   POST /v1/orders       items[] (variant_id, quantity), delivery_name, delivery_line1, delivery_city and delivery_country_code are\n//                         required. delivery_postcode, delivery_county, delivery_phone and delivery_email are optional, and the second\n//                         address line is delivery_line2 (named by Creative Hub in writing on 20 October 2026). Answers 201 with { order_id, order_number, currency,\n//                         total_incl_vat, lines }, or 409 delivery_zone_unavailable, in which case nothing is placed.\n//   GET  /v1/orders       your orders, newest first (limit and offset). GET /v1/orders/{order_id} is one order with its items and\n"
],
[
"export const LIMITS = { lines: 20, qtyMin: 1, qtyMax: 50, text: 120, phone: 30, postcode: 20 }\n\n// The documentation says \"line2 optional\" without giving its field name. Until Creative Hub confirms it, a second address line is joined\n// onto the first, so it can never be lost or refused. When the name is confirmed, put it here (for example 'delivery_line2').\nexport const LINE2_FIELD = null\n\n// ---------- settings ----------\n",
"export const LIMITS = { lines: 20, qtyMin: 1, qtyMax: 50, text: 120, phone: 30, postcode: 20 }\n\n// The field for the second address line. Creative Hub confirmed this name in writing on 20 October 2026 (before that, a second line was joined onto the first so it could never be lost).\nexport const LINE2_FIELD = 'delivery_line2'\n\n// ---------- settings ----------\n"
]
],
"lib/orderEmailText.js": [
[
"\nimport { CONTACT_EMAIL } from '../src/data/contact.js'\nimport { MAKE_DAYS, SHIP_DAYS, SHIPS_IN_6_TO_10 } from '../src/artloft/printDetails.js'\n\nexport const WORDING_APPROVED = false\n",
"\nimport { CONTACT_EMAIL } from '../src/data/contact.js'\nimport { JOURNEY_DAYS, REST_OF_WORLD_DAYS, SHIPS_IN_6_TO_10 } from '../src/artloft/printDetails.js'\n\nexport const WORDING_APPROVED = false\n"
],
[
"const isFramed = (item) => /frame/i.test(clean(item && item.description)) && !/unframed/i.test(clean(item && item.description))\n\n// \"7 to 15 working days\" for the whole journey: making, then posting. Uses the same numbers as the print page, which come from Creative Hub.\nexport function deliveryEstimate(items, countryCode) {\n  const list = Array.isArray(items) ? items : []\n  const framed = list.some(isFramed)\n  const [makeLow, makeHigh] = MAKE_DAYS[framed ? 'framed' : 'unframed']\n  const fast = SHIPS_IN_6_TO_10.has(String(countryCode || '').toUpperCase())\n  const shipLow = SHIP_DAYS[0]\n  const shipHigh = fast ? SHIP_DAYS[1] : 15 // Creative Hub's time for the rest of the world is up to 15 working days\n  return { framed, low: makeLow + shipLow, high: makeHigh + shipHigh, text: `${makeLow + shipLow} to ${makeHigh + shipHigh} working days` }\n}\n\n",
"const isFramed = (item) => /frame/i.test(clean(item && item.description)) && !/unframed/i.test(clean(item && item.description))\n\n// \"6 to 10 working days\" for the whole journey, from the order to the parcel arriving (making AND delivering, framed or unframed). Uses the same numbers as the print page, which come from Creative Hub.\nexport function deliveryEstimate(items, countryCode) {\n  const list = Array.isArray(items) ? items : []\n  const framed = list.some(isFramed)\n  const fast = SHIPS_IN_6_TO_10.has(String(countryCode || '').toUpperCase())\n  const low = JOURNEY_DAYS[0]\n  const high = fast ? JOURNEY_DAYS[1] : REST_OF_WORLD_DAYS\n  return { framed, low, high, text: `${low} to ${high} working days` }\n}\n\n"
],
[
"    paragraphs: [\n      'Each print is made to order by our printing partner, Creative Hub (Printspace Studios Limited), and posted straight to you in plain packaging. Delivery is free.',\n      `Allow about ${est.text} in all (${est.framed ? 'framing and posting' : 'printing and posting'} takes a few working days, then the post takes the rest). These are estimates, not promises, and if we have not agreed a date with you we will deliver within 30 days of your order. We will email you when your order has been posted.`,\n      'The print is your responsibility once it reaches you (or someone you have asked us to deliver it to). Until then it is at our risk, so if it is lost or damaged on the way, that is for us to sort out, not you.',\n    ],\n",
"    paragraphs: [\n      'Each print is made to order by our printing partner, Creative Hub (Printspace Studios Limited), and posted straight to you in plain packaging. Delivery is free.',\n      `We expect your print to reach you within ${est.text} of your order (${est.framed ? 'framing' : 'printing'} and delivery together). These are estimates, not promises, and if we have not agreed a date with you we will deliver within 30 days of your order. We will email you when your order has been posted, with your tracking details.`,\n      'If something is wrong with the delivery address, email us straight away: we can only change it before your order has been posted.',\n      'The print is your responsibility once it reaches you (or someone you have asked us to deliver it to). Until then it is at our risk, so if it is lost or damaged on the way, that is for us to sort out, not you.',\n    ],\n"
]
],
"lib/dispatchEmailText.js": [
[
"\nimport { CONTACT_EMAIL } from '../src/data/contact.js'\nimport { SHIP_DAYS, SHIPS_IN_6_TO_10 } from '../src/artloft/printDetails.js'\nimport { COMPANY, reference } from './orderEmailText.js'\n\n",
"\nimport { CONTACT_EMAIL } from '../src/data/contact.js'\nimport { JOURNEY_DAYS, REST_OF_WORLD_DAYS, SHIPS_IN_6_TO_10 } from '../src/artloft/printDetails.js'\nimport { COMPANY, reference } from './orderEmailText.js'\n\n"
],
[
"  const a = (order && order.shipping && order.shipping.address) || {}\n  const fast = SHIPS_IN_6_TO_10.has(String(a.country || '').toUpperCase())\n  const days = `${SHIP_DAYS[0]} to ${fast ? SHIP_DAYS[1] : 15} working days`\n  const items = Array.isArray(order && order.items) ? order.items : []\n  const where = [clean(a.city), countryName(a.country)].filter(Boolean).join(', ')\n",
"  const a = (order && order.shipping && order.shipping.address) || {}\n  const fast = SHIPS_IN_6_TO_10.has(String(a.country || '').toUpperCase())\n  const days = `${JOURNEY_DAYS[0]} to ${fast ? JOURNEY_DAYS[1] : REST_OF_WORLD_DAYS} working days`\n  const items = Array.isArray(order && order.items) ? order.items : []\n  const where = [clean(a.city), countryName(a.country)].filter(Boolean).join(', ')\n"
],
[
"  if (track.number) trackLines.push(`Tracking number: ${track.number}`)\n  const after = [\n    `Posting usually takes ${days} to reach you. That is an estimate, not a promise.`,\n    'When it arrives, please check the parcel and the print. If anything is damaged or not as it should be, email us with photos and we will put it right.',\n    `Your 14-day right to cancel runs from the day you receive your print: the confirmation email we sent when you ordered explains how to use it. Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,\n",
"  if (track.number) trackLines.push(`Tracking number: ${track.number}`)\n  const after = [\n    `We expect it to reach you within ${days} of your order. That is an estimate, not a promise.`,\n    'When it arrives, please check the parcel and the print. If anything is damaged or not as it should be, email us with photos and we will put it right.',\n    `Your 14-day right to cancel runs from the day you receive your print: the confirmation email we sent when you ordered explains how to use it. Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,\n"
]
],
"src/artloft/printDetails.js": [
[
"// and delivery times (updated 9 July 2026). If they change, change the numbers here, and the print page follows.\n\n// Working days to make, before it is posted\nexport const MAKE_DAYS = { unframed: [1, 5], framed: [5, 10] }\n// Working days to reach the customer once posted. This is Creative Hub's standard time for the countries below.\nexport const SHIP_DAYS = [6, 10]\n// The countries Creative Hub gives the standard 6 to 10 working days: the UK, the EU, Norway, Iceland, Liechtenstein, Switzerland,\n// the United States and Canada. Anywhere else (Australia, New Zealand, the rest of the world) takes up to 15, so the shop must not\n",
"// and delivery times (updated 9 July 2026). If they change, change the numbers here, and the print page follows.\n\n// Working days from the order to the parcel arriving: making it AND delivering it together, framed or unframed. Creative Hub's written reply of 20 October 2026 (to Gill's question\n// whether the 6 to 10 working days covers framed prints): \"The standard 6-10 working day SLA applies to both framed and unframed prints.\" (Their answer did not give separate figures for\n// Europe, the US and Canada: ask again if it matters.) These were once added together as making days plus delivery days, which wrongly told customers 7 to 15 (or 11 to 20 framed).\nexport const JOURNEY_DAYS = [6, 10]\n// Creative Hub's time for countries outside the list below (their help pages). The shop only sells to countries in the list.\nexport const REST_OF_WORLD_DAYS = 15\n// The countries Creative Hub gives the standard 6 to 10 working days: the UK, the EU, Norway, Iceland, Liechtenstein, Switzerland,\n// the United States and Canada. Anywhere else (Australia, New Zealand, the rest of the world) takes up to 15, so the shop must not\n"
],
[
"    else if (glazing === 'glass') lines.push('Glazed with float glass.')\n  }\n  const [low, high] = MAKE_DAYS[framed ? 'framed' : 'unframed']\n  const [shipLow, shipHigh] = SHIP_DAYS\n  lines.push(`${framed ? 'Framed' : 'Printed'} to order in ${low} to ${high} working days, then ${shipLow} to ${shipHigh} working days to reach you: allow ${low + shipLow} to ${high + shipHigh} working days in all.`)\n  return lines\n}\n",
"    else if (glazing === 'glass') lines.push('Glazed with float glass.')\n  }\n  const [low, high] = JOURNEY_DAYS\n  lines.push(`${framed ? 'Framed' : 'Printed'} to order and delivered to you in ${low} to ${high} working days.`)\n  return lines\n}\n"
]
]
}''')
NEW_FILES = ["INSTALL-CREATIVE-HUB-ANSWERS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["lib/dispatchEmailText.js", "lib/orderEmailText.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier order email packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-creative-hub-answers-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-creative-hub-answers').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
