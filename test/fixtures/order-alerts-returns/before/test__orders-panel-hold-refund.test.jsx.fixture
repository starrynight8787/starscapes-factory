// The Orders panel for a held order and for an order that cannot be made (Gill, 21 October 2026): whether automatic sending is on, HELD, Send, and "Cancel and refund".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({
  orders: [],
  state: { ok: true, auto_send: false, setting: 'SEND_ORDERS_AUTOMATICALLY', email_problems: [] },
  stateFails: false,
  action: vi.fn(async (name) => (name === 'sending_state' ? h.state : { ok: true, message: 'Done.' })),
}))
vi.mock('../src/artloft/artLoftApi', () => ({ fetchOrders: async () => ({ orders: h.orders }) }))
vi.mock('../src/artloft/orderActionsApi', () => ({
  orderAction: (...a) => { if (a[0] === 'sending_state' && h.stateFails) return Promise.reject(new Error('no')); return h.action(...a) },
}))
import OrdersPanel from '../src/artloft/OrdersPanel'

const MIN = 60 * 1000
const order = (extra = {}) => ({
  id: 'o1', created_at: new Date(Date.now() - 2 * MIN).toISOString(), status: 'held', livemode: true, stripe_payment_intent: 'pi_123ABC', customer_name: 'Jane Smith', customer_email: 'jane@example.com',
  shipping: { address: { city: 'Leeds', country: 'GB' } }, amount_total: 8900, items: [{ qty: 1, title: 'Floating' }], note: 'Held: automatic sending is switched off, so this paid order is waiting for your OK.', ...extra,
})
const load = async () => { render(<OrdersPanel />); await userEvent.click(screen.getByRole('button', { name: /show recent orders/i })); await waitFor(() => expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()) }
const actionCalls = () => h.action.mock.calls.filter(([name]) => name !== 'sending_state')

beforeEach(() => { h.state = { ok: true, auto_send: false, setting: 'SEND_ORDERS_AUTOMATICALLY', email_problems: [] }; h.stateFails = false; h.action.mockClear(); h.orders = [order()] })

describe('whether automatic sending is on', () => {
  it('says it is OFF, what that means for the customer, and how to switch it on', async () => {
    await load()
    const line = await screen.findByText(/Automatic sending is OFF/)
    expect(line).toHaveTextContent(/held here until you press "Send to Creative Hub"/)
    expect(line).toHaveTextContent(/emailed that their payment has arrived, and their confirmation once Creative Hub has accepted/)
    expect(line).toHaveTextContent(/set SEND_ORDERS_AUTOMATICALLY to yes in Vercel/)
  })
  it('says it is ON, and that the confirmation follows Creative Hub accepting the order', async () => {
    h.state = { ok: true, auto_send: true, setting: 'SEND_ORDERS_AUTOMATICALLY' }
    await load()
    const line = await screen.findByText(/Automatic sending is ON/)
    expect(line).toHaveTextContent(/sent to Creative Hub as soon as it arrives/); expect(line).toHaveTextContent(/confirmation once Creative Hub has accepted it/)
    expect(screen.queryByText(/Automatic sending is OFF/)).toBeNull()
  })
  it('still shows the orders, and says nothing misleading, when the state cannot be read', async () => {
    h.stateFails = true
    await load()
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()
    expect(screen.queryByText(/Automatic sending is/)).toBeNull()
  })
  it('no longer says every real payment is sent as soon as it arrives (that is only true when it is switched on)', async () => {
    await load()
    expect(screen.queryByText(/A real payment is sent to Creative Hub as soon as it arrives\.$/)).toBeNull()
  })
})

describe('a HELD order', () => {
  it('is labelled, explained, and offers Send and Cancel and refund', async () => {
    await load()
    expect(screen.getByText('HELD: WAITING FOR YOUR OK')).toBeInTheDocument()
    expect(screen.getByText(/waiting for your OK/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send the order from Jane Smith to Creative Hub/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel the order from Jane Smith and tell them they have been refunded/i })).toBeInTheDocument()
  })
  it('sends only after "Yes, send it"', async () => {
    await load()
    await userEvent.click(screen.getByRole('button', { name: /send the order from Jane Smith/i }))
    expect(actionCalls()).toEqual([])
    expect(screen.getByText(/Send this order to Creative Hub now\? It will be made and charged/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Yes, send it' }))
    expect(actionCalls()).toEqual([['send', { id: 'o1' }]])
  })
})

describe('Cancel and refund', () => {
  it('first sends the owner to refund in Stripe (a link straight to the payment), says the site never moves money, and does nothing until she ticks that she has', async () => {
    await load()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    expect(screen.getByText(/Refund the payment in Stripe first/)).toBeInTheDocument()
    expect(screen.getByText(/never moves money/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Open this payment in Stripe \(opens in a new tab\)/ })
    expect(link).toHaveAttribute('href', 'https://dashboard.stripe.com/payments/pi_123ABC')
    expect(link).toHaveAttribute('target', '_blank'); expect(link.getAttribute('rel')).toMatch(/noopener/)
    const go = screen.getByRole('button', { name: /cancel the order from Jane Smith and email them/i })
    expect(go).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /I have refunded this payment in Stripe/ }))
    expect(go).not.toBeDisabled()
    expect(screen.queryByRole('checkbox', { name: /not there/ })).toBeNull() // only for an order whose answer was lost
    await userEvent.click(go)
    expect(actionCalls()).toEqual([['mark_refunded', { id: 'o1', confirm_refunded: true }]])
  })
  it('can be backed out of, and nothing is sent', async () => {
    await load()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByText(/Refund the payment in Stripe first/)).toBeNull()
    expect(screen.getByRole('button', { name: /cancel the order from Jane Smith and tell them/i })).toBeInTheDocument()
    expect(actionCalls()).toEqual([])
  })
  it('closes the block again after it has been done', async () => {
    await load()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /I have refunded this payment in Stripe/ }))
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith and email them/i }))
    await waitFor(() => expect(screen.queryByText(/Refund the payment in Stripe first/)).toBeNull())
  })
  it('starts unticked every time it is opened (a tick from before is never carried over)', async () => {
    await load()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /I have refunded this payment in Stripe/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    expect(screen.getByRole('checkbox', { name: /I have refunded this payment in Stripe/ })).not.toBeChecked()
  })
  it('says where to look when the payment reference is missing, and offers no broken link', async () => {
    h.orders = [order({ stripe_payment_intent: null })]
    await load()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    expect(screen.queryByRole('link', { name: /Stripe/ })).toBeNull()
    expect(screen.getByText(/Find the payment in Stripe, under Payments/)).toBeInTheDocument()
  })
  it('is offered for an order Creative Hub refused (needs attention) too, next to Send', async () => {
    h.orders = [order({ status: 'needs_attention', note: 'Creative Hub refused the order as it was sent.' })]
    await load()
    expect(screen.getByRole('button', { name: /send the order from Jane Smith/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /I have refunded this payment in Stripe/ }))
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith and email them/i }))
    expect(actionCalls()).toEqual([['mark_refunded', { id: 'o1', confirm_refunded: true }]])
  })
  it('for an order whose answer from Creative Hub was lost, also needs her to tick that she has looked and it is not there', async () => {
    h.orders = [order({ status: 'check_creativehub', note: 'Could not tell whether Creative Hub received this order.' })]
    await load()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    const go = screen.getByRole('button', { name: /cancel the order from Jane Smith and email them/i })
    await userEvent.click(screen.getByRole('checkbox', { name: /I have refunded this payment in Stripe/ }))
    expect(go).toBeDisabled() // refunded, but not yet looked
    await userEvent.click(screen.getByRole('checkbox', { name: /I have looked at Creative Hub, and this order is not there/ }))
    expect(go).not.toBeDisabled()
    await userEvent.click(go)
    expect(actionCalls()).toEqual([['mark_refunded', { id: 'o1', confirm_refunded: true, confirm_not_there: true }]])
  })
  it('treats an order stuck "sending" for ten minutes the same way (its answer was lost)', async () => {
    h.orders = [order({ status: 'sending', created_at: new Date(Date.now() - 10 * MIN).toISOString() })]
    await load()
    await userEvent.click(screen.getByRole('button', { name: /cancel the order from Jane Smith/i }))
    expect(screen.getByRole('checkbox', { name: /not there/ })).toBeInTheDocument()
  })
  it('is NOT offered for an order already with Creative Hub, a refunded one, one still being sent, or a test payment', async () => {
    for (const o of [
      order({ status: 'sent', creativehub_order_id: 'ch1', creativehub_order_number: 'N1' }),
      order({ status: 'refunded' }),
      order({ status: 'sending', created_at: new Date(Date.now() - 30 * 1000).toISOString() }),
      order({ status: 'test_not_sent', livemode: false }),
    ]) {
      h.orders = [o]
      const { unmount } = render(<OrdersPanel />)
      await userEvent.click(screen.getByRole('button', { name: /show recent orders/i }))
      await waitFor(() => expect(screen.getByText(/Jane Smith/)).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: /cancel the order from/i }), o.status).toBeNull()
      unmount()
    }
  })
})

describe('the new statuses and notices', () => {
  it('shows a refunded order plainly, with no buttons to send or cancel it again', async () => {
    h.orders = [order({ status: 'refunded', note: 'Cancelled, and refunded in Stripe by you. The customer is told.' })]
    await load()
    expect(screen.getByText('Cancelled and refunded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send the order/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /cancel the order/i })).toBeNull()
  })
  it.each([
    ['received', 'sent', /Payment-received email:.*sent/],
    ['refused', 'sent', /Refund email:.*sent/],
    ['received', 'failed', /Payment-received email:.*FAILED.*Resend answered 403/],
    ['refused', 'not_sent', /Refund email:.*NOT SENT.*Resend answered 403/],
  ])('says whether the %s notice went (%s), with the reason when it did not', async (kind, status, pattern) => {
    h.orders = [order({ notice_kind: kind, notice_status: status, notice_note: status === 'sent' ? null : 'Not sent: Resend answered 403.' })]
    await load()
    expect(screen.getByText(/(Payment-received|Refund) email:/)).toHaveTextContent(pattern)
  })
  it('shows nothing about notices for an older order that has none', async () => {
    await load()
    expect(screen.queryByText(/(Payment-received|Refund) email:/)).toBeNull()
  })
  it('gives the owner the Send-confirmation button only when the confirmation did not go (unchanged), alongside the new buttons', async () => {
    h.orders = [order({ status: 'sent', creativehub_order_id: 'ch1', confirmation_status: 'failed', confirmation_note: 'Not sent: x' })]
    await load()
    expect(screen.getByRole('button', { name: /send the confirmation email to Jane Smith/i })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: /orders/i })).queryByRole('button', { name: /cancel the order/i })).toBeNull()
  })
})
