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
import './opendoors.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'

const ROOM_ORDER = ['idea-hatchery', 'leadership-lounge', 'explorers-bay', 'knowledge-nook', 'sarah-jrs-den']
// Two columns that come out about the same height (6 doors each): Knowledge Nook and the Idea Hatchery on the left, the rest on the right.
const ROOM_COLUMNS = [['knowledge-nook', 'idea-hatchery'], ['sarah-jrs-den', 'leadership-lounge', 'explorers-bay']]

// The owner's tool for opening and closing the doors in the illustrated rooms, at /admin/doors.
export default function OpenDoors({ session }) {
  useTitle('Open a door')
  const { checking, owner } = useOwnerCheck(session)
  const { ready, failed, reason, isOpen } = useDoors()
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
    <main className="ad ad--wide">
      <AdminBanner chip="Doors" title="Open a door" subtitle="Every door starts closed. Visitors see it taped off and cannot reach its page. Open one when what is behind it is ready." icon="door" />
      {failed && (
        <FailureMessage title="I could not read the doors">
          <span className="od-fail">Every door is staying closed for now. The database said: &ldquo;{reason || 'no reason given'}&rdquo;.</span>
          <span className="od-fail">The usual cause is a missing permission on the doors table. In Supabase&apos;s SQL editor, paste and run these two lines (the lines themselves, not a file name), then reload this page:</span>
          <code className="od-code">grant select on public.doors to anon, authenticated;<br />grant insert, update, delete on public.doors to authenticated;</code>
          <span className="od-fail">If the database says the table does not exist, ask Claude for the doors SQL.</span>
        </FailureMessage>
      )}
      {message && (message.ok ? <SuccessMessage title={message.text} /> : <FailureMessage title="That did not work">{message.text}</FailureMessage>)}
      <div className="ad-cols">
      {ROOM_COLUMNS.map((col, ci) => (
        <div className="ad-col" key={ci}>
          {col.map((room) => {
        const doors = DOORS.filter((d) => d.room === room)
        return (
          <section key={room} className="ad-group ad-card" aria-labelledby={`od-${room}`}>
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
        </div>
      ))}
      </div>
    </main>
  )
}
