import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// A pretend Supabase sign-in system that records what the pages ask of it, and answers as told
const auth = vi.hoisted(() => {
  const a = {
    calls: [], signInError: null, signUpError: null, resetError: null, updateError: null, session: null, hold: null,
    async signInWithPassword(creds) { a.calls.push(['signIn', creds]); if (a.hold) await a.hold; return { error: a.signInError } },
    async signUp(creds) { a.calls.push(['signUp', creds]); return { error: a.signUpError } },
    async resetPasswordForEmail(email) { a.calls.push(['reset', email]); return { error: a.resetError } },
    async updateUser(patch) { a.calls.push(['update', patch]); return { error: a.updateError } },
    async getSession() { return { data: { session: a.session } } },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } },
  }
  return a
})
vi.mock('../src/supabaseClient', () => ({ supabase: { auth } }))

import Login from '../src/pages/Login'
import Signup from '../src/pages/Signup'
import ForgotPassword from '../src/pages/ForgotPassword'
import ResetPassword from '../src/pages/ResetPassword'

const at = (path, ui) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={ui} /><Route path="/" element={<p>THE HOMEPAGE</p>} /></Routes></MemoryRouter>)
beforeEach(() => { Object.assign(auth, { calls: [], signInError: null, signUpError: null, resetError: null, updateError: null, session: { user: {} }, hold: null }) })
const alerts = () => screen.queryAllByRole('alert')

describe('log in', () => {
  it('has a visible label for each field, and the browser is told what to fill in', () => {
    at('/login', <Login />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
  })
  it('says what is missing, in a summary and under each field, without asking the service anything', async () => {
    const user = userEvent.setup()
    at('/login', <Login />)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    const summary = await screen.findByRole('alert')
    expect(within(summary).getByRole('heading', { name: 'There is a problem' })).toBeInTheDocument()
    expect(within(summary).getAllByRole('link').map((a) => a.textContent)).toEqual(['Enter your email address, for example name@example.com', 'Enter your password'])
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById('login-email-error').textContent).toContain('Enter your email address')
    expect(document.activeElement).toBe(summary)
    expect(auth.calls).toEqual([])
    expect(alerts()).toHaveLength(1)
  })
  it('says how to fix an email that is not an email', async () => {
    const user = userEvent.setup()
    at('/login', <Login />)
    await user.type(screen.getByLabelText('Email'), 'name@example')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Add the @ and the ending, for example .com')
    expect(auth.calls).toEqual([])
  })
  it('moves the focus into a field when its problem is clicked', async () => {
    const user = userEvent.setup()
    at('/login', <Login />)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await user.click(await screen.findByRole('link', { name: 'Enter your password' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Password'))
  })
  it('says a wrong email or password in plain words, keeps what was typed, and does not say which one is wrong', async () => {
    const user = userEvent.setup()
    auth.signInError = { message: 'Invalid login credentials', status: 400 }
    at('/login', <Login />)
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.type(screen.getByLabelText('Password'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Your email or password is not right. Check them and try again.')
    expect(within(summary).getByRole('link')).toHaveAttribute('href', '#login-email')
    expect(screen.queryByText('Invalid login credentials')).toBeNull()
    expect(screen.getByLabelText('Email')).toHaveValue('gill@example.com')
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('THE HOMEPAGE')).toBeNull()
  })
  it('says when the email has not been confirmed yet', async () => {
    const user = userEvent.setup()
    auth.signInError = { message: 'Email not confirmed', status: 400 }
    at('/login', <Login />)
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please confirm your email first. Check your inbox for the link we sent you.')
  })
  it.each([
    ['too many tries', { message: 'Request rate limit reached', status: 429 }, 'Too many tries just now. Please wait a few minutes and try again.'],
    ['anything else', { message: 'fetch failed' }, "We couldn't log you in just now. Please try again in a moment."],
  ])('shows %s as a plain failure on our side, with nothing for the person to fix', async (_, err, words) => {
    const user = userEvent.setup()
    auth.signInError = err
    at('/login', <Login />)
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    const box = await screen.findByRole('alert')
    expect(box).toHaveTextContent(words)
    expect(within(box).queryByRole('link')).toBeNull()
    expect(screen.queryByText('There is a problem')).toBeNull()
    expect(alerts()).toHaveLength(1)
  })
  it('logs in with the email tidied, and goes to the homepage', async () => {
    const user = userEvent.setup()
    at('/login', <Login />)
    await user.type(screen.getByLabelText('Email'), '  gill@example.com ')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('THE HOMEPAGE')).toBeInTheDocument()
    expect(auth.calls).toEqual([['signIn', { email: 'gill@example.com', password: 'secret123' }]])
  })
  it('stops a second click while it is logging in', async () => {
    const user = userEvent.setup()
    let release
    auth.hold = new Promise((r) => { release = r })
    at('/login', <Login />)
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled()
    release()
    await waitFor(() => expect(screen.getByText('THE HOMEPAGE')).toBeInTheDocument())
  })
})

describe('sign up', () => {
  it('has visible labels, help for the password, and tells the browser what to fill in', () => {
    at('/signup', <Signup />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveAttribute('aria-describedby', 'signup-password-help')
    expect(screen.getByText('At least 6 characters.').id).toBe('signup-password-help')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })
  it('says what is missing or too short, in plain words', async () => {
    const user = userEvent.setup()
    at('/signup', <Signup />)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const summary = await screen.findByRole('alert')
    expect(within(summary).getAllByRole('link').map((a) => a.textContent)).toEqual(['Enter your email address, for example name@example.com', 'Choose a password'])
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.type(screen.getByLabelText('Password'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Use at least 6 characters for your password')
    expect(document.getElementById('signup-password-error').textContent).toContain('Use at least 6 characters')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-describedby', 'signup-password-help signup-password-error')
    expect(auth.calls).toEqual([])
  })
  it('shows good news in a green box that is announced, and asks the service with a tidy email', async () => {
    const user = userEvent.setup()
    at('/signup', <Signup />)
    await user.type(screen.getByLabelText('Email'), ' gill@example.com ')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const box = await screen.findByRole('status')
    expect(box).toHaveTextContent('Account created')
    expect(box).toHaveTextContent('Check your email to confirm your account, then log in.')
    expect(auth.calls).toEqual([['signUp', { email: 'gill@example.com', password: 'secret123' }]])
    expect(alerts()).toHaveLength(0)
  })
  it.each([
    ['an email that already has an account', { message: 'User already registered' }, 'There is already an account with that email address. Try logging in instead.', 'signup-email-error'],
    ['a password the service does not like', { message: 'Password should contain at least one number.' }, 'Password should contain at least one number.', 'signup-password-error'],
  ])('puts %s under its own field, and in the summary', async (_, err, words, errorId) => {
    const user = userEvent.setup()
    auth.signUpError = err
    at('/signup', <Signup />)
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(words)
    expect(document.getElementById(errorId).textContent).toContain(words)
    expect(alerts()).toHaveLength(1)
  })
  it.each([
    ['too many tries', { message: 'rate limit', status: 429 }, 'Too many tries just now. Please wait a few minutes and try again.'],
    ['anything else', { message: 'network down' }, "We couldn't create your account just now. Please try again in a moment."],
  ])('shows %s as a plain failure on our side', async (_, err, words) => {
    const user = userEvent.setup()
    auth.signUpError = err
    at('/signup', <Signup />)
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const box = await screen.findByRole('alert')
    expect(box).toHaveTextContent(words)
    expect(within(box).queryByRole('link')).toBeNull()
  })
})

describe('forgot password: the new messages', () => {
  it('says what is wrong with an empty or odd email, without sending anything', async () => {
    const user = userEvent.setup()
    at('/forgot-password', <ForgotPassword />)
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your email address, for example name@example.com')
    expect(document.getElementById('forgot-email-error')).not.toBeNull()
    await user.type(screen.getByLabelText('Email'), 'name@example')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Add the @ and the ending, for example .com')
    expect(auth.calls).toEqual([])
  })
  it('clears the problem once the email is right, and shows the good news in a green box', async () => {
    const user = userEvent.setup()
    at('/forgot-password', <ForgotPassword />)
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    await screen.findByRole('alert')
    await user.type(screen.getByLabelText('Email'), 'gill@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    const box = await screen.findByRole('status')
    expect(box).toHaveTextContent("If there is an account for that email address, we've sent a link to reset your password.")
    expect(box).toHaveTextContent('It can take a few minutes, and it might land in your spam folder.')
    expect(alerts()).toHaveLength(0)
  })
})

describe('reset password: the new messages', () => {
  const open = async () => { const user = userEvent.setup(); at('/reset-password', <ResetPassword />); await screen.findByLabelText('New password'); return user }
  it('has a visible label on each box', async () => {
    await open()
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('autocomplete', 'new-password')
  })
  it('puts a too-short password under its own box and in the summary, and takes the focus', async () => {
    const user = await open()
    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm new password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Please use at least 8 characters.')
    expect(document.getElementById('reset-password-error').textContent).toContain('at least 8 characters')
    expect(screen.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'true')
    expect(document.activeElement).toBe(summary)
    expect(auth.calls).toEqual([])
  })
  it('puts a mismatch under the second box', async () => {
    const user = await open()
    await user.type(screen.getByLabelText('New password'), 'Longenough1!')
    await user.type(screen.getByLabelText('Confirm new password'), 'Different1!')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The two passwords do not match.')
    expect(document.getElementById('reset-confirm-error').textContent).toContain('do not match')
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('New password')).not.toHaveAttribute('aria-invalid')
  })
  it('puts the service\u2019s own words about a weak password under the first box', async () => {
    const user = await open()
    auth.updateError = { message: 'Password is too easy to guess' }
    await user.type(screen.getByLabelText('New password'), 'password123')
    await user.type(screen.getByLabelText('Confirm new password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('too easy to guess')
    expect(document.getElementById('reset-password-error').textContent).toContain('too easy to guess')
    expect(alerts()).toHaveLength(1)
  })
  it('shows good news in a green box that is announced', async () => {
    const user = await open()
    await user.type(screen.getByLabelText('New password'), 'Brand-new-pass9')
    await user.type(screen.getByLabelText('Confirm new password'), 'Brand-new-pass9')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('status')).toHaveTextContent("Your new password is saved and you're signed in.")
    expect(alerts()).toHaveLength(0)
  })
})
