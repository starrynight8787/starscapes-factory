#!/usr/bin/env python3
"""Changes the delivery line on the print pages to say delivery is free and tracked to the six countries (built from the shared country list), and has the cart use the same helper. The new test is only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-delivery-line-22oct.zip into it:   python3 tools/add-delivery-line.py

What it does: it makes exact edits to 3 files and, only if all succeed, puts one new test in place.
  src/artloft/artLoftData.js, src/cart/CartPage.jsx, src/cart/launchCountries.js

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-delivery-line.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-DELIVERY-LINE.txt, tools/delivery-line-files/delivery-line.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/artloft/artLoftData.js": [
[
"\nimport { IMPORT_TAX_NOTE } from '../cart/launchCountries'\n\n",
"\nimport { IMPORT_TAX_NOTE, DELIVERY_LINE } from '../cart/launchCountries'\n\n"
],
[
"  'Printed on Hahnemühle Photo Rag, a cotton fine art paper.',\n  'Delivery cost is shown at checkout, which opens soon.',\n  IMPORT_TAX_NOTE,\n",
"  'Printed on Hahnemühle Photo Rag, a cotton fine art paper.',\n  DELIVERY_LINE,\n  IMPORT_TAX_NOTE,\n"
]
],
"src/cart/CartPage.jsx": [
[
"import { redirectTo } from './redirect'\nimport { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE } from './launchCountries'\nimport { KINDS, setQty, removeItem, clearCart } from './cartStore'\nimport { formatMoney } from './money'\nimport PageBanner from '../components/PageBanner'\n\n// \"United Kingdom, Ireland and Canada\"\nfunction countryList(codes) {\n  const names = new Intl.DisplayNames(['en'], { type: 'region' })\n  const list = codes.map((c) => names.of(c))\n  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.join('')\n}\n\n",
"import { redirectTo } from './redirect'\nimport { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE, countryList } from './launchCountries'\nimport { KINDS, setQty, removeItem, clearCart } from './cartStore'\nimport { formatMoney } from './money'\nimport PageBanner from '../components/PageBanner'\n\n"
]
],
"src/cart/launchCountries.js": [
[
"export const IMPORT_TAX_NOTE = \"Delivering to Canada: your country's import tax and a courier handling fee may be charged when the parcel arrives. They are not included in our prices. Orders to the UK, Ireland, Germany, France and the US have none.\"\n",
"export const IMPORT_TAX_NOTE = \"Delivering to Canada: your country's import tax and a courier handling fee may be charged when the parcel arrives. They are not included in our prices. Orders to the UK, Ireland, Germany, France and the US have none.\"\n\n// HOW COUNTRIES READ IN A SENTENCE: \"the UK, Ireland, Germany, France, the United States and Canada\". ONE helper, used by the cart and by the print pages, so the two can never say different things.\nconst SAID_AS = { GB: 'the UK', US: 'the United States' }\nconst WITH_THE = ['NL', 'AE', 'PH'] // countries that take \"the\" before their name (the Netherlands, the United Arab Emirates, the Philippines)\nexport function countryList(codes) {\n  const names = new Intl.DisplayNames(['en'], { type: 'region' })\n  const list = codes.map((c) => SAID_AS[c] || (WITH_THE.includes(c) ? `the ${names.of(c)}` : names.of(c)))\n  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.join('')\n}\n\n// THE DELIVERY LINE under Add to cart on every print page (SFW-9, decided by Gill on 22 October 2026: \"tracked, plus the limit\"). Built from the same list as the checkout, so it changes\n// itself when a country is added (SFW-187). It deliberately says NOTHING about how long delivery takes: Creative Hub has confirmed tracking on every order and one figure for everywhere\n// (6 to 10 working days, making and delivering together), but has not yet answered for Europe, the US and Canada separately (SFW-17). Add a timing only when they have.\nexport const DELIVERY_LINE = `Free tracked delivery to ${countryList(LAUNCH_COUNTRIES)}. We can't deliver anywhere else yet.`\n"
]
]
}''')
STAGED = {
    'test/delivery-line.test.js': 'tools/delivery-line-files/delivery-line.test.js.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-DELIVERY-LINE.txt", "tools/delivery-line-files/delivery-line.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-delivery-line-22oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-delivery-line').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-delivery-line').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
