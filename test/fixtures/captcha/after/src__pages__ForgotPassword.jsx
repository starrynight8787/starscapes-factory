import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import { emailProblem, captchaIssue, isCaptchaFailure, CAPTCHA_FAILED } from './formRules'
import CaptchaCheck, { captchaOn } from '../components/CaptchaCheck'
import '../styles/pages.css'
import '../styles/forms.css'
import PageBanner from '../components/PageBanner'

// Step 1 of getting back in: ask for a reset link by email.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [fieldError, setFieldError] = useState(null) // the message under the email field
  const [summary, setSummary] = useState([]) // the box at the top of the form
  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix
  const [captchaToken, setCaptchaToken] = useState('') // from the security check; empty until it has finished
  const [captchaBroken, setCaptchaBroken] = useState(false)
  const captcha = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFailure(null)
    const issue = emailProblem(email)
    if (issue) {
      setFieldError(issue)
      setSummary([{ id: 'forgot-email', message: issue }])
      return
    }
    const waitForCheck = captchaIssue(captchaOn(), captchaToken, captchaBroken)
    if (waitForCheck) {
      setFieldError(null)
      setSummary([{ id: 'forgot-captcha', message: waitForCheck }])
      return
    }
    setFieldError(null)
    setSummary([])
    setStatus('sending')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
      ...(captchaToken ? { captchaToken } : {}),
    })
    if (captcha.current) captcha.current.reset() // the token has been used, whatever happened

    if (error) {
      setStatus('idle')
      const tooMany = error.status === 429 || /rate limit|only request this after/i.test(error.message || '')
      setFailure(
        isCaptchaFailure(error)
          ? CAPTCHA_FAILED
          : tooMany
            ? 'Too many requests just now. Please wait a few minutes and try again.'
            : "We couldn't send the email just now. Please try again in a moment."
      )
      return
    }
    // The same message whether or not the email has an account, so nobody can use this page to find out who has one.
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <main className="fm fm--auth">
        <PageBanner art="plain" room="factory-floor" chip="Your account" title="Check your email" />
        <div className="fm__card">
          <SuccessMessage title="If there is an account for that email address, we've sent a link to reset your password.">
            It can take a few minutes, and it might land in your spam folder.
          </SuccessMessage>
          <div className="fm__actions">
            <button type="button" className="pg-btn" onClick={() => setStatus('idle')}>Use a different email</button>
          </div>
          <p className="fm__links">
            <Link to="/login">Back to log in</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="fm fm--auth">
     <PageBanner art="plain" room="factory-floor" chip="Your account" title="Forgot your password?" />
     <div className="fm__card">
      <p className="fm__sub">Enter your email and we'll send you a link to choose a new one.</p>
      <ErrorSummary errors={summary} />
      {failure && <FailureMessage title="We couldn't send the email">{failure}</FailureMessage>}
      <form className="fm__form" onSubmit={handleSubmit} noValidate>
        <Field id="forgot-email" label="Email" error={fieldError}>
          {(p) => <input {...p} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <CaptchaCheck id="forgot-captcha" ref={captcha} onToken={setCaptchaToken} onProblem={() => setCaptchaBroken(true)} />
        <button type="submit" className="pg-btn fm-btn--primary fm__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="fm__links">
        <Link to="/login">Back to log in</Link>
      </p>
     </div>
    </main>
  )
}
