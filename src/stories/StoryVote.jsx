import { useCallback, useEffect, useMemo, useState } from 'react'
import useUser from '../suggest/useUser'
import { fetchMyMembership } from '../membership/membershipApi'
import { castVote, fetchMyBallot, fetchResults, fetchVotes } from './votesApi'
import { chosenId, currentVote, holdsStoryPass, isOpen, optionsOf, tally as tallyOf, voteState } from './votesRules'
import VoteBox from './VoteBox'
import { VOTE } from './storiesData'
import './stories.css'

// The vote box for a story: finds the story's vote, who is looking (signed out, signed in without the pass, or a member), whether they have voted, and the results the database is willing to give
// them, then shows the right one of the four states. With no vote (or if it cannot be found) it shows the "soon" box. "now" is only passed in by the tests.
export default function StoryVote({ story, now }) {
  const { loading: userLoading, user } = useUser()
  const [data, setData] = useState({ status: 'loading', votes: [], options: [] })
  const [member, setMember] = useState(null) // null until we know
  const [myOption, setMyOption] = useState(undefined) // undefined until we know; null means "has not voted"
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState('')
  const [changing, setChanging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const nowMs = now ? new Date(now).getTime() : Date.now()

  useEffect(() => {
    let alive = true
    fetchVotes().then((d) => alive && setData({ status: 'ready', ...d })).catch(() => alive && setData({ status: 'error', votes: [], options: [] }))
    return () => { alive = false }
  }, [])

  const vote = useMemo(() => (story ? currentVote(data.votes, story.id, nowMs) : null), [data.votes, story, nowMs])
  const options = useMemo(() => optionsOf(vote, data.options), [vote, data.options])
  const userId = user ? user.id : ''

  useEffect(() => {
    let alive = true
    setMember(null); setMyOption(undefined)
    if (!vote || userLoading) return undefined
    if (!userId) { setMember(false); setMyOption(null); return undefined }
    fetchMyMembership().then((row) => alive && setMember(holdsStoryPass(row))).catch(() => alive && setMember(false))
    fetchMyBallot(vote.id, userId).then((o) => alive && setMyOption(o))
    return () => { alive = false }
  }, [vote, userId, userLoading])

  const closed = Boolean(vote) && !isOpen(vote, nowMs)
  const reload = useCallback(async () => { if (vote) setResults(await fetchResults(vote.id)) }, [vote])
  useEffect(() => { setResults(null); if (vote && (closed || myOption)) reload() }, [vote, closed, myOption, reload])

  if (data.status === 'loading' || userLoading) return null
  if (!vote || options.length === 0) {
    if (!story) return null
    return (
      <section className="ls__box ls__vote" aria-labelledby="ls-vote-title">
        <p className="ls__label">{VOTE.label}<span className="ls__chip ls__chip--navy">{VOTE.chip}</span></p>
        <h2 id="ls-vote-title" className="ls__script">{VOTE.title}</h2>
        <p>{VOTE.text}</p>
      </section>
    )
  }
  if (userId && (member === null || myOption === undefined)) return null // still finding out who this is: show nothing rather than the wrong state

  const state = voteState({ vote, nowMs, signedIn: Boolean(userId), member: Boolean(member), myOption })
  const tallied = results && results.length > 0 ? tallyOf(options, results) : null
  async function cast() {
    setBusy(true); setProblem('')
    try {
      await castVote({ voteId: vote.id, userId, optionId: selected })
      setMyOption(selected); setChanging(false) // (the numbers are fetched again because the choice has changed)
    } catch (e) {
      setProblem(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <VoteBox
      vote={vote} state={state} options={options} tally={tallied} chosen={state === 'closed' ? chosenId(vote, tallied) : null} myOption={myOption || null}
      selected={selected || (changing && myOption) || ''} onSelect={setSelected} onCast={cast}
      onChange={() => { setSelected(myOption || ''); setChanging(true); setProblem('') }} onCancel={() => { setChanging(false); setProblem('') }}
      busy={busy} problem={problem} changing={changing} signedIn={Boolean(userId)}
    />
  )
}
