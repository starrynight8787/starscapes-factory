import { useState } from 'react'
import { fetchOrders } from './artLoftApi'
import { formatPrice } from './artLoftData'

const STATUS = {
  test_not_sent: 'Test payment: nothing ordered',
  needs_attention: 'NEEDS ATTENTION',
  sent: 'Sent to Creative Hub',
  paid: 'Paid',
}

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

export default function OrdersPanel() {
  const [state, setState] = useState({ phase: 'idle', orders: [], text: '' })

  async function load() {
    setState({ phase: 'working', orders: [], text: 'Looking up your orders…' })
    try {
      const body = await fetchOrders()
      setState({ phase: 'done', orders: body.orders, text: '' })
    } catch (e) {
      setState({ phase: 'error', orders: [], text: e.message })
    }
  }
  const busy = state.phase === 'working'

  return (
    <section className="al-admin__pictures al-tools" aria-labelledby="orders-title">
      <h2 id="orders-title">Orders</h2>
      <p>Every payment the shop takes, newest first. A test payment is recorded but never orders anything.</p>
      <div className="al-tools__buttons">
        <button type="button" disabled={busy} onClick={load}>{state.phase === 'done' ? 'Refresh orders' : 'Show recent orders'}</button>
      </div>
      <p className={`al-admin__fill is-${state.phase}`} role="status">{state.text}</p>

      {state.phase === 'done' && state.orders.length === 0 && <p className="al-tools__result" role="status">No orders yet.</p>}

      {state.phase === 'done' && state.orders.length > 0 && (
        <div className="al-tools__scroll">
          <table className="al-tools__table">
            <caption>The latest {state.orders.length} {state.orders.length === 1 ? 'order' : 'orders'}</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Customer</th>
                <th scope="col">Delivering to</th>
                <th scope="col">What</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {state.orders.map((o) => {
                const address = o.shipping && o.shipping.address
                const items = Array.isArray(o.items) ? o.items : []
                return (
                  <tr key={o.id}>
                    <th scope="row">{when(o.created_at)}{!o.livemode && <><br /><span className="al-tools__tag">TEST</span></>}</th>
                    <td>{o.customer_name || 'No name'}<br />{o.customer_email || ''}</td>
                    <td>{address ? [address.city, country(address.country)].filter(Boolean).join(', ') : 'No address'}</td>
                    <td>{items.length === 0 ? 'Could not read' : items.map((i, n) => <span key={n} className="al-tools__line">{i.qty} × {i.title}{i.description ? ` (${i.description})` : ''}</span>)}</td>
                    <td>{o.amount_total === null || o.amount_total === undefined ? '' : formatPrice(o.amount_total / 100)}</td>
                    <td>
                      <strong className={`al-tools__status is-${o.status}`}>{STATUS[o.status] || o.status}</strong>
                      {o.note && <><br /><small>{o.note}</small></>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
