import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeadingFromTheMiddlePage from '../src/leadership/LeadingFromTheMiddlePage'
import { OUTCOMES, CIRCLE, QUOTE } from '../src/leadership/leadingMiddleData'

vi.mock('../src/doors/useDoors', () => ({ default: () => ({ isOpen: () => false }) }))
vi.mock('../src/entries/NebulaBox', () => ({ default: () => <div>Into the Nebula</div> }))

describe('Leading from the Middle page', () => {
  it('shows the quote, the four outcomes, the six weeks and the five ideas', () => {
    render(<MemoryRouter><LeadingFromTheMiddlePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Leading from the Middle' })).toBeTruthy()
    expect(screen.getByText('\u201C' + QUOTE + '\u201D')).toBeTruthy() // the quote is shown in quotation marks
    expect(screen.getByText(/6 weeks/)).toBeTruthy()
    OUTCOMES.forEach((o) => expect(screen.getByRole('heading', { name: o.title })).toBeTruthy())
    const img = screen.getByRole('img', { name: /five ideas/ })
    CIRCLE.forEach((c) => expect(img.getAttribute('aria-label')).toContain(c.label))
    expect(screen.getByText('Into the Nebula')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Get the free ebook' })).toBeDisabled() // the ebook's door is closed
    expect(screen.getByText('Opening soon')).toBeTruthy()
  })
  it('links to the ebook page once its door is open', async () => {
    vi.resetModules()
    vi.doMock('../src/doors/useDoors', () => ({ default: () => ({ isOpen: () => true }) }))
    const { default: Page } = await import('../src/leadership/LeadingFromTheMiddlePage')
    render(<MemoryRouter><Page /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Get the free ebook' })).toHaveAttribute('href', '/leadership-lounge/free-ebook')
    vi.doUnmock('../src/doors/useDoors')
  })
  it('spells the ideas correctly and keeps the river quote', () => {
    expect(CIRCLE[0].label).toBe('Unconscious Bias')
    expect(QUOTE).toMatch(/river/)
  })
})
