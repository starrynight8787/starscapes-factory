import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Field, ErrorSummary, SuccessMessage } from '../components/FormMessages'

// Step 2: the page the emailed link opens. Supabase signs you in briefly from the link, and this page lets you choose a new password.
export default function ResetPassword({ waitMs = 1500 }) {
  const [phase, setPhase] = useState('checking') // checking | ready | expired | done
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState({}) // a message under each field with a problem
  const [summary, setSummary] = useState([]) // the box at the top of the form, listing each problem as a link to its field
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    const ready = () => alive && setPhase((p) => (p === 'checking' || p === 'expired' ? 'ready' : p))

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) ready()
    })
    supabase.auth.getSession().then(({ data: s }) => {
      if (s && s.session) ready()
    })
    // If nothing signs us in shortly, the link is old or has already been used.
    const timer = setTimeout(() => alive && setPhase((p) => (p === 'checking' ? 'expired' : p)), waitMs)

    return () => {
      alive = false
      clearTimeout(timer)
      data.subscription.unsubscribe()
    }
  }, [waitMs])

  function showProblems(found) {
    setFieldErrors(found)
    setSummary([['password', 'reset-password'], ['confirm', 'reset-confirm']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFieldErrors({})
    setSummary([])
    if (password.length < 8) return showProblems({ password: 'Please use at least 8 characters.' })
    if (password !== confirm) return showProblems({ confirm: 'The two passwords do not match.' })

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) return showProblems({ password: error.message }) // Supabase says which rule was missed, for example a password that is too easy to guess
    setPhase('done')
  }

  if (phase === 'checking') {
    return (
      <div>
        <h1>Reset your password</h1>
        <p className="muted" role="status">Checking your link…</p>
      </div>
    )
  }

  if (phase === 'expired') {
    return (
      <div>
        <h1>This link has expired</h1>
        <p>The link may be old, or it may already have been used. Reset links only work once.</p>
        <p><Link to="/forgot-password">Send me a new link</Link></p>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div>
        <h1>Password updated</h1>
        <SuccessMessage title="Your new password is saved and you're signed in." />
        <p><Link to="/">Continue to the homepage</Link></p>
      </div>
    )
  }

  return (
    <div>
      <h1>Choose a new password</h1>
      <p className="muted">Use at least 8 characters. If it isn't strong enough, you'll be told what's missing.</p>
      <ErrorSummary errors={summary} />
      <form onSubmit={handleSubmit} noValidate>
        <Field id="reset-password" label="New password" error={fieldErrors.password}>
          {(p) => <input {...p} type="password" placeholder="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <Field id="reset-confirm" label="Confirm new password" error={fieldErrors.confirm}>
          {(p) => <input {...p} type="password" placeholder="Type it again" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />}
        </Field>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save new password'}</button>
      </form>
    </div>
  )
}
