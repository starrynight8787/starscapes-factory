// The Orders panel for a TEST order (Gill, 21 October 2026): a practice cancel-and-refund (so a tester can rehearse the journey) and samples of the two short customer emails.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({
  orders: [],
  action: vi.fn(async (name) => (name === 'sending_state' ? { ok: true, auto_send: false, setting: 'SEND_ORDERS_AUTOMATICALLY' } : { ok: true, message: `Done: ${name}.` })),
}))
vi.mock('../src/artloft/artLoftApi', () => ({ fetchOrders: async () => ({ orders: h.orders }) }))
vi.mock('../src/artloft/orderActionsApi', () => ({ orderAction: (...a) => h.action(...a) }))
import OrdersPanel from '../src/artloft/OrdersPanel'

const testOrder = (extra = {}) => ({
  id: 't1', created_at: new Date().toISOString(), status: 'test_not_sent', livemode: false, stripe_payment_intent: 'pi_test_123', customer_name: 'Terry Tester', customer_email: 'tester@example.com',
  shipping: { address: { city: 'Leeds', country: 'GB' } }, amount_total: 8900, items: [{ qty: 1, title: 'Floating' }], note: 'Test payment. No Creative Hub order is placed for test payments.', ...extra,
})
const liveOrder = (extra = {}) => testOrder({ id: 'l1', livemode: true, status: 'held', stripe_payment_intent: 'pi_live_123', customer_name: 'Lee Live', customer_email: 'lee@example.com', ...extra })
const load = async (name) => { render(<OrdersPanel />); await userEvent.click(screen.getByRole('button', { name: /show recent orders/i })); await waitFor(() => expect(screen.getByText(new RegExp(name))).toBeInTheDocument()) }
const calls = () => h.action.mock.calls.filter(([n]) => n !== 'sending_state')

beforeEach(() => { h.action.mockClear(); h.orders = [testOrder()] })

describe('a TEST order offers practice and samples (and nothing that sends it anywhere)', () => {
  it('has the practice button and the two sample buttons, and no Send to Creative Hub', async () => {
    await load('Terry Tester')
    expect(screen.getByRole('button', { name: /practise cancelling the test order from Terry Tester/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sample of the payment received email/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sample of the order refused email/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send the order from/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /cancel the order from Terry Tester and tell them they have been refunded/i })).toBeNull() // not the real thing
  })
  it('sends a sample of each email, naming the order and the kind, and shows what the server said', async () => {
    await load('Terry Tester')
    await userEvent.click(screen.getByRole('button', { name: /sample of the payment received email/i }))
    expect(calls()).toEqual([['send_sample', { id: 't1', kind: 'received' }]])
    expect(await screen.findByText('Done: send_sample.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /sample of the order refused email/i }))
    expect(calls()).toEqual([['send_sample', { id: 't1', kind: 'received' }], ['send_sample', { id: 't1', kind: 'refused' }]])
  })
  it('offers no samples when the test order has no email address (there is nowhere to send them), but still the practice', async () => {
    h.orders = [testOrder({ customer_email: '' })]
    await load('Terry Tester')
    expect(screen.queryByRole('button', { name: /sample of/i })).toBeNull()
    expect(screen.getByRole('button', { name: /practise cancelling/i })).toBeInTheDocument()
  })
})

describe('the practice cancel and refund', () => {
  it('says it is practice, sends the tester to Stripe\u2019s TEST mode (not live), and does nothing until the box is ticked', async () => {
    await load('Terry Tester')
    await userEvent.click(screen.getByRole('button', { name: /practise cancelling/i }))
    expect(screen.getByText(/This is a TEST payment, so this is practice\. Refund it in Stripe with Test mode switched ON\./)).toBeInTheDocument()
    expect(screen.getByText(/never moves money/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Open this test payment in Stripe \(opens in a new tab\)/ })
    expect(link).toHaveAttribute('href', 'https://dashboard.stripe.com/test/payments/pi_test_123')
    expect(link).toHaveAttribute('target', '_blank'); expect(link.getAttribute('rel')).toMatch(/noopener/)
    const go = screen.getByRole('button', { name: /cancel the test order from Terry Tester and email them/i })
    expect(go).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /I have refunded this test payment in Stripe/ }))
    expect(go).not.toBeDisabled()
    expect(screen.queryByRole('checkbox', { name: /not there/ })).toBeNull() // nothing to look for at Creative Hub on a test order
    await userEvent.click(go)
    expect(calls()).toEqual([['mark_refunded', { id: 't1', confirm_refunded: true }]])
    await waitFor(() => expect(screen.queryByText(/This is a TEST payment, so this is practice/)).toBeNull())
  })
  it('can be backed out of, with nothing sent', async () => {
    await load('Terry Tester')
    await userEvent.click(screen.getByRole('button', { name: /practise cancelling/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: /practise cancelling/i })).toBeInTheDocument(); expect(calls()).toEqual([])
  })
  it('says where to look, with Test mode on, when the payment reference is missing, and offers no broken link', async () => {
    h.orders = [testOrder({ stripe_payment_intent: null })]
    await load('Terry Tester')
    await userEvent.click(screen.getByRole('button', { name: /practise cancelling/i }))
    expect(screen.queryByRole('link', { name: /Stripe/ })).toBeNull()
    expect(screen.getByText(/Find the payment in Stripe, with Test mode on, under Payments/)).toBeInTheDocument()
  })
  it('afterwards shows the order as cancelled and refunded, keeps the sample buttons, and offers no second practice', async () => {
    h.orders = [testOrder({ status: 'refunded', note: 'PRACTICE: cancelled, and refunded in Stripe test mode. A TEST email was sent.' })]
    await load('Terry Tester')
    expect(screen.getByText('Cancelled and refunded')).toBeInTheDocument()
    expect(screen.getByText(/PRACTICE: cancelled, and refunded/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sample of the payment received email/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /practise cancelling/i })).toBeNull()
  })
})

describe('a REAL order is untouched by all this', () => {
  it('has no sample buttons and no practice, keeps the real cancel and refund with the LIVE Stripe link', async () => {
    h.orders = [liveOrder()]
    await load('Lee Live')
    expect(screen.queryByRole('button', { name: /sample of/i })).toBeNull(); expect(screen.queryByRole('button', { name: /practise/i })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Lee Live and tell them they have been refunded/i }))
    expect(screen.getByText(/Refund the payment in Stripe first/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Open this payment in Stripe \(opens in a new tab\)/ })
    expect(link).toHaveAttribute('href', 'https://dashboard.stripe.com/payments/pi_live_123'); expect(link.getAttribute('href')).not.toMatch(/\/test\//)
    expect(screen.queryByText(/this is practice/)).toBeNull()
  })
  it('a test order and a real one side by side each get their own kind of buttons', async () => {
    h.orders = [liveOrder(), testOrder()]
    render(<OrdersPanel />); await userEvent.click(screen.getByRole('button', { name: /show recent orders/i })); await waitFor(() => expect(screen.getByText(/Terry Tester/)).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: /sample of/i })).toHaveLength(2) // only the test order's two
    expect(screen.getByRole('button', { name: /practise cancelling the test order from Terry Tester/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel the order from Lee Live and tell them/i })).toBeInTheDocument()
  })
})
