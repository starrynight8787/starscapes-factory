#!/usr/bin/env python3
"""Shows each order as a card instead of a wide table, and stops My passes naming a future date as the day passes ended.

Run it from the project folder, AFTER unzipping starscapes-orders-cards-20oct.zip into it:   python3 tools/add-orders-cards.py

What it does: it makes exact edits to three files that already exist (the Orders panel, the Art Loft styles and the My passes page) and adds one new file from the zip (the unzip itself also replaces one test file and adds one).
  src/artloft/OrdersPanel.jsx, src/artloft/artloft.css, src/membership/MyPassesPage.jsx

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-orders-cards.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-ORDERS-CARDS.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/artloft/OrdersPanel.jsx": [
[
"\n      {state.phase === 'done' && state.orders.length > 0 && (\n        <div className=\"al-tools__scroll\">\n          <table className=\"al-tools__table\">\n            <caption>The latest {state.orders.length} {state.orders.length === 1 ? 'order' : 'orders'}</caption>\n            <thead>\n              <tr>\n                <th scope=\"col\">When</th>\n                <th scope=\"col\">Customer</th>\n                <th scope=\"col\">Delivering to</th>\n                <th scope=\"col\">What</th>\n                <th scope=\"col\">Total</th>\n                <th scope=\"col\">Status</th>\n                <th scope=\"col\">Actions</th>\n              </tr>\n            </thead>\n            <tbody>\n              {state.orders.map((o) => {\n                const address = o.shipping && o.shipping.address\n                const items = Array.isArray(o.items) ? o.items : []\n                const shown = isStuck(o) ? 'check_creativehub' : o.status\n                return (\n                  <tr key={o.id}>\n                    <th scope=\"row\">{when(o.created_at)}{!o.livemode && <><br /><span className=\"al-tools__tag\">TEST</span></>}</th>\n                    <td>{o.customer_name || 'No name'}<br />{o.customer_email || ''}</td>\n                    <td>{address ? [address.city, country(address.country)].filter(Boolean).join(', ') : 'No address'}</td>\n                    <td>{items.length === 0 ? 'Could not read' : items.map((i, n) => <span key={n} className=\"al-tools__line\">{i.qty} × {i.title}{i.description ? ` (${i.description})` : ''}</span>)}</td>\n                    <td>{o.amount_total === null || o.amount_total === undefined ? '' : formatPrice(o.amount_total / 100)}</td>\n                    <td>\n                      <strong className={`al-tools__status is-${shown}`}>{STATUS[shown] || shown}</strong>\n                      {o.status === 'sent' && (\n                        <small className=\"al-tools__line\">\n                          {o.creativehub_order_number ? `Order ${o.creativehub_order_number}` : o.creativehub_order_id ? 'Order number not recorded' : ''}\n                          {o.creativehub_status ? `, ${o.creativehub_status}` : ''}\n                          {o.creativehub_due ? `, due ${o.creativehub_due}` : ''}\n                        </small>\n                      )}\n                      {isStuck(o) && <><br /><small>This order was never marked as sent and its answer was lost. It may or may not be at Creative Hub.</small></>}\n                      {o.note && !isStuck(o) && <><br /><small>{o.note}</small></>}\n                      {o.confirmation_status && (\n                        <><br /><small>Confirmation email: <strong>{CONFIRMATION[o.confirmation_status] || o.confirmation_status}</strong>{o.confirmation_note && o.confirmation_status !== 'sent' ? `. ${o.confirmation_note}` : ''}</small></>\n                      )}\n                      {o.dispatch_status && (\n                        <><br /><small>Posted email: <strong>{DISPATCH[o.dispatch_status] || o.dispatch_status}</strong>{o.dispatch_note && o.dispatch_status !== 'sent' ? `. ${o.dispatch_note}` : ''}{o.dispatch_status === 'sent' && o.tracking_number ? `. Tracking number ${o.tracking_number}` : ''}</small></>\n                      )}\n                    </td>\n                    <td>{actions(o)}{confirmationButton(o)}{dispatchControl(o)}</td>\n                  </tr>\n                )\n              })}\n            </tbody>\n          </table>\n        </div>\n      )}\n    </section>\n",
"\n      {state.phase === 'done' && state.orders.length > 0 && (\n        <>\n          <p className=\"al-orders__count\">The latest {state.orders.length} {state.orders.length === 1 ? 'order' : 'orders'}</p>\n          <ul className=\"al-orders\" aria-label=\"Orders, newest first\">\n            {state.orders.map((o) => {\n              const address = o.shipping && o.shipping.address\n              const items = Array.isArray(o.items) ? o.items : []\n              const shown = isStuck(o) ? 'check_creativehub' : o.status\n              const total = o.amount_total === null || o.amount_total === undefined ? '' : formatPrice(o.amount_total / 100)\n              const buttons = [actions(o), confirmationButton(o), dispatchControl(o)]\n              return (\n                <li key={o.id} className=\"al-order\">\n                  <div className=\"al-order__head\">\n                    <h3 className=\"al-order__when\">{when(o.created_at)}{!o.livemode && <span className=\"al-tools__tag\">TEST</span>}</h3>\n                    {total && <p className=\"al-order__total\">{total}</p>}\n                  </div>\n                  <dl className=\"al-order__facts\">\n                    <div><dt>Customer</dt><dd>{o.customer_name || 'No name'}<br />{o.customer_email || ''}</dd></div>\n                    <div><dt>Delivering to</dt><dd>{address ? [address.city, country(address.country)].filter(Boolean).join(', ') : 'No address'}</dd></div>\n                    <div><dt>What</dt><dd>{items.length === 0 ? 'Could not read' : items.map((i, n) => <span key={n} className=\"al-tools__line\">{i.qty} × {i.title}{i.description ? ` (${i.description})` : ''}</span>)}</dd></div>\n                  </dl>\n                  <div className=\"al-order__status\">\n                    <strong className={`al-tools__status is-${shown}`}>{STATUS[shown] || shown}</strong>\n                    {o.status === 'sent' && (\n                      <small className=\"al-tools__line\">\n                        {o.creativehub_order_number ? `Order ${o.creativehub_order_number}` : o.creativehub_order_id ? 'Order number not recorded' : ''}\n                        {o.creativehub_status ? `, ${o.creativehub_status}` : ''}\n                        {o.creativehub_due ? `, due ${o.creativehub_due}` : ''}\n                      </small>\n                    )}\n                    {isStuck(o) && <><br /><small>This order was never marked as sent and its answer was lost. It may or may not be at Creative Hub.</small></>}\n                    {o.note && !isStuck(o) && <><br /><small>{o.note}</small></>}\n                    {o.confirmation_status && (\n                      <><br /><small>Confirmation email: <strong>{CONFIRMATION[o.confirmation_status] || o.confirmation_status}</strong>{o.confirmation_note && o.confirmation_status !== 'sent' ? `. ${o.confirmation_note}` : ''}</small></>\n                    )}\n                    {o.dispatch_status && (\n                      <><br /><small>Posted email: <strong>{DISPATCH[o.dispatch_status] || o.dispatch_status}</strong>{o.dispatch_note && o.dispatch_status !== 'sent' ? `. ${o.dispatch_note}` : ''}{o.dispatch_status === 'sent' && o.tracking_number ? `. Tracking number ${o.tracking_number}` : ''}</small></>\n                    )}\n                  </div>\n                  {buttons.some(Boolean) && <div className=\"al-order__actions\">{buttons[0]}{buttons[1]}{buttons[2]}</div>}\n                </li>\n              )\n            })}\n          </ul>\n        </>\n      )}\n    </section>\n"
]
],
"src/artloft/artloft.css": [
[
"  color: var(--sf-muted, #5b6585);\n}\n.al-sync-plan h3 {\n  margin: 14px 0 4px;\n",
"  color: var(--sf-muted, #5b6585);\n}\n.al-orders__count {\n  margin: 8px 0 10px;\n  color: var(--sf-muted, #5b6585);\n}\n.al-orders {\n  display: grid;\n  gap: 14px;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.al-order {\n  display: grid;\n  gap: 12px;\n  padding: 14px 16px;\n  background: #fff;\n  border: 1px solid var(--sf-border, #dde3f0);\n  border-radius: 12px;\n  font-size: 0.95rem;\n  line-height: 1.45;\n  color: var(--sf-ink, #0e1530);\n  min-width: 0;\n}\n.al-order__head {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 6px 16px;\n  padding-bottom: 10px;\n  border-bottom: 1px solid var(--sf-border, #dde3f0);\n}\n.al-order__when {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n  margin: 0;\n  font-size: 1rem;\n}\n.al-order__total {\n  margin: 0;\n  font-size: 1.15rem;\n  font-weight: 700;\n}\n.al-order__facts {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));\n  gap: 12px 20px;\n  margin: 0;\n}\n.al-order__facts div {\n  min-width: 0;\n}\n.al-order__facts dt {\n  margin: 0 0 2px;\n  font-size: 0.875rem;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--sf-muted, #5b6585);\n}\n.al-order__facts dd {\n  margin: 0;\n  overflow-wrap: anywhere;\n}\n.al-order__status {\n  padding: 10px 12px;\n  background: var(--sf-bg, #f7f8fd);\n  border-radius: 8px;\n  overflow-wrap: anywhere;\n}\n.al-order__status small {\n  color: var(--sf-muted, #5b6585);\n}\n.al-order__status .al-tools__line + br {\n  display: none;\n}\n.al-order__actions {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 10px;\n}\n.al-sync-plan h3 {\n  margin: 14px 0 4px;\n"
]
],
"src/membership/MyPassesPage.jsx": [
[
"          <section className=\"mb__sum\">\n            <span className=\"pg-chip\">Ended</span>\n            <p className=\"mb__lead\">{row.current_period_end ? `Your passes ended on ${formatDate(row.current_period_end)}.` : 'Your passes have ended.'} You can choose passes again whenever you like.</p>\n            <Link className=\"mb__wbtn\" to=\"/membership\">\n              Choose your passes\n",
"          <section className=\"mb__sum\">\n            <span className=\"pg-chip\">Ended</span>\n            <p className=\"mb__lead\">{row.current_period_end && Date.parse(row.current_period_end) <= Date.now() ? `Your passes ended on ${formatDate(row.current_period_end)}.` : 'Your passes have ended.'} You can choose passes again whenever you like.</p>\n            <Link className=\"mb__wbtn\" to=\"/membership\">\n              Choose your passes\n"
]
]
}''')
NEW_FILES = ["INSTALL-ORDERS-CARDS.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/artloft/DeliveryTools.jsx", "src/membership/changeWindow.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier Art Loft and membership packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-orders-cards-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-orders-cards').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
