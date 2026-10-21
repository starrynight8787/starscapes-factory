// The New product form says what is wrong in plain words, the same way the New post form does (SFW-201): a summary at the top that links to each problem,
// a message under each field with a red outline and an exclamation mark (aria-invalid), nothing saved until it is fixed, and no browser pop-ups in its place.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const h = vi.hoisted(() => ({ inserts: [], uploads: [], insertError: null }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: (table) => ({ insert: async (row) => { h.inserts.push([table, row]); return { error: h.insertError } } }),
    storage: { from: () => ({ upload: async (p) => { h.uploads.push(p); return { error: null } }, getPublicUrl: () => ({ data: { publicUrl: 'https://x.example/p.png' } }) }) },
  },
}))
import NewProduct from '../src/pages/NewProduct'
import { productProblems } from '../src/pages/productFormRules'

const session = { user: { id: 'gill' } }
const show = () => render(<MemoryRouter initialEntries={['/new-product']}><Routes><Route path="/new-product" element={<NewProduct session={session} />} /><Route path="/products" element={<p>PRODUCTS</p>} /><Route path="/admin" element={<p>ADMIN</p>} /></Routes></MemoryRouter>)
const submit = (user) => user.click(screen.getByRole('button', { name: 'Publish Product' }))
const fillAll = async (user, price = '12.5') => { await user.type(screen.getByLabelText('Title'), 'A print'); await user.type(screen.getByLabelText('Description'), 'Nice'); if (price) await user.type(screen.getByLabelText('Price (£)'), price) }
beforeEach(() => { h.inserts = []; h.uploads = []; h.insertError = null })

describe('what the product form checks (in plain words)', () => {
  it('asks for a title, a description and a price, and says how to write each one', () => {
    expect(productProblems({ title: '', description: '', price: '', files: [] })).toEqual({ title: 'Write a title for the product.', description: 'Write a description of the product.', price: 'Enter the price in pounds, for example 35.00.' })
    expect(productProblems({ title: '   ', description: ' \n ', price: '12', files: [] })).toEqual({ title: 'Write a title for the product.', description: 'Write a description of the product.' }) // spaces alone are not words
  })
  it('refuses a price of nothing, a negative price or something that is not a number, and accepts any sensible price', () => {
    for (const bad of ['0', '0.00', '-5', 'abc', 'Infinity']) expect(productProblems({ title: 't', description: 'd', price: bad, files: [] }).price, bad).toBe('Enter a price above £0, for example 35.00.')
    for (const good of ['35', '35.00', '0.5', '1200', ' 12.5 ']) expect(productProblems({ title: 't', description: 'd', price: good, files: [] }), good).toEqual({})
  })
  it('names a file that is not a picture, or all of them', () => {
    const f = (name, type) => ({ name, type })
    expect(productProblems({ title: 't', description: 'd', price: '1', files: [f('a.png', 'image/png'), f('terms.pdf', 'application/pdf')] }).files).toBe('terms.pdf is not a picture. Choose pictures only.')
    expect(productProblems({ title: 't', description: 'd', price: '1', files: [f('terms.pdf', 'application/pdf'), f('notes.doc', 'application/msword'), f('a.jpg', 'image/jpeg')] }).files).toBe('These files are not pictures: terms.pdf, notes.doc. Choose pictures only.')
    expect(productProblems({ title: 't', description: 'd', price: '1', files: [f('a.png', 'image/png'), f('b.webp', 'image/webp')] })).toEqual({})
  })
})

describe('the New product form', () => {
  it('turns the browser\u2019s own pop-ups off, so the site\u2019s messages are the ones that show', () => {
    show(); expect(screen.getByRole('button', { name: 'Publish Product' }).closest('form')).toHaveAttribute('novalidate')
  })
  it('sent empty: a summary at the top with a link to each problem, a message under each field, red-outlined fields, focus on the summary, and nothing saved', async () => {
    const user = userEvent.setup(); show(); await submit(user)
    const summary = screen.getByRole('alert'); expect(summary).toHaveFocus(); expect(within(summary).getByRole('heading', { name: 'There is a problem' })).toBeInTheDocument()
    expect(within(summary).getAllByRole('link').map((l) => l.textContent)).toEqual(['Write a title for the product.', 'Write a description of the product.', 'Enter the price in pounds, for example 35.00.'])
    for (const [label, id, message] of [['Title', 'npr-title', 'Write a title for the product.'], ['Description', 'npr-description', 'Write a description of the product.'], ['Price (£)', 'npr-price', 'Enter the price in pounds, for example 35.00.']]) {
      const field = screen.getByLabelText(label); expect(field, label).toHaveAttribute('aria-invalid', 'true'); expect(field.getAttribute('aria-describedby'), label).toContain(`${id}-error`)
      expect(document.getElementById(`${id}-error`), label).toHaveTextContent(message)
    }
    expect(screen.getByLabelText('Kind of product')).not.toHaveAttribute('aria-invalid'); expect(h.inserts).toEqual([]); expect(h.uploads).toEqual([])
  })
  it('does not pull you out of a field while you type to fix it: after a failed send, a long title keeps every letter and the focus stays in the field', async () => {
    const user = userEvent.setup(); show(); await submit(user); expect(screen.getByRole('alert')).toHaveFocus()
    await user.click(screen.getByLabelText('Title')); await user.keyboard('The Moon Garden, framed')
    expect(screen.getByLabelText('Title')).toHaveValue('The Moon Garden, framed'); expect(screen.getByLabelText('Title')).toHaveFocus()
  })
  it('lets a summary link take you straight to its field', async () => {
    const user = userEvent.setup(); show(); await submit(user)
    await user.click(within(screen.getByRole('alert')).getByRole('link', { name: 'Enter the price in pounds, for example 35.00.' })); expect(screen.getByLabelText('Price (£)')).toHaveFocus()
  })
  it('names only what is wrong: a title and description but no price points at the price alone', async () => {
    const user = userEvent.setup(); show(); await fillAll(user, ''); await submit(user)
    expect(within(screen.getByRole('alert')).getAllByRole('link')).toHaveLength(1); expect(screen.getByLabelText('Price (£)')).toHaveAttribute('aria-invalid', 'true'); expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-invalid'); expect(h.inserts).toEqual([])
  })
  it('refuses a price of nothing or less, saving nothing', async () => {
    const user = userEvent.setup(); show(); await fillAll(user, '0'); await submit(user)
    expect(document.getElementById('npr-price-error')).toHaveTextContent('Enter a price above £0, for example 35.00.'); expect(h.inserts).toEqual([])
  })
  it('refuses a file that is not a picture, naming it, saving nothing and uploading nothing', async () => {
    const user = userEvent.setup(); show(); await fillAll(user)
    fireEvent.change(screen.getByLabelText('Images'), { target: { files: [new File(['x'], 'terms.pdf', { type: 'application/pdf' })] } }); await submit(user)
    expect(document.getElementById('npr-images-error')).toHaveTextContent('terms.pdf is not a picture. Choose pictures only.'); expect(h.inserts).toEqual([]); expect(h.uploads).toEqual([])
  })
  it('clears its messages once everything is put right, then saves exactly what it did before, uploads included', async () => {
    const user = userEvent.setup(); show(); await submit(user); expect(screen.getByRole('alert')).toBeInTheDocument()
    await fillAll(user)
    await user.upload(screen.getByLabelText('Images'), [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.png', { type: 'image/png' })]); await submit(user)
    expect(await screen.findByText('PRODUCTS')).toBeInTheDocument(); expect(h.uploads).toHaveLength(2)
    expect(h.inserts[0][1]).toMatchObject({ title: 'A print', description: 'Nice', price: 12.5, product_type: 'original', collection: null, images: ['https://x.example/p.png', 'https://x.example/p.png'], author_id: 'gill', published: true })
  })
  it('says plainly when the database refuses, keeping what was typed and showing no problem list (nothing for her to fix)', async () => {
    const user = userEvent.setup(); h.insertError = { message: 'nope' }; show(); await fillAll(user); await submit(user)
    expect(await screen.findByText('The product was not saved')).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'There is a problem' })).toBeNull()
    expect(screen.getByLabelText('Title')).toHaveValue('A print'); expect(screen.getByLabelText('Price (£)')).toHaveValue(12.5)
  })
})
