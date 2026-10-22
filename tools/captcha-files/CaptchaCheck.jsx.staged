import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// The security check on the Sign up, Log in and Forgot password forms (22 October 2026). Bots were calling the sign-in system directly, sending emails to strangers and guessing passwords.
// This is Cloudflare Turnstile: it checks quietly that the visitor is a person (and shows a box only if Cloudflare wants one), and hands the form a one-use token that Supabase then checks.
// The PUBLIC site key is set in Vercel as VITE_TURNSTILE_SITE_KEY. With no key the check is simply not there and the forms work exactly as they did before, so this can be released first and switched on after.
// A token works once and runs out after five minutes, so the form calls reset() after EVERY attempt, whether or not it worked.
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export const captchaSiteKey = () => String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
export const captchaOn = () => captchaSiteKey() !== ''

let loading = null
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL // it must come from Cloudflare itself, not from our own server
      script.async = true
      script.defer = true
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not start')))
      script.onerror = () => { loading = null; script.remove(); reject(new Error('Turnstile did not load')) } // an ad blocker can do this: let the next try start again
      document.head.appendChild(script)
    })
  }
  return loading
}

const CaptchaCheck = forwardRef(function CaptchaCheck({ id, onToken, onProblem }, ref) {
  const box = useRef(null)
  const widget = useRef(null)
  const gotToken = useRef(onToken)
  const gotProblem = useRef(onProblem)
  gotToken.current = onToken // always the latest, without drawing the widget again
  gotProblem.current = onProblem

  useEffect(() => {
    const sitekey = captchaSiteKey()
    if (!sitekey) return undefined
    let gone = false
    loadTurnstile()
      .then((turnstile) => {
        if (gone || !box.current) return
        widget.current = turnstile.render(box.current, {
          sitekey,
          appearance: 'interaction-only', // hidden unless Cloudflare needs the visitor to do something
          callback: (token) => gotToken.current && gotToken.current(token),
          'expired-callback': () => gotToken.current && gotToken.current(''),
          'timeout-callback': () => gotToken.current && gotToken.current(''),
          'error-callback': () => { if (gotToken.current) gotToken.current(''); if (gotProblem.current) gotProblem.current() },
        })
      })
      .catch(() => { if (!gone && gotProblem.current) gotProblem.current() })
    return () => {
      gone = true
      if (widget.current != null && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [])

  // The form calls this after every attempt: the token has been used, so a fresh check is needed
  useImperativeHandle(ref, () => ({
    reset() {
      if (gotToken.current) gotToken.current('')
      if (widget.current != null && window.turnstile) window.turnstile.reset(widget.current)
    },
  }), [])

  if (!captchaOn()) return null
  return (
    <div id={id} tabIndex={-1} className="fm__captcha">
      <div ref={box} />
      <p className="fm__small">This form is protected by Cloudflare Turnstile, which keeps automated programs out.</p>
    </div>
  )
})

export default CaptchaCheck
