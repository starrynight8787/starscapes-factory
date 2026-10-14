// Adds the Factory Floor to your site's App.jsx. Safe to run more than once.
//   - It makes a backup first: src/App.jsx.before-factory-floor
//   - It only adds two lines: an import, and one route just before </Routes>
//   - If it does not recognise your App.jsx it changes nothing and tells you
import fs from 'node:fs'

const FILE = 'src/App.jsx'
const IMPORT_LINE = "import FactoryFloorRoutes from './factoryfloor/FactoryFloorRoutes'"
const ROUTE_LINE = '<Route path="/factory-floor/*" element={<FactoryFloorRoutes />} />'

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}

if (!fs.existsSync(FILE)) stop(`I can't find ${FILE}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and try again.`)
const original = fs.readFileSync(FILE, 'utf8')

if (original.includes('FactoryFloorRoutes')) {
  console.log('\nThe Factory Floor is already added to App.jsx. Nothing to do.\n')
  process.exit(0)
}
if (!original.includes('</Routes>')) stop("I couldn't find the place where the pages are listed (</Routes>) in App.jsx, so I haven't touched it. Send me the output of: cat src/App.jsx")

// find the last line of the last import statement
const lines = original.split('\n')
let lastImportEnd = -1
let inImport = false
lines.forEach((line, i) => {
  const t = line.trim()
  if (!inImport && /^import\b/.test(t)) inImport = true
  if (inImport && (/\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(t))) {
    lastImportEnd = i
    inImport = false
  }
})
if (lastImportEnd < 0) stop("I couldn't find the import lines at the top of App.jsx, so I haven't touched it. Send me the output of: cat src/App.jsx")

const routeCountBefore = (original.match(/<Route\b/g) || []).length

// 1) the import, after the last existing import
lines.splice(lastImportEnd + 1, 0, IMPORT_LINE)
let updated = lines.join('\n')

// 2) the route, just before the closing </Routes> (the last one, in case there is more than one)
const at = updated.lastIndexOf('</Routes>')
const lineStart = updated.lastIndexOf('\n', at) + 1
const indent = updated.slice(lineStart, at).match(/^\s*/)[0]
updated = updated.slice(0, lineStart) + `${indent}  ${ROUTE_LINE}\n` + updated.slice(lineStart)

// check our own work before saving anything
const routeCountAfter = (updated.match(/<Route\b/g) || []).length
if (routeCountAfter !== routeCountBefore + 1 || !updated.includes(IMPORT_LINE) || !updated.includes(ROUTE_LINE)) {
  stop('Something did not add up when I checked my own work, so I haven\'t saved anything. Send me the output of: cat src/App.jsx')
}

fs.writeFileSync(FILE + '.before-factory-floor', original)
fs.writeFileSync(FILE, updated)

console.log('\nDone. The Factory Floor is added.')
console.log('A backup of your old file is at src/App.jsx.before-factory-floor\n')
console.log('Pages your site now knows about:')
for (const m of updated.matchAll(/<Route[^>]*\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('\nCheck that every page you expect is in that list. If anything looks missing, tell me.\n')
