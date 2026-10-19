#!/usr/bin/env python3
"""Fixes Change my passes (Stripe refused to price a change under an inactive product), and writes the real reason for any membership failure to Vercel's Logs.

Run it from the project folder, AFTER unzipping starscapes-change-fix-19oct.zip into it:   python3 tools/fix-change-passes.py

What it does: it makes exact edits to five files that already exist (the Stripe helpers, the account code, the membership checkout and webhook functions, and the health check).
  lib/membershipStripe.js, lib/membershipAccount.js, api/membership-checkout.js, api/membership-webhook.js, tools/health-check.mjs

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-change-passes.
  - It is safe to run twice: a file already done is left alone.
  - The new files () come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"lib/membershipStripe.js": [
[
"}\n\nasync function stripeCall(path, key, doFetch, init = {}) {\n  const response = await doFetch(`${STRIPE}${path}`, { ...init, headers: stripeHeaders(key, init.headers || {}), signal: AbortSignal.timeout(15000) })\n",
"}\n\n// What Stripe said was wrong, as an Error whose words are safe to write in a log (never a key). Used for the log, never shown to a customer.\nexport const safeReason = (e) => String((e && e.message) || e || '').replace(/[A-Za-z0-9._-]{30,}/g, '…').slice(0, 300)\nexport function logProblem(where, e) {\n  console.error(`[membership] ${where}: ${safeReason(e)}`)\n}\nfunction stripeFailure(what, result) {\n  const why = String((result.body && result.body.error && result.body.error.message) || '').trim()\n  return new Error(`stripe could not ${what} (${result.status})${why ? `: ${why}` : ''}`)\n}\n\nasync function stripeCall(path, key, doFetch, init = {}) {\n  const response = await doFetch(`${STRIPE}${path}`, { ...init, headers: stripeHeaders(key, init.headers || {}), signal: AbortSignal.timeout(15000) })\n"
],
[
"  const code = made.body && made.body.error && made.body.error.code\n  if (code === 'resource_already_exists') return id\n  throw new Error(`stripe could not make the launch coupon (${made.status})`)\n}\n\n",
"  const code = made.body && made.body.error && made.body.error.code\n  if (code === 'resource_already_exists') return id\n  throw stripeFailure('make the launch coupon', made)\n}\n\n"
],
[
"  if (!/^[A-Za-z0-9_-]{2,40}$/.test(text)) return null\n  const found = await stripeCall(`/v1/promotion_codes?code=${encodeURIComponent(text)}&active=true&limit=1&expand[]=data.coupon`, key, doFetch)\n  if (!found.ok) throw new Error(`stripe could not look the code up (${found.status})`)\n  const item = found.body && Array.isArray(found.body.data) ? found.body.data[0] : null\n  if (!item || typeof item.id !== 'string') return null\n",
"  if (!/^[A-Za-z0-9_-]{2,40}$/.test(text)) return null\n  const found = await stripeCall(`/v1/promotion_codes?code=${encodeURIComponent(text)}&active=true&limit=1&expand[]=data.coupon`, key, doFetch)\n  if (!found.ok) throw stripeFailure('look the code up', found)\n  const item = found.body && Array.isArray(found.body.data) ? found.body.data[0] : null\n  if (!item || typeof item.id !== 'string') return null\n"
],
[
"export async function fetchSubscription(id, key, doFetch = fetch) {\n  const got = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch)\n  if (!got.ok || !got.body) throw new Error(`stripe answered ${got.status}`)\n  return got.body\n}\n",
"export async function fetchSubscription(id, key, doFetch = fetch) {\n  const got = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch)\n  if (!got.ok || !got.body) throw stripeFailure('read the subscription', got)\n  return got.body\n}\n"
],
[
"// ---- The account pages: change passes, cancel and resume, the card on file, and the billing page ----\n\nconst productIdOf = (item) => (item && item.price && (typeof item.price.product === 'string' ? item.price.product : item.price.product && item.price.product.id)) || ''\n\n// The Stripe request that changes a subscription to a new set of passes. The change starts TODAY and the new price applies from the next payment:\n// nothing is charged or credited today (proration_behavior none). Whatever discount the member already has (a percentage coupon or promo code) carries on.\n// What was added and removed, and when the member agreed to any new passes opening now, is written on the subscription.\nexport function buildChangeForm({ subscription, passes, changedAt, added, removed, consentAt = '' }) {\n  const ids = cleanPassIds(passes)\n  const item = subscription && subscription.items && Array.isArray(subscription.items.data) ? subscription.items.data[0] : null\n  const interval = item && item.price && item.price.recurring && item.price.recurring.interval\n  const productId = productIdOf(item)\n  if (!item || !item.id || !productId || (interval !== 'month' && interval !== 'year') || ids.length === 0) throw new Error('that subscription cannot be changed')\n  const form = new URLSearchParams()\n  form.set('items[0][id]', item.id)\n",
"// ---- The account pages: change passes, cancel and resume, the card on file, and the billing page ----\n\n// A change needs a product that is ACTIVE. The product that a checkout makes on the spot is filed by Stripe as inactive, and Stripe refuses to start a new price on an inactive product\n// (\"The product ... is marked as inactive\"). So changes use ONE product of our own, made once (with a fixed id) and reused every time.\nexport const PRODUCT_ID = 'starscapes-passes'\nexport async function ensureProduct(key, doFetch = fetch) {\n  const form = new URLSearchParams()\n  form.set('id', PRODUCT_ID)\n  form.set('name', 'Starscapes Factory passes')\n  form.set('active', 'true')\n  const made = await stripeCall('/v1/products', key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (made.ok) return PRODUCT_ID\n  if (made.body && made.body.error && made.body.error.code === 'resource_already_exists') return PRODUCT_ID\n  throw stripeFailure('make the passes product', made)\n}\n\n// The Stripe request that changes a subscription to a new set of passes. The change starts TODAY and the new price applies from the next payment:\n// nothing is charged or credited today (proration_behavior none). Whatever discount the member already has (a percentage coupon or promo code) carries on.\n// What was added and removed, and when the member agreed to any new passes opening now, is written on the subscription.\nexport function buildChangeForm({ subscription, passes, changedAt, added, removed, consentAt = '', productId }) {\n  const ids = cleanPassIds(passes)\n  const item = subscription && subscription.items && Array.isArray(subscription.items.data) ? subscription.items.data[0] : null\n  const interval = item && item.price && item.price.recurring && item.price.recurring.interval\n  if (!item || !item.id || !clean(productId) || (interval !== 'month' && interval !== 'year') || ids.length === 0) throw new Error('that subscription cannot be changed')\n  const form = new URLSearchParams()\n  form.set('items[0][id]', item.id)\n"
],
[
"export async function updateSubscription(id, form, key, doFetch = fetch) {\n  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (!done.ok || !done.body) throw new Error(`stripe could not change the subscription (${done.status})`)\n  return done.body\n}\n",
"export async function updateSubscription(id, form, key, doFetch = fetch) {\n  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (!done.ok || !done.body) throw stripeFailure('change the subscription', done)\n  return done.body\n}\n"
],
[
"  form.set('cancel_at_period_end', cancel ? 'true' : 'false')\n  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (!done.ok || !done.body) throw new Error(`stripe could not update the subscription (${done.status})`)\n  return done.body\n}\n",
"  form.set('cancel_at_period_end', cancel ? 'true' : 'false')\n  const done = await stripeCall(`/v1/subscriptions/${encodeURIComponent(id)}`, key, doFetch, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })\n  if (!done.ok || !done.body) throw stripeFailure('update the subscription', done)\n  return done.body\n}\n"
],
[
"  if (!made.ok || !made.body || typeof made.body.url !== 'string') {\n    const message = String((made.body && made.body.error && made.body.error.message) || '')\n    const error = new Error(`stripe could not open the billing page (${made.status})`)\n    if (/configuration/i.test(message)) error.code = 'portal_not_set_up'\n    throw error\n",
"  if (!made.ok || !made.body || typeof made.body.url !== 'string') {\n    const message = String((made.body && made.body.error && made.body.error.message) || '')\n    const error = stripeFailure('open the billing page', made)\n    if (/configuration/i.test(message)) error.code = 'portal_not_set_up'\n    throw error\n"
]
],
"lib/membershipAccount.js": [
[
"import { serviceFetch } from './serviceKey.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\nimport { stripeMode, fetchSubscription, buildChangeForm, updateSubscription, setCancelAtPeriodEnd, cardOnFile, createPortalSession, membershipRowFromSubscription } from './membershipStripe.js'\nimport { saveMembership } from '../api/membership-webhook.js'\n\n",
"import { serviceFetch } from './serviceKey.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\nimport { stripeMode, ensureProduct, logProblem, fetchSubscription, buildChangeForm, updateSubscription, setCancelAtPeriodEnd, cardOnFile, createPortalSession, membershipRowFromSubscription } from './membershipStripe.js'\nimport { saveMembership } from '../api/membership-webhook.js'\n\n"
],
[
"    row = await myMembership(who.user.id)\n  } catch (e) {\n    return say(res, 502, \"We couldn't check your account just now. Please try again in a moment.\")\n  }\n",
"    row = await myMembership(who.user.id)\n  } catch (e) {\n    logProblem('reading the membership row', e)\n    return say(res, 502, \"We couldn't check your account just now. Please try again in a moment.\")\n  }\n"
],
[
"      const now = new Date().toISOString()\n      const subscription = await fetchSubscription(row.stripe_subscription_id, k.key)\n      const form = buildChangeForm({ subscription, passes: wanted, changedAt: now, added, removed, consentAt: added.length > 0 ? now : '' })\n      const updated = await updateSubscription(row.stripe_subscription_id, form, k.key)\n      const fresh = membershipRowFromSubscription(updated)\n",
"      const now = new Date().toISOString()\n      const subscription = await fetchSubscription(row.stripe_subscription_id, k.key)\n      const productId = await ensureProduct(k.key)\n      const form = buildChangeForm({ subscription, passes: wanted, changedAt: now, added, removed, consentAt: added.length > 0 ? now : '', productId })\n      const updated = await updateSubscription(row.stripe_subscription_id, form, k.key)\n      const fresh = membershipRowFromSubscription(updated)\n"
],
[
"    return say(res, 400, 'That did not look right. Please try again.')\n  } catch (e) {\n    return say(res, 502, \"We couldn't do that just now. Please try again in a moment.\")\n  }\n",
"    return say(res, 400, 'That did not look right. Please try again.')\n  } catch (e) {\n    logProblem(`account action ${clean(body.action)}`, e)\n    return say(res, 502, \"We couldn't do that just now. Please try again in a moment.\")\n  }\n"
]
],
"api/membership-checkout.js": [
[
"import { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'\nimport { STRIPE, stripeMode, stripeHeaders, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n",
"import { LAUNCH_OFFER } from '../src/membership/pricing.js'\nimport { handleAccount, isAccountRequest } from '../lib/membershipAccount.js'\nimport { STRIPE, stripeMode, stripeHeaders, logProblem, buildCheckoutForm, ensureLaunchCoupon, findPromotionCode } from '../lib/membershipStripe.js'\n\nconst SITE = 'https://starscapesfactory.com'\n"
],
[
"      return res.status(200).json({ ok: true, summary: found.summary })\n    } catch (e) {\n      return say(res, 502, \"We couldn't check that code just now. Please try again in a moment.\")\n    }\n",
"      return res.status(200).json({ ok: true, summary: found.summary })\n    } catch (e) {\n      logProblem('checking a promo code', e)\n      return say(res, 502, \"We couldn't check that code just now. Please try again in a moment.\")\n    }\n"
],
[
"    existing = await currentMembership(who.user.id)\n  } catch (e) {\n    return say(res, 502, \"We couldn't check your account just now. Please try again in a moment.\")\n  }\n",
"    existing = await currentMembership(who.user.id)\n  } catch (e) {\n    logProblem('reading the membership row', e)\n    return say(res, 502, \"We couldn't check your account just now. Please try again in a moment.\")\n  }\n"
],
[
"    })\n    const data = await response.json().catch(() => null)\n    if (!response.ok || !data || typeof data.url !== 'string') return say(res, 502, \"We couldn't start the payment just now. Please try again in a moment.\")\n    return res.status(200).json({ ok: true, url: data.url, mode: k.mode })\n  } catch (e) {\n    return say(res, 502, \"We couldn't start the payment just now. Please try again in a moment.\")\n  }\n",
"    })\n    const data = await response.json().catch(() => null)\n    if (!response.ok || !data || typeof data.url !== 'string') {\n      logProblem('starting a payment', new Error(`stripe answered ${response.status}${data && data.error && data.error.message ? `: ${data.error.message}` : ''}`))\n      return say(res, 502, \"We couldn't start the payment just now. Please try again in a moment.\")\n    }\n    return res.status(200).json({ ok: true, url: data.url, mode: k.mode })\n  } catch (e) {\n    logProblem('starting a payment', e)\n    return say(res, 502, \"We couldn't start the payment just now. Please try again in a moment.\")\n  }\n"
]
],
"api/membership-webhook.js": [
[
"import { signatureIsGood } from './stripe-webhook.js'\nimport { serviceFetch } from '../lib/serviceKey.js'\nimport { fetchSubscription, membershipRowFromSubscription, stripeMode } from '../lib/membershipStripe.js'\n\nexport const config = { maxDuration: 30 }\n",
"import { signatureIsGood } from './stripe-webhook.js'\nimport { serviceFetch } from '../lib/serviceKey.js'\nimport { fetchSubscription, membershipRowFromSubscription, stripeMode, logProblem } from '../lib/membershipStripe.js'\n\nexport const config = { maxDuration: 30 }\n"
],
[
"    return reply(200, { ok: true, membership: row.status })\n  } catch (e) {\n    return reply(500, { ok: false, message: 'Could not record the membership just now. Stripe will send it again.', detail: String((e && e.message) || '').slice(0, 120) })\n  }\n",
"    return reply(200, { ok: true, membership: row.status })\n  } catch (e) {\n    logProblem(`recording a membership (${event.type})`, e)\n    return reply(500, { ok: false, message: 'Could not record the membership just now. Stripe will send it again.', detail: String((e && e.message) || '').slice(0, 120) })\n  }\n"
]
],
"tools/health-check.mjs": [
[
"  ['Membership: the Stripe version is pinned', 'lib/membershipStripe.js', /STRIPE_VERSION/, 'the account pages update (the add-membership-account script)'],\n  ['Membership: the Subscribe button goes to the passes page', 'src/components/Navbar.jsx', /MEMBERSHIP\\.open/, 'the account pages update (the add-membership-account script)'],\n]\n\n",
"  ['Membership: the Stripe version is pinned', 'lib/membershipStripe.js', /STRIPE_VERSION/, 'the account pages update (the add-membership-account script)'],\n  ['Membership: the Subscribe button goes to the passes page', 'src/components/Navbar.jsx', /MEMBERSHIP\\.open/, 'the account pages update (the add-membership-account script)'],\n  ['Membership: changes are priced under an active product', 'lib/membershipStripe.js', /PRODUCT_ID/, 'the change fix (the fix-change-passes script)'],\n  ['Membership: failures are written to the log', 'lib/membershipStripe.js', /logProblem/, 'the change fix (the fix-change-passes script)'],\n]\n\n"
]
]
}''')
NEW_FILES = []

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-change-fix-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-change-passes').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
