// Where each room's picture lives. The files are in the /public/rooms folder.
// To change a picture: put the new file in public/rooms and update its path here.
export const roomImages = {
  'drafting-desk': '/rooms/drafting-desk.png',
  'sarah-jrs-den': '/rooms/sarah-jrs-den.png',
  'art-loft': '/rooms/art-loft.png',
  'explorers-bay': '/rooms/explorers-bay.svg',
  'factory-floor': '/rooms/factory-floor.svg',
  'leadership-lounge': '/rooms/leadership-lounge.png',
  'idea-hatchery': '/rooms/idea-hatchery.png',
  'knowledge-nook': '/rooms/knowledge-nook.svg',
}

// Not needed now that every picture is cropped to fill its square.
export const roomImagesSmall = {}

// The page each room opens. The Art Loft opens the shop.
export function roomPath(slug) {
  return slug === 'art-loft' ? '/products' : `/channel/${slug}`
}
