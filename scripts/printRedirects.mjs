// The permanent redirects from a print's old long address (/art-loft/prints/<id>) to its readable one (/art-loft/prints/<slug>), written into vercel.json.
// Plain functions with no dependencies, so the tool (tools/make-print-redirects.mjs) and the tests use exactly the same code.
//
// Why a list in vercel.json: only the prints that existed before readable addresses ever had a long address anyone could have linked to, and a list is the one way to
// give a true permanent redirect (the website sends it before any page loads) without adding another server function. Prints added later get a readable address from
// the start (sql/print-slugs.sql), and a visit to a long address is also sent to the readable one by the page itself.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PRINT_SOURCE = /^\/art-loft\/prints\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// rows: [{ id, slug }] -> the redirects, in a fixed order. Anything without a proper long id AND a proper readable address is left out.
export function printRedirects(rows) {
  const seen = new Set()
  const out = []
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String((row && row.id) || '').toLowerCase()
    const slug = String((row && row.slug) || '')
    if (!UUID.test(id) || !SLUG.test(slug) || slug.length > 80 || seen.has(id)) continue
    seen.add(id)
    out.push({ source: `/art-loft/prints/${id}`, destination: `/art-loft/prints/${slug}`, permanent: true })
  }
  return out.sort((a, b) => a.destination.localeCompare(b.destination) || a.source.localeCompare(b.source))
}

// Everything in vercel.json stays exactly as it is, except that the print redirects are replaced by the new list (any other redirect is kept)
export function applyRedirects(config, redirects) {
  const base = config && typeof config === 'object' ? config : {}
  const others = (Array.isArray(base.redirects) ? base.redirects : []).filter((r) => !(r && PRINT_SOURCE.test(String(r.source || ''))))
  const all = [...others, ...redirects]
  const next = { ...base }
  if (all.length) next.redirects = all
  else delete next.redirects
  return next
}

// What is wrong with a list of redirects, in plain words ([] when it is fine)
export function redirectProblems(list) {
  const problems = []
  const sources = new Set()
  const destinations = new Set((list || []).map((r) => r && r.destination))
  for (const r of list || []) {
    if (!r || !PRINT_SOURCE.test(String(r.source || ''))) { problems.push(`not a print's long address: ${r && r.source}`); continue }
    if (!/^\/art-loft\/prints\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(r.destination || '')) || UUID.test(String(r.destination).split('/').pop())) problems.push(`${r.source} does not go to a readable address (${r.destination})`)
    if (r.permanent !== true) problems.push(`${r.source} is not marked permanent`)
    if (sources.has(r.source)) problems.push(`${r.source} appears twice`)
    sources.add(r.source)
    if (destinations.has(r.source)) problems.push(`${r.source} is also somewhere else's destination (a chain of redirects)`)
  }
  return problems
}
