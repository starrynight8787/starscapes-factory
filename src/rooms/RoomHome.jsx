import RoomScene from './RoomScene'
import useTitle from './useTitle'
import { ROOMS, buildRoomScene } from './roomsData'
import useDoors from '../doors/useDoors'
import { applyDoors } from '../doors/applyDoors'

// A room's front page: its illustrated scene, with a door to each area. A door the owner has opened shows as open, with a link to its page.
export default function RoomHome({ room }) {
  useTitle(ROOMS[room].name)
  const { isOpen } = useDoors()
  return <RoomScene scene={applyDoors(buildRoomScene(room), room, isOpen)} />
}
