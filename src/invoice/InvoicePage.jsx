import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './invoice.css'

// Whole pence to "£12.34" (an invoice always shows pence).
export const pounds = (pence, currency = 'gbp') => {
  const symbol = String(currency).toLowerCase() === 'gbp' ? '£' : `${String(currency).toUpperCase()} `
  return `${symbol}${((Number(pence) || 0) / 100).toFixed(2)}`
}
const longDate = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

// The invoice itself (the Figma "Invoice page" design). It is also what prints: the buttons and the site menu are hidden on paper.
export function InvoiceDocument({ invoice }) {
  const c = invoice.currency
  return (
    <article className="inv-paper" aria-label={`Invoice ${invoice.number}`}>
      <header className="inv-paper__head pb--starry">
        <div>
          <p className="inv-paper__brand">STARSCAPES FACTORY</p>
          <p className="inv-paper__tag">Stories, art and small adventures</p>
        </div>
        <p className="inv-paper__word">INVOICE</p>
      </header>
      <div className="inv-paper__body">
        {invoice.test && <p className="inv-test">THIS IS A TEST ORDER. No money was taken and nothing will be posted.</p>}
        <div className="inv-meta">
          <div>
            <h2 className="inv-label">Billed to</h2>
            <p className="inv-strong">{invoice.billedTo.name || 'Customer'}</p>
            {invoice.billedTo.email && <p>{invoice.billedTo.email}</p>}
            {invoice.billedTo.address.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          <div>
            <h2 className="inv-label">From</h2>
            <p className="inv-strong">{invoice.from.name}</p>
            <p>{invoice.from.office}</p>
            <p>Company no. {invoice.from.number}</p>
            <p>VAT no. {invoice.from.vat}</p>
          </div>
          <div>
            <h2 className="inv-label">Details</h2>
            <dl className="inv-details">
              <dt>Invoice no.</dt>
              <dd>{invoice.number}</dd>
              <dt>Date</dt>
              <dd>{longDate(invoice.date)}</dd>
              <dt>Payment</dt>
              <dd>Card, via Stripe</dd>
            </dl>
          </div>
        </div>

        <p className="inv-paid">
          <strong>✓ PAID</strong> {pounds(invoice.total, c)} received{invoice.date ? ` on ${longDate(invoice.date)}` : ''}. Nothing more to pay.
        </p>

        <table className="inv-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="inv-num">Qty</th>
              <th scope="col" className="inv-num">Unit</th>
              <th scope="col" className="inv-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, n) => (
              <tr key={`${l.title}-${n}`}>
                <td>
                  <span className="inv-strong">{l.title}</span>
                  {l.details && <span className="inv-sub">{l.details}</span>}
                </td>
                <td className="inv-num">{l.qty}</td>
                <td className="inv-num">{pounds(l.unit, c)}</td>
                <td className="inv-num inv-strong">{pounds(l.amount, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="inv-totals">
          <dt>Subtotal (excl. VAT)</dt>
          <dd>{pounds(invoice.subtotalExVat, c)}</dd>
          <dt>Delivery</dt>
          <dd>Free</dd>
          <dt>VAT 20%</dt>
          <dd>{pounds(invoice.vat, c)}</dd>
          <dt className="inv-grand">Total paid</dt>
          <dd className="inv-grand">{pounds(invoice.total, c)}</dd>
        </dl>

        <div className="inv-note">
          <p className="inv-strong">Thank you for supporting Starscapes Factory.</p>
          <p>Each print is made to order and posted straight to you from the print studio. Your confirmation email has the details of your right to cancel.</p>
        </div>
      </div>
    </article>
  )
}

export default function InvoicePage() {
  const [params] = useSearchParams()
  const id = params.get('session_id') || ''
  const [state, setState] = useState({ status: id ? 'loading' : 'missing', invoice: null, message: '' })

  useEffect(() => {
    document.body.classList.add('sf-print-invoice')
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    return () => {
      document.body.classList.remove('sf-print-invoice')
      robots.remove()
    }
  }, [])

  useEffect(() => {
    if (!id) return undefined
    let alive = true
    fetch(`/api/orders?invoice=${encodeURIComponent(id)}`)
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (!alive) return
        setState(data && data.ok && data.invoice ? { status: 'ready', invoice: data.invoice, message: '' } : { status: 'error', invoice: null, message: (data && data.message) || 'We could not load this invoice.' })
      })
      .catch(() => alive && setState({ status: 'error', invoice: null, message: 'We could not load this invoice. Check your connection and try again.' }))
    return () => {
      alive = false
    }
  }, [id])

  if (state.status === 'missing') {
    return (
      <main className="inv">
        <h1 className="inv-title">Invoice</h1>
        <p>This page needs the link from your confirmation email or your thank-you page.</p>
        <p><Link to="/art-loft">Browse the Art Loft</Link></p>
      </main>
    )
  }
  if (state.status === 'loading') return <main className="inv"><p role="status">Loading your invoice…</p></main>
  if (state.status === 'error') {
    return (
      <main className="inv">
        <h1 className="inv-title">Invoice</h1>
        <p role="alert">{state.message}</p>
      </main>
    )
  }
  return (
    <main className="inv">
      <div className="inv-actions">
        <h1 className="inv-title">Invoice {state.invoice.number}</h1>
        <Link className="inv-btn inv-btn--ghost" to="/art-loft">Back to the Art Loft</Link>
        <button type="button" className="inv-btn" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <InvoiceDocument invoice={state.invoice} />
    </main>
  )
}
