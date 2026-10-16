import RoomScene from '../rooms/RoomScene'
import useTitle from './useTitle'
import { buildScene, DESK } from './draftingData'

// The Drafting Desk's front page: a desk covered in papers, one for each area.
export default function DraftingDeskHome() {
  useTitle(DESK.name)
  return <RoomScene scene={buildScene()} />
}
