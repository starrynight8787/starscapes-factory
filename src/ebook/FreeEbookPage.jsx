import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, CheckField, ErrorSummary, FailureMessage } from '../components/FormMessages'
import useTitle from '../rooms/useTitle'
import { EBOOK } from './ebookConfig'
import { cleanSignup } from './ebookRules'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './ebook.css'

// The Free Ebook pages behind the Lounge's door (Figma: "Download page: Free Ebook, sign up with email" and "thank you and download").
// Someone gives their email and ticks the box, the server keeps both, and they get the download. Until there is a PDF (src/ebook/ebookConfig.js) the
// thank-you says the ebook is being finished instead of offering a download that is not there.
export default function FreeEbookPage() {
  useTitle('Free ebook')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [robot, setRobot] = useState('') // a box people cannot see: only a robot fills it in
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const [done, setDone] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setProblem('')
    const check = cleanSignup({ email, consent })
    if (!check.ok) { setErrors(check.errors); return }
    setErrors({})
    setSaving(true)
    try {
      const response = await fetch('/api/ebook-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: check.email, consent: true, website: robot }) })
      const body = await response.json().catch(() => null)
      if (response.ok && body && body.ok) setDone({ file: typeof body.file === 'string' ? body.file : '', emailed: body.emailed === true })
      else if (body && body.errors) setErrors(body.errors)
      else setProblem('That did not go through just now. Please try again in a moment.')
    } catch (e) {
      setProblem('That did not go through just now. Please try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  const back = <p className="rp-back"><Link to="/leadership-lounge">← Back to Leadership Lounge</Link></p>
  const cover = <div className="eb__cover" aria-hidden="true"><span>Leading from the Middle</span></div>

  if (done) {
    return (
      <main className="rp eb">
        {back}
        <div className="eb__layout">
          {cover}
          <div>
            <span className="pg-chip">You are in</span>
            <h1 className="eb__title">{done.file ? 'Thank you. Your ebook is ready.' : 'Thank you. Your ebook is being finished.'}</h1>
            {done.file ? (
              <>
                <p className="eb__text">Use the button to download it.</p>
                <a className="pg-btn sg-btn--primary eb__download" href={done.file} download>Download the ebook (PDF)</a>
                <p className="eb__small">{EBOOK.fileNote}</p>
              </>
            ) : (
              <p className="eb__text">It is not quite ready to download. I have kept your address, and I will email you the link as soon as it is.</p>
            )}
            <div className="eb__ok" role="status">
              <p className="eb__ok-title">You are in. The first post is on its way.</p>
              {done.emailed && <p>We have also emailed you the link, in case you want it again. If it does not arrive, check your spam folder.</p>}
            </div>
            <p><Link to="/leadership-lounge">← Back to Leadership Lounge</Link></p>
          </div>
        </div>
      </main>
    )
  }

  const summary = Object.entries(errors).map(([id, message]) => ({ id: id === 'consent' ? 'eb-consent' : 'eb-email', message }))
  return (
    <main className="rp eb">
      {back}
      <div className="eb__layout">
        {cover}
        <div>
          <span className="pg-chip">Free</span>
          <h1 className="eb__title">{EBOOK.title}</h1>
          <p className="eb__text">{EBOOK.summary}</p>
          <ul className="eb__inside">{EBOOK.inside.map((line) => <li key={line}>{line}</li>)}</ul>
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
            <p className="eb__small">You get the download straight away. Your email is only used to send you the posts, and is never shared. See the <Link to="/page/privacy">Privacy policy</Link>.</p>
          </form>
        </div>
      </div>
    </main>
  )
}
