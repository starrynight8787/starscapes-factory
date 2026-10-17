import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { makeDb, seed, seedOriginals, owner } from './fakeDb'

const db = makeDb()
vi.mock('../src/supabaseClient', () => ({ get supabase() { return db.supabase } }))

import ArtLoftRoutes from '../src/artloft/ArtLoftRoutes'
import OriginalPage from '../src/artloft/OriginalPage'
import { deleteOriginal, MISSING_ORIGINAL_COLUMNS } from '../src/artloft/artLoftApi'
import { clearCart, getItems } from '../src/cart/cartStore'

function open(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/art-loft/*" element={<ArtLoftRoutes />} /></Routes>
    </MemoryRouter>
  )
}
// the original's page with the online buy button switched ON (it is off in the real site until you decide)
function openOnline(id) {
  return render(
    <MemoryRouter initialEntries={[`/art-loft/originals/${id}`]}>
      <Routes>
        <Route path="/art-loft/originals/:id" element={<OriginalPage online />} />
        <Route path="/cart" element={<p>the cart page</p>} />
      </Routes>
    </MemoryRouter>
  )
}
const originalRow = (id) => db.state.products.find((p) => p.id === id)
const photo = (name, size = 2e6, type = 'image/jpeg') => new File([new Uint8Array(8)], name, { type, lastModified: 1 }) && Object.defineProperty(new File([new Uint8Array(8)], name, { type }), 'size', { value: size })

beforeEach(() => {
  db.state.failVariantIds = []; db.state.noPictureColumn = false; db.state.noImageColumn = false; db.state.user = null
  db.state.failUpdate = false; db.state.calls = []; db.state.uploads = []; db.state.removed = []; db.state.storageCalls = []
  db.state.failUpload = false; db.state.failUploadAfter = 0; db.state.noOriginalColumns = false; db.state.failInsert = false
  seed(db); seedOriginals(db); clearCart()
})

describe('the Originals page, as a visitor', () => {
  it('lists the originals that are switched on, with the ones for sale first', async () => {
    open('/art-loft/originals')
    await screen.findByRole('link', { name: /Rainforest/ })
    const names = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(names.findIndex((t) => t.includes('Rainforest'))).toBeLessThan(names.findIndex((t) => t.includes('Quilt')))
  })
  it('keeps a sold original on the page, with a Sold label, and still lets people open it', async () => {
    open('/art-loft/originals')
    const quilt = await screen.findByRole('link', { name: /Quilt/ })
    expect(within(quilt).getAllByText('Sold').length).toBeGreaterThan(0)
    expect(quilt).toHaveAttribute('href', '/art-loft/originals/o2')
    expect(within(screen.getByRole('link', { name: /Rainforest/ })).queryByText('Sold')).toBeNull()
  })
  it('shows the price of one for sale, and the size', async () => {
    open('/art-loft/originals')
    const rain = await screen.findByRole('link', { name: /Rainforest/ })
    expect(within(rain).getByText('£1,200')).toBeInTheDocument()
    expect(within(rain).getByText('60 × 80 × 3 cm')).toBeInTheDocument()
  })
  it('never shows a draft to a visitor', async () => {
    open('/art-loft/originals')
    await screen.findByRole('link', { name: /Rainforest/ })
    expect(screen.queryByText('Storm')).toBeNull()
    expect(screen.queryByText('Draft')).toBeNull()
  })
  it('has a Back to the Art Loft button', async () => {
    open('/art-loft/originals')
    await screen.findByRole('link', { name: /Rainforest/ })
    expect(screen.getByRole('link', { name: '← Back to the Art Loft' })).toHaveAttribute('href', '/art-loft')
  })
  it('says so when there are none yet', async () => {
    db.state.products = db.state.products.filter((p) => p.fulfilment !== 'hand')
    open('/art-loft/originals')
    expect(await screen.findByText(/are on their way/)).toBeInTheDocument()
  })
  it('says so, kindly, if the originals cannot load', async () => {
    db.state.noOriginalColumns = true
    open('/art-loft/originals')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/)
  })
  it('does not mix originals in with the prints', async () => {
    open('/art-loft/prints')
    await screen.findByText('Forests')
    expect(screen.queryByText('Rainforest')).toBeNull()
    expect(screen.queryByText('Quilt')).toBeNull()
  })
  it('does not open an original as if it were a print', async () => {
    open('/art-loft/prints/o1')
    expect(await screen.findByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })
})

describe('the page for one original', () => {
  it('shows its title, price, facts and description', async () => {
    open('/art-loft/originals/o1')
    expect(await screen.findByRole('heading', { name: 'Rainforest' })).toBeInTheDocument()
    expect(screen.getByText('£1,200')).toBeInTheDocument()
    ;['Acrylic on canvas', '60 × 80 × 3 cm', 'Painted in 2024', 'Unframed'].forEach((f) => expect(screen.getByText(f)).toBeInTheDocument())
    expect(screen.getByText('A big, bright one.')).toBeInTheDocument()
  })
  it('lets people choose between its photos', async () => {
    const user = userEvent.setup()
    open('/art-loft/originals/o1')
    expect(await screen.findByRole('img', { name: 'Rainforest' })).toHaveAttribute('src', 'https://img.example/o1.jpg')
    await user.click(screen.getByRole('button', { name: 'Photo 2 of 2' }))
    expect(screen.getByRole('img', { name: 'Rainforest, photo 2' })).toHaveAttribute('src', 'https://img.example/o1b.jpg')
    expect(screen.getByRole('button', { name: 'Photo 2 of 2' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('shows no photo picker when there is only one photo', async () => {
    open('/art-loft/originals/o2')
    await screen.findByRole('heading', { name: 'Quilt' })
    expect(screen.queryByRole('group', { name: 'Choose a photo' })).toBeNull()
  })
  it('while originals are sold by email, offers an email button and no Add to cart', async () => {
    open('/art-loft/originals/o1')
    const enquire = await screen.findByRole('link', { name: 'Enquire about this original' })
    expect(enquire.getAttribute('href')).toMatch(/^mailto:imagine@starscapesfactory\.com\?subject=Enquiry%20about%20Rainforest$/)
    expect(screen.queryByRole('button', { name: /add to cart/i })).toBeNull()
    expect(screen.getByText(/email imagine@starscapesfactory.com/)).toBeInTheDocument()
  })
  it('says a sold original is sold, and offers nothing to buy', async () => {
    open('/art-loft/originals/o2')
    await screen.findByRole('heading', { name: 'Quilt' })
    expect(screen.getAllByText('Sold').length).toBeGreaterThan(0)
    expect(screen.getByText(/found a home/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /enquire/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /add to cart/i })).toBeNull()
    expect(screen.queryByText('£850')).toBeNull()
    expect(screen.getByRole('link', { name: 'See the other originals' })).toHaveAttribute('href', '/art-loft/originals')
  })
  it('hides a draft from visitors, but shows it to you with a note', async () => {
    open('/art-loft/originals/o3')
    expect(await screen.findByRole('heading', { name: 'Original not found' })).toBeInTheDocument()
  })
  it('shows you your own draft, labelled', async () => {
    db.state.user = owner
    open('/art-loft/originals/o3')
    expect(await screen.findByRole('heading', { name: 'Storm' })).toBeInTheDocument()
    expect(screen.getByText('Draft: only you can see this')).toBeInTheDocument()
  })
  it('says so when an original does not exist', async () => {
    open('/art-loft/originals/nope')
    expect(await screen.findByRole('heading', { name: 'Original not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See all the originals.' })).toHaveAttribute('href', '/art-loft/originals')
  })
  it('says so, kindly, if it cannot load', async () => {
    db.state.noOriginalColumns = true
    open('/art-loft/originals/o1')
    expect(await screen.findByRole('heading', { name: 'This could not load' })).toBeInTheDocument()
  })
  it('has a button back to all the originals', async () => {
    open('/art-loft/originals/o1')
    await screen.findByRole('heading', { name: 'Rainforest' })
    expect(screen.getByRole('link', { name: '← All originals' })).toHaveAttribute('href', '/art-loft/originals')
  })
})

describe('buying an original online (switched off for now, ready for later)', () => {
  it('adds it to the cart as one of a kind, and then will not add it again', async () => {
    const user = userEvent.setup()
    openOnline('o1')
    await user.click(await screen.findByRole('button', { name: 'Add to cart' }))
    expect(getItems()).toHaveLength(1)
    expect(getItems()[0]).toMatchObject({ key: 'original:o1', type: 'original', productId: 'o1', title: 'Rainforest', price: 1200, qty: 1, href: '/art-loft/originals/o1' })
    const inCart = screen.getByRole('button', { name: 'In your cart' })
    expect(inCart).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(/only one to buy/)
    expect(screen.queryByRole('link', { name: /enquire/i })).toBeNull()
    expect(getItems()[0].qty).toBe(1)
  })
  it('knows it is already in the cart when the page is opened again', async () => {
    const user = userEvent.setup()
    const first = openOnline('o1')
    await user.click(await screen.findByRole('button', { name: 'Add to cart' }))
    first.unmount()
    openOnline('o1')
    expect(await screen.findByRole('button', { name: 'In your cart' })).toBeDisabled()
  })
  it('never offers a sold original for the cart, even when buying online is on', async () => {
    openOnline('o2')
    await screen.findByRole('heading', { name: 'Quilt' })
    expect(screen.queryByRole('button', { name: /add to cart/i })).toBeNull()
    expect(getItems()).toHaveLength(0)
  })
})

describe('originals on their collection page and on the scene', () => {
  it('shows a collection\'s originals after its prints, with headings so the two are not confused', async () => {
    open('/art-loft/collections/calm-series')
    await screen.findByRole('link', { name: /Forests/ })
    expect(screen.getByRole('heading', { name: 'Prints' })).toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Original paintings' })
    expect(within(section).getByRole('link', { name: /Rainforest/ })).toHaveAttribute('href', '/art-loft/originals/o1')
    expect(within(section).getByRole('link', { name: 'See all the original paintings' })).toHaveAttribute('href', '/art-loft/originals')
  })
  it('shows a collection that holds only originals, and a sold one with its label, and not the "on their way" message', async () => {
    open('/art-loft/collections/unique-one-of-a-kind')
    const quilt = await screen.findByRole('link', { name: /Quilt/ })
    expect(within(quilt).getAllByText('Sold').length).toBeGreaterThan(0)
    expect(screen.queryByText(/on their way/)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Prints' })).toBeNull()
  })
  it('shows no originals section for a collection that has none', async () => {
    open('/art-loft/collections/out-of-this-world')
    await screen.findByRole('link', { name: /Tops of Jupiter/ })
    expect(screen.queryByRole('region', { name: 'Original paintings' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Prints' })).toBeNull()
  })
  it('still shows the prints if the originals cannot be loaded', async () => {
    db.state.noOriginalColumns = true
    open('/art-loft/collections/calm-series')
    expect(await screen.findByRole('link', { name: /Forests/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Original paintings' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('counts the originals on a canvas, beside the prints', async () => {
    open('/art-loft')
    expect(await screen.findByRole('link', { name: 'Calm Series, 2 prints and 1 original' })).toHaveAttribute('href', '/art-loft/collections/calm-series')
  })
  it('opens a canvas that holds only originals, instead of showing it as coming soon', async () => {
    open('/art-loft')
    const link = await screen.findByRole('link', { name: 'Unique One of a Kind, 1 original' })
    expect(link).toHaveAttribute('href', '/art-loft/collections/unique-one-of-a-kind')
    expect(screen.queryByRole('group', { name: 'Unique One of a Kind, coming soon' })).toBeNull()
  })
  it('does not count a draft original that visitors cannot see', async () => {
    open('/art-loft')
    await screen.findByRole('link', { name: 'Calm Series, 2 prints and 1 original' })
    expect(screen.queryByRole('link', { name: /2 originals/ })).toBeNull()
  })
  it('still shows the scene, with prints only, if the originals cannot be loaded', async () => {
    db.state.noOriginalColumns = true
    open('/art-loft')
    expect(await screen.findByRole('link', { name: 'Calm Series, 2 prints' })).toBeInTheDocument()
  })
})

describe('managing originals, as you', () => {
  beforeEach(() => { db.state.user = owner })

  it('asks anyone who is not signed in to log in, and shows nothing to manage', async () => {
    db.state.user = null
    open('/art-loft/admin/originals')
    expect(await screen.findByRole('link', { name: 'log in' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: /mark/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add an original' })).toBeNull()
  })
  it('lists your originals, drafts first, then those for sale, then sold ones, and counts them', async () => {
    open('/art-loft/admin/originals')
    await screen.findByText('Storm')
    const titles = Array.from(document.querySelectorAll('.al-orig-list__info strong')).map((n) => n.textContent)
    expect(titles).toEqual(['Storm', 'Rainforest', 'Quilt'])
    expect(screen.getByText(/3 originals: 2 available, 1 sold\. 2 switched on, 1 draft\./)).toBeInTheDocument()
  })
  it('shows each one\'s state in words, not just colour', async () => {
    open('/art-loft/admin/originals')
    await screen.findByText('Storm')
    const rows = Array.from(document.querySelectorAll('.al-orig-list > li'))
    expect(rows[0]).toHaveTextContent('Draft')
    expect(rows[1]).toHaveTextContent('Switched on')
    expect(rows[1]).toHaveTextContent('Available')
    expect(rows[2]).toHaveTextContent('Sold')
  })
  it('only lists your own originals, never anyone else\'s', async () => {
    db.state.products.push({ id: 'x1', title: 'Stranger\'s piece', collection: null, published: true, status: 'available', price: 5, images: ['https://x/y.jpg'], author_id: 'someone-else', fulfilment: 'hand' })
    open('/art-loft/admin/originals')
    await screen.findByText('Storm')
    expect(screen.queryByText('Stranger\'s piece')).toBeNull()
  })

  describe('the Mark as sold button', () => {
    it('marks a piece sold: saved in the database with the time, and shown straight away', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Mark Rainforest as sold' }))
      await waitFor(() => expect(originalRow('o1').status).toBe('sold'))
      expect(originalRow('o1').sold_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(await screen.findByRole('status')).toHaveTextContent('Marked as sold: Rainforest. It now shows a Sold label.')
      expect(screen.getByRole('button', { name: 'Mark Rainforest as available again' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Mark Rainforest as sold' })).toBeNull()
      expect(screen.getByText(/3 originals: 1 available, 2 sold/)).toBeInTheDocument()
    })
    it('makes the piece show as Sold to visitors, on the page that stays', async () => {
      const user = userEvent.setup()
      const first = open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Mark Rainforest as sold' }))
      await waitFor(() => expect(originalRow('o1').status).toBe('sold'))
      first.unmount()
      db.state.user = null                                             // now look as a visitor
      open('/art-loft/originals/o1')
      await screen.findByRole('heading', { name: 'Rainforest' })
      expect(screen.getByText(/found a home/)).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /enquire/i })).toBeNull()
    })
    it('can be undone: a sold piece goes back on sale, and the sold date is cleared', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Mark Quilt as available again' }))
      await waitFor(() => expect(originalRow('o2').status).toBe('available'))
      expect(originalRow('o2').sold_at).toBe(null)
      expect(await screen.findByRole('status')).toHaveTextContent('Marked as available again: Quilt.')
      expect(screen.getByRole('button', { name: 'Mark Quilt as sold' })).toBeInTheDocument()
    })
    it('changes nothing, and says so, if saving fails', async () => {
      const user = userEvent.setup()
      db.state.failUpdate = true
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Mark Rainforest as sold' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('That did not save. Nothing was changed.')
      expect(originalRow('o1').status).toBe('available')
      expect(screen.getByRole('button', { name: 'Mark Rainforest as sold' })).toBeInTheDocument()
    })
    it('changes only the piece you pressed', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Mark Rainforest as sold' }))
      await waitFor(() => expect(originalRow('o1').status).toBe('sold'))
      expect(originalRow('o2').status).toBe('sold')              // it already was
      expect(originalRow('o3').status).toBe('available')
      expect(db.state.products.filter((p) => p.fulfilment === 'creativehub').every((p) => p.status === undefined)).toBe(true)   // no print was touched
    })
    it('does not touch whether a piece is switched on', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Mark Rainforest as sold' }))
      await waitFor(() => expect(originalRow('o1').status).toBe('sold'))
      expect(originalRow('o1').published).toBe(true)
      expect(originalRow('o3').published).toBe(false)
    })
    it('is only for the owner: a signed-out visitor cannot reach it, and the database refuses anyone else', async () => {
      db.state.user = { id: 'a-customer' }
      const { setSold } = await import('../src/artloft/artLoftApi')
      await setSold('o1', true)                                       // the database quietly ignores a change by someone who does not own it
      expect(originalRow('o1').status).toBe('available')
    })
  })

  describe('switching on and off', () => {
    it('switches a piece off, and back on', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Switch Rainforest off' }))
      await waitFor(() => expect(originalRow('o1').published).toBe(false))
      expect(await screen.findByRole('status')).toHaveTextContent('Switched off: Rainforest. Only you can see it now.')
      await user.click(screen.getByRole('button', { name: 'Switch Rainforest on' }))
      await waitFor(() => expect(originalRow('o1').published).toBe(true))
    })
    it('will not switch on a piece with no photo, and says why', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Switch Storm on' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/needs at least one photo and a price/)
      expect(originalRow('o3').published).toBe(false)
    })
    it('will not switch on a piece with no price', async () => {
      const user = userEvent.setup()
      originalRow('o3').images = ['https://img.example/o3.jpg']
      originalRow('o3').price = null
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Switch Storm on' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/needs at least one photo and a price/)
      expect(originalRow('o3').published).toBe(false)
    })
  })

  describe('deleting a draft', () => {
    it('offers Delete only on a draft, never on a piece that is switched on or sold', async () => {
      open('/art-loft/admin/originals')
      await screen.findByText('Storm')
      expect(screen.getByRole('button', { name: 'Delete Storm' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete Rainforest' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Delete Quilt' })).toBeNull()
    })
    it('asks first, and lets you keep it', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Delete Storm' }))
      expect(screen.getByText('Delete this draft for good?')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Keep it' }))
      expect(screen.queryByText('Delete this draft for good?')).toBeNull()
      expect(originalRow('o3')).toBeTruthy()
    })
    it('deletes it when you say yes', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Delete Storm' }))
      await user.click(screen.getByRole('button', { name: 'Yes, delete Storm' }))
      await waitFor(() => expect(originalRow('o3')).toBeUndefined())
      expect(await screen.findByRole('status')).toHaveTextContent('Deleted the draft: Storm.')
      expect(screen.queryByText('Storm')).toBeNull()
    })
    it('can never delete a piece that is switched on, even if asked directly', async () => {
      await deleteOriginal('o1')
      await deleteOriginal('o2')
      expect(originalRow('o1')).toBeTruthy()
      expect(originalRow('o2')).toBeTruthy()
    })
  })

  describe('adding an original', () => {
    async function fillIn(user, { title = 'Dawn', price = '1,250', files = [photo('front.jpg'), photo('side.jpg')] } = {}) {
      await user.click(await screen.findByRole('button', { name: 'Add an original' }))
      await user.type(screen.getByLabelText('Title'), title)
      await user.selectOptions(screen.getByLabelText('Collection'), 'Calm Series')
      await user.type(screen.getByLabelText('Price (£)'), price)
      await user.type(screen.getByLabelText('Medium'), 'Oil on board')
      await user.type(screen.getByLabelText('Width (cm)'), '30')
      await user.type(screen.getByLabelText('Height (cm)'), '40')
      await user.type(screen.getByLabelText('Year'), '2026')
      await user.selectOptions(screen.getByLabelText('Framed'), 'yes')
      await user.type(screen.getByLabelText('Description'), 'Early light.')
      if (files.length) await user.upload(screen.getByLabelText('Add photos'), files)
    }
    it('saves a new original as a draft, with its photos in your own folder, and shows it in the list', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await fillIn(user)
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(db.state.products.some((p) => p.title === 'Dawn')).toBe(true))
      const saved = db.state.products.find((p) => p.title === 'Dawn')
      expect(saved).toMatchObject({ fulfilment: 'hand', published: false, status: 'available', author_id: 'owner-1', collection: 'Calm Series', price: 1250, medium: 'Oil on board', width_cm: 30, height_cm: 40, year: 2026, framed: true, description: 'Early light.' })
      expect(saved.images).toHaveLength(2)
      saved.images.forEach((u) => expect(u).toMatch(/^https:\/\/files\.example\/post-images\/owner-1\/originals\/\d+-\d\.jpg$/))
      expect(db.state.uploads).toHaveLength(2)
      expect(await screen.findByRole('status')).toHaveTextContent('Saved as a draft: Dawn.')
      expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()                    // the form closes
      expect(screen.getByText('Dawn')).toBeInTheDocument()
    })
    it('never makes a new original visible to visitors until you switch it on', async () => {
      const user = userEvent.setup()
      const first = open('/art-loft/admin/originals')
      await fillIn(user)
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(db.state.products.some((p) => p.title === 'Dawn')).toBe(true))
      first.unmount()
      db.state.user = null
      open('/art-loft/originals')
      await screen.findByRole('link', { name: /Rainforest/ })
      expect(screen.queryByText('Dawn')).toBeNull()
    })
    it('can be saved without photos, as a draft', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await fillIn(user, { files: [] })
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(db.state.products.some((p) => p.title === 'Dawn')).toBe(true))
      expect(db.state.products.find((p) => p.title === 'Dawn').images).toEqual([])
      expect(db.state.uploads).toHaveLength(0)
    })
    it('shows every problem at once, and saves and uploads nothing', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Add an original' }))
      await user.type(screen.getByLabelText('Price (£)'), 'lots')
      await user.type(screen.getByLabelText('Width (cm)'), '30')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByText('Please give it a title.')).toBeInTheDocument()
      expect(screen.getByText(/number above zero, like 1200/)).toBeInTheDocument()
      expect(screen.getByText(/give both the width and the height/)).toBeInTheDocument()
      expect(screen.getByText(/Please fix what is marked below. Nothing was saved./)).toBeInTheDocument()
      expect(db.state.products.some((p) => p.title === '')).toBe(false)
      expect(db.state.uploads).toHaveLength(0)
      expect(screen.getByLabelText('Title')).toBeInTheDocument()                         // the form stays open with what you typed
      expect(screen.getByLabelText('Width (cm)')).toHaveValue('30')
    })
    it('refuses a photo that is too big, is not a picture, or would make nine', async () => {
      const user = userEvent.setup({ applyAccept: false })
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Add an original' }))
      await user.upload(screen.getByLabelText('Add photos'), photo('huge.jpg', 7 * 1024 * 1024))
      expect(await screen.findByRole('alert')).toHaveTextContent(/huge\.jpg.*7\.0 MB.*smaller than 6 MB/)
      await user.upload(screen.getByLabelText('Add photos'), photo('notes.pdf', 1000, 'application/pdf'))
      expect(await screen.findByRole('alert')).toHaveTextContent(/not a picture/)
      expect(screen.queryByText(/to upload when you save/)).toBeNull()
      await user.upload(screen.getByLabelText('Add photos'), Array.from({ length: 9 }, (_, i) => photo(`p${i}.jpg`)))
      expect(await screen.findByRole('alert')).toHaveTextContent(/up to 8 photos/)
      expect(screen.queryByText(/to upload when you save/)).toBeNull()
    })
    it('lets you take back a photo you chose before saving', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Add an original' }))
      await user.upload(screen.getByLabelText('Add photos'), [photo('one.jpg'), photo('two.jpg')])
      await user.click(screen.getByRole('button', { name: 'Remove one.jpg' }))
      expect(screen.queryByText(/one\.jpg \(/)).toBeNull()
      expect(screen.getByText(/two\.jpg \(/)).toBeInTheDocument()
    })
    it('saves nothing, and leaves nothing behind, if the first photo will not upload', async () => {
      const user = userEvent.setup()
      db.state.failUpload = true
      open('/art-loft/admin/originals')
      await fillIn(user)
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/Photo 1 did not upload.*Nothing was saved/)
      expect(db.state.products.some((p) => p.title === 'Dawn')).toBe(false)
      expect(db.state.uploads).toHaveLength(0)
      expect(screen.getByLabelText('Title')).toHaveValue('Dawn')                           // still there to try again
    })
    it('removes the photos that did upload if a later one fails, so none is left behind', async () => {
      const user = userEvent.setup()
      db.state.failUpload = true
      db.state.failUploadAfter = 1
      open('/art-loft/admin/originals')
      await fillIn(user)
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/Photo 2 did not upload/)
      await waitFor(() => expect(db.state.removed).toHaveLength(1))
      expect(db.state.uploads).toHaveLength(0)
      expect(db.state.products.some((p) => p.title === 'Dawn')).toBe(false)
    })
    it('removes the uploaded photos if the photos went up but the save itself failed', async () => {
      const user = userEvent.setup()
      db.state.failInsert = true
      open('/art-loft/admin/originals')
      await fillIn(user)
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/Nothing was saved/)
      await waitFor(() => expect(db.state.removed).toHaveLength(2))
      expect(db.state.uploads).toHaveLength(0)
      expect(db.state.products.some((p) => p.title === 'Dawn')).toBe(false)
    })
    it('closes without saving when you press Cancel', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await fillIn(user, { files: [] })
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByLabelText('Title')).toBeNull()
      expect(db.state.products.some((p) => p.title === 'Dawn')).toBe(false)
    })
  })

  describe('editing an original', () => {
    it('opens with what is saved, and saves your changes', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Edit Rainforest' }))
      expect(screen.getByLabelText('Title')).toHaveValue('Rainforest')
      expect(screen.getByLabelText('Price (£)')).toHaveValue('1200')
      expect(screen.getByLabelText('Medium')).toHaveValue('Acrylic on canvas')
      expect(screen.getByLabelText('Width (cm)')).toHaveValue('60')
      expect(screen.getByLabelText('Framed')).toHaveValue('no')
      expect(screen.getByLabelText('Collection')).toHaveValue('Calm Series')
      await user.clear(screen.getByLabelText('Title'))
      await user.type(screen.getByLabelText('Title'), 'Rainforest at dusk')
      await user.clear(screen.getByLabelText('Price (£)'))
      await user.type(screen.getByLabelText('Price (£)'), '1350')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(originalRow('o1').title).toBe('Rainforest at dusk'))
      expect(originalRow('o1').price).toBe(1350)
      expect(await screen.findByRole('status')).toHaveTextContent('Saved: Rainforest at dusk.')
      expect(db.state.products.filter((p) => p.fulfilment === 'hand')).toHaveLength(3)       // edited, not duplicated
    })
    it('does not undo a sale, or a switch, when you edit something else', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Edit Quilt' }))
      await user.clear(screen.getByLabelText('Title'))
      await user.type(screen.getByLabelText('Title'), 'Patchwork quilt')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(originalRow('o2').title).toBe('Patchwork quilt'))
      expect(originalRow('o2').status).toBe('sold')
      expect(originalRow('o2').sold_at).toBe('2026-10-14T10:00:00Z')
      expect(originalRow('o2').published).toBe(true)
    })
    it('lets you remove a photo and choose which one is the main one', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Edit Rainforest' }))
      await user.click(screen.getByRole('button', { name: 'Make photo 2 the main one' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(originalRow('o1').images[0]).toBe('https://img.example/o1b.jpg'))
      expect(originalRow('o1').images).toEqual(['https://img.example/o1b.jpg', 'https://img.example/o1.jpg'])
      await user.click(await screen.findByRole('button', { name: 'Edit Rainforest' }))
      await user.click(screen.getByRole('button', { name: 'Remove photo 1' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(originalRow('o1').images).toEqual(['https://img.example/o1.jpg']))
    })
    it('will not leave a piece that is switched on with no photo at all', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Edit Quilt' }))
      await user.click(screen.getByRole('button', { name: 'Remove photo 1' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/switched on needs at least one photo.*Nothing was saved/)
      expect(originalRow('o2').images).toEqual(['https://img.example/o2.jpg'])
    })
    it('adds photos to a piece that already has some', async () => {
      const user = userEvent.setup()
      open('/art-loft/admin/originals')
      await user.click(await screen.findByRole('button', { name: 'Edit Storm' }))
      await user.upload(screen.getByLabelText('Add photos'), photo('storm.jpg'))
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(originalRow('o3').images).toHaveLength(1))
      expect(originalRow('o3').images[0]).toMatch(/owner-1\/originals\//)
    })
  })

  describe('before the database has been updated', () => {
    it('says exactly what to do, instead of showing a database error', async () => {
      db.state.noOriginalColumns = true
      open('/art-loft/admin/originals')
      expect(await screen.findByRole('alert')).toHaveTextContent(MISSING_ORIGINAL_COLUMNS)
      expect(screen.getByRole('alert')).toHaveTextContent(/sql\/originals\.sql/)
      expect(screen.queryByRole('button', { name: 'Add an original' })).toBeNull()
    })
  })

  describe('finding your way around', () => {
    it('links to the prints admin and back to the Art Loft', async () => {
      open('/art-loft/admin/originals')
      await screen.findByText('Storm')
      expect(screen.getByRole('link', { name: '← Back to the Art Loft' })).toHaveAttribute('href', '/art-loft')
      expect(screen.getByRole('link', { name: 'Manage prints' })).toHaveAttribute('href', '/art-loft/admin')
    })
    it('is linked from the prints admin page', async () => {
      open('/art-loft/admin')
      expect(await screen.findByRole('link', { name: 'Manage original paintings' })).toHaveAttribute('href', '/art-loft/admin/originals')
    })
  })
})
