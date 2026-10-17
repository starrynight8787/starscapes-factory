// The Orders panel: the posted email's status, and its small form.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ orders: [], action: vi.fn(async () => ({ ok: true, message: 'The posted email has been sent.' })) }))
vi.mock('../src/artloft/artLoftApi', () => ({ fetchOrders: async () => ({ orders: h.orders }) }))
vi.mock('../src/artloft/orderActionsApi', () => ({ orderAction: (...a) => h.action(...a) }))

import OrdersPanel from '../src/artloft/OrdersPanel'

const order = (extra = {}) => ({ id: 'o1', created_at: '2026-10-17T10:00:00Z', status: 'sent', creativehub_order_id: 'c1', livemode: true, customer_name: 'Jane Smith', customer_email: 'jane@example.com', shipping: { address: { city: 'Leeds', country: 'GB' } }, amount_total: 8900, items: [{ qty: 1, title: 'Floating', description: '21 × 30 cm, unframed' }], dispatch_status: null, ...extra })
const load = async () => { render(<OrdersPanel />); await userEvent.click(screen.getByRole('button', { name: /show recent orders/i })); await waitFor(() => expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()) }
beforeEach(() => h.action.mockClear())

describe('the posted email on the Orders panel', () => {
  it('offers a button for an order with Creative Hub, and the form sends the tracking typed in', async () => {
    h.orders = [order()]
    await load()
    await userEvent.click(screen.getByRole('button', { name: /send the posted email to Jane Smith/i }))
    await userEvent.type(screen.getByLabelText(/tracking link/i), 'https://t.example.com/x')
    await userEvent.type(screen.getByLabelText(/tracking number/i), 'AB123')
    await userEvent.click(screen.getByRole('button', { name: /send it now/i }))
    expect(h.action).toHaveBeenCalledWith('send_dispatch', { id: 'o1', tracking_url: 'https://t.example.com/x', tracking_number: 'AB123' })
  })
  it('can be cancelled without sending anything', async () => {
    h.orders = [order()]
    await load()
    await userEvent.click(screen.getByRole('button', { name: /send the posted email/i }))
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(h.action).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /send the posted email/i })).toBeInTheDocument()
  })
  it('says it was sent (with the tracking number), and offers no button', async () => {
    h.orders = [order({ dispatch_status: 'sent', tracking_number: 'AB123' })]
    await load()
    expect(screen.getByText(/Posted email:/)).toHaveTextContent(/sent.*Tracking number AB123/)
    expect(screen.queryByRole('button', { name: /send the posted email/i })).toBeNull()
  })
  it('says it failed and why, and still offers the button', async () => {
    h.orders = [order({ dispatch_status: 'failed', dispatch_note: 'Not sent: Resend answered 403.' })]
    await load()
    expect(screen.getByText(/Posted email:/)).toHaveTextContent(/FAILED.*Resend answered 403/)
    expect(screen.getByRole('button', { name: /send the posted email/i })).toBeInTheDocument()
  })
  it('offers no button for a real order that is not yet with Creative Hub (it cannot have been posted)', async () => {
    h.orders = [order({ status: 'needs_attention' })]
    await load()
    expect(screen.queryByRole('button', { name: /send the posted email/i })).toBeNull()
  })
  it('offers no button before the SQL has been run (the order has no dispatch_status at all)', async () => {
    const { dispatch_status, ...without } = order()
    h.orders = [without]
    await load()
    expect(screen.queryByRole('button', { name: /send the posted email/i })).toBeNull()
  })
  it('offers no button when there is no email address to send to', async () => {
    h.orders = [order({ customer_email: null })]
    await load()
    expect(screen.queryByRole('button', { name: /send the posted email/i })).toBeNull()
  })
  it('offers it for a test order that was never sent to Creative Hub, so the email can be tried', async () => {
    h.orders = [order({ livemode: false, status: 'test_not_sent' })]
    await load()
    expect(screen.getByRole('button', { name: /send the posted email/i })).toBeInTheDocument()
  })
})
