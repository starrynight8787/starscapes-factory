import './roomicon.css'
import { ROOM_ICONS } from './roomIcons'

// A room's little picture, to sit beside its name in a list. The name is always written next to it, so the picture is only decoration
// (its alternative text is empty, and a screen reader says nothing for it). `size` is how big it is on screen, in pixels:
// 44 in the room menu, 64 on the home page's floor plan. A room with no picture draws nothing.
export default function RoomIcon({ room, size = 44, className = '' }) {
  const src = ROOM_ICONS[room]
  if (!src) return null
  return <img className={`sf-room-icon ${className}`.trim()} src={src} width={size} height={size} alt="" loading="lazy" decoding="async" />
}
