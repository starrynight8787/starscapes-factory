// Where each room's picture lives. The files are in the /public/rooms folder.
// To change a picture: put the new file in public/rooms and update its path here.
export const roomImages = {
  'drafting-desk': '/rooms/drafting-desk.png',
  'sarah-jrs-den': '/rooms/sarah-jrs-den.png',
  'art-loft': '/rooms/art-loft.png',
  'explorers-bay': '/rooms/explorers-bay.png',
  'factory-floor': '/rooms/factory-floor.png',
  'leadership-lounge': '/rooms/leadership-lounge.png',
  'idea-hatchery': '/rooms/idea-hatchery.png',
  'knowledge-nook': '/rooms/knowledge-nook.png',
}

// Not needed now that every picture is cropped to fill its square.
export const roomImagesSmall = {}

// The page each room opens. The Art Loft and the Factory Floor have their own scenes; every other room uses the general room page for now.
const OWN_PAGE = { 'art-loft': '/art-loft', 'factory-floor': '/factory-floor', 'drafting-desk': '/drafting-desk', 'idea-hatchery': '/idea-hatchery', 'leadership-lounge': '/leadership-lounge', 'explorers-bay': '/explorers-bay', 'knowledge-nook': '/knowledge-nook' }
export function roomPath(slug) {
  return OWN_PAGE[slug] || `/channel/${slug}`
}
