import RoomScene from './RoomScene'
import useTitle from './useTitle'
import { ROOMS, buildRoomScene } from './roomsData'

// A room's front page: its illustrated scene, with a door to each area.
export default function RoomHome({ room }) {
  useTitle(ROOMS[room].name)
  return <RoomScene scene={buildRoomScene(room)} />
}
