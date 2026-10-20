import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import RoomIcon from '../components/RoomIcon'
import PageLoading from '../components/PageLoading'
import { channels } from '../data/channels'
import { MEMBERSHIP } from '../data/membership'
import { PASSES, PASS_IDS, CONSENT_TEXT } from './passes'
import { formatPounds, ladderRows, ladderKey } from './pricing'
import { accountView, priceNow, changeOf, nameList, unitWord } from './account'
import { changeWindow, closedMessage } from './changeWindow'
import { fetchMyMembership, changePasses } from './membershipApi'
import { NotOpen } from './MembershipPage'
import './membership.css'

const ROOM_NAME = Object.fromEntries(channels.map((c) => [c.slug, c.name]))

// What a change means, said plainly. (A decision for Gill to confirm: the change starts today, and the new price applies from the next payment.)
export const CHANGE_TERMS = 'The change starts today. Your new price applies from your next payment. Nothing is charged today, and nothing is refunded for a pass you take away.'

// "Change my passes" (at /membership/change). Figma: 13 Membership, change my passes. For a signed-in person who holds open passes.
export default function ChangePassesPage({ owner = false }) {
  useTitle('Change my passes')
  const open = MEMBERSHIP.open === true
  const navigate = useNavigate()
  const [state, setState] = useState({ phase: 'loading', row: null })
  const [picked, setPicked] = useState([])
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open && !owner) return undefined
    let stopped = false
    fetchMyMembership()
      .then((row) => {
        if (stopped) return
        setState({ phase: 'ready', row })
        setPicked(row && Array.isArray(row.passes) ? PASS_IDS.filter((id) => row.passes.includes(id)) : [])
      })
      .catch(() => !stopped && setState({ phase: 'error', row: null }))
    return () => {
      stopped = true
    }
  }, [open, owner])

  if (!open && !owner) return <NotOpen />
  if (state.phase === 'loading') return <PageLoading label="Finding your passes…" />
  const row = state.row
  if (state.phase === 'error' || accountView(row) !== 'active') {
    const cancelling = accountView(row) === 'cancelling'
    return (
      <main className="mb mb--welcome">
        <div className="mb__w">
          <h1>Change my passes</h1>
          <p className="mb__lead">
            {state.phase === 'error'
              ? 'We could not find your passes just now. Please try again in a moment.'
              : cancelling
                ? 'Your passes are set to end. If you would like to keep them, choose "Start again" on My passes first.'
                : 'You can change your passes once you have some open.'}
          </p>
          <Link className="mb__wbtn" to={state.phase === 'error' || row ? '/membership/passes' : '/membership'}>
            {state.phase === 'error' || row ? 'Back to my passes' : 'Choose your passes'}
          </Link>
        </div>
      </main>
    )
  }

  // Only in the last days before the next payment (a working rule, see changeWindow.js): outside that, say when it opens
  const win = changeWindow(row)
  if (!win.open) {
    return (
      <main className="mb mb--welcome">
        <div className="mb__w">
          <h1>Change my passes</h1>
          <p className="mb__lead">{closedMessage(win)}</p>
          <p className="mb__small">To stop all your passes, go back and use "Manage payment or cancel".</p>
          <Link className="mb__wbtn" to="/membership/passes">Back to my passes</Link>
        </div>
      </main>
    )
  }

  const diff = changeOf(row.passes, picked)
  const count = diff.wanted.length
  const changed = diff.added.length > 0 || diff.removed.length > 0
  const adding = diff.added.length > 0
  const from = priceNow(row, row.passes.length)
  const to = priceNow(row, count)
  const canSave = count > 0 && changed && (!adding || agreed)
  const current = ladderKey(count)

  function toggle(id) {
    setNote('')
    setPicked((now) => PASS_IDS.filter((pid) => (pid === id ? !now.includes(pid) : now.includes(pid))))
  }
  async function save() {
    if (!canSave || busy) return
    setBusy(true)
    setNote('')
    try {
      await changePasses({ passes: diff.wanted, consent: agreed })
      navigate('/membership/passes', { state: { changed: true } })
    } catch (e) {
      setNote(e.message)
      setBusy(false)
    }
  }

  return (
    <main className="mb">
      <div className="mb__hero">
        <h1>Change my passes</h1>
        <p>You can add or remove a pass whenever you like.</p>
      </div>
      <div className="mb__body">
        <div className="mb__left">
          <fieldset className="mb__passes">
            <legend className="mb__h2">Tick the passes you want</legend>
            {PASSES.map((p) => {
              const on = picked.includes(p.id)
              return (
                <label key={p.id} className={`mb__pass${on ? ' is-on' : ''}`} htmlFor={`change-${p.id}`}>
                  <input id={`change-${p.id}`} className="mb__check" type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                  <span className="mb__box" aria-hidden="true">{on ? '✓' : ''}</span>
                  <RoomIcon room={p.room} size={52} />
                  <span className="mb__passtext">
                    <span className="mb__passname">{p.name}</span>
                    <span className="mb__passblurb">{p.blurb}</span>
                    <span className="pg-chip mb__room">{ROOM_NAME[p.room]}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>
        </div>

        <div className="mb__right">
          <section className="mb__price" aria-label="Your new price" aria-live="polite">
            {count === 0 ? (
              <>
                <p className="mb__big">Choose at least one pass</p>
                <p className="mb__small">To stop all your passes, go back and use "Manage payment or cancel".</p>
              </>
            ) : !changed ? (
              <>
                <p className="mb__big">{`${formatPounds(from.pence)} ${unitWord(from.per)}`}</p>
                <p className="mb__small">This is what you pay now. Tick or untick a pass to change it.</p>
              </>
            ) : (
              <>
                <p className="mb__big">{from.pence === to.pence ? `Your price stays ${formatPounds(to.pence)} ${unitWord(to.per)}` : `From ${formatPounds(from.pence)} ${unitWord(from.per)} to ${formatPounds(to.pence)} ${unitWord(to.per)}`}</p>
                <p className="mb__small">
                  {[adding && `You are adding ${nameList(diff.added)}.`, diff.removed.length > 0 && `You are removing ${nameList(diff.removed)}.`].filter(Boolean).join(' ')} {CHANGE_TERMS}
                </p>
                {to.onOffer && <p className="mb__small">{`Your launch offer carries on, so these prices already include it.`}</p>}
              </>
            )}
          </section>

          {adding && (
            <label className="mb__consent" htmlFor="change-consent">
              <input id="change-consent" className="mb__check" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span className="mb__box" aria-hidden="true">{agreed ? '✓' : ''}</span>
              <span>{CONSENT_TEXT}</span>
            </label>
          )}

          <div className="mb__wbtns">
            <button type="button" className="mb__go" disabled={!canSave || busy} aria-describedby={canSave ? undefined : 'change-why'} onClick={save}>
              {busy ? 'Saving…' : 'Save my passes'}
            </button>
            <Link className="mb__wbtn" to="/membership/passes">
              Cancel
            </Link>
          </div>
          {!canSave && (
            <p id="change-why" className="mb__why">
              {count === 0 ? 'Choose at least one pass to continue.' : !changed ? 'Tick or untick a pass to change your passes.' : 'Tick the box above to open your new passes.'}
            </p>
          )}
          {note && (
            <p className="mb__note" role="status">
              {note}
            </p>
          )}

          <section className="mb__ladder" aria-label="Prices">
            <h2 className="mb__ladderh">The more passes you take, the less each one costs</h2>
            <ul>
              {ladderRows().map((r) => (
                <li key={r.key} className={r.key === current ? 'is-now' : ''} aria-current={r.key === current ? 'true' : undefined}>
                  <span>{r.label}</span>
                  <span>{`${formatPounds(r.month)} a month`}</span>
                  <span>{`or ${formatPounds(r.year)} a year`}</span>
                </li>
              ))}
            </ul>
            <p className="mb__small">{`Everything means four or more passes, and it stays ${formatPounds(ladderRows()[3].month)} however many passes there are.`}</p>
          </section>
        </div>
      </div>
    </main>
  )
}
