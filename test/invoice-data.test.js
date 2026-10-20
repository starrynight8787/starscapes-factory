import { describe, it, expect } from 'vitest'
import { buildInvoice, isSessionId } from '../lib/invoiceData.js'
import { buildConfirmation, invoiceLink } from '../lib/orderEmailText.js'

const order = { stripe_session_id: 'cs_test_a1B2c3D4e5F6g7H8', livemode: false, customer_name: 'Alex Sample', customer_email: 'a@example.com', customer_phone: '07000', created_at: '2026-10-20T10:00:00Z', amount_total: 2500, currency: 'gbp', creativehub_order_id: 'x', note: 'secret', items: [{ title: 'Print', description: 'A4', qty: 1, unit_amount: 2500 }], shipping: { name: 'Alex', address: { line1: '1 Road', city: 'Leeds', postal_code: 'LS1', country: 'GB' } } }

describe('invoice data', () => {
  it('works out VAT as a sixth of the total, in whole pence', () => {
    const inv = buildInvoice(order)
    expect(inv.total).toBe(2500)
    expect(inv.vat).toBe(417)
    expect(inv.subtotalExVat + inv.vat).toBe(inv.total)
    expect(inv.number).toMatch(/^SF-/)
    expect(inv.test).toBe(true)
  })
  it('hands back only what belongs on an invoice', () => {
    const text = JSON.stringify(buildInvoice(order))
    expect(text).not.toMatch(/07000|secret|creativehub/)
  })
  it('only accepts real-looking Stripe session ids', () => {
    expect(isSessionId('cs_test_a1B2c3D4e5F6g7H8')).toBe(true)
    expect(isSessionId('x or 1=1')).toBe(false)
    expect(isSessionId('')).toBe(false)
  })
  it('puts the invoice link in the confirmation email only for a real session id', () => {
    expect(invoiceLink(order)).toContain('/invoice?session_id=cs_test_')
    expect(buildConfirmation(order).html).toContain('View or print your invoice')
    expect(invoiceLink({ ...order, stripe_session_id: 'nope' })).toBe('')
  })
})
