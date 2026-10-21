// The Orders panel shows each order as a card, not a row of a wide table that ran off the edge of the screen (Gill, 20 October 2026).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ orders: [], action: vi.fn(async () => ({ ok: true, message: 'Done.' })) }))
vi.mock('../src/artloft/artLoftApi', () => ({ fetchOrders: async () => ({ orders: h.orders }) }))
vi.mock('../src/artloft/orderActionsApi', () => ({ orderAction: (...a) => h.action(...a) }))
import OrdersPanel from '../src/artloft/OrdersPanel'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const order = (extra = {}) => ({ id: 'o1', created_at: '2026-10-20T18:33:00Z', status: 'test_not_sent', livemode: false, customer_name: 'jane doe', customer_email: 'jane@example.com', shipping: { address: { city: 'Cambridge', country: 'GB' } }, amount_total: 8900, items: [{ qty: 1, title: 'Afternoon Sun', description: '21 × 30 cm, unframed' }], ...extra })
const load = async () => { render(<OrdersPanel />); await userEvent.click(screen.getByRole('button', { name: /show recent orders/i })); await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)) }
const cards = () => screen.getByRole('list', { name: 'Orders, newest first' }).querySelectorAll(':scope > li')
beforeEach(() => { h.action.mockClear() })

describe('an order card', () => {
  it('is a list of cards, not a table', async () => {
    h.orders = [order(), order({ id: 'o2', customer_name: 'Sam Lee' })]; await load()
    expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryAllByRole('columnheader')).toHaveLength(0); expect(cards()).toHaveLength(2)
    expect(screen.getByText('The latest 2 orders')).toBeInTheDocument()
  })
  it('shows the day, the TEST tag, the total, the customer, the place, what was ordered and the status, all in one card', async () => {
    h.orders = [order()]; await load()
    const card = within(cards()[0])
    expect(card.getByRole('heading', { level: 3 })).toHaveTextContent(/20 Oct/); expect(card.getByText('TEST')).toBeInTheDocument(); expect(card.getByText('£89')).toBeInTheDocument()
    expect(card.getByText('Customer').nextElementSibling).toHaveTextContent('jane doe'); expect(card.getByText('Customer').nextElementSibling).toHaveTextContent('jane@example.com')
    expect(card.getByText('Delivering to').nextElementSibling).toHaveTextContent('Cambridge, United Kingdom')
    expect(card.getByText('What').nextElementSibling).toHaveTextContent('1 × Afternoon Sun (21 × 30 cm, unframed)')
    expect(card.getByText('Test payment: nothing ordered')).toBeInTheDocument()
  })
  it('has no TEST tag for a real order, and says where Creative Hub has got to', async () => {
    h.orders = [order({ livemode: true, status: 'sent', creativehub_order_id: 'c1', creativehub_order_number: 'CH-7', creativehub_status: 'In production', creativehub_due: '28 Oct' })]; await load()
    const card = within(cards()[0]); expect(card.queryByText('TEST')).toBeNull(); expect(card.getByText('Sent to Creative Hub')).toBeInTheDocument(); expect(card.getByText(/Order CH-7, In production, due 28 Oct/)).toBeInTheDocument()
    expect(card.getByRole('button', { name: /refresh status of the order from jane doe/i })).toBeInTheDocument()
  })
  it('puts a button in the card of the order it belongs to, and acts on that order only', async () => {
    h.orders = [order({ id: 'o1', confirmation_status: 'sent' }), order({ id: 'o2', customer_name: 'Sam Lee', customer_email: 'sam@example.com', confirmation_status: 'failed', confirmation_note: 'Not sent: Resend answered 403.' })]; await load()
    expect(within(cards()[0]).queryByRole('button', { name: /send the confirmation email/i })).toBeNull() // its confirmation went, so no such button (a test order has its own practice and sample buttons)
    await userEvent.click(within(cards()[1]).getByRole('button', { name: /send the confirmation email to Sam Lee/i }))
    expect(h.action).toHaveBeenCalledWith('resend_confirmation', { id: 'o2' })
  })
  it('shows the email notes inside the card', async () => {
    h.orders = [order({ confirmation_status: 'failed', confirmation_note: 'Not sent: Resend answered 403.', dispatch_status: 'not_sent' })]; await load()
    const card = within(cards()[0]); expect(card.getByText(/Confirmation email:/)).toHaveTextContent(/FAILED.*Resend answered 403/); expect(card.getByText(/Posted email:/)).toHaveTextContent('NOT SENT')
  })
  it('says plainly when something is missing, and leaves out an unknown total', async () => {
    h.orders = [order({ customer_name: '', customer_email: '', shipping: null, items: [], amount_total: null })]; await load()
    const card = within(cards()[0]); expect(card.getByText('Customer').nextElementSibling).toHaveTextContent('No name'); expect(card.getByText('Delivering to').nextElementSibling).toHaveTextContent('No address'); expect(card.getByText('What').nextElementSibling).toHaveTextContent('Could not read')
    expect(card.queryByText(/£/)).toBeNull()
  })
  it('says no orders yet, and shows no list, when there are none', async () => {
    h.orders = []; render(<OrdersPanel />); await userEvent.click(screen.getByRole('button', { name: /show recent orders/i }))
    expect(await screen.findByText('No orders yet.')).toBeInTheDocument(); expect(screen.queryByRole('list', { name: 'Orders, newest first' })).toBeNull()
  })
})

describe('how it is laid out', () => {
  const css = read('src/artloft/artloft.css')
  it('fits any width: the details wrap into columns as room allows, long words break, and nothing scrolls sideways', () => {
    expect(css).toMatch(/\.al-order__facts \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(190px, 1fr\)\)/); expect(css).toMatch(/\.al-order__facts dd \{[^}]*overflow-wrap: anywhere/)
    expect(css).toMatch(/\.al-order \{[^}]*min-width: 0/); expect(css).toMatch(/\.al-order__actions \{[^}]*flex-wrap: wrap/)
    const block = css.slice(css.indexOf('.al-orders {'), css.indexOf('.al-order__actions'))
    expect(block).not.toMatch(/overflow-x|white-space: nowrap|min-width: [2-9]\d\d/)
  })
  it('does not use a table any more for the orders, and keeps the table styles for the other tool that uses them', () => {
    expect(read('src/artloft/OrdersPanel.jsx')).not.toMatch(/<table|<thead|<tbody|<tr[ >]/); expect(css).toMatch(/\.al-tools__table \{/)
  })
})
