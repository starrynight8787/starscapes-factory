#!/usr/bin/env python3
"""Adds the order confirmation email to the shop's server and Orders panel.

Run it from the project folder, AFTER unzipping starscapes-order-email-17oct.zip into it:   python3 tools/add-order-email.py

What it does: it makes small, exact edits to five files that already exist, so the customer's confirmation email is sent once when a new
order is recorded, real checkout stays closed until that email is ready, the Orders list reads whether the email went, the owner gets a
"Send confirmation email" button, and the Orders panel shows the result.
  api/stripe-webhook.js, api/checkout.js, api/orders.js, api/order-actions.js, src/artloft/OrdersPanel.jsx

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-order-email.
  - It is safe to run twice: a file already done is left alone.
  - The new files (lib/orderEmailText.js, lib/sendEmail.js, lib/orderConfirmation.js, sql/orders-confirmation.sql) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/checkout.js": [
[
"//   - trust a price, name or total sent from the browser\n//   - sell a print that is not published, or that has no Creative Hub id\n//   - take a LIVE payment unless ALLOW_LIVE_CHECKOUT is set to yes in Vercel. Do not set it until orders reach Creative Hub,\n//     or a real payment could be taken without an order being placed.\n//   - show or log the Stripe key\n//\n",
"//   - trust a price, name or total sent from the browser\n//   - sell a print that is not published, or that has no Creative Hub id\n//   - take a LIVE payment unless ALLOW_LIVE_CHECKOUT is set to yes in Vercel, AND the confirmation email is ready (see lib/orderConfirmation.js).\n//     (Do not set ALLOW_LIVE_CHECKOUT until orders reach Creative Hub, or a real payment could be taken without an order being placed.)\n//   - show or log the Stripe key\n//\n"
],
[
"import { LAUNCH_COUNTRIES } from '../src/cart/launchCountries.js'\nimport { requireOwner } from '../lib/ownerGuard.js'\n\nconst STRIPE = 'https://api.stripe.com'\n",
"import { LAUNCH_COUNTRIES } from '../src/cart/launchCountries.js'\nimport { requireOwner } from '../lib/ownerGuard.js'\nimport { confirmationProblems } from '../lib/orderConfirmation.js'\n\nconst STRIPE = 'https://api.stripe.com'\n"
],
[
"  if (mode === 'unknown') return say(res, 503, \"Checkout isn't set up correctly yet.\")\n  if (mode === 'live' && clean(process.env.ALLOW_LIVE_CHECKOUT) !== 'yes') return say(res, 503, 'Checkout is not open for real payments yet.')\n\n  let rows\n",
"  if (mode === 'unknown') return say(res, 503, \"Checkout isn't set up correctly yet.\")\n  if (mode === 'live' && clean(process.env.ALLOW_LIVE_CHECKOUT) !== 'yes') return say(res, 503, 'Checkout is not open for real payments yet.')\n  // A real payment must be able to get its confirmation email (the law requires one, and nothing can go in the parcel). So real\n  // payments stay closed until the Resend key is set AND the wording of that email has been approved.\n  if (mode === 'live' && confirmationProblems().length > 0) return say(res, 503, 'Checkout is not open for real payments yet.')\n\n  let rows\n"
]
],
"api/order-actions.js": [
[
"//   link     tell the shop \"this order IS that Creative Hub order\", once you have found it there\n//   send     send an order to Creative Hub (again)\n//\n// Rules this keeps:\n",
"//   link     tell the shop \"this order IS that Creative Hub order\", once you have found it there\n//   send     send an order to Creative Hub (again)\n//   resend_confirmation  send the customer's confirmation email again (only if it has not gone)\n//\n// Rules this keeps:\n"
],
[
"import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, getOrder, listOrders, summariseOrder, candidatesFor, isSafeOrderId, buildPayload } from '../lib/creativehubOrders.js'\nimport { patchOrder, claimOrder, placeAndRecord } from '../lib/orderFlow.js'\n\nexport const config = { maxDuration: 60 }\n",
"import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, getOrder, listOrders, summariseOrder, candidatesFor, isSafeOrderId, buildPayload } from '../lib/creativehubOrders.js'\nimport { patchOrder, claimOrder, placeAndRecord } from '../lib/orderFlow.js'\nimport { confirmOrder } from '../lib/orderConfirmation.js'\n\nexport const config = { maxDuration: 60 }\n"
],
[
"}\n\nconst ACTIONS = { refresh, check, link, send }\n\nexport default async function handler(req, res) {\n",
"}\n\n// ---------- resend the confirmation email ----------\n// Only an email that has NOT gone can be sent. The order is first CLAIMED (confirmation_status moved to \"sending\"), which only one\n// caller can win, so two clicks can never send two emails.\nconst NOT_YET_SENT = 'or=(confirmation_status.is.null,confirmation_status.in.(failed,not_sent))'\nasync function resendConfirmation(res, body) {\n  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')\n  const row = await loadOrder(body.id)\n  if (!row) return bad(res, 404, 'That order could not be found.')\n  if (!('confirmation_status' in row)) return bad(res, 409, 'The orders table does not have the confirmation columns yet. Run sql/orders-confirmation.sql in Supabase first.')\n  if (row.confirmation_status === 'sent') return bad(res, 409, 'The confirmation email for that order has already been sent.')\n  if (row.confirmation_status === 'sending') return bad(res, 409, 'That email is being sent right now. Give it a minute, then refresh the orders.')\n  const claim = await serviceFetch(`/rest/v1/orders?id=eq.${row.id}&${NOT_YET_SENT}`, {\n    method: 'PATCH',\n    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },\n    body: JSON.stringify({ confirmation_status: 'sending', confirmation_note: 'Sending the confirmation email…' }),\n  })\n  const won = claim.ok ? await claim.json().catch(() => []) : []\n  if (!Array.isArray(won) || won.length !== 1) return bad(res, 409, 'That order changed while you were doing this, so nothing was sent. Refresh the orders and look again.')\n  const result = await confirmOrder({ ...row, ...won[0] }, { match: `id=eq.${row.id}`, keySuffix: `-manual-${Date.now()}` })\n  if (result.status === 'sent') {\n    return res.status(200).json({ ok: true, outcome: 'sent', message: result.saved ? 'The confirmation email has been sent.' : 'The confirmation email was sent, but that could not be written down on the order.' })\n  }\n  return res.status(200).json({ ok: true, outcome: result.status, message: result.note || 'The email was not sent.' })\n}\n\nconst ACTIONS = { refresh, check, link, send, resend_confirmation: resendConfirmation }\n\nexport default async function handler(req, res) {\n"
]
],
"api/orders.js": [
[
"// Added later (sql/orders-creativehub.sql). If that has not been run yet, the list is read without them rather than not at all.\nconst EXTRA = 'creativehub_order_number,creativehub_due,creativehub_checked_at,sent_at'\n\nexport default async function handler(req, res) {\n",
"// Added later (sql/orders-creativehub.sql). If that has not been run yet, the list is read without them rather than not at all.\nconst EXTRA = 'creativehub_order_number,creativehub_due,creativehub_checked_at,sent_at'\n// Added later still (sql/orders-confirmation.sql): whether the customer's confirmation email went.\nconst CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'\n\nexport default async function handler(req, res) {\n"
],
[
"  try {\n    const read = (columns) => serviceFetch(`/rest/v1/orders?select=${columns}&order=created_at.desc&limit=50`, { headers: { Accept: 'application/json' } })\n    let response = await read(`${COLUMNS},${EXTRA}`)\n    if (response.status === 400) response = await read(COLUMNS)\n    if (response.status === 404) return res.status(200).json({ ok: false, message: 'The orders table has not been created yet. Run the orders SQL in Supabase first.' })\n",
"  try {\n    const read = (columns) => serviceFetch(`/rest/v1/orders?select=${columns}&order=created_at.desc&limit=50`, { headers: { Accept: 'application/json' } })\n    let response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION}`)\n    if (response.status === 400) response = await read(`${COLUMNS},${EXTRA}`)\n    if (response.status === 400) response = await read(COLUMNS)\n    if (response.status === 404) return res.status(200).json({ ok: false, message: 'The orders table has not been created yet. Run the orders SQL in Supabase first.' })\n"
]
],
"api/stripe-webhook.js": [
[
"//   - A REAL payment that cannot be ordered (an item that cannot be matched, an incomplete address, no Creative Hub key) is\n//     recorded as \"needs attention\" with the reason, so it can never go unnoticed.\n//   - If something temporary goes wrong BEFORE the order is saved (Stripe or the database cannot be reached), it answers with an\n//     error so Stripe sends the message again later. It never throws a paid order away.\n",
"//   - A REAL payment that cannot be ordered (an item that cannot be matched, an incomplete address, no Creative Hub key) is\n//     recorded as \"needs attention\" with the reason, so it can never go unnoticed.\n//   - The customer's confirmation email (which the law requires) is sent ONCE, for a new order only, right after it is saved. A problem\n//     with it never stops the order being placed: it is written on the order, and the owner has a button to send it again.\n//   - If something temporary goes wrong BEFORE the order is saved (Stripe or the database cannot be reached), it answers with an\n//     error so Stripe sends the message again later. It never throws a paid order away.\n"
],
[
"import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, buildPayload } from '../lib/creativehubOrders.js'\nimport { placeAndRecord } from '../lib/orderFlow.js'\n\n// Stripe signs the exact bytes it sends, so the body must reach us untouched. This uses the standard web request form\n",
"import { creativehubSettings, settingsUsable, SETTINGS_PROBLEM, buildPayload } from '../lib/creativehubOrders.js'\nimport { placeAndRecord } from '../lib/orderFlow.js'\nimport { confirmOrder } from '../lib/orderConfirmation.js'\n\n// Stripe signs the exact bytes it sends, so the body must reach us untouched. This uses the standard web request form\n"
],
[
"    //    there, it does nothing, so one payment can never become two orders at Creative Hub.\n    const outcome = await saveOrder(order)\n    if (outcome === 'duplicate' || order.status !== 'sending') return reply(200, { ok: true, order: outcome })\n\n",
"    //    there, it does nothing, so one payment can never become two orders at Creative Hub.\n    const outcome = await saveOrder(order)\n    // The confirmation email: once, for a NEW order only (a repeat of this message finds the order already saved and stops just below).\n    // It never throws and never holds up the Creative Hub order.\n    if (outcome === 'saved') {\n      try {\n        await confirmOrder(order)\n      } catch (e) {\n        // It should never throw. But if it somehow did, answering with an error would make Stripe send this again, the repeat would find the\n        // order already saved and stop, and the order would never reach Creative Hub. So nothing here is allowed to get in the way.\n      }\n    }\n    if (outcome === 'duplicate' || order.status !== 'sending') return reply(200, { ok: true, order: outcome })\n\n"
]
],
"src/artloft/OrdersPanel.jsx": [
[
"  paid: 'Paid',\n}\n// An order still \"sending\" after this long is no longer in flight: its answer was lost\nconst STUCK_MS = 5 * 60 * 1000\n",
"  paid: 'Paid',\n}\n// Whether the customer's confirmation email went (added with sql/orders-confirmation.sql)\nconst CONFIRMATION = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT', sending: 'being sent…' }\n// An order still \"sending\" after this long is no longer in flight: its answer was lost\nconst STUCK_MS = 5 * 60 * 1000\n"
],
[
"  const busy = state.phase === 'working' || working\n  const anySent = state.orders.some((o) => o.status === 'sent' && o.creativehub_order_id)\n\n  function actions(o) {\n",
"  const busy = state.phase === 'working' || working\n  const anySent = state.orders.some((o) => o.status === 'sent' && o.creativehub_order_id)\n\n  // The button for an email that has not gone. It only shows once the status has been recorded, and never for one already sent.\n  function confirmationButton(o) {\n    if (!o.customer_email || !['failed', 'not_sent'].includes(o.confirmation_status)) return null\n    return (\n      <button type=\"button\" disabled={busy} onClick={() => act('resend_confirmation', { id: o.id })} aria-label={`Send the confirmation email to ${o.customer_name || 'this customer'}`}>\n        Send confirmation email\n      </button>\n    )\n  }\n\n  function actions(o) {\n"
],
[
"                      {isStuck(o) && <><br /><small>This order was never marked as sent and its answer was lost. It may or may not be at Creative Hub.</small></>}\n                      {o.note && !isStuck(o) && <><br /><small>{o.note}</small></>}\n                    </td>\n                    <td>{actions(o)}</td>\n                  </tr>\n                )\n",
"                      {isStuck(o) && <><br /><small>This order was never marked as sent and its answer was lost. It may or may not be at Creative Hub.</small></>}\n                      {o.note && !isStuck(o) && <><br /><small>{o.note}</small></>}\n                      {o.confirmation_status && (\n                        <><br /><small>Confirmation email: <strong>{CONFIRMATION[o.confirmation_status] || o.confirmation_status}</strong>{o.confirmation_note && o.confirmation_status !== 'sent' ? `. ${o.confirmation_note}` : ''}</small></>\n                      )}\n                    </td>\n                    <td>{actions(o)}{confirmationButton(o)}</td>\n                  </tr>\n                )\n"
]
]
}''')
NEW_FILES = ['lib/orderEmailText.js', 'lib/sendEmail.js', 'lib/orderConfirmation.js', 'sql/orders-confirmation.sql']

root = pathlib.Path('.')
if not (root / 'api').exists() or not (root / 'src').exists():
    print('NOT FOUND  api or src (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-order-email-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    olds = [text.count(old) == 1 for old, new in pairs]
    news = [new in text for old, new in pairs]
    if all(news) and not any(olds):
        done.append(rel)
    elif all(olds):
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
    pathlib.Path(str(p) + '.before-order-email').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
