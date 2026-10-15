import { useState } from 'react'
import { checkCreativeHub, checkStripe, fetchDeliveryTable, fetchDeliveryCheck } from './artLoftApi'
import { formatPrice } from './artLoftData'

const ZONE_ORDER = ['uk', 'eu_na', 'row']
const money = (n) => (n === null || n === undefined ? 'n/a' : formatPrice(n))

// A margin, written so it can be read without colour: "62%", or "21% LOW", or "-4% LOSS"
function Margin({ cell }) {
  if (!cell) return <span>n/a</span>
  if (cell.error) return <span>could not check</span>
  return (
    <span className={`al-tools__margin is-${cell.flag}`}>
      {cell.margin_percent}%{cell.flag === 'ok' ? '' : ` ${cell.flag}`}
    </span>
  )
}

export default function DeliveryTools() {
  const [state, setState] = useState({ phase: 'idle', kind: null, data: null, text: '' }) // idle | working | done | error

  async function run(kind, load, working) {
    setState({ phase: 'working', kind, data: null, text: working })
    try {
      const data = await load()
      setState({ phase: 'done', kind, data, text: '' })
    } catch (e) {
      setState({ phase: 'error', kind, data: null, text: e.message })
    }
  }
  const busy = state.phase === 'working'
  const { kind, data } = state

  return (
    <section className="al-admin__pictures al-tools" aria-labelledby="tools-title">
      <h2 id="tools-title">Connections and delivery costs</h2>
      <p>
        Private checks that only you can use. Delivery costs come from Creative Hub's own quotes (free, and nothing is ordered).
      </p>
      <div className="al-tools__buttons">
        <button type="button" disabled={busy} onClick={() => run('creativehub', checkCreativeHub, 'Asking Creative Hub…')}>Check Creative Hub</button>
        <button type="button" disabled={busy} onClick={() => run('stripe', checkStripe, 'Asking Stripe…')}>Check Stripe</button>
        <button type="button" disabled={busy} onClick={() => run('table', fetchDeliveryTable, 'Asking Creative Hub for every size and frame. This takes about half a minute…')}>Delivery costs by size</button>
        <button type="button" disabled={busy} onClick={() => run('spot', fetchDeliveryCheck, 'Asking Creative Hub about 13 countries. This takes about half a minute…')}>Spot-check 13 countries</button>
      </div>

      <p className={`al-admin__fill is-${state.phase}`} role="status">{state.text}</p>

      {state.phase === 'done' && kind === 'creativehub' && (
        <p className="al-tools__result" role="status">
          {data.connected ? 'Connected to Creative Hub.' : 'Not connected.'} {data.message}
        </p>
      )}

      {state.phase === 'done' && kind === 'stripe' && (
        <div className="al-tools__result" role="status">
          <p>
            <strong>{data.connected ? (data.mode === 'live' ? 'Connected: LIVE mode.' : 'Connected: test mode.') : 'Not connected.'}</strong> {data.message}
          </p>
          {data.connected && data.account && (
            <ul>
              <li>Country: {data.account.country || 'not set'}. Currency: {(data.account.currency || 'not set').toUpperCase()}.</li>
              <li>Details submitted to Stripe: {data.account.details_submitted ? 'yes' : 'not yet'}. Can take payments: {data.account.charges_enabled ? 'yes' : 'not yet'}. Payouts enabled: {data.account.payouts_enabled ? 'yes' : 'not yet'}.</li>
            </ul>
          )}
        </div>
      )}

      {state.phase === 'done' && kind === 'table' && (
        <div className="al-tools__result">
          <p role="status">
            {data.summary.worst_margin_percent === null
              ? 'No margins could be worked out.'
              : `Worst case: ${data.summary.worst_case}, keeping ${data.summary.worst_margin_percent}%.`}
            {data.summary.losing_money.length > 0 && ` Losing money on: ${data.summary.losing_money.join('; ')}.`}
            {data.summary.low_margin.length > 0 && ` Under 30%: ${data.summary.low_margin.join('; ')}.`}
            {data.summary.worst_margin_percent !== null && data.summary.losing_money.length === 0 && data.summary.low_margin.length === 0 && ' Nothing is under 30%.'}
          </p>
          <div className="al-tools__scroll">
            <table className="al-tools__table">
              <caption>Delivery you pay, and the margin you keep, if delivery is free</caption>
              <thead>
                <tr>
                  <th scope="col">Size and frame</th>
                  <th scope="col">Your price</th>
                  {ZONE_ORDER.map((key) => {
                    const zone = data.zones.find((z) => z.key === key)
                    return <th key={key} scope="col">{zone.label}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{money(row.your_price)}</td>
                    {ZONE_ORDER.map((key) => (
                      <td key={key}>
                        {row.zones[key].error ? 'could not check' : <>{money(row.zones[key].delivery_you_pay)} delivery<br /><Margin cell={row.zones[key]} /></>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>What this assumes</summary>
            <ul>{data.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          </details>
        </div>
      )}

      {state.phase === 'done' && kind === 'spot' && (
        <div className="al-tools__result">
          <p role="status">
            {data.summary.worst_margin_percent === null
              ? 'No margins could be worked out.'
              : `Worst case: ${data.summary.worst_case}, keeping ${data.summary.worst_margin_percent}%.`}
            {data.summary.losing_money.length > 0 && ` Losing money on: ${data.summary.losing_money.join('; ')}.`}
            {data.summary.low_margin.length > 0 && ` Under 30%: ${data.summary.low_margin.join('; ')}.`}
            {data.summary.could_not_check.length > 0 && ` Could not check: ${data.summary.could_not_check.join('; ')}.`}
            {data.summary.worst_margin_percent !== null && data.summary.losing_money.length === 0 && data.summary.low_margin.length === 0 && ' No country is under 30%.'}
          </p>
          <details>
            <summary>Every country, worst first</summary>
            <div className="al-tools__scroll">
              <table className="al-tools__table">
                <caption>The cheapest and the dearest print, to 13 countries</caption>
                <thead>
                  <tr><th scope="col">Country</th><th scope="col">Print</th><th scope="col">Delivery you pay</th><th scope="col">Margin</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={`${r.country}-${r.print}`}>
                      <th scope="row">{r.country}</th>
                      <td>{r.print}</td>
                      <td>{r.error ? 'could not check' : money(r.delivery_you_pay)}</td>
                      <td>{r.error ? '' : <Margin cell={r} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
