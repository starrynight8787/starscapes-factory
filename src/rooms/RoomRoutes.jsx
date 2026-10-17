import { Routes, Route, Link, useParams } from 'react-router-dom'
import RoomHome from './RoomHome'
import RoomAreaPage from './RoomAreaPage'
import { ROOMS } from './roomsData'
import DoorGate from '../doors/DoorGate'
import { doorAreas, findDoor } from '../doors/doorsData'
import './roompages.css'

// Everything under one room's address (for example /idea-hatchery) lives here, so the main App only needs one line for each room.
export default function RoomRoutes({ room }) {
  return (
    <Routes>
      <Route index element={<RoomHome room={room} />} />
      <Route path=":area" element={<AreaRoute room={room} />} />
      <Route
        path="*"
        element={
          <main className="rp">
            <p className="rp-back"><Link to={`/${room}`}>← Back to {ROOMS[room].name}</Link></p>
            <h1>Page not found</h1>
          </main>
        }
      />
    </Routes>
  )
}

// One page under a room. If it is the page behind a door, the door's gate decides who sees it.
function AreaRoute({ room }) {
  const { area } = useParams()
  const areas = { ...ROOMS[room].areas, ...doorAreas(room) }
  const page = <RoomAreaPage room={room} areas={areas} />
  const door = findDoor(room, area)
  return door && door.page ? <DoorGate room={room} door={door.id}>{page}</DoorGate> : page
}
