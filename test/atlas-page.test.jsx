// "Star Atlas" (src/atlas/AtlasPage.jsx): what a pass holder and a free account see, the first-visit stamps, and the country picker.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const api = vi.hoisted(() => ({ fetchMyAtlas: vi.fn(), claimStarterStamp: vi.fn(), saveCountry: vi.fn() }))
vi.mock('../src/atlas/atlasApi', () => ({ fetchMyAtlas: api.fetchMyAtlas, claimStarterStamp: api.claimStarterStamp, saveCountry: api.saveCountry }))

import AtlasPage from '../src/atlas/AtlasPage'

const atlas = (over = {}) => ({ year: 2026, galaxy: 'The Milky Way', needed: 100, earned: 42, isPaid: true, hasCountry: true, starter: ['joined', 'first-country', 'first-chapters'], rooms: { 'knowledge-nook': 7, 'explorers-bay': 4, 'story-ledger': 8, 'drafting-desk': 3, 'art-loft': 2, 'idea-hatchery': 4, 'sarah-jrs-den': 1, 'leadership-lounge': 1 }, ...over })
const show = () => render(<MemoryRouter initialEntries={['/membership/atlas']}><Routes><Route path="/membership/atlas" element={<AtlasPage />} /><Route path="/membership" element={<p>choose page</p>} /></Routes></MemoryRouter>)

beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); api.claimStarterStamp.mockResolvedValue(true) })

describe('a pass holder', () => {
  it('sees the galaxy bar as stardust earned out of 100 and the eight rooms with their counts', async () => {
    api.fetchMyAtlas.mockResolvedValue(atlas()); show()
    expect(await screen.findByRole('heading', { level: 2, name: 'The Milky Way' })).toBeInTheDocument()
    expect(screen.getByText('42 of 100 stardust earned this year')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Stardust earned this year' })).toHaveAttribute('aria-valuenow', '42')
    expect(screen.getByText('7 of 12 stamps')).toBeInTheDocument()
    expect(screen.getByText('2 of 6 stamps')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 stamps')).toBeInTheDocument()
    expect(screen.getByText('Sarah Jr. Adventures')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').filter((li) => li.className.includes('at__room'))).toHaveLength(8)
  })
  it('sees the Figma wording for badges, and no spending, check-in or free-account box', async () => {
    api.fetchMyAtlas.mockResolvedValue(atlas()); show()
    await screen.findByText('Stamps by room')
    expect(screen.getByText('Your badges will live here.')).toBeInTheDocument()
    expect(screen.getByText('2026 filling. 2027 opens 1 January.')).toBeInTheDocument()
    expect(screen.queryByText(/Spend stardust/)).toBeNull()
    expect(screen.queryByText(/extra books/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'See passes' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Your starter stamps' })).toBeNull()
  })
  it('has the two tabs, with Star Atlas the current one', async () => {
    api.fetchMyAtlas.mockResolvedValue(atlas()); show()
    await screen.findByText('Stamps by room')
    const nav = screen.getByRole('navigation', { name: 'My account' })
    expect(within(nav).getByRole('link', { name: 'My passes' })).toHaveAttribute('href', '/membership/passes')
    expect(within(nav).getByRole('link', { name: /Star Atlas/ })).toHaveAttribute('aria-current', 'page')
  })
})

describe('a free account', () => {
  const free = () => atlas({ isPaid: false, earned: 3, rooms: {} })
  it('sees its three starter stamps, a mostly empty galaxy, 0 of each room, the pass box and the locked wording', async () => {
    api.fetchMyAtlas.mockResolvedValue(free()); show()
    expect(await screen.findByText('3 of 100 stardust earned this year')).toBeInTheDocument()
    const strip = screen.getByRole('region', { name: 'Your starter stamps' })
    expect(within(strip).getAllByText('Earned')).toHaveLength(3)
    expect(screen.getAllByText('0 of 12 stamps').length).toBe(5)
    expect(screen.getByText('Badges unlock with a pass.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See passes' })).toHaveAttribute('href', '/membership')
    expect(screen.getByText(/Hold a pass to earn stamps in every room, spend stardust and vote/)).toBeInTheDocument()
  })
})

describe('the first visit', () => {
  it('earns the Joined stamp and shows the new total', async () => {
    api.fetchMyAtlas.mockResolvedValueOnce(atlas({ isPaid: false, earned: 0, starter: [], hasCountry: false, rooms: {} })).mockResolvedValueOnce(atlas({ isPaid: false, earned: 1, starter: ['joined'], hasCountry: false, rooms: {} })); show()
    expect(await screen.findByText('1 of 100 stardust earned this year')).toBeInTheDocument()
    expect(api.claimStarterStamp).toHaveBeenCalledWith('joined')
    expect(api.claimStarterStamp).not.toHaveBeenCalledWith('first-country')
  })
  it('does not claim again when Joined is already earned', async () => {
    api.fetchMyAtlas.mockResolvedValue(atlas({ isPaid: false, earned: 1, starter: ['joined'], hasCountry: false, rooms: {} })); show()
    await screen.findByText('Stamps by room')
    expect(api.claimStarterStamp).not.toHaveBeenCalled()
  })
  it('earns the First country stamp if a country was saved but its stamp did not land', async () => {
    api.fetchMyAtlas.mockResolvedValueOnce(atlas({ earned: 1, starter: ['joined'], hasCountry: true })).mockResolvedValueOnce(atlas({ earned: 2, starter: ['joined', 'first-country'], hasCountry: true })); show()
    await screen.findByText('2 of 100 stardust earned this year')
    expect(api.claimStarterStamp).toHaveBeenCalledWith('first-country')
  })
})

describe('the country picker', () => {
  it('shows while there is no country, saves the chosen code, then reloads', async () => {
    const before = atlas({ isPaid: false, earned: 1, starter: ['joined'], hasCountry: false, rooms: {} })
    api.fetchMyAtlas.mockResolvedValueOnce(before).mockResolvedValue(atlas({ isPaid: false, earned: 2, starter: ['joined', 'first-country'], hasCountry: true, rooms: {} }))
    api.saveCountry.mockResolvedValue(true); show()
    await userEvent.selectOptions(await screen.findByLabelText('Country'), 'GB')
    await userEvent.click(screen.getByRole('button', { name: 'Save my country' }))
    expect(api.saveCountry).toHaveBeenCalledWith('GB')
    expect(await screen.findByText('2 of 100 stardust earned this year')).toBeInTheDocument()
    expect(screen.queryByLabelText('Country')).toBeNull()
  })
  it('asks them to choose before saving, and says so kindly when it does not save', async () => {
    api.fetchMyAtlas.mockResolvedValue(atlas({ isPaid: false, earned: 1, starter: ['joined'], hasCountry: false, rooms: {} }))
    api.saveCountry.mockRejectedValue(new Error('That did not save just now. Please try again in a moment.')); show()
    await userEvent.click(await screen.findByRole('button', { name: 'Save my country' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please choose a country from the list.')
    expect(api.saveCountry).not.toHaveBeenCalled()
    await userEvent.selectOptions(screen.getByLabelText('Country'), 'FR')
    await userEvent.click(screen.getByRole('button', { name: 'Save my country' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('did not save just now')
  })
})

describe('when it cannot load', () => {
  it('says so in plain words with a way to try again', async () => {
    api.fetchMyAtlas.mockRejectedValueOnce(new Error('permission denied')).mockResolvedValue(atlas()); show()
    expect(await screen.findByText('We could not load your Star Atlas')).toBeInTheDocument()
    expect(screen.queryByText(/permission denied/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Stamps by room')).toBeInTheDocument()
  })
})
