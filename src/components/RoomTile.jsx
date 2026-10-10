import { roomImages, roomImagesSmall } from '../data/roomImages'

// A room's picture as a rounded square. Uses the tighter crop at small sizes when there is one.
export default function RoomTile({ slug, size = 56 }) {
  const src = (size <= 64 && roomImagesSmall[slug]) || roomImages[slug]
  if (!src) return null
  return <img className="sf-tile" src={src} width={size} height={size} alt="" loading="lazy" />
}
