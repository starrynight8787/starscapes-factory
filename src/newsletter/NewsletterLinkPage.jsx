import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import { isToken } from './newsletterRules'
import { EBOOK } from '../ebook/ebookConfig'
import { JOURNAL, OPENING_DOORS } from '../explorers/explorersConfig'
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

// After confirming. A free ebook or Road journal request also gets its download here (or is told it is still being finished); a door's list is told it will hear when the door opens. A request
// says nothing about the newsletter unless they ticked that separate box. The newsletter's own sign-up thanks them as before.
function Confirmed({ already, ebook, request, newsletter, source, door }) {
  const thanks = request
    ? (already ? 'You have already confirmed. Thank you.' : 'Thank you, you are confirmed.')
    : (already ? 'You are already subscribed. Thank you.' : 'You are subscribed. Thank you: the next newsletter will come to you.')
  const extra = request && newsletter ? <p>You also asked for the newsletter, so you are on that list too. You can unsubscribe at any time, with the link in every email.</p> : null
  if (request && source === 'opens') {
    const name = door && OPENING_DOORS[door] ? OPENING_DOORS[door].name : 'This door'
    return <><p>{thanks}</p><p>{name} is not open yet. I will send you one email when it opens.</p>{extra}</>
  }
  const thing = source === 'road-journal' ? { file: JOURNAL.file, note: JOURNAL.fileNote, name: 'Road journal' } : { file: EBOOK.file, note: EBOOK.fileNote, name: 'ebook' }
  if (!ebook && !(request && source === 'road-journal')) return thanks
  return (
    <>
      <p>{thanks}</p>
      {extra}
      {thing.file ? (
        <p><a className="pg-btn nlp__button" href={thing.file} download>Download the free {thing.name} (PDF)</a> <small>{thing.note}</small></p>
      ) : (
        <p>Your free {thing.name} is still being finished. I will email you the link as soon as it is ready.</p>
      )}
    </>
  )
}

const FOR = { // the words before the button, chosen by "for" in the link (only the words: the server decides what is confirmed by the private code)
  ebook: { title: 'Confirm your email', button: 'Yes, send me the free ebook', explain: 'Press the button to confirm your email address. You will then get the free ebook.' },
  'road-journal': { title: 'Confirm your email', button: 'Yes, send me the Road journal', explain: 'Press the button to confirm your email address. You will then get the free Road journal.' },
  opens: { title: 'Confirm your email', button: 'Yes, tell me when it opens', explain: 'Press the button to confirm your email address. I will then send you one message when the door opens.' },
}

export function NewsletterConfirmPage() {
  const [params] = useSearchParams()
  const forWhat = Object.prototype.hasOwnProperty.call(FOR, params.get('for')) ? FOR[params.get('for')] : null
  const done = (r) => <Confirmed already={r.state === 'already'} ebook={r.source === 'ebook'} request={r.kind === 'request'} newsletter={r.newsletter === true} source={r.source} door={r.door} />
  if (forWhat) return <LinkPage title={forWhat.title} button={forWhat.button} working="Confirming…" run={confirmSubscription} explain={forWhat.explain} done={done} noToken="That link does not look right. Please open the link in the email we sent you." />
  return <LinkPage title="Confirm your subscription" button="Yes, send me the newsletter" working="Confirming…" run={confirmSubscription} explain="Press the button to say yes: you will then get the Starscapes Factory newsletter by email, and you can unsubscribe at any time." done={done} noToken="That link does not look right. Please open the link in the email we sent you." />
}

export function NewsletterUnsubscribePage() {
  return <LinkPage title="Unsubscribe" button="Unsubscribe me" working="Unsubscribing…" run={unsubscribe} explain="Press the button to stop the Starscapes Factory newsletter. You will not get any more." done={() => 'You are unsubscribed. You will not get any more newsletters. If you change your mind, you can sign up again at any time.'} noToken="That link does not look right. If you came from a test email, nothing needs doing. Otherwise please use the unsubscribe link at the bottom of the newsletter itself." />
}
