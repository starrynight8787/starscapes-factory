#!/usr/bin/env python3
"""Names the passes on the checkout line and the invoice, including after a change of passes.

Run it from the project folder, AFTER unzipping starscapes-pass-names-20oct.zip into it:   python3 tools/add-pass-names.py

What it does: it makes exact edits to two files that already exist (the Stripe helpers and the account handler) and adds one new file from the zip (the unzip itself also replaces two test files and adds one).
  lib/membershipStripe.js, lib/membershipAccount.js

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-pass-names.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PASS-NAMES.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"lib/membershipStripe.js": [
[
"\nconst nameOf = (id) => (PASSES.find((p) => p.id === id) || {}).name || id\n\n// The percentage taken off by the launch offer (the page's fraction is what you PAY: 0.5 means half price, 50 percent off)\n",
"\nconst nameOf = (id) => (PASSES.find((p) => p.id === id) || {}).name || id\n\n// The name of the line on the checkout page, the receipt and the invoice, so a member can see WHICH passes they pay for:\n// \"Starscapes Factory passes: The Author's Notebook, Blueprints and Book Club\" (one pass: \"Starscapes Factory pass: Blueprints\").\nexport function passesLineName(passes) {\n  const names = cleanPassIds(passes).map(nameOf)\n  if (names.length === 0) return 'Starscapes Factory passes'\n  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`\n  return `Starscapes Factory ${names.length === 1 ? 'pass' : 'passes'}: ${list}`\n}\n\n// The percentage taken off by the launch offer (the page's fraction is what you PAY: 0.5 means half price, 50 percent off)\n"
],
[
"  form.set('line_items[0][price_data][unit_amount]', String(pence))\n  form.set('line_items[0][price_data][recurring][interval]', per)\n  form.set('line_items[0][price_data][product_data][name]', `Starscapes Factory passes: ${ids.length} ${ids.length === 1 ? 'pass' : 'passes'}`)\n  form.set('line_items[0][price_data][product_data][description]', ids.map(nameOf).join(', '))\n  form.set('line_items[0][tax_rates][0]', clean(vatRateId)) // shows VAT on its own line at checkout\n  form.set('subscription_data[default_tax_rates][0]', clean(vatRateId)) // and carries it onto every renewal\n",
"  form.set('line_items[0][price_data][unit_amount]', String(pence))\n  form.set('line_items[0][price_data][recurring][interval]', per)\n  form.set('line_items[0][price_data][product_data][name]', passesLineName(ids))\n  form.set('line_items[0][price_data][product_data][description]', `Billed every ${per}.`)\n  form.set('line_items[0][tax_rates][0]', clean(vatRateId)) // shows VAT on its own line at checkout\n  form.set('subscription_data[default_tax_rates][0]', clean(vatRateId)) // and carries it onto every renewal\n"
],
[
"// A change needs a product that is ACTIVE. The product that a checkout makes on the spot is filed by Stripe as inactive, and Stripe refuses to start a new price on an inactive product\n// (\"The product ... is marked as inactive\"). So changes use ONE product of our own, made once (with a fixed id) and reused every time.\nexport const PRODUCT_ID = 'starscapes-passes'\nexport async function ensureProduct(key, doFetch = fetch) {\n  const form = new URLSearchParams()\n  form.set('id', PRODUCT_ID)\n  form.set('name', 'Starscapes Factory passes')\n  form.set('active', 'true')\n  const made = await stripeCall('/v1/products', key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (made.ok) return PRODUCT_ID\n  if (made.body && made.body.error && made.body.error.code === 'resource_already_exists') return PRODUCT_ID\n  throw stripeFailure('make the passes product', made)\n}\n",
"// A change needs a product that is ACTIVE. The product that a checkout makes on the spot is filed by Stripe as inactive, and Stripe refuses to start a new price on an inactive product\n// (\"The product ... is marked as inactive\"). So changes use ONE product of our own, made once (with a fixed id) and reused every time.\n// With the passes a member is changing TO, the product is one for exactly that set of passes (the id is the same every time for the same set, so at most 31 ever exist, all reused),\n// named for them, so the invoice after a change still names the passes. Without them, it is the one general product.\nexport const PRODUCT_ID = 'starscapes-passes'\nexport const productIdFor = (passes) => `${PRODUCT_ID}-${cleanPassIds(passes).join('-')}`\nexport async function ensureProduct(key, doFetch = fetch, passes = null) {\n  const ids = passes === null ? null : cleanPassIds(passes)\n  if (ids !== null && ids.length === 0) throw new Error('that set of passes has no passes in it')\n  const productId = ids === null ? PRODUCT_ID : productIdFor(ids)\n  const name = ids === null ? 'Starscapes Factory passes' : passesLineName(ids)\n  const form = new URLSearchParams()\n  form.set('id', productId)\n  form.set('name', name)\n  form.set('active', 'true')\n  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }\n  const made = await stripeCall('/v1/products', key, doFetch, { method: 'POST', headers, body: form.toString() })\n  if (made.ok) return productId\n  if (made.body && made.body.error && made.body.error.code === 'resource_already_exists') {\n    if (ids !== null) {\n      // already there: make sure it is active and still carries the right name (a pass may have been renamed since)\n      const keep = new URLSearchParams()\n      keep.set('name', name)\n      keep.set('active', 'true')\n      const updated = await stripeCall(`/v1/products/${encodeURIComponent(productId)}`, key, doFetch, { method: 'POST', headers, body: keep.toString() })\n      if (!updated.ok) throw stripeFailure('update the passes product', updated)\n    }\n    return productId\n  }\n  throw stripeFailure('make the passes product', made)\n}\n"
]
],
"lib/membershipAccount.js": [
[
"      const now = new Date().toISOString()\n      const subscription = await fetchSubscription(row.stripe_subscription_id, k.key)\n      const productId = await ensureProduct(k.key)\n      const form = buildChangeForm({ subscription, passes: wanted, changedAt: now, added, removed, consentAt: added.length > 0 ? now : '', productId })\n      const updated = await updateSubscription(row.stripe_subscription_id, form, k.key)\n",
"      const now = new Date().toISOString()\n      const subscription = await fetchSubscription(row.stripe_subscription_id, k.key)\n      const productId = await ensureProduct(k.key, undefined, wanted) // a product named for the passes they are changing to, so the invoice names them\n      const form = buildChangeForm({ subscription, passes: wanted, changedAt: now, added, removed, consentAt: added.length > 0 ? now : '', productId })\n      const updated = await updateSubscription(row.stripe_subscription_id, form, k.key)\n"
]
]
}''')
NEW_FILES = ["INSTALL-PASS-NAMES.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/vat.js", "lib/membershipReminders.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the VAT and reminders packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-pass-names-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-pass-names').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
