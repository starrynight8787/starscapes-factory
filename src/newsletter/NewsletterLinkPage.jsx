import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import { isToken } from './newsletterRules'
import { EBOOK } from '../ebook/ebookConfig'
import { confirmSubscription, unsubscribe } from './newsletterApi'
import '../styles/pages.css'
import './newsletter.css'

// The page a link in an email opens: confirm (from the sign-up email) or unsubscribe (from every newsletter). Opening the page changes NOTHING: mail programs and virus scanners open
// links before people do. The person presses the button, and only then is anything done.
function LinkPage({ title, button, working, run, done, explain, noToken }) {
  useTitle(title)
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  const [state, setState] = useState({ phase: 'idle', message: '' })
  const go = async () => {
    setState({ phase: 'working', message: '' })
    try { const r = await run(token); setState({ phase: 'done', message: done(r) }) } catch (e) { setState({ phase: 'error', message: (e && e.message) || 'That did not go through just now. Please try again in a moment.' }) }
  }
  return (
    <main className="rp nlp">
      <h1>{title}</h1>
      {!isToken(token) && <p className="nlp__text">{noToken}</p>}
      {isToken(token) && state.phase !== 'done' && (
        <>
          <p className="nlp__text">{explain}</p>
          <p><button type="button" className="pg-btn nlp__button" onClick={go} disabled={state.phase === 'working'} aria-busy={state.phase === 'working'}>{state.phase === 'working' ? working : button}</button></p>
          {state.phase === 'error' && <p className="nlp__error" role="alert">{state.message}</p>}
        </>
      )}
      {state.phase === 'done' && <div className="nlp__text" role="status">{state.message}</div>}
      <p><Link to="/">Back to the homepage</Link></p>
    </main>
  )
}

// After confirming: someone who asked for the free ebook also gets it here (or is told it is still being finished). It is the same list for everyone.
function Confirmed({ already, ebook, request, newsletter }) {
  // A free ebook request is its own thing: it says nothing about the newsletter unless they ticked that separate box.
  const thanks = request
    ? (already ? 'You have already confirmed. Thank you.' : 'Thank you, you are confirmed.')
    : (already ? 'You are already subscribed. Thank you.' : 'You are subscribed. Thank you: the next newsletter will come to you.')
  if (!ebook) return thanks
  return (
    <>
      <p>{thanks}</p>
      {request && newsletter && <p>You also asked for the newsletter, so you are on that list too. You can unsubscribe at any time, with the link in every email.</p>}
      {EBOOK.file ? (
        <p><a className="pg-btn nlp__button" href={EBOOK.file} download>Download the free ebook (PDF)</a> <small>{EBOOK.fileNote}</small></p>
      ) : (
        <p>Your free ebook is still being finished. I will email you the link as soon as it is ready.</p>
      )}
    </>
  )
}

export function NewsletterConfirmPage() {
  const [params] = useSearchParams()
  const forEbook = params.get('for') === 'ebook' // only changes the words before the button: the server decides what is confirmed by the private code in the link
  const done = (r) => <Confirmed already={r.state === 'already'} ebook={r.source === 'ebook'} request={r.kind === 'request'} newsletter={r.newsletter === true} />
  if (forEbook) return <LinkPage title="Confirm your email" button="Yes, send me the free ebook" working="Confirming…" run={confirmSubscription} explain="Press the button to confirm your email address. You will then get the free ebook." done={done} noToken="That link does not look right. Please open the link in the email we sent you." />
  return <LinkPage title="Confirm your subscription" button="Yes, send me the newsletter" working="Confirming…" run={confirmSubscription} explain="Press the button to say yes: you will then get the Starscapes Factory newsletter by email, and you can unsubscribe at any time." done={done} noToken="That link does not look right. Please open the link in the email we sent you." />
}

export function NewsletterUnsubscribePage() {
  return <LinkPage title="Unsubscribe" button="Unsubscribe me" working="Unsubscribing…" run={unsubscribe} explain="Press the button to stop the Starscapes Factory newsletter. You will not get any more." done={() => 'You are unsubscribed. You will not get any more newsletters. If you change your mind, you can sign up again at any time.'} noToken="That link does not look right. If you came from a test email, nothing needs doing. Otherwise please use the unsubscribe link at the bottom of the newsletter itself." />
}
