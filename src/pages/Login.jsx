import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'
import { emailProblem, loginMessage } from './formRules'
import '../styles/pages.css'
import '../styles/forms.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({}) // a message under each field with a problem
  const [summary, setSummary] = useState([]) // the box at the top of the form, listing each problem as a link to its field
  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  function showProblems(found) {
    setFailure(null)
    setFieldErrors(found)
    setSummary([['email', 'login-email'], ['password', 'login-password']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = {}
    const emailIssue = emailProblem(email)
    if (emailIssue) found.email = emailIssue
    if (!password) found.password = 'Enter your password'
    if (Object.keys(found).length > 0) return showProblems(found)

    setFieldErrors({})
    setSummary([])
    setFailure(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)

    if (error) {
      const say = loginMessage(error)
      if (say.fix) {
        setSummary([{ id: 'login-email', message: say.fix }])
      } else {
        setFailure(say.failure)
      }
      return
    }

    navigate('/')
  }

  return (
    <main className="fm fm--auth">
     <div className="fm__card">
      <h1 className="fm__title">Log in</h1>
      <p className="fm__sub">Welcome back.</p>
      <ErrorSummary errors={summary} />
      {failure && <FailureMessage title="We couldn't log you in">{failure}</FailureMessage>}
      <form className="fm__form" onSubmit={handleSubmit} noValidate>
        <Field id="login-email" label="Email" error={fieldErrors.email}>
          {(p) => <input {...p} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Field id="login-password" label="Password" error={fieldErrors.password}>
          {(p) => <input {...p} type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <button type="submit" className="pg-btn fm-btn--primary fm__submit" disabled={busy}>
          Log in
        </button>
      </form>
      <p className="fm__links">
        <Link to="/forgot-password">Forgot your password?</Link>
        <span>
          New here? <Link to="/signup">Sign up</Link>
        </span>
      </p>
     </div>
    </main>
  )
}
