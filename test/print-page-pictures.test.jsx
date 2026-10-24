// The print page used to download the pictures of ALL its sizes and frames 0.8 seconds after opening (about 15 MB in a mobile speed test), competing with the main photo.
// Now a picture is fetched only when the shopper reaches for the button that shows it, plus the one they are most likely to want next, after the main photo has loaded.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'

const h = vi.hoisted(() => ({ fetchPrint: async () => null }))
vi.mock('../src/artloft/artLoftApi', () => ({ fetchPrint: (...a) => h.fetchPrint(...a) }))
import PrintPage from '../src/artloft/PrintPage'
import PrintCard from '../src/artloft/PrintCard'

const ID = 'eb8bc42c-ad85-463e-a61c-3673b033e7c0'
const SIZES = [['21x30cm', 210, 300], ['28x35cm', 280, 350], ['40x50cm', 400, 500], ['60x80cm', 600, 800]]
const variants = SIZES.flatMap(([label, w, hgt], i) => [false, true].map((framed, j) => ({ id: `v${i}${j}`, label, size_label: label, width_mm: w, height_mm: hgt, framed, frame_colour: framed ? 'Black' : null, price: 89 + i * 40 + (framed ? 40 : 0), position: i * 2 + j, image_url: `https://files.creativehub.io/composited/${label}-${framed ? 'framed' : 'plain'}.jpg` })))
const PRINT = { id: ID, slug: 'behind-the-curtain', title: 'Behind the Curtain', collection: 'Out of this World', price: 89, images: ['https://files.creativehub.io/converted/art.jpg'], description: 'A dark stage.', published: true, product_variants: variants }
const src = (f) => fs.readFileSync(path.resolve(f), 'utf8')
let fetched
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
beforeEach(() => {
  fetched = []
  vi.stubGlobal('Image', class { set src(v) { fetched.push(v) } })
  h.fetchPrint = vi.fn(async () => PRINT)
  localStorage.clear()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const open = () => render(<MemoryRouter initialEntries={['/art-loft/prints/behind-the-curtain']}><Routes><Route path="/art-loft/prints/:id" element={<PrintPage />} /></Routes></MemoryRouter>)
const mainPhoto = async () => (await screen.findByRole('img', { name: /Behind the Curtain, 21 \u00d7 30 cm, unframed/ }))

describe('the print page and its pictures', () => {
  it('fetches NOTHING extra when it opens, not even after the old 0.8 seconds: the main photo has the connection to itself', async () => {
    open(); await mainPhoto(); await wait(1300); expect(fetched).toEqual([])
  })
  it('after the main photo has loaded, quietly fetches ONE more: the same size in the other finish (the likeliest next click), and no more', async () => {
    open(); fireEvent.load(await mainPhoto())
    await waitFor(() => expect(fetched).toEqual(['https://files.creativehub.io/composited/21x30cm-framed.jpg']), { timeout: 3500 })
    await wait(300); expect(fetched).toHaveLength(1); expect(fetched.length).toBeLessThan(variants.length)
  })
  it('fetches a size\u2019s picture when the shopper reaches for that size (hover, focus or touch), once only', async () => {
    open(); await mainPhoto(); const button = screen.getByRole('radio', { name: /28 \u00d7 35 cm/ })
    await userEvent.hover(button); expect(fetched).toEqual(['https://files.creativehub.io/composited/28x35cm-plain.jpg'])
    await userEvent.unhover(button); await userEvent.hover(button); fireEvent.focus(button); fireEvent.touchStart(button); expect(fetched).toHaveLength(1)
    fireEvent.focus(screen.getByRole('radio', { name: /40 \u00d7 50 cm/ })); expect(fetched).toHaveLength(2); expect(fetched[1]).toBe('https://files.creativehub.io/composited/40x50cm-plain.jpg')
  })
  it('fetches the framed picture of the same size when the shopper reaches for the frame, and never repeats a picture', async () => {
    open(); await mainPhoto(); const frame = screen.getByRole('radio', { name: /Black frame/ })
    await userEvent.hover(frame); expect(fetched).toEqual(['https://files.creativehub.io/composited/21x30cm-framed.jpg'])
    fireEvent.load(await mainPhoto()); await wait(1700); expect(fetched).toHaveLength(1) // the idle fetch finds it already fetched
  })
  it('stops quietly when the shopper leaves before the idle moment (nothing fetched after the page closes)', async () => {
    const { unmount } = open(); fireEvent.load(await mainPhoto()); unmount(); await wait(1800); expect(fetched).toEqual([])
  })
  it('no longer contains the fetch-every-size loop', () => {
    const code = src('src/artloft/PrintPage.jsx'); expect(code).not.toMatch(/\}, 800\)/); expect(code).not.toMatch(/variants\.forEach\(\(v\) => \{\s*if \(v\.image_url\)/); expect(code).toContain('onLoad={() => setMainLoaded(true)}')
  })
})

describe('the cards on a collection or print list', () => {
  const card = (props) => render(<MemoryRouter><PrintCard print={PRINT} {...props} /></MemoryRouter>).container.querySelector('img')
  it('load lazily by default, and at once (not lazily) when marked as being in view', () => {
    expect(card().getAttribute('loading')).toBe('lazy'); cleanup(); expect(card({ eager: true }).getAttribute('loading')).toBe('eager'); expect(card({ eager: true }).getAttribute('decoding')).toBe('async')
  })
  it('are marked as in view for the first four on each list page, and not the rest', () => {
    for (const f of ['src/artloft/CollectionPage.jsx', 'src/artloft/PrintsPage.jsx']) { const code = src(f); expect(code, f).toContain('items.map((p, i) => ('); expect(code, f).toContain('<PrintCard print={p} eager={i < 4} />') }
  })
})
