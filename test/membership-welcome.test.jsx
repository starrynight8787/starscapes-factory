// The welcome page (src/membership/WelcomePage.jsx): it waits for the membership to be recorded, then shows where each pass opens.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const api = vi.hoisted(() => ({ fetchMyMembership: vi.fn() }))
vi.mock('../src/membership/membershipApi', () => ({ fetchMyMembership: api.fetchMyMembership }))

import WelcomePage, { LOOK_EVERY_MS, LOOK_THIS_MANY_TIMES } from '../src/membership/WelcomePage'
import { CONTACT_EMAIL } from '../src/data/contact'

const row = (over = {}) => ({ status: 'active', passes: ['authors-notebook', 'blueprints', 'book-club'], billing_interval: 'month', ...over })
const show = () => render(<MemoryRouter><WelcomePage /></MemoryRouter>)
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0) })
const wait = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

beforeEach(() => { vi.useFakeTimers(); api.fetchMyMembership.mockReset() })
afterEach(() => vi.useRealTimers())

describe('when the membership is there', () => {
  it('welcomes them and shows where each pass they hold opens, and no others', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ passes: ['authors-notebook', 'book-club'] }))
    show(); await settle()
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome. Your passes are open.' })).toBeInTheDocument()
    const cards = screen.getAllByRole('listitem')
    expect(cards.map((c) => within(c).getByRole('heading', { level: 2 }).textContent)).toEqual(["The Author's Notebook", 'Book Club'])
    expect(screen.queryByText('Blueprints')).toBeNull()
  })
  it('links each pass to its own room', async () => {
    api.fetchMyMembership.mockResolvedValue(row())
    show(); await settle()
    expect(screen.getByRole('link', { name: 'Open The Drafting Desk' })).toHaveAttribute('href', '/drafting-desk')
    expect(screen.getByRole('link', { name: 'Open The Factory Floor' })).toHaveAttribute('href', '/factory-floor')
    expect(screen.getByRole('link', { name: /^Open .*Nook$/ })).toHaveAttribute('href', '/knowledge-nook')
  })
  it('also welcomes someone whose first payment is still in a free trial', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ status: 'trialing' }))
    show(); await settle()
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome. Your passes are open.' })).toBeInTheDocument()
  })
})

describe('while the payment is still being recorded', () => {
  it('says it is opening their passes, and keeps looking until the membership appears', async () => {
    api.fetchMyMembership.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue(row())
    show(); await settle()
    expect(screen.getByRole('status')).toBeInTheDocument()
    await wait(LOOK_EVERY_MS); expect(screen.queryByText('Welcome. Your passes are open.')).toBeNull()
    await wait(LOOK_EVERY_MS)
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome. Your passes are open.' })).toBeInTheDocument()
    expect(api.fetchMyMembership).toHaveBeenCalledTimes(3)
  })
  it('keeps looking through a membership that is not paid yet (incomplete)', async () => {
    api.fetchMyMembership.mockResolvedValueOnce(row({ status: 'incomplete' })).mockResolvedValue(row())
    show(); await settle()
    expect(screen.queryByText('Welcome. Your passes are open.')).toBeNull(); expect(screen.getByRole('status')).toBeInTheDocument() // not welcomed on an unpaid membership
    expect(api.fetchMyMembership).toHaveBeenCalledTimes(1)
    await wait(LOOK_EVERY_MS)
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome. Your passes are open.' })).toBeInTheDocument()
  })
  it('treats a failed look as "not yet" and tries again', async () => {
    api.fetchMyMembership.mockRejectedValueOnce(new Error('network')).mockResolvedValue(row())
    show(); await settle(); await wait(LOOK_EVERY_MS)
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome. Your passes are open.' })).toBeInTheDocument()
  })
  it('says it is still confirming after about eighteen seconds, with a way to look again and a way to write to us', async () => {
    api.fetchMyMembership.mockResolvedValue(null)
    show(); await settle(); await wait(LOOK_EVERY_MS * LOOK_THIS_MANY_TIMES)
    expect(screen.getByRole('heading', { level: 1, name: 'We are still confirming your payment' })).toBeInTheDocument()
    expect(api.fetchMyMembership).toHaveBeenCalledTimes(LOOK_THIS_MANY_TIMES)
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`)
    api.fetchMyMembership.mockResolvedValue(row())
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
    await settle()
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome. Your passes are open.' })).toBeInTheDocument()
  })
  it('stops looking when the person leaves the page', async () => {
    api.fetchMyMembership.mockResolvedValue(null)
    const view = show(); await settle()
    const before = api.fetchMyMembership.mock.calls.length
    view.unmount(); await wait(LOOK_EVERY_MS * 5)
    expect(api.fetchMyMembership.mock.calls.length).toBe(before)
  })
})

describe('when the passes are not open', () => {
  it('says so, rather than welcoming them, for a cancelled, unpaid or overdue membership', async () => {
    for (const status of ['canceled', 'unpaid', 'past_due']) {
      api.fetchMyMembership.mockResolvedValue(row({ status }))
      const view = show(); await settle()
      expect(screen.getByRole('heading', { level: 1, name: 'Your passes are not open' }), status).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership')
      expect(screen.queryByText('Welcome. Your passes are open.')).toBeNull()
      view.unmount()
    }
  })
})
