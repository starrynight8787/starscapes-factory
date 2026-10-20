import EntryPage from './EntryPage'
import { fetchRoomPosts } from '../rooms/roomsApi'
import { ROOMS } from '../rooms/roomsData'
import { inArea } from '../rooms/postRules'

// Writing in Transit (Explorer's Bay), on the entry template. Its title, the line under it and the tag that picks its posts come from the room's own data.
// It has no extra box under the pinned entry for now (what goes there is not decided).
const ROOM = 'explorers-bay'
const PAGE = ROOMS[ROOM].areas['writing-in-transit']
const load = () => fetchRoomPosts(ROOM)
const belongs = (post) => inArea(PAGE, post)

export default function WritingInTransitPage() {
  return <EntryPage title={PAGE.name} blurb={PAGE.blurb} backTo={`/${ROOM}`} backLabel={`Back to ${ROOMS[ROOM].name}`} load={load} belongs={belongs} art="transit" room="explorers-bay" chip={ROOMS[ROOM].name} />
}
