import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import RoomIcon from '../components/RoomIcon'
import PageLoading from '../components/PageLoading'
import { channels } from '../data/channels'
import { CONTACT_EMAIL } from '../data/contact'
import { PASSES } from './passes'
import { fetchMyMembership } from './membershipApi'
import './membership.css'

const ROOM_NAME = Object.fromEntries(channels.map((c) => [c.slug, c.name]))

// Stripe sends the person back here the moment they have paid, but it tells the site about the payment a moment LATER (the membership webhook). So this page looks for the
// membership every second and a half, for up to about eighteen seconds, before saying it is still being confirmed.
export const LOOK_EVERY_MS = 1500
export const LOOK_THIS_MANY_TIMES = 12

// "Welcome. Your passes are open." (Figma: 13 Membership, welcome). For a signed-in person only.
export default function WelcomePage() {
  useTitle('Welcome')
  const [state, setState] = useState({ phase: 'checking', row: null })
  const [round, setRound] = useState(0) // pressing "Check again" starts another round of looking

  useEffect(() => {
    let stopped = false
    let timer
    let tries = 0
    async function look() {
      try {
        const row = await fetchMyMembership()
        if (stopped) return
        if (row && (row.status === 'active' || row.status === 'trialing')) return setState({ phase: 'open', row })
        if (row && ['past_due', 'unpaid', 'canceled'].includes(row.status)) return setState({ phase: 'closed', row })
      } catch (e) {
        // not there yet, or not reachable for a moment: look again below
      }
      tries += 1
      if (stopped) return
      if (tries >= LOOK_THIS_MANY_TIMES) return setState({ phase: 'waiting', row: null })
      timer = setTimeout(look, LOOK_EVERY_MS)
    }
    setState({ phase: 'checking', row: null })
    look()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [round])

  if (state.phase === 'checking') return <PageLoading label="Opening your passes…" />

  if (state.phase === 'open') {
    const mine = PASSES.filter((p) => state.row.passes.includes(p.id))
    return (
      <main className="mb mb--welcome">
        <div className="mb__w">
          <span className="pg-chip">Thank you</span>
          <h1>Welcome. Your passes are open.</h1>
          <p className="mb__lead">Thank you for supporting the stories. Here is where each of your passes opens.</p>
          <ul className="mb__wlist">
            {mine.map((p) => (
              <li key={p.id} className="mb__wcard">
                <RoomIcon room={p.room} size={48} />
                <div className="mb__wtext">
                  <h2 className="mb__wname">{p.name}</h2>
                  <p>{p.blurb}</p>
                  <Link className="mb__wbtn" to={`/${p.room}`}>
                    {`Open ${ROOM_NAME[p.room]}`}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    )
  }

  if (state.phase === 'closed') {
    return (
      <main className="mb mb--welcome">
        <div className="mb__w">
          <h1>Your passes are not open</h1>
          <p className="mb__lead">Your passes are not open at the moment, so there is nothing to show here. You can choose passes again whenever you like.</p>
          <p>
            <Link className="mb__wbtn" to="/membership">
              Choose your passes
            </Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mb mb--welcome">
      <div className="mb__w">
        <h1>We are still confirming your payment</h1>
        <p className="mb__lead">This can take a minute. If your passes do not appear, press the button below. If they still are not here after a few minutes, please write to us and we will sort it out.</p>
        <p>
          <button type="button" className="mb__wbtn" onClick={() => setRound((n) => n + 1)}>
            Check again
          </button>
        </p>
        <p className="mb__small">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </div>
    </main>
  )
}
