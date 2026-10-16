// Adds the illustrated rooms to your site: the Idea Hatchery, the Leadership Lounge and Explorer's Bay. Safe to run more than once.
// It makes three small changes, all three or none:
//   1. src/App.jsx:                     adds a page for each room (one import, and one route for each room)
//   2. src/data/roomImages.js:          makes each room open its own page (one entry for each room in the list of rooms with their own page)
//   3. src/components/backTarget.js:    makes the Back link on a post come back to the room page it came from (one import and two lines)
// It makes a backup of each file it changes first (ending .before-rooms), and changes nothing else.
// If any of the files is not what it expects, it changes none of them and tells you what to send me.
import fs from 'node:fs'

const ROOM_SLUGS = ['idea-hatchery', 'leadership-lounge', 'explorers-bay']
const APP = 'src/App.jsx'
const ROOMS_FILE = 'src/data/roomImages.js'
const BACK = 'src/components/backTarget.js'
const NEEDED = ['src/rooms/RoomRoutes.jsx', 'src/rooms/roomsData.js', 'src/rooms/RoomScene.jsx']
const IMPORT_LINE = "import RoomRoutes from './rooms/RoomRoutes'"
const routeLine = (slug) => `<Route path="/${slug}/*" element={<RoomRoutes room="${slug}" />} />`

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}
const SEND = (file) => `Send me the output of: cat ${file}`

for (const f of [APP, ROOMS_FILE, BACK, ...NEEDED]) {
  if (!fs.existsSync(f)) stop(`I can't find ${f}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and that you unzipped the update first.`)
}
const appOriginal = fs.readFileSync(APP, 'utf8')
const roomsOriginal = fs.readFileSync(ROOMS_FILE, 'utf8')
const backOriginal = fs.readFileSync(BACK, 'utf8')
const nlOf = (text) => (text.includes('\r\n') ? '\r\n' : '\n')
const report = []
let app = appOriginal
let rooms = roomsOriginal
let back = backOriginal

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

// ---------- save, but only if all three were fine ----------
if (app === appOriginal && rooms === roomsOriginal && back === backOriginal) {
  console.log('\nThe rooms are already added. Nothing to do.\n')
  process.exit(0)
}
for (const [file, before, after] of [[APP, appOriginal, app], [ROOMS_FILE, roomsOriginal, rooms], [BACK, backOriginal, back]]) {
  if (after !== before) {
    fs.writeFileSync(file + '.before-rooms', before)
    fs.writeFileSync(file, after)
  }
}
console.log('\nDone.')
report.forEach((r) => console.log('  ' + r))
console.log('\nPages your site now knows about:')
for (const m of app.matchAll(/<Route\b[^\n]*?\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('')
