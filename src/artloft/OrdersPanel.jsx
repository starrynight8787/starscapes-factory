import { useState } from 'react'
import { fetchOrders } from './artLoftApi'
import { orderAction } from './orderActionsApi'
import { formatPrice } from './artLoftData'

const STATUS = {
  test_not_sent: 'Test payment: nothing ordered',
  held: 'HELD: WAITING FOR YOUR OK',
  needs_attention: 'NEEDS ATTENTION',
  sending: 'Sending to Creative Hub…',
  check_creativehub: 'CHECK CREATIVE HUB BEFORE SENDING AGAIN',
  sent: 'Sent to Creative Hub',
  paid: 'Paid',
  refunded: 'Cancelled and refunded',
}
// Whether the customer's confirmation email went (added with sql/orders-confirmation.sql)
const CONFIRMATION = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT', sending: 'being sent…' }
// Whether the "your order has been posted" email went (added with sql/orders-dispatch.sql)
const DISPATCH = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT', sending: 'being sent…' }
// Whether the short notices went: "we have received your payment" (kind received) or "we could not accept your order, you have been refunded" (kind refused) (added with sql/orders-notices.sql)
const NOTICE = { sent: 'sent', failed: 'FAILED', not_sent: 'NOT SENT' }
const NOTICE_NAME = { received: 'Payment-received email', refused: 'Refund email' }
// An order still "sending" after this long is no longer in flight: its answer was lost
const STUCK_MS = 5 * 60 * 1000

const when = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const country = (code) => {
  try {
    return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) : ''
  } catch (e) {
    return code || ''
  }
}
const isStuck = (o) => o.status === 'sending' && Date.now() - new Date(o.created_at).getTime() > STUCK_MS
const unsure = (o) => o.status === 'check_creativehub' || isStuck(o)

export default function OrdersPanel() {
  const [state, setState] = useState({ phase: 'idle', orders: [], text: '' })
  const [flash, setFlash] = useState('')
  const [working, setWorking] = useState(false)
  const [confirming, setConfirming] = useState(null) // the id of the order waiting for a "Yes, send it"
  const [dispatching, setDispatching] = useState(null) // the id of the order whose posted email is being filled in
  const [track, setTrack] = useState({ url: '', number: '' }) // what was typed for it
  const [looked, setLooked] = useState({}) // an order's id -> what the look through Creative Hub's orders found
  const [sending, setSending] = useState(null) // { auto_send, setting }: whether real payments go to Creative Hub by themselves (null until known)
  const [refunding, setRefunding] = useState(null) // the id of the order whose "cancel and refund" is open
  const [tick, setTick] = useState({ refunded: false, notThere: false }) // the boxes ticked for it

  async function load() {
    setState({ phase: 'working', orders: [], text: 'Looking up your orders…' })
    setFlash('')
    try {
      Promise.resolve(orderAction('sending_state')).then((s) => { if (s && typeof s.auto_send === 'boolean') setSending(s) }).catch(() => {}) // a problem here must never hide the orders
      const body = await fetchOrders()
      setState({ phase: 'done', orders: body.orders, text: '' })
    } catch (e) {
      setState({ phase: 'error', orders: [], text: e.message })
    }
  }

  // Presses one of the owner's buttons, then shows the orders as they are now
  async function act(action, extra = {}) {
    setWorking(true)
    setConfirming(null)
    setDispatching(null)
    setRefunding(null)
    setFlash('Working…')
    try {
      const body = await orderAction(action, extra)
      try {
        const fresh = await fetchOrders()
        setState({ phase: 'done', orders: fresh.orders, text: '' })
      } catch (e) {
        // the action worked; the list will update when it is refreshed
      }
      setFlash(body.message || 'Done.')
    } catch (e) {
      setFlash(e.message)
    } finally {
      setWorking(false)
    }
  }

  async function lookFor(o) {
    setWorking(true)
    setConfirming(null)
    setFlash('Looking through Creative Hub…')
    try {
      const body = await orderAction('check', { id: o.id })
      setLooked((l) => ({ ...l, [o.id]: body }))
      setFlash(body.message || 'Done.')
    } catch (e) {
      setFlash(e.message)
    } finally {
      setWorking(false)
    }
  }

  const busy = state.phase === 'working' || working
  const anySent = state.orders.some((o) => o.status === 'sent' && o.creativehub_order_id)

  // The button for an email that has not gone. It only shows once the status has been recorded, and never for one already sent.
  function confirmationButton(o) {
    if (!o.customer_email || !['failed', 'not_sent'].includes(o.confirmation_status)) return null
    return (
      <button type="button" disabled={busy} onClick={() => act('resend_confirmation', { id: o.id })} aria-label={`Send the confirmation email to ${o.customer_name || 'this customer'}`}>
        Send confirmation email
      </button>
    )
  }

  // The "your order has been posted" email: for an order really with Creative Hub (or a test order) that has not had it yet. The owner can add
  // a tracking link and/or number; both are optional, and the email never mentions tracking unless one is given.
  function dispatchControl(o) {
    if (!o.customer_email || !('dispatch_status' in o) || o.dispatch_status === 'sent' || o.dispatch_status === 'sending') return null
    if (o.livemode && o.status !== 'sent') return null
    const who = o.customer_name || 'this customer'
    if (dispatching !== o.id) {
      return (
        <button type="button" disabled={busy} onClick={() => { setDispatching(o.id); setTrack({ url: '', number: '' }) }} aria-label={`Send the posted email to ${who}`}>
          Send posted email
        </button>
      )
    }
    return (
      <span className="al-tools__confirm">
        <label>Tracking link (optional) <input type="url" value={track.url} onChange={(e) => setTrack((t) => ({ ...t, url: e.target.value }))} placeholder="https://" /></label>{' '}
        <label>Tracking number (optional) <input type="text" value={track.number} onChange={(e) => setTrack((t) => ({ ...t, number: e.target.value }))} /></label>{' '}
        <button type="button" disabled={busy} onClick={() => act('send_dispatch', { id: o.id, tracking_url: track.url, tracking_number: track.number })}>Send it now</button>{' '}
        <button type="button" disabled={busy} onClick={() => setDispatching(null)}>Cancel</button>
      </span>
    )
  }

  // Cancelling an order that cannot be made. The site NEVER moves money: the owner refunds the payment in Stripe herself (a link takes her to it), ticks a box to say she has, and only
  // then is the customer emailed that they have been refunded. For an order whose answer from Creative Hub was lost, she must also tick that she has looked and it is not there.
  function refundControl(o, who) {
    const doubt = unsure(o)
    if (refunding !== o.id) {
      return <button type="button" disabled={busy} onClick={() => { setRefunding(o.id); setTick({ refunded: false, notThere: false }) }} aria-label={`Cancel the order from ${who} and tell them they have been refunded`}>Cancel and refund…</button>
    }
    const stripeUrl = o.stripe_payment_intent ? `https://dashboard.stripe.com/payments/${encodeURIComponent(o.stripe_payment_intent)}` : ''
    const ready = tick.refunded && (!doubt || tick.notThere)
    return (
      <span className="al-tools__confirm al-tools__refund">
        <strong>Refund the payment in Stripe first.</strong> This site never moves money.{' '}
        {stripeUrl ? <a href={stripeUrl} target="_blank" rel="noopener noreferrer">Open this payment in Stripe (opens in a new tab)</a> : 'Find the payment in Stripe, under Payments.'}
        <label className="al-tools__line"><input type="checkbox" checked={tick.refunded} onChange={(e) => setTick((t) => ({ ...t, refunded: e.target.checked }))} /> I have refunded this payment in Stripe</label>
        {doubt && <label className="al-tools__line"><input type="checkbox" checked={tick.notThere} onChange={(e) => setTick((t) => ({ ...t, notThere: e.target.checked }))} /> I have looked at Creative Hub, and this order is not there</label>}
        <button type="button" disabled={busy || !ready} onClick={() => act('mark_refunded', { id: o.id, confirm_refunded: true, ...(doubt ? { confirm_not_there: true } : {}) })} aria-label={`Cancel the order from ${who} and email them that they have been refunded`}>Cancel the order and email the customer</button>{' '}
        <button type="button" disabled={busy} onClick={() => setRefunding(null)}>Back</button>
      </span>
    )
  }

  function actions(o) {
    if (!o.livemode) return null
    const who = o.customer_name || 'this customer'
    if (o.status === 'sent' && o.creativehub_order_id) {
      return <button type="button" disabled={busy} onClick={() => act('refresh', { id: o.id })} aria-label={`Refresh status of the order from ${who}`}>Refresh status</button>
    }
    if (o.status === 'needs_attention' || o.status === 'held') {
      const sendIt = confirming === o.id ? (
        <span className="al-tools__confirm">
          Send this order to Creative Hub now? It will be made and charged.{' '}
          <button type="button" disabled={busy} onClick={() => act('send', { id: o.id })}>Yes, send it</button>{' '}
          <button type="button" disabled={busy} onClick={() => setConfirming(null)}>Cancel</button>
        </span>
      ) : (
        <button type="button" disabled={busy} onClick={() => setConfirming(o.id)} aria-label={`Send the order from ${who} to Creative Hub`}>Send to Creative Hub</button>
      )
      return <>{sendIt}{refundControl(o, who)}</>
    }
    if (unsure(o)) {
      const found = looked[o.id]
      return (
        <span className="al-tools__sure">
          <button type="button" disabled={busy} onClick={() => lookFor(o)} aria-label={`Look for the order from ${who} at Creative Hub`}>Look for it at Creative Hub</button>
          {found && (
            <span className="al-tools__found">
              {found.candidates.length > 0 && (
                <span>
                  Could be:
                  {found.candidates.map((c) => (
                    <span key={c.id} className="al-tools__line">
                      {c.number || c.id}{c.status ? `, ${c.status}` : ''}{c.total ? `, £${c.total}` : ''}{' '}
                      <button type="button" disabled={busy} onClick={() => act('link', { id: o.id, creativehub_order_id: c.id })} aria-label={`This is the order from ${who}: Creative Hub order ${c.number || c.id}`}>This is it</button>
                    </span>
                  ))}
                </span>
              )}
              {confirming === o.id ? (
                <span className="al-tools__confirm">
                  I have looked, and Creative Hub does not have this order. Send it now?{' '}
                  <button type="button" disabled={busy} onClick={() => act('send', { id: o.id, confirm_not_there: true })}>Yes, send it</button>{' '}
                  <button type="button" disabled={busy} onClick={() => setConfirming(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" disabled={busy} onClick={() => setConfirming(o.id)} aria-label={`It is not at Creative Hub: send the order from ${who}`}>It is not there: send it</button>
              )}
            </span>
          )}
          {refundControl(o, who)}
        </span>
      )
    }
    return null
  }

  return (
    <section className="al-admin__pictures al-tools" aria-labelledby="orders-title">
      <h2 id="orders-title">Orders</h2>
      <p>Every payment the shop takes, newest first. A test payment is recorded but never orders anything.</p>
      {sending && (
        <p className="al-tools__result" role="status">
          {sending.auto_send
            ? 'Automatic sending is ON: a real payment is sent to Creative Hub as soon as it arrives, and the customer is emailed their confirmation once Creative Hub has accepted it.'
            : `Automatic sending is OFF: a real payment is held here until you press "Send to Creative Hub". The customer is emailed that their payment has arrived, and their confirmation once Creative Hub has accepted the order. To switch it on, set ${sending.setting || 'SEND_ORDERS_AUTOMATICALLY'} to yes in Vercel.`}
        </p>
      )}
      <div className="al-tools__buttons">
        <button type="button" disabled={busy} onClick={load}>{state.phase === 'done' ? 'Refresh orders' : 'Show recent orders'}</button>
        {anySent && <button type="button" disabled={busy} onClick={() => act('refresh')}>Check progress of sent orders</button>}
      </div>
      <p className={`al-admin__fill is-${state.phase}`} role="status">{state.text}</p>
      <p className="al-tools__result" role="status">{flash}</p>

      {state.phase === 'done' && state.orders.length === 0 && <p className="al-tools__result" role="status">No orders yet.</p>}

      {state.phase === 'done' && state.orders.length > 0 && (
        <>
          <p className="al-orders__count">The latest {state.orders.length} {state.orders.length === 1 ? 'order' : 'orders'}</p>
          <ul className="al-orders" aria-label="Orders, newest first">
            {state.orders.map((o) => {
              const address = o.shipping && o.shipping.address
              const items = Array.isArray(o.items) ? o.items : []
              const shown = isStuck(o) ? 'check_creativehub' : o.status
              const total = o.amount_total === null || o.amount_total === undefined ? '' : formatPrice(o.amount_total / 100)
              const buttons = [actions(o), confirmationButton(o), dispatchControl(o)]
              return (
                <li key={o.id} className="al-order">
                  <div className="al-order__head">
                    <h3 className="al-order__when">{when(o.created_at)}{!o.livemode && <span className="al-tools__tag">TEST</span>}</h3>
                    {total && <p className="al-order__total">{total}</p>}
                  </div>
                  <dl className="al-order__facts">
                    <div><dt>Customer</dt><dd>{o.customer_name || 'No name'}<br />{o.customer_email || ''}</dd></div>
                    <div><dt>Delivering to</dt><dd>{address ? [address.city, country(address.country)].filter(Boolean).join(', ') : 'No address'}</dd></div>
                    <div><dt>What</dt><dd>{items.length === 0 ? 'Could not read' : items.map((i, n) => <span key={n} className="al-tools__line">{i.qty} × {i.title}{i.description ? ` (${i.description})` : ''}</span>)}</dd></div>
                  </dl>
                  <div className="al-order__status">
                    <strong className={`al-tools__status is-${shown}`}>{STATUS[shown] || shown}</strong>
                    {o.status === 'sent' && (
                      <small className="al-tools__line">
                        {o.creativehub_order_number ? `Order ${o.creativehub_order_number}` : o.creativehub_order_id ? 'Order number not recorded' : ''}
                        {o.creativehub_status ? `, ${o.creativehub_status}` : ''}
                        {o.creativehub_due ? `, due ${o.creativehub_due}` : ''}
                      </small>
                    )}
                    {isStuck(o) && <><br /><small>This order was never marked as sent and its answer was lost. It may or may not be at Creative Hub.</small></>}
                    {o.note && !isStuck(o) && <><br /><small>{o.note}</small></>}
                    {o.notice_status && (
                      <><br /><small>{NOTICE_NAME[o.notice_kind] || 'Notice email'}: <strong>{NOTICE[o.notice_status] || o.notice_status}</strong>{o.notice_note && o.notice_status !== 'sent' ? `. ${o.notice_note}` : ''}</small></>
                    )}
                    {o.confirmation_status && (
                      <><br /><small>Confirmation email: <strong>{CONFIRMATION[o.confirmation_status] || o.confirmation_status}</strong>{o.confirmation_note && o.confirmation_status !== 'sent' ? `. ${o.confirmation_note}` : ''}</small></>
                    )}
                    {o.dispatch_status && (
                      <><br /><small>Posted email: <strong>{DISPATCH[o.dispatch_status] || o.dispatch_status}</strong>{o.dispatch_note && o.dispatch_status !== 'sent' ? `. ${o.dispatch_note}` : ''}{o.dispatch_status === 'sent' && o.tracking_number ? `. Tracking number ${o.tracking_number}` : ''}</small></>
                    )}
                  </div>
                  {buttons.some(Boolean) && <div className="al-order__actions">{buttons[0]}{buttons[1]}{buttons[2]}</div>}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
