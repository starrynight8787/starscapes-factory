// Everything the Art Loft needs to know that is not in the database.
// To change a collection's blurb or cover print, edit it here.
//
// The scene is drawn on a 1200 x 840 canvas (public/scenes/art-loft.svg). Every number below that says
// "frame" or "box" is a position on that canvas, in pixels: [x, y, width, height] (frames also have a tilt).

export const SCENE = { width: 1200, height: 840 }

export const ART_LOFT = {
  name: 'The Art Loft',
  tagline: 'Where colour meets imagination.',
  blurb:
    'A sunlit studio of creativity. Discover prints and artistic experiments, all inspired by life, imagination, and the joy of making.',
}

// The five canvases on the wall. "name" must match the collection name saved on each product.
// "cover" is the title of the print shown on the canvas. If it is not published yet, the first print in the collection is used.
export const COLLECTIONS = [
  {
    slug: 'calm-series',
    name: 'Calm Series',
    blurb: 'Quiet colour and soft light, for the moments you want to slow down.',
    cover: 'Neon Lights',
    frame: [50, 140, 170, 230, -2],
  },
  {
    slug: 'out-of-this-world',
    name: 'Out of this World',
    blurb: "Planets, stars and far-off places, in colour that doesn't belong on Earth.",
    cover: 'Behind the Curtain',
    frame: [255, 122, 230, 170, 1.5],
  },
  {
    slug: 'oceans-view',
    name: "Ocean's View",
    blurb: 'Sea, sand and the long horizon.',
    cover: 'Beaches',
    frame: [520, 140, 220, 170, -1.5],
  },
  {
    slug: 'dance-like-you-just-dont-care',
    name: "Dance Like You Just Don't Care",
    blurb: 'Tango, ballet and everything in between: movement, music and not a care in the world.',
    cover: 'Tango',
    frame: [775, 128, 150, 224, 2],
  },
  {
    slug: 'unique-one-of-a-kind',
    name: 'Unique One of a Kind',
    blurb: "Pieces that don't belong to a series, from a rainforest to a quilt.",
    cover: 'Quilting',
    frame: [960, 136, 190, 180, -1],
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
