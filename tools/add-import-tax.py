#!/usr/bin/env python3
"""Tells buyers, before they pay, that Canadian orders may carry import tax and a courier fee (print pages, cart and Stripe's address step), and makes the Terms and Returns say that orders within the UK, EU and US carry none. Duty-paid delivery stays off. The new test is only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-import-tax-21oct.zip into it:   python3 tools/add-import-tax.py

What it does: it makes exact edits to 5 files and, only if all succeed, puts one new test in place.
  api/checkout.js, src/artloft/artLoftData.js, src/cart/CartPage.jsx, src/cart/launchCountries.js, src/data/legalPages.js

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-import-tax.
  - It is safe to run twice: a file already done is left alone.
  - The new files (tools/import-tax-files/import-tax-note.test.js.staged, INSTALL-IMPORT-TAX.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/checkout.js": [
[
"\nimport { LAUNCH_COUNTRIES } from '../src/cart/launchCountries.js'\nimport { requireOwner } from '../lib/ownerGuard.js'\n",
"\nimport { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE } from '../src/cart/launchCountries.js'\nimport { requireOwner } from '../lib/ownerGuard.js'\n"
],
[
"  form.set('phone_number_collection[enabled]', 'true')\n  form.set('custom_text[shipping_address][message]', 'Delivery is free. Each print is made to order and posted straight to you from the print studio.')\n  LAUNCH_COUNTRIES.forEach((code, i) => form.set(`shipping_address_collection[allowed_countries][${i}]`, code))\n",
"  form.set('phone_number_collection[enabled]', 'true')\n  form.set('custom_text[shipping_address][message]', `Delivery is free. Each print is made to order and posted straight to you from the print studio. ${IMPORT_TAX_NOTE}`)\n  LAUNCH_COUNTRIES.forEach((code, i) => form.set(`shipping_address_collection[allowed_countries][${i}]`, code))\n"
]
],
"src/artloft/artLoftData.js": [
[
"// each frame is drawn to fit its own cover picture (see hangFrames below), so they have no fixed box.\n\n",
"// each frame is drawn to fit its own cover picture (see hangFrames below), so they have no fixed box.\n\nimport { IMPORT_TAX_NOTE } from '../cart/launchCountries'\n\n"
],
[
"  'Delivery cost is shown at checkout, which opens soon.',\n]\n",
"  'Delivery cost is shown at checkout, which opens soon.',\n  IMPORT_TAX_NOTE,\n]\n"
]
],
"src/cart/CartPage.jsx": [
[
"import { redirectTo } from './redirect'\nimport { LAUNCH_COUNTRIES } from './launchCountries'\nimport { KINDS, setQty, removeItem, clearCart } from './cartStore'\n",
"import { redirectTo } from './redirect'\nimport { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE } from './launchCountries'\nimport { KINDS, setQty, removeItem, clearCart } from './cartStore'\n"
],
[
"        <p className=\"cart-summary__note\">Delivery is free to {countryList(LAUNCH_COUNTRIES)}. You'll choose your address on the next page.</p>\n        {!printsOnly && <p className=\"cart-summary__note\" role=\"status\">Checkout only handles prints for now. Please remove anything else to pay.</p>}\n",
"        <p className=\"cart-summary__note\">Delivery is free to {countryList(LAUNCH_COUNTRIES)}. You'll choose your address on the next page.</p>\n        <p className=\"cart-summary__note\">{IMPORT_TAX_NOTE}</p>\n        {!printsOnly && <p className=\"cart-summary__note\" role=\"status\">Checkout only handles prints for now. Please remove anything else to pay.</p>}\n"
]
],
"src/cart/launchCountries.js": [
[
"export const LAUNCH_COUNTRIES = ['GB', 'IE', 'DE', 'FR', 'US', 'CA']\n",
"export const LAUNCH_COUNTRIES = ['GB', 'IE', 'DE', 'FR', 'US', 'CA']\n\n// IMPORT TAXES (decided by Gill, 21 October 2026: \"a for launch\"). Creative Hub makes each print in the region it is delivered to (the UK, Germany for the EU, the US),\n// and a print made and delivered inside the same region carries no import taxes or customs charges. Canada is the one launch country that is not like that: its prints are\n// made in the US and cross the border, so the buyer may be charged Canadian import tax and a courier handling fee on delivery. Duty-paid delivery (DDP) is left OFF for Canada\n// for launch, so the buyer is told plainly, before paying, in every place that matters (the print page, the cart, and Stripe's address step). Switching DDP on later is\n// SFW-16; add a country here that is NOT in MADE_IN_REGION and test/import-tax-note.test.js fails until its import tax wording has been decided.\nexport const MADE_IN_REGION = ['GB', 'IE', 'DE', 'FR', 'US'] // delivered from a studio in the same region: no import taxes\nexport const IMPORT_TAX_COUNTRIES = LAUNCH_COUNTRIES.filter((code) => !MADE_IN_REGION.includes(code))\nexport const IMPORT_TAX_NOTE = \"Delivering to Canada: your country's import tax and a courier handling fee may be charged when the parcel arrives. They are not included in our prices. Orders to the UK, Ireland, Germany, France and the US have none.\"\n"
]
],
"src/data/legalPages.js": [
[
"        \"paragraphs\": [\n          \"If you live outside the UK, your country may charge import taxes, customs duties or handling fees when your parcel arrives. They are not included in our prices, we don't control them, and you are responsible for paying them. If you refuse a parcel or don't collect it, we may take the cost of returning it out of any refund. We are not responsible for delays caused by customs. Please check your country's rules before you order.\"\n        ]\n",
"        \"paragraphs\": [\n          \"Each print is made in the region it is delivered to: in the UK for orders to the UK, in Germany for orders to the EU, and in the United States for orders to the US. A print that is made and delivered within the same region carries no import taxes or customs charges. Orders to Canada are made in the United States and cross the border, so Canadian import tax and a courier handling fee may be charged when the parcel arrives. They are not included in our prices, we don't control them, we can't predict the amount, and you are responsible for paying them. If you refuse a parcel or don't collect it, we may take the cost of returning it out of any refund. We are not responsible for delays caused by customs. Please check your country's rules before you order.\"\n        ]\n"
],
[
"        \"paragraphs\": [\n          \"The same rights apply wherever you live. Import taxes and duties are paid to your country's customs, not to us, so we can't refund them. If you send a print back from abroad, you may be able to claim them back from customs: ask your local customs office. If you refuse a parcel or don't collect it, we may take the cost of returning it out of your refund. The consumer laws of your own country may give you extra rights.\"\n        ]\n",
"        \"paragraphs\": [\n          \"The same rights apply wherever you live. Orders delivered within the UK, the EU and the US are made in that region and carry no import taxes. If you are in Canada and were charged import tax or a courier handling fee when your parcel arrived, that was paid to your country's customs and the courier, not to us, so we can't refund it. If you send a print back, you may be able to claim the tax back from customs: ask your local customs office. If you refuse a parcel or don't collect it, we may take the cost of returning it out of your refund. The consumer laws of your own country may give you extra rights.\"\n        ]\n"
]
]
}''')
STAGED = {
    'test/import-tax-note.test.js': 'tools/import-tax-files/import-tax-note.test.js.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["tools/import-tax-files/import-tax-note.test.js.staged", "INSTALL-IMPORT-TAX.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-import-tax-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-import-tax').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-import-tax').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
