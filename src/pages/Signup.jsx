import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      return
    }

    setInfo('Check your email to confirm your account, then log in.')
  }

  return (
    <div>
      <h1>Sign up</h1>
      {error && <p className="error">{error}</p>}
      {info && <p className="muted">{info}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit">Create account</button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
