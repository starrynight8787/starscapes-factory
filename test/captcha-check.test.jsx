// The security check component (Cloudflare Turnstile), 22 October 2026: bots were calling the sign-in system directly. With no site key it is not there at all; with one it shows quietly,
// gives the form a one-use token, and is reset after every attempt.
import React, { createRef } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
function fakeTurnstile() {
  const t = { widgets: [], render: vi.fn((el, opts) => { const id = 'w' + (t.widgets.length + 1); t.widgets.push({ id, el, opts }); return id }), reset: vi.fn(), remove: vi.fn() }
  window.turnstile = t
  return t
}
const scripts = () => [...document.querySelectorAll('script[src*="challenges.cloudflare.com"]')]
const ready = () => act(async () => { await Promise.resolve(); await Promise.resolve() })
async function fresh() { vi.resetModules(); return (await import('../src/components/CaptchaCheck')).default }

beforeEach(() => { delete window.turnstile; scripts().forEach((s) => s.remove()); vi.unstubAllEnvs() })
afterEach(() => { delete window.turnstile; scripts().forEach((s) => s.remove()); vi.unstubAllEnvs() })

describe('with no site key it is not there', () => {
  it('draws nothing, never calls Cloudflare, and adds no script', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    const t = fakeTurnstile(); const Check = await fresh()
    const { container } = render(<Check id="x" onToken={() => {}} />); await ready()
    expect(container).toBeEmptyDOMElement(); expect(t.render).not.toHaveBeenCalled(); expect(scripts()).toHaveLength(0)
  })
  it('a key that is only spaces counts as no key', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '   ')
    const t = fakeTurnstile(); const Check = await fresh()
    const { container } = render(<Check id="x" onToken={() => {}} />); await ready()
    expect(container).toBeEmptyDOMElement(); expect(t.render).not.toHaveBeenCalled()
  })
})

describe('with a site key', () => {
  beforeEach(() => vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'SITEKEY123'))
  it('draws the widget once, with the site key, hidden unless Cloudflare needs the visitor to do something, and says what it is', async () => {
    const t = fakeTurnstile(); const Check = await fresh()
    render(<Check id="signup-captcha" onToken={() => {}} />); await ready()
    expect(t.render).toHaveBeenCalledTimes(1)
    expect(t.widgets[0].opts).toMatchObject({ sitekey: 'SITEKEY123', appearance: 'interaction-only' })
    expect(screen.getByText('This form is protected by Cloudflare Turnstile, which keeps automated programs out.')).toBeInTheDocument()
    const box = document.getElementById('signup-captcha'); expect(box).toBeTruthy(); expect(box.getAttribute('tabindex')).toBe('-1') // the form's error summary can send the keyboard here
  })
  it('hands the form the token when the check is passed, and takes it back when the token runs out', async () => {
    const t = fakeTurnstile(); const Check = await fresh(); const got = vi.fn()
    render(<Check id="x" onToken={got} />); await ready()
    const { opts } = t.widgets[0]
    act(() => opts.callback('TOKEN-ONE')); expect(got).toHaveBeenLastCalledWith('TOKEN-ONE')
    act(() => opts['expired-callback']()); expect(got).toHaveBeenLastCalledWith('')
    act(() => opts.callback('TOKEN-TWO')); act(() => opts['timeout-callback']()); expect(got).toHaveBeenLastCalledWith('')
  })
  it('an error from Cloudflare clears the token and tells the form something is wrong', async () => {
    const t = fakeTurnstile(); const Check = await fresh(); const got = vi.fn(); const bad = vi.fn()
    render(<Check id="x" onToken={got} onProblem={bad} />); await ready()
    act(() => t.widgets[0].opts['error-callback']())
    expect(got).toHaveBeenLastCalledWith(''); expect(bad).toHaveBeenCalledTimes(1)
  })
  it('reset() (called by the form after every attempt) clears the token and asks Cloudflare for a fresh check', async () => {
    const t = fakeTurnstile(); const Check = await fresh(); const got = vi.fn(); const ref = createRef()
    render(<Check id="x" ref={ref} onToken={got} />); await ready()
    act(() => t.widgets[0].opts.callback('USED'))
    act(() => ref.current.reset())
    expect(got).toHaveBeenLastCalledWith(''); expect(t.reset).toHaveBeenCalledWith('w1')
  })
  it('takes the widget away when the form goes', async () => {
    const t = fakeTurnstile(); const Check = await fresh()
    const { unmount } = render(<Check id="x" onToken={() => {}} />); await ready()
    unmount(); expect(t.remove).toHaveBeenCalledWith('w1')
  })
  it('in development (React draws things twice) it still ends with exactly one live widget', async () => {
    const t = fakeTurnstile(); const Check = await fresh()
    render(<React.StrictMode><Check id="x" onToken={() => {}} /></React.StrictMode>); await ready()
    expect(t.render.mock.calls.length - t.remove.mock.calls.length).toBe(1)
  })
})

describe('loading the script from Cloudflare', () => {
  beforeEach(() => vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'SITEKEY123'))
  it('adds Cloudflare\u2019s own script (not a copy from our server) once, however many forms are drawn, and draws the widget when it has loaded', async () => {
    const Check = await fresh()
    render(<><Check id="a" onToken={() => {}} /><Check id="b" onToken={() => {}} /></>)
    expect(scripts()).toHaveLength(1)
    expect(scripts()[0].getAttribute('src')).toBe(SCRIPT); expect(scripts()[0].async).toBe(true)
    const t = fakeTurnstile()
    await act(async () => { scripts()[0].onload() })
    expect(t.render).toHaveBeenCalledTimes(2)
  })
  it('if the script cannot load (an ad blocker, a privacy browser) the form is told, and the next try starts again', async () => {
    const Check = await fresh(); const bad = vi.fn()
    const first = render(<Check id="x" onToken={() => {}} onProblem={bad} />)
    await act(async () => { scripts()[0].onerror() })
    expect(bad).toHaveBeenCalledTimes(1); expect(scripts()).toHaveLength(0)
    first.unmount()
    render(<Check id="y" onToken={() => {}} onProblem={bad} />)
    expect(scripts()).toHaveLength(1) // a fresh attempt
  })
})
