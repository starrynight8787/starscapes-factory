import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, CheckField, ErrorSummary, FailureMessage } from '../components/FormMessages'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import { EBOOK } from './ebookConfig'
import { cleanSignup } from './ebookRules'
import { fetchOpen, subscribe } from '../newsletter/newsletterApi'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './ebook.css'
import './ebookv2.css'

// The Free Ebook pages behind the Lounge's door (Figma: "Download page: Free Ebook, sign up with email" and "thank you and download").
// The free ebook and the newsletter are ONE list: asking for the ebook signs someone up to the newsletter (the tick box says so), with the same email that asks them to confirm. Once they
// press the button in it, the page it opens gives them the download (src/newsletter/NewsletterLinkPage.jsx). Until there is a PDF (src/ebook/ebookConfig.js) it says the ebook is being finished.
// It works only while the newsletter is open, like the sign-up box in the footer.
export default function FreeEbookPage() {
  useTitle('Free ebook')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [robot, setRobot] = useState('') // a box people cannot see: only a robot fills it in
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(null) // is the newsletter (and so this sign-up) open: null while we ask

  useEffect(() => {
    let alive = true
    fetchOpen().then((o) => { if (alive) setOpen(o) })
    return () => { alive = false }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setProblem('')
    const check = cleanSignup({ email, consent })
    if (!check.ok) { setErrors(check.errors); return }
    setErrors({})
    setSaving(true)
    try {
      await subscribe({ email: check.email, consent: true, website: robot, source: 'ebook' })
      setDone(true)
    } catch (e) {
      if (e && (e.field === 'email' || e.field === 'consent')) setErrors({ [e.field]: e.message })
      else setProblem((e && e.message) || 'That did not go through just now. Please try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  const back = <p className="rp-back"><Link to="/leadership-lounge">← Back to Leadership Lounge</Link></p>
  const cover = <div className="eb__cover" aria-hidden="true"><span>Leading from the Middle</span></div>

  if (done) {
    return (
      <main className="rp eb eb--v2">
        {back}
        <PageBanner chip="Nearly there" title="Check your email" art="mountain" room="leadership-lounge" />
        <div className="eb__layout">
          <div className="eb__side">{cover}</div>
          <div className="eb__card">
            <div className="eb__ok" role="status">
              <p className="eb__ok-title">Thank you. I have sent you an email.</p>
              <p>Press the button in it to confirm. You will not get the ebook, or the newsletter, until you do. If it does not arrive in a few minutes, check your spam folder.</p>
            </div>
            <p className="eb__text">{EBOOK.file ? 'The download will be waiting for you on the page the button opens.' : 'The ebook is not quite ready to download. As soon as it is, I will email you the link.'}</p>
            <p><Link to="/leadership-lounge">← Back to Leadership Lounge</Link></p>
          </div>
        </div>
      </main>
    )
  }

  const summary = Object.entries(errors).map(([id, message]) => ({ id: id === 'consent' ? 'eb-consent' : 'eb-email', message }))
  return (
    <main className="rp eb eb--v2">
      {back}
      <PageBanner chip="Free" title={EBOOK.title} subtitle={EBOOK.summary} art="mountain" room="leadership-lounge" />
      <div className="eb__layout">
        <div className="eb__side">
          {cover}
          <h2 className="eb__h2">What is inside</h2>
          <ul className="eb__inside">{EBOOK.inside.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
        <div className="eb__card">
          <h2 className="eb__h2">Where shall I send it?</h2>
          {open === false ? <p className="eb__text" role="status">The free ebook is not open just yet. Please come back soon.</p> : (
          <form className="eb__form" onSubmit={submit} noValidate>
            <ErrorSummary errors={summary} />
            {problem && <FailureMessage title="That did not go through">{problem}</FailureMessage>}
            <Field id="eb-email" label="Your email address" error={errors.email}>
              {(p) => <input {...p} type="email" name="email" autoComplete="email" inputMode="email" value={email} placeholder="name@example.com" onChange={(e) => setEmail(e.target.value)} />}
            </Field>
            <div className="eb__trap" aria-hidden="true">
              <label>Leave this empty<input type="text" name="website" tabIndex={-1} autoComplete="off" value={robot} onChange={(e) => setRobot(e.target.value)} /></label>
            </div>
            <CheckField id="eb-consent" label={EBOOK.consent} error={errors.consent} checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <button type="submit" className="pg-btn sg-btn--primary eb__submit" disabled={saving}>{saving ? 'Sending…' : 'Get the free ebook'}</button>
            <p className="eb__small">You will get an email asking you to confirm. Once you do, the ebook is yours, and you will also get the newsletter: new posts and news, by email. Your email is never shared, and you can unsubscribe at any time. See the <Link to="/page/privacy">Privacy policy</Link>.</p>
          </form>
          )}
        </div>
      </div>
    </main>
  )
}
