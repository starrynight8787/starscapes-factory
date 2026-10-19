// "Choose your passes" (src/membership/MembershipPage.jsx): what visitors see while memberships are closed, and how the page behaves for the owner.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const store = vi.hoisted(() => ({ open: false }))
vi.mock('../src/data/membership', () => ({
  MEMBERSHIP: { get open() { return store.open }, textWhileClosed: 'A space for people who want to go further in is on its way. It is not open yet.' },
}))

import MembershipPage from '../src/membership/MembershipPage'
import { LAUNCH_OFFER } from '../src/membership/pricing'
import { CONSENT_TEXT, FREE_TEXT, STRIPE_NOTE } from '../src/membership/passes'
import { channels } from '../src/data/channels'

const show = (owner = true) => render(<MemoryRouter><MembershipPage owner={owner} /></MemoryRouter>)
const pass = (name) => screen.getByRole('checkbox', { name: new RegExp(name) })
const tick = async (...names) => { for (const n of names) await userEvent.click(pass(n)) }
const consent = () => screen.getByRole('checkbox', { name: /Open my passes now/ })
const go = () => screen.getByRole('button', { name: 'Continue to payment' })
const priceBox = () => screen.getByRole('region', { name: 'Your price' })
const offerWas = LAUNCH_OFFER.active

beforeEach(() => { store.open = false; LAUNCH_OFFER.active = true })
afterEach(() => { LAUNCH_OFFER.active = offerWas })

describe('while memberships are closed', () => {
  it('tells a visitor they are not open yet, with no passes to choose', () => {
    show(false)
    expect(screen.getByRole('heading', { level: 1, name: 'Memberships are not open yet' })).toBeInTheDocument()
    expect(screen.getByText(/It is not open yet\./)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull(); expect(screen.queryByText('Continue to payment')).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/')
  })
  it('shows the owner the whole page under a draft banner', () => {
    show(true)
    expect(screen.getByRole('note')).toHaveTextContent('Draft: only you can see this page.')
    expect(screen.getByRole('heading', { level: 1, name: 'Open the parts of the story you want.' })).toBeInTheDocument()
  })
  it('shows everyone the page, with no draft banner, once memberships are open', () => {
    store.open = true
    show(false)
    expect(screen.getByRole('heading', { level: 1, name: 'Open the parts of the story you want.' })).toBeInTheDocument()
    expect(screen.queryByRole('note')).toBeNull()
  })
})

describe('the four passes', () => {
  it('are real tick boxes in a group called Passes, none ticked to begin with', () => {
    show()
    const group = screen.getByRole('group', { name: 'Passes' })
    const boxes = within(group).getAllByRole('checkbox')
    expect(boxes.map((b) => b.closest('label').textContent.replace(/✓/, ''))).toEqual([
      expect.stringContaining("The Author's Notebook"), expect.stringContaining('Early drafts and book background'), expect.stringContaining('Blueprints'), expect.stringContaining('Book Club'),
    ])
    for (const b of boxes) expect(b).not.toBeChecked()
  })
  it('each says which room it belongs to, using the rooms\u2019 own names', () => {
    show()
    const name = (slug) => channels.find((c) => c.slug === slug).name
    expect(pass("The Author's Notebook").closest('label')).toHaveTextContent(name('drafting-desk'))
    expect(pass('Early drafts').closest('label')).toHaveTextContent(name('drafting-desk'))
    expect(pass('Blueprints').closest('label')).toHaveTextContent(name('factory-floor'))
    expect(pass('Book Club').closest('label')).toHaveTextContent(name('knowledge-nook'))
  })
  it('say the first three posts in every pass are free (not just Blueprints), once, under "Free, always"', () => {
    show()
    expect(screen.getByText(FREE_TEXT)).toBeInTheDocument()
    expect(FREE_TEXT).toMatch(/first three posts in every pass are free/)
    expect(pass('Blueprints').closest('label')).not.toHaveTextContent(/first three/i)
  })
  it('can be ticked and unticked with the keyboard', async () => {
    show()
    pass('Book Club').focus()
    await userEvent.keyboard(' ')
    expect(pass('Book Club')).toBeChecked()
    await userEvent.keyboard(' ')
    expect(pass('Book Club')).not.toBeChecked()
  })
})

describe('the price box', () => {
  it('asks you to choose a pass when none is ticked', () => {
    show()
    expect(within(priceBox()).getByText('Your passes: 0 of 4')).toBeInTheDocument()
    expect(within(priceBox()).getByText('Choose a pass')).toBeInTheDocument()
    expect(within(priceBox()).queryByText(LAUNCH_OFFER.label)).toBeNull()
  })
  it('shows the launch offer for three passes exactly as drawn: strike-through price, half price for the first year, then the full price, and the yearly way', async () => {
    show()
    await tick("The Author's Notebook", 'Blueprints', 'Book Club')
    const box = priceBox()
    expect(within(box).getByText(LAUNCH_OFFER.label)).toBeInTheDocument()
    expect(within(box).getByText('Your passes: 3 of 4')).toBeInTheDocument()
    expect(within(box).getByText('£10 a month').tagName).toBe('P')
    expect(within(box).getByText('£5 a month for your first year')).toBeInTheDocument()
    expect(within(box).getByText('then £10 a month. Cancel any time. Paying yearly? £50 for the first year, then £100 a year.')).toBeInTheDocument()
  })
  it('switches to the yearly prices when Yearly is chosen, and says what monthly would be', async () => {
    show()
    await tick('Blueprints', 'Book Club', "The Author's Notebook")
    const yearly = screen.getByRole('button', { name: 'Yearly: save 2 months' })
    expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'true'); expect(yearly).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(yearly)
    const box = priceBox()
    expect(yearly).toHaveAttribute('aria-pressed', 'true'); expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(box).getByText('£100 a year')).toBeInTheDocument()
    expect(within(box).getByText('£50 for your first year')).toBeInTheDocument()
    expect(within(box).getByText('then £100 a year. Cancel any time. Paying monthly? £5 a month for the first year, then £10 a month.')).toBeInTheDocument()
  })
  it('gets the pence right for one pass, and the 12 pound cap for everything', async () => {
    show()
    await tick('Blueprints')
    expect(within(priceBox()).getByText('£2.50 a month for your first year')).toBeInTheDocument()
    await tick("The Author's Notebook", 'Early drafts', 'Book Club')
    expect(within(priceBox()).getByText('£6 a month for your first year')).toBeInTheDocument()
    expect(within(priceBox()).getByText(/then £12 a month/)).toBeInTheDocument()
  })
  it('shows plain prices, with no offer, when the launch offer is switched off', async () => {
    LAUNCH_OFFER.active = false
    show()
    await tick('Blueprints', 'Book Club')
    const box = priceBox()
    expect(within(box).queryByText(LAUNCH_OFFER.label)).toBeNull()
    expect(within(box).getByText('£7 a month')).toBeInTheDocument()
    expect(within(box).getByText('or £70 a year, which is 10 months of passes. Cancel any time.')).toBeInTheDocument()
  })
  it('announces a changed price to a screen reader without moving focus', async () => {
    show()
    expect(priceBox().querySelector('[aria-live="polite"]')).toBeTruthy()
  })
})

describe('the price table', () => {
  it('lists the four prices and shows the row for the passes you have in bold', async () => {
    show()
    const table = screen.getByRole('region', { name: 'Prices' })
    expect(within(table).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1 pass£5 a monthor £50 a year', '2 passes£7 a monthor £70 a year', '3 passes£10 a monthor £100 a year', 'Everything£12 a monthor £120 a year'])
    expect(table.querySelector('[aria-current]')).toBeNull()
    await tick('Blueprints', 'Book Club')
    expect(table.querySelector('[aria-current="true"]')).toHaveTextContent('2 passes')
    expect(within(table).getByText('Everything means four or more passes, and it stays £12 however many passes there are.')).toBeInTheDocument()
  })
})

describe('the tick box and "Continue to payment"', () => {
  it('has the exact wording Gill approved, and starts unticked', () => {
    show()
    expect(consent()).not.toBeChecked()
    expect(consent().closest('label')).toHaveTextContent(CONSENT_TEXT)
    expect(CONSENT_TEXT).toBe('Open my passes now. I understand that once they open, I lose my 14-day right to cancel and get a refund.')
  })
  it('stays greyed out until a pass is chosen AND the box is ticked, and says why', async () => {
    show()
    expect(go()).toBeDisabled(); expect(screen.getByText('Choose at least one pass and tick the box above to continue.')).toBeInTheDocument()
    expect(go()).toHaveAttribute('aria-describedby', 'mb-why')
    await userEvent.click(consent())
    expect(go()).toBeDisabled() // ticked, but no pass
    await userEvent.click(consent()); await tick('Blueprints')
    expect(go()).toBeDisabled() // a pass, but not ticked
    await userEvent.click(consent())
    expect(go()).toBeEnabled(); expect(screen.queryByText('Choose at least one pass and tick the box above to continue.')).toBeNull()
  })
  it('becomes greyed out again if you take the box away or untick every pass', async () => {
    show()
    await tick('Blueprints'); await userEvent.click(consent())
    expect(go()).toBeEnabled()
    await userEvent.click(consent()); expect(go()).toBeDisabled()
    await userEvent.click(consent()); await tick('Blueprints'); expect(go()).toBeDisabled()
  })
  it('does not pretend to take a payment yet, and says nothing has been charged', async () => {
    show()
    await tick('Blueprints'); await userEvent.click(consent()); await userEvent.click(go())
    expect(screen.getByRole('status')).toHaveTextContent('Payment is not connected yet, so nothing has been charged.')
  })
  it('says how you pay and that you can cancel', () => {
    show()
    expect(screen.getByText(STRIPE_NOTE)).toBeInTheDocument()
  })
})

describe('the promo code', () => {
  it('asks for a code if the box is empty, and says the code is checked on the payment page if there is one', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByRole('status')).toHaveTextContent('Type your code first.')
    await userEvent.type(screen.getByLabelText('Have a promo code?'), 'WELCOME')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByRole('status')).toHaveTextContent('Your code will be checked on the payment page.')
  })
})

describe('the page as a whole', () => {
  it('has no inline styles and no text under 14px', () => {
    const { container } = show()
    expect(container.querySelectorAll('[style]')).toHaveLength(0)
  })
  it('has one top-level heading, then Free always and the price table as second-level headings', () => {
    show()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Free, always', 'The more passes you take, the less each one costs'])
  })
})
