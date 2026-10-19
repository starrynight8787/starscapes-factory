import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { FailureMessage, SuccessMessage } from '../components/FormMessages'
import useTitle from '../pages/useTitle'
import { ROOMS } from '../rooms/roomsData'
import { DOORS, doorKey, doorPath } from '../doors/doorsData'
import useDoors, { loadDoors } from '../doors/useDoors'
import { saveDoor } from '../doors/doorsApi'
import { useOwnerCheck } from './useIsOwner'
import './admin.css'

const ROOM_ORDER = ['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'knowledge-nook', 'sarah-jrs-den']

// The owner's tool for opening and closing the doors in the illustrated rooms, at /admin/doors.
export default function OpenDoors({ session }) {
  useTitle('Open a door')
  const { checking, owner } = useOwnerCheck(session)
  const { ready, failed, isOpen } = useDoors()
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null) // { ok, text }

  async function change(door, open) {
    setBusy(doorKey(door.room, door.id))
    setMessage(null)
    try {
      await saveDoor(door.room, door.id, open)
      await loadDoors({ force: true })
      setMessage({ ok: true, text: open ? `${door.name} is now open to visitors.` : `${door.name} is closed again.` })
    } catch (e) {
      setMessage({ ok: false, text: `${door.name} was not changed. ${e.message || 'Please try again in a moment.'}` })
    }
    setBusy(null)
  }

  if (checking || !ready) return <PageLoading label="Checking who you are…" />
  if (!owner) {
    return (
      <main className="ad">
        <h1>Open a door</h1>
        <p className="ad-note">This area is for the site owner.</p>
        <p>
          <Link to="/">Back to the homepage</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="ad">
      <p className="ad-back">
        <Link to="/admin">← Back to Admin</Link>
      </p>
      <h1>Open a door</h1>
      <p className="ad-note">Every door starts closed. Visitors see it taped off and cannot reach its page. Open one when what is behind it is ready.</p>
      {failed && (
        <FailureMessage title="I could not read the doors">
          Every door is staying closed for now. Has sql/doors.sql been run in Supabase? If it has, try again in a moment.
        </FailureMessage>
      )}
      {message && (message.ok ? <SuccessMessage title={message.text} /> : <FailureMessage title="That did not work">{message.text}</FailureMessage>)}
      {ROOM_ORDER.map((room) => {
        const doors = DOORS.filter((d) => d.room === room)
        return (
          <section key={room} className="ad-group" aria-labelledby={`od-${room}`}>
            <h2 id={`od-${room}`}>{ROOMS[room].name}</h2>
            <ul className="ad-doors">
              {doors.map((door) => {
                const open = isOpen(door.room, door.id)
                const path = doorPath(door)
                const key = doorKey(door.room, door.id)
                return (
                  <li key={key} className="ad-door">
                    <div className="ad-door__info">
                      <span className="ad-tool__name">{door.name}</span>
                      <span className={`ad-door__state${open ? ' is-open' : ''}`}>{open ? 'Open to visitors' : 'Closed'}</span>
                      {!door.page && <span className="ad-tool__blurb">Its page has not been built yet, so it cannot be opened.</span>}
                      {door.page && door.ghost && !open && <span className="ad-tool__blurb">Its picture is a dotted outline for now. It will look unfinished once it is open.</span>}
                      {path && (
                        <Link className="ad-door__view" to={path}>
                          See its page{open ? '' : ' (only you can see it while closed)'}
                        </Link>
                      )}
                    </div>
                    <button
                      type="button"
                      className="ad-door__button"
                      disabled={!door.page || busy === key || failed}
                      aria-label={`${open ? 'Close this door' : 'Open this door'}: ${door.name}`}
                      onClick={() => change(door, !open)}
                    >
                      {open ? 'Close this door' : 'Open this door'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
