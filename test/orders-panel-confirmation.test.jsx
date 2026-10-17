// The Orders panel: shows whether the confirmation email went, and offers the button only when it did not.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ orders: [], action: vi.fn(async () => ({ ok: true, message: 'The confirmation email has been sent.' })) }))
vi.mock('../src/artloft/artLoftApi', () => ({ fetchOrders: async () => ({ orders: h.orders }) }))
vi.mock('../src/artloft/orderActionsApi', () => ({ orderAction: (...a) => h.action(...a) }))

import OrdersPanel from '../src/artloft/OrdersPanel'

const order = (extra = {}) => ({ id: 'o1', created_at: '2026-10-17T10:00:00Z', status: 'test_not_sent', livemode: false, customer_name: 'Jane Smith', customer_email: 'jane@example.com', shipping: { address: { city: 'Leeds', country: 'GB' } }, amount_total: 8900, items: [{ qty: 1, title: 'Floating', description: '21 × 30 cm, unframed' }], ...extra })
const load = async () => { render(<OrdersPanel />); await userEvent.click(screen.getByRole('button', { name: /show recent orders/i })); await waitFor(() => expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()) }

beforeEach(() => { h.action.mockClear() })

describe('the confirmation email on the Orders panel', () => {
  it('says it was sent, with no button', async () => {
    h.orders = [order({ confirmation_status: 'sent' })]
    await load()
    expect(screen.getByText(/Confirmation email:/)).toHaveTextContent('sent')
    expect(screen.queryByRole('button', { name: /send the confirmation email/i })).toBeNull()
  })
  it('says it failed, why, and offers to send it again, which calls the resend action', async () => {
    h.orders = [order({ confirmation_status: 'failed', confirmation_note: 'Not sent: Resend answered 403.' })]
    await load()
    expect(screen.getByText(/Confirmation email:/)).toHaveTextContent(/FAILED.*Resend answered 403/)
    await userEvent.click(screen.getByRole('button', { name: /send the confirmation email to Jane Smith/i }))
    expect(h.action).toHaveBeenCalledWith('resend_confirmation', { id: 'o1' })
  })
  it('says it was not sent, and offers the button', async () => {
    h.orders = [order({ confirmation_status: 'not_sent', confirmation_note: 'Not sent: RESEND_API_KEY is not set in Vercel.' })]
    await load()
    expect(screen.getByText(/Confirmation email:/)).toHaveTextContent(/NOT SENT/)
    expect(screen.getByRole('button', { name: /send the confirmation email/i })).toBeInTheDocument()
  })
  it('shows nothing about it for an older order that has no record, and no button', async () => {
    h.orders = [order()]
    await load()
    expect(screen.queryByText(/Confirmation email:/)).toBeNull()
    expect(screen.queryByRole('button', { name: /send the confirmation email/i })).toBeNull()
  })
  it('offers no button when there is no email address to send to', async () => {
    h.orders = [order({ customer_email: null, confirmation_status: 'not_sent' })]
    await load()
    expect(screen.queryByRole('button', { name: /send the confirmation email/i })).toBeNull()
  })
})
