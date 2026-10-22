import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import '../styles/pages.css'
import '../styles/forms.css'
import PageBanner from '../components/PageBanner'
import { emailProblem, signupMessage, captchaIssue } from './formRules'
import CaptchaCheck, { captchaOn } from '../components/CaptchaCheck'
import { ACCOUNT_AGE_NOTE } from '../data/children'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({}) // a message under each field with a problem
  const [summary, setSummary] = useState([]) // the box at the top of the form, listing each problem as a link to its field
  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix
  const [created, setCreated] = useState(null) // the address an account has just been made for: the page then says what to do next, instead of showing the form again
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('') // from the security check; empty until it has finished
  const [captchaBroken, setCaptchaBroken] = useState(false)
  const captcha = useRef(null)
  const done = useRef(null)
  useEffect(() => { if (created && done.current) done.current.focus() }, [created]) // the form has gone, so the keyboard focus goes to what replaced it

  function showProblems(found) {
    setFailure(null)
    setFieldErrors(found)
    setSummary([['email', 'signup-email'], ['password', 'signup-password'], ['captcha', 'signup-captcha']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = {}
    const emailIssue = emailProblem(email)
    if (emailIssue) found.email = emailIssue
    if (!password) found.password = 'Choose a password'
    else if (password.length < 6) found.password = 'Use at least 6 characters for your password'
    const waitForCheck = captchaIssue(captchaOn(), captchaToken, captchaBroken)
    if (waitForCheck) found.captcha = waitForCheck
    if (Object.keys(found).length > 0) return showProblems(found)

    setFieldErrors({})
    setSummary([])
    setFailure(null)
    setBusy(true)
    const { error } = await supabase.auth.signUp(captchaToken ? { email: email.trim(), password, options: { captchaToken } } : { email: email.trim(), password })
    setBusy(false)
    if (captcha.current) captcha.current.reset() // the token has been used, whatever happened

    if (error) {
      const say = signupMessage(error)
      if (say.failure) setFailure(say.failure)
      else showProblems(say)
      return
    }

    // The account is made: clear the form (the password must not be left on the page), and take it away, so it cannot be sent a second time
    setCreated(email.trim())
    setEmail('')
    setPassword('')
  }

  return (
    <main className="fm fm--auth">
     <PageBanner art="plain" room="factory-floor" chip="Your account" title="Sign up" />
     <div className="fm__card">
      <p className="fm__sub">So you can follow along, and keep your orders in one place.</p>
      <p className="fm__small">{ACCOUNT_AGE_NOTE}</p>
      <ErrorSummary errors={summary} />
      {failure && <FailureMessage title="We couldn't create your account">{failure}</FailureMessage>}
      {created ? (
        <div className="fm__done" ref={done} tabIndex={-1}>
          <SuccessMessage title="Account created">
            Check your email to confirm your account, then log in. We sent the link to {created}.
          </SuccessMessage>
          <Link to="/login" className="pg-btn fm-btn--primary fm__submit">Log in</Link>
          <p className="fm__links">
            <span>
              Wrong email address? <button type="button" className="fm__textbtn" onClick={() => setCreated(null)}>Start again</button>
            </span>
          </p>
        </div>
      ) : (
        <>
          <form className="fm__form" onSubmit={handleSubmit} noValidate>
            <Field id="signup-email" label="Email" error={fieldErrors.email}>
              {(p) => <input {...p} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
            </Field>
            <Field id="signup-password" label="Password" help="At least 6 characters." error={fieldErrors.password}>
              {(p) => (
                <input {...p} type="password" placeholder="Password (min 6 characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              )}
            </Field>
            <CaptchaCheck id="signup-captcha" ref={captcha} onToken={setCaptchaToken} onProblem={() => setCaptchaBroken(true)} />
            <button type="submit" className="pg-btn fm-btn--primary fm__submit" disabled={busy}>
              Create account
            </button>
          </form>
          <p className="fm__links">
            <span>
              Already have an account? <Link to="/login">Log in</Link>
            </span>
          </p>
        </>
      )}
     </div>
    </main>
  )
}
