import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, CheckField, ErrorSummary, FailureMessage } from '../components/FormMessages'
import { cleanSignup } from '../ebook/ebookRules'
import { fetchOpen, subscribe } from '../newsletter/newsletterApi'
import { OPTIONAL_NEWSLETTER_TEXT } from '../newsletter/newsletterRules'
import '../ebook/ebook.css'
import '../ebook/ebookv2.css'
import { GROWN_UPS_NOTE } from '../data/children'

// An email box for ONE thing (the Road journal, or to hear when a door opens). The site-wide sign-up rule (see the "Email sign-up rule" document): getting the thing needs only an email address,
// the newsletter is a separate OPTIONAL box that is never ticked for anyone, and we email a link to confirm first. It works only while sign-ups are open, like the footer's newsletter box.
// source: 'road-journal' or 'opens' (with door). The small print is shown under the button. doneNote is the line after "check your email".
export default function RequestForm({ id, source, door, button, smallPrint, doneNote }) {
  const [email, setEmail] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [robot, setRobot] = useState('') // a box people cannot see: only a robot fills it in
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let alive = true
    fetchOpen().then((o) => { if (alive) setOpen(o) })
    return () => { alive = false }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setProblem('')
    const check = cleanSignup({ email, newsletter })
    if (!check.ok) { setErrors(check.errors); return }
    setErrors({})
    setSaving(true)
    try {
      await subscribe({ email: check.email, newsletter: check.newsletter, website: robot, source, door })
      setDone(true)
    } catch (e) {
      if (e && e.field === 'email') setErrors({ email: e.message })
      else setProblem((e && e.message) || 'That did not go through just now. Please try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="eb__ok" role="status">
        <p className="eb__ok-title">Thank you. I have sent you an email.</p>
        <p>Press the button in it to confirm. {doneNote} If it does not arrive in a few minutes, check your spam folder.</p>
      </div>
    )
  }
  if (open === false) return <p className="eb__text" role="status">Sign-ups are not open just yet. Please come back soon.</p>
  const summary = Object.entries(errors).map(([key, message]) => ({ id: `${id}-${key}`, message }))
  return (
    <form className="eb__form" onSubmit={submit} noValidate>
      <ErrorSummary errors={summary} />
      {problem && <FailureMessage title="That did not go through">{problem}</FailureMessage>}
      <Field id={`${id}-email`} label="Your email address" error={errors.email}>
        {(p) => <input {...p} type="email" name="email" autoComplete="email" inputMode="email" value={email} placeholder="name@example.com" onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <div className="eb__trap" aria-hidden="true">
        <label>Leave this empty<input type="text" name="website" tabIndex={-1} autoComplete="off" value={robot} onChange={(e) => setRobot(e.target.value)} /></label>
      </div>
      <CheckField id={`${id}-newsletter`} label={OPTIONAL_NEWSLETTER_TEXT} checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
      <button type="submit" className="pg-btn sg-btn--primary eb__submit" disabled={saving}>{saving ? 'Sending…' : button}</button>
      <p className="eb__small">{GROWN_UPS_NOTE}</p>
      <p className="eb__small">{smallPrint} See our <Link to="/page/privacy">Privacy policy</Link>.</p>
    </form>
  )
}
