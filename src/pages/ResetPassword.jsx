import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Step 2: the page the emailed link opens. Supabase signs you in briefly from the link, and this page lets you choose a new password.
export default function ResetPassword({ waitMs = 1500 }) {
  const [phase, setPhase] = useState('checking') // checking | ready | expired | done
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Please use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) return setError(error.message) // Supabase says which rule was missed, for example a password that is too easy to guess
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
        <p role="status">Your new password is saved and you're signed in.</p>
        <p><Link to="/">Continue to the homepage</Link></p>
      </div>
    )
  }

  return (
    <div>
      <h1>Choose a new password</h1>
      <p className="muted">Use at least 8 characters. If it isn't strong enough, you'll be told what's missing.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          aria-label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Type it again"
          aria-label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save new password'}</button>
      </form>
    </div>
  )
}
