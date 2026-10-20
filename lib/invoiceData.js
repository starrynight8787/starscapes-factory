// The invoice for one order: what the customer's invoice page shows. Pure functions, so it can all be tried without a database.
// The page is opened with the Stripe session id from the "thank you" link or the confirmation email. That id is long and cannot be guessed, so it works as the key;
// only what belongs on an invoice is handed back (no phone number, no Creative Hub details, no notes).
import { COMPANY, reference } from './orderEmailText.js'

const clean = (v) => String(v === null || v === undefined ? '' : v).trim()

// Stripe's checkout session ids look like cs_live_a1B2... or cs_test_a1B2...
export const isSessionId = (v) => /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(clean(v))

const countryName = (code) => {
  try {
    return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(String(code).toUpperCase()) : ''
  } catch (e) {
    return clean(code)
  }
}

// Prices already include UK VAT at 20%, so VAT is a sixth of the total. Everything here is whole pence.
export function buildInvoice(order) {
  const o = order || {}
  const items = Array.isArray(o.items) ? o.items : []
  const lines = items.map((i) => {
    const qty = Number(i.qty) || 1
    const unit = Number(i.unit_amount) || 0
    return { title: clean(i.title), details: clean(i.description), qty, unit, amount: unit * qty }
  })
  const summed = lines.reduce((s, l) => s + l.amount, 0)
  const total = Number.isInteger(o.amount_total) ? o.amount_total : summed
  const vat = Math.round(total / 6)
  const ship = o.shipping || {}
  const a = ship.address || {}
  const address = [clean(a.line1), clean(a.line2), clean(a.city), clean(a.state), clean(a.postal_code), countryName(a.country)].filter(Boolean)
  return {
    number: reference(o),
    date: clean(o.created_at),
    test: !o.livemode,
    currency: clean(o.currency) || 'gbp',
    billedTo: { name: clean(o.customer_name || ship.name), email: clean(o.customer_email), address },
    from: { name: COMPANY.name, office: COMPANY.office, vat: COMPANY.vat, number: COMPANY.number },
    lines,
    subtotalExVat: total - vat,
    vat,
    total,
  }
}
