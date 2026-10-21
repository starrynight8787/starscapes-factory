// "My passes" (src/membership/MyPassesPage.jsx): what each kind of member sees.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const store = vi.hoisted(() => ({ open: true }))
const api = vi.hoisted(() => ({ fetchMyMembership: vi.fn(), fetchAccount: vi.fn(), openBillingPortal: vi.fn(), resumePasses: vi.fn(), redirect: vi.fn() }))
vi.mock('../src/data/membership', () => ({ MEMBERSHIP: { get open() { return store.open }, textWhileClosed: 'A space for people who want to go further in is on its way. It is not open yet.' } }))
vi.mock('../src/membership/membershipApi', () => ({ fetchMyMembership: api.fetchMyMembership, fetchAccount: api.fetchAccount, openBillingPortal: api.openBillingPortal, resumePasses: api.resumePasses }))
vi.mock('../src/cart/redirect', () => ({ redirectTo: api.redirect }))
vi.mock('../src/membership/profileApi', () => ({ fetchProfile: vi.fn().mockResolvedValue({ name: '', username: '', icon: '', newsletter: 'none', email: 'a@b.co' }), saveProfile: vi.fn() }))

import MyPassesPage from '../src/membership/MyPassesPage'

const future = new Date(Date.now() + 400 * 86400000).toISOString()
const row = (over = {}) => ({ status: 'active', passes: ['authors-notebook', 'blueprints', 'book-club'], billing_interval: 'month', current_period_end: '2026-11-16T10:00:00Z', cancel_at_period_end: false, offer_ends_at: null, offer_note: null, ...over })
const show = (owner = false, state) => render(<MemoryRouter initialEntries={[{ pathname: '/membership/passes', state }]}><Routes><Route path="/membership/passes" element={<MyPassesPage owner={owner} />} /><Route path="/membership" element={<p>choose page</p>} /></Routes></MemoryRouter>)

beforeEach(() => { store.open = true; Object.values(api).forEach((f) => f.mockReset()); api.fetchAccount.mockResolvedValue({ card: null }) })

describe('who sees it', () => {
  it('shows a visitor the "not open yet" message while memberships are closed, and never reads anything', () => {
    store.open = false; show(false)
    expect(screen.getByRole('heading', { level: 1, name: 'Memberships are not open yet' })).toBeInTheDocument(); expect(api.fetchMyMembership).not.toHaveBeenCalled()
  })
  it('shows the owner their own passes even while closed', async () => {
    store.open = false; api.fetchMyMembership.mockResolvedValue(row()); show(true)
    expect(await screen.findByRole('heading', { level: 1, name: 'My passes' })).toBeInTheDocument()
  })
  it('says kindly, with a way to try again, when it cannot find the passes', async () => {
    api.fetchMyMembership.mockRejectedValueOnce(new Error('permission denied')).mockResolvedValue(row()); show()
    expect(await screen.findByText(/could not find your passes just now/)).toBeInTheDocument(); expect(screen.queryByText(/permission denied/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Open now')).toBeInTheDocument()
  })
})

describe('someone holding passes', () => {
  it('shows how many, what they pay, when the next payment is, and the card', async () => {
    api.fetchMyMembership.mockResolvedValue(row()); api.fetchAccount.mockResolvedValue({ card: { brand: 'visa', last4: '4242' } }); show()
    const box = await screen.findByRole('region', { name: 'Your membership' })
    expect(within(box).getByText('3 passes')).toBeInTheDocument(); expect(within(box).getByText('£10 a month')).toBeInTheDocument()
    expect(await within(box).findByText('Next payment on 16 November 2026. Card ending 4242.')).toBeInTheDocument()
  })
  it('says "1 pass" for one, and shows the next payment without a card if there is none to show', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ passes: ['blueprints'] })); show()
    const box = await screen.findByRole('region', { name: 'Your membership' })
    expect(within(box).getByText('1 pass')).toBeInTheDocument(); expect(within(box).getByText('£5 a month')).toBeInTheDocument(); expect(within(box).getByText('Next payment on 16 November 2026.')).toBeInTheDocument()
  })
  it('shows a launch offer\u2019s price and when it ends, and a promo code\u2019s discount by name', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ offer_ends_at: future })); show()
    const box = await screen.findByRole('region', { name: 'Your membership' })
    expect(within(box).getByText('£5 a month')).toBeInTheDocument(); expect(within(box).getByText(/^Launch offer until .* 20\d\d, then £10 a month\.$/)).toBeInTheDocument()
    api.fetchMyMembership.mockResolvedValue(row({ offer_note: '20% off for 3 months' })); show()
    expect(await screen.findByText('Your discount: 20% off for 3 months.')).toBeInTheDocument()
  })
  it('lists the passes that are open, and the ones that are not', async () => {
    api.fetchMyMembership.mockResolvedValue(row()); show()
    const open = (await screen.findByText('Open now')).nextElementSibling; const closed = screen.getByText('Not open').nextElementSibling
    expect(open.textContent).toMatch(/The Author's Notebook/); expect(open.textContent).toMatch(/Blueprints/); expect(open.textContent).toMatch(/Book Club/); expect(open.textContent).not.toMatch(/Come Write/)
    expect(closed.textContent).toMatch(/Early drafts/); expect(closed.textContent).toMatch(/Come Write With Me/)
  })
  it('leaves out the "Not open" list for someone with every pass', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ passes: ['authors-notebook', 'early-drafts', 'come-write-with-me', 'blueprints', 'book-club'] })); show()
    await screen.findByText('Open now'); expect(screen.queryByText('Not open')).toBeNull()
  })
  it('links to Change my passes, and says what Manage payment or cancel does', async () => {
    api.fetchMyMembership.mockResolvedValue(row()); show()
    expect(await screen.findByRole('link', { name: 'Change my passes' })).toHaveAttribute('href', '/membership/change')
    expect(screen.getByText(/Manage payment or cancel opens Stripe, where you can change your card, see receipts, or cancel\. If you cancel, you keep your passes until the end of what you have paid for\./)).toBeInTheDocument()
  })
  it('takes them to Stripe\u2019s page for the card and cancelling', async () => {
    api.fetchMyMembership.mockResolvedValue(row()); api.openBillingPortal.mockResolvedValue('https://billing.stripe.com/p/session/x'); show()
    await userEvent.click(await screen.findByRole('button', { name: 'Manage payment or cancel' }))
    expect(api.redirect).toHaveBeenCalledWith('https://billing.stripe.com/p/session/x')
  })
  it('says what went wrong, kindly, if the billing page cannot be opened, and lets them try again', async () => {
    api.fetchMyMembership.mockResolvedValue(row()); api.openBillingPortal.mockRejectedValue(new Error("The page for changing your card isn't switched on yet. We're sorting it out."))
    show(); await userEvent.click(await screen.findByRole('button', { name: 'Manage payment or cancel' }))
    expect(await screen.findByText(/isn't switched on yet/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Manage payment or cancel' })).toBeEnabled(); expect(api.redirect).not.toHaveBeenCalled()
  })
  it('says their passes are changed, after a change', async () => {
    api.fetchMyMembership.mockResolvedValue(row()); show(false, { changed: true })
    expect(await screen.findByText('Your passes are changed. Your new price starts from your next payment.')).toBeInTheDocument()
  })
})

describe('someone who has cancelled but whose passes are still open', () => {
  it('says so, with the date, and offers to start again (which takes the cancellation back)', async () => {
    api.fetchMyMembership.mockResolvedValueOnce(row({ cancel_at_period_end: true })).mockResolvedValue(row()); api.resumePasses.mockResolvedValue({ ok: true }); show()
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Your passes are cancelled. They stay open until 16 November 2026, and you will not be charged again.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Start again' }))
    expect(api.resumePasses).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Open now')).toBeInTheDocument() // back to the ordinary view
  })
  it('says what went wrong if starting again does not work', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ cancel_at_period_end: true })); api.resumePasses.mockRejectedValue(new Error('There is nothing to take back.'))
    show(); await userEvent.click(await screen.findByRole('button', { name: 'Start again' }))
    expect(await screen.findByText('There is nothing to take back.')).toBeInTheDocument()
  })
})

describe('the other views', () => {
  it('shows a free member the short page, with the passes named (all five) and a link to choose', async () => {
    api.fetchMyMembership.mockResolvedValue(null); show()
    expect(await screen.findByRole('heading', { level: 1, name: 'My membership' })).toBeInTheDocument()
    expect(screen.getByText('Free member')).toBeInTheDocument(); expect(screen.getByText('You can read every public entry.')).toBeInTheDocument()
    expect(screen.getByText("Passes start at £5 a month: The Author's Notebook, Early drafts and book background, Come Write With Me, Blueprints, and Book Club.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership')
  })
  it('treats a payment that never finished as no membership', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ status: 'incomplete' })); show()
    expect(await screen.findByRole('heading', { level: 1, name: 'My membership' })).toBeInTheDocument()
  })
  it('says passes have ended, with the date once that date has passed, and offers to choose again', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ status: 'canceled', current_period_end: '2026-09-16T10:00:00Z' })); show()
    expect(await screen.findByText('Ended')).toBeInTheDocument(); expect(screen.getByText(/Your passes ended on 16 September 2026\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership')
  })
  it('does not name a date in the future as the day passes ended (a subscription ended early still has its old renewal date on record)', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ status: 'canceled', current_period_end: future })); show()
    expect(await screen.findByText('Ended')).toBeInTheDocument(); expect(screen.getByText(/Your passes have ended\./)).toBeInTheDocument(); expect(screen.queryByText(/ended on/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Choose your passes' })).toHaveAttribute('href', '/membership')
  })
  it('says only that they have ended when no date is on record', async () => {
    api.fetchMyMembership.mockResolvedValue(row({ status: 'canceled', current_period_end: null })); show()
    expect(await screen.findByText(/Your passes have ended\./)).toBeInTheDocument()
  })
  it('tells someone whose payment failed, and lets them fix their card on Stripe', async () => {
    for (const status of ['past_due', 'unpaid']) {
      api.fetchMyMembership.mockResolvedValue(row({ status })); api.openBillingPortal.mockResolvedValue('https://billing.stripe.com/p/session/y'); const view = show()
      expect(await screen.findByText('Payment needed')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Manage payment or cancel' })); expect(api.redirect).toHaveBeenLastCalledWith('https://billing.stripe.com/p/session/y')
      view.unmount()
    }
  })
  it('does not even ask Stripe about the card for someone with no open passes', async () => {
    api.fetchMyMembership.mockResolvedValue(null); show(); await screen.findByText('Free member'); expect(api.fetchAccount).not.toHaveBeenCalled()
    await waitFor(() => expect(api.fetchMyMembership).toHaveBeenCalled())
  })
})
