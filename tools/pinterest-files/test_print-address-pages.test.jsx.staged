// What a visitor sees: each print card describes its picture and links to the readable address; each print page carries the medium line and sends the old long address
// to the readable one; originals are left exactly as they were.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'

const h = vi.hoisted(() => ({ fetchPrint: async () => null }))
vi.mock('../src/artloft/artLoftApi', () => ({ fetchPrint: (...a) => h.fetchPrint(...a) }))
import PrintPage from '../src/artloft/PrintPage'
import PrintCard, { printAlt } from '../src/artloft/PrintCard'

const ID = 'eb8bc42c-ad85-463e-a61c-3673b033e7c0'
const v = (id, size_label, framed, frame_colour, price, position) => ({ id, label: size_label, size_label, width_mm: 210, height_mm: 300, framed, frame_colour, price, position, image_url: null })
const PRINT = { id: ID, slug: 'behind-the-curtain', title: 'Behind the Curtain', collection: 'Out of this World', price: 89, images: ['https://files.creativehub.io/converted/curtain.jpg'], description: 'A dark stage.', published: true, product_variants: [v('v1', '21x30cm', false, null, 89, 0), v('v2', '21x30cm', true, 'Black', 129, 1)] }
const src = (f) => fs.readFileSync(path.resolve(f), 'utf8')
function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname}</p> }
const open = (at, print) => { h.fetchPrint = vi.fn(async () => print); return render(<MemoryRouter initialEntries={[at]}><Routes><Route path="/art-loft/prints/:id" element={<><PrintPage /><Where /></>} /></Routes></MemoryRouter>) }
beforeEach(() => { localStorage.clear() })

describe('the print card', () => {
  it('links to the readable address when the print has one, and to its id when it does not', () => {
    const { container, rerender } = render(<MemoryRouter><PrintCard print={PRINT} /></MemoryRouter>); expect(container.querySelector('a').getAttribute('href')).toBe('/art-loft/prints/behind-the-curtain')
    rerender(<MemoryRouter><PrintCard print={{ ...PRINT, slug: null }} /></MemoryRouter>); expect(container.querySelector('a').getAttribute('href')).toBe(`/art-loft/prints/${ID}`)
  })
  it('describes its picture: the print\u2019s name, "abstract art print" and its collection (which is also what Pinterest offers as the pin\u2019s words)', () => {
    render(<MemoryRouter><PrintCard print={PRINT} /></MemoryRouter>); expect(screen.getByRole('img')).toHaveAttribute('alt', 'Behind the Curtain, abstract art print, Out of this World collection')
    expect(printAlt({ title: 'Tango', collection: null })).toBe('Tango, abstract art print'); expect(printAlt({ title: 'Tango', collection: '' })).toBe('Tango, abstract art print')
  })
  it('still shows a blank frame and no picture when there is no photo, and the Draft badge for an unpublished print', () => {
    const { container } = render(<MemoryRouter><PrintCard print={{ ...PRINT, images: [], published: false }} /></MemoryRouter>); expect(container.querySelector('img')).toBeNull(); expect(screen.getByText('Draft')).toBeInTheDocument()
  })
  it('has no picture with an empty description left in the cards or the Art Loft home\u2019s collection pictures', () => {
    expect(src('src/artloft/PrintCard.jsx')).not.toMatch(/alt=""/)
    const scene = src('src/artloft/ArtLoftScene.jsx'); expect((scene.match(/c\.cover/g) || []).length).toBeGreaterThan(0); expect(scene).not.toMatch(/src=\{c\.cover\}\s+alt=""/); expect(scene).not.toMatch(/<img src=\{c\.cover\} alt=""/)
  })
})

describe('the print page', () => {
  it('says "Digitised from my original acrylic painting, printed to order." once, after the collection and before the description', async () => {
    const { container } = open('/art-loft/prints/behind-the-curtain', PRINT)
    const line = await screen.findByText('Digitised from my original acrylic painting, printed to order.')
    expect(screen.getAllByText('Digitised from my original acrylic painting, printed to order.')).toHaveLength(1)
    const order = [...container.querySelectorAll('.al-print__collection, .al-print__medium, .al-print__desc')].map((n) => n.className); expect(order).toEqual(['al-print__collection', 'al-print__medium', 'al-print__desc']); expect(line.className).toBe('al-print__medium')
  })
  it('stays where it is when the visit is by the readable address, and asks for that address', async () => {
    open('/art-loft/prints/behind-the-curtain', PRINT); await screen.findByRole('heading', { level: 1, name: 'Behind the Curtain' }); expect(screen.getByTestId('where')).toHaveTextContent('/art-loft/prints/behind-the-curtain'); expect(h.fetchPrint).toHaveBeenCalledWith('behind-the-curtain')
  })
  it('sends a visit by the OLD long address to the readable one (on top of the website\u2019s own permanent redirect)', async () => {
    open(`/art-loft/prints/${ID}`, PRINT); await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/art-loft/prints/behind-the-curtain')); await screen.findByRole('heading', { level: 1, name: 'Behind the Curtain' })
  })
  it('leaves a print that has no readable address yet on its long address, with the same line', async () => {
    open(`/art-loft/prints/${ID}`, { ...PRINT, slug: null }); await screen.findByText('Digitised from my original acrylic painting, printed to order.'); expect(screen.getByTestId('where')).toHaveTextContent(`/art-loft/prints/${ID}`)
  })
  it('still says "Print not found" for an address that is nothing', async () => { open('/art-loft/prints/no-such-print', null); expect(await screen.findByRole('heading', { level: 1, name: 'Print not found' })).toBeInTheDocument() })
  it('puts the readable address into the cart, so coming back from the cart uses it', () => { expect(src('src/artloft/PrintPage.jsx')).toContain('href: `/art-loft/prints/${print.slug || print.id}`'); expect(src('src/artloft/AdminPrints.jsx')).toContain('`/art-loft/prints/${p.slug || p.id}`') })
})

describe('originals are left exactly as they were', () => {
  it('have no medium line (Gill is updating their sizes and canvas details herself), and their cards and pages are not touched by this change', () => {
    for (const f of ['src/artloft/OriginalPage.jsx', 'src/artloft/OriginalCard.jsx', 'src/artloft/OriginalsPage.jsx']) { expect(src(f), f).not.toMatch(/Digitised from my original/); expect(src(f), f).not.toMatch(/al-print__medium/); expect(src(f), f).not.toMatch(/slug/) }
    expect((src('src/artloft/PrintPage.jsx').match(/Digitised from my original acrylic painting, printed to order\./g) || []).length).toBe(1)
  })
})
