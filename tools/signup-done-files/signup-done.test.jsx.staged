// After an account is made (22 October 2026: "I created the account but I still have the button to create again. It should clear the fields and direct me to log in").
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const auth = vi.hoisted(() => {
  const a = {
    calls: [], signUpError: null,
    async signUp(creds) { a.calls.push(['signUp', creds]); return { error: a.signUpError } },
    async getSession() { return { data: { session: null } } },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } },
  }
  return a
})
vi.mock('../src/supabaseClient', () => ({ supabase: { auth } }))
import Signup from '../src/pages/Signup'

const open = () => render(<MemoryRouter initialEntries={['/signup']}><Routes><Route path="/signup" element={<Signup />} /><Route path="/login" element={<p>THE LOG IN PAGE</p>} /></Routes></MemoryRouter>)
beforeEach(() => { auth.calls = []; auth.signUpError = null })
async function createAccount(user, email = ' gill@example.com ', password = 'secret123') {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByRole('status')
}

describe('once the account is made', () => {
  it('the form is gone, so there is no Create account button to press a second time', async () => {
    const user = userEvent.setup(); open()
    await createAccount(user)
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull()
    expect(screen.queryByLabelText('Email')).toBeNull(); expect(screen.queryByLabelText('Password')).toBeNull()
    expect(auth.calls).toHaveLength(1)
  })
  it('says what happened and what to do next, and which address the link went to (so a typo can be spotted)', async () => {
    const user = userEvent.setup(); open()
    await createAccount(user)
    const box = screen.getByRole('status')
    expect(box).toHaveTextContent('Account created')
    expect(box).toHaveTextContent('Check your email to confirm your account, then log in.')
    expect(box).toHaveTextContent('We sent the link to gill@example.com.') // the tidy address, not the one with spaces round it
  })
  it('points to log in: one clear Log in button that goes to the log in page (and the old "Already have an account?" line is not shown beside it)', async () => {
    const user = userEvent.setup(); open()
    await createAccount(user)
    const links = screen.getAllByRole('link', { name: 'Log in' })
    expect(links).toHaveLength(1); expect(links[0]).toHaveAttribute('href', '/login')
    expect(links[0].className).toMatch(/fm-btn--primary/)
    expect(screen.queryByText(/Already have an account/)).toBeNull()
    await user.click(links[0]); expect(screen.getByText('THE LOG IN PAGE')).toBeInTheDocument()
  })
  it('moves the keyboard focus to the new message, because the button it was on has gone', async () => {
    const user = userEvent.setup(); const { container } = open()
    await createAccount(user)
    expect(document.activeElement).toBe(container.querySelector('.fm__done'))
  })
})

describe('the fields are cleared, and "Start again" gives an empty form', () => {
  it('neither the email nor the password is kept: starting again shows both empty', async () => {
    const user = userEvent.setup(); open()
    await createAccount(user)
    await user.click(screen.getByRole('button', { name: 'Start again' }))
    expect(screen.getByLabelText('Email')).toHaveValue(''); expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login') // the ordinary "Already have an account?" link is back
  })
  it('a mistyped address can be put right: starting again and sending again asks for the new address', async () => {
    const user = userEvent.setup(); open()
    await createAccount(user, 'gil@example.com', 'secret123')
    await user.click(screen.getByRole('button', { name: 'Start again' }))
    await user.type(screen.getByLabelText('Email'), 'gill@example.com'); await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('status')).toHaveTextContent('We sent the link to gill@example.com.')
    expect(auth.calls.map((c) => c[1].email)).toEqual(['gil@example.com', 'gill@example.com'])
  })
})

describe('a sign-up that did NOT work leaves everything as it was', () => {
  it('an email that already has an account: the form stays, the fields keep what was typed, and no "Account created" appears', async () => {
    auth.signUpError = { message: 'User already registered' }
    const user = userEvent.setup(); open()
    await user.type(screen.getByLabelText('Email'), 'gill@example.com'); await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect((await screen.findAllByText(/already an account with that email address/)).length).toBeGreaterThan(0) // said in the summary box and under the field
    expect(screen.getByLabelText('Email')).toHaveValue('gill@example.com'); expect(screen.getByLabelText('Password')).toHaveValue('secret123')
    expect(screen.queryByRole('status')).toBeNull(); expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })
  it('a problem on our side: same, nothing cleared, nothing hidden', async () => {
    auth.signUpError = { message: 'Failed to fetch' }
    const user = userEvent.setup(); open()
    await user.type(screen.getByLabelText('Email'), 'gill@example.com'); await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByText("We couldn't create your account")
    expect(screen.getByLabelText('Email')).toHaveValue('gill@example.com'); expect(screen.getByLabelText('Password')).toHaveValue('secret123')
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('a form with a problem (no password) is not sent, and nothing is cleared', async () => {
    const user = userEvent.setup(); open()
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(auth.calls).toEqual([]); expect(screen.getByLabelText('Email')).toHaveValue('gill@example.com'); expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the styles it needs', () => {
  const css = fs.readFileSync('src/styles/forms.css', 'utf8')
  it('a link can be drawn as the button (no underline), the box takes focus quietly, and "Start again" looks like a link', () => {
    expect(css).toMatch(/\.fm__submit \{[^}]*text-decoration: none;/)
    expect(css).toMatch(/\.fm__done:focus \{\s*outline: none;/)
    expect(css).toMatch(/\.fm__textbtn \{[^}]*text-decoration: underline;[^}]*\}/)
  })
})
