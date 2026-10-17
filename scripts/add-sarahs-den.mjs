// Adds Sarah Jr.'s Den to your site, the same careful way the other illustrated rooms were added. Safe to run more than once.
// It makes five small changes, all five or none:
//   1. src/App.jsx:                     adds a page for the Den (one route; the import it needs is already there)
//   2. src/data/roomImages.js:          makes the Den open its own page (one entry in the list of rooms with their own page)
//   3. src/components/backTarget.js:    makes the Back link on a post come back to the Den's page (adds the Den to the list of rooms it knows)
//   4. src/rooms/roomsData.js:           adds the Den's room (its name, its words, its four doors) at the end of the list of rooms
//   5. src/rooms/roomsGeometry.js:       adds the measurements of the Den's four doors
// Everything else in those files, including any wording you have already changed, is left exactly as it is.
// It makes a backup of each file it changes first (ending .before-den), and changes nothing else.
// If any of the files is not what it expects, it changes none of them and tells you what to send me.
import fs from 'node:fs'

const ROOM_SLUGS = ['sarah-jrs-den']
const APP = 'src/App.jsx'
const ROOMS_FILE = 'src/data/roomImages.js'
const BACK = 'src/components/backTarget.js'
const DATA = 'src/rooms/roomsData.js'
const GEO = 'src/rooms/roomsGeometry.js'
const NEEDED = ['src/rooms/RoomRoutes.jsx', 'src/rooms/RoomScene.jsx', 'public/scenes/sarah-jrs-den/base.svg']
const IMPORT_LINE = "import RoomRoutes from './rooms/RoomRoutes'"
const routeLine = (slug) => `<Route path="/${slug}/*" element={<RoomRoutes room="${slug}" />} />`

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}
const SEND = (file) => `Send me the output of: cat ${file}`

for (const f of [APP, ROOMS_FILE, BACK, DATA, GEO, ...NEEDED]) {
  if (!fs.existsSync(f)) stop(`I can't find ${f}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and that you unzipped the update first.`)
}
const appOriginal = fs.readFileSync(APP, 'utf8')
const roomsOriginal = fs.readFileSync(ROOMS_FILE, 'utf8')
const backOriginal = fs.readFileSync(BACK, 'utf8')
const dataOriginal = fs.readFileSync(DATA, 'utf8')
const geoOriginal = fs.readFileSync(GEO, 'utf8')
const nlOf = (text) => (text.includes('\r\n') ? '\r\n' : '\n')
const report = []
let app = appOriginal
let rooms = roomsOriginal
let back = backOriginal
let data = dataOriginal
let geo = geoOriginal

// ---------- 1. App.jsx ----------
function lastImportLine(lines) {
  let last = -1
  let inImport = false
  lines.forEach((line, i) => {
    const t = line.trim()
    if (!inImport && /^import\b/.test(t)) inImport = true
    if (inImport && (/\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(t))) {
      last = i
      inImport = false
    }
  })
  return last
}
const hasImport = /import\s+RoomRoutes\s+from/.test(app)
const hasRoute = (slug) => new RegExp(`path=["']/${slug}/\\*["']`).test(app)
const missingRoutes = ROOM_SLUGS.filter((s) => !hasRoute(s))
if (hasImport && missingRoutes.length === 0) {
  report.push('App.jsx: the room pages were already there')
} else {
  if (!app.includes('</Routes>')) stop(`I couldn't find the place where the pages are listed (</Routes>) in App.jsx. ${SEND(APP)}`)
  const nl = nlOf(app)
  const routesBefore = (app.match(/<Route\b/g) || []).length
  if (!hasImport) {
    const lines = app.split(/\r?\n/)
    const at = lastImportLine(lines)
    if (at < 0) stop(`I couldn't find the import lines at the top of App.jsx. ${SEND(APP)}`)
    lines.splice(at + 1, 0, IMPORT_LINE)
    app = lines.join(nl)
  }
  if (missingRoutes.length) {
    const at = app.lastIndexOf('</Routes>')
    const lineStart = app.lastIndexOf('\n', at) + 1
    // lay the new routes out like the one above them (tabs or spaces); if there is none, one step in from </Routes>
    const above = app.slice(0, lineStart).split(/\r?\n/).reverse().find((l) => /<Route\b/.test(l))
    const indent = above ? above.match(/^[ \t]*/)[0] : app.slice(lineStart, at).match(/^[ \t]*/)[0] + '  '
    app = app.slice(0, lineStart) + missingRoutes.map((s) => `${indent}${routeLine(s)}${nl}`).join('') + app.slice(lineStart)
  }
  const importsNow = (app.match(/import\s+RoomRoutes\s+from/g) || []).length
  const everyRouteOnce = ROOM_SLUGS.every((s) => (app.match(new RegExp(`path=["']/${s}/\\*["']`, 'g')) || []).length === 1)
  if ((app.match(/<Route\b/g) || []).length !== routesBefore + missingRoutes.length || importsNow !== 1 || !everyRouteOnce) {
    stop(`Something didn't add up when I checked my own work on App.jsx, so I haven't saved anything. ${SEND(APP)}`)
  }
  report.push(`App.jsx: added the pages for ${missingRoutes.length ? missingRoutes.join(', ') : 'the rooms'}`)
}

// ---------- 2. roomImages.js: the list of rooms that have their own page ----------
const ownPage = rooms.match(/const OWN_PAGE\s*=\s*(\{[^}]*\})/)
if (!ownPage) stop(`I couldn't find the list of rooms with their own page (OWN_PAGE) in roomImages.js. ${SEND(ROOMS_FILE)}`)
const readObject = (text) => {
  try {
    return new Function(`return (${text})`)()
  } catch (e) {
    return null
  }
}
const ownBefore = readObject(ownPage[1])
if (!ownBefore || typeof ownBefore !== 'object') stop(`The list of rooms with their own page in roomImages.js is not written the way I expected. ${SEND(ROOMS_FILE)}`)
for (const slug of ROOM_SLUGS) {
  if (Object.prototype.hasOwnProperty.call(ownBefore, slug) && ownBefore[slug] !== `/${slug}`) {
    stop(`roomImages.js already sends ${slug} somewhere else (${ownBefore[slug]}), so I haven't touched it. ${SEND(ROOMS_FILE)}`)
  }
}
const missingRooms = ROOM_SLUGS.filter((s) => !Object.prototype.hasOwnProperty.call(ownBefore, s))
if (missingRooms.length === 0) {
  report.push('roomImages.js: the rooms already open their own pages')
} else {
  const body = ownPage[1]
  let updatedBody
  if (/\n/.test(body)) {
    // written over several lines: add a line for each room, with the same indent as the last entry
    const lines = body.split(/\r?\n/)
    const lastEntry = [...lines.keys()].reverse().find((i) => /\S/.test(lines[i]) && !/^\s*\}\s*$/.test(lines[i]))
    const indent = lines[lastEntry].match(/^[ \t]*/)[0]
    lines[lastEntry] = lines[lastEntry].replace(/,?\s*$/, ',')
    lines.splice(lastEntry + 1, 0, ...missingRooms.map((s) => `${indent}'${s}': '/${s}',`))
    updatedBody = lines.join(nlOf(rooms))
  } else {
    updatedBody = body.replace(/\s*,?\s*\}$/, missingRooms.map((s) => `, '${s}': '/${s}'`).join('') + ' }')
  }
  rooms = rooms.replace(body, updatedBody)
  const after = readObject(rooms.match(/const OWN_PAGE\s*=\s*(\{[^}]*\})/)[1])
  const expected = { ...ownBefore, ...Object.fromEntries(missingRooms.map((s) => [s, `/${s}`])) }
  if (!after || JSON.stringify(Object.entries(after).sort()) !== JSON.stringify(Object.entries(expected).sort())) {
    stop(`Something didn't add up when I checked my own work on roomImages.js, so I haven't saved anything. ${SEND(ROOMS_FILE)}`)
  }
  report.push(`roomImages.js: ${missingRooms.join(', ')} now open their own pages`)
}

// ---------- 3. backTarget.js: where the Back link on a post goes ----------
const BACK_IMPORT = "import { backLabel } from '../rooms/roomsData'"
const RULE_START = /const ownRoom = pathname\.match\(\/\^\\\/\(([a-z0-9|-]+)\)/
const ruleNow = back.match(RULE_START)
if (ruleNow) {
  const known = ruleNow[1].split('|')
  const toAdd = ROOM_SLUGS.filter((s) => !known.includes(s))
  if (toAdd.length === 0 && back.includes(BACK_IMPORT)) {
    report.push('backTarget.js: the Back link already knows about the rooms')
  } else {
    if (toAdd.length) back = back.replace(ruleNow[0], ruleNow[0].replace(`(${ruleNow[1]})`, `(${[...known, ...toAdd].join('|')})`))
    if (!back.includes(BACK_IMPORT)) {
      const lines = back.split(/\r?\n/)
      const at = lastImportLine(lines)
      if (at < 0) stop(`I couldn't find the import lines at the top of backTarget.js. ${SEND(BACK)}`)
      lines.splice(at + 1, 0, BACK_IMPORT)
      back = lines.join(nlOf(back))
    }
    const again = back.match(RULE_START)
    if (!again || !ROOM_SLUGS.every((s) => again[1].split('|').includes(s)) || (back.match(/import \{ backLabel \}/g) || []).length !== 1) {
      stop(`Something didn't add up when I checked my own work on backTarget.js, so I haven't saved anything. ${SEND(BACK)}`)
    }
    report.push(`backTarget.js: the Back link now also knows about ${toAdd.length ? toAdd.join(', ') : 'the rooms'}`)
  }
} else {
  const lines = back.split(/\r?\n/)
  const anchors = lines.map((l, i) => (/pathname\.startsWith\(['"]\/art-loft\/['"]\)/.test(l) ? i : -1)).filter((i) => i >= 0)
  if (anchors.length !== 1) stop(`I couldn't find the line in backTarget.js that I add the rooms beside (I found it ${anchors.length} times). ${SEND(BACK)}`)
  const importAt = lastImportLine(lines)
  if (importAt < 0) stop(`I couldn't find the import lines at the top of backTarget.js. ${SEND(BACK)}`)
  const indent = lines[anchors[0]].match(/^[ \t]*/)[0]
  const added = [
    `${indent}const ownRoom = pathname.match(/^\\/(${ROOM_SLUGS.join('|')})(?:\\/([^/]+))?\\/?$/)`,
    `${indent}if (ownRoom) return { to: path, label: backLabel(ownRoom[1], ownRoom[2]) }`,
  ]
  lines.splice(anchors[0] + 1, 0, ...added) // the lower line first, so the import line's place is still right
  lines.splice(importAt + 1, 0, BACK_IMPORT)
  back = lines.join(nlOf(back))
  const mine = new Set([...added, BACK_IMPORT])
  const withoutMine = back.split(/\r?\n/).filter((l) => !mine.has(l)).join(nlOf(back))
  if (withoutMine !== backOriginal) {
    stop(`Something didn't add up when I checked my own work on backTarget.js, so I haven't saved anything. ${SEND(BACK)}`)
  }
  report.push('backTarget.js: the Back link on a post now returns to the room page it came from')
}

// ---------- 4. roomsData.js: the Den's room, added at the end of the list of rooms ----------
const DEN_ROOM = "  'sarah-jrs-den': {\n    slug: 'sarah-jrs-den',\n    name: \"Sarah Jr.'s Den\",\n    tagline: \"Kids' travel adventures, told through a curious little bear and her pet dinosaur, Daryl.\",\n    blurb: 'Pick a door.',\n    channel: 'sarah-jrs-den',\n    items: [\n      { ...piece('sarah-jrs-den', 'blog'), id: 'blog', name: 'Blog', blurb: 'Little notes from the Den.', kind: 'locked', lock: 'opening soon', labelAt: [155, 726] },\n      { ...piece('sarah-jrs-den', 'daryls-adventures'), id: 'daryls-adventures', name: \"Daryl's Adventures\", blurb: \"Daryl's world: being developed.\", kind: 'locked', lock: 'opening soon', labelAt: [564, 716] },\n      { ...piece('sarah-jrs-den', 'books'), id: 'books', name: 'Books', blurb: 'Stories to read together.', kind: 'locked', lock: 'opening soon', labelAt: [935, 672] },\n      { ...piece('sarah-jrs-den', 'youtube-series'), id: 'youtube-series', name: 'YouTube Series', blurb: 'Little adventures to watch.', kind: 'locked', lock: 'opening soon', labelAt: [1085, 750] },\n    ],\n    areas: {},\n  },\n"
const DEN_GEOMETRY = "  'sarah-jrs-den': {\n    'blog': { cx: 162.5, cy: 453, w: 251, h: 510 },\n    'daryls-adventures': { cx: 579.5, cy: 569, w: 543, h: 354 },\n    'books': { cx: 927, cy: 475, w: 202, h: 390 },\n    'youtube-series': { cx: 1101, cy: 625, w: 144, h: 150 },\n  },\n"
const inNl = (text, nl) => (nl === '\n' ? text : text.replace(/\n/g, nl))
if (/'sarah-jrs-den'\s*:\s*\{/.test(data)) {
  report.push('roomsData.js: the Den was already there')
} else {
  const slugsAt = data.indexOf('export const ROOM_SLUGS')
  if (slugsAt < 0) stop(`I couldn't find where the list of rooms ends (export const ROOM_SLUGS) in roomsData.js. ${SEND(DATA)}`)
  const close = data.lastIndexOf('}', slugsAt)
  if (close < 0 || !/^\s*$/.test(data.slice(data.lastIndexOf('\n', close) + 1, close))) stop(`The end of the list of rooms in roomsData.js is not written the way I expected. ${SEND(DATA)}`)
  const lineStart = data.lastIndexOf('\n', close) + 1
  const nl = nlOf(data)
  data = data.slice(0, lineStart) + inNl(DEN_ROOM, nl) + data.slice(lineStart)
  if ((data.match(/'sarah-jrs-den'\s*:\s*\{/g) || []).length !== 1 || data.replace(inNl(DEN_ROOM, nl), '') !== dataOriginal) {
    stop(`Something didn't add up when I checked my own work on roomsData.js, so I haven't saved anything. ${SEND(DATA)}`)
  }
  report.push("roomsData.js: added Sarah Jr.'s Den and its four doors")
}

// ---------- 5. roomsGeometry.js: where the five doors sit ----------
if (/'sarah-jrs-den'\s*:\s*\{/.test(geo)) {
  report.push('roomsGeometry.js: the Den was already there')
} else {
  const close = geo.lastIndexOf('}')
  if (close < 0 || !/export const GEOMETRY/.test(geo)) stop(`I couldn't find the list of measurements (GEOMETRY) in roomsGeometry.js. ${SEND(GEO)}`)
  const lineStart = geo.lastIndexOf('\n', close) + 1
  if (!/^\s*$/.test(geo.slice(lineStart, close))) stop(`The end of the list of measurements in roomsGeometry.js is not written the way I expected. ${SEND(GEO)}`)
  const nl = nlOf(geo)
  geo = geo.slice(0, lineStart) + inNl(DEN_GEOMETRY, nl) + geo.slice(lineStart)
  if ((geo.match(/'sarah-jrs-den'\s*:\s*\{/g) || []).length !== 1 || geo.replace(inNl(DEN_GEOMETRY, nl), '') !== geoOriginal) {
    stop(`Something didn't add up when I checked my own work on roomsGeometry.js, so I haven't saved anything. ${SEND(GEO)}`)
  }
  report.push('roomsGeometry.js: added the measurements of the Den\'s doors')
}

// ---------- save, but only if all five were fine ----------
if (app === appOriginal && rooms === roomsOriginal && back === backOriginal && data === dataOriginal && geo === geoOriginal) {
  console.log('\nThe Den is already added. Nothing to do.\n')
  process.exit(0)
}
for (const [file, before, after] of [[APP, appOriginal, app], [ROOMS_FILE, roomsOriginal, rooms], [BACK, backOriginal, back], [DATA, dataOriginal, data], [GEO, geoOriginal, geo]]) {
  if (after !== before) {
    fs.writeFileSync(file + '.before-den', before)
    fs.writeFileSync(file, after)
  }
}
console.log('\nDone.')
report.forEach((r) => console.log('  ' + r))
console.log('\nPages your site now knows about:')
for (const m of app.matchAll(/<Route\b[^\n]*?\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('')
