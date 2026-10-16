import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const db = vi.hoisted(() => {
  const api = { select() { return api }, eq() { return api }, order() { return api }, limit() { return api }, then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject) } }
  return { supabase: { from: () => api } }
})
vi.mock('../src/supabaseClient', () => ({ supabase: db.supabase }))

import FactoryFloorRoutes from '../src/factoryfloor/FactoryFloorRoutes'

describe('the Factory Floor', () => {
  it('has the Home link, first on the page, before its heading', async () => {
    const { container } = render(<MemoryRouter initialEntries={['/factory-floor']}><Routes><Route path="/factory-floor/*" element={<FactoryFloorRoutes />} /></Routes></MemoryRouter>)
    const link = await screen.findByRole('link', { name: 'Home' })
    expect(link.getAttribute('href')).toBe('/')
    expect(link.className).toContain('ff-home')
    expect(container.querySelector('.ff-inner').firstElementChild).toBe(link)
    expect(link.compareDocumentPosition(container.querySelector('h1')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('does not put a Home link on its section pages', async () => {
    render(<MemoryRouter initialEntries={['/factory-floor/the-floor']}><Routes><Route path="/factory-floor/*" element={<FactoryFloorRoutes />} /></Routes></MemoryRouter>)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
  })
})
