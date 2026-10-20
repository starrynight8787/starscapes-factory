import { Link } from 'react-router-dom'
import { MEMBERSHIP } from '../data/membership'
import { closesText, LETTERS } from './votesRules'
import './stories.css'

function Results({ rows, chosen, mine }) {
  return (
    <ul className="ls__results">
      {rows.map((r) => (
        <li key={r.id} className={`ls__result${chosen === r.id ? ' is-chosen' : ''}${mine === r.id ? ' is-mine' : ''}`}>
          <span className="ls__resulttext"><strong className="ls__letter">{r.letter}</strong> {r.label}</span>
          <span className="ls__bar" role="img" aria-label={`${r.votes} ${r.votes === 1 ? 'vote' : 'votes'}, ${r.percent} per cent`}><span className={`ls__bar-fill ls__bar-fill--p${r.step}`} /></span>
          <span className="ls__resultmeta">
            <span>{r.votes} {r.votes === 1 ? 'vote' : 'votes'}</span>
            {mine === r.id && <span className="ls__chip ls__chip--navy">Your vote</span>}
            {chosen === r.id && <span className="ls__chip ls__chip--green">Chosen</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

// The vote box in its four states (Figma: "The vote box in each state"). It only draws what it is given: the state, the choices, the results (if the database handed them over) and what to do on a press.
// state: 'member' (a member who has not voted, or is changing their vote), 'voted', 'visitor' or 'closed'.
export default function VoteBox({ vote, state, options, tally, chosen, myOption, selected, onSelect, onCast, onChange, onCancel, busy, problem, changing, signedIn }) {
  const closes = closesText(vote.closes_at)
  const membershipOpen = MEMBERSHIP.open === true
  const chip = state === 'closed' ? 'Closed' : state === 'visitor' ? 'Members only' : 'Open'
  const heading = state === 'closed' ? 'Where the story went' : vote.question
  const withLetters = options.map((o) => ({ ...o, letter: LETTERS[o.position - 1] || '' }))

  return (
    <section className={`ls__box ls__vote ls__vote--${state}`} aria-labelledby="ls-vote-title">
      <p className="ls__label">The vote<span className={`ls__chip ${state === 'closed' ? 'ls__chip--navy' : state === 'visitor' ? 'ls__chip--blue' : 'ls__chip--green'}`}>{chip}</span></p>
      <h2 id="ls-vote-title" className="ls__script">{heading}</h2>

      {state === 'closed' && (
        <>
          <p>After Chapter {vote.after_chapter}, members chose:</p>
          {tally ? <Results rows={tally.rows} chosen={chosen} mine={myOption} /> : <ul className="ls__options">{withLetters.map((o) => <li key={o.id} className="ls__option"><strong className="ls__letter">{o.letter}</strong> {o.label}</li>)}</ul>}
          <p>Chapter {vote.after_chapter + 1} is being written. The next vote opens when it is published.</p>
        </>
      )}

      {state === 'visitor' && (
        <>
          <p>After Chapter {vote.after_chapter}: members choose where the story goes next.</p>
          <ul className="ls__options">{withLetters.map((o) => <li key={o.id} className="ls__option"><strong className="ls__letter">{o.letter}</strong> {o.label}</li>)}</ul>
          <p>The choices show here, but only members can vote. The voting closes on {closes}.</p>
          {membershipOpen
            ? <Link className="pg-btn sg-btn--primary ls__btn" to="/membership">Choose your passes</Link>
            : <button type="button" className="pg-btn ls__soon" disabled>{MEMBERSHIP.buttonWhileClosed}</button>}
          {!signedIn && <p>Already a member? <Link className="ls__link" to="/login">Log in</Link>.</p>}
        </>
      )}

      {state === 'voted' && !changing && (
        <>
          <p>Thank you, your vote is counted. It closes on {closes}.</p>
          {tally ? <Results rows={tally.rows} chosen={null} mine={myOption} /> : <p className="rp-note">The numbers could not load just now.</p>}
          <button type="button" className="pg-btn ls__btn" onClick={onChange}>Change my vote</button>
        </>
      )}

      {(state === 'member' || (state === 'voted' && changing)) && (
        <form className="ls__form" onSubmit={(e) => { e.preventDefault(); if (selected && !busy) onCast() }} noValidate>
          <p>After Chapter {vote.after_chapter}: members choose where the story goes next.</p>
          <fieldset className="ls__fieldset">
            <legend className="ls__vh">{vote.question}</legend>
            {withLetters.map((o) => (
              <label key={o.id} className={`ls__option ls__option--pick${selected === o.id ? ' is-picked' : ''}`}>
                <input className="ls__radio" type="radio" name="story-vote" value={o.id} checked={selected === o.id} onChange={() => onSelect(o.id)} />
                <span><strong className="ls__letter">{o.letter}</strong> {o.label}</span>
              </label>
            ))}
          </fieldset>
          {problem && <p className="ls__problem" role="alert">{problem}</p>}
          <div className="ls__formbuttons">
            <button type="submit" className="pg-btn sg-btn--primary ls__btn" disabled={!selected || busy}>{busy ? 'Saving…' : changing ? 'Save my new vote' : 'Cast my vote'}</button>
            {changing && <button type="button" className="pg-btn ls__btn" onClick={onCancel} disabled={busy}>Keep my vote</button>}
          </div>
          <p>You can change your vote until it closes on {closes}.</p>
        </form>
      )}
    </section>
  )
}
