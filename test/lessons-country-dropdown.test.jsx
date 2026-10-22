// Lessons from the road: the same list as Writing in Transit, with a country dropdown to narrow it.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ posts: [] }))
vi.mock('../src/explorers/travelApi', () => ({ fetchTravelPosts: vi.fn(async () => h.posts) }))
import LessonsPage from '../src/explorers/LessonsPage'

const lesson = (id, title, country, year) => ({ id, title, created_at: '2026-10-20T10:00:00Z', tags: ['lessons-from-the-road'], country, year_visited: year })
const page = (url = '/explorers-bay/lessons-from-the-road') => render(<MemoryRouter initialEntries={[url]}><LessonsPage /></MemoryRouter>)

describe('the country dropdown', () => {
  it('shows even with one country, labelled, with a count', async () => {
    h.posts = [lesson('1', 'Bear', 'AU', 2012)]
    page()
    const select = await screen.findByLabelText('Find lessons by country')
    expect(select.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'All countries (1)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Australia (1)' })).toBeInTheDocument()
  })
  it('narrows the list to the chosen country, and back again', async () => {
    h.posts = [lesson('1', 'Bear', 'AU', 2012), lesson('2', 'Temple', 'JP', 2019), lesson('3', 'Reef', 'AU', 2014)]
    page()
    const select = await screen.findByLabelText('Find lessons by country')
    expect(document.querySelectorAll('a.rp-entry').length).toBe(3)
    fireEvent.change(select, { target: { value: 'JP' } })
    await waitFor(() => expect(document.querySelectorAll('a.rp-entry').length).toBe(1))
    expect(screen.getByText('Temple')).toBeInTheDocument()
    expect(screen.getByText(/Japan · 2019/)).toBeInTheDocument()
    fireEvent.change(select, { target: { value: '' } })
    await waitFor(() => expect(document.querySelectorAll('a.rp-entry').length).toBe(3))
  })
  it('opens already narrowed when the address names a country', async () => {
    h.posts = [lesson('1', 'Bear', 'AU', 2012), lesson('2', 'Temple', 'JP', 2019)]
    page('/explorers-bay/lessons-from-the-road?country=AU')
    expect(await screen.findByText('Bear')).toBeInTheDocument()
    expect(screen.queryByText('Temple')).toBeNull()
  })
})
