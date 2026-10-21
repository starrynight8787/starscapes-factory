// Everything the Art Loft needs to know that is not in the database.
// To change a collection's blurb or cover print, edit it here.
//
// The scene is drawn on a 1200 x 840 canvas (public/scenes/art-loft.svg). Every number below that says
// "box" is a position on that canvas, in pixels: [x, y, width, height]. The five canvases on the wall are different:
// each frame is drawn to fit its own cover picture (see hangFrames below), so they have no fixed box.

export const SCENE = { width: 1200, height: 840 }

// How the five frames hang. Every picture is given about the same AREA, so a panorama and a tall painting have the same visual weight
// and neither looks smaller. Frames are centred on one line along the wall and spaced evenly, whatever their widths.
export const WALL = {
  centreY: 250,         // the middle of every frame sits on this line
  maxW: 280,            // the widest a frame may be
  maxH: 230,            // the tallest a frame may be
  area: 31000,          // the picture area every frame aims for, in scene pixels squared
  mat: 14,              // the border between the frame and the picture
  wire: 42,             // how far the hook sits above the frame
  margin: 24,           // the space kept clear at each end of the wall
  minGap: 20,           // the least space between two frames
  maxGap: 60,           // the most space between two frames, so a few narrow frames stay together in the middle
  defaultAspect: 4 / 3, // the shape used until a picture has loaded, and for a canvas with no picture yet
  minAspect: 0.55,      // a picture taller or wider than these is kept inside a frame of this shape, with a little mat showing
  maxAspect: 2.2,
}
export const PLAQUE_Y = WALL.centreY + WALL.maxH / 2 + 18   // the name plaques all hang on one line, below the tallest frame

const round2 = (n) => Math.round(n * 100) / 100

// The size of the picture area for a given shape (width divided by height): [width, height]. Same area for every shape, within the limits.
export function pictureSize(aspect) {
  const usable = Number.isFinite(aspect) && aspect > 0 ? aspect : WALL.defaultAspect
  const a = Math.min(WALL.maxAspect, Math.max(WALL.minAspect, usable))
  const maxW = WALL.maxW - 2 * WALL.mat
  const maxH = WALL.maxH - 2 * WALL.mat
  let w = Math.sqrt(WALL.area * a)
  let h = w / a
  if (w > maxW) { w = maxW; h = w / a }
  if (h > maxH) { h = maxH; w = h * a }
  return [w, h]
}

// All the frames at once, given the shape of each cover picture (undefined where not known yet): [[x, y, width, height], ...]
// Each frame matches its picture; they are spaced evenly along the wall, and shrunk together if they would not all fit.
export function hangFrames(aspects) {
  const m = WALL.mat
  const count = aspects.length
  let sizes = aspects.map(pictureSize)
  const sumPictureWidths = () => sizes.reduce((sum, [w]) => sum + w, 0)
  const room = SCENE.width - 2 * WALL.margin
  const fit = room - WALL.minGap * (count - 1)
  if (sumPictureWidths() + 2 * m * count > fit) {
    const scale = (fit - 2 * m * count) / sumPictureWidths()
    sizes = sizes.map(([w, h]) => [w * scale, h * scale])
  }
  const widths = sizes.reduce((sum, [w]) => sum + w + 2 * m, 0)
  const gap = Math.min(WALL.maxGap, (room - widths) / (count - 1))
  let x = (SCENE.width - (widths + gap * (count - 1))) / 2
  return sizes.map(([pw, ph]) => {
    const w = pw + 2 * m
    const h = ph + 2 * m
    const frame = [round2(x), round2(WALL.centreY - h / 2), round2(w), round2(h)]
    x += w + gap
    return frame
  })
}

// Original paintings are sold by email for now. Change this to true when checkout can sell them (shipping decided), and every
// original's page shows Add to cart instead of the email button.
export const ORIGINALS_ONLINE_CHECKOUT = false

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

// The five canvases on the wall. "tilt" is each one's slight lean, in degrees. Where each one hangs, and how big its frame is, is worked
// out from the shape of its cover picture (see hangFrames below): a tall picture gets a tall frame and a panorama a wide one.
// "name" must match the collection name saved on each product.
// "cover" is the title of the print shown on the canvas. If it is not published yet, the first print in the collection is used.
export const COLLECTIONS = [
  {
    slug: 'calm-series',
    name: 'Calm Series',
    blurb: 'Quiet colour and soft light, for the moments you want to slow down.',
    cover: 'Neon Lights',
    tilt: -2,
  },
  {
    slug: 'out-of-this-world',
    name: 'Out of this World',
    blurb: "Planets, stars and far-off places, in colour that doesn't belong on Earth.",
    cover: 'Behind the Curtain',
    tilt: 1.5,
  },
  {
    slug: 'oceans-view',
    name: "Ocean's View",
    blurb: 'Sea, sand and the long horizon.',
    cover: 'Beaches',
    tilt: -1.5,
  },
  {
    slug: 'dance-like-you-just-dont-care',
    name: "Dance Like You Just Don't Care",
    blurb: 'Tango, ballet and everything in between: movement, music and not a care in the world.',
    cover: 'Tango',
    tilt: 2,
  },
  {
    slug: 'unique-one-of-a-kind',
    name: 'Unique One of a Kind',
    blurb: "Pieces that don't belong to a series, from a rainforest to a quilt.",
    cover: 'Quilting',
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
    sub: 'One of a kind',
    kind: 'link',
    to: '/art-loft/originals',
    blurb: 'Original paintings, each one of a kind.',
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
  // whole pounds have no pence, anything else has two, and thousands are separated: £89, £149.50, £1,200
  const digits = Number.isInteger(v) ? 0 : 2
  return `£${v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
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
