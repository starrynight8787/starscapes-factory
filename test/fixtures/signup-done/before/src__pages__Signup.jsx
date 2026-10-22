import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'
import '../styles/pages.css'
import '../styles/forms.css'
import PageBanner from '../components/PageBanner'
import { emailProblem, signupMessage } from './formRules'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({}) // a message under each field with a problem
  const [summary, setSummary] = useState([]) // the box at the top of the form, listing each problem as a link to its field
  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  function showProblems(found) {
    setFailure(null)
    setInfo(null)
    setFieldErrors(found)
    setSummary([['email', 'signup-email'], ['password', 'signup-password']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = {}
    const emailIssue = emailProblem(email)
    if (emailIssue) found.email = emailIssue
    if (!password) found.password = 'Choose a password'
    else if (password.length < 6) found.password = 'Use at least 6 characters for your password'
    if (Object.keys(found).length > 0) return showProblems(found)

    setFieldErrors({})
    setSummary([])
    setFailure(null)
    setInfo(null)
    setBusy(true)
    const { error } = await supabase.auth.signUp({ email: email.trim(), password })
    setBusy(false)

    if (error) {
      const say = signupMessage(error)
      if (say.failure) setFailure(say.failure)
      else showProblems(say)
      return
    }

    setInfo('Check your email to confirm your account, then log in.')
  }

  return (
    <main className="fm fm--auth">
     <PageBanner art="plain" room="factory-floor" chip="Your account" title="Sign up" />
     <div className="fm__card">
      <p className="fm__sub">So you can follow along, and keep your orders in one place.</p>
      <ErrorSummary errors={summary} />
      {failure && <FailureMessage title="We couldn't create your account">{failure}</FailureMessage>}
      {info && <SuccessMessage title="Account created">{info}</SuccessMessage>}
      <form className="fm__form" onSubmit={handleSubmit} noValidate>
        <Field id="signup-email" label="Email" error={fieldErrors.email}>
          {(p) => <input {...p} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Field id="signup-password" label="Password" help="At least 6 characters." error={fieldErrors.password}>
          {(p) => (
            <input {...p} type="password" placeholder="Password (min 6 characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          )}
        </Field>
        <button type="submit" className="pg-btn fm-btn--primary fm__submit" disabled={busy}>
          Create account
        </button>
      </form>
      <p className="fm__links">
        <span>
          Already have an account? <Link to="/login">Log in</Link>
        </span>
      </p>
     </div>
    </main>
  )
}
