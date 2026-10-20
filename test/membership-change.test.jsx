// "Change my passes" (src/membership/ChangePassesPage.jsx).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const store = vi.hoisted(() => ({ open: true }))
const api = vi.hoisted(() => ({ fetchMyMembership: vi.fn(), changePasses: vi.fn() }))
vi.mock('../src/data/membership', () => ({ MEMBERSHIP: { get open() { return store.open }, textWhileClosed: 'A space for people who want to go further in is on its way. It is not open yet.' } }))
vi.mock('../src/membership/membershipApi', () => ({ fetchMyMembership: api.fetchMyMembership, changePasses: api.changePasses }))

import ChangePassesPage, { CHANGE_TERMS } from '../src/membership/ChangePassesPage'
import { CONSENT_TEXT } from '../src/membership/passes'

const future = new Date(Date.now() + 400 * 86400000).toISOString()
const row = (over = {}) => ({ status: 'active', passes: ['authors-notebook', 'blueprints'], billing_interval: 'month', current_period_end: new Date(Date.now() + 3 * 86400000).toISOString(), cancel_at_period_end: false, offer_ends_at: null, offer_note: null, ...over })
const show = (owner = false) => render(<MemoryRouter initialEntries={['/membership/change']}><Routes><Route path="/membership/change" element={<ChangePassesPage owner={owner} />} /><Route path="/membership/passes" element={<p>my passes page</p>} /><Route path="/membership" element={<p>choose page</p>} /></Routes></MemoryRouter>)
const box = (name) => screen.getByRole('checkbox', { name: new RegExp(name) })
const summary = () => screen.getByRole('region', { name: 'Your new price' })
const save = () => screen.getByRole('button', { name: 'Save my passes' })
const ready = async () => { await screen.findByRole('heading', { level: 1, name: 'Change my passes' }) }

beforeEach(() => { store.open = true; api.fetchMyMembership.mockReset(); api.changePasses.mockReset(); api.fetchMyMembership.mockResolvedValue(row()) })

describe('who sees it', () => {
  it('shows a visitor "not open yet" while closed, and the owner the page', async () => {
    store.open = false; show(false); expect(screen.getByRole('heading', { level: 1, name: 'Memberships are not open yet' })).toBeInTheDocument(); expect(api.fetchMyMembership).not.toHaveBeenCalled()
    show(true); await ready()
  })
  it('sends someone with no passes to choose some, and someone whose passes are set to end back to My passes', async () => {
    api.fetchMyMembership.mockResolvedValue(null); const first = show()
    expect(await screen.findByText('You can change your passes once you have some open.')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership'); first.unmount()
    api.fetchMyMembership.mockResolvedValue(row({ cancel_at_period_end: true })); show()
    expect(await screen.findByText(/Your passes are set to end/)).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Back to my passes' })).toHaveAttribute('href', '/membership/passes')
  })
})

describe('the page', () => {
  it('starts with the passes they hold ticked, and the price they pay now', async () => {
    show(); await ready()
    expect(box("The Author's Notebook")).toBeChecked(); expect(box('Blueprints')).toBeChecked(); expect(box('Book Club')).not.toBeChecked(); expect(box('Come Write With Me')).not.toBeChecked()
    expect(within(summary()).getByText('£7 a month')).toBeInTheDocument(); expect(save()).toBeDisabled(); expect(screen.getByText('Tick or untick a pass to change your passes.')).toBeInTheDocument()
  })
  it('shows what adding a pass does to the price, says what is added, and says the change starts today with nothing charged today', async () => {
    show(); await ready(); await userEvent.click(box('Book Club'))
    const s = summary()
    expect(within(s).getByText('From £7 a month to £10 a month')).toBeInTheDocument(); expect(s.textContent).toContain('You are adding Book Club.'); expect(s.textContent).toContain(CHANGE_TERMS)
    expect(CHANGE_TERMS).toBe('The change starts today. Your new price applies from your next payment. Nothing is charged today, and nothing is refunded for a pass you take away.')
  })
  it('shows what removing a pass does, and needs no agreement to remove one', async () => {
    show(); await ready(); await userEvent.click(box('Blueprints'))
    expect(within(summary()).getByText('From £7 a month to £5 a month')).toBeInTheDocument(); expect(summary().textContent).toContain('You are removing Blueprints.')
    expect(screen.queryByRole('checkbox', { name: /Open my passes now/ })).toBeNull(); expect(save()).toBeEnabled()
  })
  it('says the price stays the same when swapping one pass for another', async () => {
    show(); await ready(); await userEvent.click(box('Blueprints')); await userEvent.click(box('Book Club'))
    expect(within(summary()).getByText('Your price stays £7 a month')).toBeInTheDocument(); expect(summary().textContent).toMatch(/You are adding Book Club\. You are removing Blueprints\./)
  })
  it('shows the launch offer prices for someone still on it', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ offer_ends_at: future })); show(); await ready(); await userEvent.click(box('Book Club'))
    expect(within(summary()).getByText('From £3.50 a month to £5 a month')).toBeInTheDocument(); expect(summary().textContent).toMatch(/launch offer carries on/)
  })
  it('works for a yearly member', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ billing_interval: 'year' })); show(); await ready(); await userEvent.click(box('Book Club'))
    expect(within(summary()).getByText('From £70 a year to £100 a year')).toBeInTheDocument()
  })
  it('shows the price table, with the row for the passes they would have in bold', async () => {
    show(); await ready(); const table = screen.getByRole('region', { name: 'Prices' })
    expect(table.querySelector('[aria-current="true"]')).toHaveTextContent('2 passes'); await userEvent.click(box('Book Club')); expect(table.querySelector('[aria-current="true"]')).toHaveTextContent('3 passes')
  })
})

describe('adding needs the agreement; saving', () => {
  it('asks for the same agreement as at checkout, only when a pass is added, and keeps Save greyed out until it is ticked', async () => {
    show(); await ready(); await userEvent.click(box('Book Club'))
    const consent = screen.getByRole('checkbox', { name: /Open my passes now/ })
    expect(consent).not.toBeChecked(); expect(consent.closest('label')).toHaveTextContent(CONSENT_TEXT)
    expect(save()).toBeDisabled(); expect(screen.getByText('Tick the box above to open your new passes.')).toBeInTheDocument()
    await userEvent.click(consent); expect(save()).toBeEnabled()
  })
  it('cannot be saved with no passes (cancelling is done on Stripe\u2019s page)', async () => {
    show(); await ready(); await userEvent.click(box("The Author's Notebook")); await userEvent.click(box('Blueprints'))
    expect(within(summary()).getByText('Choose at least one pass')).toBeInTheDocument(); expect(summary().textContent).toMatch(/Manage payment or cancel/); expect(save()).toBeDisabled()
  })
  it('saves ONLY the passes and the agreement (never a price), then goes back to My passes', async () => {
    api.changePasses.mockResolvedValue({ ok: true }); show(); await ready()
    await userEvent.click(box('Book Club')); await userEvent.click(screen.getByRole('checkbox', { name: /Open my passes now/ })); await userEvent.click(save())
    expect(api.changePasses).toHaveBeenCalledWith({ passes: ['authors-notebook', 'blueprints', 'book-club'], consent: true })
    expect(await screen.findByText('my passes page')).toBeInTheDocument()
  })
  it('sends consent false when only removing', async () => {
    api.changePasses.mockResolvedValue({ ok: true }); show(); await ready(); await userEvent.click(box('Blueprints')); await userEvent.click(save())
    expect(api.changePasses).toHaveBeenCalledWith({ passes: ['authors-notebook'], consent: false })
  })
  it('shows that it is saving, cannot be pressed twice, and says what went wrong kindly', async () => {
    let fail; api.changePasses.mockReturnValue(new Promise((_, reject) => { fail = reject })); show(); await ready()
    await userEvent.click(box('Blueprints')); await userEvent.click(save())
    const busy = screen.getByRole('button', { name: 'Saving…' }); expect(busy).toBeDisabled(); await userEvent.click(busy); expect(api.changePasses).toHaveBeenCalledTimes(1)
    fail(new Error('We could not do that just now. Please try again in a moment.'))
    expect(await screen.findByText('We could not do that just now. Please try again in a moment.')).toBeInTheDocument(); expect(save()).toBeEnabled()
  })
  it('has a Cancel that goes back to My passes without saving', async () => {
    show(); await ready(); expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/membership/passes'); expect(api.changePasses).not.toHaveBeenCalled()
  })
})

describe('only in the last days before the next payment (Gill, 20 October 2026)', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }) })
  afterEach(() => vi.useRealTimers())
  const when = (iso) => vi.setSystemTime(new Date(iso))
  const closed = () => row({ current_period_end: '2026-11-16T10:00:00Z' })
  it('more than 7 days before the next payment it says when changes open, offers no tick boxes and no Save, and goes back to My passes', async () => {
    when('2026-11-01T12:00:00Z'); api.fetchMyMembership.mockResolvedValue(closed()); show(); await ready()
    expect(screen.getByText('You can change your passes in the 7 days before your next payment. Your next payment is on 16 November 2026, so you can change them from 9 November 2026.')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Save my passes' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to my passes' })).toHaveAttribute('href', '/membership/passes')
    expect(screen.getByText(/Manage payment or cancel/)).toBeInTheDocument()
  })
  it('opens at exactly 7 days before and not a minute earlier', async () => {
    when('2026-11-09T09:59:00Z'); api.fetchMyMembership.mockResolvedValue(closed()); const a = show(); await ready()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0); a.unmount()
    when('2026-11-09T10:00:00Z'); api.fetchMyMembership.mockResolvedValue(closed()); show(); await ready()
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })
  it('shows the passes to tick inside the window', async () => {
    when('2026-11-12T12:00:00Z'); api.fetchMyMembership.mockResolvedValue(closed()); show(); await ready()
    expect(box("The Author's Notebook")).toBeChecked(); expect(screen.getByRole('button', { name: 'Save my passes' })).toBeInTheDocument()
  })
  it('is closed for most of the year for a yearly member, with the dates a year ahead', async () => {
    when('2026-11-01T12:00:00Z'); api.fetchMyMembership.mockResolvedValue(row({ billing_interval: 'year', current_period_end: '2027-10-20T10:00:00Z' })); show(); await ready()
    expect(screen.getByText(/Your next payment is on 20 October 2027, so you can change them from 13 October 2027\./)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
  it('is open when the next-payment date is missing, so nobody is locked out by a gap in our records', async () => {
    when('2026-11-01T12:00:00Z'); api.fetchMyMembership.mockResolvedValue(row({ current_period_end: null })); show(); await ready()
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })
  it('still tells a member who has cancelled to start again first (the window does not hide that)', async () => {
    when('2026-11-01T12:00:00Z'); api.fetchMyMembership.mockResolvedValue(row({ cancel_at_period_end: true, current_period_end: '2026-11-16T10:00:00Z' })); show(); await ready()
    expect(screen.getByText(/Start again/)).toBeInTheDocument()
  })
})
