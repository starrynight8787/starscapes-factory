import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { makeDb, seed } from './fakeDb'

const db = makeDb()
vi.mock('../src/supabaseClient', () => ({ get supabase() { return db.supabase } }))

import ArtLoftRoutes from '../src/artloft/ArtLoftRoutes'
import { clearCart } from '../src/cart/cartStore'

beforeEach(() => { db.state.user = null; db.state.calls = []; seed(db); clearCart() })

describe('the Art Loft', () => {
  it('has the Home link, first on the page, before its heading', async () => {
    const { container } = render(<MemoryRouter initialEntries={['/art-loft']}><Routes><Route path="/art-loft/*" element={<ArtLoftRoutes />} /></Routes></MemoryRouter>)
    const link = await screen.findByRole('link', { name: 'Home' })
    expect(link.getAttribute('href')).toBe('/')
    expect(link.className).toContain('al-home')
    const main = container.querySelector('main.al')
    expect(main.firstElementChild).toBe(link)
    expect(link.compareDocumentPosition(container.querySelector('h1')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('does not put a Home link on its inner pages, which already have their own way back', async () => {
    render(<MemoryRouter initialEntries={['/art-loft/prints']}><Routes><Route path="/art-loft/*" element={<ArtLoftRoutes />} /></Routes></MemoryRouter>)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
  })
})
