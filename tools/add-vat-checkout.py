#!/usr/bin/env python3
"""Shows VAT on its own line at checkout (included in the price) and carries it onto renewals and plan changes.

Run it from the project folder, AFTER unzipping starscapes-vat-checkout-20oct.zip into it:   python3 tools/add-vat-checkout.py

What it does: it makes exact edits to four files that already exist (the Stripe payment code, the checkout endpoint, the passes words and the passes page) and adds two new files from the zip (the unzip itself also replaces three test files and adds one).
  lib/membershipStripe.js, api/membership-checkout.js, src/membership/passes.js, src/membership/MembershipPage.jsx

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-vat-checkout.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/membership/vat.js, INSTALL-VAT.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"lib/membershipStripe.js": [
[
"//   - The launch offer is a Stripe coupon (half price for the first year), made once and reused. A promo code from Stripe REPLACES it (Stripe allows one discount per checkout).\n//   - What the customer agreed to (the tick box wording, and when) is written on the Stripe subscription, so there is a record.\n//   - Stripe is asked for the CURRENT state of a subscription every time (never trusting an old message), so messages arriving late or twice cannot put a membership in the wrong state.\n\nimport { PASSES, cleanPassIds, CONSENT_TEXT } from '../src/membership/passes.js'\nimport { LAUNCH_OFFER, monthlyPence, yearlyPence, formatPounds } from '../src/membership/pricing.js'\n\nexport const STRIPE = 'https://api.stripe.com'\n",
"//   - The launch offer is a Stripe coupon (half price for the first year), made once and reused. A promo code from Stripe REPLACES it (Stripe allows one discount per checkout).\n//   - What the customer agreed to (the tick box wording, and when) is written on the Stripe subscription, so there is a record.\n//   - VAT: the price already includes UK VAT, and every checkout carries a Stripe tax rate marked as included, so the checkout page, receipts and invoices show VAT on its own line.\n//     A checkout is never built without that rate, so a payment can never be taken with no VAT shown.\n//   - Stripe is asked for the CURRENT state of a subscription every time (never trusting an old message), so messages arriving late or twice cannot put a membership in the wrong state.\n\nimport { PASSES, cleanPassIds, CONSENT_TEXT } from '../src/membership/passes.js'\nimport { LAUNCH_OFFER, monthlyPence, yearlyPence, formatPounds } from '../src/membership/pricing.js'\nimport { UK_VAT_PERCENT, VAT_NAME, VAT_RATE_TAG } from '../src/membership/vat.js'\n\nexport const STRIPE = 'https://api.stripe.com'\n"
],
[
"}\n\nexport function buildCheckoutForm({ user, passes, interval, promotionCodeId = null, launch = false, offerNote = '', consentAt, returnTo, customerId = null }) {\n  const ids = cleanPassIds(passes)\n  const pence = chargePence(ids, interval)\n",
"}\n\nexport function buildCheckoutForm({ user, passes, interval, promotionCodeId = null, launch = false, offerNote = '', consentAt, returnTo, customerId = null, vatRateId = null }) {\n  if (!/^txr_[A-Za-z0-9]+$/.test(clean(vatRateId))) throw new Error('a checkout needs the VAT rate')\n  const ids = cleanPassIds(passes)\n  const pence = chargePence(ids, interval)\n"
],
[
"  form.set('line_items[0][price_data][product_data][name]', `Starscapes Factory passes: ${ids.length} ${ids.length === 1 ? 'pass' : 'passes'}`)\n  form.set('line_items[0][price_data][product_data][description]', ids.map(nameOf).join(', '))\n  form.set('custom_text[submit][message]', 'Your passes open as soon as you pay, and you have said you understand that you then lose your 14-day right to cancel and get a refund. Cancel any time: you keep your passes until the end of what you have paid for.')\n  const metadata = {\n",
"  form.set('line_items[0][price_data][product_data][name]', `Starscapes Factory passes: ${ids.length} ${ids.length === 1 ? 'pass' : 'passes'}`)\n  form.set('line_items[0][price_data][product_data][description]', ids.map(nameOf).join(', '))\n  form.set('line_items[0][tax_rates][0]', clean(vatRateId)) // shows VAT on its own line at checkout\n  form.set('subscription_data[default_tax_rates][0]', clean(vatRateId)) // and carries it onto every renewal\n  form.set('custom_text[submit][message]', 'Your passes open as soon as you pay, and you have said you understand that you then lose your 14-day right to cancel and get a refund. Cancel any time: you keep your passes until the end of what you have paid for.')\n  const metadata = {\n"
],
[
"  const body = await response.json().catch(() => null)\n  return { ok: response.ok, status: response.status, body }\n}\n\n",
"  const body = await response.json().catch(() => null)\n  return { ok: response.ok, status: response.status, body }\n}\n\n// The Stripe tax rate for UK VAT, 20 percent, marked as INCLUDED in the price: found by the tag we wrote on it, or made if it is not there yet (once per Stripe mode, test and live).\n// Returns its id. Throws if Stripe cannot say, and the checkout then does not start: better no payment than a payment with no VAT line.\nexport async function ensureVatRate(key, doFetch = fetch) {\n  const list = await stripeCall('/v1/tax_rates?active=true&inclusive=true&limit=100', key, doFetch)\n  if (!list.ok) throw stripeFailure('look for the VAT rate', list)\n  const rates = list.body && Array.isArray(list.body.data) ? list.body.data : []\n  const found = rates.find((r) => r && typeof r.id === 'string' && r.active === true && r.inclusive === true && Number(r.percentage) === UK_VAT_PERCENT && r.display_name === VAT_NAME && r.metadata && r.metadata.starscapes_vat === VAT_RATE_TAG)\n  if (found) return found.id\n  const form = new URLSearchParams()\n  form.set('display_name', VAT_NAME)\n  form.set('description', `UK VAT ${UK_VAT_PERCENT}%, included in the price`)\n  form.set('percentage', String(UK_VAT_PERCENT))\n  form.set('inclusive', 'true')\n  form.set('jurisdiction', 'GB')\n  form.set('tax_type', 'vat')\n  form.set('metadata[starscapes_vat]', VAT_RATE_TAG)\n  const made = await stripeCall('/v1/tax_rates', key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (made.ok && made.body && typeof made.body.id === 'string') return made.body.id\n  throw stripeFailure('make the VAT rate', made)\n}\n\n"
],
[
"  form.set('items[0][price_data][unit_amount]', String(chargePence(ids, interval)))\n  form.set('items[0][price_data][recurring][interval]', interval)\n  form.set('proration_behavior', 'none')\n  form.set('metadata[passes]', ids.join(','))\n",
"  form.set('items[0][price_data][unit_amount]', String(chargePence(ids, interval)))\n  form.set('items[0][price_data][recurring][interval]', interval)\n  // the item keeps the tax rate it already has (VAT, included in the price): say so, so a change can never drop it\n  const keepRates = (Array.isArray(item.tax_rates) ? item.tax_rates : []).map((r) => (typeof r === 'string' ? r : r && r.id)).filter((id) => typeof id === 'string' && id)\n  keepRates.forEach((id, n) => form.set(`items[0][tax_rates][${n}]`, id))\n  form.set('proration_behavior', 'none')\n  form.set('metadata[passes]', ids.join(','))\n"
]
],
"api/membership-checkout.js": [
[
"import { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'\nimport { saveMembership } from './membership-webhook.js'\nimport { STRIPE, stripeMode, stripeHeaders, logProblem, findHeldSubscription, membershipRowFromSubscription, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n",
"import { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'\nimport { saveMembership } from './membership-webhook.js'\nimport { STRIPE, stripeMode, stripeHeaders, logProblem, findHeldSubscription, membershipRowFromSubscription, buildCheckoutForm, ensureLaunchCoupon, ensureVatRate, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n"
],
[
"    const launch = Boolean(LAUNCH_OFFER.active) && !promotionCodeId\n    if (launch) await ensureLaunchCoupon(parsed.interval, k.key)\n\n    const form = buildCheckoutForm({\n",
"    const launch = Boolean(LAUNCH_OFFER.active) && !promotionCodeId\n    if (launch) await ensureLaunchCoupon(parsed.interval, k.key)\n    const vatRateId = await ensureVatRate(k.key) // VAT shown on its own line at checkout; if Stripe cannot give it, no checkout starts\n\n    const form = buildCheckoutForm({\n"
],
[
"      returnTo,\n      customerId: existing && existing.stripe_customer_id ? existing.stripe_customer_id : null,\n    })\n    const response = await fetch(`${STRIPE}/v1/checkout/sessions`, {\n",
"      returnTo,\n      customerId: existing && existing.stripe_customer_id ? existing.stripe_customer_id : null,\n      vatRateId,\n    })\n    const response = await fetch(`${STRIPE}/v1/checkout/sessions`, {\n"
]
],
"src/membership/passes.js": [
[
"\nexport const FREE_TEXT = 'Read every public entry and the latest posts, and get the free ebook. The first three posts in every pass are free to read too, and the first three Come Write With Me sessions are free to join.'\nexport const STRIPE_NOTE = 'You pay on Stripe, by card. Cancel any time. You keep your passes until the end of what you have paid for.'\n",
"\nexport const FREE_TEXT = 'Read every public entry and the latest posts, and get the free ebook. The first three posts in every pass are free to read too, and the first three Come Write With Me sessions are free to join.'\nexport const VAT_NOTE = 'Prices include VAT, which is shown separately at checkout. Passes are for customers in the UK for now.'\nexport const STRIPE_NOTE = 'You pay on Stripe, by card. Cancel any time. You keep your passes until the end of what you have paid for.'\n"
]
],
"src/membership/MembershipPage.jsx": [
[
"import { MEMBERSHIP } from '../data/membership'\nimport { redirectTo } from '../cart/redirect'\nimport { PASSES, PASS_IDS, cleanPassIds, CONSENT_TEXT, FREE_TEXT, STRIPE_NOTE } from './passes'\nimport { LAUNCH_OFFER, priceFor, formatPounds, ladderRows, ladderKey, YEARLY_MONTHS } from './pricing'\nimport { startMembershipCheckout, checkPromoCode } from './membershipApi'\n",
"import { MEMBERSHIP } from '../data/membership'\nimport { redirectTo } from '../cart/redirect'\nimport { PASSES, PASS_IDS, cleanPassIds, CONSENT_TEXT, FREE_TEXT, STRIPE_NOTE, VAT_NOTE } from './passes'\nimport { LAUNCH_OFFER, priceFor, formatPounds, ladderRows, ladderKey, YEARLY_MONTHS } from './pricing'\nimport { startMembershipCheckout, checkPromoCode } from './membershipApi'\n"
],
[
"          )}\n          <p className=\"mb__stripe\">{STRIPE_NOTE}</p>\n          </div>\n\n",
"          )}\n          <p className=\"mb__stripe\">{STRIPE_NOTE}</p>\n          <p className=\"mb__stripe\">{VAT_NOTE}</p>\n          </div>\n\n"
]
]
}''')
NEW_FILES = ["src/membership/vat.js", "INSTALL-VAT.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/pricing.js", "lib/membershipAccount.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier membership packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-vat-checkout-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-vat-checkout').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
