import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import useTitle from '../rooms/useTitle'
import { ROOMS } from '../rooms/roomsData'
import useDoors from './useDoors'
import useCurrentOwner from './useCurrentOwner'
import './doors.css'

// Wraps the page behind a door. Open: everyone sees the page. Closed: visitors are told the door is not open yet,
// and only the owner sees the page, under a banner that says so. A door can bring its own closed page (closed), such as the taped page with a "tell me when it opens" sign-up.
export default function DoorGate({ room, door, closed = null, children }) {
  const { ready, isOpen } = useDoors()
  const { checking, owner } = useCurrentOwner()

  if (!ready || checking) return <PageLoading />
  if (isOpen(room, door)) return children
  if (owner) {
    return (
      <>
        <div className="dg-banner" role="note">
          <strong>This door is closed.</strong> Only you can see this page until you open the door.{' '}
          <Link to="/admin/doors">Open it in Admin</Link>
        </div>
        {children}
      </>
    )
  }
  return closed || <NotOpenYet room={room} />
}

function NotOpenYet({ room }) {
  useTitle('Not open yet')
  return (
    <main className="rp">
      <p className="rp-back">
        <Link to={`/${room}`}>← Back to {ROOMS[room].name}</Link>
      </p>
      <h1>This door isn&apos;t open yet</h1>
      <p className="rp-note">Come back soon.</p>
    </main>
  )
}
