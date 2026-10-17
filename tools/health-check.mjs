// Checks that the key files in your project are the current ones, and says which are not.
// Run it from the project folder at any time (especially after unpacking a zip):   node tools/health-check.mjs
// It only reads. It never changes anything.
import fs from 'node:fs'
import crypto from 'node:crypto'

const CHECKS = [
  // [what it checks, file, what must be in it, which update it came from]
  ['Room pages: Home link row', 'src/rooms/roomscene.css', /\.rs-home \{/, 'the Home link update'],
  ['Room pages: heading size settings', 'src/rooms/roomscene.css', /--rs-name:\s*0\.034/, 'the Explorer\'s Bay heading update'],
  ['Room pages: Drafting Desk and Nook layout', 'src/rooms/roomscene.css', /\.rs\[data-room='drafting-desk'\],\s*\.rs\[data-room='knowledge-nook'\]/, 'the Knowledge Nook update (the stylesheet repair)'],
  ['Room component: Home link', 'src/rooms/RoomScene.jsx', /HomeLink/, 'the Home link update'],
  ['Room component: knows which room it is', 'src/rooms/RoomScene.jsx', /data-room/, 'the room size and bench update'],
  ['Art Loft: Home link', 'src/artloft/ArtLoftScene.jsx', /HomeLink/, 'the Home link update (the add-home-links script)'],
  ['Factory Floor: Home link', 'src/factoryfloor/FactoryFloorHome.jsx', /HomeLink/, 'the Home link update (the add-home-links script)'],
  ['Menu: the new room icons', 'src/components/Navbar.jsx', /RoomIcon/, 'the room icons update (the add-room-icons script)'],
  ['App: the 404 page', 'src/App.jsx', /<Route path="\*" element=\{<NotFound \/>\} \/>/, 'the system pages update (the add-system-pages script)'],
  ['App: the error catcher', 'src/App.jsx', /<ErrorBoundary>/, 'the system pages update (the add-system-pages script)'],
  ['App: the loading page', 'src/App.jsx', /<PageLoading \/>/, 'the system pages update (the add-system-pages script)'],
  ['App: the Knowledge Nook page', 'src/App.jsx', /\/knowledge-nook\/\*/, 'the Knowledge Nook update (the add-knowledge-nook script)'],
  ['Room addresses: the Nook opens its own page', 'src/data/roomImages.js', /'knowledge-nook':\s*'\/knowledge-nook'/, 'the Knowledge Nook update (the add-knowledge-nook script)'],
  ['Room list: the Knowledge Nook', 'src/rooms/roomsData.js', /'knowledge-nook': \{/, 'the Knowledge Nook update (the add-knowledge-nook script)'],
  ['App: Sarah Jr.\'s Den page', 'src/App.jsx', /\/sarah-jrs-den\/\*/, 'the Den update (the add-sarahs-den script)'],
  ['Room addresses: the Den opens its own page', 'src/data/roomImages.js', /'sarah-jrs-den':\s*'\/sarah-jrs-den'/, 'the Den update (the add-sarahs-den script)'],
  ['Room list: Sarah Jr.\'s Den', 'src/rooms/roomsData.js', /'sarah-jrs-den': \{/, 'the Den update (the add-sarahs-den script)'],
  ['Den picture: the sitting room', 'public/scenes/sarah-jrs-den/base.svg', /viewBox="0 0 1200 840"/, 'the Den update'],
  ['Room measurements: Idea Hatchery bench order', 'src/rooms/roomsGeometry.js', /'stop-motion': \{ cx: 847/, 'the Idea Hatchery bench update'],
  ['Idea Hatchery picture: the new bench', 'public/scenes/idea-hatchery/base.svg', /data-bench/, 'the Idea Hatchery bench update'],
  ['Leadership Lounge picture: periwinkle couch', 'public/scenes/leadership-lounge/item-leading-from-the-middle.svg', /#DBE3FF/, 'the Leadership Lounge colour update'],
  ['Explorer\'s Bay picture: the moon moved', 'public/scenes/explorers-bay/base.svg', /data-moon/, 'the Explorer\'s Bay update'],
  ['Drafting Desk picture: the oak desk', 'public/scenes/drafting-desk/base.svg', /data-oak="surface"/, 'the Drafting Desk oak update'],
  ['Art Loft picture: yellow tape and red cone', 'public/scenes/art-loft.svg', /data-tape/, 'the Art Loft tape update'],
  ['Tape on the Idea Hatchery\'s closed beaker', 'public/scenes/idea-hatchery/item-come-study-with-me.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Tape on the Leadership Lounge\'s Free Ebook', 'public/scenes/leadership-lounge/item-free-ebook.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Tape on Explorer\'s Bay\'s Something New', 'public/scenes/explorers-bay/item-coming-soon.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Tape on the Drafting Desk\'s Come Write With Me', 'public/scenes/drafting-desk/sheet-come-write-with-me.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Knowledge Nook picture: the bookcase', 'public/scenes/knowledge-nook/base.svg', /viewBox="0 0 1200 840"/, 'the Knowledge Nook update'],
  ['Form messages: the failure box', 'src/components/FormMessages.jsx', /export function FailureMessage/, 'the form messages update'],
  ['Log in form: the new messages', 'src/pages/Login.jsx', /ErrorSummary/, 'the form messages update'],
  ['Sign up form: the new messages', 'src/pages/Signup.jsx', /SuccessMessage/, 'the form messages update'],
  ['Forgot password form: the new messages', 'src/pages/ForgotPassword.jsx', /FailureMessage/, 'the form messages update'],
  ['Reset password form: the new messages', 'src/pages/ResetPassword.jsx', /ErrorSummary/, 'the form messages update'],
  ['Form wording: what the forms say', 'src/pages/formRules.js', /loginMessage/, 'the form messages update'],
  ['Home floor plan: the new room icons', 'src/pages/ChannelDirectory.jsx', /ROOM_ICONS\[c\.slug\]/, 'the home icons update (the add-home-icons script)'],
  ['Admin button: in the menu', 'src/components/Navbar.jsx', /useIsOwner/, 'the admin update (the add-admin-button script)'],
  ['Admin console: the /admin page in the app', 'src/App.jsx', /<Route path="\/admin"/, 'the admin update (the add-admin-button script)'],
  ['Admin console: the page itself', 'src/admin/AdminConsole.jsx', /useOwnerCheck/, 'the admin update'],
  ['Admin console: the server\'s yes-or-no answer', 'api/is-owner.js', /requireOwner/, 'the admin update'],
  ['Contact details: the address and the reply time', 'src/data/contact.js', /imagine@starscapesfactory\.com[\s\S]*ACCESSIBILITY_REPLY_DAYS = '5'/, 'the contact details update'],
  ['Doors: the gate on the pages behind doors', 'src/rooms/RoomRoutes.jsx', /DoorGate/, 'the doors update'],
  ['Doors: scenes follow the switch', 'src/rooms/RoomHome.jsx', /applyDoors/, 'the doors update'],
  ['Doors: the room page can show a door\'s page', 'src/rooms/RoomAreaPage.jsx', /areas \|\| config\.areas/, 'the doors update'],
  ['Doors: the Open a door page in the app', 'src/App.jsx', /<Route path="\/admin\/doors"/, 'the doors update (the add-doors script)'],
  ['Doors: the Open a door tool', 'src/admin/OpenDoors.jsx', /saveDoor/, 'the doors update'],
  ['Doors: the console links to the tool', 'src/admin/adminTools.js', /to: '\/admin\/doors'/, 'the doors update'],
  ['Doors: the database file', 'sql/doors.sql', /create table if not exists public\.doors/, 'the doors update'],
  ['Room icon: Art Loft', 'public/icons/rooms/art-loft.png', null, 'the room icons update'],
  ['Room icon: Knowledge Nook', 'public/icons/rooms/knowledge-nook.png', null, 'the room icons update'],
]

const results = CHECKS.map(([what, file, pattern, from]) => {
  if (!fs.existsSync(file)) return { what, ok: false, why: `${file} is missing`, from }
  if (!pattern) return { what, ok: true }
  const ok = pattern.test(fs.readFileSync(file, 'utf8'))
  return { what, ok, why: ok ? '' : `${file} is an older copy`, from }
})
// Every picture is checked against the exact current copy (a list of fingerprints in tools/art-manifest.json). A picture is never edited by hand,
// so any difference means an older copy has been put back.
const manifestFile = 'tools/art-manifest.json'
let pictureCount = 0
if (fs.existsSync(manifestFile)) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  for (const [file, fingerprint] of Object.entries(manifest)) {
    pictureCount += 1
    if (!fs.existsSync(file)) {
      results.push({ what: `Picture: ${file}`, ok: false, why: 'is missing', from: 'the pictures zip (starscapes-art-current-17oct.zip)' })
      continue
    }
    const now = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16)
    if (now !== fingerprint) results.push({ what: `Picture: ${file}`, ok: false, why: 'is not the current version', from: 'the pictures zip (starscapes-art-current-17oct.zip)' })
  }
  if (results.filter((r) => r.what.startsWith('Picture:')).length === 0) results.push({ what: `Pictures: all ${pictureCount} match the current versions`, ok: true })
}
const bad = results.filter((r) => !r.ok)
console.log('')
for (const r of results) console.log(`  ${r.ok ? 'ok     ' : 'PROBLEM'}  ${r.what}`)
console.log('')
if (bad.length === 0) {
  console.log(`All ${results.length} checks passed: your key files are the current ones.\n`)
} else {
  console.log(`${bad.length} of ${results.length} checks need attention:`)
  for (const r of bad) console.log(`  - ${r.what}: ${r.why}. It comes from ${r.from}.`)
  console.log('\nPaste this whole list to me and I will tell you exactly which zip to unpack again, and in which order.\n')
  process.exit(1)
}
