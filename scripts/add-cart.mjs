// Turns the Shop link into a Cart. Safe to run more than once.
//   - src/App.jsx: adds the /cart page (one import, one route)
//   - src/components/Navbar.jsx: swaps the two "Shop" links (desktop and phone menu) for a "Cart" link with a count
//   - It makes a backup of each file first (ending .before-cart) and changes nothing else
import fs from 'node:fs'

const APP = 'src/App.jsx'
const NAV = 'src/components/Navbar.jsx'

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}

for (const f of [APP, NAV, 'src/cart/CartPage.jsx', 'src/cart/CartNavLink.jsx']) {
  if (!fs.existsSync(f)) stop(`I can't find ${f}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and that you unzipped the update first.`)
}

// the last line of the last import statement in a file
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
function withImport(source, importLine) {
  const lines = source.split('\n')
  const at = lastImportLine(lines)
  if (at < 0) return null
  lines.splice(at + 1, 0, importLine)
  return lines.join('\n')
}

const report = []

// ---------- App.jsx ----------
const appOriginal = fs.readFileSync(APP, 'utf8')
let app = appOriginal
if (!app.includes('</Routes>')) stop("I couldn't find where the pages are listed (</Routes>) in App.jsx. Send me the output of: cat src/App.jsx")
if (/path=["']\/cart["']/.test(app) && /import\s+CartPage\s+from/.test(app)) {
  report.push('App.jsx: the cart page was already there')
} else {
  const routesBefore = (app.match(/<Route\b/g) || []).length
  if (!/import\s+CartPage\s+from/.test(app)) {
    const next = withImport(app, "import CartPage from './cart/CartPage'")
    if (!next) stop("I couldn't find the import lines at the top of App.jsx. Send me the output of: cat src/App.jsx")
    app = next
  }
  if (!/path=["']\/cart["']/.test(app)) {
    const at = app.lastIndexOf('</Routes>')
    const lineStart = app.lastIndexOf('\n', at) + 1
    const indent = app.slice(lineStart, at).match(/^\s*/)[0]
    app = app.slice(0, lineStart) + `${indent}  <Route path="/cart" element={<CartPage />} />\n` + app.slice(lineStart)
  }
  const routesAfter = (app.match(/<Route\b/g) || []).length
  if (routesAfter !== routesBefore + (/path=["']\/cart["']/.test(appOriginal) ? 0 : 1)) stop("Something didn't add up when I checked my own work on App.jsx, so I haven't saved anything. Send me the output of: cat src/App.jsx")
  report.push('App.jsx: added the /cart page')
}

// ---------- Navbar.jsx ----------
const navOriginal = fs.readFileSync(NAV, 'utf8')
let nav = navOriginal
if (nav.includes('CartNavLink')) {
  report.push('Navbar.jsx: the Cart link was already there')
} else {
  const shop = /<Link\s+to=["']\/products["']\s+className=["']([^"']*)["']([^>]*)>\s*Shop\s*<\/Link>/g
  const found = [...nav.matchAll(shop)].length
  if (found === 0) stop("I couldn't find the Shop link in Navbar.jsx, so I haven't touched it. Send me the output of: cat src/components/Navbar.jsx")
  if (found !== 2) stop(`I expected to find the Shop link twice (desktop and phone menu) but found it ${found} times, so I haven't touched Navbar.jsx. Send me the output of: cat src/components/Navbar.jsx`)
  nav = nav.replace(shop, (m, cls, rest) => `<CartNavLink className="${cls}"${rest.replace(/\s+$/, '')} />`)
  const next = withImport(nav, "import CartNavLink from '../cart/CartNavLink'")
  if (!next) stop("I couldn't find the import lines at the top of Navbar.jsx. Send me the output of: cat src/components/Navbar.jsx")
  nav = next
  if ((nav.match(/<CartNavLink\b/g) || []).length !== 2 || /<Link[^>]*to=["']\/products["']/.test(nav)) stop("Something didn't add up when I checked my own work on Navbar.jsx, so I haven't saved anything. Send me the output of: cat src/components/Navbar.jsx")
  report.push('Navbar.jsx: Shop is now Cart, in both menus')
}

if (app === appOriginal && nav === navOriginal) {
  console.log('\nEverything is already in place. Nothing to do.\n')
  process.exit(0)
}
if (app !== appOriginal) {
  fs.writeFileSync(APP + '.before-cart', appOriginal)
  fs.writeFileSync(APP, app)
}
if (nav !== navOriginal) {
  fs.writeFileSync(NAV + '.before-cart', navOriginal)
  fs.writeFileSync(NAV, nav)
}
console.log('\nDone.')
report.forEach((r) => console.log('  ' + r))
console.log('\nPages your site now knows about:')
for (const m of app.matchAll(/<Route[^>]*\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('')
