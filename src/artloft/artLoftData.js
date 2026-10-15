// Everything the Art Loft needs to know that is not in the database.
// To change a collection's blurb or cover print, edit it here.
//
// The scene is drawn on a 1200 x 840 canvas (public/scenes/art-loft.svg). Every number below that says
// "box" is a position on that canvas, in pixels: [x, y, width, height]. The five canvases on the wall are different:
// each frame is drawn to fit its own cover picture (see frameFor below), so they have no fixed box.

export const SCENE = { width: 1200, height: 840 }

// How the five frames hang. Every frame is centred on the same line along the wall, and its picture is scaled to be as big as
// it can be inside the biggest box a frame may fill, so every picture keeps its true shape and none is cropped.
export const WALL = {
  centreY: 250,        // the middle of every frame sits on this line
  maxW: 205,           // the widest a frame may be
  maxH: 230,           // the tallest a frame may be
  mat: 14,             // the border between the frame and the picture
  wire: 42,            // how far the hook sits above the frame
  defaultAspect: 4 / 3, // the shape used until a picture has loaded, and for a canvas with no picture yet
  minAspect: 0.55,     // a picture taller or wider than these is kept inside a frame of this shape, with a little mat showing
  maxAspect: 2.2,
}
export const PLAQUE_Y = WALL.centreY + WALL.maxH / 2 + 18   // the name plaques all hang on one line, below the tallest frame

const round2 = (n) => Math.round(n * 100) / 100

// The frame for a picture: [x, y, width, height] on the scene, centred on centreX. "aspect" is the picture's width divided by its height.
export function frameFor(centreX, aspect) {
  const usable = Number.isFinite(aspect) && aspect > 0 ? aspect : WALL.defaultAspect
  const a = Math.min(WALL.maxAspect, Math.max(WALL.minAspect, usable))
  const boxW = WALL.maxW - 2 * WALL.mat
  const boxH = WALL.maxH - 2 * WALL.mat
  const pictureW = Math.min(boxW, boxH * a)
  const pictureH = pictureW / a
  const w = pictureW + 2 * WALL.mat
  const h = pictureH + 2 * WALL.mat
  return [round2(centreX - w / 2), round2(WALL.centreY - h / 2), round2(w), round2(h)]
}

// A five-pointed star as a drawing path, centred on (cx, cy)
export function starPath(cx, cy, outer = 18, inner = 7.9) {
  const pts = []
  for (let i = 0; i < 10; i += 1) {
    const angle = ((-90 + i * 36) * Math.PI) / 180
    const radius = i % 2 === 0 ? outer : inner
    pts.push(`${round2(cx + radius * Math.cos(angle))} ${round2(cy + radius * Math.sin(angle))}`)
  }
  return `M${pts.join(' L')} Z`
}

export const ART_LOFT = {
  name: 'The Art Loft',
  tagline: 'Where colour meets imagination.',
  blurb:
    'A sunlit studio of creativity. Discover prints and artistic experiments, all inspired by life, imagination, and the joy of making.',
}

// The five canvases on the wall. "centre" is where each one hangs along the wall and "tilt" is its slight lean, in degrees.
// The frame itself is drawn to the shape of its cover picture, so a tall picture gets a tall frame and a panorama a wide one.
// "name" must match the collection name saved on each product.
// "cover" is the title of the print shown on the canvas. If it is not published yet, the first print in the collection is used.
export const COLLECTIONS = [
  {
    slug: 'calm-series',
    name: 'Calm Series',
    blurb: 'Quiet colour and soft light, for the moments you want to slow down.',
    cover: 'Neon Lights',
    centre: 130,
    tilt: -2,
  },
  {
    slug: 'out-of-this-world',
    name: 'Out of this World',
    blurb: "Planets, stars and far-off places, in colour that doesn't belong on Earth.",
    cover: 'Behind the Curtain',
    centre: 365,
    tilt: 1.5,
  },
  {
    slug: 'oceans-view',
    name: "Ocean's View",
    blurb: 'Sea, sand and the long horizon.',
    cover: 'Beaches',
    centre: 600,
    tilt: -1.5,
  },
  {
    slug: 'dance-like-you-just-dont-care',
    name: "Dance Like You Just Don't Care",
    blurb: 'Tango, ballet and everything in between: movement, music and not a care in the world.',
    cover: 'Tango',
    centre: 835,
    tilt: 2,
  },
  {
    slug: 'unique-one-of-a-kind',
    name: 'Unique One of a Kind',
    blurb: "Pieces that don't belong to a series, from a rainforest to a quilt.",
    cover: 'Quilting',
    centre: 1070,
    tilt: -1,
  },
]

// The other ways to browse. kind: 'link' opens a page here, 'soon' is under construction, 'external' opens another site in a new tab.
// "sub" is the small line shown under each object's name.
export const UNDER_CONSTRUCTION = 'Under construction'

export const TYPES = [
  {
    id: 'originals',
    name: 'Originals',
    sub: UNDER_CONSTRUCTION,
    kind: 'soon',
    blurb: 'Original artworks are on their way.',
    box: [62, 462, 232, 254],
  },
  {
    id: 'prints',
    name: 'Digital Prints',
    sub: 'Printed to order',
    kind: 'link',
    to: '/art-loft/prints',
    blurb: 'Fine art prints, made to order and posted to you.',
    box: [336, 432, 170, 284],
  },
  {
    id: 'downloads',
    name: 'Digital Downloads',
    sub: UNDER_CONSTRUCTION,
    kind: 'soon',
    blurb: 'Digital downloads are on their way.',
    box: [596, 486, 212, 230],
  },
  {
    id: 'redbubble',
    name: 'Redbubble',
    sub: 'Opens in a new tab',
    kind: 'external',
    href: 'https://www.redbubble.com/people/gillbennet87/shop',
    blurb: 'Prints on everyday things, from my Redbubble shop. Opens in a new tab.',
    box: [908, 440, 224, 276],
  },
]

// Facts shown under the Add to cart button on every print. Every line must be true of EVERY print, so check each one before you change it.
export const PRINT_FACTS = [
  'Made to order, and posted straight to you from the print studio in plain, unbranded packaging.',
  'Printed on Hahnemühle Photo Rag, a cotton fine art paper.',
  'Delivery cost is shown at checkout, which opens soon.',
]

export function collectionBySlug(slug) {
  return COLLECTIONS.find((c) => c.slug === slug) || null
}

// pixel position on the scene -> a percentage, so the clickable areas stay on top of the drawing at any size
export const pct = (value, total) => `${((value / total) * 100).toFixed(3)}%`

export function formatPrice(n) {
  if (n === null || n === undefined || n === '') return ''
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return `£${Number.isInteger(v) ? v : v.toFixed(2)}`
}

// "21x30cm" -> "21 × 30 cm"
export function formatSize(label) {
  return String(label || '')
    .replace(/\s*x\s*/i, ' × ')
    .replace(/\s*cm$/i, ' cm')
    .trim()
}

export function firstImage(print) {
  return Array.isArray(print && print.images) && print.images.length ? print.images[0] : null
}

export function printsIn(collectionName, prints) {
  return prints.filter((p) => p.collection === collectionName)
}

// The picture for a print's card in a grid: the framed view of its smallest size if Creative Hub gave one,
// otherwise any size's picture, otherwise the plain artwork.
export function cardPicture(print) {
  const variants = Array.isArray(print && print.product_variants) ? print.product_variants.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) : []
  const framed = variants.find((v) => v.framed && v.image_url)
  const any = variants.find((v) => v.image_url)
  return (framed && framed.image_url) || (any && any.image_url) || firstImage(print)
}

// the picture to show on a canvas: the chosen cover if it is available, otherwise the first print with a picture
export function coverFor(collection, prints) {
  const mine = printsIn(collection.name, prints)
  const wanted = mine.find((p) => String(p.title || '').trim().toLowerCase() === collection.cover.toLowerCase() && firstImage(p))
  const chosen = wanted || mine.find((p) => firstImage(p))
  return chosen ? firstImage(chosen) : null
}
