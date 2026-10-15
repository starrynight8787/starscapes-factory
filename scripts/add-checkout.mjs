// Adds the "thank you" page that Stripe sends shoppers back to. Safe to run more than once.
//   - src/App.jsx: one import and one route (/checkout/success)
//   - It makes a backup first (src/App.jsx.before-checkout) and changes nothing else
import fs from 'node:fs'

const APP = 'src/App.jsx'
function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}
for (const f of [APP, 'src/cart/CheckoutSuccess.jsx']) {
  if (!fs.existsSync(f)) stop(`I can't find ${f}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and that you unzipped the update first.`)
}
const original = fs.readFileSync(APP, 'utf8')
if (!original.includes('</Routes>')) stop("I couldn't find where the pages are listed (</Routes>) in App.jsx. Send me the output of: cat src/App.jsx")

const hasImport = /import\s+CheckoutSuccess\s+from/.test(original)
const hasRoute = /path=["']\/checkout\/success["']/.test(original)
if (hasImport && hasRoute) {
  console.log('\nThe thank-you page is already added. Nothing to do.\n')
  process.exit(0)
}

let app = original
const routesBefore = (app.match(/<Route\b/g) || []).length
if (!hasImport) {
  const lines = app.split('\n')
  let last = -1
  let inImport = false
  lines.forEach((l, i) => {
    const t = l.trim()
    if (!inImport && /^import\b/.test(t)) inImport = true
    if (inImport && (/\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(t))) {
      last = i
      inImport = false
    }
  })
  if (last < 0) stop("I couldn't find the import lines at the top of App.jsx. Send me the output of: cat src/App.jsx")
  lines.splice(last + 1, 0, "import CheckoutSuccess from './cart/CheckoutSuccess'")
  app = lines.join('\n')
}
if (!hasRoute) {
  const at = app.lastIndexOf('</Routes>')
  const lineStart = app.lastIndexOf('\n', at) + 1
  const indent = app.slice(lineStart, at).match(/^\s*/)[0]
  app = app.slice(0, lineStart) + `${indent}  <Route path="/checkout/success" element={<CheckoutSuccess />} />\n` + app.slice(lineStart)
}
const routesAfter = (app.match(/<Route\b/g) || []).length
if (routesAfter !== routesBefore + (hasRoute ? 0 : 1)) stop("Something didn't add up when I checked my own work, so I haven't saved anything. Send me the output of: cat src/App.jsx")

fs.writeFileSync(APP + '.before-checkout', original)
fs.writeFileSync(APP, app)
console.log('\nDone. The thank-you page is added.\nA backup of your old file is at src/App.jsx.before-checkout\n')
console.log('Pages your site now knows about:')
for (const m of app.matchAll(/<Route[^>]*\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('')
