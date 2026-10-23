import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useTitle from '../../pages/useTitle'
import PageBanner from '../../components/PageBanner'
import PageLoading from '../../components/PageLoading'
import { loadRound, reportName, sendAnswers } from './storyRoundApi'
import { MAX_NAME, MONTHLY_NAMES, nameBoxCount, nameSummary, namesFrom, visibleQuestions } from './storyRoundRules'
import '../../styles/pages.css'
import './storyround.css'

// The hidden "Let's write a story" page (Figma: "Story form designs", SFW-269). It lives at /story-round/<a long random code>, is not linked from anywhere, tells search engines
// to ignore it, and is not in the sitemap. The server decides everything that matters (who may answer, when, how many names): this page only shows it kindly.
const CHIP = { 'full_form': 'Chapter: full form', 'names_only': 'Chapter: names only', 'small_vote': 'Chapter: small vote' }
const when = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }) : '')

function Status({ title, children, chip = '', tone = '' }) {
  return (
    <section className={`sr-card sr-status${tone ? ` sr-status--${tone}` : ''}`} aria-live="polite">
      {chip && <p className="sr-chip">{chip}</p>}
      <h2 className="sr-h2">{title}</h2>
      {children}
    </section>
  )
}

function Radio({ name, label, checked, onChange }) {
  return (
    <label className={`sr-radio${checked ? ' is-checked' : ''}`}>
      <input className="sr-box" type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

// One question. The "side kicks?" question has choices in a group ("Yes" with 1, 2 or 3), which show a second row, "How many?", once Yes is chosen.
function Question({ q, parent, answer, names, onAnswer, onName, groupPicked, onGroup, left, kind, token, onReport, reported }) {
  const id = `sr-q-${q.id}`
  const grouped = q.options.some((o) => o.group)
  const boxes = nameBoxCount(q)
  const groupName = grouped ? (q.options.find((o) => o.group) || {}).group : ''
  const answerOption = q.options.find((o) => o.label === answer)
  const yesChosen = grouped && (groupPicked || (answerOption && answerOption.group))
  const loneChoices = q.options.filter((o) => !o.group)
  const countChoices = q.options.filter((o) => o.group)
  return (
    <fieldset className="sr-card sr-q" aria-labelledby={`${id}-label`}>
      <p className="sr-chip">
        Question {q.number} of {q.total}
        {parent ? <span className="sr-chip sr-chip--soft">Because you chose {groupName || 'Yes'}</span> : null}
      </p>
      <legend id={`${id}-label`} className="sr-h2">{q.label}</legend>
      {q.help_text && <p className="sr-help">{q.help_text}</p>}
      {q.type === 'choose_one' && !grouped && (
        <div className="sr-options" role="radiogroup" aria-labelledby={`${id}-label`}>
          {q.options.map((o, i) => (
            <div key={o.label} className="sr-optionrow">
              <Radio name={id} label={o.label} checked={answer === o.label} onChange={() => onAnswer(q.id, o.label)} />
              {kind === 'small_vote' && <button type="button" className="sr-link" onClick={() => onReport(q.id, i)} disabled={reported.includes(`${q.id}:${i}`)}>{reported.includes(`${q.id}:${i}`) ? 'Reported. Thank you.' : `Report ${o.label}`}</button>}
            </div>
          ))}
        </div>
      )}
      {q.type === 'choose_one' && grouped && (
        <>
          <div className="sr-options" role="radiogroup" aria-labelledby={`${id}-label`}>
            {loneChoices.map((o) => <Radio key={o.label} name={id} label={o.label} checked={answer === o.label} onChange={() => { onGroup(q.id, false); onAnswer(q.id, o.label) }} />)}
            <Radio name={id} label={groupName} checked={Boolean(yesChosen)} onChange={() => { onGroup(q.id, true); if (!(answerOption && answerOption.group)) onAnswer(q.id, '') }} />
          </div>
          {yesChosen && (
            <div className="sr-count">
              <p className="sr-help" id={`${id}-how`}>How many?</p>
              <div className="sr-countrow" role="radiogroup" aria-labelledby={`${id}-how`}>
                {countChoices.map((o) => <Radio key={o.label} name={`${id}-n`} label={o.label.replace(/\s.*$/, '')} checked={answer === o.label} onChange={() => onAnswer(q.id, o.label)} />)}
              </div>
            </div>
          )}
        </>
      )}
      {q.type === 'free_text' && (
        <textarea id={`${id}-text`} className="sr-input" rows={3} maxLength={500} aria-labelledby={`${id}-label`} value={answer || ''} onChange={(e) => onAnswer(q.id, e.target.value)} />
      )}
      {boxes > 0 && (
        <div className="sr-names">
          {Array.from({ length: boxes }, (_, i) => (
            <div key={i} className="sr-namefield">
              <label htmlFor={`${id}-name-${i}`} className="sr-label">{q.type === 'name_suggestion' && boxes > 1 ? `Side kick ${i + 1} name (optional)` : 'Suggest a name (optional)'}</label>
              <input id={`${id}-name-${i}`} className="sr-input" type="text" maxLength={MAX_NAME} placeholder="Type a name you like" value={(names && names[i]) || ''} onChange={(e) => onName(q.id, i, e.target.value)} />
            </div>
          ))}
          <p className="sr-help">Only I can see names here. Please keep names kind. A name uses 1 of your {MONTHLY_NAMES} monthly suggestions.</p>
        </div>
      )}
    </fieldset>
  )
}

export default function StoryRoundPage({ session }) {
  useTitle('Let’s write a story')
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading' })
  const [answers, setAnswers] = useState({})
  const [names, setNames] = useState({})
  const [groupPicked, setGroupPicked] = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const [warned, setWarned] = useState(false)
  const [problem, setProblem] = useState('')
  const [sending, setSending] = useState(false)
  const [reported, setReported] = useState([])
  const problemRef = useRef(null)

  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [])

  useEffect(() => {
    let alive = true
    if (!session) { setState({ status: 'signed_out' }); return undefined }
    setState({ status: 'loading' })
    loadRound(token)
      .then((data) => alive && setState({ status: data.state, round: data.round, questions: data.questions || [], left: data.left, sent: data.sent }))
      .catch((e) => alive && setState({ status: e.reason === 'not_paid_member' ? 'not_member' : e.reason === 'not_found' ? 'not_found' : 'error', message: e.message }))
    return () => { alive = false }
  }, [session, token])

  const questions = state.questions || []
  const shown = useMemo(() => visibleQuestions(questions, answers), [questions, answers])
  const sendingNames = useMemo(() => namesFrom(questions, answers, names).length, [questions, answers, names])
  const left = state.left === undefined ? MONTHLY_NAMES : state.left
  const unanswered = shown.filter((q) => q.type !== 'name_suggestion' && !(answers[q.id] || '').trim()).length
  const tooMany = sendingNames > left
  const isVote = state.round && state.round.kind === 'small_vote'
  const namesOnly = state.round && state.round.kind === 'names_only'
  const parentOf = (q) => Boolean(q.show_if_question_id)

  const setAnswer = (id, value) => { setAnswers((a) => ({ ...a, [id]: value })); setWarned(false); setProblem('') }
  const setName = (id, i, value) => { setNames((n) => { const list = [...(n[id] || [])]; list[i] = value; return { ...n, [id]: list } }); setProblem('') }

  async function send(event) {
    event.preventDefault()
    setProblem('')
    if (!confirmed) { setProblem('Please tick the box to say you understand your answers are final.'); return }
    if (tooMany) { setProblem(left === 0 ? 'You have used your 3 name suggestions this month. Please take the names out, or wait until the 1st.' : `You have ${left} name ${left === 1 ? 'suggestion' : 'suggestions'} left this month. Please take some names out.`); return }
    if (!isVote && !namesOnly && unanswered > 0 && !warned) { setWarned(true); return }
    setSending(true)
    try {
      const data = await sendAnswers({ token, answers, names })
      setState((s) => ({ ...s, status: 'sent', sent: data.sent }))
      window.scrollTo && window.scrollTo(0, 0)
    } catch (e) {
      setProblem(e.reason === 'already_sent' ? e.message : e.message)
      if (e.reason === 'already_sent') setState((s) => ({ ...s, status: 'sent', sent: { answered: 0, total: 0, names: 0, left } }))
    } finally {
      setSending(false)
    }
  }

  async function report(questionId, optionIndex) {
    try { await reportName({ token, questionId, optionIndex }); setReported((r) => [...r, `${questionId}:${optionIndex}`]) } catch (e) { setProblem(e.message) }
  }

  const round = state.round || {}
  const title = isVote ? 'A small vote' : namesOnly ? 'Names chapter' : 'Let’s write a story'
  const subtitle = isVote ? 'One question. Pick one.' : namesOnly ? 'Suggest names for the story.' : 'Pick the ingredients for our next story'
  const s = state.status
  let body = null
  if (s === 'loading') body = <PageLoading label="Opening the page…" />
  else if (s === 'signed_out') body = <Status title="Please log in"><p>This page is for members. Log in, then come back to this link.</p><p><Link className="sr-btn" to="/login">Log in</Link></p></Status>
  else if (s === 'not_member') body = <Status title="This is for members" chip="Not available"><p>Taking part is for members who hold the Come Write With Me pass. You can see the passes on the membership page.</p><p><Link className="sr-btn" to="/membership">See the passes</Link></p></Status>
  else if (s === 'not_found') body = <Status title="This page is not available"><p>The link may be wrong, or the chapter may be finished.</p><p><Link className="sr-btn" to="/idea-hatchery/lets-write-a-story">Back to the stories</Link></p></Status>
  else if (s === 'error') body = <Status title="That did not load" tone="warn"><p role="alert">{state.message || 'Please try again in a moment.'}</p></Status>
  else if (s === 'closed') body = <Status title="This chapter has closed" chip="Closed"><p>Thank you for looking. This chapter is not taking answers any more. I will share what the story needs soon.</p></Status>
  else if (s === 'not_yet') body = <Status title="This chapter has not opened yet" chip="Opens soon"><p>{round.opens_at ? `It opens on ${when(round.opens_at)}. Please come back then.` : 'Please come back soon.'}</p></Status>
  else if (s === 'sent') {
    const sent = state.sent || {}
    body = (
      <Status title="Thank you. Your answer is final." chip="Sent" tone="good">
        <p>I have saved what you sent. You cannot change it or send it again. I will share what the story needs when the chapter closes.</p>
        <dl className="sr-summary">
          {!namesOnly && <div><dt>Answers saved</dt><dd>{sent.answered} of {sent.total}</dd></div>}
          <div><dt>Name suggestions sent</dt><dd>{sent.names}</dd></div>
          <div><dt>Name suggestions left this month</dt><dd>{sent.left} of {MONTHLY_NAMES}</dd></div>
        </dl>
        <p><Link className="sr-btn" to="/idea-hatchery">Back to the Idea Hatchery</Link></p>
      </Status>
    )
  } else {
    body = (
      <form className="sr-form" onSubmit={send} noValidate>
        <section className="sr-card sr-intro">
          <p className="sr-chip">{CHIP[round.kind]}{round.closes_at ? <span className="sr-chip sr-chip--soft">Closes {when(round.closes_at)}</span> : null}</p>
          <h2 className="sr-h2">{round.title}</h2>
          {!isVote && <>
            <p>Choose one answer for each question you care about. Skip any you like. I will use the most popular choices to write the story. Thank you for helping me build it.</p>
            <p className="sr-help">How this works</p>
            <ul className="sr-list">
              <li>You answer each question once. Your answers are final when you press Send.</li>
              <li>Name suggestions are private. Only I see them.</li>
              <li>You can suggest up to {MONTHLY_NAMES} names a month, across every chapter.</li>
            </ul>
          </>}
        </section>
        {!isVote && <p className="sr-left" role="status"><span className="sr-dots" aria-hidden="true">{Array.from({ length: MONTHLY_NAMES }, (_, i) => <i key={i} className={i < left ? 'on' : ''} />)}</span><span><strong>Name suggestions left this month: {left} of {MONTHLY_NAMES}.</strong> {left === 0 ? 'They start again on the 1st.' : 'They start again on the 1st of next month.'}</span></p>}
        {shown.map((q) => (
          <Question key={q.id} q={q} parent={parentOf(q)} answer={answers[q.id]} names={names[q.id]} onAnswer={setAnswer} onName={setName}
            groupPicked={groupPicked[q.id]} onGroup={(id, v) => setGroupPicked((g) => ({ ...g, [id]: v }))} left={left} kind={round.kind} token={token} onReport={report} reported={reported} />
        ))}
        <section className="sr-card sr-send">
          <h2 className="sr-h2">{isVote ? 'Ready to vote?' : 'Ready to send?'}</h2>
          {!isVote && !namesOnly && <p>You have answered {shown.length - unanswered} of {shown.length} questions. {unanswered > 0 ? 'You may skip any you like.' : ''}</p>}
          {!isVote && <p className={`sr-summary-line${tooMany ? ' is-over' : ''}`}>{nameSummary(sendingNames, left)}</p>}
          <label className="sr-check"><input className="sr-box" type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setProblem('') }} /><span>I understand my {isVote ? 'vote is' : 'answers are'} final.</span></label>
          {warned && unanswered > 0 && <p className="sr-warn" role="status">You have not answered {unanswered} {unanswered === 1 ? 'question' : 'questions'}. You can go back, or send anyway. Your answers are final once you send them.</p>}
          {problem && <p className="sr-problem" role="alert" ref={problemRef}>{problem}</p>}
          <button className="sr-btn" type="submit" disabled={sending}>{sending ? 'Sending…' : warned && unanswered > 0 ? 'Send anyway' : isVote ? 'Submit' : 'Send my answers'}</button>
        </section>
      </form>
    )
  }

  return (
    <main className="rp sr">
      <PageBanner chip="The Idea Hatchery" title={title} subtitle={subtitle} room="idea-hatchery" />
      {body}
    </main>
  )
}
