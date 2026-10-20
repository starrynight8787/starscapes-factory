import EntryPage from './EntryPage'
import NebulaBox from './NebulaBox'
import { fetchRoomPosts } from '../rooms/roomsApi'
import { ROOMS } from '../rooms/roomsData'
import { inArea } from '../rooms/postRules'

// Writing in Transit (Explorer's Bay), on the entry template. Its title, the line under it and the tag that picks its posts come from the room's own data.
// The right-hand column is the Into the Nebula membership box, then the pinned entry, then the most read.
const ROOM = 'explorers-bay'
const PAGE = ROOMS[ROOM].areas['writing-in-transit']
const load = () => fetchRoomPosts(ROOM)
const aside = <NebulaBox />
const belongs = (post) => inArea(PAGE, post)

export default function WritingInTransitPage() {
  return <EntryPage title={PAGE.name} blurb={PAGE.blurb} backTo={`/${ROOM}`} backLabel={`Back to ${ROOMS[ROOM].name}`} load={load} belongs={belongs} art="transit" room="explorers-bay" chip={ROOMS[ROOM].name} aside={aside} underAside />
}
