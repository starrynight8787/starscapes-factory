// The security check on the three forms bots were hitting (22 October 2026): Sign up, Log in, Forgot password.
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const auth = vi.hoisted(() => {
  const a = {
    calls: [], signUpError: null, signInError: null, resetError: null,
    async signUp(creds) { a.calls.push(['signUp', creds]); return { error: a.signUpError } },
    async signInWithPassword(creds) { a.calls.push(['signIn', creds]); return { error: a.signInError } },
    async resetPasswordForEmail(email, options) { a.calls.push(['reset', email, options]); return { error: a.resetError } },
    async getSession() { return { data: { session: null } } },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } },
  }
  return a
})
vi.mock('../src/supabaseClient', () => ({ supabase: { auth } }))
import Signup from '../src/pages/Signup'
import Login from '../src/pages/Login'
import ForgotPassword from '../src/pages/ForgotPassword'
import { CAPTCHA_WAIT, CAPTCHA_BROKEN, CAPTCHA_FAILED } from '../src/pages/formRules'

let tw
function fakeTurnstile() {
  tw = { widgets: [], render: vi.fn((el, opts) => { const id = 'w' + (tw.widgets.length + 1); tw.widgets.push({ id, opts }); return id }), reset: vi.fn(), remove: vi.fn() }
  window.turnstile = tw
}
const latest = () => tw.widgets[tw.widgets.length - 1].opts
const pass = (token) => act(() => latest().callback(token))
const open = (path, ui) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={ui} /><Route path="/" element={<p>THE HOME PAGE</p>} /></Routes></MemoryRouter>)
const alertsText = () => screen.queryAllByRole('alert').map((a) => a.textContent).join(' | ')

const FORMS = [
  { name: 'Sign up', path: '/signup', ui: () => <Signup />, button: 'Create account', needs: ['Email', 'Password'], call: 'signUp',
    expectedPlain: { email: 'gill@example.com', password: 'secret123' }, expectedWith: (tok) => ({ email: 'gill@example.com', password: 'secret123', options: { captchaToken: tok } }), error: 'signUpError' },
  { name: 'Log in', path: '/login', ui: () => <Login />, button: 'Log in', needs: ['Email', 'Password'], call: 'signIn',
    expectedPlain: { email: 'gill@example.com', password: 'secret123' }, expectedWith: (tok) => ({ email: 'gill@example.com', password: 'secret123', options: { captchaToken: tok } }), error: 'signInError' },
  { name: 'Forgot password', path: '/forgot-password', ui: () => <ForgotPassword />, button: 'Send reset link', needs: ['Email'], call: 'reset',
    expectedPlain: null, expectedWith: null, error: 'resetError' },
]
async function fill(user, form) {
  await user.type(screen.getByLabelText('Email'), 'gill@example.com')
  if (form.needs.includes('Password')) await user.type(screen.getByLabelText('Password'), 'secret123')
}
const sent = (form) => auth.calls.filter((c) => c[0] === form.call)
const body = (form) => (form.call === 'reset' ? { email: sent(form)[0][1], options: sent(form)[0][2] } : sent(form)[0][1])

beforeEach(() => { auth.calls = []; auth.signUpError = null; auth.signInError = null; auth.resetError = null; delete window.turnstile; vi.unstubAllEnvs() })
afterEach(() => { delete window.turnstile; vi.unstubAllEnvs() })

describe.each(FORMS)('$name: with no site key (the check is off)', (form) => {
  it('shows no security check, and sends exactly what it always sent (no token anywhere)', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', ''); fakeTurnstile()
    const user = userEvent.setup(); open(form.path, form.ui())
    expect(screen.queryByText(/protected by Cloudflare Turnstile/)).toBeNull(); expect(tw.render).not.toHaveBeenCalled()
    await fill(user, form); await user.click(screen.getByRole('button', { name: form.button }))
    await waitFor(() => expect(sent(form)).toHaveLength(1))
    if (form.call === 'reset') { expect(body(form).options).toEqual({ redirectTo: `${window.location.origin}/reset-password` }); expect(JSON.stringify(body(form))).not.toMatch(/captcha/i) }
    else { expect(body(form)).toEqual(form.expectedPlain) }
  })
})

describe.each(FORMS)('$name: with the check switched on', (form) => {
  beforeEach(() => { vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'SITEKEY123'); fakeTurnstile() })

  it('shows the note about the security check', async () => {
    open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    expect(screen.getByText(/protected by Cloudflare Turnstile/)).toBeInTheDocument(); expect(tw.render).toHaveBeenCalledTimes(1)
  })
  it('does NOT send anything before the check has finished, says why, and keeps what was typed', async () => {
    const user = userEvent.setup(); open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    await fill(user, form); await user.click(screen.getByRole('button', { name: form.button }))
    expect(auth.calls).toHaveLength(0); expect(alertsText()).toContain(CAPTCHA_WAIT)
    expect(screen.getByLabelText('Email')).toHaveValue('gill@example.com')
  })
  it('once the check is passed it sends the token, where Supabase expects it', async () => {
    const user = userEvent.setup(); open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    await fill(user, form); pass('TOKEN-ONE'); await user.click(screen.getByRole('button', { name: form.button }))
    await waitFor(() => expect(sent(form)).toHaveLength(1))
    if (form.call === 'reset') expect(body(form)).toEqual({ email: 'gill@example.com', options: { redirectTo: `${window.location.origin}/reset-password`, captchaToken: 'TOKEN-ONE' } })
    else expect(body(form)).toEqual(form.expectedWith('TOKEN-ONE'))
  })
  it('asks Cloudflare for a fresh check after the attempt, so a spent token is never sent twice', async () => {
    auth[form.error] = { message: 'something went wrong' } // the attempt fails, so the form stays and could be pressed again
    const user = userEvent.setup(); open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    await fill(user, form); pass('TOKEN-ONE'); await user.click(screen.getByRole('button', { name: form.button }))
    await waitFor(() => expect(tw.reset).toHaveBeenCalledWith('w1'))
    await user.click(screen.getByRole('button', { name: form.button })) // no new token has arrived
    expect(sent(form)).toHaveLength(1); expect(alertsText()).toContain(CAPTCHA_WAIT)
    pass('TOKEN-TWO'); await user.click(screen.getByRole('button', { name: form.button }))
    await waitFor(() => expect(sent(form)).toHaveLength(2))
    expect(JSON.stringify(sent(form)[1])).toContain('TOKEN-TWO'); expect(JSON.stringify(sent(form)[1])).not.toContain('TOKEN-ONE')
  })
  it('also resets after an attempt that worked', async () => {
    const user = userEvent.setup(); open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    await fill(user, form); pass('TOKEN-ONE'); await user.click(screen.getByRole('button', { name: form.button }))
    await waitFor(() => expect(tw.reset).toHaveBeenCalled())
  })
  it('if Supabase refuses the check, says so in plain words and asks for a fresh one', async () => {
    auth[form.error] = { message: 'captcha verification process failed', code: 'captcha_failed', status: 400 }
    const user = userEvent.setup(); open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    await fill(user, form); pass('TOKEN-ONE'); await user.click(screen.getByRole('button', { name: form.button }))
    await waitFor(() => expect(alertsText()).toContain(CAPTCHA_FAILED))
    expect(tw.reset).toHaveBeenCalled(); expect(alertsText()).not.toMatch(/captcha verification/i)
  })
  it('if the check could not load (an ad blocker, a privacy browser) it says so, and sends nothing', async () => {
    const user = userEvent.setup(); open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    act(() => latest()['error-callback']())
    await fill(user, form); await user.click(screen.getByRole('button', { name: form.button }))
    expect(auth.calls).toHaveLength(0); expect(alertsText()).toContain(CAPTCHA_BROKEN)
  })
  it('the token is never shown on the page or kept in the browser\u2019s storage', async () => {
    const user = userEvent.setup(); open(form.path, form.ui()); await act(async () => { await Promise.resolve() })
    await fill(user, form); pass('SECRET-LOOKING-TOKEN'); await user.click(screen.getByRole('button', { name: form.button }))
    await waitFor(() => expect(sent(form)).toHaveLength(1))
    expect(document.body.textContent).not.toContain('SECRET-LOOKING-TOKEN')
    expect(JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })).not.toContain('SECRET-LOOKING-TOKEN')
  })
})

describe('the rest of each form still works with the check on', () => {
  beforeEach(() => { vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'SITEKEY123'); fakeTurnstile() })
  it('Sign up: after a successful sign-up the form is replaced as before', async () => {
    const user = userEvent.setup(); open('/signup', <Signup />); await act(async () => { await Promise.resolve() })
    await fill(user, FORMS[0]); pass('T'); await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Account created'); expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull()
  })
  it('Log in: a good log in still goes to the home page', async () => {
    const user = userEvent.setup(); open('/login', <Login />); await act(async () => { await Promise.resolve() })
    await fill(user, FORMS[1]); pass('T'); await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('THE HOME PAGE')).toBeInTheDocument()
  })
  it('Forgot password: still says "Check your email" without saying whether an account exists', async () => {
    const user = userEvent.setup(); open('/forgot-password', <ForgotPassword />); await act(async () => { await Promise.resolve() })
    await fill(user, FORMS[2]); pass('T'); await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText(/If there is an account for that email address/)).toBeInTheDocument()
  })
  it('a form with a problem of its own (no password) still shows that problem, and the wait message too if the check has not finished', async () => {
    const user = userEvent.setup(); open('/signup', <Signup />); await act(async () => { await Promise.resolve() })
    await user.type(screen.getByLabelText('Email'), 'gill@example.com'); await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(auth.calls).toHaveLength(0); expect(alertsText()).toContain('Choose a password'); expect(alertsText()).toContain(CAPTCHA_WAIT)
  })
})
