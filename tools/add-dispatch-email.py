#!/usr/bin/env python3
"""Adds the "your order has been posted" email to the shop's server and Orders panel.

Run it from the project folder, AFTER unzipping starscapes-dispatch-email-17oct.zip into it:   python3 tools/add-dispatch-email.py

It needs the order confirmation email installed first (that update added the files this one builds on).

What it does: it makes small, exact edits to three files that already exist, so the Orders list reads whether the posted email went, the owner
gets a "Send posted email" button (with an optional tracking link and number), and the Orders panel shows the result.
  api/orders.js, api/order-actions.js, src/artloft/OrdersPanel.jsx

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-dispatch-email.
  - It is safe to run twice: a file already done is left alone.
  - The new files (lib/dispatchEmailText.js, lib/dispatchEmail.js, sql/orders-dispatch.sql) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/order-actions.js": [
[
"//   send     send an order to Creative Hub (again)\n//   resend_confirmation  send the customer's confirmation email again (only if it has not gone)\n//\n// Rules this keeps:\n",
"//   send     send an order to Creative Hub (again)\n//   resend_confirmation  send the customer's confirmation email again (only if it has not gone)\n//   send_dispatch        send the customer the \"your order has been posted\" email, with a tracking link or number if you give one\n//\n// Rules this keeps:\n"
],
[
"import { patchOrder, claimOrder, placeAndRecord } from '../lib/orderFlow.js'\nimport { confirmOrder } from '../lib/orderConfirmation.js'\n\nexport const config = { maxDuration: 60 }\n",
"import { patchOrder, claimOrder, placeAndRecord } from '../lib/orderFlow.js'\nimport { confirmOrder } from '../lib/orderConfirmation.js'\nimport { dispatchOrder } from '../lib/dispatchEmail.js'\nimport { cleanTracking } from '../lib/dispatchEmailText.js'\n\nexport const config = { maxDuration: 60 }\n"
],
[
"}\n\nconst ACTIONS = { refresh, check, link, send, resend_confirmation: resendConfirmation }\n\nexport default async function handler(req, res) {\n",
"}\n\n// ---------- the \"your order has been posted\" email ----------\n// Only the owner can send it, only once an order really is with Creative Hub (or is a test order), and only an email that has NOT gone can be\n// sent. The order is first CLAIMED (dispatch_status moved to \"sending\"), which only one caller can win, so two clicks can never send two emails.\nconst DISPATCH_NOT_YET = 'or=(dispatch_status.is.null,dispatch_status.in.(failed,not_sent))'\nasync function sendDispatch(res, body) {\n  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')\n  const tracking = cleanTracking({ url: body.tracking_url, number: body.tracking_number })\n  if (!tracking.ok) return bad(res, 400, tracking.message)\n  const row = await loadOrder(body.id)\n  if (!row) return bad(res, 404, 'That order could not be found.')\n  if (!('dispatch_status' in row)) return bad(res, 409, 'The orders table does not have the dispatch columns yet. Run sql/orders-dispatch.sql in Supabase first.')\n  if (row.livemode && row.status !== 'sent') return bad(res, 409, 'That order has not been sent to Creative Hub, so it cannot have been posted. A posted email would be wrong.')\n  if (row.dispatch_status === 'sent') return bad(res, 409, 'The posted email for that order has already been sent.')\n  if (row.dispatch_status === 'sending') return bad(res, 409, 'That email is being sent right now. Give it a minute, then refresh the orders.')\n  const claim = await serviceFetch(`/rest/v1/orders?id=eq.${row.id}&${DISPATCH_NOT_YET}`, {\n    method: 'PATCH',\n    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },\n    body: JSON.stringify({ dispatch_status: 'sending', dispatch_note: 'Sending the posted email…' }),\n  })\n  const won = claim.ok ? await claim.json().catch(() => []) : []\n  if (!Array.isArray(won) || won.length !== 1) return bad(res, 409, 'That order changed while you were doing this, so nothing was sent. Refresh the orders and look again.')\n  const result = await dispatchOrder({ ...row, ...won[0] }, tracking, { match: `id=eq.${row.id}`, keySuffix: `-manual-${Date.now()}` })\n  if (result.status === 'sent') {\n    return res.status(200).json({ ok: true, outcome: 'sent', message: result.saved ? 'The posted email has been sent.' : 'The posted email was sent, but that could not be written down on the order.' })\n  }\n  return res.status(200).json({ ok: true, outcome: result.status, message: result.note || 'The email was not sent.' })\n}\n\nconst ACTIONS = { refresh, check, link, send, resend_confirmation: resendConfirmation, send_dispatch: sendDispatch }\n\nexport default async function handler(req, res) {\n"
]
],
"api/orders.js": [
[
"// Added later still (sql/orders-confirmation.sql): whether the customer's confirmation email went.\nconst CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'\n\nexport default async function handler(req, res) {\n",
"// Added later still (sql/orders-confirmation.sql): whether the customer's confirmation email went.\nconst CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'\n// And the \"your order has been posted\" email (sql/orders-dispatch.sql).\nconst DISPATCH = 'dispatch_status,dispatch_note,dispatch_sent_at,tracking_url,tracking_number'\n\nexport default async function handler(req, res) {\n"
],
[
"  try {\n    const read = (columns) => serviceFetch(`/rest/v1/orders?select=${columns}&order=created_at.desc&limit=50`, { headers: { Accept: 'application/json' } })\n    let response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION}`)\n    if (response.status === 400) response = await read(`${COLUMNS},${EXTRA}`)\n    if (response.status === 400) response = await read(COLUMNS)\n",
"  try {\n    const read = (columns) => serviceFetch(`/rest/v1/orders?select=${columns}&order=created_at.desc&limit=50`, { headers: { Accept: 'application/json' } })\n    let response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION},${DISPATCH}`)\n    if (response.status === 400) response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION}`)\n    if (response.status === 400) response = await read(`${COLUMNS},${EXTRA}`)\n    if (response.status === 400) response = await read(COLUMNS)\n"
]
],
"src/artloft/OrdersPanel.jsx": [
[
"// Whether the customer's confirmation email went (added with sql/orders-confirmation.sql)\nconst CONFIRMATION = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT', sending: 'being sent…' }\n// An order still \"sending\" after this long is no longer in flight: its answer was lost\nconst STUCK_MS = 5 * 60 * 1000\n",
"// Whether the customer's confirmation email went (added with sql/orders-confirmation.sql)\nconst CONFIRMATION = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT', sending: 'being sent…' }\n// Whether the \"your order has been posted\" email went (added with sql/orders-dispatch.sql)\nconst DISPATCH = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT', sending: 'being sent…' }\n// An order still \"sending\" after this long is no longer in flight: its answer was lost\nconst STUCK_MS = 5 * 60 * 1000\n"
],
[
"  const [working, setWorking] = useState(false)\n  const [confirming, setConfirming] = useState(null) // the id of the order waiting for a \"Yes, send it\"\n  const [looked, setLooked] = useState({}) // an order's id -> what the look through Creative Hub's orders found\n\n",
"  const [working, setWorking] = useState(false)\n  const [confirming, setConfirming] = useState(null) // the id of the order waiting for a \"Yes, send it\"\n  const [dispatching, setDispatching] = useState(null) // the id of the order whose posted email is being filled in\n  const [track, setTrack] = useState({ url: '', number: '' }) // what was typed for it\n  const [looked, setLooked] = useState({}) // an order's id -> what the look through Creative Hub's orders found\n\n"
],
[
"    setWorking(true)\n    setConfirming(null)\n    setFlash('Working…')\n    try {\n",
"    setWorking(true)\n    setConfirming(null)\n    setDispatching(null)\n    setFlash('Working…')\n    try {\n"
],
[
"        Send confirmation email\n      </button>\n    )\n  }\n",
"        Send confirmation email\n      </button>\n    )\n  }\n\n  // The \"your order has been posted\" email: for an order really with Creative Hub (or a test order) that has not had it yet. The owner can add\n  // a tracking link and/or number; both are optional, and the email never mentions tracking unless one is given.\n  function dispatchControl(o) {\n    if (!o.customer_email || !('dispatch_status' in o) || o.dispatch_status === 'sent' || o.dispatch_status === 'sending') return null\n    if (o.livemode && o.status !== 'sent') return null\n    const who = o.customer_name || 'this customer'\n    if (dispatching !== o.id) {\n      return (\n        <button type=\"button\" disabled={busy} onClick={() => { setDispatching(o.id); setTrack({ url: '', number: '' }) }} aria-label={`Send the posted email to ${who}`}>\n          Send posted email\n        </button>\n      )\n    }\n    return (\n      <span className=\"al-tools__confirm\">\n        <label>Tracking link (optional) <input type=\"url\" value={track.url} onChange={(e) => setTrack((t) => ({ ...t, url: e.target.value }))} placeholder=\"https://\" /></label>{' '}\n        <label>Tracking number (optional) <input type=\"text\" value={track.number} onChange={(e) => setTrack((t) => ({ ...t, number: e.target.value }))} /></label>{' '}\n        <button type=\"button\" disabled={busy} onClick={() => act('send_dispatch', { id: o.id, tracking_url: track.url, tracking_number: track.number })}>Send it now</button>{' '}\n        <button type=\"button\" disabled={busy} onClick={() => setDispatching(null)}>Cancel</button>\n      </span>\n    )\n  }\n"
],
[
"                        <><br /><small>Confirmation email: <strong>{CONFIRMATION[o.confirmation_status] || o.confirmation_status}</strong>{o.confirmation_note && o.confirmation_status !== 'sent' ? `. ${o.confirmation_note}` : ''}</small></>\n                      )}\n                    </td>\n                    <td>{actions(o)}{confirmationButton(o)}</td>\n                  </tr>\n                )\n",
"                        <><br /><small>Confirmation email: <strong>{CONFIRMATION[o.confirmation_status] || o.confirmation_status}</strong>{o.confirmation_note && o.confirmation_status !== 'sent' ? `. ${o.confirmation_note}` : ''}</small></>\n                      )}\n                      {o.dispatch_status && (\n                        <><br /><small>Posted email: <strong>{DISPATCH[o.dispatch_status] || o.dispatch_status}</strong>{o.dispatch_note && o.dispatch_status !== 'sent' ? `. ${o.dispatch_note}` : ''}{o.dispatch_status === 'sent' && o.tracking_number ? `. Tracking number ${o.tracking_number}` : ''}</small></>\n                      )}\n                    </td>\n                    <td>{actions(o)}{confirmationButton(o)}{dispatchControl(o)}</td>\n                  </tr>\n                )\n"
]
]
}''')
NEW_FILES = ['lib/dispatchEmailText.js', 'lib/dispatchEmail.js', 'sql/orders-dispatch.sql']
NEEDS_FIRST = ['lib/orderConfirmation.js', 'lib/sendEmail.js', 'lib/orderEmailText.js']

root = pathlib.Path('.')
if not (root / 'api').exists() or not (root / 'src').exists():
    print('NOT FOUND  api or src (run this from the project folder)')
    sys.exit(1)
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the order confirmation email first (starscapes-order-email-17oct.zip). These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-dispatch-email-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    states = ['done' if new in text else 'todo' if text.count(old) == 1 else 'bad' for old, new in pairs]
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
    pathlib.Path(str(p) + '.before-dispatch-email').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
