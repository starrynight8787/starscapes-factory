// Connects the forgot-password pages to your site. Safe to run more than once.
//   - It adds the two pages to App.jsx (an import and a route for each)
//   - It adds a "Forgot your password?" link under the log-in form in src/pages/Login.jsx
//   - It makes a backup of each file first (ending .before-forgot-password) and changes nothing else
import fs from 'node:fs'

const APP = 'src/App.jsx'
const LOGIN = 'src/pages/Login.jsx'
const PAGES = [
  { name: 'ForgotPassword', path: '/forgot-password', file: 'src/pages/ForgotPassword.jsx' },
  { name: 'ResetPassword', path: '/reset-password', file: 'src/pages/ResetPassword.jsx' },
]

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}

for (const f of [APP, LOGIN, ...PAGES.map((p) => p.file)]) {
  if (!fs.existsSync(f)) stop(`I can't find ${f}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and that you unzipped the update first.`)
}
let app = fs.readFileSync(APP, 'utf8')
let login = fs.readFileSync(LOGIN, 'utf8')
const appOriginal = app
const loginOriginal = login
if (!app.includes('</Routes>')) stop("I couldn't find where the pages are listed (</Routes>) in App.jsx. Send me the output of: cat src/App.jsx")

const report = []

// ---- App.jsx: imports ----
const lines = app.split('\n')
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
if (lastImportEnd < 0) stop("I couldn't find the import lines at the top of App.jsx. Send me the output of: cat src/App.jsx")
const newImports = PAGES.filter((p) => !new RegExp(`import\\s+${p.name}\\s+from`).test(app)).map((p) => `import ${p.name} from './pages/${p.name}'`)
if (newImports.length) {
  lines.splice(lastImportEnd + 1, 0, ...newImports)
  app = lines.join('\n')
}

// ---- App.jsx: routes ----
const routesBefore = (app.match(/<Route\b/g) || []).length
const missing = PAGES.filter((p) => !new RegExp(`path=["']${p.path}["']`).test(app))
if (missing.length) {
  const at = app.lastIndexOf('</Routes>')
  const lineStart = app.lastIndexOf('\n', at) + 1
  const indent = app.slice(lineStart, at).match(/^\s*/)[0]
  const added = missing.map((p) => `${indent}  <Route path="${p.path}" element={<${p.name} />} />\n`).join('')
  app = app.slice(0, lineStart) + added + app.slice(lineStart)
}
const routesAfter = (app.match(/<Route\b/g) || []).length
if (routesAfter !== routesBefore + missing.length) stop("Something didn't add up when I checked my own work on App.jsx, so I haven't saved anything. Send me the output of: cat src/App.jsx")
report.push(missing.length ? `App.jsx: added ${missing.map((p) => p.path).join(' and ')}` : 'App.jsx: both pages were already there')

// ---- Login.jsx: the link ----
if (login.includes('/forgot-password')) {
  report.push('Login.jsx: the link was already there')
} else if (!/import[^\n]*\bLink\b[^\n]*react-router-dom/.test(login)) {
  report.push("Login.jsx: skipped, because Link isn't imported there. You can still reach the page at /forgot-password")
} else if (!login.includes('</form>')) {
  report.push("Login.jsx: skipped, because I couldn't find the form. You can still reach the page at /forgot-password")
} else {
  const at = login.indexOf('</form>') + '</form>'.length
  const lineStart = login.lastIndexOf('\n', login.indexOf('</form>')) + 1
  const indent = login.slice(lineStart).match(/^\s*/)[0]
  const link = `\n${indent}<p className="muted">\n${indent}  <Link to="/forgot-password">Forgot your password?</Link>\n${indent}</p>`
  login = login.slice(0, at) + link + login.slice(at)
  report.push('Login.jsx: added the "Forgot your password?" link')
}

if (app === appOriginal && login === loginOriginal) {
  console.log('\nEverything is already in place. Nothing to do.\n')
  process.exit(0)
}
if (app !== appOriginal) {
  fs.writeFileSync(APP + '.before-forgot-password', appOriginal)
  fs.writeFileSync(APP, app)
}
if (login !== loginOriginal) {
  fs.writeFileSync(LOGIN + '.before-forgot-password', loginOriginal)
  fs.writeFileSync(LOGIN, login)
}
console.log('\nDone.')
report.forEach((r) => console.log('  ' + r))
console.log('\nPages your site now knows about:')
for (const m of app.matchAll(/<Route[^>]*\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('')
