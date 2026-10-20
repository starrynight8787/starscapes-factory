// What a customer should know about the size and finish they have chosen, in plain words.
//
// Every fact here comes from Creative Hub: their reply to us of 16 October 2026, and their help pages on frames, production times
// and delivery times (updated 9 July 2026). If they change, change the numbers here, and the print page follows.

// Working days from the order to the parcel arriving: making it AND delivering it together, framed or unframed. Creative Hub's written reply of 20 October 2026 (to Gill's question
// whether the 6 to 10 working days covers framed prints): "The standard 6-10 working day SLA applies to both framed and unframed prints." (Their answer did not give separate figures for
// Europe, the US and Canada: ask again if it matters.) These were once added together as making days plus delivery days, which wrongly told customers 7 to 15 (or 11 to 20 framed).
export const JOURNEY_DAYS = [6, 10]
// Creative Hub's time for countries outside the list below (their help pages). The shop only sells to countries in the list.
export const REST_OF_WORLD_DAYS = 15
// The countries Creative Hub gives the standard 6 to 10 working days: the UK, the EU, Norway, Iceland, Liechtenstein, Switzerland,
// the United States and Canada. Anywhere else (Australia, New Zealand, the rest of the world) takes up to 15, so the shop must not
// say "6 to 10" for those. The test that checks the launch countries against this list is what stops that going wrong.
export const SHIPS_IN_6_TO_10 = new Set([
  'GB', 'US', 'CA', 'NO', 'IS', 'LI', 'CH',
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

// These framed sizes are glazed with 3 mm clear acrylic so they travel safely (centimetres, shorter side first). Every other size has float glass.
export const ACRYLIC_SIZES_CM = [[59.4, 84.1], [60, 80], [70, 100]]
const TOLERANCE_CM = 0.6

// "21x30cm", "60 × 80 cm", "A3 (29.7 × 42 cm)", "600 x 800 mm" -> [shorter, longer] in centimetres, or null if it cannot be read
export function parseSizeCm(label) {
  const text = String(label === null || label === undefined ? '' : label).toLowerCase()
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/)
  if (!m) return null
  let [a, b] = [m[1], m[2]].map((n) => Number(n.replace(',', '.')))
  if (!(a > 0 && b > 0)) return null
  if (/\bmm\b/.test(text)) {
    a /= 10
    b /= 10
  }
  return [Math.min(a, b), Math.max(a, b)]
}

// 'acrylic', 'glass', or null if the size cannot be read (in which case nothing is claimed about it)
export function glazingFor(label) {
  const dims = parseSizeCm(label)
  if (!dims) return /\bA1\b/i.test(String(label || '')) ? 'acrylic' : null
  const acrylic = ACRYLIC_SIZES_CM.some(([w, h]) => Math.abs(dims[0] - w) <= TOLERANCE_CM && Math.abs(dims[1] - h) <= TOLERANCE_CM)
  return acrylic ? 'acrylic' : 'glass'
}

// The lines to show for one size and finish
export function detailsFor(variant) {
  if (!variant) return []
  const framed = Boolean(variant.framed)
  const lines = []
  if (framed) {
    lines.push('Ready to hang: every frame comes with its hanging fixing.')
    lines.push('The size shown is the outside size of the frame.')
    const glazing = glazingFor(variant.size_label)
    if (glazing === 'acrylic') lines.push('Glazed with 3 mm clear acrylic, so it travels safely.')
    else if (glazing === 'glass') lines.push('Glazed with float glass.')
  }
  const [low, high] = JOURNEY_DAYS
  lines.push(`${framed ? 'Framed' : 'Printed'} to order and delivered to you in ${low} to ${high} working days.`)
  return lines
}
