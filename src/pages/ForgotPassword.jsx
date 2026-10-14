import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Step 1 of getting back in: ask for a reset link by email.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setStatus('sending')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setStatus('idle')
      const tooMany = error.status === 429 || /rate limit|only request this after/i.test(error.message || '')
      setError(
        tooMany
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
      <div>
        <h1>Check your email</h1>
        <p role="status">
          If there is an account for that email address, we've sent a link to reset your password. It can take a few minutes, and it might land in your spam folder.
        </p>
        <p className="muted">
          <button type="button" onClick={() => setStatus('idle')}>Use a different email</button>
        </p>
        <p className="muted">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>Forgot your password?</h1>
      <p className="muted">Enter your email and we'll send you a link to choose a new one.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="muted">
        <Link to="/login">Back to log in</Link>
      </p>
    </div>
  )
}
