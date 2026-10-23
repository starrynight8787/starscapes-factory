#!/usr/bin/env python3
"""Adds the required Terms tick box and the returns summary on Stripe's page, the Before you pay box on the cart, and the rail that keeps real payments closed until the legal pages are published. The five new files are only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-checkout-terms-v2-22oct.zip into it:   python3 tools/add-checkout-terms.py

What it does: it makes exact edits to 3 files and, only if all succeed, puts five new files in place.
  api/checkout.js, src/cart/CartPage.jsx, src/cart/cart.css

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-checkout-terms.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-CHECKOUT-TERMS.txt, tools/checkout-terms-files/src_cart_BeforeYouPayBox.jsx.staged, tools/checkout-terms-files/src_cart_beforeYouPay.js.staged, tools/checkout-terms-files/test_before-you-pay.test.jsx.staged, tools/checkout-terms-files/test_checkout-terms.test.js.staged, tools/checkout-terms-files/test_no-case-clashes.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{"api/checkout.js": [["//   - sell a print that is not published, or that has no Creative Hub id\n//   - take a LIVE payment unless ALLOW_LIVE_CHECKOUT is set to yes in Vercel, AND the confirmation email is ready (see lib/orderConfirmation.js).\n//     (Do not set ALLOW_LIVE_CHECKOUT until orders reach Creative Hub, or a real payment could be taken without an order being placed.)\n", "//   - sell a print that is not published, or that has no Creative Hub id\n//   - take a LIVE payment unless ALLOW_LIVE_CHECKOUT is set to yes in Vercel, AND the confirmation email is ready (see lib/orderConfirmation.js),\n//     AND the legal pages are published (LEGAL_PAGES_PUBLISHED in src/cart/beforeYouPay.js), because the Terms tick box points at them.\n//   - let anyone pay without ticking the box that agrees to the Terms: Stripe's page makes it required, shows the returns summary beside the pay button,\n//     and records each acceptance on the order. (The address of the Terms page must be entered in Stripe's settings first.)\n//     (Do not set ALLOW_LIVE_CHECKOUT until orders reach Creative Hub, or a real payment could be taken without an order being placed.)\n"], ["import { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE } from '../src/cart/launchCountries.js'\nimport { requireOwner } from '../lib/ownerGuard.js'\n", "import { LAUNCH_COUNTRIES, IMPORT_TAX_NOTE } from '../src/cart/launchCountries.js'\nimport { STRIPE_SUBMIT_MESSAGE, STRIPE_TERMS_MESSAGE, LEGAL_PAGES_PUBLISHED } from '../src/cart/beforeYouPay.js'\nimport { requireOwner } from '../lib/ownerGuard.js'\n"], ["  if (mode === 'live' && confirmationProblems().length > 0) return say(res, 503, 'Checkout is not open for real payments yet.')\n\n", "  if (mode === 'live' && confirmationProblems().length > 0) return say(res, 503, 'Checkout is not open for real payments yet.')\n  // ...and a real customer must be able to read the Terms and Returns pages the tick box points at, so real payments also wait for them to be published (SFW-186).\n  if (mode === 'live' && !LEGAL_PAGES_PUBLISHED) return say(res, 503, 'Checkout is not open for real payments yet.')\n\n"], ["  form.set('custom_text[shipping_address][message]', `Delivery is free. Each print is made to order and posted straight to you from the print studio. ${IMPORT_TAX_NOTE}`)\n  LAUNCH_COUNTRIES.forEach((code, i) => form.set(`shipping_address_collection[allowed_countries][${i}]`, code))\n", "  form.set('custom_text[shipping_address][message]', `Delivery is free. Each print is made to order and posted straight to you from the print studio. ${IMPORT_TAX_NOTE}`)\n  // The Terms tick box is REQUIRED (Stripe records the acceptance on the order), with the returns summary beside the pay button (SFW-14)\n  form.set('consent_collection[terms_of_service]', 'required')\n  form.set('custom_text[terms_of_service_acceptance][message]', STRIPE_TERMS_MESSAGE)\n  form.set('custom_text[submit][message]', STRIPE_SUBMIT_MESSAGE)\n  LAUNCH_COUNTRIES.forEach((code, i) => form.set(`shipping_address_collection[allowed_countries][${i}]`, code))\n"], ["    const data = await response.json().catch(() => null)\n    if (!response.ok || !data || typeof data.url !== 'string') return say(res, 502, \"We couldn't start checkout just now. Please try again in a moment.\")\n", "    const data = await response.json().catch(() => null)\n    // Stripe refuses a required Terms tick box until the address of the Terms page is entered in its settings: say so plainly instead of a vague \"try again\"\n    if (!response.ok && /terms of service/i.test(String((data && data.error && data.error.message) || ''))) return say(res, 503, \"Checkout isn't ready yet: the address of the Terms page still has to be entered in Stripe.\", { reason: 'terms_url_missing' })\n    if (!response.ok || !data || typeof data.url !== 'string') return say(res, 502, \"We couldn't start checkout just now. Please try again in a moment.\")\n"]], "src/cart/CartPage.jsx": [["import { KINDS, setQty, removeItem, clearCart } from './cartStore'\nimport { formatMoney } from './money'\nimport PageBanner from '../components/PageBanner'\n\n", "import { KINDS, setQty, removeItem, clearCart } from './cartStore'\nimport { formatMoney } from './money'\nimport PageBanner from '../components/PageBanner'\nimport BeforeYouPayBox from './BeforeYouPayBox'\n\n"], ["        {!printsOnly && <p className=\"cart-summary__note\" role=\"status\">Checkout only handles prints for now. Please remove anything else to pay.</p>}\n        <button type=\"button\" className=\"cart-checkout\" disabled={paying.busy || !printsOnly || !canPay} onClick={handleCheckout}>\n", "        {!printsOnly && <p className=\"cart-summary__note\" role=\"status\">Checkout only handles prints for now. Please remove anything else to pay.</p>}\n        <BeforeYouPayBox />\n        <button type=\"button\" className=\"cart-checkout\" disabled={paying.busy || !printsOnly || !canPay} onClick={handleCheckout}>\n"]], "src/cart/cart.css": [["  line-height: 1.1;\n  color: #fff;\n}\n@media (max-width: 720px) {\n  .cart .pb .pb__title {\n    font-size: 2rem;\n  }\n}\n", "  line-height: 1.1;\n  color: #fff;\n}\n@media (max-width: 720px) {\n  .cart .pb .pb__title {\n    font-size: 2rem;\n  }\n}\n\n/* \"Before you pay\": the cancellation and returns information above the pay button (SFW-14). Takes the colours of the card it sits in. */\n.cart-before { margin: 14px 0; padding: 12px 14px; border: 1px solid rgba(127, 127, 127, 0.45); border-radius: 10px; }\n.cart-before__title { margin: 0 0 6px; font-size: 1rem; }\n.cart-before__list { margin: 0 0 8px; padding-left: 1.2em; font-size: 0.9375rem; line-height: 1.5; }\n.cart-before__links { margin: 0; font-size: 0.9375rem; line-height: 1.5; }\n"]]}''')
STAGED = {
    'src/cart/beforeYouPay.js': 'tools/checkout-terms-files/src_cart_beforeYouPay.js.staged',
    'src/cart/BeforeYouPayBox.jsx': 'tools/checkout-terms-files/src_cart_BeforeYouPayBox.jsx.staged',
    'test/before-you-pay.test.jsx': 'tools/checkout-terms-files/test_before-you-pay.test.jsx.staged',
    'test/checkout-terms.test.js': 'tools/checkout-terms-files/test_checkout-terms.test.js.staged',
    'test/no-case-clashes.test.js': 'tools/checkout-terms-files/test_no-case-clashes.test.js.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-CHECKOUT-TERMS.txt", "tools/checkout-terms-files/src_cart_BeforeYouPayBox.jsx.staged", "tools/checkout-terms-files/src_cart_beforeYouPay.js.staged", "tools/checkout-terms-files/test_before-you-pay.test.jsx.staged", "tools/checkout-terms-files/test_checkout-terms.test.js.staged", "tools/checkout-terms-files/test_no-case-clashes.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-checkout-terms-v2-22oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-checkout-terms').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-checkout-terms').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
