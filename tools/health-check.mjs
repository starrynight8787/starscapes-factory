// Checks that the key files in your project are the current ones, and says which are not.
// Run it from the project folder at any time (especially after unpacking a zip):   node tools/health-check.mjs
// It only reads. It never changes anything.
import fs from 'node:fs'

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
  ['Room icon: Art Loft', 'public/icons/rooms/art-loft.png', null, 'the room icons update'],
  ['Room icon: Knowledge Nook', 'public/icons/rooms/knowledge-nook.png', null, 'the room icons update'],
]

const results = CHECKS.map(([what, file, pattern, from]) => {
  if (!fs.existsSync(file)) return { what, ok: false, why: `${file} is missing`, from }
  if (!pattern) return { what, ok: true }
  const ok = pattern.test(fs.readFileSync(file, 'utf8'))
  return { what, ok, why: ok ? '' : `${file} is an older copy`, from }
})
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
