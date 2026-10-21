import { useEffect, useState } from 'react'
import { CONSENT_TEXT, cleanSubscribe } from './newsletterRules'
import { fetchOpen, subscribe } from './newsletterApi'
import './newsletter.css'

// The sign-up box, in the footer. It shows only once the newsletter is open (the server says so: NEWSLETTER_OPEN in Vercel), and nothing at all before that.
// Signing up does NOT put anyone on the list: it sends an email, and they join when they press the button in it (double opt-in).
export default function NewsletterSignup() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [trap, setTrap] = useState('') // a box people cannot see: only a robot fills it in
  const [problem, setProblem] = useState(null)
  const [state, setState] = useState('idle') // idle, sending, done

  useEffect(() => {
    let alive = true
    fetchOpen().then((o) => { if (alive) setOpen(o) })
    return () => { alive = false }
  }, [])
  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    const check = cleanSubscribe({ email, consent })
    if (!check.ok) { setProblem({ field: check.field, message: check.message }); return }
    setProblem(null); setState('sending')
    try {
      await subscribe({ email: check.email, consent: true, website: trap })
      setState('done')
    } catch (err) {
      setState('idle'); setProblem({ field: (err && err.field) || 'email', message: (err && err.message) || 'That did not go through just now. Please try again in a moment.' })
    }
  }

  if (state === 'done') {
    return (
      <section className="nl-signup" aria-labelledby="nl-signup-title">
        <h2 id="nl-signup-title" className="nl-signup__title">Newsletter</h2>
        <p className="nl-signup__done" role="status">Thank you. Now check your email and press the button in it to confirm. You will not get the newsletter until you do.</p>
      </section>
    )
  }
  const error = (field) => (problem && problem.field === field ? problem.message : '')
  return (
    <section className="nl-signup" aria-labelledby="nl-signup-title">
      <h2 id="nl-signup-title" className="nl-signup__title">Newsletter</h2>
      <p className="nl-signup__text">Free, with no account or pass needed. New posts and news from Starscapes Factory, by email.</p>
      <form className="nl-signup__form" onSubmit={submit} noValidate>
        {problem && <p className="nl-signup__summary" role="alert">{problem.message}</p>}
        <div className="nl-signup__field">
          <label htmlFor="nl-email" className="nl-signup__label">Your email address</label>
          <input id="nl-email" className="nl-signup__input" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setProblem(null) }} aria-invalid={error('email') ? 'true' : undefined} aria-describedby={error('email') ? 'nl-email-error' : undefined} />
          {error('email') && <p id="nl-email-error" className="nl-signup__error">{error('email')}</p>}
        </div>
        <div className="nl-signup__trap" aria-hidden="true">
          <label htmlFor="nl-website">Leave this empty</label>
          <input id="nl-website" className="nl-signup__input" type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>
        <div className="nl-signup__field">
          <label className="nl-signup__check" htmlFor="nl-consent">
            <input id="nl-consent" className="nl-signup__box" type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setProblem(null) }} aria-invalid={error('consent') ? 'true' : undefined} aria-describedby={error('consent') ? 'nl-consent-error' : undefined} />
            <span>{CONSENT_TEXT}</span>
          </label>
          {error('consent') && <p id="nl-consent-error" className="nl-signup__error">{error('consent')}</p>}
        </div>
        <button type="submit" className="nl-signup__button" disabled={state === 'sending'} aria-busy={state === 'sending'}>{state === 'sending' ? 'Signing you up…' : 'Sign up'}</button>
      </form>
    </section>
  )
}
