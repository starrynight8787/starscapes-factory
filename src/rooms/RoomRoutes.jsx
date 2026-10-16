import { Routes, Route, Link } from 'react-router-dom'
import RoomHome from './RoomHome'
import RoomAreaPage from './RoomAreaPage'
import { ROOMS } from './roomsData'
import './roompages.css'

// Everything under one room's address (for example /idea-hatchery) lives here, so the main App only needs one line for each room.
export default function RoomRoutes({ room }) {
  return (
    <Routes>
      <Route index element={<RoomHome room={room} />} />
      <Route path=":area" element={<RoomAreaPage room={room} />} />
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
