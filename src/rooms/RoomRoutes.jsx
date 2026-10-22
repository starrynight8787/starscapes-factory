import ComeReadWithMePage from '../draftingdesk/ComeReadWithMePage'
import InstagramGallery from '../instagram/InstagramGallery'
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
import BookShelfPage from '../bookclub/BookShelfPage'
import BookPage from '../bookclub/BookPage'
import LeadershipBlogPage from '../leadership/LeadershipBlogPage'
import LeadingFromTheMiddlePage from '../leadership/LeadingFromTheMiddlePage'
import WritingInTransitPage from '../entries/WritingInTransitPage'
import TapedDoorPage from '../explorers/TapedDoorPage'
import RoadJournalPage from '../explorers/RoadJournalPage'
import LessonsPage from '../explorers/LessonsPage'
import TravelMapPage from '../explorers/TravelMapPage'
import { OPENING_DOORS } from '../explorers/explorersConfig'
import LetsWriteStoryPage from '../stories/LetsWriteStoryPage'
import './roompages.css'

// Everything under one room's address (for example /idea-hatchery) lives here, so the main App only needs one line for each room.
export default function RoomRoutes({ room }) {
  return (
    <Routes>
      <Route index element={<RoomHome room={room} />} />
      {room === 'knowledge-nook' && <Route path="book-club/shelf" element={<DoorGate room="knowledge-nook" door="book-club"><BookShelfPage /></DoorGate>} />}
      {room === 'knowledge-nook' && <Route path="book-club/book/:id" element={<DoorGate room="knowledge-nook" door="book-club"><BookPage /></DoorGate>} />}
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
  'knowledge-nook/come-read-with-me': ComeReadWithMePage,
  'explorers-bay/road-journal': RoadJournalPage,
  'explorers-bay/lessons-from-the-road': LessonsPage,
  'explorers-bay/travel-map': TravelMapPage,
}

// Pages with their own design that are always open (not behind a door), by "room/page".
const CUSTOM_AREAS = {
  'leadership-lounge/blog': LeadershipBlogPage,
  'leadership-lounge/leading-from-the-middle': LeadingFromTheMiddlePage,
  'explorers-bay/writing-in-transit': WritingInTransitPage,
  'idea-hatchery/lets-write-a-story': LetsWriteStoryPage,
}

// One page under a room. If it is the page behind a door, the door's gate decides who sees it.
function AreaRoute({ room }) {
  const { area } = useParams()
  const areas = { ...ROOMS[room].areas, ...doorAreas(room) }
  const page = <RoomAreaPage room={room} areas={areas} extra={room === 'explorers-bay' && area === 'photography' ? <InstagramGallery /> : null} nebula={(room === 'sarah-jrs-den' && area === 'blog') || (room === 'leadership-lounge' && area === 'leading-from-the-middle')} />
  const door = findDoor(room, area)
  const taped = room === 'explorers-bay' && Object.prototype.hasOwnProperty.call(OPENING_DOORS, area) ? <TapedDoorPage door={area} /> : null // the taped page with a "tell me when it opens" sign-up
  if (taped && !(door && door.page)) return taped // a door whose page is not built yet is always taped
  const Own = !door ? CUSTOM_AREAS[`${room}/${area}`] : null
  if (Own) return <Own />
  const Custom = door && door.page && door.page.layout === 'custom' ? CUSTOM_PAGES[`${room}/${door.id}`] : null
  if (Custom) return <DoorGate room={room} door={door.id} closed={taped}><Custom /></DoorGate>
  return door && door.page ? <DoorGate room={room} door={door.id} closed={taped}>{page}</DoorGate> : page
}
