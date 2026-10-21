#!/usr/bin/env python3
"""Lets a TEST order be practised on (cancel and refund, in Stripe's test mode), and adds two buttons on a test order that send you a sample of each new customer email. Real orders are untouched. It needs the order alerts package first.

Run it from the project folder, AFTER unzipping starscapes-practice-route-21oct.zip into it:   python3 tools/add-practice-route.py

What it does: it makes exact edits to 5 files and, only if all succeed, puts 2 new tests in place.
  api/order-actions.js, src/artloft/OrdersPanel.jsx, test/order-actions-hold-refund.test.js, test/orders-panel-cards.test.jsx, test/orders-panel-hold-refund.test.jsx

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-practice-route.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-PRACTICE-ROUTE.txt, tools/practice-route-files/order-actions-practice.test.js.staged, tools/practice-route-files/orders-panel-practice.test.jsx.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/order-actions.js": [
[
"//   sending_state  whether real payments go to Creative Hub by themselves, and whether the customer emails are ready\n//   resend_confirmation  send the customer's confirmation email again (only if it has not gone)\n",
"//   sending_state  whether real payments go to Creative Hub by themselves, and whether the customer emails are ready\n//   send_sample    for a TEST order only: send the owner a sample of a short customer email (with its TEST banner), so she can read the wording before approving it\n//   (mark_refunded can also be PRACTISED on a TEST order, so a tester can rehearse the refund journey: no money was taken and nothing goes near Creative Hub)\n//   resend_confirmation  send the customer's confirmation email again (only if it has not gone)\n"
],
[
"  if (!row) return bad(res, 404, 'That order could not be found.')\n  if (!row.livemode) return bad(res, 409, 'That is a test payment: no money was taken, so there is nothing to refund.')\n  if (row.status === 'refunded') return bad(res, 409, 'That order has already been cancelled and marked as refunded.')\n  if (row.creativehub_order_id || row.status === 'sent') return bad(res, 409, 'That order is already with Creative Hub, so it cannot be cancelled here. Ask Creative Hub to cancel it before printing starts, and only then refund it.')\n  const stillSending = row.status === 'sending' && Date.now() - new Date(row.created_at).getTime() < STUCK_AFTER_MS\n  if (stillSending) return bad(res, 409, 'That order is still being sent. Give it a few minutes, then look for it at Creative Hub before cancelling it.')\n  const unsure = row.status === 'check_creativehub' || row.status === 'sending'\n  if (unsure) {\n    if (body.confirm_not_there !== true) return bad(res, 409, 'It is not known whether Creative Hub already has this order, so it will not be cancelled until you have looked for it there and confirmed it is not there.')\n  } else if (!REFUNDABLE.includes(row.status)) {\n    return bad(res, 409, 'That order cannot be cancelled from where it is.')\n  }\n  const saved = await patchOrder(`id=eq.${row.id}`, [row.status], { status: 'refunded', refunded_at: new Date().toISOString(), note: 'Cancelled, and refunded in Stripe by you. The customer is told.' })\n  if (!saved.ok || saved.rows.length !== 1) return bad(res, 409, 'That order changed while you were doing this, so nothing was changed. Refresh the orders and look again.')\n  const told = await sendNotice('refused', { ...row, ...(saved.rows[0] || {}), status: 'refunded' }, { match: `id=eq.${row.id}` })\n  return res.status(200).json({\n    ok: true,\n    outcome: 'refunded',\n    message: told.status === 'sent'\n      ? 'The order is cancelled and marked as refunded, and the customer has been emailed.'\n      : `The order is cancelled and marked as refunded, but the customer has NOT been emailed.${told.note ? ` ${told.note}` : ''} Please email them yourself.`,\n  })\n",
"  if (!row) return bad(res, 404, 'That order could not be found.')\n  // A TEST payment can be PRACTISED on (Gill, 21 October 2026, so a tester can rehearse the refund journey): only while it is \"test_not_sent\", and the owner still ticks that she refunded it in\n  // Stripe's TEST mode. No money was ever taken and nothing goes near Creative Hub; the customer email carries the TEST banner.\n  const practice = !row.livemode\n  if (practice && row.status !== 'test_not_sent' && row.status !== 'refunded') return bad(res, 409, 'That is a test payment that cannot be practised on from where it is.')\n  if (row.status === 'refunded') return bad(res, 409, 'That order has already been cancelled and marked as refunded.')\n  if (row.creativehub_order_id || row.status === 'sent') return bad(res, 409, 'That order is already with Creative Hub, so it cannot be cancelled here. Ask Creative Hub to cancel it before printing starts, and only then refund it.')\n  const stillSending = row.status === 'sending' && Date.now() - new Date(row.created_at).getTime() < STUCK_AFTER_MS\n  if (stillSending) return bad(res, 409, 'That order is still being sent. Give it a few minutes, then look for it at Creative Hub before cancelling it.')\n  const unsure = row.status === 'check_creativehub' || row.status === 'sending'\n  if (practice) {\n    // nothing to look for at Creative Hub: a test payment never goes there\n  } else if (unsure) {\n    if (body.confirm_not_there !== true) return bad(res, 409, 'It is not known whether Creative Hub already has this order, so it will not be cancelled until you have looked for it there and confirmed it is not there.')\n  } else if (!REFUNDABLE.includes(row.status)) {\n    return bad(res, 409, 'That order cannot be cancelled from where it is.')\n  }\n  const saved = await patchOrder(`id=eq.${row.id}`, [row.status], { status: 'refunded', refunded_at: new Date().toISOString(), note: practice ? 'PRACTICE: cancelled, and refunded in Stripe test mode. A TEST email was sent.' : 'Cancelled, and refunded in Stripe by you. The customer is told.' })\n  if (!saved.ok || saved.rows.length !== 1) return bad(res, 409, 'That order changed while you were doing this, so nothing was changed. Refresh the orders and look again.')\n  const told = await sendNotice('refused', { ...row, ...(saved.rows[0] || {}), status: 'refunded' }, { match: `id=eq.${row.id}` })\n  return res.status(200).json({\n    ok: true,\n    outcome: 'refunded',\n    message: practice\n      ? told.status === 'sent'\n        ? 'Practice done: this test order is marked as cancelled and refunded, and a TEST email has been sent to the address on it.'\n        : `Practice done: this test order is marked as cancelled and refunded, but the TEST email was NOT sent.${told.note ? ` ${told.note}` : ''}`\n      : told.status === 'sent'\n        ? 'The order is cancelled and marked as refunded, and the customer has been emailed.'\n        : `The order is cancelled and marked as refunded, but the customer has NOT been emailed.${told.note ? ` ${told.note}` : ''} Please email them yourself.`,\n  })\n}\n\n// ---------- a sample of a customer email, for a TEST order ----------\n// So the owner can READ the wording of each short customer email before approving it (Gill, 21 October 2026). TEST ORDERS ONLY: a real order is refused, so a real customer can never be sent\n// a sample by mistake. It goes to the address on the test order, carries the TEST banner, and changes nothing on the order but the note of which notice went.\nconst SAMPLE_KINDS = ['received', 'refused']\nconst SAMPLE_NAME = { received: 'payment received', refused: 'order refused' }\nasync function sendSample(res, body) {\n  if (typeof body.id !== 'string' || !UUID.test(body.id)) return bad(res, 400, 'That is not an order.')\n  if (!SAMPLE_KINDS.includes(body.kind)) return bad(res, 400, 'That is not a sample I can send.')\n  const row = await loadOrder(body.id)\n  if (!row) return bad(res, 404, 'That order could not be found.')\n  if (row.livemode) return bad(res, 409, 'Samples are only sent for a test order, so that a real customer can never be sent one by mistake.')\n  const result = await sendNotice(body.kind, row, { match: `id=eq.${row.id}`, keySuffix: `-sample-${Date.now()}` })\n  return res.status(200).json({\n    ok: true,\n    outcome: result.status,\n    message: result.status === 'sent' ? `A sample of the \"${SAMPLE_NAME[body.kind]}\" email has been sent to the address on this test order. It carries a TEST banner.` : `The sample was not sent.${result.note ? ` ${result.note}` : ''}`,\n  })\n"
],
[
"\nconst ACTIONS = { refresh, check, link, send, mark_refunded: markRefunded, sending_state: sendingState, resend_confirmation: resendConfirmation, send_dispatch: sendDispatch }\n\n",
"\nconst ACTIONS = { refresh, check, link, send, mark_refunded: markRefunded, send_sample: sendSample, sending_state: sendingState, resend_confirmation: resendConfirmation, send_dispatch: sendDispatch }\n\n"
]
],
"src/artloft/OrdersPanel.jsx": [
[
"  // then is the customer emailed that they have been refunded. For an order whose answer from Creative Hub was lost, she must also tick that she has looked and it is not there.\n  function refundControl(o, who) {\n    const doubt = unsure(o)\n    if (refunding !== o.id) {\n      return <button type=\"button\" disabled={busy} onClick={() => { setRefunding(o.id); setTick({ refunded: false, notThere: false }) }} aria-label={`Cancel the order from ${who} and tell them they have been refunded`}>Cancel and refund…</button>\n    }\n    const stripeUrl = o.stripe_payment_intent ? `https://dashboard.stripe.com/payments/${encodeURIComponent(o.stripe_payment_intent)}` : ''\n    const ready = tick.refunded && (!doubt || tick.notThere)\n    return (\n      <span className=\"al-tools__confirm al-tools__refund\">\n        <strong>Refund the payment in Stripe first.</strong> This site never moves money.{' '}\n        {stripeUrl ? <a href={stripeUrl} target=\"_blank\" rel=\"noopener noreferrer\">Open this payment in Stripe (opens in a new tab)</a> : 'Find the payment in Stripe, under Payments.'}\n        <label className=\"al-tools__line\"><input type=\"checkbox\" checked={tick.refunded} onChange={(e) => setTick((t) => ({ ...t, refunded: e.target.checked }))} /> I have refunded this payment in Stripe</label>\n        {doubt && <label className=\"al-tools__line\"><input type=\"checkbox\" checked={tick.notThere} onChange={(e) => setTick((t) => ({ ...t, notThere: e.target.checked }))} /> I have looked at Creative Hub, and this order is not there</label>}\n        <button type=\"button\" disabled={busy || !ready} onClick={() => act('mark_refunded', { id: o.id, confirm_refunded: true, ...(doubt ? { confirm_not_there: true } : {}) })} aria-label={`Cancel the order from ${who} and email them that they have been refunded`}>Cancel the order and email the customer</button>{' '}\n        <button type=\"button\" disabled={busy} onClick={() => setRefunding(null)}>Back</button>\n      </span>\n    )\n  }\n\n  function actions(o) {\n    if (!o.livemode) return null\n    const who = o.customer_name || 'this customer'\n    if (o.status === 'sent' && o.creativehub_order_id) {\n",
"  // then is the customer emailed that they have been refunded. For an order whose answer from Creative Hub was lost, she must also tick that she has looked and it is not there.\n  // On a TEST order the same journey is a PRACTICE (so a tester can rehearse it): the link goes to Stripe's TEST mode, nothing real is touched, and the email carries a TEST banner.\n  function refundControl(o, who) {\n    const practice = !o.livemode\n    const doubt = unsure(o)\n    if (refunding !== o.id) {\n      return practice\n        ? <button type=\"button\" disabled={busy} onClick={() => { setRefunding(o.id); setTick({ refunded: false, notThere: false }) }} aria-label={`Practise cancelling the test order from ${who}`}>Practise cancel and refund…</button>\n        : <button type=\"button\" disabled={busy} onClick={() => { setRefunding(o.id); setTick({ refunded: false, notThere: false }) }} aria-label={`Cancel the order from ${who} and tell them they have been refunded`}>Cancel and refund…</button>\n    }\n    const stripeUrl = o.stripe_payment_intent ? `https://dashboard.stripe.com/${practice ? 'test/' : ''}payments/${encodeURIComponent(o.stripe_payment_intent)}` : ''\n    const ready = tick.refunded && (!doubt || tick.notThere)\n    return (\n      <span className=\"al-tools__confirm al-tools__refund\">\n        {practice\n          ? <strong>This is a TEST payment, so this is practice. Refund it in Stripe with Test mode switched ON.</strong>\n          : <strong>Refund the payment in Stripe first.</strong>}{' '}\n        This site never moves money.{' '}\n        {stripeUrl\n          ? <a href={stripeUrl} target=\"_blank\" rel=\"noopener noreferrer\">{practice ? 'Open this test payment in Stripe (opens in a new tab)' : 'Open this payment in Stripe (opens in a new tab)'}</a>\n          : practice ? 'Find the payment in Stripe, with Test mode on, under Payments.' : 'Find the payment in Stripe, under Payments.'}\n        <label className=\"al-tools__line\"><input type=\"checkbox\" checked={tick.refunded} onChange={(e) => setTick((t) => ({ ...t, refunded: e.target.checked }))} /> {practice ? 'I have refunded this test payment in Stripe' : 'I have refunded this payment in Stripe'}</label>\n        {doubt && <label className=\"al-tools__line\"><input type=\"checkbox\" checked={tick.notThere} onChange={(e) => setTick((t) => ({ ...t, notThere: e.target.checked }))} /> I have looked at Creative Hub, and this order is not there</label>}\n        <button type=\"button\" disabled={busy || !ready} onClick={() => act('mark_refunded', { id: o.id, confirm_refunded: true, ...(doubt ? { confirm_not_there: true } : {}) })} aria-label={practice ? `Cancel the test order from ${who} and email them` : `Cancel the order from ${who} and email them that they have been refunded`}>Cancel the order and email the customer</button>{' '}\n        <button type=\"button\" disabled={busy} onClick={() => setRefunding(null)}>Back</button>\n      </span>\n    )\n  }\n\n  // For a TEST order only: send the owner a sample of each short customer email (with its TEST banner), so she can read the wording before approving it. They go to the address on the test order.\n  function sampleButtons(o, who) {\n    if (!o.customer_email) return null\n    return (\n      <span className=\"al-tools__sample\">\n        <button type=\"button\" disabled={busy} onClick={() => act('send_sample', { id: o.id, kind: 'received' })} aria-label={`Send me a sample of the payment received email, using the test order from ${who}`}>Sample: payment received email</button>{' '}\n        <button type=\"button\" disabled={busy} onClick={() => act('send_sample', { id: o.id, kind: 'refused' })} aria-label={`Send me a sample of the order refused email, using the test order from ${who}`}>Sample: order refused email</button>\n      </span>\n    )\n  }\n\n  function actions(o) {\n    const who = o.customer_name || 'this customer'\n    // A TEST order: samples of the customer emails, and the refund journey as a practice. Nothing else (a test payment is never sent anywhere).\n    if (!o.livemode) return o.status === 'test_not_sent' ? <>{sampleButtons(o, who)}{refundControl(o, who)}</> : o.status === 'refunded' ? sampleButtons(o, who) : null\n    if (o.status === 'sent' && o.creativehub_order_id) {\n"
]
],
"test/order-actions-hold-refund.test.js": [
[
"  })\n  it('refuses a test payment: no money was taken', async () => {\n    h.row = row({ livemode: false })\n    const out = await refund()\n    expect(out.status).toBe(409); expect(out.body.message).toMatch(/test payment/); expect(h.notice).not.toHaveBeenCalled()\n  })\n",
"  })\n  it('refuses a test payment that is in any state but \"test_not_sent\" (a test payment can only be practised on from there: see test/order-actions-practice.test.js)', async () => {\n    h.row = row({ livemode: false, status: 'held' })\n    const out = await refund()\n    expect(out.status).toBe(409); expect(out.body.message).toMatch(/test payment that cannot be practised on/); expect(h.notice).not.toHaveBeenCalled(); expect(h.patchCalls).toEqual([])\n  })\n"
]
],
"test/orders-panel-cards.test.jsx": [
[
"    h.orders = [order({ id: 'o1', confirmation_status: 'sent' }), order({ id: 'o2', customer_name: 'Sam Lee', customer_email: 'sam@example.com', confirmation_status: 'failed', confirmation_note: 'Not sent: Resend answered 403.' })]; await load()\n    expect(within(cards()[0]).queryByRole('button')).toBeNull()\n    await userEvent.click(within(cards()[1]).getByRole('button', { name: /send the confirmation email to Sam Lee/i }))\n",
"    h.orders = [order({ id: 'o1', confirmation_status: 'sent' }), order({ id: 'o2', customer_name: 'Sam Lee', customer_email: 'sam@example.com', confirmation_status: 'failed', confirmation_note: 'Not sent: Resend answered 403.' })]; await load()\n    expect(within(cards()[0]).queryByRole('button', { name: /send the confirmation email/i })).toBeNull() // its confirmation went, so no such button (a test order has its own practice and sample buttons)\n    await userEvent.click(within(cards()[1]).getByRole('button', { name: /send the confirmation email to Sam Lee/i }))\n"
]
],
"test/orders-panel-hold-refund.test.jsx": [
[
"  })\n  it('is NOT offered for an order already with Creative Hub, a refunded one, one still being sent, or a test payment', async () => {\n    for (const o of [\n      order({ status: 'sent', creativehub_order_id: 'ch1', creativehub_order_number: 'N1' }),\n      order({ status: 'refunded' }),\n      order({ status: 'sending', created_at: new Date(Date.now() - 30 * 1000).toISOString() }),\n      order({ status: 'test_not_sent', livemode: false }),\n    ]) {\n",
"  })\n  it('is NOT offered (as a real cancel and refund) for an order already with Creative Hub, a refunded one, or one still being sent (a test payment has its own practice: see test/orders-panel-practice.test.jsx)', async () => {\n    for (const o of [\n      order({ status: 'sent', creativehub_order_id: 'ch1', creativehub_order_number: 'N1' }),\n      order({ status: 'refunded' }),\n      order({ status: 'sending', created_at: new Date(Date.now() - 30 * 1000).toISOString() }),\n    ]) {\n"
]
]
}''')
STAGED = {
    'test/order-actions-practice.test.js': 'tools/practice-route-files/order-actions-practice.test.js.staged',
    'test/orders-panel-practice.test.jsx': 'tools/practice-route-files/orders-panel-practice.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-PRACTICE-ROUTE.txt", "tools/practice-route-files/order-actions-practice.test.js.staged", "tools/practice-route-files/orders-panel-practice.test.jsx.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["lib/ownerAlert.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install starscapes-order-alerts-returns-21oct.zip first: it is missing ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-practice-route-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-practice-route').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-practice-route').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
