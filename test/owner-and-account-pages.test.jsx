// The sign-in pages and the owner's forms, in their new look: structure, words, plain-words problems, and what they send.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ inserts: [], insertError: null, uploads: [], recovery: false, reset: vi.fn(async () => ({ error: null })) }))
vi.mock('../src/supabaseClient', () => ({
  supabase: {
    auth: { signInWithPassword: vi.fn(async () => ({ error: null })), signUp: vi.fn(async () => ({ data: {}, error: null })), resetPasswordForEmail: (...a) => h.reset(...a), updateUser: vi.fn(async () => ({ error: null })), getSession: vi.fn(async () => ({ data: { session: null } })), onAuthStateChange: vi.fn((cb) => { if (h.recovery) cb('PASSWORD_RECOVERY', { user: { id: 'u' } }); return { data: { subscription: { unsubscribe() {} } } } }) },
    from: (table) => ({ insert: async (row) => { h.inserts.push([table, row]); return { error: h.insertError } } }),
    storage: { from: () => ({ upload: async (p, f) => { h.uploads.push(p); return { error: null } }, getPublicUrl: () => ({ data: { publicUrl: 'https://x.example/p.png' } }) }) },
  },
}))
import Login from '../src/pages/Login'
import Signup from '../src/pages/Signup'
import ForgotPassword from '../src/pages/ForgotPassword'
import ResetPassword from '../src/pages/ResetPassword'
import NewPost from '../src/pages/NewPost'
import NewProduct from '../src/pages/NewProduct'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const session = { user: { id: 'gill' } }
const at = (path, element, ui) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={element} /><Route path="/" element={<p>HOME</p>} /><Route path="/admin" element={<p>ADMIN</p>} /><Route path="/products" element={<p>PRODUCTS</p>} /></Routes></MemoryRouter>)
beforeEach(() => { h.recovery = false; h.inserts = []; h.insertError = null; h.uploads = []; h.reset.mockClear() })

describe('the sign-in pages: one card each, as designed', () => {
  it('log in: a card with the heading, "Welcome back.", a full-width primary button, and the two links on one row', () => {
    const { container } = at('/login', <Login />)
    expect(container.querySelector('main.fm.fm--auth .fm__card')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toHaveClass('fm__title')
    expect(screen.getByText('Welcome back.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveClass('pg-btn', 'fm-btn--primary', 'fm__submit')
    const links = container.querySelector('.fm__links')
    expect(within(links).getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute('href', '/forgot-password')
    expect(links).toHaveTextContent('New here? Sign up')
    expect(within(links).getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
    expect(container.querySelector('form')).toHaveClass('fm__form')
  })
  it('sign up: the design\u2019s line under the heading, the existing rules kept, and a way to log in', () => {
    const { container } = at('/signup', <Signup />)
    expect(container.querySelector('main.fm--auth .fm__card')).not.toBeNull()
    expect(screen.getByText('So you can follow along, and keep your orders in one place.')).toBeInTheDocument()
    expect(screen.getByText('At least 6 characters.')).toBeInTheDocument() // the real rule, not the design's 8
    expect(screen.getByRole('button', { name: 'Create account' })).toHaveClass('fm-btn--primary')
    expect(container.querySelector('.fm__links')).toHaveTextContent('Already have an account? Log in')
  })
  it('forgot password: the card, the explanation, the button, and the way back', () => {
    const { container } = at('/forgot-password', <ForgotPassword />)
    expect(container.querySelector('main.fm--auth .fm__card')).not.toBeNull()
    expect(screen.getByText(/we'll send you a link to choose a new one/)).toHaveClass('fm__sub')
    expect(screen.getByRole('button', { name: 'Send reset link' })).toHaveClass('fm-btn--primary')
    expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login')
  })
  it('forgot password, after sending: the same card, with a button of its own to try another email (it used to be unstyled)', async () => {
    const user = userEvent.setup()
    const { container } = at('/forgot-password', <ForgotPassword />)
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(container.querySelector('main.fm--auth .fm__card')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Use a different email' })).toHaveClass('pg-btn')
    expect(screen.getByRole('link', { name: 'Back to log in' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use a different email' }))
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument()
  })
  it('reset password, while it checks the link: the same card, with a status message', () => {
    const { container } = at('/reset-password', <ResetPassword />)
    expect(container.querySelector('main.fm--auth .fm__card')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toHaveClass('fm__title')
    expect(screen.getByRole('status')).toHaveTextContent('Checking your link…')
  })
  it('reset password: the card, both fields, and the button', async () => {
    h.recovery = true
    const { container } = at('/reset-password', <ResetPassword />)
    await screen.findByRole('heading', { level: 1, name: 'Choose a new password' })
    expect(container.querySelector('main.fm--auth .fm__card')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeInTheDocument()
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save new password' })).toHaveClass('fm-btn--primary')
  })
})

describe('New post', () => {
  const open = () => at('/new', <NewPost session={session} />)
  it('has a visible label on every field, a Publish button and a Cancel button', () => {
    open()
    expect(screen.getByRole('heading', { level: 1, name: 'New post' })).toBeInTheDocument()
    for (const label of ['Title', 'Post text', 'Tags', 'Room']) expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByLabelText(/Header picture \(optional, up to 6 MB\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveClass('fm-btn--primary')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('pg-btn')
  })
  it('does not publish an empty post, and says what is missing, in words, once for each thing', async () => {
    const user = userEvent.setup(); open()
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Write a title for the post.')
    expect(alert).toHaveTextContent('Write the post itself.')
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(h.inserts).toEqual([])
  })
  it('refuses a header picture over 6 MB', async () => {
    const user = userEvent.setup(); open()
    await user.type(screen.getByLabelText('Title'), 'T'); await user.type(screen.getByLabelText('Post text'), 'Words')
    const big = new File(['x'], 'big.png', { type: 'image/png' }); Object.defineProperty(big, 'size', { value: 7 * 1024 * 1024 })
    await user.upload(screen.getByLabelText(/Header picture/), big)
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That picture is over 6 MB. Choose a smaller one.')
    expect(h.inserts).toEqual([]); expect(h.uploads).toEqual([])
  })
  it('publishes a good post: tags split on commas, the room kept, and goes to the home page', async () => {
    const user = userEvent.setup(); open()
    await user.type(screen.getByLabelText('Title'), 'Day Fifteen'); await user.type(screen.getByLabelText('Post text'), 'Some words')
    await user.type(screen.getByLabelText('Tags'), ' art, travel ,, ')
    await user.selectOptions(screen.getByLabelText('Room'), 'factory-floor')
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await screen.findByText('HOME')
    expect(h.inserts).toEqual([['posts', { title: 'Day Fifteen', content: 'Some words', image_url: null, author_id: 'gill', published: true, tags: ['art', 'travel'], channel: 'factory-floor' }]])
  })
  it('says plainly when the database refuses, keeps the form, and does not leave the page', async () => {
    h.insertError = { message: 'new row violates row-level security policy' }
    const user = userEvent.setup(); open()
    await user.type(screen.getByLabelText('Title'), 'T'); await user.type(screen.getByLabelText('Post text'), 'W')
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText('The post was not saved')).toBeInTheDocument()
    expect(screen.queryByText('HOME')).toBeNull()
    expect(screen.getByLabelText('Title')).toHaveValue('T')
  })
  it('goes to Admin when Cancel is pressed, without saving', async () => {
    const user = userEvent.setup(); open()
    await user.type(screen.getByLabelText('Title'), 'T')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('ADMIN')).toBeInTheDocument()
    expect(h.inserts).toEqual([])
  })
})

describe('New product (the old shop\u2019s form)', () => {
  it('has a visible label on every field and a Cancel button, and still saves what it did before', async () => {
    const user = userEvent.setup()
    at('/new-product', <NewProduct session={session} />)
    expect(screen.getByRole('heading', { level: 1, name: 'New product' })).toBeInTheDocument()
    for (const label of ['Title', 'Description', 'Price (£)', 'Kind of product', 'Collection', 'Images']) expect(screen.getByLabelText(label)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'A print'); await user.type(screen.getByLabelText('Description'), 'Nice'); await user.type(screen.getByLabelText('Price (£)'), '12.5')
    await user.click(screen.getByRole('button', { name: 'Publish Product' }))
    await screen.findByText('PRODUCTS')
    expect(h.inserts[0][0]).toBe('products')
    expect(h.inserts[0][1]).toMatchObject({ title: 'A print', description: 'Nice', price: 12.5, product_type: 'original', collection: null, images: [], author_id: 'gill', published: true })
  })
  it('goes to Admin on Cancel, and says plainly when saving fails', async () => {
    const user = userEvent.setup()
    h.insertError = { message: 'nope' }
    const first = at('/new-product', <NewProduct session={session} />)
    await user.type(screen.getByLabelText('Title'), 'A'); await user.type(screen.getByLabelText('Description'), 'B'); await user.type(screen.getByLabelText('Price (£)'), '1')
    await user.click(screen.getByRole('button', { name: 'Publish Product' }))
    expect(await screen.findByText('The product was not saved')).toBeInTheDocument()
    first.unmount()
    at('/new-product', <NewProduct session={session} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('ADMIN')).toBeInTheDocument()
  })
})

describe('the styles', () => {
  const css = read('src/styles/forms.css')
  it('are the design\u2019s: a card with a navy border and the soft blue shadow, and no text under 14px', () => {
    expect(css).toMatch(/\.fm__card \{[^}]*border:\s*2px solid var\(--sf-navy-700/)
    expect(css).toMatch(/\.fm__card \{[^}]*box-shadow:\s*6px 8px 0/)
    for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('stand on their own: no inline styles in the seven pages', () => {
    for (const f of ['Login', 'Signup', 'ForgotPassword', 'ResetPassword', 'NewPost', 'EditPost', 'NewProduct']) expect(read(`src/pages/${f}.jsx`), f).not.toMatch(/style=\{\{/)
  })
})
