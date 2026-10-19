#!/usr/bin/env python3
"""Adds My passes, Change my passes, cancelling and starting again, and points the Subscribe button at the passes page.

Run it from the project folder, AFTER unzipping starscapes-membership-account-19oct.zip into it:   python3 tools/add-membership-account.py

What it does: it makes exact edits to nine files that already exist (the checkout, the Stripe helpers, the page list and descriptions, the menu, and the membership page, styles, calls and database file) and adds the account files from the zip.
  api/membership-checkout.js, lib/membershipStripe.js, src/App.jsx, src/data/pageMeta.js, src/components/Navbar.jsx, src/membership/MembershipPage.jsx, src/membership/membership.css, src/membership/membershipApi.js, sql/memberships.sql

How it keeps you safe:
  - It checks ALL 9 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-membership-account.
  - It is safe to run twice: a file already done is left alone.
  - The new files (api/membership-account.js, src/membership/account.js, src/membership/MyPassesPage.jsx, src/membership/ChangePassesPage.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/membership-checkout.js": [
[
"import { cleanPassIds } from '../src/membership/passes.js'\nimport { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { STRIPE, stripeMode, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n",
"import { cleanPassIds } from '../src/membership/passes.js'\nimport { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { STRIPE, stripeMode, stripeHeaders, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n"
],
[
"  try {\n    let promotionCodeId = null\n    if (parsed.code) {\n      const found = await findPromotionCode(parsed.code, k.key)\n      if (!found) return say(res, 400, 'That code is not valid, or it has ended.')\n      promotionCodeId = found.id\n    }\n    const launch = Boolean(LAUNCH_OFFER.active) && !promotionCodeId\n",
"  try {\n    let promotionCodeId = null\n    let offerNote = ''\n    if (parsed.code) {\n      const found = await findPromotionCode(parsed.code, k.key)\n      if (!found) return say(res, 400, 'That code is not valid, or it has ended.')\n      promotionCodeId = found.id\n      offerNote = found.summary // kept on the subscription, so My passes can say what discount someone has\n    }\n    const launch = Boolean(LAUNCH_OFFER.active) && !promotionCodeId\n"
],
[
"      promotionCodeId,\n      launch,\n      consentAt: new Date().toISOString(),\n      returnTo,\n      customerId: existing && existing.stripe_customer_id ? existing.stripe_customer_id : null,\n    })\n    const response = await fetch(`${STRIPE}/v1/checkout/sessions`, {\n      method: 'POST',\n      headers: { Authorization: `Bearer ${k.key}`, 'Content-Type': 'application/x-www-form-urlencoded' },\n      body: form.toString(),\n      signal: AbortSignal.timeout(15000),\n",
"      promotionCodeId,\n      launch,\n      offerNote,\n      consentAt: new Date().toISOString(),\n      returnTo,\n      customerId: existing && existing.stripe_customer_id ? existing.stripe_customer_id : null,\n    })\n    const response = await fetch(`${STRIPE}/v1/checkout/sessions`, {\n      method: 'POST',\n      headers: stripeHeaders(k.key, { 'Content-Type': 'application/x-www-form-urlencoded' }),\n      body: form.toString(),\n      signal: AbortSignal.timeout(15000),\n"
]
],
"lib/membershipStripe.js": [
[
"\nexport const STRIPE = 'https://api.stripe.com'\nconst clean = (v) => String(v || '').trim()\nconst UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i\n",
"\nexport const STRIPE = 'https://api.stripe.com'\n// Every call asks for THIS version of Stripe's interface, so the shape of what comes back never changes underneath us when the account's own default moves on.\nexport const STRIPE_VERSION = '2024-06-20'\nexport const stripeHeaders = (key, extra = {}) => ({ Authorization: `Bearer ${key}`, 'Stripe-Version': STRIPE_VERSION, ...extra })\nconst clean = (v) => String(v || '').trim()\nconst UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i\n"
],
[
"}\n\nexport function buildCheckoutForm({ user, passes, interval, promotionCodeId = null, launch = false, consentAt, returnTo, customerId = null }) {\n  const ids = cleanPassIds(passes)\n  const pence = chargePence(ids, interval)\n",
"}\n\nexport function buildCheckoutForm({ user, passes, interval, promotionCodeId = null, launch = false, offerNote = '', consentAt, returnTo, customerId = null }) {\n  const ids = cleanPassIds(passes)\n  const pence = chargePence(ids, interval)\n"
],
[
"    consent_at: consentAt,\n  }\n  for (const [k, v] of Object.entries(metadata)) {\n    form.set(`metadata[${k}]`, v)\n",
"    consent_at: consentAt,\n  }\n  if (promotionCodeId && clean(offerNote)) metadata.offer_note = clean(offerNote).slice(0, 200)\n  for (const [k, v] of Object.entries(metadata)) {\n    form.set(`metadata[${k}]`, v)\n"
],
[
"\nasync function stripeCall(path, key, doFetch, init = {}) {\n  const response = await doFetch(`${STRIPE}${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init.headers || {}) }, signal: AbortSignal.timeout(15000) })\n  const body = await response.json().catch(() => null)\n  return { ok: response.ok, status: response.status, body }\n",
"\nasync function stripeCall(path, key, doFetch, init = {}) {\n  const response = await doFetch(`${STRIPE}${path}`, { ...init, headers: stripeHeaders(key, init.headers || {}), signal: AbortSignal.timeout(15000) })\n  const body = await response.json().catch(() => null)\n  return { ok: response.ok, status: response.status, body }\n"
],
[
"  }\n  if (clean(md.consent_at)) { row.consent_at = clean(md.consent_at); row.consent_text = clean(md.consent_text) || null }\n  return row\n}\n",
"  }\n  if (clean(md.consent_at)) { row.consent_at = clean(md.consent_at); row.consent_text = clean(md.consent_text) || null }\n  row.offer_note = clean(md.offer_note) || null\n  return row\n}\n\n// ---- The account pages: change passes, cancel and resume, the card on file, and the billing page ----\n\nconst productIdOf = (item) => (item && item.price && (typeof item.price.product === 'string' ? item.price.product : item.price.product && item.price.product.id)) || ''\n\n// The Stripe request that changes a subscription to a new set of passes. The change starts TODAY and the new price applies from the next payment:\n// nothing is charged or credited today (proration_behavior none). Whatever discount the member already has (a percentage coupon or promo code) carries on.\n// What was added and removed, and when the member agreed to any new passes opening now, is written on the subscription.\nexport function buildChangeForm({ subscription, passes, changedAt, added, removed, consentAt = '' }) {\n  const ids = cleanPassIds(passes)\n  const item = subscription && subscription.items && Array.isArray(subscription.items.data) ? subscription.items.data[0] : null\n  const interval = item && item.price && item.price.recurring && item.price.recurring.interval\n  const productId = productIdOf(item)\n  if (!item || !item.id || !productId || (interval !== 'month' && interval !== 'year') || ids.length === 0) throw new Error('that subscription cannot be changed')\n  const form = new URLSearchParams()\n  form.set('items[0][id]', item.id)\n  form.set('items[0][price_data][currency]', 'gbp')\n  form.set('items[0][price_data][product]', productId)\n  form.set('items[0][price_data][unit_amount]', String(chargePence(ids, interval)))\n  form.set('items[0][price_data][recurring][interval]', interval)\n  form.set('proration_behavior', 'none')\n  form.set('metadata[passes]', ids.join(','))\n  form.set('metadata[last_change_at]', changedAt)\n  form.set('metadata[last_change_added]', cleanPassIds(added).join(','))\n  form.set('metadata[last_change_removed]', cleanPassIds(removed).join(','))\n  if (clean(consentAt)) {\n    form.set('metadata[last_change_consent_at]', consentAt)\n    form.set('metadata[last_change_consent_text]', CONSENT_TEXT)\n  }\n  return form\n}\n\nexport async function updateSubscription(id, form, key, doFetch = fetch) {\n  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (!done.ok || !done.body) throw new Error(`stripe could not change the subscription (${done.status})`)\n  return done.body\n}\n\n// Cancel at the end of what has been paid for (true), or take that back (false). Nothing is refunded and nothing stops today.\nexport async function setCancelAtPeriodEnd(id, cancel, key, doFetch = fetch) {\n  const form = new URLSearchParams()\n  form.set('cancel_at_period_end', cancel ? 'true' : 'false')\n  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (!done.ok || !done.body) throw new Error(`stripe could not update the subscription (${done.status})`)\n  return done.body\n}\n\n// The card on file, as \"Visa ending 4242\", or null if Stripe cannot say\nexport async function cardOnFile(subscriptionId, customerId, key, doFetch = fetch) {\n  const pick = (pm) => (pm && typeof pm === 'object' && pm.card && /^\\d{4}$/.test(String(pm.card.last4)) ? { brand: String(pm.card.brand || 'card'), last4: String(pm.card.last4) } : null)\n  const sub = await stripeCall(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=default_payment_method`, key, doFetch)\n  if (sub.ok && sub.body && pick(sub.body.default_payment_method)) return pick(sub.body.default_payment_method)\n  if (!customerId) return null\n  const customer = await stripeCall(`/v1/customers/${encodeURIComponent(customerId)}?expand[]=invoice_settings.default_payment_method`, key, doFetch)\n  return customer.ok && customer.body && customer.body.invoice_settings ? pick(customer.body.invoice_settings.default_payment_method) : null\n}\n\n// Stripe's own page for changing a card, seeing receipts and cancelling. Throws an Error whose .code is 'portal_not_set_up' if it has not been switched on in Stripe yet.\nexport async function createPortalSession(customerId, returnUrl, key, doFetch = fetch) {\n  const form = new URLSearchParams()\n  form.set('customer', customerId)\n  form.set('return_url', returnUrl)\n  const made = await stripeCall('/v1/billing_portal/sessions', key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (!made.ok || !made.body || typeof made.body.url !== 'string') {\n    const message = String((made.body && made.body.error && made.body.error.message) || '')\n    const error = new Error(`stripe could not open the billing page (${made.status})`)\n    if (/configuration/i.test(message)) error.code = 'portal_not_set_up'\n    throw error\n  }\n  if (!/^https:\\/\\/billing\\.stripe\\.com\\//.test(made.body.url)) throw new Error('stripe gave an unexpected address')\n  return made.body.url\n}\n"
]
],
"src/App.jsx": [
[
"import MembershipPage from './membership/MembershipPage'\nimport WelcomePage from './membership/WelcomePage'\nimport TestersPage from './testers/TestersPage'\nimport Footer from './components/Footer'\n",
"import MembershipPage from './membership/MembershipPage'\nimport WelcomePage from './membership/WelcomePage'\nimport MyPassesPage from './membership/MyPassesPage'\nimport ChangePassesPage from './membership/ChangePassesPage'\nimport TestersPage from './testers/TestersPage'\nimport Footer from './components/Footer'\n"
],
[
"<Route path=\"/membership\" element={<MembershipPage owner={owner} session={session} />} />\n<Route path=\"/membership/welcome\" element={ <ProtectedRoute session={session}> <WelcomePage /> </ProtectedRoute> } />\n<Route path=\"/products\" element={<ProductGallery />} /> \n<Route path=\"/products/:id\" element={<ProductPage />} /> \n",
"<Route path=\"/membership\" element={<MembershipPage owner={owner} session={session} />} />\n<Route path=\"/membership/welcome\" element={ <ProtectedRoute session={session}> <WelcomePage /> </ProtectedRoute> } />\n<Route path=\"/membership/passes\" element={ <ProtectedRoute session={session}> <MyPassesPage owner={owner} /> </ProtectedRoute> } />\n<Route path=\"/membership/change\" element={ <ProtectedRoute session={session}> <ChangePassesPage owner={owner} /> </ProtectedRoute> } />\n<Route path=\"/products\" element={<ProductGallery />} /> \n<Route path=\"/products/:id\" element={<ProductPage />} /> \n"
]
],
"src/data/pageMeta.js": [
[
"  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/membership/welcome': { title: 'Welcome', description: 'Your passes are open.', image: 'site', index: false, client: true },\n  '/membership': { title: 'Choose your passes', description: 'Open the parts of the story you want with one pass or several.', image: 'site', index: false, client: true },\n",
"  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/membership/passes': { title: 'My passes', description: 'The passes you hold, and how to change or cancel them.', image: 'site', index: false, client: true },\n  '/membership/change': { title: 'Change my passes', description: 'Add or remove a pass whenever you like.', image: 'site', index: false, client: true },\n  '/membership/welcome': { title: 'Welcome', description: 'Your passes are open.', image: 'site', index: false, client: true },\n  '/membership': { title: 'Choose your passes', description: 'Open the parts of the story you want with one pass or several.', image: 'site', index: false, client: true },\n"
]
],
"src/components/Navbar.jsx": [
[
"import { pageIsReady } from '../data/staticPages'\nimport { roomPath } from '../data/roomImages'\nimport Logo from './Logo'\nimport RoomIcon from './RoomIcon'\n",
"import { pageIsReady } from '../data/staticPages'\nimport { roomPath } from '../data/roomImages'\nimport { MEMBERSHIP } from '../data/membership'\nimport Logo from './Logo'\nimport RoomIcon from './RoomIcon'\n"
],
[
"                  Log in\n                </Link>\n                <Link to=\"/signup\" className=\"sf-cta\">\n                  Subscribe\n                </Link>\n",
"                  Log in\n                </Link>\n                <Link to={MEMBERSHIP.open ? '/membership' : '/signup'} className=\"sf-cta\">\n                  Subscribe\n                </Link>\n"
],
[
"                  Log in\n                </Link>\n                <Link to=\"/signup\" className=\"sf-btn sf-btn--solid\" onClick={closeMenu}>\n                  Subscribe\n                </Link>\n",
"                  Log in\n                </Link>\n                <Link to={MEMBERSHIP.open ? '/membership' : '/signup'} className=\"sf-btn sf-btn--solid\" onClick={closeMenu}>\n                  Subscribe\n                </Link>\n"
]
],
"src/membership/MembershipPage.jsx": [
[
"}\n\nfunction NotOpen() {\n  return (\n    <main className=\"mb mb--closed\">\n",
"}\n\nexport function NotOpen() {\n  return (\n    <main className=\"mb mb--closed\">\n"
]
],
"src/membership/membership.css": [
[
".mb__wbtn:focus-visible {\n  outline: 3px solid var(--sf-blue, #1f6fa8);\n  outline-offset: 2px;\n}\n",
".mb__wbtn:focus-visible {\n  outline: 3px solid var(--sf-blue, #1f6fa8);\n  outline-offset: 2px;\n}\n\n/* My passes (Figma: 13 Membership, my passes), and the free member and cancelled views */\n.mb__sum {\n  display: grid;\n  gap: 8px;\n  justify-items: start;\n  margin: 0 0 24px;\n  padding: 20px;\n  border: 1.5px solid #9fb4e8;\n  border-radius: 14px;\n  background: var(--sf-star, #dce6ff);\n}\n.mb__sum p {\n  margin: 0;\n}\n.mb__sum--plain {\n  background: #fff;\n}\n.mb__wbtns {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n  margin-top: 8px;\n}\n.mb__wbtn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.mb__plist {\n  display: grid;\n  gap: 12px;\n  margin: 0 0 28px;\n  padding: 0;\n  list-style: none;\n}\n.mb__pass--static {\n  cursor: default;\n}\n.mb__pass--static.is-on .mb__box {\n  background: var(--sf-blue, #1f6fa8);\n  border-color: var(--sf-blue, #1f6fa8); /* an open pass has its box filled in, as on the other pages (there is no real checkbox here to do it) */\n}\n"
]
],
"src/membership/membershipApi.js": [
[
"// The signed-in person's own membership row (the database only ever shows them their own), or null if they have none.\nexport async function fetchMyMembership() {\n  const { data, error } = await supabase.from('memberships').select('status, passes, billing_interval, current_period_end, cancel_at_period_end, offer_ends_at').maybeSingle()\n  if (error) throw new Error(error.message || 'Could not read your passes.')\n  return data || null\n}\n",
"// The signed-in person's own membership row (the database only ever shows them their own), or null if they have none.\nexport async function fetchMyMembership() {\n  const { data, error } = await supabase.from('memberships').select('status, passes, billing_interval, current_period_end, cancel_at_period_end, offer_ends_at, offer_note').maybeSingle()\n  if (error) throw new Error(error.message || 'Could not read your passes.')\n  return data || null\n}\n\n// The card on file, for the My passes page: { brand, last4 } or null. It never throws (a missing card line must not stop the page).\nexport async function fetchAccount() {\n  const token = await signInToken()\n  try {\n    const res = await fetch('/api/membership-account', { cache: 'no-store', headers: authHeader(token) })\n    const body = await res.json()\n    const card = body && body.ok === true && body.card && /^\\d{4}$/.test(String(body.card.last4)) ? { brand: String(body.card.brand || 'card'), last4: String(body.card.last4) } : null\n    return { card }\n  } catch (e) {\n    return { card: null }\n  }\n}\n\nasync function accountAction(action, extra = {}) {\n  const token = await signInToken()\n  let res\n  try {\n    res = await fetch('/api/membership-account', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader(token) }, body: JSON.stringify({ action, ...extra }) })\n  } catch (e) {\n    throw new Error('We could not reach the site just now. Check your connection and try again.')\n  }\n  const body = await readJson(res)\n  if (!res.ok || !body || body.ok !== true) throw new Error((body && body.message) || 'We could not do that just now. Please try again in a moment.')\n  return body\n}\n\n// Stripe's own page for changing a card, seeing receipts and cancelling. Returns its address (only ever a Stripe address).\nexport async function openBillingPortal() {\n  const body = await accountAction('portal')\n  if (typeof body.url !== 'string' || !/^https:\\/\\/billing\\.stripe\\.com\\//.test(body.url)) throw new Error('We could not open that page just now. Please try again in a moment.')\n  return body.url\n}\n\n// Takes back a cancellation: passes that were going to end carry on.\nexport const resumePasses = () => accountAction('resume')\n\n// Changes which passes someone holds. Only the passes and the agreement (for any NEW pass) are sent: never a price.\nexport const changePasses = ({ passes, consent }) => accountAction('change', { passes, consent: consent === true })\n"
]
],
"sql/memberships.sql": [
[
"  consent_at timestamptz,\n  consent_text text,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n",
"  consent_at timestamptz,\n  consent_text text,\n  offer_note text,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n"
],
[
"alter table public.memberships add column if not exists consent_at timestamptz;\nalter table public.memberships add column if not exists consent_text text;\n\nalter table public.memberships enable row level security;\n",
"alter table public.memberships add column if not exists consent_at timestamptz;\nalter table public.memberships add column if not exists consent_text text;\n-- what a promo code gave this member (\"20% off for 3 months\"), so My passes can say so. Empty for the launch offer, which has its own date (offer_ends_at).\nalter table public.memberships add column if not exists offer_note text;\n\nalter table public.memberships enable row level security;\n"
]
]
}''')
NEW_FILES = ["api/membership-account.js", "src/membership/account.js", "src/membership/MyPassesPage.jsx", "src/membership/ChangePassesPage.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["api/membership-checkout.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the membership payment update first. These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-membership-account-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-membership-account').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
