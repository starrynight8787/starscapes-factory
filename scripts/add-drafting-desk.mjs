// Adds the Drafting Desk to your site. Safe to run more than once. It makes three small changes, and all three or none:
//   1. src/App.jsx:                     adds the /drafting-desk page (one import, one route)
//   2. src/data/roomImages.js:          makes the Drafting Desk room open /drafting-desk (one entry in the list of rooms with their own page)
//   3. src/components/backTarget.js:    makes the Back link on a post come back to the Drafting Desk (three lines)
// It makes a backup of each file it changes first (ending .before-drafting-desk), and changes nothing else.
// If any of the files is not what it expects, it changes none of them and tells you what to send me.
import fs from 'node:fs'

const APP = 'src/App.jsx'
const ROOMS = 'src/data/roomImages.js'
const BACK = 'src/components/backTarget.js'
const NEEDED = ['src/draftingdesk/DraftingDeskRoutes.jsx', 'src/rooms/RoomScene.jsx']
const IMPORT_LINE = "import DraftingDeskRoutes from './draftingdesk/DraftingDeskRoutes'"
const ROUTE_LINE = '<Route path="/drafting-desk/*" element={<DraftingDeskRoutes />} />'

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}
const SEND = (file) => `Send me the output of: cat ${file}`

for (const f of [APP, ROOMS, BACK, ...NEEDED]) {
  if (!fs.existsSync(f)) stop(`I can't find ${f}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and that you unzipped the update first.`)
}
const appOriginal = fs.readFileSync(APP, 'utf8')
const roomsOriginal = fs.readFileSync(ROOMS, 'utf8')
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
const hasImport = /import\s+DraftingDeskRoutes\s+from/.test(app)
const hasRoute = /path=["']\/drafting-desk\/\*["']/.test(app)
if (hasImport && hasRoute) {
  report.push('App.jsx: the Drafting Desk page was already there')
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
  if (!hasRoute) {
    const at = app.lastIndexOf('</Routes>')
    const lineStart = app.lastIndexOf('\n', at) + 1
    const indent = app.slice(lineStart, at).match(/^[ \t]*/)[0]
    app = app.slice(0, lineStart) + `${indent}  ${ROUTE_LINE}${nl}` + app.slice(lineStart)
  }
  const routesAfter = (app.match(/<Route\b/g) || []).length
  const importsNow = (app.match(/import\s+DraftingDeskRoutes\s+from/g) || []).length
  const routesNow = (app.match(/path=["']\/drafting-desk\/\*["']/g) || []).length
  if (routesAfter !== routesBefore + (hasRoute ? 0 : 1) || importsNow !== 1 || routesNow !== 1) {
    stop(`Something didn't add up when I checked my own work on App.jsx, so I haven't saved anything. ${SEND(APP)}`)
  }
  report.push('App.jsx: added the /drafting-desk page')
}

// ---------- 2. roomImages.js: the list of rooms that have their own page ----------
const ownPage = rooms.match(/const OWN_PAGE\s*=\s*(\{[^}]*\})/)
if (!ownPage) stop(`I couldn't find the list of rooms with their own page (OWN_PAGE) in roomImages.js. ${SEND(ROOMS)}`)
const readObject = (text) => {
  try {
    return new Function(`return (${text})`)()
  } catch (e) {
    return null
  }
}
const ownBefore = readObject(ownPage[1])
if (!ownBefore || typeof ownBefore !== 'object') stop(`The list of rooms with their own page in roomImages.js is not written the way I expected. ${SEND(ROOMS)}`)
if (ownBefore['drafting-desk'] === '/drafting-desk') {
  report.push('roomImages.js: the Drafting Desk room already opens its own page')
} else if (Object.prototype.hasOwnProperty.call(ownBefore, 'drafting-desk')) {
  stop(`roomImages.js already sends the Drafting Desk somewhere else (${ownBefore['drafting-desk']}), so I haven't touched it. ${SEND(ROOMS)}`)
} else {
  const body = ownPage[1]
  let updatedBody
  if (/\n/.test(body)) {
    // written over several lines: add a line with the same indent as the last entry
    const lines = body.split(/\r?\n/)
    const lastEntry = [...lines.keys()].reverse().find((i) => /\S/.test(lines[i]) && !/^\s*\}\s*$/.test(lines[i]))
    const indent = lines[lastEntry].match(/^[ \t]*/)[0]
    lines[lastEntry] = lines[lastEntry].replace(/,?\s*$/, ',')
    lines.splice(lastEntry + 1, 0, `${indent}'drafting-desk': '/drafting-desk',`)
    updatedBody = lines.join(nlOf(rooms))
  } else {
    updatedBody = body.replace(/\s*,?\s*\}$/, ", 'drafting-desk': '/drafting-desk' }")
  }
  rooms = rooms.replace(body, updatedBody)
  const after = readObject(rooms.match(/const OWN_PAGE\s*=\s*(\{[^}]*\})/)[1])
  const expected = { ...ownBefore, 'drafting-desk': '/drafting-desk' }
  if (!after || JSON.stringify(Object.entries(after).sort()) !== JSON.stringify(Object.entries(expected).sort())) {
    stop(`Something didn't add up when I checked my own work on roomImages.js, so I haven't saved anything. ${SEND(ROOMS)}`)
  }
  report.push('roomImages.js: the Drafting Desk room now opens /drafting-desk')
}

// ---------- 3. backTarget.js: where the Back link on a post goes ----------
if (/\/drafting-desk/.test(back)) {
  report.push('backTarget.js: the Back link already knows about the Drafting Desk')
} else {
  const lines = back.split(/\r?\n/)
  const anchors = lines.map((l, i) => (/pathname\.startsWith\(['"]\/art-loft\/['"]\)/.test(l) ? i : -1)).filter((i) => i >= 0)
  if (anchors.length !== 1) stop(`I couldn't find the line in backTarget.js that I add the Drafting Desk beside (I found it ${anchors.length} times). ${SEND(BACK)}`)
  const indent = lines[anchors[0]].match(/^[ \t]*/)[0]
  const added = [
    `${indent}if (pathname === '/drafting-desk') return { to: path, label: 'The Drafting Desk' }`,
    `${indent}if (pathname === '/drafting-desk/archive-entries') return { to: path, label: 'Archive Entries' }`,
    `${indent}if (pathname === '/drafting-desk/authors-notebook') return { to: path, label: "Author's Notebook" }`,
  ]
  lines.splice(anchors[0] + 1, 0, ...added)
  back = lines.join(nlOf(back))
  const withoutMine = back.split(/\r?\n/).filter((l) => !added.includes(l)).join(nlOf(back))
  if (withoutMine !== backOriginal || (back.match(/\/drafting-desk/g) || []).length !== 3) {
    stop(`Something didn't add up when I checked my own work on backTarget.js, so I haven't saved anything. ${SEND(BACK)}`)
  }
  report.push('backTarget.js: the Back link on a post now returns to the Drafting Desk')
}

// ---------- save, but only if all three were fine ----------
if (app === appOriginal && rooms === roomsOriginal && back === backOriginal) {
  console.log('\nThe Drafting Desk is already added. Nothing to do.\n')
  process.exit(0)
}
for (const [file, before, after] of [[APP, appOriginal, app], [ROOMS, roomsOriginal, rooms], [BACK, backOriginal, back]]) {
  if (after !== before) {
    fs.writeFileSync(file + '.before-drafting-desk', before)
    fs.writeFileSync(file, after)
  }
}
console.log('\nDone.')
report.forEach((r) => console.log('  ' + r))
console.log('\nPages your site now knows about:')
for (const m of app.matchAll(/<Route[^>]*\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('')
