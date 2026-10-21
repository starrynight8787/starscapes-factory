import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import RoomIcon from '../components/RoomIcon'
import PageLoading from '../components/PageLoading'
import PageBanner from '../components/PageBanner'
import { channels } from '../data/channels'
import { MEMBERSHIP } from '../data/membership'
import { redirectTo } from '../cart/redirect'
import { PASSES } from './passes'
import { formatPounds } from './pricing'
import { accountView, priceNow, formatDate, unitWord } from './account'
import { fetchMyMembership, fetchAccount, openBillingPortal, resumePasses } from './membershipApi'
import ProfilePanel from './ProfilePanel'
import './membership.css'

const ROOM_NAME = Object.fromEntries(channels.map((c) => [c.slug, c.name]))

// One pass, shown as a card (not a tick box here: this page only SHOWS what is open). Figma: 13 Membership, my passes.
function PassCard({ pass, open }) {
  return (
    <li className={`mb__pass mb__pass--static${open ? ' is-on' : ''}`}>
      <span className="mb__box" aria-hidden="true">{open ? '✓' : ''}</span>
      <RoomIcon room={pass.room} size={52} />
      <span className="mb__passtext">
        <span className="mb__passname">{pass.name}</span>
        <span className="mb__passblurb">{pass.blurb}</span>
        <span className="pg-chip mb__room">{ROOM_NAME[pass.room]}</span>
      </span>
    </li>
  )
}

// "My passes" (at /membership/passes), and, for someone with none, "My membership". What it shows depends on where their membership stands. For a signed-in person only.
function PassesContent({ owner = false }) {
  const open = MEMBERSHIP.open === true
  const location = useLocation()
  const [state, setState] = useState({ phase: 'loading', row: null })
  const [card, setCard] = useState(null)
  const [busy, setBusy] = useState('') // 'portal' or 'resume'
  const [problem, setProblem] = useState('')
  const [round, setRound] = useState(0)
  const justChanged = Boolean(location.state && location.state.changed)
  useTitle(!open && !owner ? 'My account' : state.phase === 'ready' && accountView(state.row) === 'free' ? 'My membership' : 'My passes')

  useEffect(() => {
    if (!open && !owner) return undefined
    let stopped = false
    setState({ phase: 'loading', row: null })
    fetchMyMembership()
      .then((row) => !stopped && setState({ phase: 'ready', row }))
      .catch(() => !stopped && setState({ phase: 'error', row: null }))
    return () => {
      stopped = true
    }
  }, [open, owner, round])

  const status = state.row && state.row.status
  useEffect(() => {
    if (state.phase !== 'ready' || !['active', 'trialing', 'past_due', 'unpaid'].includes(status)) return undefined
    let stopped = false
    fetchAccount().then((a) => !stopped && setCard(a.card))
    return () => {
      stopped = true
    }
  }, [state.phase, status])

  if (!open && !owner) {
    return (
      <div className="mb__pc mb--welcome">
        <div className="mb__w">
          <section className="mb__sum mb__sum--plain mb--closed">
            <h2 className="mb__wname">Memberships are not open yet</h2>
            <p>{MEMBERSHIP.textWhileClosed}</p>
            <p>
              <Link to="/">Back to the home page</Link>
            </p>
          </section>
        </div>
      </div>
    )
  }
  if (state.phase === 'loading') return <PageLoading label="Finding your passes…" />
  if (state.phase === 'error') {
    return (
      <div className="mb__pc mb--welcome">
        <div className="mb__w">
          <h2 className="mb__title">My passes</h2>
          <p className="mb__lead">We could not find your passes just now. Please try again in a moment.</p>
          <button type="button" className="mb__wbtn" onClick={() => setRound((n) => n + 1)}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const row = state.row
  const view = accountView(row)

  async function portal() {
    setBusy('portal')
    setProblem('')
    try {
      redirectTo(await openBillingPortal())
    } catch (e) {
      setProblem(e.message)
      setBusy('')
    }
  }
  async function startAgain() {
    setBusy('resume')
    setProblem('')
    try {
      await resumePasses()
      setBusy('')
      setRound((n) => n + 1)
    } catch (e) {
      setProblem(e.message)
      setBusy('')
    }
  }
  const problemNote = problem && (
    <p className="mb__note" role="status">
      {problem}
    </p>
  )

  if (view === 'free') {
    return (
      <div className="mb__pc mb--welcome">
        <div className="mb__w">
          <h2 className="mb__title">My membership</h2>
          <section className="mb__sum">
            <span className="pg-chip">Free member</span>
            <p className="mb__lead">You can read every public entry.</p>
          </section>
          <section className="mb__sum mb__sum--plain">
            <h2 className="mb__wname">Want to open more of the story?</h2>
            <p>{`Passes start at £5 a month: ${PASSES.slice(0, -1).map((p) => p.name).join(', ')}, and ${PASSES[PASSES.length - 1].name}.`}</p>
            <Link className="mb__wbtn" to="/membership">
              Choose your passes
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (view === 'cancelling') {
    return (
      <div className="mb__pc mb--welcome">
        <div className="mb__w">
          <h2 className="mb__title">My passes</h2>
          <section className="mb__sum">
            <span className="pg-chip">Cancelled</span>
            <p className="mb__lead">{`Your passes are cancelled. They stay open until ${formatDate(row.current_period_end)}, and you will not be charged again.`}</p>
            <button type="button" className="mb__wbtn" onClick={startAgain} disabled={busy === 'resume'}>
              {busy === 'resume' ? 'One moment…' : 'Start again'}
            </button>
            {problemNote}
          </section>
        </div>
      </div>
    )
  }

  if (view === 'ended') {
    return (
      <div className="mb__pc mb--welcome">
        <div className="mb__w">
          <h2 className="mb__title">My passes</h2>
          <section className="mb__sum">
            <span className="pg-chip">Ended</span>
            <p className="mb__lead">{row.current_period_end && Date.parse(row.current_period_end) <= Date.now() ? `Your passes ended on ${formatDate(row.current_period_end)}.` : 'Your passes have ended.'} You can choose passes again whenever you like.</p>
            <Link className="mb__wbtn" to="/membership">
              Choose your passes
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (view === 'trouble') {
    return (
      <div className="mb__pc mb--welcome">
        <div className="mb__w">
          <h2 className="mb__title">My passes</h2>
          <section className="mb__sum">
            <span className="pg-chip">Payment needed</span>
            <p className="mb__lead">We could not take your last payment. Stripe will try again, and you can check or change your card now.</p>
            <button type="button" className="mb__wbtn" onClick={portal} disabled={busy === 'portal'}>
              {busy === 'portal' ? 'Opening Stripe…' : 'Manage payment or cancel'}
            </button>
            {problemNote}
          </section>
        </div>
      </div>
    )
  }

  // active
  const mine = PASSES.filter((p) => row.passes.includes(p.id))
  const rest = PASSES.filter((p) => !row.passes.includes(p.id))
  const price = priceNow(row, mine.length)
  return (
    <div className="mb__pc mb--welcome">
      <div className="mb__w">
        <h2 className="mb__title">My passes</h2>
        {justChanged && (
          <p className="mb__note" role="status">
            Your passes are changed. Your new price starts from your next payment.
          </p>
        )}
        <section className="mb__sum" aria-label="Your membership">
          <span className="pg-chip">{`${mine.length} ${mine.length === 1 ? 'pass' : 'passes'}`}</span>
          <p className="mb__big">{`${formatPounds(price.pence)} ${unitWord(price.per)}`}</p>
          {price.onOffer && <p className="mb__small">{`Launch offer until ${formatDate(price.until)}, then ${formatPounds(price.regular)} ${unitWord(price.per)}.`}</p>}
          {row.offer_note && <p className="mb__small">{`Your discount: ${row.offer_note}.`}</p>}
          <p className="mb__small">{`Next payment on ${formatDate(row.current_period_end)}.${card ? ` Card ending ${card.last4}.` : ''}`}</p>
          <div className="mb__wbtns">
            <Link className="mb__wbtn" to="/membership/change">
              Change my passes
            </Link>
            <button type="button" className="mb__wbtn" onClick={portal} disabled={busy === 'portal'}>
              {busy === 'portal' ? 'Opening Stripe…' : 'Manage payment or cancel'}
            </button>
          </div>
          {problemNote}
        </section>
        <h2 className="mb__h2">Open now</h2>
        <ul className="mb__plist">
          {mine.map((p) => (
            <PassCard key={p.id} pass={p} open />
          ))}
        </ul>
        {rest.length > 0 && (
          <>
            <h2 className="mb__h2">Not open</h2>
            <ul className="mb__plist">
              {rest.map((p) => (
                <PassCard key={p.id} pass={p} open={false} />
              ))}
            </ul>
          </>
        )}
        <p className="mb__small">Manage payment or cancel opens Stripe, where you can change your card, see receipts, or cancel. If you cancel, you keep your passes until the end of what you have paid for.</p>
      </div>
    </div>
  )
}

// "My passes": your profile on the left (name, username, icon, emails) and your passes on the right. Figma: 25 My passes and profile.
export default function MyPassesPage({ owner = false }) {
  return (
    <main className="mb mb--account">
      <PageBanner art="plain" room="factory-floor" chip="Your account" title="My account" />
      <div className="mb__acct">
        <ProfilePanel />
        <PassesContent owner={owner} />
      </div>
    </main>
  )
}
