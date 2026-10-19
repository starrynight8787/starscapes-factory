import { Routes, Route, Link, useParams } from 'react-router-dom'
import RoomHome from './RoomHome'
import RoomAreaPage from './RoomAreaPage'
import { ROOMS } from './roomsData'
import DoorGate from '../doors/DoorGate'
import { doorAreas, findDoor } from '../doors/doorsData'
import StoryLedgerPage from '../ledger/StoryLedgerPage'
import YouTubeSeriesPage from '../den/YouTubeSeriesPage'
import FreeEbookPage from '../ebook/FreeEbookPage'
import BookClubPage from '../bookclub/BookClubPage'
import LeadershipBlogPage from '../leadership/LeadershipBlogPage'
import WritingInTransitPage from '../entries/WritingInTransitPage'
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

// The pages behind a door that have their own design, by "room/door". (The door is listed in src/doors/doorsData.js with layout 'custom'.)
const CUSTOM_PAGES = {
  'knowledge-nook/story-ledger': StoryLedgerPage,
  'sarah-jrs-den/youtube-series': YouTubeSeriesPage,
  'leadership-lounge/free-ebook': FreeEbookPage,
  'knowledge-nook/book-club': BookClubPage,
}

// Pages with their own design that are always open (not behind a door), by "room/page".
const CUSTOM_AREAS = {
  'leadership-lounge/blog': LeadershipBlogPage,
  'explorers-bay/writing-in-transit': WritingInTransitPage,
}

// One page under a room. If it is the page behind a door, the door's gate decides who sees it.
function AreaRoute({ room }) {
  const { area } = useParams()
  const areas = { ...ROOMS[room].areas, ...doorAreas(room) }
  const page = <RoomAreaPage room={room} areas={areas} />
  const door = findDoor(room, area)
  const Own = !door ? CUSTOM_AREAS[`${room}/${area}`] : null
  if (Own) return <Own />
  const Custom = door && door.page && door.page.layout === 'custom' ? CUSTOM_PAGES[`${room}/${door.id}`] : null
  if (Custom) return <DoorGate room={room} door={door.id}><Custom /></DoorGate>
  return door && door.page ? <DoorGate room={room} door={door.id}>{page}</DoorGate> : page
}
