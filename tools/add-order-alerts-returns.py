#!/usr/bin/env python3
"""Emails you (with no customer details) when a real paid order needs you, and puts your approved returns wording into the confirmation email and the Returns page (no return address; customers email first). It needs the order safeguards package first.

Run it from the project folder, AFTER unzipping starscapes-order-alerts-returns-21oct.zip into it:   python3 tools/add-order-alerts-returns.py

What it does: it makes exact edits to 15 files and, only if all succeed, puts 2 new tests in place.
  api/orders.js, api/stripe-webhook.js, lib/orderEmailText.js, lib/orderFlow.js, sql/orders-notices.sql, src/artloft/OrdersPanel.jsx, src/data/legalPages.js, test/legal-check-wording.test.js, test/legal-pages.test.jsx, test/order-confirmation.test.js, test/order-email-text.test.js, test/order-flow-notify.test.js, test/orders-api-notices.test.js, test/orders-panel-hold-refund.test.jsx, test/webhook-confirmation.test.js

How it keeps you safe:
  - It checks ALL 15 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-order-alerts-returns.
  - It is safe to run twice: a file already done is left alone.
  - The new files (lib/ownerAlert.js, INSTALL-ORDER-ALERTS-RETURNS.txt, tools/order-alerts-returns-files/owner-alert.test.js.staged, tools/order-alerts-returns-files/returns-wording.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/orders.js": [
[
"// And the \"we have received your payment\" and \"we could not accept your order\" notices, and when a refund was recorded (sql/orders-notices.sql).\nconst NOTICES = 'notice_kind,notice_status,notice_note,notice_sent_at,refunded_at'\n\n",
"// And the \"we have received your payment\" and \"we could not accept your order\" notices, and when a refund was recorded (sql/orders-notices.sql).\nconst NOTICES = 'notice_kind,notice_status,notice_note,notice_sent_at,refunded_at,owner_alert_status,owner_alert_sent_at'\n\n"
]
],
"api/stripe-webhook.js": [
[
"//     it is written on the order, and the owner has a button to send it again.\n//   - If something temporary goes wrong BEFORE the order is saved (Stripe or the database cannot be reached), it answers with an\n",
"//     it is written on the order, and the owner has a button to send it again.\n//   - The OWNER is emailed (with no customer details in it) when a real paid order needs her: held, could not be ordered, refused, or Creative Hub's answer lost (lib/ownerAlert.js).\n//   - If something temporary goes wrong BEFORE the order is saved (Stripe or the database cannot be reached), it answers with an\n"
],
[
"import { autoSendIsOn, HELD_NOTE } from '../lib/orderSending.js'\n\n",
"import { autoSendIsOn, HELD_NOTE } from '../lib/orderSending.js'\nimport { sendOwnerAlert } from '../lib/ownerAlert.js'\n\n"
],
[
"    // confirmation. It never throws, and never holds up the answer to Stripe.\n    if (order.status !== 'sending') {\n      try {\n",
"    // confirmation. It never throws, and never holds up the answer to Stripe.\n    // The owner is also emailed (no customer details in it), because while payments are held nothing else tells her one has arrived.\n    if (order.status !== 'sending') {\n      try {\n        await sendOwnerAlert(order.status === 'held' ? 'held' : 'needs_attention', order, { detail: order.note })\n      } catch (e) {\n        // as above\n      }\n      try {\n"
],
[
"    //    so and waits for you, rather than being sent a second time. The customer is emailed the confirmation only once Creative Hub has accepted it.\n    const sent = await placeAndNotify(order, `stripe_session_id=eq.${encodeURIComponent(order.stripe_session_id)}`)\n    return reply(200, { ok: true, order: outcome, creativehub: sent.patch.status })\n",
"    //    so and waits for you, rather than being sent a second time. The customer is emailed the confirmation only once Creative Hub has accepted it.\n    const sent = await placeAndNotify(order, `stripe_session_id=eq.${encodeURIComponent(order.stripe_session_id)}`, { alert: sendOwnerAlert })\n    return reply(200, { ok: true, order: outcome, creativehub: sent.patch.status })\n"
]
],
"lib/orderEmailText.js": [
[
"\n// Where a customer sends a print back, and what to tell them about the cost of sending a large framed print back. Both are Gill's to decide\n// (tasks SFW-185 and the checklist in \"Legal pages: checked against the official model terms\"). Until they are filled in, the email is not approved.\nexport const RETURN = Object.freeze({ address: '', largeFramedNote: '' })\n\n",
"\n// How a print is sent back (Gill, 21 October 2026): NO return address is published. A customer who cancels emails us first, and we tell them how and where to send it, because she does not\n// want a personal address on the site and a return may turn out not to qualify. The note about large framed prints is hers too (approved the same day). The Returns page says the same.\nexport const RETURN = Object.freeze({ largeFramedNote: 'Large framed prints can cost a lot to post back and need careful packing, so please email us before you send one: we will tell you the best way to do it.' })\n\n"
],
[
"  const open = []\n  if (!RETURN.address) open.push('the address a print is sent back to')\n  if (!RETURN.largeFramedNote) open.push('what to say about the cost of sending a large framed print back')\n",
"  const open = []\n  if (!RETURN.largeFramedNote) open.push('what to say about the cost of sending a large framed print back')\n"
],
[
"\n  const sendBack = RETURN.address ? `to ${RETURN.address}` : 'to [RETURN ADDRESS: not yet decided]'\n  sections.push({\n    heading: 'Your right to cancel',\n    paragraphs: [\n      'You have the right to cancel this contract within 14 days without giving any reason. The cancellation period ends 14 days after the day you (or someone you have named) receive the last of the prints.',\n      `To cancel, tell us clearly that you have decided to: email ${CONTACT_EMAIL}. You may use the form at the end of this email, but you do not have to.`,\n      `If you cancel, you must send the print back ${sendBack} without delay, and no later than 14 days after you tell us you are cancelling. You pay the cost of sending it back.`,\n      ...(RETURN.largeFramedNote ? [RETURN.largeFramedNote] : ['[LARGE FRAMED PRINTS: what it costs to send one back is not yet decided]']),\n",
"\n  sections.push({\n    heading: 'Your right to cancel',\n    paragraphs: [\n      'You have the right to cancel this contract within 14 days without giving any reason. The cancellation period ends 14 days after the day you (or someone you have named) receive the last of the prints.',\n      `To cancel, tell us clearly that you have decided to: email ${CONTACT_EMAIL}. You may use the form at the end of this email, but you do not have to.`,\n      'If you cancel, we will tell you how and where to send the print back. You must send it back without delay, and no later than 14 days after you tell us you are cancelling. You pay the cost of sending it back.',\n      ...(RETURN.largeFramedNote ? [RETURN.largeFramedNote] : ['[LARGE FRAMED PRINTS: what it costs to send one back is not yet decided]']),\n"
]
],
"lib/orderFlow.js": [
[
"// arrived and that this is not yet the confirmation (\"received\"), once. Neither email can ever stop the other, the order, or the answer: nothing here throws.\nexport async function placeAndNotify(order, match, { fetchImpl, env = process.env, confirm = confirmOrder, notice = sendNotice } = {}) {\n  const placed = await placeAndRecord(order, match, { fetchImpl })\n  try {\n    const accepted = placed.patch.status === 'sent' && placed.saved && placed.saved.ok && placed.saved.rows.length === 1\n    if (accepted) {\n      if (order.confirmation_status !== 'sent') await confirm(order, { env, fetchImpl, match })\n    } else if (!(order.notice_kind === 'received' && order.notice_status === 'sent')) {\n      await notice('received', order, { env, fetchImpl, match })\n    }\n  } catch (e) {\n    // an email problem must never undo or hide what happened to the order\n  }\n",
"// arrived and that this is not yet the confirmation (\"received\"), once. Neither email can ever stop the other, the order, or the answer: nothing here throws.\nexport async function placeAndNotify(order, match, { fetchImpl, env = process.env, confirm = confirmOrder, notice = sendNotice, alert = null } = {}) {\n  const placed = await placeAndRecord(order, match, { fetchImpl })\n  const accepted = placed.patch.status === 'sent' && placed.saved && placed.saved.ok && placed.saved.rows.length === 1\n  if (accepted) {\n    try {\n      if (order.confirmation_status !== 'sent') await confirm(order, { env, fetchImpl, match })\n    } catch (e) {\n      // an email problem must never undo or hide what happened to the order\n    }\n    return placed\n  }\n  // Not accepted (it said no, or its answer was lost). The OWNER is alerted if the caller asked for that (the payment listener does; her own Send button does not, she is looking at it).\n  // Each email is tried on its own, so one failing can never stop the other, the record, or the answer.\n  if (alert) {\n    try {\n      await alert(placed.patch.status === 'check_creativehub' ? 'check' : 'needs_attention', order, { env, fetchImpl, match, detail: placed.patch.note })\n    } catch (e) {\n      // as above\n    }\n  }\n  try {\n    if (!(order.notice_kind === 'received' && order.notice_status === 'sent')) await notice('received', order, { env, fetchImpl, match })\n  } catch (e) {\n    // as above\n  }\n"
]
],
"sql/orders-notices.sql": [
[
"alter table public.orders add column if not exists refunded_at timestamptz;    -- when you said an order was cancelled and refunded\n",
"alter table public.orders add column if not exists refunded_at timestamptz;    -- when you said an order was cancelled and refunded\nalter table public.orders add column if not exists owner_alert_status text;    -- 'sent', 'failed' or 'not_sent': the email to YOU that a paid order needs you\nalter table public.orders add column if not exists owner_alert_sent_at timestamptz; -- when it went\n"
]
],
"src/artloft/OrdersPanel.jsx": [
[
"const NOTICE_NAME = { received: 'Payment-received email', refused: 'Refund email' }\n// An order still \"sending\" after this long is no longer in flight: its answer was lost\n",
"const NOTICE_NAME = { received: 'Payment-received email', refused: 'Refund email' }\n// Whether the email to the OWNER about a paid order that needs her went (added with sql/orders-notices.sql)\nconst ALERT = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT (no Resend key)' }\n// An order still \"sending\" after this long is no longer in flight: its answer was lost\n"
],
[
"                    {o.note && !isStuck(o) && <><br /><small>{o.note}</small></>}\n                    {o.notice_status && (\n",
"                    {o.note && !isStuck(o) && <><br /><small>{o.note}</small></>}\n                    {o.owner_alert_status && (\n                      <><br /><small>Alert to you: <strong>{ALERT[o.owner_alert_status] || o.owner_alert_status}</strong></small></>\n                    )}\n                    {o.notice_status && (\n"
]
],
"src/data/legalPages.js": [
[
"//    may change the wording on VAT, overseas customers and the 14-day right: change the words here and the tests will say what else has to follow.\n//  * RETURNS: [RETURN ADDRESS] is a gap. Decided 17 October: returns go to the registered office (a forwarding address); it goes in once the large-print courier figures are\n//    in (SFW-185). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n//    in (round brackets) so they are not counted as gaps.\n",
"//    may change the wording on VAT, overseas customers and the 14-day right: change the words here and the tests will say what else has to follow.\n//  * RETURNS: no return address is published (Gill, 21 October 2026): a customer emails first and we tell them how and where to send the print back, because she does not want a personal\n//    address on the site and a return may turn out not to qualify. The same wording is in the confirmation email (lib/orderEmailText.js). Section 3 says the print studio takes photos before an order is packed: check that with the print service. The cancellation form's blanks are written\n//    in (round brackets) so they are not counted as gaps.\n"
],
[
"          \"**To cancel:** email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) in that time, with your name and order details. You can use the form at the end of this page, or simply write \\\"I am cancelling my order\\\" with the order details.\",\n          \"**To send it back:** post the print to [RETURN ADDRESS] within 14 days of telling us you are cancelling. Please use its original packaging where you can, and pack it carefully, especially if it is framed. You pay the cost of sending it back, and you are responsible for it until it reaches us, so we recommend a tracked and insured service.\",\n          \"**Your refund:** we will refund the price you paid within 14 days of getting the print back (or of you showing proof that you posted it, if that is earlier). Delivery was free, so there is no delivery charge to refund. If the print comes back damaged or marked because it wasn't looked after, we may reduce the refund by the amount it has lost in value.\",\n",
"          \"**To cancel:** email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) in that time, with your name and order details. You can use the form at the end of this page, or simply write \\\"I am cancelling my order\\\" with the order details.\",\n          \"**To send it back:** email us first, and we will tell you how and where to send the print back. Then send it within 14 days of telling us you are cancelling. Please use its original packaging where you can, and pack it carefully, especially if it is framed. Large framed prints can cost a lot to post back and need careful packing, so please email us before you send one: we will tell you the best way to do it. You pay the cost of sending it back, and you are responsible for it until it reaches us, so we recommend a tracked and insured service.\",\n          \"**Your refund:** we will refund the price you paid within 14 days of getting the print back (or of you showing proof that you posted it, if that is earlier). Delivery was free, so there is no delivery charge to refund. If the print comes back damaged or marked because it wasn't looked after, we may reduce the refund by the amount it has lost in value.\",\n"
]
],
"test/legal-check-wording.test.js": [
[
"describe('everything is still a draft', () => {\n  it('none of the five pages is switched on, each still waits for its date, and the only placeholder besides the date is the return address', () => {\n    expect(LEGAL_PAGES.filter((p) => ['terms', 'privacy', 'returns', 'ai-policy', 'cookies'].includes(p.slug))).toHaveLength(5)\n    for (const slug of ['terms', 'privacy', 'returns', 'ai-policy', 'cookies']) { expect(page(slug).ready, slug).toBe(false); expect(page(slug).updated, slug).toBe('[date]') }\n    const gaps = new Set(LEGAL_PAGES.flatMap((p) => [p.updated, ...p.intro, ...p.sections.flatMap((s) => s.paragraphs)]).join('\\n').replace(/\\[[^\\]\\n]+\\]\\([^)\\s]*\\)/g, '').match(/\\[[^\\]\\n]+\\]/g)); expect([...gaps].sort()).toEqual(['[RETURN ADDRESS]', '[date]'])\n  })\n",
"describe('everything is still a draft', () => {\n  it('none of the five pages is switched on, each still waits for its date, and the date is the only placeholder left', () => {\n    expect(LEGAL_PAGES.filter((p) => ['terms', 'privacy', 'returns', 'ai-policy', 'cookies'].includes(p.slug))).toHaveLength(5)\n    for (const slug of ['terms', 'privacy', 'returns', 'ai-policy', 'cookies']) { expect(page(slug).ready, slug).toBe(false); expect(page(slug).updated, slug).toBe('[date]') }\n    const gaps = new Set(LEGAL_PAGES.flatMap((p) => [p.updated, ...p.intro, ...p.sections.flatMap((s) => s.paragraphs)]).join('\\n').replace(/\\[[^\\]\\n]+\\]\\([^)\\s]*\\)/g, '').match(/\\[[^\\]\\n]+\\]/g)); expect([...gaps].sort()).toEqual(['[date]'])\n  })\n"
]
],
"test/legal-pages.test.jsx": [
[
"  it('the only gaps left in [square brackets] are the known ones, so a stray placeholder cannot slip in', () => {\n    const known = new Set(['[date]', '[RETURN ADDRESS]'])\n    for (const p of LEGAL_PAGES) for (const m of textOf(p).replace(/\\[[^\\]\\n]+\\]\\([^)\\s]*\\)/g, '').matchAll(/\\[[^\\]\\n]+\\]/g)) expect(known.has(m[0]), `${p.slug}: ${m[0]}`).toBe(true)\n",
"  it('the only gaps left in [square brackets] are the known ones, so a stray placeholder cannot slip in', () => {\n    const known = new Set(['[date]'])\n    for (const p of LEGAL_PAGES) for (const m of textOf(p).replace(/\\[[^\\]\\n]+\\]\\([^)\\s]*\\)/g, '').matchAll(/\\[[^\\]\\n]+\\]/g)) expect(known.has(m[0]), `${p.slug}: ${m[0]}`).toBe(true)\n"
]
],
"test/order-confirmation.test.js": [
[
"describe('confirmationProblems (what keeps real checkout closed)', () => {\n  it('lists the missing key, the unapproved wording and the open gaps', () => {\n    const problems = confirmationProblems({})\n    expect(problems.join(' ')).toMatch(/RESEND_API_KEY/)\n    expect(problems.join(' ')).toMatch(/not been approved/)\n    expect(problems.join(' ')).toMatch(/Still to decide/)\n  })\n",
"describe('confirmationProblems (what keeps real checkout closed)', () => {\n  it('lists the missing key and the unapproved wording, and no gap about returns (nothing is left to decide there: Gill, 21 October 2026)', () => {\n    const problems = confirmationProblems({})\n    expect(problems.join(' ')).toMatch(/RESEND_API_KEY/)\n    expect(problems.join(' ')).toMatch(/not been approved/)\n    expect(problems.join(' ')).not.toMatch(/Still to decide/)\n    expect(problems).toHaveLength(2)\n  })\n"
]
],
"test/order-email-text.test.js": [
[
"      expect(pendingItems()).toEqual([])\n      expect(RETURN.address).not.toBe('')\n      expect(RETURN.largeFramedNote).not.toBe('')\n    }\n  })\n  it('shows a visible marker for each open gap, so a test email cannot hide one', () => {\n    const { text } = buildConfirmation(order())\n    if (!RETURN.address) expect(text).toMatch(/\\[RETURN ADDRESS/)\n    if (!RETURN.largeFramedNote) expect(text).toMatch(/\\[LARGE FRAMED PRINTS/)\n    expect(text).toMatch(/DRAFT WORDING/)\n",
"      expect(pendingItems()).toEqual([])\n      expect(RETURN.largeFramedNote).not.toBe('')\n    }\n  })\n  it('has no gap left open about returns (Gill decided, 21 October 2026: no address is published; customers email first), so nothing is marked in the email', () => {\n    expect(pendingItems()).toEqual([])\n    const { text } = buildConfirmation(order())\n    expect(text).not.toMatch(/\\[RETURN ADDRESS|\\[LARGE FRAMED PRINTS/)\n    expect(text).toMatch(/DRAFT WORDING/)\n"
]
],
"test/order-flow-notify.test.js": [
[
"    expect(order_of_events).toEqual(['recorded', 'email'])\n  })\n})\n",
"    expect(order_of_events).toEqual(['recorded', 'email'])\n  })\n})\n\ndescribe('the alert to the owner (only when the caller asks for it)', () => {\n  const withAlert = () => ({ ...mocks(), alert: vi.fn(async () => ({ status: 'sent' })) })\n  it('REFUSED: the owner is alerted (\"needs_attention\", with the reason from the order note), and the customer is still told \"received\"', async () => {\n    const m = withAlert()\n    const out = await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice, alert: m.alert })\n    expect(out.patch.status).toBe('needs_attention')\n    expect(m.alert).toHaveBeenCalledTimes(1)\n    expect(m.alert.mock.calls[0][0]).toBe('needs_attention')\n    expect(m.alert.mock.calls[0][1]).toMatchObject({ stripe_session_id: 'cs_live_abc123' })\n    expect(m.alert.mock.calls[0][2]).toMatchObject({ match: MATCH, detail: expect.stringMatching(/Nothing was ordered/) })\n    expect(m.notice).toHaveBeenCalledTimes(1); expect(m.confirm).not.toHaveBeenCalled()\n  })\n  it('LOST ANSWER: the owner is alerted with the \"check\" kind', async () => {\n    const m = withAlert()\n    await placeAndNotify(order(), MATCH, { fetchImpl: lost(), confirm: m.confirm, notice: m.notice, alert: m.alert })\n    expect(m.alert).toHaveBeenCalledTimes(1); expect(m.alert.mock.calls[0][0]).toBe('check')\n  })\n  it('ACCEPTED: nobody needs the owner, so there is no alert (just the confirmation)', async () => {\n    const m = withAlert()\n    await placeAndNotify(order(), MATCH, { fetchImpl: accepted(), confirm: m.confirm, notice: m.notice, alert: m.alert })\n    expect(m.alert).not.toHaveBeenCalled(); expect(m.confirm).toHaveBeenCalledTimes(1)\n  })\n  it('is NOT sent when no alert is asked for (the owner\\u2019s own Send button does not alert her about what she is looking at)', async () => {\n    const m = withAlert()\n    await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice })\n    expect(m.alert).not.toHaveBeenCalled(); expect(m.notice).toHaveBeenCalledTimes(1)\n  })\n  it('an alert that throws never stops the customer notice, the record, or the result', async () => {\n    const m = withAlert(); m.alert.mockImplementation(async () => { throw new Error('email exploded') })\n    const out = await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice, alert: m.alert })\n    expect(out.patch.status).toBe('needs_attention'); expect(h.patches[0].body.status).toBe('needs_attention'); expect(m.notice).toHaveBeenCalledTimes(1)\n  })\n  it('a notice that throws never stops the alert', async () => {\n    const m = withAlert(); m.notice.mockImplementation(async () => { throw new Error('email exploded') })\n    await placeAndNotify(order(), MATCH, { fetchImpl: refused(), confirm: m.confirm, notice: m.notice, alert: m.alert })\n    expect(m.alert).toHaveBeenCalledTimes(1)\n  })\n})\n"
]
],
"test/orders-api-notices.test.js": [
[
"const columnsOf = (path) => decodeURIComponent(path).match(/select=([^&]*)/)[1].split(',')\nconst NEW = ['notice_kind', 'notice_status', 'notice_note', 'notice_sent_at', 'refunded_at']\nbeforeEach(() => { h.asked = []; h.failFirst = 0 })\n",
"const columnsOf = (path) => decodeURIComponent(path).match(/select=([^&]*)/)[1].split(',')\nconst NEW = ['notice_kind', 'notice_status', 'notice_note', 'notice_sent_at', 'refunded_at', 'owner_alert_status', 'owner_alert_sent_at']\nbeforeEach(() => { h.asked = []; h.failFirst = 0 })\n"
],
[
"  it('puts the dates in timestamp columns and the rest in text', () => {\n    for (const c of ['notice_sent_at', 'refunded_at']) expect(sql).toMatch(new RegExp(`add column if not exists ${c} timestamptz`))\n    for (const c of ['notice_kind', 'notice_status', 'notice_note']) expect(sql).toMatch(new RegExp(`add column if not exists ${c} text`))\n  })\n",
"  it('puts the dates in timestamp columns and the rest in text', () => {\n    for (const c of ['notice_sent_at', 'refunded_at', 'owner_alert_sent_at']) expect(sql).toMatch(new RegExp(`add column if not exists ${c} timestamptz`))\n    for (const c of ['notice_kind', 'notice_status', 'notice_note', 'owner_alert_status']) expect(sql).toMatch(new RegExp(`add column if not exists ${c} text`))\n  })\n"
]
],
"test/orders-panel-hold-refund.test.jsx": [
[
"    expect(within(screen.getByRole('list', { name: /orders/i })).queryByRole('button', { name: /cancel the order/i })).toBeNull()\n  })\n})\n",
"    expect(within(screen.getByRole('list', { name: /orders/i })).queryByRole('button', { name: /cancel the order/i })).toBeNull()\n  })\n})\n\ndescribe('the alert to the owner on the panel', () => {\n  it.each([\n    ['sent', /Alert to you:.*sent/],\n    ['failed', /Alert to you:.*FAILED/],\n    ['not_sent', /Alert to you:.*NOT SENT \\(no Resend key\\)/],\n  ])('says whether the email to the owner went (%s)', async (status, pattern) => {\n    h.orders = [order({ owner_alert_status: status })]\n    await load()\n    expect(screen.getByText(/Alert to you:/)).toHaveTextContent(pattern)\n  })\n  it('shows nothing about it for an order with no record of one', async () => {\n    await load()\n    expect(screen.queryByText(/Alert to you:/)).toBeNull()\n  })\n})\n"
]
],
"test/webhook-confirmation.test.js": [
[
"  place: vi.fn(async () => ({ patch: { status: 'sent' } })),\n}))\nvi.mock('../lib/serviceKey.js', () => ({ serviceFetch: async (_path, init) => { h.saved.push(JSON.parse(init.body)); return { ok: true, status: 201, json: async () => h.rows } } }))\nvi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: (...a) => h.confirm(...a), sendNotice: (...a) => h.notice(...a) }))\nvi.mock('../lib/orderFlow.js', () => ({ placeAndNotify: (...a) => h.place(...a) }))\n\n",
"  place: vi.fn(async () => ({ patch: { status: 'sent' } })),\n  alert: vi.fn(async () => ({ status: 'sent' })),\n}))\nvi.mock('../lib/serviceKey.js', () => ({ serviceFetch: async (_path, init) => { h.saved.push(JSON.parse(init.body)); return { ok: true, status: 201, json: async () => h.rows } } }))\nvi.mock('../lib/orderConfirmation.js', () => ({ confirmOrder: (...a) => h.confirm(...a), sendNotice: (...a) => h.notice(...a) }))\nvi.mock('../lib/orderFlow.js', () => ({ placeAndNotify: (...a) => h.place(...a) }))\nvi.mock('../lib/ownerAlert.js', () => ({ sendOwnerAlert: (...a) => h.alert(...a) }))\n\n"
],
[
"  h.rows = [{ id: 1 }]; h.saved = []\n  for (const m of [h.confirm, h.notice, h.place]) m.mockClear()\n  h.confirm.mockImplementation(async () => ({ status: 'sent' }))\n",
"  h.rows = [{ id: 1 }]; h.saved = []\n  for (const m of [h.confirm, h.notice, h.place, h.alert]) m.mockClear()\n  h.alert.mockImplementation(async () => ({ status: 'sent' }))\n  h.confirm.mockImplementation(async () => ({ status: 'sent' }))\n"
],
[
"\ndescribe('a message that is not to be trusted', () => {\n",
"\ndescribe('the alert to the owner (no customer details in it: see test/owner-alert.test.js)', () => {\n  it('a HELD order alerts her once, with the kind \"held\" and the reason from the order, and the customer is still told \"received\"', async () => {\n    live()\n    await send(true)\n    expect(h.alert).toHaveBeenCalledTimes(1)\n    expect(h.alert.mock.calls[0][0]).toBe('held')\n    expect(h.alert.mock.calls[0][1]).toMatchObject({ stripe_session_id: 'cs_live_abc123', status: 'held' })\n    expect(h.alert.mock.calls[0][2]).toEqual({ detail: expect.stringMatching(/Held: automatic sending is switched off/) })\n    expect(h.notice).toHaveBeenCalledTimes(1)\n  })\n  it('an order that could not be placed at all (no key) alerts her with \"needs_attention\"', async () => {\n    live({ SEND_ORDERS_AUTOMATICALLY: 'yes' }); delete process.env.CREATIVEHUB_API_KEY; delete process.env.CREATIVEHUB_API_TOKEN\n    await send(true)\n    expect(h.alert).toHaveBeenCalledTimes(1); expect(h.alert.mock.calls[0][0]).toBe('needs_attention')\n  })\n  it('with automatic sending on, the alert is handed to the flow, which uses it only if Creative Hub does not accept the order', async () => {\n    live({ SEND_ORDERS_AUTOMATICALLY: 'yes' })\n    await send(true)\n    expect(h.alert).not.toHaveBeenCalled() // the listener itself does not alert: the flow does, on a refusal\n    const options = h.place.mock.calls[0][2]\n    expect(typeof options.alert).toBe('function')\n    await options.alert('needs_attention', {}, {})\n    expect(h.alert).toHaveBeenCalledWith('needs_attention', {}, {})\n  })\n  it('a test payment never alerts her, and neither does a repeat of a message', async () => {\n    process.env.STRIPE_SECRET_KEY = 'sk_test_x'\n    await send(false)\n    live(); h.rows = []\n    await send(true)\n    expect(h.alert).not.toHaveBeenCalled()\n  })\n  it('an alert that throws changes nothing: the order stays held, the customer is still told, and Stripe still gets 200', async () => {\n    live(); h.alert.mockImplementation(async () => { throw new Error('email exploded') })\n    const res = await send(true)\n    expect(res.status).toBe(200); expect(h.saved[0].status).toBe('held'); expect(h.notice).toHaveBeenCalledTimes(1)\n  })\n})\n\ndescribe('a message that is not to be trusted', () => {\n"
]
]
}''')
STAGED = {
    'test/owner-alert.test.js': 'tools/order-alerts-returns-files/owner-alert.test.js.staged',
    'test/returns-wording.test.js': 'tools/order-alerts-returns-files/returns-wording.test.js.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["lib/ownerAlert.js", "INSTALL-ORDER-ALERTS-RETURNS.txt", "tools/order-alerts-returns-files/owner-alert.test.js.staged", "tools/order-alerts-returns-files/returns-wording.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["lib/orderSending.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install starscapes-order-safeguards-21oct.zip first: it is missing ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-order-alerts-returns-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-order-alerts-returns').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-order-alerts-returns').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
